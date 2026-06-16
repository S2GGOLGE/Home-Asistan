"""
Jarvis Bridge - Komut İşleyici
Doğal dil komutlarını cihaz aksiyonlarına dönüştürür.

Desteklenen komut kalıpları (TR/EN):
  "salon ışığını aç"        → turn_on(salon_light_id)
  "klimayı kapat"           → turn_off(klima_id)
  "klima durumunu göster"   → get_device(klima_id)
  "tüm cihazları listele"   → list_devices()
  "mutfak ışığını 50% yap"  → set_brightness(...)
  "salonu 22 dereceye ayarla" → set_temperature(...)
"""
import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from ..models import DeviceType
from ..utils.logger import setup_logger
from ..config import config as cfg

logger = setup_logger("jarvis.command_parser", cfg.log_level)


class Intent(str, Enum):
    """Jarvis'in anlayabileceği niyet türleri."""
    TURN_ON          = "turn_on"
    TURN_OFF         = "turn_off"
    TOGGLE           = "toggle"
    GET_STATUS       = "get_status"
    LIST_DEVICES     = "list_devices"
    SET_TEMPERATURE  = "set_temperature"
    SET_BRIGHTNESS   = "set_brightness"
    REFRESH          = "refresh"
    UNKNOWN          = "unknown"


@dataclass
class ParsedCommand:
    """Ayrıştırılmış komutun sonucu."""
    intent:     Intent
    raw_text:   str
    room:       Optional[str] = None
    device_keyword: Optional[str] = None
    params:     Dict[str, Any] = None

    def __post_init__(self):
        if self.params is None:
            self.params = {}

    def is_valid(self) -> bool:
        return self.intent != Intent.UNKNOWN


class CommandParser:
    """
    Doğal dil komutlarını ayrıştırır.

    Basit kural tabanlı yaklaşım — ileride bir LLM modeli ile değiştirilebilir.
    """

    # Niyet → tetikleyici kelimeler
    INTENT_PATTERNS: List[Tuple[Intent, List[str]]] = [
        (Intent.LIST_DEVICES,    ["listele", "göster tüm", "tümünü", "hepsini", "list all", "show all"]),
        (Intent.TURN_ON,         ["aç", "çalıştır", "başlat", "aktif et", "turn on", "switch on", "open"]),
        (Intent.TURN_OFF,        ["kapat", "durdur", "pasif et", "söndür", "turn off", "switch off", "close"]),
        (Intent.TOGGLE,          ["toggle", "değiştir"]),
        (Intent.GET_STATUS,      ["durum", "status", "göster", "nasıl", "ne kadar", "show", "check"]),
        (Intent.SET_TEMPERATURE, ["derece", "sıcaklık", "temperature", "set temp", "ısıt"]),
        (Intent.SET_BRIGHTNESS,  ["parlaklık", "brightness", "karart", "parlat", "dim", "bright"]),
        (Intent.REFRESH,         ["yenile", "güncelle", "refresh", "update"]),
    ]

    # Oda anahtar kelimeleri
    ROOM_KEYWORDS = [
        "salon", "oturma odası", "yatak odası", "mutfak", "banyo",
        "çocuk odası", "balkon", "koridor", "antre", "ofis", "çalışma odası",
        "living room", "bedroom", "kitchen", "bathroom", "office",
    ]

    # Cihaz türü anahtar kelimeleri
    DEVICE_KEYWORDS = {
        "ışık": DeviceType.LIGHT,
        "lamba": DeviceType.LIGHT,
        "aydınlatma": DeviceType.LIGHT,
        "light": DeviceType.LIGHT,
        "klima": DeviceType.CLIMATE,
        "termostat": DeviceType.CLIMATE,
        "ısıtıcı": DeviceType.CLIMATE,
        "ac": DeviceType.CLIMATE,
        "climate": DeviceType.CLIMATE,
        "priz": DeviceType.SWITCH,
        "switch": DeviceType.SWITCH,
        "kilit": DeviceType.LOCK,
        "lock": DeviceType.LOCK,
        "kamera": DeviceType.CAMERA,
        "camera": DeviceType.CAMERA,
        "müzik": DeviceType.MEDIA,
        "tv": DeviceType.MEDIA,
        "televizyon": DeviceType.MEDIA,
    }

    def parse(self, text: str) -> ParsedCommand:
        """Metin komutunu ayrıştırır."""
        text_lower = text.lower().strip()
        logger.debug("Komut ayrıştırılıyor: '%s'", text)

        intent  = self._detect_intent(text_lower)
        room    = self._detect_room(text_lower)
        device  = self._detect_device_keyword(text_lower)
        params  = self._extract_params(intent, text_lower)

        parsed = ParsedCommand(
            intent=intent,
            raw_text=text,
            room=room,
            device_keyword=device,
            params=params,
        )
        logger.info(
            "Ayrıştırma sonucu → niyet: %s | oda: %s | cihaz: %s | params: %s",
            intent.value, room, device, params,
        )
        return parsed

    def _detect_intent(self, text: str) -> Intent:
        for intent, keywords in self.INTENT_PATTERNS:
            if any(kw in text for kw in keywords):
                return intent
        return Intent.UNKNOWN

    def _detect_room(self, text: str) -> Optional[str]:
        for room in self.ROOM_KEYWORDS:
            if room in text:
                return room
        return None

    def _detect_device_keyword(self, text: str) -> Optional[str]:
        for keyword in self.DEVICE_KEYWORDS:
            if keyword in text:
                return keyword
        return None

    def get_device_type(self, keyword: Optional[str]) -> Optional[DeviceType]:
        if not keyword:
            return None
        return self.DEVICE_KEYWORDS.get(keyword)

    def _extract_params(self, intent: Intent, text: str) -> Dict[str, Any]:
        params: Dict[str, Any] = {}

        if intent == Intent.SET_TEMPERATURE:
            # "22 derece", "22°", "temperature 22"
            match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:derece|°|degree|celsius)?", text)
            if match:
                params["temperature"] = float(match.group(1).replace(",", "."))

        elif intent == Intent.SET_BRIGHTNESS:
            # "50%", "50 yüzde", "%50"
            match = re.search(r"(%\s*)?(\d+)\s*(%|yüzde|percent)?", text)
            if match:
                pct = float(match.group(2))
                params["brightness"] = int((pct / 100) * 255)

        return params


