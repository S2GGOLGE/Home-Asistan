const API_BASE = getApiBaseUrl();

let normalLogsList = [];
let currentAppPage = 1;
let pageSize = 50;
let totalAppPages = 1;
let totalAppRecords = 0;
let currentDateRange = '';

function getApiBaseUrl() {
    const liveServerPorts = ['5500', '5501', '5502'];
    const isLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && liveServerPorts.includes(window.location.port);

    if (window.location.protocol === 'file:' || isLiveServer) {
        return 'https://localhost:7201/api';
    }

    return `${window.location.origin}/api`;
}

function unwrapApiResponse(payload) {
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
        if (!payload.success) throw new Error(payload.error || 'API error');
        return payload.data;
    }
    return payload;
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    const data = unwrapApiResponse(payload);

    if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `HTTP ${res.status}`);
    }

    return data;
}

const el = {
    appLogsTableBody: document.getElementById('applogs-table-body'),
    appLogsPagination: document.getElementById('applogs-pagination'),
    filterLogLevel: document.getElementById('filter-log-level'),
    filterFrom: document.getElementById('filter-from'),
    filterTo: document.getElementById('filter-to'),
    searchInput: document.getElementById('search-input'),
    loaderOverlay: document.getElementById('loader-overlay'),
    loaderBar: document.getElementById('loader-bar'),
    loaderText: document.getElementById('loader-text'),
    loaderPercentage: document.getElementById('loader-percentage')
};

function setText(node, value) {
    if (node) node.textContent = value ?? '';
}

function normalizeLog(log) {
    return {
        id: log.id ?? log.Id ?? 0,
        logLevel: log.logLevel ?? log.LogLevel ?? log.level ?? log.Level ?? 'Information',
        message: log.message ?? log.Message ?? '',
        userId: log.userId ?? log.UserId ?? '',
        userName: log.userName ?? log.UserName ?? '',
        source: log.source ?? log.Source ?? '',
        createdAt: log.createdAt ?? log.CreatedAt ?? ''
    };
}

async function fetchAppLogs() {
    if (!el.appLogsTableBody) return;
    setTableLoading(el.appLogsTableBody, 6);
    try {
        const params = new URLSearchParams({
            page: String(currentAppPage),
            pageSize: String(pageSize)
        });

        const searchVal = (el.searchInput?.value || '').trim();
        if (searchVal) params.append('search', searchVal);
        if (el.filterLogLevel?.value) params.append('level', el.filterLogLevel.value);
        if (el.filterFrom?.value) params.append('from', el.filterFrom.value);
        if (el.filterTo?.value) params.append('to', el.filterTo.value);
        if (currentDateRange) params.append('dateRange', currentDateRange);

        const result = await fetchJson(`${API_BASE}/logs?${params.toString()}`);
        const items = Array.isArray(result) ? result : result.items ?? result.Items ?? [];
        normalLogsList = items.map(normalizeLog);
        totalAppPages  = Math.max(1, result.totalPages   ?? result.TotalPages   ?? 1);
        totalAppRecords = result.total ?? result.Total ?? result.totalRecords ?? result.TotalRecords ?? 0;

        renderAppLogsTable();
        renderAppPagination();
    } catch (err) {
        console.error('App logs fetch error:', err);
        renderTableError(el.appLogsTableBody, 6, 'Uygulama logları yüklenemedi. Sunucu bağlantısını kontrol edin.');
    }
}

function renderAppLogsTable() {
    if (!el.appLogsTableBody) return;

    if (normalLogsList.length === 0) {
        renderTableMessage(el.appLogsTableBody, 6, 'Kayıt bulunamadı.');
        return;
    }

    el.appLogsTableBody.innerHTML = normalLogsList.map(log => `
        <tr>
            <td>${log.id}</td>
            <td><span class="level-badge ${getLevelClass(log.logLevel)}">${escapeHtml(log.logLevel)}</span></td>
            <td>${escapeHtml(log.source || '-')}</td>
            <td>${escapeHtml(log.message)}</td>
            <td>${escapeHtml(log.userName || log.userId || '-')}</td>
            <td>${formatDate(log.createdAt)}</td>
        </tr>
    `).join('');
}

