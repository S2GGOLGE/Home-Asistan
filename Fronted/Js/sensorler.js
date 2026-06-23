/* =====================================================
   sensorler.js - Sensörler sayfası API entegrasyonu
   Endpoint: GET /api/Sensors
   ===================================================== */

const API_BASE = getApiBaseUrl();

function getApiBaseUrl() {
    const liveServerPorts = ['5500', '5501', '5502'];
    const isLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && liveServerPorts.includes(window.location.port);

    if (window.location.protocol === 'file:' || isLiveServer) {
        return 'https://localhost:7201/api';
    }

    return `${window.location.origin}/api`;
}

let allSensors = [];
let refreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    startLoader();
    fetchSensors();
    bindFilters();
    bindAddBtn();

    // Her 30 saniyede bir otomatik yenile
    refreshTimer = setInterval(fetchSensors, 30000);
});

// ─── LOADER ─────────────────────────────────────────
function startLoader() {
    const overlay = document.getElementById('loader-overlay');
    const bar = document.getElementById('loader-bar');
    const pct = document.getElementById('loader-percentage');
    const txt = document.getElementById('loader-text');
    if (!overlay) return;

    const steps = [
        { at: 30, msg: 'Sensör ağı taranıyor...' },
        { at: 60, msg: 'Değerler okunuyor...' },
        { at: 85, msg: 'Veri işleniyor...' },
        { at: 100, msg: 'Sensör tablosu hazır.' }
    ];

    let progress = 0;
    const timer = setInterval(() => {
        progress += Math.floor(Math.random() * 6) + 3;
        if (progress >= 100) { progress = 100; clearInterval(timer); }
        if (bar) bar.style.width = progress + '%';
        if (pct) pct.textContent = progress + '%';
        const step = steps.find(s => progress <= s.at);
        if (step && txt) txt.textContent = step.msg;
        if (progress >= 100) {
            setTimeout(() => {
                overlay.classList.add('fade-out');
                overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
            }, 300);
        }
    }, 40);
}

// ─── API FETCH ────────────────────────────────────────
async function fetchSensors() {
    try {
        const res = await fetch(`${API_BASE}/Sensors`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allSensors = await res.json();
        updateStats(allSensors);
        renderGrid(filterSensors(allSensors));
    } catch (err) {
        console.error('[Sensors] Fetch hatası:', err);
        renderEmpty('API bağlantısı kurulamadı. Sunucunun çalıştığından emin olun.');
    }
}

// ─── STATS ────────────────────────────────────────────
function updateStats(sensors) {
    const total = sensors.length;
    const online = sensors.filter(s => s.status === 'online').length;
    const alert = sensors.filter(s => s.status === 'warning' || s.status === 'offline').length;

    const temps = sensors.filter(s => s.type === 'temperature' && s.status === 'online').map(s => s.value);
    const hums = sensors.filter(s => s.type === 'humidity' && s.status === 'online').map(s => s.value);

    const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '—';
    const avgHum = hums.length ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1) : '—';

    setText('stat-total', total);
    setText('stat-online', online);
    setText('stat-alert', alert);
    setText('stat-temp', temps.length ? avgTemp + '°C' : '—°C');
    setText('stat-hum', hums.length ? avgHum + '%' : '—%');
}

// ─── FILTERS ──────────────────────────────────────────
function bindFilters() {
    ['searchInput', 'filterType', 'filterRoom', 'filterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => renderGrid(filterSensors(allSensors)));
    });
}

function filterSensors(sensors) {
    const search = val('searchInput').toLowerCase();
    const type = val('filterType');
    const room = val('filterRoom');
    const status = val('filterStatus');

    return sensors.filter(s => {
        if (search && !`${s.name} ${s.room} ${s.type}`.toLowerCase().includes(search)) return false;
        if (type && s.type !== type) return false;
        if (room && s.room !== room) return false;
        if (status && s.status !== status) return false;
        return true;
    });
}

// ─── RENDER ───────────────────────────────────────────
const TYPE_ICONS = {
    temperature: { icon: 'fa-thermometer-half', color: 'blue', unit: '°C', max: 50 },
    humidity: { icon: 'fa-tint', color: 'orange', unit: '%', max: 100 },
    motion: { icon: 'fa-running', color: 'purple', unit: '', max: 1 },
    door: { icon: 'fa-door-open', color: 'orange', unit: '', max: 1 },
    smoke: { icon: 'fa-smog', color: 'red', unit: 'ppm', max: 200 },
    light: { icon: 'fa-sun', color: 'orange', unit: 'lux', max: 1000 },
    co2: { icon: 'fa-wind', color: 'red', unit: 'ppm', max: 1000 }
};

