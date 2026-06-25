"""
Jarvis Bridge - Ana Giriş Noktası
Jarvis tarafından kullanılacak tek arayüz.

Kullanım örneği:
    bridge = JarvisBridge()
    await bridge.start()

    response = await bridge.handle_command("salon ışığını aç")
    devices  = await bridge.list_all_devices()

    await bridge.stop()
"""
from typing import List, Optional

from .config import BridgeConfig, config as default_config
from .core.http_client import HomeAssistantClient
from .models import CommandResult, Device, DeviceListResponse, DeviceType
from .services.command_handler import CommandParser, VoiceCommandProcessor
from .services.device_service import DeviceService
from .utils.logger import setup_logger


class JarvisBridge:
    """
    Jarvis ↔ Home Asistan köprüsü.

    Bu sınıf dışındaki hiçbir şeyi import etmenize gerek yok.
    """

    def __init__(self, config: BridgeConfig = None):
        self._cfg     = config or default_config
        self._logger  = setup_logger("jarvis.bridge", self._cfg.log_level, self._cfg.log_file)
        self._client: Optional[HomeAssistantClient] = None
        self._devices: Optional[DeviceService]      = None
        self._processor: Optional[VoiceCommandProcessor] = None
        self._running = False

    # ------------------------------------------------------------------ #
    #  Yaşam döngüsü                                                       #
    # ------------------------------------------------------------------ #

    async def start(self) -> None:
        """Bağlantıyı başlatır ve sistemi hazırlar."""
        self._cfg.validate()
        self._logger.info("🚀 Jarvis Bridge başlatılıyor...")

        self._client    = HomeAssistantClient(self._cfg)
        await self._client._ensure_session()

        self._devices   = DeviceService(self._client)
        self._processor = VoiceCommandProcessor(self._devices, CommandParser())
        self._running   = True

        self._logger.info("✅ Jarvis Bridge hazır → %s", self._cfg.ha_base_url)

    async def stop(self) -> None:
        """Bağlantıyı düzgünce kapatır."""
        if self._client:
            await self._client.close()
        self._running = False
        self._logger.info("👋 Jarvis Bridge kapatıldı.")

    async def __aenter__(self) -> "JarvisBridge":
        await self.start()
        return self

    async def __aexit__(self, *_) -> None:
        await self.stop()

    def _check_ready(self) -> None:
        if not self._running:
            raise RuntimeError("JarvisBridge başlatılmamış. Önce await bridge.start() çağırın.")

    # ------------------------------------------------------------------ #
    #  Komut işleme (Jarvis'in birincil arayüzü)                          #
    # ------------------------------------------------------------------ #

    async def handle_command(self, text: str) -> str:
        """
        Doğal dil komutunu işler ve kullanıcı dostu yanıt döner.

        Args:
            text: "salon ışığını aç" / "tüm cihazları listele"

        Returns:
            Sonuç mesajı
        """
        self._check_ready()
        return await self._processor.process(text)

    # ------------------------------------------------------------------ #
    #  Cihaz işlemleri (doğrudan erişim)                                  #
    # ------------------------------------------------------------------ #

    async def list_all_devices(self) -> DeviceListResponse:
        self._check_ready()
        return await self._devices.list_devices()

    async def get_device(self, device_id: str) -> Optional[Device]:
        self._check_ready()
        return await self._devices.get_device(device_id)

    async def turn_on(self, device_id: str) -> CommandResult:
        self._check_ready()
        return await self._devices.turn_on(device_id)

    async def turn_off(self, device_id: str) -> CommandResult:
        self._check_ready()
        return await self._devices.turn_off(device_id)

    async def toggle(self, device_id: str) -> CommandResult:
        self._check_ready()
        return await self._devices.toggle(device_id)

    async def set_temperature(self, device_id: str, temp: float) -> CommandResult:
        self._check_ready()
        return await self._devices.set_temperature(device_id, temp)

    async def set_brightness(self, device_id: str, brightness: int) -> CommandResult:
        self._check_ready()
        return await self._devices.set_brightness(device_id, brightness)

    async def get_online_devices(self) -> List[Device]:
        self._check_ready()
        return await self._devices.get_online_devices()

    async def get_devices_in_room(self, room: str) -> List[Device]:
        self._check_ready()
        return await self._devices.get_devices_by_room(room)

    async def register_device(
        self, name: str, device_type: DeviceType, room: str = ""
    ) -> CommandResult:
        self._check_ready()
        return await self._devices.register_device(name, device_type, room)
