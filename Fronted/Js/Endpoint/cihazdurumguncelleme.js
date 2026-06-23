// ============================================================
// app.js — Cihaz Yönetim Paneli
// ============================================================
const API_BASE = getApiBaseUrl();
const API_LIST_URL = `${API_BASE}/Listing`;
const API_UPDATE_URL = `${API_BASE}/devicestatusupdate`;

function getApiBaseUrl() {
    const liveServerPorts = ['5500', '5501', '5502'];
    const isLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && liveServerPorts.includes(window.location.port);

    if (window.location.protocol === 'file:' || isLiveServer) {
        return 'https://localhost:7201/api';
    }

    return `${window.location.origin}/api`;
}

// ------------------------------------------------------------
// Yardımcı: hem PascalCase hem camelCase field'ları destekle
// C# System.Text.Json camelCase döner, Newtonsoft PascalCase döner
// ------------------------------------------------------------
function alan(obj, ...keys) {
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return undefined;
}

// Filtre çipleriyle eşleşen kategori (light, camera, sensor, plug, climate)
function cihazTipiniBelirle(name, type) {
    const t = String(type || "").toLowerCase().trim();
    const n = String(name || "").toLowerCase();

    const bilinen = ["light", "camera", "sensor", "plug", "climate"];
    if (bilinen.includes(t)) return t;

    if (/kamera|camera|cctv/.test(n) || /kamera|camera/.test(t)) return "camera";
    if (/lamba|ışık|isik|aydinlatma|aydınlatma|light/.test(n) || /ışık|isik|light|aydınlatma/.test(t)) return "light";
    if (/priz|plug|röle|role|switch/.test(n) || /priz|plug/.test(t)) return "plug";
    if (/klima|climate|termostat|ısıtıcı|isitici/.test(n) || /klima|climate/.test(t)) return "climate";
    if (/sensör|sensor/.test(n) || /sensör|sensor/.test(t)) return "sensor";

    return "other";
}

// ------------------------------------------------------------
// Sayfa yüklenince başlat
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    cihazlariGetir();
});

// ------------------------------------------------------------
// Cihazları API'den çek ve ekrana bas
// ------------------------------------------------------------
async function cihazlariGetir() {
    try {
        const response = await fetch(API_LIST_URL);

        if (!response.ok) {
            throw new Error(`Sunucu hatası: ${response.status}`);
        }

        const devices = await response.json();

        // DEBUG: API'den gelen ilk cihazı logla — alan adlarını görmek için
        if (devices.length > 0) {
            console.log("[API Listing - İlk Cihaz Ham Veri]:", devices[0]);
        }

        kartlariOlustur(devices);
        istatistikleriGuncelle(devices);

    } catch (error) {
        console.error("[Cihaz Yükleme Hatası]", error);
        hataMesajiGoster("Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.");
    }
}

