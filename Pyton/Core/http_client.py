"""
Jarvis Bridge - HTTP API İstemcisi
Home Asistan REST API ile async haberleşme katmanı.

Özellikler:
  - aiohttp tabanlı async HTTP
  - Otomatik token yenileme hazırlığı
  - Exponential backoff retry
  - Basit in-memory önbellekleme
  - Bağlantı havuzu yönetimi
"""
import asyncio
import time
from typing import Any, Dict, Optional

import aiohttp

from ..config import BridgeConfig, config as default_config
from ..utils.logger import setup_logger

logger = setup_logger("jarvis.http_client", default_config.log_level)


class APIError(Exception):
    """Home Asistan API hatası."""
    def __init__(self, message: str, status_code: int = 0, error_code: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.error_code  = error_code


class AuthenticationError(APIError):
    """Token geçersiz veya süresi dolmuş."""


class DeviceNotFoundError(APIError):
    """İstenen cihaz bulunamadı."""


class HomeAssistantClient:
    """
    Home Asistan HTTP API istemcisi.

    Kullanım:
        async with HomeAssistantClient() as client:
            devices = await client.get("/devices")
    """

    def __init__(self, cfg: BridgeConfig = None):
        self._cfg     = cfg or default_config
        self._session: Optional[aiohttp.ClientSession] = None
        self._cache:   Dict[str, tuple[Any, float]] = {}  # key → (veri, expire_ts)

    # ------------------------------------------------------------------ #
    #  Oturum yönetimi                                                     #
    # ------------------------------------------------------------------ #

    async def __aenter__(self) -> "HomeAssistantClient":
        await self._ensure_session()
        return self

    async def __aexit__(self, *_) -> None:
        await self.close()

    async def _ensure_session(self) -> None:
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(
                limit=self._cfg.connection_pool_size,
                enable_cleanup_closed=True,
            )
            self._session = aiohttp.ClientSession(
                base_url=self._cfg.ha_base_url,
                connector=connector,
                headers=self._auth_headers(),
                timeout=aiohttp.ClientTimeout(total=self._cfg.ha_timeout),
            )
            logger.debug("HTTP oturumu oluşturuldu → %s", self._cfg.ha_base_url)

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()
            logger.debug("HTTP oturumu kapatıldı.")

    def _auth_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._cfg.ha_api_token}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
            "X-Client":      "JarvisBridge/1.0",
        }

    # ------------------------------------------------------------------ #
    #  İstek gönderme (retry + hata yönetimi)                             #
    # ------------------------------------------------------------------ #

    async def _request(
        self,
        method:   str,
        endpoint: str,
        payload:  Optional[Dict] = None,
        use_cache: bool = False,
    ) -> Any:
        await self._ensure_session()

        cache_key = f"{method}:{endpoint}"
        if use_cache and method == "GET":
            cached = self._get_cache(cache_key)
            if cached is not None:
                logger.debug("Önbellekten döndü → %s", endpoint)
                return cached

        last_error: Exception = Exception("Bilinmeyen hata")

        for attempt in range(1, self._cfg.max_retries + 1):
            try:
                logger.debug("[%d/%d] %s %s", attempt, self._cfg.max_retries, method, endpoint)

                async with self._session.request(method, endpoint, json=payload) as resp:
                    data = await resp.json()

                    if resp.status == 401:
                        raise AuthenticationError(
                            "Token geçersiz veya süresi dolmuş.",
                            status_code=401,
                            error_code="AUTH_FAILED",
                        )
                    if resp.status == 404:
                        raise DeviceNotFoundError(
                            f"Kaynak bulunamadı: {endpoint}",
                            status_code=404,
                            error_code="NOT_FOUND",
                        )
                    if not resp.ok:
                        raise APIError(
                            f"API hatası {resp.status}: {data.get('message', 'Bilinmiyor')}",
                            status_code=resp.status,
                        )

                    if use_cache and method == "GET":
                        self._set_cache(cache_key, data)

                    return data

            except (aiohttp.ClientConnectionError, asyncio.TimeoutError) as exc:
                last_error = exc
                wait = self._cfg.retry_delay * (2 ** (attempt - 1))
                logger.warning(
                    "Bağlantı hatası (deneme %d/%d): %s — %.1fs bekliyor",
                    attempt, self._cfg.max_retries, exc, wait,
                )
                if attempt < self._cfg.max_retries:
                    await asyncio.sleep(wait)

            except (AuthenticationError, DeviceNotFoundError):
                raise  # Retry yapma, direkt fırlat

            except APIError as exc:
                last_error = exc
                if attempt < self._cfg.max_retries:
                    await asyncio.sleep(self._cfg.retry_delay)

        raise APIError(f"Maksimum deneme aşıldı: {last_error}") from last_error

    # ------------------------------------------------------------------ #
    #  Kısa yollar                                                         #
    # ------------------------------------------------------------------ #

    async def get(self, endpoint: str, use_cache: bool = False) -> Any:
        return await self._request("GET", endpoint, use_cache=use_cache)

    async def post(self, endpoint: str, payload: Dict) -> Any:
        return await self._request("POST", endpoint, payload=payload)

    async def put(self, endpoint: str, payload: Dict) -> Any:
        return await self._request("PUT", endpoint, payload=payload)

    async def delete(self, endpoint: str) -> Any:
        return await self._request("DELETE", endpoint)

    # ------------------------------------------------------------------ #
    #  In-memory önbellekleme                                              #
    # ------------------------------------------------------------------ #

    def _get_cache(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if entry and time.monotonic() < entry[1]:
            return entry[0]
        self._cache.pop(key, None)
        return None

    def _set_cache(self, key: str, value: Any) -> None:
        self._cache[key] = (value, time.monotonic() + self._cfg.cache_ttl_seconds)

    def clear_cache(self) -> None:
        self._cache.clear()
        logger.debug("Önbellek temizlendi.")
