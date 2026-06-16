from __future__ import annotations

import ipaddress
import json
import logging
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psutil


ROOT_DIR = Path(__file__).resolve().parents[1]
EVENT_PATH = ROOT_DIR / "memory" / "tcp_connection_events.json"
HOME_SERVER_PORTS = {8586}

logger = logging.getLogger("JarvisTCPMonitor")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass(frozen=True)
class TcpConnectionKey:
    local_ip: str
    local_port: int
    remote_ip: str
    remote_port: int
    pid: int
    status: str


@dataclass
class TcpConnectionRecord:
    local_ip: str
    local_port: int
    remote_ip: str
    remote_port: int
    status: str
    pid: int
    process_name: str
    category: str
    suspicious: bool
    reason: str


@dataclass
class TcpConnectionEvent:
    timestamp: str
    event_type: str
    local_ip: str
    local_port: int
    remote_ip: str
    remote_port: int
    status: str
    pid: int
    process_name: str
    category: str
    suspicious: bool
    reason: str


class TcpConnectionStore:
    def __init__(self, path: Path = EVENT_PATH):
        self.path = path
        self._lock = threading.RLock()
        self._connections: dict[TcpConnectionKey, TcpConnectionRecord] = {}
        self._events: list[TcpConnectionEvent] = []
        self._revision = 0
        self._opened_total = 0
        self._closed_total = 0
        self._load_events()

    @property
    def revision(self) -> int:
        with self._lock:
            return self._revision

    def update(self, records: list[TcpConnectionRecord]) -> None:
        new_map = {self._key(record): record for record in records}
        with self._lock:
            old_keys = set(self._connections)
            new_keys = set(new_map)
            opened = new_keys - old_keys
            closed = old_keys - new_keys

            for key in opened:
                event = self._event_from_record("opened", new_map[key])
                self._events.append(event)
                self._opened_total += 1
                if event.suspicious:
                    logger.warning(
                        "Suspicious TCP connection: %s:%s -> %s:%s pid=%s process=%s reason=%s",
                        event.local_ip,
                        event.local_port,
                        event.remote_ip,
                        event.remote_port,
                        event.pid,
                        event.process_name,
                        event.reason,
                    )

            for key in closed:
                event = self._event_from_record("closed", self._connections[key])
                self._events.append(event)
                self._closed_total += 1

            self._events = self._events[-100:]
            self._connections = new_map
            if opened or closed:
                self._revision += 1
                self._persist_events_locked()

    def connections(self) -> list[TcpConnectionRecord]:
        with self._lock:
            return [TcpConnectionRecord(**asdict(record)) for record in self._connections.values()]

    def home_server_connections(self) -> list[TcpConnectionRecord]:
        return [record for record in self.connections() if record.category == "home_server"]

    def recent_events(self, limit: int = 100) -> list[TcpConnectionEvent]:
        with self._lock:
            return [TcpConnectionEvent(**asdict(event)) for event in self._events[-limit:]]

    def stats(self) -> dict[str, Any]:
        records = self.connections()
        by_status: dict[str, int] = {}
        by_process: dict[str, int] = {}
        for record in records:
            by_status[record.status] = by_status.get(record.status, 0) + 1
            by_process[record.process_name] = by_process.get(record.process_name, 0) + 1
        return {
            "total_connections": len(records),
            "established": by_status.get("ESTABLISHED", 0),
            "listening": by_status.get("LISTEN", 0) + by_status.get("LISTENING", 0),
            "home_server_connections": sum(1 for record in records if record.category == "home_server"),
            "suspicious_connections": sum(1 for record in records if record.suspicious),
            "opened_total": self._opened_total,
            "closed_total": self._closed_total,
            "by_status": by_status,
            "top_processes": dict(sorted(by_process.items(), key=lambda item: item[1], reverse=True)[:10]),
        }

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            revision = self._revision
        return {
            "revision": revision,
            "updated_at": utc_now_iso(),
            "connections": [asdict(record) for record in self.connections()],
            "home_server_connections": [asdict(record) for record in self.home_server_connections()],
            "events": [asdict(event) for event in self.recent_events(100)],
            "stats": self.stats(),
        }

    def _event_from_record(self, event_type: str, record: TcpConnectionRecord) -> TcpConnectionEvent:
        return TcpConnectionEvent(
            timestamp=utc_now_iso(),
            event_type=event_type,
            local_ip=record.local_ip,
            local_port=record.local_port,
            remote_ip=record.remote_ip,
            remote_port=record.remote_port,
            status=record.status,
            pid=record.pid,
            process_name=record.process_name,
            category=record.category,
            suspicious=record.suspicious,
            reason=record.reason,
        )

    def _load_events(self) -> None:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return
        with self._lock:
            self._events = [
                TcpConnectionEvent(**item)
                for item in raw.get("events", [])
                if isinstance(item, dict)
            ][-100:]
            self._opened_total = int(raw.get("opened_total", 0) or 0)
            self._closed_total = int(raw.get("closed_total", 0) or 0)
            self._revision = int(raw.get("revision", 0) or 0)

    def _persist_events_locked(self) -> None:
        payload = {
            "revision": self._revision,
            "updated_at": utc_now_iso(),
            "opened_total": self._opened_total,
            "closed_total": self._closed_total,
            "events": [asdict(event) for event in self._events],
        }
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except OSError:
            pass

    @staticmethod
    def _key(record: TcpConnectionRecord) -> TcpConnectionKey:
        return TcpConnectionKey(
            record.local_ip,
            record.local_port,
            record.remote_ip,
            record.remote_port,
            record.pid,
            record.status,
        )