function renderGrid(sensors) {
    const grid = document.getElementById('sensorGrid');
    if (!grid) return;

    if (sensors.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary)">
                <i class="fas fa-microchip" style="font-size:48px;opacity:0.2;display:block;margin-bottom:16px"></i>
                <p>Sensör bulunamadı.</p>
            </div>`;
        return;
    }

    grid.innerHTML = sensors.map(s => buildCard(s)).join('');
}

function buildCard(s) {
    const meta = TYPE_ICONS[s.type] || { icon: 'fa-microchip', color: 'green', unit: '', max: 100 };
    const isAlert = s.status === 'warning' || s.status === 'offline';
    const statusLabel = { online: 'Çevrimiçi', offline: 'Çevrimdışı', warning: 'Uyarı' }[s.status] || s.status;
    const statusClass = s.status === 'online' ? 'online' : s.status === 'warning' ? 'warning' : 'offline';

    // Progress bar width
    const pct = meta.max > 0 ? Math.min(100, Math.max(0, (s.value / meta.max) * 100)) : 0;
    const barClass = s.type === 'temperature' ? 'hot' : s.type === 'humidity' ? 'humid' : '';

    // Display value
    let displayVal = s.value;
    if (s.type === 'motion' || s.type === 'door') {
        displayVal = s.value > 0 ? 'Açık' : 'Kapalı';
    }

    const unit = s.unit || meta.unit;
    const battery = s.batteryLevel != null
        ? `<span><i class="fas fa-battery-three-quarters"></i> %${s.batteryLevel}</span>` : '';
    const lastUpd = s.lastUpdated ? `<span><i class="fas fa-clock"></i> ${formatAgo(s.lastUpdated)}</span>` : '';

    return `
    <div class="sensor-card ${isAlert ? 'alert' : ''}" data-id="${s.id}" title="${s.name} - ${s.room || 'Bilinmiyor'}">
        <div class="sensor-header">
            <div class="sensor-icon ${isAlert ? 'red' : meta.color}">
                <i class="fas ${meta.icon}"></i>
            </div>
            <span class="sensor-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div>
            <div class="sensor-name">${escHtml(s.name)}</div>
            <div class="sensor-room"><i class="fas fa-door-open"></i> ${escHtml(s.room || 'Bilinmiyor')}</div>
        </div>
        <div>
            <div class="sensor-value ${isAlert ? 'alert-val' : ''}">
                ${typeof displayVal === 'number' ? displayVal.toLocaleString('tr-TR') : displayVal}
                <span class="sensor-unit">${unit}</span>
            </div>
            <div class="sensor-bar-wrap" style="margin-top:8px">
                <div class="sensor-bar ${barClass}" style="width:${pct}%"></div>
            </div>
        </div>
        <div class="sensor-meta">
            ${battery}
            ${lastUpd}
            <span><i class="fas fa-map-marker-alt"></i> ${escHtml(s.location || '-')}</span>
        </div>
    </div>`;
}

function renderEmpty(msg) {
    const grid = document.getElementById('sensorGrid');
    if (!grid) return;
    grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-secondary)">
            <i class="fas fa-exclamation-triangle" style="font-size:48px;opacity:0.2;display:block;margin-bottom:16px"></i>
            <p>${msg}</p>
        </div>`;
}

// ─── ADD SENSOR ───────────────────────────────────────
function bindAddBtn() {
    const btn = document.getElementById('addSensorBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const name = prompt('Sensör Adı:');
        if (!name) return;
        const type = prompt('Tip (temperature/humidity/motion/door/smoke/light/co2):', 'temperature');
        const room = prompt('Oda:');
        addSensor({ name, type: type || 'temperature', room, value: 0, status: 'online' });
    });
}

async function addSensor(dto) {
    try {
        const res = await fetch(`${API_BASE}/Sensors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res.ok) {
            await fetchSensors();
        } else {
            const err = await res.json();
            alert('Hata: ' + (err.message || 'Bilinmeyen hata'));
        }
    } catch (e) {
        alert('Bağlantı hatası: ' + e.message);
    }
}

// ─── UTILS ────────────────────────────────────────────
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatAgo(dateStr) {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} saat önce`;
    return d.toLocaleDateString('tr-TR');
}
