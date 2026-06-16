from __future__ import annotations

from core.tcp_connection_monitor import tcp_monitor, tcp_store


def _endpoint(ip: str, port: int) -> str:
    if not ip:
        return "-"
    if port:
        return f"{ip}:{port}"
    return ip


def _format_connection(record) -> list[str]:
    local = _endpoint(record.local_ip, record.local_port)
    remote = _endpoint(record.remote_ip, record.remote_port)
    first = f"{local} -> {remote}" if record.remote_ip else local
    lines = [
        first,
        f"Status: {record.status}",
        f"Process: {record.process_name} (PID {record.pid})",
    ]
    if record.category == "home_server":
        lines.append("Category: Home Server")
    if record.suspicious:
        lines.append(f"Suspicious: {record.reason}")
    return lines


def _format_connections(records, title: str = "TCP Connections") -> str:
    if not records:
        return f"{title}\n--------------------------\nAktif TCP baglantisi bulunamadi."
    lines = [title, "--------------------------"]
    for index, record in enumerate(records[:40]):
        if index:
            lines.append("")
        lines.extend(_format_connection(record))
    if len(records) > 40:
        lines.append(f"\n... {len(records) - 40} baglanti daha var.")
    return "\n".join(lines)


def _format_events() -> str:
    events = tcp_store.recent_events(100)
    if not events:
        return "Son TCP baglanti olayi yok."
    lines = ["Last TCP Events", "--------------------------"]
    for event in reversed(events[-20:]):
        local = _endpoint(event.local_ip, event.local_port)
        remote = _endpoint(event.remote_ip, event.remote_port)
        arrow = f"{local} -> {remote}" if event.remote_ip else local
        flag = " suspicious" if event.suspicious else ""
        lines.append(f"{event.timestamp} | {event.event_type}{flag} | {arrow} | {event.process_name}")
    return "\n".join(lines)


def _format_stats() -> str:
    stats = tcp_store.stats()
    lines = [
        "TCP Connection Stats",
        "--------------------------",
        f"Total Connections: {stats['total_connections']}",
        f"Established: {stats['established']}",
        f"Listening: {stats['listening']}",
        f"Home Server Connections: {stats['home_server_connections']}",
        f"Suspicious Connections: {stats['suspicious_connections']}",
        f"Opened Total: {stats['opened_total']}",
        f"Closed Total: {stats['closed_total']}",
    ]
    if stats["by_status"]:
        lines.append("By Status: " + ", ".join(f"{key}={value}" for key, value in stats["by_status"].items()))
    return "\n".join(lines)


def tcp_status(query: str = "connections") -> str:
    tcp_monitor.sync_once()
    q = (
        str(query or "connections")
        .strip()
        .lower()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )
    if any(token in q for token in ("home", "home server", "ev sunucu")):
        return _format_connections(tcp_store.home_server_connections(), "Home Server TCP Connections")
    if any(token in q for token in ("event", "olay", "son", "log")):
        return _format_events()
    if any(token in q for token in ("stat", "istatistik", "stats", "say")):
        return _format_stats()
    if any(token in q for token in ("suspicious", "supheli", "risk")):
        return _format_connections(
            [record for record in tcp_store.connections() if record.suspicious],
            "Suspicious TCP Connections",
        )
    return _format_connections(tcp_store.connections())

