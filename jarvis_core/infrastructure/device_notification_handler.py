from typing import Any, Awaitable, Callable


VoiceAnnouncer = Callable[[str], Awaitable[None]]


class DeviceNotificationHandler:
    def __init__(self, voice_announcer: VoiceAnnouncer, logger) -> None:
        self.voice_announcer = voice_announcer
        self.logger = logger

    async def handle_device_connected(self, event: dict[str, Any]) -> None:
        message = self._build_message(event, connected=True)
        self.logger.info("Device connected event received: %s", event)
        await self.voice_announcer(message)

    async def handle_device_disconnected(self, event: dict[str, Any]) -> None:
        message = self._build_message(event, connected=False)
        self.logger.warning("Device disconnected event received: %s", event)
        await self.voice_announcer(message)

    def _build_message(self, event: dict[str, Any], connected: bool) -> str:
        room = event.get("room")
        device_name = event.get("deviceName") or event.get("device_name") or "cihaz"

        display_name = f"{room} {device_name}" if room else device_name

        if connected:
            return f"{display_name} tekrar baglandi"

        return f"{display_name} baglantisi kesildi"

