// ============================================================
//  app.js — Cihaz Yönetim Paneli
// ============================================================

const API_URL = `${getApiBaseUrl()}/Listing`;

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
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Sunucu hatası: ${response.status}`);
        }

        const devices = await response.json();

        kartlariOlustur(devices);

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
        const durumText  = device.status ? "Online"  : "Offline";
        const durumClass = device.status ? "online"  : "offline";
        const checked    = device.status ? "checked" : "";
        const icon       = getIcon(device.type);

        devicesGrid.innerHTML += `
            <div class="device-card ${device.status ? "active" : ""}" data-id="${device.id}">
                <div class="card-header">
                    <div class="icon-wrap">
                        <i class="${icon}"></i>
                    </div>
                    <span class="badge ${durumClass}">${durumText}</span>
                </div>

                <div class="card-body">
                    <h3>${device.name}</h3>
                    <p>${device.type}</p>
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
}

// ------------------------------------------------------------
// Cihaz tipine göre ikon döndür
// ------------------------------------------------------------
function getIcon(type) {
    const ikonlar = {
        light:   "fas fa-lightbulb",
        camera:  "fas fa-video",
        plug:    "fas fa-plug",
        sensor:  "fas fa-microchip",
        climate: "fas fa-snowflake",
    };

    return ikonlar[type?.toLowerCase()] ?? "fas fa-laptop";
}

// ------------------------------------------------------------
// Üst istatistik kartlarını güncelle
// ------------------------------------------------------------
function istatistikleriGuncelle(devices) {
    const toplam = devices.length;
    const online  = devices.filter(d => d.status).length;
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
    // Zaten varsa tekrar oluşturma
    if (document.getElementById("hata-banner")) return;

    // Animasyon stilini bir kez ekle
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

    // 5 saniye sonra otomatik kapat
    setTimeout(() => banner?.remove(), 5000);
}