class VoiceCommandProcessor:
    """
    Yüksek seviyeli komut işleyici.
    Parser + DeviceService birleşimi.
    """

    def __init__(self, device_service, parser: CommandParser = None):
        self._service = device_service
        self._parser  = parser or CommandParser()

    async def process(self, text: str) -> str:
        """
        Metin komutu alır, işler, kullanıcı dostu yanıt döner.

        Args:
            text: "salon ışığını aç"

        Returns:
            "✅ Salon ışığı açıldı."
        """
        parsed = self._parser.parse(text)

        if not parsed.is_valid():
            return (
                f"❓ Komutu anlayamadım: '{text}'\n"
                "Örnek: 'salon ışığını aç', 'tüm cihazları listele'"
            )

        if parsed.intent == Intent.LIST_DEVICES:
            return await self._handle_list(parsed)

        if parsed.intent in (Intent.TURN_ON, Intent.TURN_OFF, Intent.TOGGLE,
                              Intent.SET_TEMPERATURE, Intent.SET_BRIGHTNESS):
            return await self._handle_control(parsed)

        if parsed.intent == Intent.GET_STATUS:
            return await self._handle_status(parsed)

        if parsed.intent == Intent.REFRESH:
            return await self._handle_refresh(parsed)

        return "⚠️ Bu komut henüz desteklenmiyor."

    async def _handle_list(self, parsed: ParsedCommand) -> str:
        response = await self._service.list_devices()
        if not response.devices:
            return "📭 Kayıtlı cihaz bulunamadı."

        lines = [f"📋 Toplam {response.total} cihaz ({response.online} çevrimiçi):"]
        for device in response.devices:
            lines.append(f"  {device}")
        return "\n".join(lines)

    async def _handle_control(self, parsed: ParsedCommand) -> str:
        # Oda veya cihaz tipine göre cihaz bul
        target_devices = []

        if parsed.room:
            target_devices = await self._service.get_devices_by_room(parsed.room)

        device_type = self._parser.get_device_type(parsed.device_keyword)
        if device_type and not target_devices:
            target_devices = await self._service.get_devices_by_type(device_type)

        if not target_devices:
            what = parsed.room or parsed.device_keyword or "cihaz"
            return f"❌ '{what}' için cihaz bulunamadı."

        results = []
        for device in target_devices:
            if parsed.intent == Intent.TURN_ON:
                result = await self._service.turn_on(device.id)
            elif parsed.intent == Intent.TURN_OFF:
                result = await self._service.turn_off(device.id)
            elif parsed.intent == Intent.TOGGLE:
                result = await self._service.toggle(device.id)
            elif parsed.intent == Intent.SET_TEMPERATURE and "temperature" in parsed.params:
                result = await self._service.set_temperature(device.id, parsed.params["temperature"])
            elif parsed.intent == Intent.SET_BRIGHTNESS and "brightness" in parsed.params:
                result = await self._service.set_brightness(device.id, parsed.params["brightness"])
            else:
                continue

            icon = "✅" if result.success else "❌"
            results.append(f"{icon} {device.name}: {result.message}")

        return "\n".join(results) if results else "⚠️ Uygulanabilir cihaz bulunamadı."

    async def _handle_status(self, parsed: ParsedCommand) -> str:
        if parsed.room:
            devices = await self._service.get_devices_by_room(parsed.room)
        else:
            device_type = self._parser.get_device_type(parsed.device_keyword)
            if device_type:
                devices = await self._service.get_devices_by_type(device_type)
            else:
                response = await self._service.list_devices()
                devices  = response.devices

        if not devices:
            return "❌ Belirtilen kriter için cihaz bulunamadı."

        lines = [f"📊 Durum Raporu ({len(devices)} cihaz):"]
        for d in devices:
            lines.append(f"  {d}")
        return "\n".join(lines)

    async def _handle_refresh(self, parsed: ParsedCommand) -> str:
        if parsed.room:
            devices = await self._service.get_devices_by_room(parsed.room)
            for d in devices:
                await self._service.refresh_device(d.id)
            return f"🔄 {len(devices)} cihaz yenilendi ({parsed.room})."
        return "⚠️ Hangi cihazı yenilemek istediğinizi belirtin."