// ------------------------------------------------------------
// Cihaz kartlarını oluştur
// ------------------------------------------------------------
function kartlariOlustur(devices) {
    const devicesGrid = document.querySelector(".devices-grid");

    if (!devicesGrid) {
        console.warn(".devices-grid elementi bulunamadı.");
        return;
    }

    devicesGrid.innerHTML = "";

    if (devices.length === 0) {
        devicesGrid.innerHTML = `<p class="bos-mesaj">Kayıtlı cihaz bulunamadı.</p>`;
        return;
    }

    devices.forEach(device => {
        // FIX: alan() hem "Status" hem "status" hem "device_Status" dener
        const id = alan(device, "Id", "id");
        const name = alan(device, "Name", "name", "DeviceName", "deviceName") || "İsimsiz Cihaz";
        const type = alan(device, "Type", "type") || "Cihaz";
        const filterType = cihazTipiniBelirle(name, type);
        const status = alan(device, "Status", "status", "Device_Status", "device_Status");
        const isOnline = status === true;

        const durumText = isOnline ? "Online" : "Offline";
        const durumClass = isOnline ? "online" : "offline";
        const checked = isOnline ? "checked" : "";
        const icon = getIcon(filterType);

        devicesGrid.innerHTML += `
            <div class="device-card ${isOnline ? "active" : ""}" data-id="${id}" data-name="${name}" data-type="${filterType}">
                <div class="card-header">
                    <div class="icon-wrap">
                        <i class="${icon}"></i>
                    </div>
                    <span class="badge ${durumClass}">${durumText}</span>
                </div>

                <div class="card-body">
                    <h3>${name}</h3>
                    <p>${type}</p>
                </div>

                <div class="card-footer">
                    <div class="actions">
                        <button class="action-btn" title="Yenile">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="action-btn" title="Ayarlar">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>

                    <label class="switch">
                        <input type="checkbox" ${checked}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    });

    // Kartlar basıldıktan sonra olay dinleyicilerini bağla
    switchOlaylariniBagla();

    // Aktif filtre/arama varsa uygula
    if (typeof window.HomeOS?.applyDeviceFilters === "function") {
        window.HomeOS.applyDeviceFilters();
    }
}

// ------------------------------------------------------------
// Switch Değişimlerini Yakala ve Backend'e Bağla (Model Uyumlu)
// ------------------------------------------------------------
function switchOlaylariniBagla() {
    const switches = document.querySelectorAll(".device-card .switch input[type='checkbox']");

    switches.forEach(checkbox => {
        checkbox.addEventListener("change", async (event) => {
            const input = event.target;
            const card = input.closest(".device-card");

            // FIX: Id ve Name'i DOM attribute'undan okuyoruz — DOM text'e güvenmiyoruz
            const deviceId = parseInt(card.getAttribute("data-id"), 10);
            const deviceName = card.getAttribute("data-name");
            const targetStatus = input.checked;

            // Erken kontrol: NaN veya boş isim varsa fetch'e girme
            if (isNaN(deviceId) || !deviceName) {
                console.error("[Payload Hatası] Id veya Name geçersiz:", { deviceId, deviceName });
                hataMesajiGoster("Cihaz bilgisi okunamadı. Sayfayı yenileyip tekrar deneyin.");
                input.checked = !input.checked; // rollback
                return;
            }

            try {
                const payload = {
                    Id: deviceId,
                    DeviceName: deviceName,
                    DeviceVersion: "",
                    Device_Status: targetStatus
                };
                console.log("[Gönderilen Payload]:", payload);

                const response = await fetch(API_UPDATE_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    let errorMsg = "Güncelleme başarısız.";
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.message || errorMsg;
                    } catch (_) { /* response body JSON değilse sessizce geç */ }
                    console.error("[Backend Hata Detayı] Status:", response.status, "| Mesaj:", errorMsg);
                    throw new Error(`${response.status} — ${errorMsg}`);
                }

                const result = await response.json();
                console.log("[Backend Başarılı]:", result.message);

                // Arayüzü (DOM) anlık görsel olarak güncelle
                const badge = card.querySelector(".badge");
                if (targetStatus === true) {
                    card.classList.add("active");
                    badge.textContent = "Online";
                    badge.className = "badge online";
                } else {
                    card.classList.remove("active");
                    badge.textContent = "Offline";
                    badge.className = "badge offline";
                }

                // Üst sayaçları yenile
                cihazlariYenidenHesapla();

            } catch (error) {
                console.error("[Durum Güncelleme Hatası]", error);
                hataMesajiGoster(`Cihaz durumu değiştirilemedi: ${error.message}`);

                // Rollback: Hata olursa switch'i eski konumuna çek
                input.checked = !input.checked;
            }
        });
    });
}

// ------------------------------------------------------------
// İstatistikleri Yeniden Hesapla
// ------------------------------------------------------------
function cihazlariYenidenHesapla() {
    const cards = document.querySelectorAll(".device-card");
    const mockDevices = Array.from(cards).map(card => ({
        Status: card.querySelector(".switch input").checked
    }));
    istatistikleriGuncelle(mockDevices);
}

// ------------------------------------------------------------
// Cihaz tipine göre ikon döndür
// ------------------------------------------------------------
function getIcon(type) {
    const ikonlar = {
        light: "fas fa-lightbulb",
        camera: "fas fa-video",
        plug: "fas fa-plug",
        sensor: "fas fa-microchip",
        climate: "fas fa-snowflake",
    };

    return ikonlar[type?.toLowerCase()] ?? "fas fa-laptop";
}

// ------------------------------------------------------------
// Üst istatistik kartlarını güncelle
// ------------------------------------------------------------
function istatistikleriGuncelle(devices) {
    const toplam = devices.length;
    const online = devices.filter(d => alan(d, "Status", "status") === true).length;
    const offline = toplam - online;

    const statCards = document.querySelectorAll(".stat-card .num");

    if (statCards.length < 3) {
        console.warn("Yeterli .stat-card elementi bulunamadı.");
        return;
    }

    statCards[0].textContent = toplam;
    statCards[1].textContent = online;
    statCards[2].textContent = offline;
}

// ------------------------------------------------------------
// Hata toast bildirimi göster
// ------------------------------------------------------------
function hataMesajiGoster(mesaj) {
    if (document.getElementById("hata-banner")) return;

    if (!document.getElementById("hata-style")) {
        const style = document.createElement("style");
        style.id = "hata-style";
        style.textContent = `
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(40px); }
                to   { opacity: 1; transform: translateX(0);    }
            }
            #hata-banner {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 10px;
                background: #ff4d4f;
                color: #fff;
                padding: 14px 18px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
                font-size: 14px;
                max-width: 380px;
                animation: slideIn 0.3s ease;
            }
            #hata-banner button {
                background: none;
                border: none;
                color: #fff;
                cursor: pointer;
                margin-left: auto;
                font-size: 16px;
                opacity: 0.8;
                padding: 0 2px;
                line-height: 1;
            }
            #hata-banner button:hover { opacity: 1; }
        `;
        document.head.appendChild(style);
    }

    const banner = document.createElement("div");
    banner.id = "hata-banner";
    banner.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${mesaj}</span>
        <button onclick="this.parentElement.remove()" title="Kapat">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(banner);
    setTimeout(() => banner?.remove(), 5000);
}
