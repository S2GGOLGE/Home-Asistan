"""
core/app.py

HomeOS Python Core - Uygulama Giriş Noktası (Orchestrator)

Bu modül, sistemin kalbidir. Diğer tüm core bileşenlerini
(config, logger, event bus, watchdog) bir araya getirir ve uygulamanın
yaşam döngüsünü (başlatma / çalıştırma / kapatma) yönetir.

Tasarım Deseni: Dependency Injection + Facade
    HomeOSApplication sınıfı, alt sistemleri dışarıya tek bir arayüzle sunar.

Not: assistant/, ai/, plugins/, automation/, devices/, communication/,
speech/ modülleri henüz geliştirilmediği için bu dosyada sadece
core/ katmanının orkestrasyonu bulunur. İlerleyen adımlarda
HomeOSApplication.register_service() ile diğer servisler eklenecektir.
"""

from __future__ import annotations

import asyncio
import signal
from typing import Optional

from core.config import AppConfig, ConfigLoader
from core.events import Event, EventBus, EventType, get_event_bus
from core.logger import LoggerFactory, get_logger
from core.watchdog import ServiceFactory, Watchdog

logger = get_logger("core.app")


class HomeOSApplication:
    """
    HomeOS Python Core'un ana uygulama sınıfı.

    Sorumlulukları:
        - Konfigürasyonu yüklemek
        - Loglama sistemini kurmak
        - Event Bus'ı oluşturmak
        - Watchdog üzerinden izlenecek servisleri kaydetmek
        - Graceful shutdown (düzgün kapanma) sağlamak

    Kullanım:
        app = HomeOSApplication(config_path="config.json")
        await app.initialize()
        app.register_service("signalr_client", signalr_client.run)
        await app.run()
    """

    def __init__(self, config_path: str = "config.json") -> None:
        self._config_path = config_path
        self.config: Optional[AppConfig] = None
        self.event_bus: Optional[EventBus] = None
        self.watchdog: Optional[Watchdog] = None
        self._shutdown_event: asyncio.Event = asyncio.Event()
        self._initialized = False

    async def initialize(self) -> None:
        """
        Uygulamanın temel alt sistemlerini sırasıyla başlatır:
        1. Konfigürasyon yüklenir.
        2. Loglama sistemi kurulur.
        3. Event Bus oluşturulur.
        4. Watchdog oluşturulur.
        """
        self.config = ConfigLoader.load(self._config_path)
        LoggerFactory.configure(self.config.logging)

        logger.info("=" * 60)
        logger.info("HomeOS Python Core başlatılıyor... (env=%s)", self.config.environment)
        logger.info("=" * 60)

        self.event_bus = get_event_bus()
        self.watchdog = Watchdog(self.config.watchdog, self.event_bus)

        self._register_signal_handlers()
        self._initialized = True
        logger.info("Core alt sistemleri başarıyla başlatıldı.")

    def register_service(self, name: str, factory: ServiceFactory) -> None:
        """
        Watchdog tarafından izlenecek yeni bir servis kaydeder.
        Bu metod, ilerleyen adımlarda SignalR client, MQTT client,
        Scheduler gibi uzun ömürlü servisleri eklemek için kullanılacaktır.

        Args:
            name: Servisin benzersiz adı.
            factory: Servisin ana coroutine'ini döndüren async fonksiyon.
        """
        if not self._initialized or self.watchdog is None:
            raise RuntimeError("Servis kaydetmeden önce initialize() çağrılmalıdır.")
        self.watchdog.register(name, factory)

    async def run(self) -> None:
        """
        Uygulamayı çalıştırır. Watchdog üzerinden tüm servisleri başlatır
        ve kapanma sinyali gelene kadar bekler.
        """
        if not self._initialized:
            raise RuntimeError("run() çağrılmadan önce initialize() çağrılmalıdır.")

        assert self.watchdog is not None and self.event_bus is not None

        await self.watchdog.start()
        logger.info("HomeOS Python Core çalışıyor. Çıkmak için CTRL+C.")

        await self._shutdown_event.wait()
        await self._shutdown()

    async def _shutdown(self) -> None:
        """Tüm servisleri düzgün biçimde durdurur (graceful shutdown)."""
        logger.info("Kapanma süreci başlatıldı...")
        if self.watchdog:
            await self.watchdog.stop()
        logger.info("HomeOS Python Core başarıyla kapatıldı. Hoşça kal 👋")

    def _register_signal_handlers(self) -> None:
        """SIGINT (CTRL+C) ve SIGTERM sinyallerini yakalayarak düzgün kapanmayı tetikler."""
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, self._request_shutdown)
            except NotImplementedError:
                # Windows gibi bazı platformlarda add_signal_handler desteklenmeyebilir.
                logger.warning("Bu platformda signal handler eklenemedi: %s", sig)

    def _request_shutdown(self) -> None:
        """Bir kapanma sinyali alındığında shutdown event'ini tetikler."""
        logger.info("Kapanma sinyali alındı.")
        self._shutdown_event.set()


async def main() -> None:
    """Uygulamanın standart giriş noktası."""
    app = HomeOSApplication(config_path="config.json")
    await app.initialize()

    # NOT: İlerleyen adımlarda burada gerçek servisler kaydedilecek, örn:
    # app.register_service("signalr_client", signalr_client.run)
    # app.register_service("scheduler", scheduler.run)

    await app.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
