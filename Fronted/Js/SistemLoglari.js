const API_BASE = getApiBaseUrl();
const HUB_BASE = API_BASE.replace(/\/api$/i, '');

let logsList = [];
let currentPage = 1;
let pageSize = 50;
let totalPages = 1;
let totalRecords = 0;
let currentDateRange = '';
let signalRConnection = null;

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
    dashTotal: document.getElementById('dash-total'),
    dashCritical: document.getElementById('dash-critical'),
    dashError: document.getElementById('dash-error'),
    dashWarning: document.getElementById('dash-warning'),
    dashCrash: document.getElementById('dash-crash'),
    dashRestarts: document.getElementById('dash-restarts'),
    logsTableBody: document.getElementById('logs-table-body'),
    logsPagination: document.getElementById('logs-pagination'),
    devicesTableBody: document.getElementById('devices-table-body'),
    usersTableBody: document.getElementById('users-table-body'),
    commandsTableBody: document.getElementById('commands-table-body'),
    filterLogLevel: document.getElementById('filter-log-level'),
    filterEventType: document.getElementById('filter-event-type'),
    filterService: document.getElementById('filter-service'),
    filterFrom: document.getElementById('filter-from'),
    filterTo: document.getElementById('filter-to'),
    filterArchived: document.getElementById('filter-archived'),
    searchInput: document.getElementById('search-input'),
    liveDot: document.getElementById('live-dot'),
    liveLabel: document.getElementById('live-label'),
    loaderOverlay: document.getElementById('loader-overlay'),
    loaderBar: document.getElementById('loader-bar'),
    loaderText: document.getElementById('loader-text'),
    loaderPercentage: document.getElementById('loader-percentage'),
    stackTraceModal: document.getElementById('stacktrace-modal'),
    stackTraceContent: document.getElementById('stacktrace-content')
};

function setText(node, value) {
    if (node) node.textContent = value ?? '';
}

function normalizeLog(log) {
    return {
        id: log.id ?? log.Id ?? 0,
        eventId: log.eventId ?? log.EventId ?? '',
        serviceName: log.serviceName ?? log.ServiceName ?? '',
        eventType: log.eventType ?? log.EventType ?? '',
        logLevel: log.logLevel ?? log.LogLevel ?? log.level ?? log.Level ?? 'Information',
        message: log.message ?? log.Message ?? '',
        stackTrace: log.stackTrace ?? log.StackTrace ?? '',
        userId: log.userId ?? log.UserId ?? '',
        userName: log.userName ?? log.UserName ?? '',
        ipAddress: log.ipAddress ?? log.IpAddress ?? '',
        createdAt: log.createdAt ?? log.CreatedAt ?? ''
    };
}

