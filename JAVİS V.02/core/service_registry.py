from __future__ import annotations

import json
import socket
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


ROOT_DIR = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT_DIR / "memory" / "service_registry.json"

ONLINE = "Online"
OFFLINE = "Offline"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class ServiceRecord:
    service_id: str
    service_name: str
    status: str = OFFLINE
    last_seen: str = ""
    ip_address: str = ""
    version: str = ""
    connection_type: str = "unknown"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ServiceEvent:
    timestamp: str
    service_id: str
    service_name: str
    event_type: str
    status: str
    message: str


class ServiceRegistry:
    def __init__(self, path: Path = REGISTRY_PATH):
        self.path = path
        self._lock = threading.RLock()
        self._services: dict[str, ServiceRecord] = {}
        self._events: list[ServiceEvent] = []
        self._listeners: list[Callable[[dict[str, Any]], None]] = []
        self._revision = 0
        self._load()
        self.ensure_defaults()

    @property
    def revision(self) -> int:
        with self._lock:
            return self._revision

    def subscribe(self, callback: Callable[[dict[str, Any]], None]) -> Callable[[], None]:
        with self._lock:
            self._listeners.append(callback)

        def unsubscribe() -> None:
            with self._lock:
                if callback in self._listeners:
                    self._listeners.remove(callback)

        return unsubscribe

    def ensure_defaults(self) -> None:
        defaults = [
            ServiceRecord("home-server", "Home Server", OFFLINE, "", "127.0.0.1", "", "tcp"),
            ServiceRecord("backend-api", "Backend API", OFFLINE, "", "127.0.0.1", "1.0.0", "http"),
            ServiceRecord("sql-server", "SQL Server", OFFLINE, "", "127.0.0.1", "", "tcp"),
            ServiceRecord("jarvis-core", "Jarvis Core", OFFLINE, "", "127.0.0.1", "1.0.0", "python"),
            ServiceRecord("android-client", "Android Client", OFFLINE, "", "", "", "websocket"),
            ServiceRecord("mqtt-broker", "MQTT Broker", OFFLINE, "", "127.0.0.1", "", "tcp"),
        ]
        changed = False
        with self._lock:
            for record in defaults:
                if record.service_id not in self._services:
                    self._services[record.service_id] = record
                    changed = True
        if changed:
            self._persist_and_publish("defaults")

    def register(
        self,
        service_id: str,
        service_name: str,
        ip_address: str = "",
        version: str = "",
        connection_type: str = "unknown",
        metadata: dict[str, Any] | None = None,
    ) -> ServiceRecord:
        service_id = self._normalize_id(service_id)
        now = utc_now_iso()
        with self._lock:
            existing = self._services.get(service_id)
            was_online = existing.status == ONLINE if existing else False
            record = existing or ServiceRecord(service_id, service_name)
            record.service_name = service_name or record.service_name
            record.status = ONLINE
            record.last_seen = now
            record.ip_address = ip_address or record.ip_address
            record.version = version or record.version
            record.connection_type = connection_type or record.connection_type
            if metadata:
                record.metadata.update(metadata)
            self._services[service_id] = record
            event_type = "connected" if not was_online else "heartbeat"
            self._add_event_locked(record, event_type, f"{record.service_name} {record.status}")
        self._persist_and_publish(event_type)
        return record

    def mark_offline(self, service_id: str, message: str = "Connection lost") -> ServiceRecord | None:
        service_id = self._normalize_id(service_id)
        with self._lock:
            record = self._services.get(service_id)
            if not record:
                return None
            if record.status == OFFLINE:
                return record
            record.status = OFFLINE
            self._add_event_locked(record, "disconnected", message)
        self._persist_and_publish("disconnected")
        return record

    def heartbeat(
        self,
        service_id: str,
        service_name: str | None = None,
        ip_address: str = "",
        version: str = "",
        connection_type: str = "unknown",
        metadata: dict[str, Any] | None = None,
    ) -> ServiceRecord:
        current = self.get_service(service_id)
        return self.register(
            service_id,
            service_name or (current.service_name if current else service_id),
            ip_address=ip_address,
            version=version,
            connection_type=connection_type,
            metadata=metadata,
        )

    def get_service(self, service_id: str) -> ServiceRecord | None:
        with self._lock:
            record = self._services.get(self._normalize_id(service_id))
            return ServiceRecord(**asdict(record)) if record else None

    def services(self) -> list[ServiceRecord]:
        with self._lock:
            return [ServiceRecord(**asdict(record)) for record in self._services.values()]

    def offline_services(self) -> list[ServiceRecord]:
        return [record for record in self.services() if record.status == OFFLINE]

    def recent_events(self, limit: int = 20) -> list[ServiceEvent]:
        with self._lock:
            return [ServiceEvent(**asdict(event)) for event in self._events[-limit:]]

    def health_report(self) -> dict[str, Any]:
        services = self.services()
        active = sum(1 for service in services if service.status == ONLINE)
        offline = sum(1 for service in services if service.status == OFFLINE)
        total = max(1, len(services))
        score = round((active / total) * 100)
        return {
            "system_health": score,
            "active_services": active,
            "offline_services": offline,
            "total_services": len(services),
            "services": [asdict(service) for service in services],
            "events": [asdict(event) for event in self.recent_events(10)],
        }

    def snapshot(self) -> dict[str, Any]:
        report = self.health_report()
        with self._lock:
            report["revision"] = self._revision
        return report

    def reconcile_stale(self, stale_after_seconds: int = 90) -> None:
        now = time.time()
        for record in self.services():
            if record.status != ONLINE or not record.last_seen:
                continue
            try:
                last_seen = datetime.fromisoformat(record.last_seen).timestamp()
            except ValueError:
                continue
            if now - last_seen > stale_after_seconds:
                self.mark_offline(record.service_id, "Heartbeat timeout")

    def _add_event_locked(self, record: ServiceRecord, event_type: str, message: str) -> None:
        self._events.append(
            ServiceEvent(
                timestamp=utc_now_iso(),
                service_id=record.service_id,
                service_name=record.service_name,
                event_type=event_type,
                status=record.status,
                message=message,
            )
        )
        self._events = self._events[-200:]

    def _load(self) -> None:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            return
        with self._lock:
            for item in raw.get("services", []):
                if isinstance(item, dict) and item.get("service_id"):
                    self._services[item["service_id"]] = ServiceRecord(**item)
            self._events = [
                ServiceEvent(**item)
                for item in raw.get("events", [])
                if isinstance(item, dict) and item.get("service_id")
            ][-200:]
            self._revision = int(raw.get("revision", 0) or 0)

    def _persist_and_publish(self, event_type: str) -> None:
        with self._lock:
            self._revision += 1
            payload = {
                "revision": self._revision,
                "updated_at": utc_now_iso(),
                "services": [asdict(record) for record in self._services.values()],
                "events": [asdict(event) for event in self._events],
            }
            listeners = list(self._listeners)
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except OSError:
            pass
        message = {"type": event_type, "snapshot": self.snapshot()}
        for listener in listeners:
            try:
                listener(message)
            except Exception:
                pass

    @staticmethod
    def _normalize_id(service_id: str) -> str:
        return str(service_id or "").strip().lower().replace(" ", "-")


