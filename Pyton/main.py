from __future__ import annotations

import asyncio
import logging
import re
import threading
from typing import Any

import aiohttp
import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

# =========================================================
# LOGGING
# =========================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("JarvisMain")

# =========================================================
# CONFIG
# =========================================================
HA_URL   = "http://127.0.0.1:8123"
HA_TOKEN = "YOUR_LONG_LIVED_TOKEN"

# =========================================================
# HOME ASSISTANT BRIDGE
# =========================================================
class HomeAssistantBridge:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.headers  = {
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
        }

    # ── Servis çağrısı (turn_on, turn_off, set vb.) ──────────────────────
    async def execute_command(self, domain: str, service: str, entity_id: str,
                               extra: dict[str, Any] | None = None) -> bool:
        url     = f"{self.base_url}/api/services/{domain}/{service}"
        payload = {"entity_id": entity_id, **(extra or {})}

        try:
            logger.info("[HA] %s.%s -> %s | extra=%s", domain, service, entity_id, extra)
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload,
                                        headers=self.headers, timeout=5) as resp:
                    if resp.status in (200, 201):
                        return True
                    text = await resp.text()
                    logger.error("[HA ERROR] %s - %s", resp.status, text)
                    return False
        except Exception as e:
            logger.error("[HA CONNECTION ERROR] %s", e)
            return False

    # ── Durum sorgulama ───────────────────────────────────────────────────
    async def get_state(self, entity_id: str) -> dict[str, Any] | None:
        url = f"{self.base_url}/api/states/{entity_id}"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.headers, timeout=5) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    logger.error("[HA STATE ERROR] %s -> %s", entity_id, resp.status)
                    return None
        except Exception as e:
            logger.error("[HA STATE EXCEPTION] %s", e)
            return None

    # ── Tüm entity'leri listele ───────────────────────────────────────────
    async def get_all_states(self) -> list[dict[str, Any]]:
        url = f"{self.base_url}/api/states"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=self.headers, timeout=10) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return []
        except Exception as e:
            logger.error("[HA ALL STATES ERROR] %s", e)
            return []


ha_bridge = HomeAssistantBridge(HA_URL, HA_TOKEN)

# =========================================================
# INTENT ENGINE  (genişletilebilir kural tablosu)
# =========================================================
# Her kural: (regex_pattern, intent_adı)
# Önce eşleşen kazanır.
INTENT_RULES: list[tuple[str, str]] = [
    # Işık
    (r"ışı[kğ]ı?\s*(aç|yak|aktif)",          "light_on"),
    (r"ışı[kğ]ı?\s*(kapat|söndür|kapat)",     "light_off"),
    (r"ışı[kğ]ı?\s*durum",                    "light_status"),
    (r"parlaklı[kğ]ı?\s*(\d+)",               "light_brightness"),

    # Klima / ısıtıcı
    (r"klima\s*(aç|çalıştır|başlat)",          "climate_on"),
    (r"klima\s*(kapat|durdur)",                "climate_off"),
    (r"klima\s*durum",                         "climate_status"),
    (r"(\d+(?:[.,]\d+)?)\s*derece",            "climate_set_temp"),

    # Priz / switch
    (r"priz\s*(aç|aktif)",                     "switch_on"),
    (r"priz\s*(kapat|pasif)",                  "switch_off"),

    # Genel
    (r"(tüm|hep|bütün).*(cihaz|ışık|entity)", "list_all"),
    (r"durum|status|nasıl",                    "get_status"),
]

# entity_id haritası  → "anahtar kelime" : "ha entity"
# Kendi entity'lerine göre düzenle
ENTITY_MAP: dict[str, str] = {
    "salon":         "light.salon_lambasi",
    "mutfak":        "light.mutfak_lambasi",
    "yatak":         "light.yatak_odasi_lambasi",
    "yatak odası":   "light.yatak_odasi_lambasi",
    "klima":         "climate.salon_klima",
    "priz":          "switch.masa_prizi",
}