class TcpConnectionMonitor:
    def __init__(self, store: TcpConnectionStore, interval_seconds: float = 2.0):
        self.store = store
        self.interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="TcpConnectionMonitor", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def sync_once(self) -> None:
        self.store.update(scan_tcp_connections())

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self.sync_once()
            except Exception as exc:
                logger.warning("TCP connection scan failed: %s", exc)
            self._stop.wait(self.interval_seconds)


def scan_tcp_connections() -> list[TcpConnectionRecord]:
    records: list[TcpConnectionRecord] = []
    process_cache: dict[int, str] = {}
    for conn in psutil.net_connections(kind="tcp"):
        local_ip, local_port = _addr_parts(conn.laddr)
        remote_ip, remote_port = _addr_parts(conn.raddr)
        pid = int(conn.pid or 0)
        process_name = _process_name(pid, process_cache)
        category = _category(local_port, remote_port, process_name)
        suspicious, reason = _suspicious(local_ip, remote_ip, remote_port, conn.status, process_name)
        records.append(
            TcpConnectionRecord(
                local_ip=local_ip,
                local_port=local_port,
                remote_ip=remote_ip,
                remote_port=remote_port,
                status=str(conn.status or "UNKNOWN"),
                pid=pid,
                process_name=process_name,
                category=category,
                suspicious=suspicious,
                reason=reason,
            )
        )
    return records


def _addr_parts(addr) -> tuple[str, int]:
    if not addr:
        return "", 0
    return str(getattr(addr, "ip", "") or addr[0]), int(getattr(addr, "port", 0) or addr[1])


def _process_name(pid: int, cache: dict[int, str]) -> str:
    if not pid:
        return "System"
    if pid in cache:
        return cache[pid]
    try:
        name = psutil.Process(pid).name()
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        name = "Unknown"
    cache[pid] = name
    return name


def _category(local_port: int, remote_port: int, process_name: str) -> str:
    normalized = process_name.lower().replace(" ", "")
    if local_port in HOME_SERVER_PORTS or remote_port in HOME_SERVER_PORTS:
        return "home_server"
    if "homeserver" in normalized:
        return "home_server"
    return "general"


def _suspicious(
    local_ip: str,
    remote_ip: str,
    remote_port: int,
    status: str,
    process_name: str,
) -> tuple[bool, str]:
    if not remote_ip or status != "ESTABLISHED":
        return False, ""
    if not _is_public_ip(remote_ip):
        return False, ""
    if process_name in {"Unknown", "System"}:
        return True, "public remote endpoint with unknown process"
    if remote_port not in {53, 80, 123, 443, 587, 993, 995} and _is_private_or_loopback(local_ip):
        return True, "public remote endpoint on uncommon port"
    return False, ""


def _is_public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _is_private_or_loopback(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback


tcp_store = TcpConnectionStore()
tcp_monitor = TcpConnectionMonitor(tcp_store)

