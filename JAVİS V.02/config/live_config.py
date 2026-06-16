import os
import re
from pathlib import Path
import pyaudio

# ── Paths (Yollar) ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

if BASE_DIR.name == "live" or BASE_DIR.name == "core":
    BASE_DIR = (
        BASE_DIR.parents[1]
        if BASE_DIR.parent.name == "core"
        else BASE_DIR.parent
    )

PROMPT_PATH = BASE_DIR / "core" / "prompt.txt"

# ── Regex Tanımlamaları (RegEx) ─────────────────────────────────────────────
CONTROL_TOKEN_RE = re.compile(r"<ctrl\d+>", re.IGNORECASE)

OWNER_LOCK_RE = re.compile(
    r"^\s*(?:jarvis\s+)?(?:kilitle|oturumu\s+kapat|owner\s+lock)\s*$",
    re.IGNORECASE
)

OWNER_UNLOCK_RE = re.compile(
    r"^\s*(?:jarvis\s+)?(?:yetki|owner|sahip)\s+(?:kodu|pin|şifre|sifre)\s+(.+?)\s*$",
    re.IGNORECASE
)

# ── Yetki Korumalı Araçlar ──────────────────────────────────────────────────
# Küme (set) içindeki araç isimleri alfabetik olarak sıralandı
OWNER_PROTECTED_TOOLS = {
    "cağrı_whatsapp_contact",
    "delete_memory",
    "ekle_takvim_etkinlik",
    "ekranı analiz et",
    "hatırlatma ekle",
    "hatırlatmak",
    "kabuk_koş",
    "kontrol_medya",
    "open_app",
    "play_media",
    "save_memory",
    "save_whatsapp_contact",
    "sil_takvim_etkinlik",
    "sistem_uyku",
    "takvim_etkinlikleri Al",
    "tarayıcı_kontrol",
    "whatsapp_message gönder",
}

# ── Yapay Zeka Model Ayarları ───────────────────────────────────────────────
LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

# ── Ses Ayarları ────────────────────────────────────────────────────────────
# Değişken isimleri alfabetik sıraya dizildi ve Türkçe karakter düzeltildi
FORMAT = pyaudio.paInt16
KANALLAR = 1
PARCA_BOYUT = 1024
RECV_SAMPLE_RATE = 24000
SEND_SAMPLE_RATE = 16000

# ── PyAudio Başlatma ────────────────────────────────────────────────────────
pya = pyaudio.PyAudio()