function renderAppPagination() {
    if (!el.appLogsPagination) return;

    el.appLogsPagination.innerHTML = `
        <span class="pagination-info">
            Toplam <strong>${totalAppRecords.toLocaleString('tr-TR')}</strong> kayıt
            &nbsp;·&nbsp;
            Sayfa <strong>${currentAppPage}</strong> / <strong>${totalAppPages}</strong>
        </span>
        <button class="pagination-btn" ${currentAppPage <= 1 ? 'disabled' : ''} data-page="1" title="İlk Sayfa">
            <i class="fas fa-angle-double-left"></i>
        </button>
        <button class="pagination-btn" ${currentAppPage <= 1 ? 'disabled' : ''} data-page="${currentAppPage - 1}" title="Önceki">
            <i class="fas fa-angle-left"></i> Önceki
        </button>
        <button class="pagination-btn" ${currentAppPage >= totalAppPages ? 'disabled' : ''} data-page="${currentAppPage + 1}" title="Sonraki">
            Sonraki <i class="fas fa-angle-right"></i>
        </button>
        <button class="pagination-btn" ${currentAppPage >= totalAppPages ? 'disabled' : ''} data-page="${totalAppPages}" title="Son Sayfa">
            <i class="fas fa-angle-double-right"></i>
        </button>
    `;

    el.appLogsPagination.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
        button.addEventListener('click', () => {
            currentAppPage = Math.max(1, Math.min(totalAppPages, Number(button.dataset.page || '1')));
            fetchAppLogs();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function renderTableMessage(tbody, colspan, message) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-row">${escapeHtml(message)}</td></tr>`;
}

function getLevelClass(level) {
    const map = {
        'information': 'info',
        'warning':     'warn',
        'error':       'error',
        'critical':    'critical',
        'security':    'security'
    };
    return map[String(level).toLowerCase()] ?? 'info';
}

function setTableLoading(tbody, colspan) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-row"><i class="fas fa-circle-notch fa-spin"></i> Yükleniyor...</td></tr>`;
}

function renderTableError(tbody, colspan, message) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-row error-state"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(message)}</td></tr>`;
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(String(value));
    return date.toLocaleString('tr-TR');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function setupEvents() {
    document.getElementById('refresh-btn')?.addEventListener('click', initializeSystem);
    document.getElementById('apply-filters-btn')?.addEventListener('click', () => {
        currentAppPage = 1;
        fetchAppLogs();
    });
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
        [el.filterLogLevel, el.filterFrom, el.filterTo].forEach(input => {
            if (input) input.value = '';
        });
        if (el.searchInput) el.searchInput.value = '';
        currentDateRange = '';
        document.querySelectorAll('.date-shortcut-btn').forEach(b => b.classList.remove('active'));
        currentAppPage = 1;
        fetchAppLogs();
    });

    let _searchTimer = null;
    el.searchInput?.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
            currentAppPage = 1;
            fetchAppLogs();
        }, 400);
    });

    document.querySelectorAll('.date-shortcut-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const range = btn.dataset.range;
            currentDateRange = (currentDateRange === range) ? '' : range;
            document.querySelectorAll('.date-shortcut-btn').forEach(b =>
                b.classList.toggle('active', b.dataset.range === currentDateRange));
            if (currentDateRange) {
                if (el.filterFrom) el.filterFrom.value = '';
                if (el.filterTo)   el.filterTo.value   = '';
            }
            currentAppPage = 1;
            fetchAppLogs();
        });
    });
}

function finishLoader() {
    if (el.loaderBar) el.loaderBar.style.width = '100%';
    setText(el.loaderPercentage, '100%');
    setText(el.loaderText, 'Sistem hazır.');

    setTimeout(() => {
        el.loaderOverlay?.classList.add('fade-out');
        setTimeout(() => el.loaderOverlay?.remove(), 300);
    }, 250);
}

function initializeSystem() {
    fetchAppLogs();
}

document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    initializeSystem();
    finishLoader();
});
