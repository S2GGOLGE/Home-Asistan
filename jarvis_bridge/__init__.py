"""
Jarvis Bridge
=============
Jarvis AI ↔ Home Asistan Python köprüsü.

Hızlı başlangıç::

    from jarvis_bridge import JarvisBridge

    async def main():
        async with JarvisBridge() as bridge:
            print(await bridge.handle_command("salon ışığını aç"))
"""
from .bridge import JarvisBridge
from .config import BridgeConfig
from .models import (
    CommandResult,
    Device,
    DeviceCommand,
    DeviceListResponse,
    DeviceStatus,
    DeviceType,
)

__all__ = [
    "JarvisBridge",
    "BridgeConfig",
    "Device",
    "DeviceCommand",
    "CommandResult",
    "DeviceListResponse",
    "DeviceStatus",
    "DeviceType",
]
__version__ = "1.0.0"
