from __future__ import annotations

from core.service_registry import OFFLINE, ONLINE, registry


def _status_icon(status: str) -> str:
    if status == ONLINE:
        return "[ONLINE]"
    if status == OFFLINE:
        return "[OFFLINE]"
    return "[WARN]"


def _format_services(services) -> str:
    lines = ["Connected Services", "------------------"]
    for service in services:
        lines.append(f"{_status_icon(service.status)} {service.service_name}")
    report = registry.health_report()
    lines.extend(
        [
            "",
            f"System Health: %{report['system_health']}",
            f"Active Services: {report['active_services']}",
            f"Offline Services: {report['offline_services']}",
        ]
    )
    return "\n".join(lines)


def _format_service_detail(service_id: str) -> str:
    service = registry.get_service(service_id)
    if not service:
        return f"Servis bulunamadi: {service_id}"
    return "\n".join(
        [
            f"{service.service_name}: {service.status}",
            f"Servis ID: {service.service_id}",
            f"Son gorulme: {service.last_seen or '-'}",
            f"IP adresi: {service.ip_address or '-'}",
            f"Surum: {service.version or '-'}",
            f"Baglanti turu: {service.connection_type or '-'}",
        ]
    )


def _format_events(limit: int = 10) -> str:
    events = registry.recent_events(limit)
    if not events:
        return "Henuz baglanti olayi yok."
    lines = ["Son baglanti olaylari", "----------------------"]
    for event in reversed(events):
        lines.append(
            f"{event.timestamp} | {event.service_name} | {event.event_type} | {event.status}"
        )
    return "\n".join(lines)


def _format_health_report() -> str:
    report = registry.health_report()
    lines = [
        "Sistem saglik raporu",
        "--------------------",
        f"System Health: %{report['system_health']}",
        f"Active Services: {report['active_services']}",
        f"Offline Services: {report['offline_services']}",
        f"Total Services: {report['total_services']}",
        "",
        _format_services(registry.services()),
    ]
    return "\n".join(lines)


def service_status(query: str = "connected") -> str:
    q = str(query or "connected").strip().lower()
    q = (
        q.replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )

    if any(token in q for token in ("home", "home server", "ev sunucu")):
        return _format_service_detail("home-server")
    if any(token in q for token in ("offline", "cevrimdisi", "kapali", "baglantisiz")):
        return _format_services(registry.offline_services())
    if any(token in q for token in ("event", "olay", "log", "son baglanti")):
        return _format_events(10)
    if any(token in q for token in ("health", "saglik", "rapor")):
        return _format_health_report()
    return _format_services(registry.services())

