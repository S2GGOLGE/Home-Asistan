// ══════════════════════════════
//  KAYNAK ÇUBUKLARI
// ══════════════════════════════
const cpu = 27;
const ram = 48;

document.getElementById("cpuBar").style.width  = cpu + "%";
document.getElementById("ramBar").style.width  = ram + "%";

// ══════════════════════════════
//  CANLI LOG
// ══════════════════════════════
const logMessages = [
    "[BİLGİ] Backend başlatıldı",
    "[BİLGİ] SignalR bağlantısı kuruldu",
    "[BİLGİ] Jarvis çekirdeği hazır",
    "[BİLGİ] MQTT bağlantısı kuruldu",
    "[BİLGİ] Cihaz izleyici aktif",
    "[BİLGİ] Sesli komut alındı",
    "[BİLGİ] Otomasyon tetiklendi"
];

const logContainer = document.getElementById("logs");
let logIndex = 0;

function addLog() {
    const div = document.createElement("div");
    div.classList.add("log");
    div.textContent = logMessages[logIndex % logMessages.length];
    logContainer.prepend(div);
    logIndex++;
}

// İlk 5 logu hemen göster
for (let i = 0; i < 5; i++) {
    addLog();
}

// Sonrasında her 2 saniyede bir yeni log
setInterval(addLog, 2000);