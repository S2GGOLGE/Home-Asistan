"""
core/logger.py

HomeOS Python Core - Merkezi Loglama Modülü

Bu modül, sistemin tüm bileşenleri tarafından kullanılacak ortak logger'ı
yapılandırır. Loglar hem konsola hem de rotasyonlu dosyalara yazılır.

Özellikler:
    - INFO, DEBUG, WARNING, ERROR, CRITICAL seviyeleri ayrı dosyalara da yazılabilir.
    - RotatingFileHandler ile dosya boyutu sınırlandırılır.
    - Renkli konsol çıktısı (terminal destekliyorsa).
"""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

from core.config import LoggingConfig


class _ColorFormatter(logging.Formatter):
    """Konsol çıktısı için ANSI renk kodları uygulayan formatter."""

    _COLORS = {
        logging.DEBUG: "\033[36m",     # cyan
        logging.INFO: "\033[32m",      # green
        logging.WARNING: "\033[33m",   # yellow
        logging.ERROR: "\033[31m",     # red
        logging.CRITICAL: "\033[41m",  # kırmızı arka plan
    }
    _RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self._COLORS.get(record.levelno, "")
        message = super().format(record)
        if not sys.stdout.isatty():
            return message
        return f"{color}{message}{self._RESET}"


class LoggerFactory:
    """
    Sistem genelinde kullanılacak logger'ları üreten fabrika sınıfı.

    Tasarım Deseni: Factory Pattern
    """

    _configured = False
    _log_format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    _date_format = "%Y-%m-%d %H:%M:%S"

    @classmethod
    def configure(cls, config: LoggingConfig) -> None:
        """
        Root logger'ı verilen konfigürasyona göre ayarlar.
        Bu metod uygulama başlangıcında bir kez çağrılmalıdır.

        Args:
            config: core.config.LoggingConfig nesnesi.
        """
        if cls._configured:
            return

        log_dir = Path(config.log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)

        root_logger = logging.getLogger("homeos")
        root_logger.setLevel(logging.DEBUG)
        root_logger.propagate = False

        # Konsol handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, config.console_level.upper(), logging.INFO))
        console_handler.setFormatter(_ColorFormatter(cls._log_format, cls._date_format))
        root_logger.addHandler(console_handler)

        # Genel dosya handler (tüm seviyeler)
        general_handler = RotatingFileHandler(
            log_dir / "homeos.log",
            maxBytes=config.max_bytes,
            backupCount=config.backup_count,
            encoding="utf-8",
        )
        general_handler.setLevel(getattr(logging, config.file_level.upper(), logging.DEBUG))
        general_handler.setFormatter(logging.Formatter(cls._log_format, cls._date_format))
        root_logger.addHandler(general_handler)

        # Seviyeye özel dosya handler'ları
        level_map = {
            "info": logging.INFO,
            "debug": logging.DEBUG,
            "warning": logging.WARNING,
            "error": logging.ERROR,
            "critical": logging.CRITICAL,
        }
        for level_name, level_value in level_map.items():
            handler = RotatingFileHandler(
                log_dir / f"{level_name}.log",
                maxBytes=config.max_bytes,
                backupCount=config.backup_count,
                encoding="utf-8",
            )
            handler.setLevel(level_value)
            handler.addFilter(lambda record, lv=level_value: record.levelno == lv)
            handler.setFormatter(logging.Formatter(cls._log_format, cls._date_format))
            root_logger.addHandler(handler)

        cls._configured = True
        root_logger.info("Loglama sistemi başarıyla yapılandırıldı. log_dir=%s", log_dir.resolve())

    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """
        Belirtilen isimde bir alt logger döndürür (örn: 'homeos.plugins.lights').

        Args:
            name: Logger adı, genelde modülün __name__ değeri.

        Returns:
            logging.Logger: Yapılandırılmış logger nesnesi.
        """
        if not cls._configured:
            # Konfigürasyon henüz yapılmadıysa, güvenli varsayılanlarla ayarla.
            cls.configure(LoggingConfig())
        return logging.getLogger(f"homeos.{name}")


def get_logger(name: str) -> logging.Logger:
    """Modül seviyesinde kısayol fonksiyon."""
    return LoggerFactory.get_logger(name)


if __name__ == "__main__":
    # Basit test senaryosu:
    # 1) Logger yapılandırılır.
    # 2) Tüm seviyelerde log mesajı basılır.
    # 3) İlgili log dosyalarının oluştuğu doğrulanır.
    test_config = LoggingConfig(log_dir="logs_test")
    LoggerFactory.configure(test_config)
    test_logger = get_logger("test.logger")

    test_logger.debug("Bu bir DEBUG mesajıdır.")
    test_logger.info("Bu bir INFO mesajıdır.")
    test_logger.warning("Bu bir WARNING mesajıdır.")
    test_logger.error("Bu bir ERROR mesajıdır.")
    test_logger.critical("Bu bir CRITICAL mesajıdır.")

    expected_files = ["homeos.log", "info.log", "debug.log", "warning.log", "error.log", "critical.log"]
    for filename in expected_files:
        assert (Path("logs_test") / filename).exists(), f"{filename} oluşmadı!"

    print("logger.py test senaryosu başarılı ✅")
