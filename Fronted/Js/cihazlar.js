// --- 1. Kategori Filtreleme Mekanizması ---
const chips = document.querySelectorAll('.chip');
const cards = document.querySelectorAll('.device-card');

chips.forEach(chip => {
    chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const filterValue = chip.getAttribute('data-filter');
        filterData(filterValue, 'type');
    });
});

// --- 2. Üst İstatistiklere Tıklayınca Duruma Göre Filtreleme ---
function filterByStatus(status) {
    filterData(status, 'status');
}

function filterData(value, filterType) {
    cards.forEach(card => {
        const typeMatch = (filterType === 'type' && (value === 'Tümü' || card.getAttribute('data-type') === value));
        const statusMatch = (filterType === 'status' && (value === 'all' || card.getAttribute('data-status') === value));

        if (typeMatch || statusMatch) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// --- 3. Arama Kutusu Filtrelemesi ---
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    cards.forEach(card => {
        const name = card.querySelector('.device-name').innerText.toLowerCase();
        const room = card.querySelector('.device-room').innerText.toLowerCase();
        if (name.includes(query) || room.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
});

// --- 4. Kart Tıklanınca Sağ Paneli Güncelleme ---
function selectDevice(cardElement, name, room, status, iconName, ip, mac) {
    document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active-card'));
    cardElement.classList.add('active-card');

    document.getElementById('panel-title').innerText = name;
    document.getElementById('panel-room').innerText = room;
    document.getElementById('panel-device-icon').innerText = iconName;
    document.getElementById('panel-ip').innerText = ip;
    document.getElementById('panel-mac').innerText = mac;

    let cpuVal = 0;
    let ramVal = 0;

    if (status === 'Online') {
        cpuVal = Math.floor(Math.random() * 40 + 10);
        ramVal = Math.floor(Math.random() * 60 + 20);
        document.getElementById('panel-cpu').innerText = "%" + cpuVal;
        document.getElementById('panel-ram').innerText = ramVal + " MB";
    } else {
        document.getElementById('panel-cpu').innerText = "%0";
        document.getElementById('panel-ram').innerText = "0 MB";
    }

    // Progress barları haraket ettir
    document.getElementById('cpu-fill').style.width = cpuVal + "%";
    document.getElementById('ram-fill').style.width = (ramVal * 100 / 128) + "%"; // Maks 128mb varsayımıyla

    const logBox = document.getElementById('logs');
    logBox.innerHTML = `<div class="log">• [Cihaz Değişti] ${name} verileri senkronize edildi.</div>`;
}

// --- 5. Switch (Aç/Kapat) ---
function toggleDeviceState(checkbox, deviceName) {
    const state = checkbox.checked ? "AÇIK (ON)" : "KAPALI (OFF)";
    addLog(`[Kontrol] ${deviceName} durumu değiştirildi: ${state}`);
}

// --- 6. Yeniden Başlat Butonu ---
function restartDevice(event, deviceName) {
    event.stopPropagation();
    addLog(`[Sistem] ${deviceName} için reboot sinyali gönderildi...`);
    alert(`${deviceName} yeniden başlatılıyor.`);
}

// --- 7. Ayarlar Butonu ---
function openSettings(event, deviceName) {
    event.stopPropagation();
    alert(`${deviceName} donanım ayar modülü terminale bağlandı.`);
}

// --- 8. Ham Komut Gönderme ---
function sendConsoleCommand() {
    const cmd = prompt("Gönderilecek Terminal Komutu (Örn: RESET_WIFI):");
    if (cmd) {
        addLog(`[Terminal Command] ${cmd}`);
    }
}

// --- 9. Yeni Cihaz Ekle ---
function addNewDevice() {
    alert("Yeni cihaz ekleme sihirbazı başlatıldı.");
}

function addLog(message) {
    const logBox = document.getElementById('logs');
    const time = new Date().toLocaleTimeString();
    logBox.innerHTML += `<div class="log">• [${time}] ${message}</div>`;
    logBox.scrollTop = logBox.scrollHeight;
}
// --- 10. MODAL KONTROL SİSTEMİ ---
function openModal() {
    const modal = document.getElementById('device-modal');
    modal.classList.add('open');

    // İnputları temizle
    document.getElementById('modal-dev-name').value = '';
    document.getElementById('modal-dev-room').value = '';
    document.getElementById('modal-dev-ip').value = '';
    document.getElementById('modal-dev-mac').value = '';
}

function closeModal() {
    const modal = document.getElementById('device-modal');
    modal.classList.remove('open');
}

// --- 11. YENİ CİHAZI DOKÜMANA KAYDETME VE EKLEME ---
function saveNewDevice() {
    const name = document.getElementById('modal-dev-name').value.trim();
    const room = document.getElementById('modal-dev-room').value.trim();
    const type = document.getElementById('modal-dev-type').value;
    const status = document.getElementById('modal-dev-status').value;
    const ip = document.getElementById('modal-dev-ip').value.trim() || '192.168.1.200';
    const mac = document.getElementById('modal-dev-mac').value.trim() || 'AA:BB:CC:DD:EE:FF';

    if (!name || !room) {
        alert("Lütfen en azından Cihaz Adı ve Konum alanlarını doldurun!");
        return;
    }

    // İkon Belirleyici Esnek Yapı
    let icon = "router";
    if (type === "Işıklar") icon = "lightbulb";
    else if (type === "Kameralar") icon = "videocam";
    else if (type === "Prizler") icon = "power";
    else if (type === "Klima") icon = "ac_unit";
    else if (type === "Sensörler") icon = "sensors";

    // Durum Badge Sınıfı Belirleyici
    let badgeClass = "success";
    let badgeText = "Online";
    if (status === "Offline") { badgeClass = "error"; badgeText = "Offline"; }
    if (status === "Maintenance") { badgeClass = "warning"; badgeText = "Bakımda"; }

    // HTML Kart Şablonunu Oluşturma
    const container = document.getElementById('device-container');
    const newCard = document.createElement('div');
    newCard.className = 'device-card';
    newCard.setAttribute('data-type', type);
    newCard.setAttribute('data-status', status);

    // Karta tıklama olayını ata
    newCard.onclick = function () {
        selectDevice(this, name, room, status, icon, ip, mac);
    };

    newCard.innerHTML = `
        <div class="card-upper">
            <div class="device-icon-wrapper"><span class="material-icons-round">${icon}</span></div>
            <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-middle">
            <h3 class="device-name">${name}</h3>
            <p class="device-room">${room} • Şimdi eklendi</p>
        </div>
        <div class="card-lower">
            <div class="quick-actions">
                <button class="circle-btn" title="Yeniden Başlat" onclick="restartDevice(event, '${name}')"><span class="material-icons-round">refresh</span></button>
                <button class="circle-btn" title="Ayarlar" onclick="openSettings(event, '${name}')"><span class="material-icons-round">settings</span></button>
            </div>
            <label class="switch" onclick="event.stopPropagation()">
                <input type="checkbox" checked onchange="toggleDeviceState(this, '${name}')">
                <span class="slider"></span>
            </label>
        </div>
    `;

    // Yeni kartı mevcut listeye ekle ve modali kapat
    container.appendChild(newCard);
    closeModal();

    // Sol taraftaki istatistik sayaç sayılarını güncelle
    updateStatsCounter();

    // Sağ terminal paneline log bas
    addLog(`[Sistem] Yeni ağ aygıtı entegre edildi: ${name} (${ip})`);
}

// Sayaçları Dinamik Hesaplama Fonksiyonu
function updateStatsCounter() {
    const totalCards = document.querySelectorAll('.device-card');
    let onlineCount = 0;
    let offlineCount = 0;
    let maintCount = 0;

    totalCards.forEach(card => {
        const s = card.getAttribute('data-status');
        if (s === 'Online') onlineCount++;
        else if (s === 'Offline') offlineCount++;
        else if (s === 'Maintenance') maintCount++;
    });

    document.getElementById('stat-total').innerText = totalCards.length;
    document.getElementById('stat-online').innerText = onlineCount;
    document.getElementById('stat-offline').innerText = offlineCount;
    document.getElementById('stat-maintenance').innerText = maintCount;

    // Yeni eklenen kartların filtreleme mekanizmasına dahil olması için global referansı tazele
    window.cards = document.querySelectorAll('.device-card');
}