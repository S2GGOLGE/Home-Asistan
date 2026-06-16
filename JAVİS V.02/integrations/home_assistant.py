"""
Home Assistant entegrasyonu - JARVIS V.02
HA_URL ve HA_TOKEN degerleri api_keys.json'dan okunur.
"""
from __future__ import annotations

import logging
from typing import Any

import requests

from config.app_config import get_app_config_value

logger = logging.getLogger("HomeAssistant")

# ---------- Konfigürasyon ----------

def _get_ha_url() -> str:
    return str(get_app_config_value("ha_url", "http://homeassistant.local:8123") or "http://homeassistant.local:8123").rstrip("/")

def _get_ha_token() -> str:
    return str(get_app_config_value("ha_token", "") or "")

def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_get_ha_token()}",
        "Content-Type": "application/json",
    }

# ---------- Yardimci fonksiyonlar ----------

def _call_service(domain: str, service: str, data: dict, timeout: int = 6) -> bool:
    url = f"{_get_ha_url()}/api/services/{domain}/{service}"
    try:
        resp = requests.post(url, json=data, headers=_headers(), timeout=timeout)
        if resp.status_code in (200, 201):
            return True
        logger.error("[HA] Servis hatasi %s %s: %s - %s", domain, service, resp.status_code, resp.text[:200])
        return False
    except Exception as e:
        logger.error("[HA] Baglanti hatasi: %s", e)
        return False

def _get_state(entity_id: str) -> dict | None:
    url = f"{_get_ha_url()}/api/states/{entity_id}"
    try:
        resp = requests.get(url, headers=_headers(), timeout=6)
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        logger.error("[HA] State alma hatasi: %s", e)
        return None

def _get_all_states(domain_filter: str = "") -> list[dict]:
    url = f"{_get_ha_url()}/api/states"
    try:
        resp = requests.get(url, headers=_headers(), timeout=8)
        if resp.status_code == 200:
            states = resp.json()
            if domain_filter:
                states = [s for s in states if s.get("entity_id", "").startswith(domain_filter + ".")]
            return states
        return []
    except Exception as e:
        logger.error("[HA] States alma hatasi: %s", e)
        return []

# ---------- Ana kontrol fonksiyonu ----------

def home_control(action: str, entity_id: str = "", domain: str = "", extra: dict | None = None) -> str:
    """
    Home Assistant komut merkezi.

    Parametreler:
        action      : turn_on | turn_off | toggle | status | scene | script |
                      set_temperature | set_brightness | set_color |
                      list_devices | list_lights | list_switches | list_sensors
        entity_id   : Hedef entity. Orn: light.salon, switch.klima
        domain      : light | switch | climate | cover | script | scene | automation vb.
        extra       : Ek parametreler (brightness, temperature, color_name vb.)
    """
    extra = extra or {}
    action = (action or "").strip().lower()

    # ---------- Cihaz listesi ----------
    if action in ("list_devices", "list_lights", "list_switches", "list_sensors", "list_covers", "list_climate"):
        domain_map = {
            "list_devices": "",
            "list_lights": "light",
            "list_switches": "switch",
            "list_sensors": "sensor",
            "list_covers": "cover",
            "list_climate": "climate",
        }
        df = domain_map.get(action, "")
        states = _get_all_states(df)
        if not states:
            return "Home Assistant'a bagilanamadi veya hicbir cihaz bulunamadi."
        lines = []
        for s in states[:30]:
            eid = s.get("entity_id", "")
            state = s.get("state", "?")
            friendly = s.get("attributes", {}).get("friendly_name", eid)
            lines.append(f"- {friendly} ({eid}): {state}")
        return "\n".join(lines)

    # ---------- Durum sorgulama ----------
    if action == "status":
        if not entity_id:
            return "entity_id belirtilmedi."
        state = _get_state(entity_id)
        if not state:
            return f"{entity_id} bulunamadi veya HA'ya baglanamadi."
        s = state.get("state", "?")
        attrs = state.get("attributes", {})
        friendly = attrs.get("friendly_name", entity_id)
        detail_parts = [f"{friendly} durumu: {s}"]
        if "brightness" in attrs:
            pct = round(int(attrs["brightness"]) / 255 * 100)
            detail_parts.append(f"Parlaklik: %{pct}")
        if "current_temperature" in attrs:
            detail_parts.append(f"Sicaklik: {attrs['current_temperature']}°C")
        if "temperature" in attrs:
            detail_parts.append(f"Hedef sicaklik: {attrs['temperature']}°C")
        if "humidity" in attrs:
            detail_parts.append(f"Nem: %{attrs['humidity']}")
        return " | ".join(detail_parts)

    # ---------- Sahne / Script ----------
    if action == "scene":
        scene_id = entity_id or extra.get("scene_id", "")
        if not scene_id.startswith("scene."):
            scene_id = f"scene.{scene_id}"
        ok = _call_service("scene", "turn_on", {"entity_id": scene_id})
        return f"Sahne aktiflestirildi: {scene_id}" if ok else f"Sahne hatasi: {scene_id}"

    if action == "script":
        script_id = entity_id or extra.get("script_id", "")
        if not script_id.startswith("script."):
            script_id = f"script.{script_id}"
        ok = _call_service("script", "turn_on", {"entity_id": script_id})
        return f"Script calistirildi: {script_id}" if ok else f"Script hatasi: {script_id}"

    # ---------- Isik parlaklik / renk ----------
    if action == "set_brightness":
        if not entity_id:
            return "entity_id belirtilmedi."
        brightness_pct = int(extra.get("brightness_pct", 50))
        brightness = max(0, min(255, round(brightness_pct / 100 * 255)))
        ok = _call_service("light", "turn_on", {"entity_id": entity_id, "brightness": brightness})
        return f"{entity_id} parlaklik %{brightness_pct} yapildi." if ok else "Parlaklik ayarlanamadi."

    if action == "set_color":
        if not entity_id:
            return "entity_id belirtilmedi."
        color_name = extra.get("color_name", "white")
        ok = _call_service("light", "turn_on", {"entity_id": entity_id, "color_name": color_name})
        return f"{entity_id} rengi {color_name} yapildi." if ok else "Renk ayarlanamadi."

    # ---------- Klima / Termostat sicaklik ----------
    if action == "set_temperature":
        if not entity_id:
            return "entity_id belirtilmedi."
        temperature = float(extra.get("temperature", 22))
        ok = _call_service("climate", "set_temperature", {"entity_id": entity_id, "temperature": temperature})
        return f"{entity_id} hedef sicaklik {temperature}°C yapildi." if ok else "Sicaklik ayarlanamadi."

    # ---------- Genel aç/kapat/toggle ----------
    if action in ("turn_on", "turn_off", "toggle"):
        if not entity_id:
            return "entity_id belirtilmedi."
        # Domain'i entity_id'den otomatik cikart
        svc_domain = domain or entity_id.split(".")[0]
        if svc_domain not in ("light", "switch", "cover", "climate", "fan",
                               "media_player", "lock", "input_boolean",
                               "automation", "script", "scene", "vacuum"):
            svc_domain = "homeassistant"
        ok = _call_service(svc_domain, action, {"entity_id": entity_id})
        action_tr = {"turn_on": "Acildi", "turn_off": "Kapatildi", "toggle": "Degeristirildi"}.get(action, action)
        return f"{entity_id} {action_tr}." if ok else f"{entity_id} {action} komutu basarisiz."

    return f"Bilinmeyen home_control aksiyonu: {action}"