registry = ServiceRegistry()


def check_tcp(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


class ServiceMonitor:
    def __init__(self, service_registry: ServiceRegistry = registry, interval_seconds: int = 15):
        self.registry = service_registry
        self.interval_seconds = interval_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="ServiceMonitor", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            self.sync_once()
            self._stop.wait(self.interval_seconds)

    def sync_once(self) -> None:
        self.registry.heartbeat(
            "jarvis-core",
            "Jarvis Core",
            ip_address="127.0.0.1",
            version="1.0.0",
            connection_type="python",
        )
        self._sync_tcp("backend-api", "Backend API", "127.0.0.1", 8000, "http", "1.0.0")
        self._sync_tcp("home-server", "Home Server", "127.0.0.1", 8586, "tcp", "")
        self._sync_tcp("sql-server", "SQL Server", "127.0.0.1", 1433, "tcp", "")
        self._sync_tcp("mqtt-broker", "MQTT Broker", "127.0.0.1", 1883, "tcp", "")
        self.registry.reconcile_stale()

    def _sync_tcp(
        self,
        service_id: str,
        service_name: str,
        host: str,
        port: int,
        connection_type: str,
        version: str,
    ) -> None:
        if check_tcp(host, port):
            self.registry.heartbeat(
                service_id,
                service_name,
                ip_address=host,
                version=version,
                connection_type=connection_type,
                metadata={"port": port},
            )
        else:
            self.registry.mark_offline(service_id, f"Reconnect pending for {host}:{port}")