async function fetchDashboardStats() {
    try {
        const stats = await fetchJson(`${API_BASE}/systemlogs/dashboard`);
        setText(el.dashTotal, stats.totalLogs ?? stats.TotalLogs ?? 0);
        setText(el.dashCritical, stats.criticalCount ?? stats.CriticalCount ?? 0);
        setText(el.dashError, stats.errorCount ?? stats.ErrorCount ?? 0);
        setText(el.dashWarning, stats.warningCount ?? stats.WarningCount ?? 0);
        setText(el.dashCrash, stats.crashCount ?? stats.CrashCount ?? 0);
        setText(el.dashRestarts, stats.todayRestarts ?? stats.TodayRestarts ?? 0);
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

async function fetchSystemLogs() {
    if (!el.logsTableBody) return;
    setTableLoading(el.logsTableBody, 8);
    try {
        const params = new URLSearchParams({
            page: String(currentPage),
            pageSize: String(pageSize)
        });

        const searchVal = (el.searchInput?.value || '').trim();
        if (searchVal) params.append('search', searchVal);
        if (el.filterLogLevel?.value) params.append('logLevel', el.filterLogLevel.value);
        if (el.filterEventType?.value) params.append('eventType', el.filterEventType.value);
        if (el.filterService?.value) params.append('serviceName', el.filterService.value);
        if (el.filterFrom?.value) params.append('from', el.filterFrom.value);
        if (el.filterTo?.value) params.append('to', el.filterTo.value);
        if (el.filterArchived?.checked) params.append('includeArchived', 'true');
        if (currentDateRange) params.append('dateRange', currentDateRange);

        const result = await fetchJson(`${API_BASE}/systemlogs?${params.toString()}`);
        const items = Array.isArray(result) ? result : result.items ?? result.Items ?? [];
        logsList  = items.map(normalizeLog);
        totalPages   = Math.max(1, result.totalPages   ?? result.TotalPages   ?? 1);
        totalRecords = result.total ?? result.Total ?? result.totalRecords ?? result.TotalRecords ?? 0;

        populateServiceFilter(logsList);
        renderLogsTable();
        renderPagination();
    } catch (err) {
        console.error('System logs fetch error:', err);
        renderTableError(el.logsTableBody, 8, 'Sistem logları yüklenemedi. Sunucu bağlantısını kontrol edin.');
    }
}

async function fetchDevices() {
    if (!el.devicesTableBody) return;
    setTableLoading(el.devicesTableBody, 5);
    try {
        const devices = await fetchJson(`${API_BASE}/Listing`);
        renderDevices(Array.isArray(devices) ? devices : []);
    } catch (err) {
        console.error('Devices fetch error:', err);
        renderTableError(el.devicesTableBody, 5, 'Cihazlar yüklenemedi.');
    }
}

async function fetchUsers() {
    if (!el.usersTableBody) return;
    setTableLoading(el.usersTableBody, 5);
    try {
        const users = await fetchJson(`${API_BASE}/Users`);
        renderUsers(Array.isArray(users) ? users : []);
    } catch (err) {
        console.error('Users fetch error:', err);
        renderTableError(el.usersTableBody, 5, 'Kullanıcılar yüklenemedi.');
    }
}

async function fetchCommands() {
    if (!el.commandsTableBody) return;
    setTableLoading(el.commandsTableBody, 6);
    try {
        const commands = await fetchJson(`${API_BASE}/Commands`);
        renderCommands(Array.isArray(commands) ? commands : []);
    } catch (err) {
        console.error('Commands fetch error:', err);
        renderTableError(el.commandsTableBody, 6, 'Komut geçmişi yüklenemedi.');
    }
}

function renderTableMessage(tbody, colspan, message) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-row">${escapeHtml(message)}</td></tr>`;
}

function renderLogsTable() {
    if (!el.logsTableBody) return;

    if (logsList.length === 0) {
        renderTableMessage(el.logsTableBody, 8, 'Kayıt bulunamadı.');
        return;
    }

    el.logsTableBody.innerHTML = logsList.map(log => `
        <tr>
            <td>${log.id}</td>
            <td><span class="level-badge ${getLevelClass(log.logLevel)}">${escapeHtml(log.logLevel)}</span></td>
            <td>${escapeHtml(log.eventType)}</td>
            <td>${escapeHtml(log.serviceName)}</td>
            <td>
                <button class="message-link" data-stack="${escapeAttribute(log.stackTrace)}">${escapeHtml(log.message)}</button>
            </td>
            <td>${escapeHtml(log.userName || log.userId || '-')}</td>
            <td>${escapeHtml(log.ipAddress || '-')}</td>
            <td>${formatDate(log.createdAt)}</td>
        </tr>
    `).join('');

    el.logsTableBody.querySelectorAll('.message-link').forEach(button => {
        button.addEventListener('click', () => showStackTrace(button.dataset.stack || 'Stack trace yok.'));
    });
}

function renderDevices(devices) {
    if (!el.devicesTableBody) return;
    if (devices.length === 0) {
        renderTableMessage(el.devicesTableBody, 5, 'Cihaz bulunamadı.');
        return;
    }

    el.devicesTableBody.innerHTML = devices.map(device => `
        <tr>
            <td>${device.id ?? device.Id ?? '-'}</td>
            <td>${escapeHtml(device.name ?? device.Name ?? device.deviceName ?? '-')}</td>
            <td>${escapeHtml(device.type ?? device.Type ?? device.deviceVersion ?? '-')}</td>
            <td>${formatStatus(device.status ?? device.Status)}</td>
            <td>${formatDate(device.lastUpdated ?? device.LastUpdated ?? device.createdAt ?? device.CreatedAt)}</td>
        </tr>
    `).join('');
}

function renderUsers(users) {
    if (!el.usersTableBody) return;
    if (users.length === 0) {
        renderTableMessage(el.usersTableBody, 5, 'Kullanıcı bulunamadı.');
        return;
    }

    el.usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id ?? user.Id ?? '-'}</td>
            <td>${escapeHtml(user.username ?? user.Username ?? '-')}</td>
            <td>${escapeHtml(user.email ?? user.Email ?? '-')}</td>
            <td>${escapeHtml(user.role ?? user.Role ?? '-')}</td>
            <td>${formatDate(user.createdAt ?? user.CreatedAt)}</td>
        </tr>
    `).join('');
}

function renderCommands(commands) {
    if (!el.commandsTableBody) return;
    if (commands.length === 0) {
        renderTableMessage(el.commandsTableBody, 6, 'Komut kaydı bulunamadı.');
        return;
    }

    el.commandsTableBody.innerHTML = commands.map(command => `
        <tr>
            <td>${command.id ?? command.Id ?? '-'}</td>
            <td>${command.userId ?? command.UserId ?? '-'}</td>
            <td>${escapeHtml(command.commandText ?? command.CommandText ?? command.command ?? command.Command ?? '-')}</td>
            <td>${escapeHtml(command.response ?? command.Response ?? '-')}</td>
            <td>${escapeHtml(command.status ?? command.Status ?? '-')}</td>
            <td>${formatDate(command.createdAt ?? command.CreatedAt)}</td>
        </tr>
    `).join('');
}

function renderPagination() {
    if (!el.logsPagination) return;

    el.logsPagination.innerHTML = `
        <span class="pagination-info">
            Toplam <strong>${totalRecords.toLocaleString('tr-TR')}</strong> kayıt
            &nbsp;·&nbsp;
            Sayfa <strong>${currentPage}</strong> / <strong>${totalPages}</strong>
        </span>
        <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="1" title="İlk Sayfa">
            <i class="fas fa-angle-double-left"></i>
        </button>
        <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}" title="Önceki">
            <i class="fas fa-angle-left"></i> Önceki
        </button>
        <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}" title="Sonraki">
            Sonraki <i class="fas fa-angle-right"></i>
        </button>
        <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${totalPages}" title="Son Sayfa">
            <i class="fas fa-angle-double-right"></i>
        </button>
    `;

    el.logsPagination.querySelectorAll('.pagination-btn:not([disabled])').forEach(button => {
        button.addEventListener('click', () => {
            currentPage = Math.max(1, Math.min(totalPages, Number(button.dataset.page || '1')));
            fetchSystemLogs();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
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

function populateServiceFilter(logs) {
    if (!el.filterService) return;
    const current = el.filterService.value;
    const services = [...new Set(logs.map(log => log.serviceName).filter(Boolean))].sort();

    el.filterService.innerHTML = '<option value="">Tüm Servisler</option>' +
        services.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    el.filterService.value = current;
}

function initializeSignalR() {
    if (typeof signalR === 'undefined') return;
    signalRConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${HUB_BASE}/hubs/logs`)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    const onLog = log => {
        const normalized = normalizeLog(log);
        logsList.unshift(normalized);
        logsList = logsList.slice(0, pageSize);
        renderLogsTable();
        fetchDashboardStats();
    };

    signalRConnection.on('SystemLogCreated', onLog);
    signalRConnection.on('NewLog', onLog);

    signalRConnection.onreconnecting(() => updateLiveState(false, 'Yeniden bağlanıyor...'));
    signalRConnection.onreconnected(async () => {
        updateLiveState(true, 'Canlı');
        await signalRConnection.invoke('Subscribe');
    });
    signalRConnection.onclose(() => updateLiveState(false, 'Bağlantı kapandı'));

    signalRConnection.start()
        .then(async () => {
            await signalRConnection.invoke('Subscribe');
            updateLiveState(true, 'Canlı');
        })
        .catch(err => {
            console.error('SignalR connection error:', err);
            updateLiveState(false, 'Bağlantı yok');
        });
}

