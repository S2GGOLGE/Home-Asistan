"""
Jarvis Bridge - Konfigürasyon Modülü
Home Asistan API bağlantı ayarları
"""
import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BridgeConfig:
    """
    Tüm bağlantı ve sistem ayarlarını tutar.
    .env dosyasından veya ortam değişkenlerinden okunur.
    """
    # --- Home Asistan API ---
    ha_base_url: str = field(
        default_factory=lambda: os.getenv("HA_BASE_URL", "http://localhost:5000/api")
    )
    ha_api_token: str = field(
        default_factory=lambda: os.getenv("HA_API_TOKEN", "")
    )
    ha_timeout: int = field(
        default_factory=lambda: int(os.getenv("HA_TIMEOUT", "10"))
    )

    # --- Bağlantı Havuzu ---
    connection_pool_size: int = field(
        default_factory=lambda: int(os.getenv("CONNECTION_POOL_SIZE", "10"))
    )
    max_retries: int = field(
        default_factory=lambda: int(os.getenv("MAX_RETRIES", "3"))
    )
    retry_delay: float = field(
        default_factory=lambda: float(os.getenv("RETRY_DELAY", "1.0"))
    )

    # --- Loglama ---
    log_level: str = field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )
    log_file: Optional[str] = field(
        default_factory=lambda: os.getenv("LOG_FILE", "jarvis_bridge.log")
    )

    # --- Önbellek ---
    cache_ttl_seconds: int = field(
        default_factory=lambda: int(os.getenv("CACHE_TTL", "30"))
    )

    def validate(self) -> None:
        """Kritik ayarların dolu olduğunu kontrol eder."""
        if not self.ha_base_url:
            raise ValueError("HA_BASE_URL boş olamaz.")
        if not self.ha_api_token:
            raise ValueError(
                "HA_API_TOKEN ayarlanmamış! "
                ".env dosyasına veya ortam değişkenlerine ekleyin."
            )


# Singleton konfigürasyon nesnesi
config = BridgeConfig()
