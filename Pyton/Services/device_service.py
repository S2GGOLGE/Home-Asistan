"""
Jarvis Bridge - Cihaz Servisi
Home Asistan cihazlarını yönetmek için üst seviye servis katmanı.

Endpoint eşlemeleri:
  GET  /api/devices            → tüm cihazlar
  GET  /api/devices/{id}       → tek cihaz
  POST /api/devices/{id}/command → komut gönder
  POST /api/devices/register   → yeni cihaz kaydı
  GET  /api/devices/{id}/refresh → cihaz yenile
"""
from typing import Dict, List, Optional

from ..core.http_client import (
    AuthenticationError,
    DeviceNotFoundError,
    HomeAssistantClient,
)
from ..models import (
    CommandResult,
    Device,
    DeviceCommand,
    DeviceListResponse,
    DeviceStatus,
    DeviceType,
)
from ..utils.logger import setup_logger
from ..config import default_config as cfg

logger = setup_logger("jarvis.device_service", cfg.log_level)


class DeviceService:
    """
    Cihaz işlemleri için tek durak noktası.

    Jarvis bu servisi çağırır; HTTP detayları gizlenir.
    """

    def __init__(self, client: HomeAssistantClient):
        self._client = client

    # ------------------------------------------------------------------ #
    #  Listeleme                                                           #
    # ------------------------------------------------------------------ #

    async def list_devices(self, use_cache: bool = True) -> DeviceListResponse:
        """
        Tüm kayıtlı cihazları getirir.

        Args:
            use_cache: True ise TTL süresi dolmamışsa önbellekten döner.
        """
        logger.info("Cihaz listesi isteniyor...")
        try:
            data     = await self._client.get("/devices", use_cache=use_cache)
            response = DeviceListResponse.from_api_response(data)
            logger.info(
                "Toplam %d cihaz → %d çevrimiçi, %d çevrimdışı",
                response.total, response.online, response.offline,
            )
            return response

        except AuthenticationError:
            logger.error("Kimlik doğrulama başarısız. Token'ı kontrol edin.")
            raise
        except Exception as exc:
            logger.error("Cihaz listesi alınamadı: %s", exc)
            raise

    async def get_device(self, device_id: str) -> Optional[Device]:
        """Belirtilen ID'ye sahip cihazı getirir."""
        logger.info("Cihaz sorgulanıyor: %s", device_id)
        try:
            data = await self._client.get(f"/devices/{device_id}")
            return Device.from_api_response(data)
        except DeviceNotFoundError:
            logger.warning("Cihaz bulunamadı: %s", device_id)
            return None
        except Exception as exc:
            logger.error("Cihaz sorgulanamadı [%s]: %s", device_id, exc)
            raise

    async def get_online_devices(self) -> List[Device]:
        """Sadece çevrimiçi cihazları döner."""
        response = await self.list_devices()
        return [d for d in response.devices if d.is_online()]

    async def get_devices_by_room(self, room: str) -> List[Device]:
        """Belirtilen odadaki cihazları döner."""
        response = await self.list_devices()
        return [d for d in response.devices if d.room and d.room.lower() == room.lower()]

    async def get_devices_by_type(self, device_type: DeviceType) -> List[Device]:
        """Belirtilen türdeki cihazları döner."""
        response = await self.list_devices()
        return [d for d in response.devices if d.device_type == device_type]

    # ------------------------------------------------------------------ #
    #  Kontrol                                                             #
    # ------------------------------------------------------------------ #

    async def send_command(self, command: DeviceCommand) -> CommandResult:
        """Ham komut nesnesi gönderir."""
        logger.info(
            "Komut gönderiliyor → cihaz: %s, aksiyon: %s",
            command.device_id, command.action,
        )
        try:
            data = await self._client.post(
                f"/devices/{command.device_id}/command",
                command.to_payload(),
            )
            result = CommandResult.ok(
                message=data.get("message", "Komut başarıyla gönderildi."),
                device_id=command.device_id,
                data=data,
            )
            logger.info("Komut başarılı: %s", result.message)
            self._client.clear_cache()   # Durum değişti, önbelleği temizle
            return result

        except DeviceNotFoundError:
            return CommandResult.fail(
                f"Cihaz bulunamadı: {command.device_id}",
                error_code="DEVICE_NOT_FOUND",
            )
        except Exception as exc:
            logger.error("Komut gönderilemedi: %s", exc)
            return CommandResult.fail(str(exc), error_code="COMMAND_FAILED")

    async def turn_on(self, device_id: str) -> CommandResult:
        """Cihazı açar."""
        return await self.send_command(DeviceCommand(device_id, "turn_on"))

    async def turn_off(self, device_id: str) -> CommandResult:
        """Cihazı kapatır."""
        return await self.send_command(DeviceCommand(device_id, "turn_off"))

    async def toggle(self, device_id: str) -> CommandResult:
        """Cihazı aç/kapat yapar (mevcut durumu tersine çevirir)."""
        device = await self.get_device(device_id)
        if not device:
            return CommandResult.fail("Cihaz bulunamadı.", error_code="DEVICE_NOT_FOUND")

        action = "turn_off" if device.state == "on" else "turn_on"
        return await self.send_command(DeviceCommand(device_id, action))

    async def set_temperature(self, device_id: str, temperature: float) -> CommandResult:
        """Klima/termostat sıcaklığını ayarlar."""
        return await self.send_command(
            DeviceCommand(device_id, "set_temperature", {"temperature": temperature})
        )

    async def set_brightness(self, device_id: str, brightness: int) -> CommandResult:
        """Işık parlaklığını ayarlar (0-255)."""
        brightness = max(0, min(255, brightness))
        return await self.send_command(
            DeviceCommand(device_id, "set_brightness", {"brightness": brightness})
        )

    # ------------------------------------------------------------------ #
    #  Yenileme & Kayıt                                                    #
    # ------------------------------------------------------------------ #

    async def refresh_device(self, device_id: str) -> CommandResult:
        """Cihaz durumunu yeniler."""
        logger.info("Cihaz yenileniyor: %s", device_id)
        try:
            data = await self._client.get(f"/devices/{device_id}/refresh")
            self._client.clear_cache()
            return CommandResult.ok(
                "Cihaz yenilendi.",
                device_id=device_id,
                data=data,
            )
        except Exception as exc:
            return CommandResult.fail(str(exc))

    async def register_device(self, name: str, device_type: DeviceType, room: str = "") -> CommandResult:
        """Yeni bir cihaz kaydeder."""
        logger.info("Yeni cihaz kaydediliyor: %s (%s)", name, device_type.value)
        try:
            payload = {"name": name, "type": device_type.value, "room": room}
            data    = await self._client.post("/devices/register", payload)
            self._client.clear_cache()
            return CommandResult.ok(
                f"Cihaz kaydedildi: {name}",
                device_id=data.get("id"),
                data=data,
            )
        except Exception as exc:
            logger.error("Cihaz kaydedilemedi: %s", exc)
            return CommandResult.fail(str(exc))
