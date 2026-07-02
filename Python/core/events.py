"""
core/events.py

HomeOS Python Core - Event Bus Modülü

Sistemin tamamı Event Driven Architecture (Olay Güdümlü Mimari) üzerine
kuruludur. Bu modül, publish/subscribe (yayınla/abone ol) mantığıyla
çalışan asenkron bir Event Bus sağlar.

Tasarım Deseni: Observer Pattern

Örnek Eventler:
    DeviceConnected, DeviceDisconnected, MotionDetected,
    CommandExecuted, AutomationTriggered, SpeechRecognized
"""

from __future__ import annotations

import asyncio
import inspect
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Awaitable, Callable, Optional, Union
from uuid import uuid4

from core.logger import get_logger

logger = get_logger("core.events")

# Bir event handler, senkron ya da asenkron bir callable olabilir.
EventHandler = Callable[["Event"], Union[None, Awaitable[None]]]


class EventType(str, Enum):
    """Sistem genelinde kullanılan standart event tipleri."""

    DEVICE_CONNECTED = "DeviceConnected"
    DEVICE_DISCONNECTED = "DeviceDisconnected"
    MOTION_DETECTED = "MotionDetected"
    COMMAND_EXECUTED = "CommandExecuted"
    AUTOMATION_TRIGGERED = "AutomationTriggered"
    SPEECH_RECOGNIZED = "SpeechRecognized"
    PLUGIN_LOADED = "PluginLoaded"
    PLUGIN_FAILED = "PluginFailed"
    SERVICE_CRASHED = "ServiceCrashed"
    SERVICE_RESTARTED = "ServiceRestarted"


@dataclass
class Event:
    """
    Event Bus üzerinde taşınan olay nesnesi.

    Attributes:
        type: Olayın türü (EventType ya da serbest metin olabilir).
        payload: Olayla birlikte taşınan veri.
        source: Olayı yayınlayan bileşenin adı.
        event_id: Her olay için benzersiz kimlik.
        timestamp: Olayın oluşturulma zamanı (UTC).
    """

    type: Union[EventType, str]
    payload: dict[str, Any] = field(default_factory=dict)
    source: str = "unknown"
    event_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:  # pragma: no cover - sadece okunabilirlik için
        return f"<Event type={self.type} source={self.source} id={self.event_id[:8]}>"


class EventBus:
    """
    Asenkron, çok-abone destekli merkezi olay veri yolu.

    Kullanım:
        bus = EventBus()
        bus.subscribe(EventType.MOTION_DETECTED, my_handler)
        await bus.publish(Event(type=EventType.MOTION_DETECTED, payload={"room": "koridor"}))
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, list[EventHandler]] = {}
        self._wildcard_subscribers: list[EventHandler] = []
        self._lock = asyncio.Lock()
        self._history: list[Event] = []
        self._max_history = 500

    def subscribe(self, event_type: Union[EventType, str], handler: EventHandler) -> None:
        """
        Belirli bir event tipine abone olur.

        Args:
            event_type: Dinlenecek event tipi.
            handler: Event tetiklendiğinde çağrılacak fonksiyon (sync veya async).
        """
        key = self._normalize_type(event_type)
        self._subscribers.setdefault(key, []).append(handler)
        logger.debug("Yeni abone eklendi: event_type=%s handler=%s", key, getattr(handler, "__name__", handler))

    def subscribe_all(self, handler: EventHandler) -> None:
        """Her türlü event'i dinlemek isteyen 'wildcard' abonelik ekler."""
        self._wildcard_subscribers.append(handler)
        logger.debug("Wildcard abone eklendi: handler=%s", getattr(handler, "__name__", handler))

    def unsubscribe(self, event_type: Union[EventType, str], handler: EventHandler) -> None:
        """Belirli bir event tipinden aboneliği kaldırır."""
        key = self._normalize_type(event_type)
        handlers = self._subscribers.get(key, [])
        if handler in handlers:
            handlers.remove(handler)
            logger.debug("Abonelik kaldırıldı: event_type=%s", key)

    async def publish(self, event: Event) -> None:
        """
        Bir olayı yayınlar. Tüm ilgili abonelere (paralel olarak) dağıtır.
        Bir abonenin hata fırlatması, diğer abonelerin çalışmasını engellemez.

        Args:
            event: Yayınlanacak Event nesnesi.
        """
        key = self._normalize_type(event.type)
        logger.info("Event yayınlanıyor: %s | payload=%s", event, event.payload)

        async with self._lock:
            self._history.append(event)
            if len(self._history) > self._max_history:
                self._history.pop(0)

        handlers = list(self._subscribers.get(key, [])) + list(self._wildcard_subscribers)
        if not handlers:
            logger.debug("Event için abone bulunamadı: %s", key)
            return

        tasks = [self._safe_invoke(handler, event) for handler in handlers]
        await asyncio.gather(*tasks, return_exceptions=False)

    async def _safe_invoke(self, handler: EventHandler, event: Event) -> None:
        """Bir handler'ı güvenli biçimde çağırır; hataları loglar, sistemi düşürmez."""
        try:
            result = handler(event)
            if inspect.isawaitable(result):
                await result
        except Exception:  # noqa: BLE001 - handler hatası tüm sistemi etkilememeli
            logger.exception(
                "Event handler çalışırken hata oluştu: event=%s handler=%s",
                event,
                getattr(handler, "__name__", handler),
            )

    def get_history(self, limit: Optional[int] = None) -> list[Event]:
        """Son yayınlanan olayların geçmişini döndürür (debug/izleme amaçlı)."""
        if limit is None:
            return list(self._history)
        return self._history[-limit:]

    @staticmethod
    def _normalize_type(event_type: Union[EventType, str]) -> str:
        """EventType enum ya da string olabilen tipi standart string'e çevirir."""
        return event_type.value if isinstance(event_type, EventType) else str(event_type)


# Uygulama genelinde paylaşılan tekil (singleton) event bus örneği.
_global_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Uygulama genelinde paylaşılan EventBus singleton'ını döndürür."""
    global _global_bus
    if _global_bus is None:
        _global_bus = EventBus()
    return _global_bus


if __name__ == "__main__":
    # Basit test senaryosu:
    # 1) Bir handler MOTION_DETECTED event'ine abone olur.
    # 2) Event yayınlanır ve handler'ın çağrıldığı doğrulanır.
    # 3) Wildcard abonenin de tetiklendiği doğrulanır.

    async def _run_test() -> None:
        bus = EventBus()
        received: list[Event] = []
        wildcard_received: list[Event] = []

        async def on_motion(event: Event) -> None:
            received.append(event)

        def on_any(event: Event) -> None:
            wildcard_received.append(event)

        bus.subscribe(EventType.MOTION_DETECTED, on_motion)
        bus.subscribe_all(on_any)

        test_event = Event(
            type=EventType.MOTION_DETECTED,
            payload={"room": "koridor"},
            source="test",
        )
        await bus.publish(test_event)

        assert len(received) == 1
        assert received[0].payload["room"] == "koridor"
        assert len(wildcard_received) == 1
        assert len(bus.get_history()) == 1

        print("events.py test senaryosu başarılı ✅")

    asyncio.run(_run_test())
