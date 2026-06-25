"""
Jarvis Bridge - Veri Modelleri
Cihaz durumları, komutlar ve API yanıt şemaları
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class DeviceStatus(str, Enum):
    """Cihaz çevrimiçi/çevrimdışı durumları."""
    ONLINE  = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


class DeviceType(str, Enum):
    """Desteklenen cihaz türleri."""
    LIGHT     = "light"
    CLIMATE   = "climate"
    SWITCH    = "switch"
    SENSOR    = "sensor"
    LOCK      = "lock"
    CAMERA    = "camera"
    MEDIA     = "media_player"
    UNKNOWN   = "unknown"


@dataclass
class Device:
    """Tek bir ev cihazını temsil eder."""
    id:           str
    name:         str
    device_type:  DeviceType
    status:       DeviceStatus
    state:        str                          # "on" / "off" / sıcaklık vs.
    attributes:   Dict[str, Any] = field(default_factory=dict)
    last_updated: Optional[datetime] = None
    room:         Optional[str] = None

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> "Device":
        """API JSON yanıtından Device nesnesi oluşturur."""
        return cls(
            id=data.get("id", ""),
            name=data.get("name", "Bilinmeyen Cihaz"),
            device_type=DeviceType(data.get("type", "unknown")),
            status=DeviceStatus(data.get("status", "unknown")),
            state=data.get("state", "unknown"),
            attributes=data.get("attributes", {}),
            last_updated=(
                datetime.fromisoformat(data["lastUpdated"])
                if data.get("lastUpdated") else None
            ),
            room=data.get("room"),
        )

    def is_online(self) -> bool:
        return self.status == DeviceStatus.ONLINE

    def __str__(self) -> str:
        icon_map = {
            DeviceType.LIGHT:   "💡",
            DeviceType.CLIMATE: "🌡️",
            DeviceType.SWITCH:  "🔌",
            DeviceType.SENSOR:  "📡",
            DeviceType.LOCK:    "🔒",
            DeviceType.CAMERA:  "📷",
            DeviceType.MEDIA:   "🎵",
        }
        icon   = icon_map.get(self.device_type, "📟")
        status = "✅" if self.is_online() else "❌"
        return f"{icon} {self.name} [{self.state}] {status}"


@dataclass
class CommandResult:
    """Bir komutun sonucunu tutar."""
    success:    bool
    message:    str
    device_id:  Optional[str] = None
    data:       Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None

    @classmethod
    def ok(cls, message: str, device_id: str = None, data: dict = None) -> "CommandResult":
        return cls(success=True, message=message, device_id=device_id, data=data)

    @classmethod
    def fail(cls, message: str, error_code: str = None) -> "CommandResult":
        return cls(success=False, message=message, error_code=error_code)


@dataclass
class DeviceCommand:
    """Bir cihaza gönderilecek komutu tanımlar."""
    device_id: str
    action:    str          # "turn_on", "turn_off", "set_temperature" vs.
    params:    Dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> Dict[str, Any]:
        return {
            "deviceId": self.device_id,
            "action":   self.action,
            "params":   self.params,
        }


@dataclass
class DeviceListResponse:
    """Cihaz listesi API yanıtı."""
    devices:    List[Device]
    total:      int
    online:     int
    offline:    int
    fetched_at: datetime = field(default_factory=datetime.now)

    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> "DeviceListResponse":
        devices = [Device.from_api_response(d) for d in data.get("devices", [])]
        online  = sum(1 for d in devices if d.is_online())
        return cls(
            devices=devices,
            total=data.get("total", len(devices)),
            online=online,
            offline=len(devices) - online,
        )
