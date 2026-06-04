from __future__ import annotations

import asyncio
import logging
import os
import socket
import threading
import traceback

import aiohttp
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
import uvicorn

# =========================================================
# LOGGING
# =========================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("JarvisMain")

# =========================================================
# HOME ASSISTANT BRIDGE (ASYNC)
# =========================================================
class HomeAssistantBridge:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def execute_command(self, domain: str, service: str, entity_id: str) -> bool:
        url = f"{self.base_url}/api/services/{domain}/{service}"
        payload = {"entity_id": entity_id}

        try:
            logger.info(f"[HA] {domain}.{service} -> {entity_id}")

            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=self.headers, timeout=5) as resp:
                    if resp.status in (200, 201):
                        return True

                    text = await resp.text()
                    logger.error(f"[HA ERROR] {resp.status} - {text}")
                    return False

        except Exception as e:
            logger.error(f"[HA CONNECTION ERROR] {e}")
            return False


# =========================================================
# CONFIG
# =========================================================
HA_URL = "http://127.0.0.1:8123"
HA_TOKEN = "YOUR_LONG_LIVED_TOKEN"

ha_bridge = HomeAssistantBridge(HA_URL, HA_TOKEN)

# =========================================================
# FASTAPI APP
# =========================================================
app = FastAPI(title="Jarvis Internal API", version="1.0.0")

# =========================================================
# MODELS
# =========================================================
class JarvisRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    domain: str | None = None
    service: str | None = None
    entity_id: str | None = None


class JarvisResponse(BaseModel):
    success: bool
    intent: str
    response: str


# =========================================================
# SIMPLE INTENT ENGINE
# =========================================================
def detect_intent(message: str) -> str | None:
    msg = message.lower()

    if "ışık aç" in msg or "ışığı aç" in msg:
        return "light_on"

    if "ışık kapat" in msg or "ışığı kapat" in msg:
        return "light_off"

    return None


# =========================================================
# API ENDPOINT
# =========================================================
@app.post("/api/jarvis/process", response_model=JarvisResponse)
async def process(payload: JarvisRequest):
    logger.info(f"[API] {payload.message}")

    try:
        # 1. DIRECT HOME ASSISTANT COMMAND
        if payload.domain and payload.service and payload.entity_id:
            result = await ha_bridge.execute_command(
                payload.domain,
                payload.service,
                payload.entity_id
            )

            return JarvisResponse(
                success=result,
                intent=f"{payload.domain}_{payload.service}",
                response="HA komutu gönderildi" if result else "HA hatası"
            )

        # 2. RULE BASED INTENT
        intent = detect_intent(payload.message)

        if intent == "light_on":
            result = await ha_bridge.execute_command(
                "light",
                "turn_on",
                "light.salon_lambasi"
            )
            return JarvisResponse(success=result, intent=intent, response="Işık açıldı")

        if intent == "light_off":
            result = await ha_bridge.execute_command(
                "light",
                "turn_off",
                "light.salon_lambasi"
            )
            return JarvisResponse(success=result, intent=intent, response="Işık kapatıldı")

        # 3. UNKNOWN
        return JarvisResponse(
            success=False,
            intent="unknown",
            response="Komut anlaşılmadı"
        )

    except Exception as e:
        logger.error(f"[ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# HEALTH CHECK
# =========================================================
@app.get("/api/status")
def status():
    return {"status": "ok", "system": "jarvis"}


# =========================================================
# RUN SERVER
# =========================================================
def run_server():
    logger.info("[FASTAPI] Starting on 127.0.0.1:8081")
    uvicorn.run(app, host="127.0.0.1", port=8081, log_level="warning")


# =========================================================
# MAIN
# =========================================================
def main():
    print("\n==========================")
    print("     JARVIS START")
    print("==========================\n")

    # FastAPI thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Keep alive
    try:
        while True:
            asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Shutdown...")


if __name__ == "__main__":
    main()