"""
Jarvis Bridge - Demo Scripti
Gerçek bir Home Asistan olmadan mock API ile test eder.

Çalıştır:
    python demo.py
"""
import asyncio
import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

# ─── MOCK API SUNUCUSU ──────────────────────────────────────────────────────
MOCK_DEVICES = {
    "devices": [
        {
            "id": "light_salon_01",
            "name": "Salon Işığı",
            "type": "light",
            "status": "online",
            "state": "off",
            "room": "salon",
            "attributes": {"brightness": 200, "color": "warm_white"},
            "lastUpdated": "2025-01-15T14:30:00",
        },
        {
            "id": "climate_salon_01",
            "name": "Salon Klima",
            "type": "climate",
            "status": "online",
            "state": "off",
            "room": "salon",
            "attributes": {"current_temp": 22, "target_temp": 24},
            "lastUpdated": "2025-01-15T14:28:00",
        },
        {
            "id": "light_mutfak_01",
            "name": "Mutfak Işığı",
            "type": "light",
            "status": "online",
            "state": "on",
            "room": "mutfak",
            "attributes": {"brightness": 255},
            "lastUpdated": "2025-01-15T14:25:00",
        },
        {
            "id": "lock_kapi_01",
            "name": "Ana Kapı Kilidi",
            "type": "lock",
            "status": "offline",
            "state": "locked",
            "room": "antre",
            "attributes": {},
            "lastUpdated": "2025-01-15T12:00:00",
        },
    ],
    "total": 4,
}


def make_mock_session():
    """aiohttp ClientSession mock'u oluşturur."""

    def fake_request(method, url, **kwargs):
        resp = MagicMock()
        resp.ok = True
        resp.status = 200

        if "command" in str(url):
            data = {"success": True, "message": "Komut uygulandı."}
        elif "refresh" in str(url):
            data = {"success": True, "message": "Cihaz yenilendi."}
        elif "register" in str(url):
            data = {"id": "new_device_99", "name": "Yeni Cihaz", "success": True}
        elif "/devices/" in str(url):
            device_id = str(url).split("/devices/")[-1]
            found = next((d for d in MOCK_DEVICES["devices"] if d["id"] == device_id), None)
            data = found or {}
            if not found:
                resp.ok     = False
                resp.status = 404
        else:
            data = MOCK_DEVICES

        resp.json = AsyncMock(return_value=data)
        
        ctx = MagicMock()
        ctx.__aenter__ = AsyncMock(return_value=resp)
        ctx.__aexit__ = AsyncMock(return_value=None)
        return ctx

    session = MagicMock()
    session.closed = False
    session.request = MagicMock(side_effect=fake_request)
    session.close   = AsyncMock()

    return session


# ─── DEMO ───────────────────────────────────────────────────────────────────

async def run_demo():
    os.environ["HA_BASE_URL"]   = "http://localhost:5000/api"
    os.environ["HA_API_TOKEN"]  = "demo-token-12345"

    from jarvis_bridge.bridge import JarvisBridge
    from jarvis_bridge.core.http_client import HomeAssistantClient

    print("\n" + "="*60)
    print("   🤖 JARVIS BRIDGE — DEMO")
    print("="*60 + "\n")

    mock_session = make_mock_session()

    with patch.object(HomeAssistantClient, "_ensure_session", new_callable=AsyncMock):
        bridge = JarvisBridge()
        bridge._running = True

        from jarvis_bridge.core.http_client import HomeAssistantClient as HAC
        HAC.__init__ = lambda self, cfg=None: None
        bridge._client = HomeAssistantClient.__new__(HomeAssistantClient)
        bridge._client._session  = mock_session
        bridge._client._cache    = {}
        bridge._client._cfg      = bridge._cfg

        from jarvis_bridge.services.device_service import DeviceService
        from jarvis_bridge.services.command_handler import CommandParser, VoiceCommandProcessor
        bridge._devices    = DeviceService(bridge._client)
        bridge._processor  = VoiceCommandProcessor(bridge._devices, CommandParser())

        # ─── 1. Cihaz listesi ───
        print("📋 TÜM CİHAZLAR\n" + "-"*40)
        response = await bridge.list_all_devices()
        for d in response.devices:
            print(f"  {d}")
        print(f"\n  Özet: {response.online} çevrimiçi / {response.offline} çevrimdışı\n")

        # ─── 2. Komut testi ───
        commands = [
            "salon ışığını aç",
            "mutfak ışığını kapat",
            "klima durumunu göster",
            "tüm cihazları listele",
            "salonu 22 dereceye ayarla",
            "salon ışığını 80% yap",
            "bunu anlayamam ki",
        ]

        print("🎤 KOMUT TESTLERİ\n" + "-"*40)
        for cmd in commands:
            print(f"📣 Komut: \"{cmd}\"")
            result = await bridge.handle_command(cmd)
            print(f"   {result}\n")

        print("="*60)
        print("   ✅ Demo tamamlandı!")
        print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_demo())
