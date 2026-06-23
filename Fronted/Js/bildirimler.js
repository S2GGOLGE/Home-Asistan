/* =====================================================
   bildirimler.js - Bildirim Merkezi API entegrasyonu
   Endpoints: GET/POST/PUT/DELETE /api/Notifications
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

let allNotifs = [];

document.addEventListener('DOMContentLoaded', () => {
    startLoader();
    fetchStats();
    fetchNotifications();
    bindFilters();
    bindActions();
});

// ─── LOADER ─────────────────────────────────────────
function startLoader() {
    const overlay = document.getElementById('loader-overlay');
    const bar = document.getElementById('loader-bar');
    const pct = document.getElementById('loader-percentage');
    const txt = document.getElementById('loader-text');
    if (!overlay) return;
    let progress = 0;
    const timer = setInterval(() => {
        progress += Math.floor(Math.random() * 6) + 3;
        if (progress >= 100) { progress = 100; clearInterval(timer); }
        if (bar) bar.style.width = progress + '%';
        if (pct) pct.textContent = progress + '%';
        if (txt) txt.textContent = progress < 50 ? 'Bildirimler alınıyor...' : progress < 90 ? 'Kategoriler işleniyor...' : 'Hazır.';
        if (progress >= 100) {
            setTimeout(() => {
                overlay.classList.add('fade-out');
                overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
            }, 300);
        }
    }, 40);
}

// ─── STATS ────────────────────────────────────────────
async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/Notifications/stats`);
        if (!res.ok) return;
        const s = await res.json();
        setText('stat-total', s.total ?? 0);
        setText('stat-unread', s.unread ?? 0);
        setText('stat-critical', s.critical ?? 0);
        setText('stat-warning', s.warning ?? 0);
        setText('stat-automation', s.automation ?? 0);
    } catch (err) {
        console.error('[Notifications] Stats fetch error:', err);
    }
}

// ─── FETCH ────────────────────────────────────────────
async function fetchNotifications() {
    try {
        const res = await fetch(`${API_BASE}/Notifications`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allNotifs = await res.json();
        applyFiltersAndRender();
    } catch (err) {
        console.error('[Notifications] Fetch error:', err);
        showEmpty('API bağlantısı kurulamadı.');
    }
}

// ─── FILTERS ──────────────────────────────────────────
function bindFilters() {
    ['searchInput', 'filterPriority', 'filterCategory', 'filterRead'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', applyFiltersAndRender);
    });
}

function applyFiltersAndRender() {
    const search = val('searchInput').toLowerCase();
    const priority = val('filterPriority');
    const category = val('filterCategory');
    const readFilter = val('filterRead');

    const filtered = allNotifs.filter(n => {
        if (search && !`${n.title} ${n.message}`.toLowerCase().includes(search)) return false;
        if (priority && n.priority !== priority) return false;
        if (category && n.category !== category) return false;
        if (readFilter === 'unread' && n.isRead) return false;
        if (readFilter === 'read' && !n.isRead) return false;
        return true;
    });

    setText('listCount', filtered.length);
    renderList(filtered);
}

// ─── RENDER ───────────────────────────────────────────
const PRIORITY_CONFIG = {
    critical: { icon: 'fa-skull-crossbones', cls: 'critical', label: 'Kritik' },
    warning:  { icon: 'fa-exclamation-triangle', cls: 'warning', label: 'Uyarı' },
    info:     { icon: 'fa-info-circle', cls: 'info', label: 'Bilgi' },
    success:  { icon: 'fa-check-circle', cls: 'success', label: 'Başarı' }
};

const CATEGORY_LABELS = {
    device: 'Cihaz', security: 'Güvenlik',
    automation: 'Otomasyon', system: 'Sistem', sensor: 'Sensör'
};

function renderList(notifs) {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (notifs.length === 0) {
        showEmpty('Bildirim bulunamadı.');
        return;
    }

    list.innerHTML = notifs.map(n => buildItem(n)).join('');

    // Bind click events
    list.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            markRead(id);
        });
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            deleteNotif(id);
        });
    });

    // Click on item to mark read
    list.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            if (id) markRead(id);
        });
    });
}

function buildItem(n) {
    const cfg = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG['info'];
    const catLabel = CATEGORY_LABELS[n.category] || n.category;
    const readCls = n.isRead ? 'read' : 'unread';
    const date = n.createdAt ? new Date(n.createdAt).toLocaleString('tr-TR') : '-';

    return `
    <div class="notif-item priority-${cfg.cls} ${readCls}" data-id="${n.id}">
        ${!n.isRead ? '<div class="unread-dot"></div>' : ''}
        <div class="notif-icon ${cfg.cls}">
            <i class="fas ${cfg.icon}"></i>
        </div>
        <div class="notif-body">
            <div class="notif-title">${escHtml(n.title)}</div>
            <div class="notif-msg">${escHtml(n.message)}</div>
            <div class="notif-footer">
                <span class="notif-tag ${n.category}">${catLabel}</span>
                <span>${date}</span>
                ${n.isRead ? '<span style="color:var(--accent-green)"><i class="fas fa-check"></i> Okundu</span>' : ''}
            </div>
        </div>
        <div class="notif-actions">
            ${!n.isRead ? `<button class="notif-action-btn mark-read-btn" data-id="${n.id}" title="Okundu İşaretle"><i class="fas fa-check"></i></button>` : ''}
            <button class="notif-action-btn delete-btn" data-id="${n.id}" title="Sil"><i class="fas fa-trash"></i></button>
        </div>
    </div>`;
}

function showEmpty(msg) {
    const list = document.getElementById('notifList');
    if (!list) return;
    list.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-bell-slash"></i>
            <p>${msg}</p>
        </div>`;
    setText('listCount', 0);
}

// ─── ACTIONS ──────────────────────────────────────────
function bindActions() {
    const markAllBtn = document.getElementById('markAllReadBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    if (markAllBtn) markAllBtn.addEventListener('click', markAllRead);
    if (clearAllBtn) clearAllBtn.addEventListener('click', () => {
        if (confirm('Tüm bildirimler silinecek. Emin misiniz?')) clearAll();
    });
}

async function markRead(id) {
    try {
        await fetch(`${API_BASE}/Notifications/${id}/read`, { method: 'PUT' });
        const notif = allNotifs.find(n => n.id == id);
        if (notif) notif.isRead = true;
        applyFiltersAndRender();
        fetchStats();
    } catch (e) { console.error(e); }
}

async function deleteNotif(id) {
    try {
        await fetch(`${API_BASE}/Notifications/${id}`, { method: 'DELETE' });
        allNotifs = allNotifs.filter(n => n.id != id);
        applyFiltersAndRender();
        fetchStats();
    } catch (e) { console.error(e); }
}

async function markAllRead() {
    try {
        await fetch(`${API_BASE}/Notifications/readall`, { method: 'PUT' });
        allNotifs.forEach(n => n.isRead = true);
        applyFiltersAndRender();
        fetchStats();
    } catch (e) { console.error(e); }
}

async function clearAll() {
    try {
        await fetch(`${API_BASE}/Notifications/clearall`, { method: 'DELETE' });
        allNotifs = [];
        applyFiltersAndRender();
        fetchStats();
    } catch (e) { console.error(e); }
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
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