DEFAULT_LIGHT   = "light.salon_lambasi"
DEFAULT_CLIMATE = "climate.salon_klima"
DEFAULT_SWITCH  = "switch.masa_prizi"

def detect_intent(message: str) -> str:
    msg = message.lower()
    for pattern, intent in INTENT_RULES:
        if re.search(pattern, msg):
            return intent
    return "unknown"

def detect_entity(message: str, default: str) -> str:
    msg = message.lower()
    for keyword, entity_id in ENTITY_MAP.items():
        if keyword in msg:
            return entity_id
    return default

def extract_number(message: str) -> float | None:
    match = re.search(r"(\d+(?:[.,]\d+)?)", message)
    if match:
        return float(match.group(1).replace(",", "."))
    return None

# =========================================================
# INTENT HANDLER  (intent → HA aksiyonu)
# =========================================================
async def handle_intent(intent: str, message: str) -> tuple[bool, str]:
    """
    (success, response_text) döner.
    """

    # ── Işık ─────────────────────────────────────────────────────────────
    if intent == "light_on":
        entity = detect_entity(message, DEFAULT_LIGHT)
        ok = await ha_bridge.execute_command("light", "turn_on", entity)
        return ok, f"{'✅' if ok else '❌'} Işık açıldı ({entity})" if ok else f"❌ Hata ({entity})"

    if intent == "light_off":
        entity = detect_entity(message, DEFAULT_LIGHT)
        ok = await ha_bridge.execute_command("light", "turn_off", entity)
        return ok, f"✅ Işık kapatıldı ({entity})" if ok else f"❌ Hata ({entity})"

    if intent == "light_status":
        entity = detect_entity(message, DEFAULT_LIGHT)
        state  = await ha_bridge.get_state(entity)
        if state:
            s    = state.get("state", "?")
            attr = state.get("attributes", {})
            bri  = attr.get("brightness", "-")
            return True, f"💡 {entity}: {s} | parlaklık: {bri}"
        return False, f"❌ Durum alınamadı ({entity})"

    if intent == "light_brightness":
        entity = detect_entity(message, DEFAULT_LIGHT)
        value  = extract_number(message)
        if value is None:
            return False, "❌ Parlaklık değeri anlaşılamadı (0-255 arası girin)"
        bri = max(0, min(255, int(value)))
        ok  = await ha_bridge.execute_command("light", "turn_on", entity,
                                              extra={"brightness": bri})
        return ok, f"✅ Parlaklık {bri} olarak ayarlandı ({entity})" if ok else "❌ Hata"

    # ── Klima ─────────────────────────────────────────────────────────────
    if intent == "climate_on":
        entity = detect_entity(message, DEFAULT_CLIMATE)
        ok = await ha_bridge.execute_command("climate", "turn_on", entity)
        return ok, f"✅ Klima açıldı ({entity})" if ok else f"❌ Hata ({entity})"

    if intent == "climate_off":
        entity = detect_entity(message, DEFAULT_CLIMATE)
        ok = await ha_bridge.execute_command("climate", "turn_off", entity)
        return ok, f"✅ Klima kapatıldı ({entity})" if ok else f"❌ Hata ({entity})"

    if intent == "climate_status":
        entity = detect_entity(message, DEFAULT_CLIMATE)
        state  = await ha_bridge.get_state(entity)
        if state:
            s    = state.get("state", "?")
            attr = state.get("attributes", {})
            cur  = attr.get("current_temperature", "-")
            tgt  = attr.get("temperature", "-")
            return True, f"🌡️ {entity}: {s} | mevcut: {cur}°C | hedef: {tgt}°C"
        return False, f"❌ Durum alınamadı ({entity})"

    if intent == "climate_set_temp":
        entity = detect_entity(message, DEFAULT_CLIMATE)
        temp   = extract_number(message)
        if temp is None:
            return False, "❌ Sıcaklık değeri anlaşılamadı"
        ok = await ha_bridge.execute_command("climate", "set_temperature", entity,
                                             extra={"temperature": temp})
        return ok, f"✅ Sıcaklık {temp}°C olarak ayarlandı ({entity})" if ok else "❌ Hata"

    # ── Priz ──────────────────────────────────────────────────────────────
    if intent == "switch_on":
        entity = detect_entity(message, DEFAULT_SWITCH)
        ok = await ha_bridge.execute_command("switch", "turn_on", entity)
        return ok, f"✅ Priz açıldı ({entity})" if ok else f"❌ Hata ({entity})"

    if intent == "switch_off":
        entity = detect_entity(message, DEFAULT_SWITCH)
        ok = await ha_bridge.execute_command("switch", "turn_off", entity)
        return ok, f"✅ Priz kapatıldı ({entity})" if ok else f"❌ Hata ({entity})"

    # ── Listeleme / genel durum ───────────────────────────────────────────
    if intent == "list_all":
        states = await ha_bridge.get_all_states()
        if not states:
            return False, "❌ Cihazlar alınamadı"
        lines = ["📋 Tüm cihazlar:"]
        for s in states:
            eid   = s.get("entity_id", "")
            state = s.get("state", "?")
            lines.append(f"  • {eid}: {state}")
        return True, "\n".join(lines)

    if intent == "get_status":
        entity = detect_entity(message, DEFAULT_LIGHT)
        state  = await ha_bridge.get_state(entity)
        if state:
            return True, f"📊 {entity}: {state.get('state', '?')}"
        return False, "❌ Durum alınamadı"

    # ── Bilinmeyen ─────────────────────────────────────────────────────────
    return False, "❓ Komut anlaşılamadı"


