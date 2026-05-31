import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


@dataclass
class ManagedProcess:
    name: str
    command: list[str]
    cwd: Path
    health_url: Optional[str] = None
    heartbeat_file: Optional[Path] = None
    heartbeat_timeout_seconds: int = 15
    preferred_ports: list[int] = field(default_factory=list)
    process: Optional[subprocess.Popen] = None
    restart_times: deque[float] = field(default_factory=lambda: deque(maxlen=10))


class Watchdog:
    def __init__(
        self,
        processes: list[ManagedProcess],
        log_file: Path,
        check_interval_seconds: int,
        max_restarts: int,
        restart_window_seconds: int,
        cooldown_seconds: int,
    ) -> None:
        self.processes = processes
        self.log_file = log_file
        self.check_interval_seconds = check_interval_seconds
        self.max_restarts = max_restarts
        self.restart_window_seconds = restart_window_seconds
        self.cooldown_seconds = cooldown_seconds
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

    def run_forever(self) -> None:
        self.log("watchdog.started", "watchdog", {"pid": os.getpid()})
        for managed in self.processes:
            self.ensure_started(managed, reason="InitialStart")

        while True:
            for managed in self.processes:
                try:
                    self.monitor(managed)
                except Exception as exc:
                    self.log("watchdog.monitor_error", managed.name, {"error": str(exc)})

            time.sleep(self.check_interval_seconds)

    def run_for(self, seconds: int, stop_children_on_exit: bool) -> None:
        deadline = time.time() + seconds
        self.log("watchdog.started", "watchdog", {"pid": os.getpid(), "mode": "timed", "seconds": seconds})
        for managed in self.processes:
            self.ensure_started(managed, reason="InitialStart")

        try:
            while time.time() < deadline:
                for managed in self.processes:
                    self.monitor(managed)
                time.sleep(self.check_interval_seconds)
        finally:
            self.log("watchdog.timed_run_completed", "watchdog", {"seconds": seconds})
            if stop_children_on_exit:
                for managed in self.processes:
                    self.stop(managed, reason="TimedRunCompleted")

    def monitor(self, managed: ManagedProcess) -> None:
        if managed.process and managed.process.poll() is not None:
            self.log("process.exited", managed.name, {"exitCode": managed.process.returncode})
            self.restart(managed, reason="ProcessExited")
            return

        if not self.is_healthy(managed):
            self.log("process.unhealthy", managed.name, {})
            self.restart(managed, reason="HealthCheckFailed")

    def ensure_started(self, managed: ManagedProcess, reason: str) -> None:
        if managed.preferred_ports:
            self.clean_ports(managed)
            self.apply_port_fallback(managed)

        self.start(managed, reason)

    def apply_port_fallback(self, managed: ManagedProcess) -> None:
        if managed.name != "Jarvis.Backend":
            return

        for port in managed.preferred_ports:
            if is_port_available(port):
                managed.command = [
                    "dotnet",
                    "run",
                    "--no-build",
                    "--urls",
                    f"http://localhost:{port}",
                ]
                managed.health_url = f"http://localhost:{port}/health"
                self.log("port.selected", managed.name, {"port": port})
                return

        self.log("port.fallback_failed", managed.name, {"ports": managed.preferred_ports})

    def start(self, managed: ManagedProcess, reason: str) -> None:
        managed.cwd.mkdir(parents=True, exist_ok=True)
        managed.process = subprocess.Popen(
            managed.command,
            cwd=str(managed.cwd),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        managed.restart_times.append(time.time())
        self.log(
            "process.started",
            managed.name,
            {"pid": managed.process.pid, "reason": reason, "command": managed.command},
        )

    def restart(self, managed: ManagedProcess, reason: str) -> None:
        now = time.time()
        recent_restarts = [
            restart_time
            for restart_time in managed.restart_times
            if now - restart_time <= self.restart_window_seconds
        ]

        if len(recent_restarts) >= self.max_restarts:
            self.log(
                "process.restart_blocked",
                managed.name,
                {
                    "reason": reason,
                    "maxRestarts": self.max_restarts,
                    "windowSeconds": self.restart_window_seconds,
                },
            )
            return

        self.stop(managed, reason)
        time.sleep(self.cooldown_seconds)
        self.ensure_started(managed, reason=reason)

    def stop(self, managed: ManagedProcess, reason: str) -> None:
        if managed.process and managed.process.poll() is None:
            self.log("process.stopping", managed.name, {"pid": managed.process.pid, "reason": reason})
            managed.process.terminate()
            try:
                managed.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                managed.process.kill()
                managed.process.wait(timeout=5)

        if managed.preferred_ports:
            self.clean_ports(managed)

    def is_healthy(self, managed: ManagedProcess) -> bool:
        if managed.health_url and not self.check_http_health(managed.health_url):
            return False

        if managed.heartbeat_file and not self.check_file_heartbeat(
            managed.heartbeat_file,
            managed.heartbeat_timeout_seconds,
        ):
            return False

        return True

    def check_http_health(self, url: str) -> bool:
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                return 200 <= response.status < 300
        except (urllib.error.URLError, TimeoutError):
            return False

    def check_file_heartbeat(self, heartbeat_file: Path, timeout_seconds: int) -> bool:
        if not heartbeat_file.exists():
            return False

        age_seconds = time.time() - heartbeat_file.stat().st_mtime
        return age_seconds <= timeout_seconds

    def clean_ports(self, managed: ManagedProcess) -> None:
        if os.name != "nt":
            return

        for port in managed.preferred_ports:
            for pid in find_windows_pids_by_port(port):
                current_pid = managed.process.pid if managed.process else None
                if pid == current_pid:
                    continue

                self.log("port.conflict_detected", managed.name, {"port": port, "pid": pid})
                subprocess.run(
                    ["taskkill", "/PID", str(pid), "/F", "/T"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                )
                self.log("port.cleaned", managed.name, {"port": port, "pid": pid})

    def log(self, event: str, process_name: str, details: dict) -> None:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            "process": process_name,
            "details": details,
        }
        with self.log_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")

        print(json.dumps(record, ensure_ascii=False))


def find_windows_pids_by_port(port: int) -> set[int]:
    result = subprocess.run(
        ["netstat", "-ano", "-p", "tcp"],
        capture_output=True,
        text=True,
        check=False,
    )

    pids: set[int] = set()
    marker = f":{port}"

    for line in result.stdout.splitlines():
        columns = line.split()
        if len(columns) < 5:
            continue

        local_address = columns[1]
        state = columns[3]
        pid_text = columns[4]

        if marker in local_address and state.upper() == "LISTENING" and pid_text.isdigit():
            pids.add(int(pid_text))

    return pids


def is_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(1)
        return sock.connect_ex(("127.0.0.1", port)) != 0


def build_processes(root: Path, backend_port: int) -> list[ManagedProcess]:
    backend_dir = root / "Jarvis.Backend"
    heartbeat_file = root / "runtime" / "jarvis_heartbeat.json"

    backend = ManagedProcess(
        name="Jarvis.Backend",
        command=[
            "dotnet",
            "run",
            "--no-build",
            "--urls",
            f"http://localhost:{backend_port}",
        ],
        cwd=backend_dir,
        health_url=f"http://localhost:{backend_port}/health",
        preferred_ports=[backend_port, backend_port + 1, backend_port + 2],
    )

    jarvis = ManagedProcess(
        name="Jarvis.Python",
        command=[
            sys.executable,
            "-m",
            "jarvis_core.app.agent",
            "--heartbeat-file",
            str(heartbeat_file),
            "--backend",
            f"http://localhost:{backend_port}",
        ],
        cwd=root,
        heartbeat_file=heartbeat_file,
        heartbeat_timeout_seconds=15,
    )

    return [backend, jarvis]


def main() -> None:
    parser = argparse.ArgumentParser(description="Jarvis self-healing watchdog")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[1]), help="Workspace root")
    parser.add_argument("--backend-port", type=int, default=5235)
    parser.add_argument("--check-interval", type=int, default=5)
    parser.add_argument("--max-restarts", type=int, default=3)
    parser.add_argument("--restart-window", type=int, default=60)
    parser.add_argument("--cooldown", type=int, default=5)
    parser.add_argument("--log-file", default=str(Path("logs") / "watchdog.jsonl"))
    parser.add_argument("--run-seconds", type=int, default=0, help="Run for a limited duration, then exit")
    parser.add_argument("--stop-children-on-exit", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    log_file = Path(args.log_file)
    if not log_file.is_absolute():
        log_file = root / log_file

    watchdog = Watchdog(
        processes=build_processes(root, args.backend_port),
        log_file=log_file,
        check_interval_seconds=args.check_interval,
        max_restarts=args.max_restarts,
        restart_window_seconds=args.restart_window,
        cooldown_seconds=args.cooldown,
    )

    try:
        if args.run_seconds > 0:
            watchdog.run_for(args.run_seconds, args.stop_children_on_exit)
        else:
            watchdog.run_forever()
    except KeyboardInterrupt:
        watchdog.log("watchdog.stopped", "watchdog", {"signal": signal.SIGINT})


if __name__ == "__main__":
    main()
