from typing import Any


class SignalRDeviceStatusClient:
    def __init__(self, hub_connection, notification_handler, logger) -> None:
        self.hub_connection = hub_connection
        self.notification_handler = notification_handler
        self.logger = logger

    async def start(self) -> None:
        self.hub_connection.on("DeviceConnected", self._on_device_connected)
        self.hub_connection.on("DeviceDisconnected", self._on_device_disconnected)
        await self.hub_connection.start()
        self.logger.info("SignalR device status client started")

    async def stop(self) -> None:
        await self.hub_connection.stop()
        self.logger.info("SignalR device status client stopped")

    async def _on_device_connected(self, args: list[Any]) -> None:
        event = args[0] if args else {}
        await self.notification_handler.handle_device_connected(event)

    async def _on_device_disconnected(self, args: list[Any]) -> None:
        event = args[0] if args else {}
        await self.notification_handler.handle_device_disconnected(event)