# =========================================================
# FASTAPI
# =========================================================
app = FastAPI(title="Jarvis Internal API", version="2.0.0")

class JarvisRequest(BaseModel):
    message:   str       = Field(..., min_length=1, max_length=500)
    domain:    str | None = None
    service:   str | None = None
    entity_id: str | None = None

class JarvisResponse(BaseModel):
    success:  bool
    intent:   str
    response: str


@app.post("/api/jarvis/process", response_model=JarvisResponse)
async def process(payload: JarvisRequest):
    logger.info("[API] %s", payload.message)
    try:
        # Doğrudan HA komutu (domain/service/entity_id verilmişse)
        if payload.domain and payload.service and payload.entity_id:
            ok = await ha_bridge.execute_command(
                payload.domain, payload.service, payload.entity_id
            )
            return JarvisResponse(
                success=ok,
                intent=f"{payload.domain}_{payload.service}",
                response="HA komutu gönderildi" if ok else "HA hatası",
            )

        # Intent motoru
        intent        = detect_intent(payload.message)
        success, text = await handle_intent(intent, payload.message)
        return JarvisResponse(success=success, intent=intent, response=text)

    except Exception as e:
        logger.error("[ERROR] %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status")
def health():
    return {"status": "ok", "system": "jarvis", "version": "2.0.0"}


# ── WebSocket (gerçek zamanlı komut kanalı) ────────────────────────────────
@app.websocket("/ws/jarvis")
async def ws_jarvis(websocket: WebSocket):
    await websocket.accept()
    logger.info("[WS] Bağlantı açıldı")
    try:
        while True:
            text = await websocket.receive_text()
            logger.info("[WS] %s", text)
            intent        = detect_intent(text)
            success, resp = await handle_intent(intent, text)
            await websocket.send_json({
                "success":  success,
                "intent":   intent,
                "response": resp,
            })
    except WebSocketDisconnect:
        logger.info("[WS] Bağlantı kapandı")


# =========================================================
# SERVER + MAIN
# =========================================================
def run_server():
    logger.info("[FASTAPI] Starting on 127.0.0.1:8082")
    uvicorn.run(app, host="127.0.0.1", port=8082, log_level="warning")


def main():
    print("\n==========================")
    print("     JARVIS START v2")
    print("==========================\n")

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    try:
        while True:
            threading.Event().wait(1)
    except KeyboardInterrupt:
        print("\nShutdown...")


if __name__ == "__main__":
    main()