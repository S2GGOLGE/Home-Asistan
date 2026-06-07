"""
Jarvis Bridge - Loglama Sistemi
Renkli konsol çıktısı + dosya loglama
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from typing import Optional


class ColorFormatter(logging.Formatter):
    """Konsol çıktısına ANSI renk ekler."""

    COLORS = {
        logging.DEBUG:    "\033[36m",   # Cyan
        logging.INFO:     "\033[32m",   # Yeşil
        logging.WARNING:  "\033[33m",   # Sarı
        logging.ERROR:    "\033[31m",   # Kırmızı
        logging.CRITICAL: "\033[35m",   # Mor
    }
    RESET = "\033[0m"
    BOLD  = "\033[1m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, "")
        record.levelname = f"{color}{self.BOLD}{record.levelname:<8}{self.RESET}"
        return super().format(record)


def setup_logger(
    name:      str,
    level:     str          = "INFO",
    log_file:  Optional[str] = None,
) -> logging.Logger:
    """
    Hem konsola hem dosyaya yazan logger oluşturur.

    Args:
        name:     Logger adı (genellikle modül adı)
        level:    Log seviyesi (DEBUG/INFO/WARNING/ERROR)
        log_file: Dosya yolu (None ise sadece konsol)
    """
    logger    = logging.getLogger(name)
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)

    if logger.handlers:
        return logger  # Çift handler eklemeyi önle

    fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    date_fmt = "%Y-%m-%d %H:%M:%S"

    # Konsol handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(ColorFormatter(fmt, datefmt=date_fmt))
    logger.addHandler(console)

    # Dosya handler (isteğe bağlı)
    if log_file:
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=5 * 1024 * 1024,  # 5 MB
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setFormatter(logging.Formatter(fmt, datefmt=date_fmt))
        logger.addHandler(file_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """Mevcut logger'ı döner (yoksa oluşturur)."""
    return logging.getLogger(name)
