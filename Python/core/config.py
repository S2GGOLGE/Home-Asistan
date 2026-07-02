"""
core/config.py

HomeOS Python Core - Merkezi Konfigürasyon Modülü

Bu modül, uygulamanın tüm ayarlarını tek bir merkezi noktadan yönetir.
Ayarlar sırasıyla şu kaynaklardan okunur (öncelik sırasıyla):
    1. Ortam değişkenleri (environment variables)
    2. config.json dosyası
    3. Dataclass içindeki varsayılan değerler

Tasarım Deseni: Singleton (tek bir Config nesnesi tüm uygulama boyunca paylaşılır)
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional


class ConfigError(Exception):
    """Konfigürasyon okuma/yazma sırasında oluşan hatalar için özel exception sınıfı."""


@dataclass
class ApiConfig:
    """ASP.NET Backend REST API bağlantı ayarları."""

    base_url: str = "https://localhost:5001/api"
    timeout_seconds: float = 10.0
    max_retries: int = 3
    retry_backoff_seconds: float = 1.5


@dataclass
class AuthConfig:
    """JWT kimlik doğrulama ve refresh token ayarları."""

    username: str = ""
    password: str = ""
    token_endpoint: str = "/auth/login"
    refresh_endpoint: str = "/auth/refresh"
    # Token süresi dolmadan kaç saniye önce yenileme yapılacağı
    refresh_margin_seconds: int = 60


@dataclass
class SignalRConfig:
    """SignalR Hub bağlantı ayarları."""

    hub_url: str = "https://localhost:5001/hubs/homeos"
    reconnect_interval_seconds: float = 5.0
    max_reconnect_attempts: int = 0  # 0 = sınırsız


@dataclass
class MqttConfig:
    """MQTT broker bağlantı ayarları."""

    enabled: bool = False
    host: str = "localhost"
    port: int = 1883
    username: Optional[str] = None
    password: Optional[str] = None
    client_id: str = "homeos-python-core"
    keepalive: int = 60


@dataclass
class LoggingConfig:
    """Loglama ayarları."""

    log_dir: str = "logs"
    console_level: str = "INFO"
    file_level: str = "DEBUG"
    max_bytes: int = 10 * 1024 * 1024  # 10 MB
    backup_count: int = 5


@dataclass
class WatchdogConfig:
    """Servis izleme (watchdog) ayarları."""

    check_interval_seconds: float = 15.0
    max_restart_attempts: int = 5
    restart_backoff_seconds: float = 3.0


@dataclass
class VoiceConfig:
    """Sesli asistan (wake word, STT, TTS) ayarları."""

    wake_word: str = "jarvis"
    stt_language: str = "tr-TR"
    tts_voice: str = "tr-TR-EmelNeural"
    streaming_enabled: bool = True


@dataclass
class AppConfig:
    """
    Tüm alt konfigürasyonları bir araya getiren kök konfigürasyon sınıfı.

    Bu sınıf, uygulamanın tamamı tarafından paylaşılan tek gerçek kaynaktır
    (single source of truth).
    """

    environment: str = "development"  # development | staging | production
    debug: bool = True

    api: ApiConfig = field(default_factory=ApiConfig)
    auth: AuthConfig = field(default_factory=AuthConfig)
    signalr: SignalRConfig = field(default_factory=SignalRConfig)
    mqtt: MqttConfig = field(default_factory=MqttConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    watchdog: WatchdogConfig = field(default_factory=WatchdogConfig)
    voice: VoiceConfig = field(default_factory=VoiceConfig)

    plugin_dirs: list[str] = field(default_factory=lambda: ["plugins"])

    def to_dict(self) -> dict[str, Any]:
        """Konfigürasyonu dict formatına çevirir."""
        return asdict(self)


class ConfigLoader:
    """
    Konfigürasyon dosyasını ve ortam değişkenlerini okuyup
    tek bir AppConfig nesnesi üreten yükleyici sınıf.

    Kullanım:
        config = ConfigLoader.load("config.json")
    """

    _instance: Optional[AppConfig] = None

    @classmethod
    def load(cls, config_path: str | Path = "config.json", force_reload: bool = False) -> AppConfig:
        """
        Konfigürasyonu yükler. Singleton mantığıyla çalışır; ilk çağrıdan sonra
        aynı nesne tekrar tekrar döndürülür.

        Args:
            config_path: config.json dosyasının yolu.
            force_reload: True ise, önceden yüklenmiş olsa bile yeniden okur.

        Returns:
            AppConfig: Doldurulmuş konfigürasyon nesnesi.

        Raises:
            ConfigError: JSON dosyası bozuksa veya okunamıyorsa.
        """
        if cls._instance is not None and not force_reload:
            return cls._instance

        config = AppConfig()
        path = Path(config_path)

        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as f:
                    raw = json.load(f)
                config = cls._merge_dict_into_config(config, raw)
            except json.JSONDecodeError as exc:
                raise ConfigError(f"config.json dosyası geçersiz JSON içeriyor: {exc}") from exc
            except OSError as exc:
                raise ConfigError(f"config.json dosyası okunamadı: {exc}") from exc

        config = cls._apply_env_overrides(config)
        cls._instance = config
        return config

    @classmethod
    def _merge_dict_into_config(cls, config: AppConfig, raw: dict[str, Any]) -> AppConfig:
        """JSON'dan gelen değerleri mevcut AppConfig nesnesine uygular."""
        for section_name, section_values in raw.items():
            if not hasattr(config, section_name):
                continue
            current_section = getattr(config, section_name)
            if isinstance(section_values, dict) and hasattr(current_section, "__dataclass_fields__"):
                for key, value in section_values.items():
                    if hasattr(current_section, key):
                        setattr(current_section, key, value)
            else:
                setattr(config, section_name, section_values)
        return config

    @classmethod
    def _apply_env_overrides(cls, config: AppConfig) -> AppConfig:
        """
        Ortam değişkenlerinden gelen override'ları uygular.
        Format: HOMEOS_<SECTION>_<FIELD> (örn: HOMEOS_API_BASE_URL)
        """
        prefix = "HOMEOS_"
        for env_key, env_value in os.environ.items():
            if not env_key.startswith(prefix):
                continue
            remainder = env_key[len(prefix):].lower()
            parts = remainder.split("_", 1)
            if len(parts) != 2:
                continue
            section_name, field_name = parts
            if not hasattr(config, section_name):
                continue
            section = getattr(config, section_name)
            if hasattr(section, field_name):
                current_value = getattr(section, field_name)
                converted = cls._convert_value(env_value, type(current_value))
                setattr(section, field_name, converted)
        return config

    @staticmethod
    def _convert_value(raw_value: str, target_type: type) -> Any:
        """Ortam değişkeninden gelen string değeri hedef tipe dönüştürür."""
        try:
            if target_type is bool:
                return raw_value.lower() in ("1", "true", "yes", "on")
            if target_type is int:
                return int(raw_value)
            if target_type is float:
                return float(raw_value)
            return raw_value
        except (ValueError, TypeError):
            return raw_value


def get_config() -> AppConfig:
    """
    Uygulama genelinde kullanılacak konfigürasyon nesnesine kısayol erişim.
    Daha önce yüklenmemişse varsayılan yolla yükler.
    """
    return ConfigLoader.load()


if __name__ == "__main__":
    # Basit test senaryosu:
    # 1) Varsayılan config yüklenir ve alanlar kontrol edilir.
    # 2) Ortam değişkeni override edilip doğrulanır.
    test_config = ConfigLoader.load("nonexistent_config.json")
    assert test_config.api.base_url == "https://localhost:5001/api"
    assert test_config.environment == "development"

    os.environ["HOMEOS_API_BASE_URL"] = "https://192.168.1.10:5001/api"
    ConfigLoader._instance = None
    overridden_config = ConfigLoader.load("nonexistent_config.json")
    assert overridden_config.api.base_url == "https://192.168.1.10:5001/api"

    print("config.py test senaryosu başarılı ✅")
