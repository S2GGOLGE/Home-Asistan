"""
core/watchdog.py

HomeOS Python Core - Watchdog (Servis İzleyici) Modülü

Bu modül, sistemdeki asenkron servisleri (SignalR client, MQTT client,
Scheduler, vb.) izler. Bir servis çökerse (exception fırlatıp task'ı
sonlanırsa) watchdog bunu tespit eder, loglar, ilgili event'i yayınlar
ve servisi otomatik olarak yeniden başlatır.

Tasarım Deseni: Strategy Pattern (her servis kendi start/stop stratejisini uygular)
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Awaitable, Callable, Optional

from core.config import WatchdogConfig
from core.events import Event, EventType, EventBus
from core.logger import get_logger

logger = get_logger("core.watchdog")

# Bir servis, parametresiz, coroutine döndüren bir factory fonksiyonudur.
ServiceFactory = Callable[[], Awaitable[None]]


class ServiceState(str, Enum):
    """İzlenen bir servisin olası durumları."""

    STOPPED = "stopped"
    RUNNING = "running"
    CRASHED = "crashed"
    RESTARTING = "restarting"
    FAILED = "failed"  # max_restart_attempts aşıldı


@dataclass
class ManagedService:
    """
    Watchdog tarafından izlenen tek bir servisi temsil eder.

    Attributes:
        name: Servisin insan-okunabilir adı (örn: 'signalr_client').
        factory: Servisi başlatan async fonksiyon.
        state: Servisin mevcut durumu.
        restart_count: Bu servisin kaç kez yeniden başlatıldığı.
        task: Servisin çalıştığı asyncio.Task referansı.
    """

    name: str
    factory: ServiceFactory
    state: ServiceState = ServiceState.STOPPED
    restart_count: int = 0
    task: Optional[asyncio.Task] = field(default=None, repr=False)


class Watchdog:
    """
    Kayıtlı servisleri izleyen, çöken servisleri yeniden başlatan
    merkezi izleme bileşeni.

    Kullanım:
        watchdog = Watchdog(config.watchdog, event_bus)
        watchdog.register("signalr_client", signalr_client.run)
        await watchdog.start()
    """

    def __init__(self, config: WatchdogConfig, event_bus: EventBus) -> None:
        self._config = config
        self._event_bus = event_bus
        self._services: dict[str, ManagedService] = {}
        self._running = False
        self._monitor_task: Optional[asyncio.Task] = None

    def register(self, name: str, factory: ServiceFactory) -> None:
        """
        İzlenecek yeni bir servis kaydeder.

        Args:
            name: Servisin benzersiz adı.
            factory: Çağrıldığında servisin ana coroutine'ini döndüren fonksiyon.
        """
        if name in self._services:
            raise ValueError(f"'{name}' isimli servis zaten kayıtlı.")
        self._services[name] = ManagedService(name=name, factory=factory)
        logger.info("Servis watchdog'a kaydedildi: %s", name)

    async def start(self) -> None:
        """Tüm kayıtlı servisleri başlatır ve izleme döngüsünü çalıştırır."""
        self._running = True
        for service in self._services.values():
            self._launch(service)

        self._monitor_task = asyncio.create_task(self._monitor_loop(), name="watchdog-monitor")
        logger.info("Watchdog başlatıldı. %d servis izleniyor.", len(self._services))

    async def stop(self) -> None:
        """Watchdog'u ve tüm izlenen servisleri güvenli biçimde durdurur."""
        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()

        for service in self._services.values():
            if service.task and not service.task.done():
                service.task.cancel()
            service.state = ServiceState.STOPPED

        logger.info("Watchdog ve tüm servisler durduruldu.")

    def _launch(self, service: ManagedService) -> None:
        """Bir servisi asyncio.Task olarak başlatır."""
        service.task = asyncio.create_task(service.factory(), name=f"service-{service.name}")
        service.state = ServiceState.RUNNING
        logger.info("Servis başlatıldı: %s", service.name)

    async def _monitor_loop(self) -> None:
        """
        Periyodik olarak tüm servislerin sağlığını kontrol eden ana döngü.
        Çöken (task'ı exception ile biten) servisleri tespit edip yeniden başlatır.
        """
        try:
            while self._running:
                await asyncio.sleep(self._config.check_interval_seconds)
                for service in self._services.values():
                    await self._check_service_health(service)
        except asyncio.CancelledError:
            logger.debug("Watchdog izleme döngüsü iptal edildi.")
            raise

    async def _check_service_health(self, service: ManagedService) -> None:
        """Tek bir servisin sağlığını kontrol eder, gerekiyorsa yeniden başlatır."""
        if service.task is None:
            return

        if not service.task.done():
            return  # Servis hâlâ sağlıklı çalışıyor.

        exception = service.task.exception() if not service.task.cancelled() else None

        if exception is not None:
            service.state = ServiceState.CRASHED
            logger.error("Servis çöktü: %s | hata=%s", service.name, exception, exc_info=exception)
            await self._event_bus.publish(
                Event(
                    type=EventType.SERVICE_CRASHED,
                    payload={"service": service.name, "error": str(exception)},
                    source="watchdog",
                )
            )
            await self._restart_service(service)
        else:
            # Servis kendi isteğiyle normal şekilde tamamlandı; yeniden başlatma.
            service.state = ServiceState.STOPPED
            logger.info("Servis normal şekilde tamamlandı: %s", service.name)

    async def _restart_service(self, service: ManagedService) -> None:
        """Çöken bir servisi, yapılandırılan limitler dahilinde yeniden başlatır."""
        if service.restart_count >= self._config.max_restart_attempts:
            service.state = ServiceState.FAILED
            logger.critical(
                "Servis maksimum yeniden başlatma denemesini aştı, devre dışı bırakıldı: %s",
                service.name,
            )
            return

        service.state = ServiceState.RESTARTING
        service.restart_count += 1
        backoff = self._config.restart_backoff_seconds * service.restart_count
        logger.warning(
            "Servis yeniden başlatılıyor: %s | deneme=%d/%d | bekleme=%.1fs",
            service.name,
            service.restart_count,
            self._config.max_restart_attempts,
            backoff,
        )
        await asyncio.sleep(backoff)
        self._launch(service)

        await self._event_bus.publish(
            Event(
                type=EventType.SERVICE_RESTARTED,
                payload={"service": service.name, "attempt": service.restart_count},
                source="watchdog",
            )
        )

    def get_status(self) -> dict[str, str]:
        """Tüm servislerin mevcut durumlarını döndürür (health-check endpoint için uygundur)."""
        return {name: svc.state.value for name, svc in self._services.items()}


if __name__ == "__main__":
    # Basit test senaryosu:
    # 1) Kasıtlı olarak çöken sahte bir servis kaydedilir.
    # 2) Watchdog'un servisi tespit edip yeniden başlattığı doğrulanır.

    async def _run_test() -> None:
        crash_count = {"value": 0}

        async def flaky_service() -> None:
            crash_count["value"] += 1
            if crash_count["value"] < 2:
                await asyncio.sleep(0.1)
                raise RuntimeError("Kasıtlı test hatası")
            await asyncio.sleep(5)  # ikinci denemede "sağlıklı" kalır

        test_config = WatchdogConfig(check_interval_seconds=0.2, restart_backoff_seconds=0.1)
        bus = EventBus()
        watchdog = Watchdog(test_config, bus)
        watchdog.register("flaky_service", flaky_service)

        await watchdog.start()
        await asyncio.sleep(1.0)
        await watchdog.stop()

        status = watchdog.get_status()
        assert crash_count["value"] >= 2, "Servis en az bir kez yeniden başlatılmalıydı."
        print("Servis durumu:", status)
        print("watchdog.py test senaryosu başarılı ✅")

    asyncio.run(_run_test())
