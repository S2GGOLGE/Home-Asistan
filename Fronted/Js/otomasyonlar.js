/* =====================================================
   otomasyonlar.js - Otomasyonlar API entegrasyonu
   Endpoint: GET/POST/PUT/DELETE /api/Automations
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

let allAutomations = [];

document.addEventListener('DOMContentLoaded', () => {
    startLoader();
    fetchAutomations();
    bindEvents();
});

// ─── LOADER ─────────────────────────────────────────
function startLoader() {
    const overlay = document.getElementById('loader-overlay');
    const bar = document.getElementById('loader-bar');
    const pct = document.getElementById('loader-percentage');
    const txt = document.getElementById('loader-text');
    if (!overlay) return;
    const steps = [
        { at: 25, msg: 'Otomasyon modülleri yükleniyor...' },
        { at: 55, msg: 'Tetikleyiciler ve koşullar okunuyor...' },
        { at: 80, msg: 'Zamanlanmış görevler senkronize ediliyor...' },
        { at: 100, msg: 'Otomasyon sistemi hazır.' }
    ];
    let progress = 0;
    const timer = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 3;
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
    }, 30);
}

// ─── FETCH ───────────────────────────────────────────
async function fetchAutomations() {
    const container = document.getElementById('automationList') || document.querySelector('.automation-grid') || document.querySelector('[data-automation-list]');
    try {
        const res = await fetch(`${API_BASE}/Automations`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allAutomations = await res.json();
        renderAutomations(allAutomations, container);
        updateStats(allAutomations);
    } catch (err) {
        console.error('[Automations] Fetch hatası:', err);
        if (container) container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--text-secondary)">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;opacity:0.2;display:block;margin-bottom:16px"></i>
                <p>Otomasyon verileri yüklenemedi.</p>
            </div>`;
    }
}

// ─── STATS ───────────────────────────────────────────
function updateStats(automations) {
    setText('statTotal', automations.length);
    setText('statActive', automations.filter(a => a.isActive).length);
    setText('statInactive', automations.filter(a => !a.isActive).length);
}

// ─── RENDER ──────────────────────────────────────────
function renderAutomations(automations, container) {
    if (!container) return;
    if (automations.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--text-secondary)">
                <i class="fas fa-bolt" style="font-size:48px;opacity:0.2;display:block;margin-bottom:16px"></i>
                <p>Henüz otomasyon tanımlanmamış.</p>
                <button onclick="openAddModal()" style="margin-top:16px;padding:10px 24px;background:var(--accent-green);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700">
                    <i class="fas fa-plus"></i> İlk Otomasyonu Ekle
                </button>
            </div>`;
        return;
    }
    container.innerHTML = automations.map(a => buildCard(a)).join('');
    // Bind toggle & delete buttons
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleAutomation(parseInt(btn.dataset.id)));
    });
    container.querySelectorAll('.run-btn').forEach(btn => {
        btn.addEventListener('click', () => runAutomation(parseInt(btn.dataset.id)));
    });
    container.querySelectorAll('.delete-auto-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Bu otomasyonu silmek istiyor musunuz?')) deleteAutomation(parseInt(btn.dataset.id));
        });
    });
}

function buildCard(a) {
    const statusBadge = a.isActive
        ? '<span style="background:rgba(0,255,136,0.12);color:var(--accent-green);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">AKTİF</span>'
        : '<span style="background:rgba(255,68,68,0.12);color:#ff4444;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">PASIF</span>';
    const lastRun = a.lastRun ? new Date(a.lastRun).toLocaleString('tr-TR') : 'Hiç çalışmadı';
    return `
    <div class="automation-card" data-id="${a.id}" style="background:var(--bg-panel);border:1px solid ${a.isActive ? 'var(--accent-green)' : 'var(--border-line)'};border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px;transition:all 0.3s">
        <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:10px">
                <div style="width:40px;height:40px;border-radius:10px;background:rgba(0,255,136,0.1);display:flex;align-items:center;justify-content:center;color:var(--accent-green)">
                    <i class="fas fa-bolt"></i>
                </div>
                <div>
                    <div style="font-weight:700;font-size:15px">${escHtml(a.name)}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">${escHtml(a.description || '')}</div>
                </div>
            </div>
            ${statusBadge}
        </div>
        ${a.triggerCondition ? `<div style="background:var(--bg-inner);border-radius:8px;padding:10px;font-size:12px"><span style="color:var(--text-secondary)">Tetikleyici:</span> ${escHtml(a.triggerCondition)}</div>` : ''}
        ${a.actionDescription ? `<div style="background:var(--bg-inner);border-radius:8px;padding:10px;font-size:12px"><span style="color:var(--text-secondary)">Eylem:</span> ${escHtml(a.actionDescription)}</div>` : ''}
        <div style="font-size:11px;color:var(--text-secondary)"><i class="fas fa-clock"></i> Son çalışma: ${lastRun}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="toggle-btn" data-id="${a.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-line);background:${a.isActive ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.1)'};color:${a.isActive ? '#ff4444' : 'var(--accent-green)'};cursor:pointer;font-size:12px;font-weight:600">
                <i class="fas ${a.isActive ? 'fa-pause' : 'fa-play'}"></i> ${a.isActive ? 'Durdur' : 'Etkinleştir'}
            </button>
            <button class="run-btn" data-id="${a.id}" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--accent-green);background:rgba(0,255,136,0.08);color:var(--accent-green);cursor:pointer;font-size:12px;font-weight:600">
                <i class="fas fa-play-circle"></i> Çalıştır
            </button>
            <button class="delete-auto-btn" data-id="${a.id}" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,68,68,0.3);background:rgba(255,68,68,0.05);color:#ff4444;cursor:pointer;font-size:12px">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>`;
}

// ─── API ACTIONS ──────────────────────────────────────
async function toggleAutomation(id) {
    try {
        await fetch(`${API_BASE}/Automations/${id}/toggle`, { method: 'PUT' });
        await fetchAutomations();
    } catch (e) { console.error(e); }
}

async function runAutomation(id) {
    try {
        await fetch(`${API_BASE}/Automations/${id}/run`, { method: 'PUT' });
        alert('Otomasyon çalıştırıldı!');
        await fetchAutomations();
    } catch (e) { console.error(e); }
}

async function deleteAutomation(id) {
    try {
        await fetch(`${API_BASE}/Automations/${id}`, { method: 'DELETE' });
        await fetchAutomations();
    } catch (e) { console.error(e); }
}

// ─── ADD MODAL ────────────────────────────────────────
function bindEvents() {
    const backButton = document.getElementById('backButton');
    if (backButton) backButton.addEventListener('click', () => window.location.href = '/Fronted/Pages/index.html');

    const automationForm = document.getElementById('automationForm');
    const autoNameInput = document.getElementById('autoName');
    if (automationForm && autoNameInput) {
        automationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = autoNameInput.value.trim();
            if (!name) return;
            const trigger = document.getElementById('autoTrigger')?.value || '';
            const action = document.getElementById('autoAction')?.value || '';
            const desc = document.getElementById('autoDesc')?.value || '';
            await createAutomation({ name, description: desc, triggerCondition: trigger, actionDescription: action, isActive: true });
            if (window.HomeOSModal) window.HomeOSModal.close('automationModal');
            else automationForm.reset();
        });
    }
}

function openAddModal() {
    if (window.HomeOSModal) window.HomeOSModal.open('automationModal');
}

async function createAutomation(dto) {
    try {
        const res = await fetch(`${API_BASE}/Automations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });
        if (res.ok) {
            alert('Otomasyon başarıyla eklendi!');
            await fetchAutomations();
        } else {
            const err = await res.json();
            alert('Hata: ' + (err.message || 'Bilinmeyen hata'));
        }
    } catch (e) { alert('Bağlantı hatası: ' + e.message); }
}

// ─── UTILS ───────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