function updateLiveState(connected, label) {
    if (el.liveDot) el.liveDot.classList.toggle('active', connected);
    setText(el.liveLabel, label);
}

function showStackTrace(stackTrace) {
    if (!el.stackTraceModal || !el.stackTraceContent) return;
    el.stackTraceContent.textContent = stackTrace || 'Stack trace yok.';
    el.stackTraceModal.classList.add('active');
}

function closeStackTrace() {
    if (el.stackTraceModal) el.stackTraceModal.classList.remove('active');
}

function formatStatus(status) {
    const online = status === true || status === 1 || status === '1' || String(status).toLowerCase() === 'online';
    return `<span class="status-badge ${online ? 'online' : 'offline'}">${online ? 'Aktif' : 'Pasif'}</span>`;
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

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('\n', '&#10;').replaceAll('\r', '');
}

function setupEvents() {
    document.getElementById('refresh-btn')?.addEventListener('click', initializeSystem);
    document.getElementById('apply-filters-btn')?.addEventListener('click', () => {
        currentPage = 1;
        fetchSystemLogs();
    });
    document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
        [el.filterLogLevel, el.filterEventType, el.filterService, el.filterFrom, el.filterTo].forEach(input => {
            if (input) input.value = '';
        });
        if (el.filterArchived) el.filterArchived.checked = false;
        if (el.searchInput) el.searchInput.value = '';
        currentDateRange = '';
        document.querySelectorAll('.date-shortcut-btn').forEach(b => b.classList.remove('active'));
        currentPage = 1;
        fetchSystemLogs();
    });
    document.getElementById('archive-btn')?.addEventListener('click', async () => {
        await fetchJson(`${API_BASE}/systemlogs/archive`, { method: 'POST' });
        await fetchSystemLogs();
        await fetchDashboardStats();
    });
    document.getElementById('test-critical-btn')?.addEventListener('click', async () => {
        await fetchJson(`${API_BASE}/systemlogs/test-critical`, { method: 'POST' });
        await fetchSystemLogs();
        await fetchDashboardStats();
    });
    document.getElementById('close-stacktrace')?.addEventListener('click', closeStackTrace);
    el.stackTraceModal?.addEventListener('click', event => {
        if (event.target === el.stackTraceModal) closeStackTrace();
    });

    let _searchTimer = null;
    el.searchInput?.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
            currentPage = 1;
            fetchSystemLogs();
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
            currentPage = 1;
            fetchSystemLogs();
        });
    });

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn === button));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `${tab}-tab`);
            });
            if (tab === 'systemlogs') {
                fetchSystemLogs();
            } else if (tab === 'devices') {
                fetchDevices();
            } else if (tab === 'users') {
                fetchUsers();
            } else if (tab === 'commands') {
                fetchCommands();
            }
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
    fetchDashboardStats();
    fetchSystemLogs();
    fetchDevices();
    fetchUsers();
    fetchCommands();
}

document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    initializeSystem();
    initializeSignalR();
    finishLoader();
});
