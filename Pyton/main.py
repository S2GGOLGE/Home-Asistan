from __future__ import annotations

import asyncio
import logging
import os
import socket
import threading
import traceback
from dataclasses import asdict
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
import uvicorn

from core.live.session import JarvisLive
from core.service_registry import ServiceMonitor, registry
from integrations.service_status import service_status
from ui.desktop import JarvisUI
from config.app_config import has_gemini_api_key, get_app_config_value

# =========================================================
# LOGGING VE YAPILANDIRMA
# =========================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("JarvisMain")

_jarvis_instance: JarvisLive | None = None
_ui_instance: JarvisUI | None = None

# =========================================================
# HOME ASSISTANT ENTEGRASYON KÖPRÜSÜ
# =========================================================
class HomeAssistantBridge:
    def __init__(self, base_url: str, token: str):
        """
        AI'dan veya API'den gelen hazır komutları Home Assistant'a aktaran köprü.
        """
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def execute_command(self, domain: str, service: str, entity_id: str) -> bool:
        """AI'ın belirlediği domain, service ve entity_id'yi HA'e gönderir."""
        url = f"{self.base_url}/api/services/{domain}/{service}"
        payload = {"entity_id": entity_id}
        try:
            logger.info(f"[HA KÖPRÜSÜ] Komut gönderiliyor: {domain}.{service} -> {entity_id}")
            response = requests.post(url, headers=self.headers, json=payload, timeout=5)
            if response.status_code in [200, 201]:
                logger.info("[HA KÖPRÜSÜ] Cihaz başarıyla tetiklendi.")
                return True
            logger.error(f"[HA KÖPRÜSÜ] HA Hata Döndürdü: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            logger.error(f"[HA KÖPRÜSÜ] Bağlantı Hatası: {e}")
            return False

# !!! Kendi Home Assistant bilgilerine göre doldurmalısın !!!
HA_URL = "http://127.0.0.1:8123"
HA_TOKEN = "BURAYA_HOME_ASSISTANT_UZUN_SURELI_TOKEN_GELECEK"
ha_bridge = HomeAssistantBridge(HA_URL, HA_TOKEN)


# =========================================================
# FASTAPI SUNUCU ALTYAPISI (ASP.NET Entegrasyonu)
# =========================================================
app = FastAPI(title="Jarvis Internal API", version="1.0.0")

class JarvisRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    # Eğer AI veriyi önceden işleyip doğrudan parametre olarak gönderiyorsa:
    domain: str | None = None
    service: str | None = None
    entity_id: str | None = None

class JarvisResponse(BaseModel):
    success: bool
    intent: str
    response: str

class ServiceHeartbeat(BaseModel):
    service_id: str = Field(..., min_length=1, max_length=80)
    service_name: str = Field(..., min_length=1, max_length=120)
    ip_address: str = ""
    version: str = ""
    connection_type: str = "unknown"
    metadata: dict = Field(default_factory=dict)


def _service_command_query(message: str) -> str | None:
    normalized = (
        str(message or "")
        .strip()
        .lower()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )
    if "home server" in normalized and "durum" in normalized:
        return "home_server"
    if "cevrimdisi" in normalized or "offline" in normalized:
        return "offline"
    if "baglanti olay" in normalized or "olay" in normalized or "event" in normalized:
        return "events"
    if "saglik rapor" in normalized or "health" in normalized:
        return "health"
    if "bagli servis" in normalized or "connected services" in normalized or "servisleri goster" in normalized:
        return "connected"
    return None

@app.post("/api/jarvis/process", response_model=JarvisResponse, status_code=status.HTTP_200_OK)
async def process_api_command(payload: JarvisRequest):
    logger.info(f"[API] ASP.NET Core veya AI üzerinden komut alındı: '{payload.message}'")
    global _jarvis_instance, _ui_instance
    
    try:
        # 1. Servis Durumu Sorguları
        service_query = _service_command_query(payload.message)
        if service_query:
            reply = service_status(service_query)
            if _ui_instance and hasattr(_ui_instance, "display_message"):
                _ui_instance.display_message(f"Sistem: {payload.message} -> {reply}")
            return JarvisResponse(success=True, intent="service_status", response=reply)
        
        # 2. AI'DAN GELEN DOĞRUDAN PARAMS PARAMETRELERİ VAR MI? (HA Tetikleme)
        if payload.domain and payload.service and payload.entity_id:
            ha_success = ha_bridge.execute_command(
                domain=payload.domain,
                service=payload.service,
                entity_id=payload.entity_id
            )
            intent = f"{payload.domain}_{payload.service}"
            reply = f"Komut başarıyla Home Assistant'a iletildi: {payload.entity_id}" if ha_success else "Home Assistant cihazı tetikleyemedi."
            
            if _ui_instance and hasattr(_ui_instance, "display_message"):
                _ui_instance.display_message(f"AI Tetikleme: {payload.entity_id} -> {payload.service}")
                
            return JarvisResponse(success=ha_success, intent=intent, response=reply)

        # 3. Eğer parametre yoksa metin bazlı yedek kural motoru (Fallback)
        message_lower = payload.message.lower()
        if "ışığını aç" in message_lower or "ışığı yak" in message_lower:
            ha_success = ha_bridge.execute_command("light", "turn_on", "light.salon_lambasi")
            intent = "light_on"
            reply = "Salon lambası açılıyor." if ha_success else "Home Assistant bağlantı hatası."
            success = ha_success
        elif "ışığını kapat" in message_lower or "ışığı söndür" in message_lower:
            ha_success = ha_bridge.execute_command("light", "turn_off", "light.salon_lambasi")
            intent = "light_off"
            reply = "Salon lambası kapatılıyor." if ha_success else "Home Assistant bağlantı hatası."
            success = ha_success
        else:
            intent = "unknown"
            reply = "Bu komut için geçerli bir cihaz eylemi haritalanamadı."
            success = False

        if _ui_instance and hasattr(_ui_instance, "display_message"):
            _ui_instance.display_message(f"Manuel: {payload.message} -> {reply}")

        return JarvisResponse(success=success, intent=intent, response=reply)

    except Exception as ex:
        logger.error(f"[API] Komut işlenirken hata oluştu: {str(ex)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Jarvis arka plan motorunda veya Home Assistant köprüsünde hata oluştu."
        )

# =========================================================
# DİĞER API ENDPOINT'LERİ
# =========================================================
@app.get("/api/services")
async def get_services():
    return {"services": [asdict(service) for service in registry.services()]}

@app.get("/api/services/offline")
async def get_offline_services():
    return {"services": [asdict(service) for service in registry.offline_services()]}

@app.get("/api/services/home-server")
async def get_home_server_status():
    service = registry.get_service("home-server")
    if not service:
        raise HTTPException(status_code=404, detail="Home Server kaydi bulunamadi.")
    return asdict(service)

@app.get("/api/services/events")
async def get_service_events(limit: int = 20):
    return {"events": [asdict(event) for event in registry.recent_events(limit)]}

@app.get("/api/services/health")
async def get_service_health():
    return registry.health_report()

@app.post("/api/services/heartbeat")
async def service_heartbeat(payload: ServiceHeartbeat):
    service = registry.heartbeat(
        payload.service_id,
        payload.service_name,
        ip_address=payload.ip_address,
        version=payload.version,
        connection_type=payload.connection_type,
        metadata=payload.metadata,
    )
    return asdict(service)

@app.websocket("/ws/service-status")
async def service_status_socket(websocket: WebSocket):
    await websocket.accept()
    last_revision = -1
    try:
        while True:
            snapshot = registry.snapshot()
            if snapshot["revision"] != last_revision:
                await websocket.send_json(snapshot)
                last_revision = snapshot["revision"]
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return

def run_fastapi_server():
    logger.info("[FASTAPI] Web servis 127.0.0.1:8081 üzerinde başlatılıyor...")
    registry.heartbeat("backend-api", "Backend API", "127.0.0.1", "1.0.0", "http")
    uvicorn.run(app, host="127.0.0.1", port=8081, log_level="warning")


# =========================================================
# TCP BAGLANTI SISTEMI
# =========================================================
def tcp_sunucuya_baglan(ip: str, port: int) -> None:
    istemci_soketi = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    istemci_soketi.settimeout(10)

    try:
        logger.info(f"[TCP] Sunucuya bağlanılıyor -> {ip}:{port}")
        istemci_soketi.connect((ip, port))
        logger.info("[TCP] Bağlantı başarılı!")

        registry.heartbeat("home-server", "Home Server", ip, "", "tcp", {"port": port})

        mesaj = "Jarvis"
        istemci_soketi.sendall(mesaj.encode("utf-8"))
        yanit = istemci_soketi.recv(1024)
        logger.info(f"[TCP] Sunucudan gelen yanıt -> {yanit.decode('utf-8')}")
    except socket.timeout:
        logger.warning("[TCP] Zaman aşımı hatası!")
        registry.mark_offline("home-server", f"Timeout while connecting to {ip}:{port}")
    except ConnectionRefusedError:
        logger.warning("[TCP] Sunucu bağlantıyı reddetti!")
        registry.mark_offline("home-server", f"Connection refused at {ip}:{port}")
    except Exception as e:
        logger.error(f"[TCP] Bağlantı hatası -> {e}")
        registry.mark_offline("home-server", f"Connection error: {e}")
    finally:
        istemci_soketi.close()
        logger.info("[TCP] Bağlantı kapatıldı.")


# =========================================================
# ASYNC JARVIS SISTEMI
# =========================================================
def start_jarvis(ui: JarvisUI) -> None:
    global _jarvis_instance
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        registry.heartbeat("jarvis-core", "Jarvis Core", "127.0.0.1", "1.0.0", "python")
        logger.info("[JARVIS] API key kontrol ediliyor...")
        ui.wait_for_api_key()
        logger.info("[JARVIS] API key bulundu.")

        _jarvis_instance = JarvisLive(ui)
        logger.info("[JARVIS] Başlatılıyor...")
        
        loop.run_until_complete(_jarvis_instance.run())

    except KeyboardInterrupt:
        logger.info("[JARVIS] Kullanıcı tarafından kapatıldı.")
    except Exception as e:
        hata = str(e)
        logger.error(f"[JARVIS] Kritik hata -> {hata}")
        traceback.print_exc()
    finally:
        try:
            pending = asyncio.all_tasks(loop)
            for task in pending:
                task.cancel()
            if pending:
                loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            loop.run_until_complete(loop.shutdown_asyncgens())
        except Exception as cleanup_error:
            logger.error(f"[CLEANUP] Temizlik hatası -> {cleanup_error}")
        finally:
            registry.mark_offline("jarvis-core", "Jarvis event loop stopped")
            loop.close()
            logger.info("[JARVIS] Event loop kapatıldı.")


# =========================================================
# MAIN ENTRY POINT
# =========================================================
def main() -> None:
    global _ui_instance
    print("\n===================================")
    print("        JARVIS BAŞLATILIYOR")
    print("===================================\n")

    if os.environ.get("TERM_PROGRAM") == "vscode":
        logger.info("[SYSTEM] VS Code içinden başlatıldı.")

    # 1. UI Arayüz Başlatma
    _ui_instance = JarvisUI()

    # 2. TCP Sunucu Kontrolü
    tcp_sunucuya_baglan("127.0.0.1", 8586)

    # 3. FastAPI Web Sunucusunu Arka Plan Thread'i Olarak Başlatma
    service_monitor = ServiceMonitor(registry)
    service_monitor.start()

    fastapi_thread = threading.Thread(target=run_fastapi_server, daemon=True)
    fastapi_thread.start()

    # 4. Canlı Asenkron Jarvis Motorunu Başlatma
    jarvis_thread = threading.Thread(target=start_jarvis, args=(_ui_instance,), daemon=True)
    jarvis_thread.start()

    # 5. UI Main Loop
    try:
        _ui_instance.root.mainloop()
    except KeyboardInterrupt:
        logger.info("[UI] Arayüz kapatıldı.")
    finally:
        logger.info("[SYSTEM] Program sonlandı.")

        service_monitor.stop()
        registry.mark_offline("jarvis-core", "Jarvis application stopped")
        registry.mark_offline("backend-api", "Jarvis application stopped")

if __name__ == "__main__":
    main()