document.addEventListener('DOMContentLoaded', () => {
    console.log('HomeOS: Advanced Logging & Monitoring System Initialized.');

    // ══════════════════════════════
    //  DOM ELEMENTLERİ
    // ══════════════════════════════
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loaderPercentage = document.getElementById('loader-percentage');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    // Tab ve Arama
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const archiveBtn = document.getElementById('archive-btn');
    const testCriticalBtn = document.getElementById('test-critical-btn');
    
    // Filtreler
    const filterLogLevel = document.getElementById('filter-log-level');
    const filterEventType = document.getElementById('filter-event-type');
    const filterService = document.getElementById('filter-service');
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const filterArchived = document.getElementById('filter-archived');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');

    // Dashboard Widget Sayaçları
    const dashTotal = document.getElementById('dash-total');
    const dashCritical = document.getElementById('dash-critical');
    const dashError = document.getElementById('dash-error');
    const dashWarning = document.getElementById('dash-warning');
    const dashCrash = document.getElementById('dash-crash');
    const dashRestarts = document.getElementById('dash-restarts');

    // Tablolar
    const logsTableBody = document.getElementById('logs-table-body');
    const devicesTableBody = document.getElementById('devices-table-body');
    const usersTableBody = document.getElementById('users-table-body');
    const commandsTableBody = document.getElementById('commands-table-body');

    // Stack Trace Modal
    const stacktraceModal = document.getElementById('stacktrace-modal');
    const stacktraceContent = document.getElementById('stacktrace-content');
    const closeStacktrace = document.getElementById('close-stacktrace');

    // SignalR Göstergeleri
    const liveDot = document.getElementById('live-dot');
    const liveLabel = document.getElementById('live-label');

    // API Bağlantı Adresi (Dinamik Host Çözümleme)
    const API_BASE = (window.location.protocol === 'file:') ? 'https://localhost:7201/api' : `${window.location.origin}/api`;
    const SIGNALR_HUB_URL = (window.location.protocol === 'file:') ? 'https://localhost:7201/hubs/logs' : `${window.location.origin}/hubs/logs`;

    // Bellekteki veri durumları
    let logsList = [];
    let devicesList = [];
    let usersList = [];
    let commandsList = [];
    
    let currentPage = 1;
    const pageSize = 100;
    const paginationContainer = document.getElementById('logs-pagination');

    // ══════════════════════════════
    //  DİNAMİK YÜKLEME SİMÜLASYONU
    // ══════════════════════════════
    let progress = 0;
    const runLoader = () => {
        const loadInterval = setInterval(() => {
            progress += Math.floor(Math.random() * 8) + 4;
            if (progress >= 100) {
                progress = 100;
                clearInterval(loadInterval);
                terminateLoader();
            }
            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (loaderPercentage) loaderPercentage.textContent = `${progress}%`;
        }, 30);
    };

    const terminateLoader = () => {
        setTimeout(() => {
            if (loaderOverlay) {
                loaderOverlay.classList.add('fade-out');
                loaderOverlay.addEventListener('transitionend', () => {
                    loaderOverlay.remove();
                    // İlk veri çekme işlemini tetikle
                    initializeSystem();
                });
            }
        }, 200);
    };

    runLoader();

    // ══════════════════════════════
    //  SIDEBAR AÇMA / KAPATMA
    // ══════════════════════════════
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            menuToggle.classList.toggle('open');
        });
    }

    // ══════════════════════════════
    //  TAB TOGGLE MEKANİZMASI
    // ══════════════════════════════
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                }
            });

            renderTab(targetTab);
        });
    });

    // ══════════════════════════════
    //  SİSTEMİ BAŞLATMA
    // ══════════════════════════════
    function initializeSystem() {
        fetchDashboardStats();
        fetchLogs();
        fetchDevices();
        fetchUsers();
        fetchCommands();
        initializeSignalR();
    }

    // ══════════════════════════════
    //  API KONTROLLERİ VE VERİ ÇEKME
    // ══════════════════════════════

    // 1. Dashboard istatistiklerini getir
    async function fetchDashboardStats() {
        try {
            const res = await fetch(`${API_BASE}/SystemLogs/dashboard`);
            if (res.ok) {
                const stats = await res.json();
                dashTotal.textContent = stats.totalLogs ?? 0;
                dashCritical.textContent = stats.criticalCount ?? 0;
                dashError.textContent = stats.errorCount ?? 0;
                dashWarning.textContent = stats.warningCount ?? 0;
                dashCrash.textContent = stats.crashCount ?? 0;
                dashRestarts.textContent = stats.todayRestarts ?? 0;
            }
        } catch (err) {
            console.error('Dashboard stats error:', err);
        }
    }

    // 2. Sistem Loglarını Getir
    async function fetchLogs() {
        if (logsTableBody) {
            logsTableBody.innerHTML = '<tr><td colspan="8" class="empty-row"><i class="fas fa-circle-notch fa-spin"></i> Veriler yükleniyor...</td></tr>';
        }
        
        try {
            // Filtre query parametrelerini oluştur
            const params = new URLSearchParams();
            params.append('page', currentPage);
            params.append('pageSize', pageSize);
            
            if (filterLogLevel && filterLogLevel.value) params.append('logLevel', filterLogLevel.value);
            if (filterEventType && filterEventType.value) params.append('eventType', filterEventType.value);
            if (filterService && filterService.value) params.append('serviceName', filterService.value);
            if (filterFrom && filterFrom.value) params.append('from', filterFrom.value);
            if (filterTo && filterTo.value) params.append('to', filterTo.value);
            if (filterArchived) params.append('includeArchived', filterArchived.checked ? 'true' : 'false');
            
            const res = await fetch(`${API_BASE}/SystemLogs?${params.toString()}`);
            if (res.ok) {
                logsList = await res.json();
                populateServiceDropdown(logsList);
                renderLogsTable();
            } else {
                throw new Error("API hatası");
            }
        } catch (err) {
            console.error('Fetch logs error:', err);
            logsTableBody.innerHTML = '<tr><td colspan="8" class="empty-row text-danger"><i class="fas fa-exclamation-triangle"></i> Loglar yüklenemedi. Sunucu bağlantısını kontrol edin.</td></tr>';
        }
    }

    // Servis listesini loglardan toplayarak dropdown'ı doldurur
    function populateServiceDropdown(logs) {
        if (!filterService) return;
        const currentVal = filterService.value;
        const services = new Set();
        logs.forEach(log => {
            if (log.serviceName) services.add(log.serviceName);
        });
        
        filterService.innerHTML = '<option value="">Tüm Servisler</option>';
        Array.from(services).sort().forEach(service => {
            filterService.innerHTML += `<option value="${service}">${service}</option>`;
        });
        filterService.value = currentVal;
    }

    // 3. Cihazları Getir
    async function fetchDevices() {
        try {
            const res = await fetch(`${API_BASE}/Listing`);
            if (res.ok) {
                devicesList = await res.json();
                renderDevicesTable();
            }
        } catch (err) {
            console.error('Fetch devices error:', err);
        }
    }

    // 4. Kullanıcıları Getir
    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/Users`);
            if (res.ok) {
                usersList = await res.json();
                renderUsersTable();
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        }
    }

    // 5. Jarvis Komut Geçmişini Getir
    async function fetchCommands() {
        try {
            const res = await fetch(`${API_BASE}/Commands`);
            if (res.ok) {
                commandsList = await res.json();
                renderCommandsTable();
            }
        } catch (err) {
            console.error('Fetch commands error:', err);
        }
    }

    // ══════════════════════════════
    //  GERÇEK ZAMANLI LOG AKIŞI (SignalR)
    // ══════════════════════════════
    let hubConnection;
    function initializeSignalR() {
        if (typeof signalR === 'undefined') {
            console.warn('SignalR kütüphanesi yüklenemedi.');
            if (liveLabel) liveLabel.textContent = 'Bağlantı Yok';
            return;
        }

        hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(SIGNALR_HUB_URL)
            .withAutomaticReconnect()
            .build();

        hubConnection.on("NewLog", (log) => {
            // Ekrana canlı yeni log ekle
            console.log('[SignalR Live Log]:', log);
            
            // Eğer aktif tab systemlogs ise ve filtreler eşleşiyorsa tabloya en başa ekle
            if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'systemlogs') {
                // Arama ve filtre eşleme kontrolü
                if (matchesCurrentFilters(log)) {
                    logsList.unshift(log);
                    if (logsList.length > pageSize) logsList.pop();
                    renderLogsTable();
                }
            }
            // Dashboard widgetlarını güncelle
            fetchDashboardStats();
        });

        hubConnection.start()
            .then(() => {
                console.log('SignalR connected to LogHub.');
                if (liveDot) liveDot.style.background = '#00FF88';
                if (liveLabel) liveLabel.textContent = 'Canlı Akış Aktif';
                // Abone ol
                hubConnection.invoke("Subscribe").catch(err => console.error(err));
            })
            .catch(err => {
                console.error('SignalR connection failed:', err);
                if (liveDot) liveDot.style.background = '#FF3B30';
                if (liveLabel) liveLabel.textContent = 'Çevrimdışı';
            });

        hubConnection.onclose(() => {
            if (liveDot) liveDot.style.background = '#FF3B30';
            if (liveLabel) liveLabel.textContent = 'Bağlantı Kesildi';
        });
    }

    function matchesCurrentFilters(log) {
        if (filterLogLevel && filterLogLevel.value && log.logLevel !== filterLogLevel.value) return false;
        if (filterEventType && filterEventType.value && log.eventType !== filterEventType.value) return false;
        if (filterService && filterService.value && log.serviceName !== filterService.value) return false;
        return true;
    }

    // ══════════════════════════════
    //  RENDER TABLOLARI
    // ══════════════════════════════

    // 1. Logs Tablosu
    function renderLogsTable() {
        if (!logsTableBody) return;
        logsTableBody.innerHTML = '';

        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const filtered = logsList.filter(log => {
            const msg = (log.message || '').toLowerCase();
            const srv = (log.serviceName || '').toLowerCase();
            return msg.includes(search) || srv.includes(search);
        });

        if (filtered.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="8" class="empty-row">Eşleşen sistem günlüğü bulunamadı.</td></tr>';
            return;
        }

        filtered.forEach((log, index) => {
            const isCriticalOrError = log.logLevel === 'Critical' || log.logLevel === 'Error';
            const trClass = isCriticalOrError ? 'error-row' : '';
            const stackTraceIcon = log.stackTrace ? `<button class="btn-stack" data-index="${index}"><i class="fas fa-bug text-danger"></i> Trace</button>` : '';

            logsTableBody.innerHTML += `
                <tr class="${trClass}">
                    <td class="mono">${log.id ?? (index + 1)}</td>
                    <td><span class="log-badge ${String(log.logLevel).toLowerCase()}">${log.logLevel}</span></td>
                    <td><span class="event-badge">${log.eventType}</span></td>
                    <td><strong>${log.serviceName}</strong></td>
                    <td class="log-msg">${log.message} ${stackTraceIcon}</td>
                    <td class="mono">${log.userId ?? '-'}</td>
                    <td class="mono">${log.ipAddress ?? '-'}</td>
                    <td class="mono">${log.createdAt}</td>
                </tr>
            `;
        });

        // Stack Trace buton olaylarını bağla
        document.querySelectorAll('.btn-stack').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                const log = filtered[idx];
                if (log && log.stackTrace) {
                    showStackTrace(log.message, log.stackTrace);
                }
            });
        });

        renderPagination(filtered.length);
    }

    function renderPagination(totalItems) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        if (totalItems <= pageSize && currentPage === 1) return;

        const totalPages = Math.ceil(totalItems / pageSize) || 1;

        const infoSpan = document.createElement('span');
        infoSpan.className = 'pagination-info';
        infoSpan.textContent = `Sayfa ${currentPage} / ${totalPages}`;
        paginationContainer.appendChild(infoSpan);

        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Geri';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            currentPage--;
            fetchLogs();
        });
        paginationContainer.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = 'İleri <i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => {
            currentPage++;
            fetchLogs();
        });
        paginationContainer.appendChild(nextBtn);
    }

    // 2. Cihazlar Tablosu
    function renderDevicesTable() {
        if (!devicesTableBody) return;
        devicesTableBody.innerHTML = '';

        if (devicesList.length === 0) {
            devicesTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">Sistemde kayıtlı cihaz bulunamadı.</td></tr>';
            return;
        }

        devicesList.forEach(dev => {
            const isOnline = dev.status === true || dev.device_Status === true;
            const badgeClass = isOnline ? 'status-badge online' : 'status-badge offline';
            const badgeText = isOnline ? 'ONLINE' : 'OFFLINE';

            devicesTableBody.innerHTML += `
                <tr>
                    <td class="mono">${dev.id}</td>
                    <td><strong>${dev.name || dev.deviceName}</strong></td>
                    <td>${dev.type || dev.deviceVersion || 'Cihaz'}</td>
                    <td><span class="${badgeClass}">${badgeText}</span></td>
                    <td class="mono">${dev.createdAt || '-'}</td>
                </tr>
            `;
        });
    }

    // 3. Kullanıcılar Tablosu
    function renderUsersTable() {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '';

        if (usersList.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="empty-row">Sistemde kullanıcı kaydı bulunamadı.</td></tr>';
            return;
        }

        usersList.forEach(usr => {
            usersTableBody.innerHTML += `
                <tr>
                    <td class="mono">${usr.id}</td>
                    <td><strong>${usr.username}</strong></td>
                    <td>${usr.email || '-'}</td>
                    <td><span class="role-badge user">${usr.role || 'Uye'}</span></td>
                    <td class="mono">${usr.createdAt || '-'}</td>
                </tr>
            `;
        });
    }

    // 4. Komutlar Tablosu
    function renderCommandsTable() {
        if (!commandsTableBody) return;
        commandsTableBody.innerHTML = '';

        if (commandsList.length === 0) {
            commandsTableBody.innerHTML = '<tr><td colspan="6" class="empty-row">Jarvis komut geçmişi bulunamadı.</td></tr>';
            return;
        }

        commandsList.forEach(cmd => {
            const isSuccess = cmd.status === 'Success' || cmd.status === 'True' || cmd.status === true;
            const badgeClass = isSuccess ? 'status-badge online' : 'status-badge offline';
            const badgeText = isSuccess ? 'Başarılı' : 'Hata';

            commandsTableBody.innerHTML += `
                <tr>
                    <td class="mono">${cmd.id}</td>
                    <td class="mono">${cmd.userId ?? 'Sistem'}</td>
                    <td><strong>"${cmd.commandText}"</strong></td>
                    <td>${cmd.responseText || '-'}</td>
                    <td><span class="${badgeClass}">${badgeText}</span></td>
                    <td class="mono">${cmd.createdAt || '-'}</td>
                </tr>
            `;
        });
    }

    function renderTab(tab) {
        currentPage = 1;
        if (tab === 'systemlogs') fetchLogs();
        if (tab === 'devices') fetchDevices();
        if (tab === 'users') fetchUsers();
        if (tab === 'commands') fetchCommands();
    }

    // ══════════════════════════════
    //  STACK TRACE DIALOG
    // ══════════════════════════════
    function showStackTrace(msg, trace) {
        if (!stacktraceModal || !stacktraceContent) return;
        stacktraceContent.textContent = `Mesaj: ${msg}\n\nStack Trace:\n${trace}`;
        stacktraceModal.classList.add('active');
    }

    if (closeStacktrace) {
        closeStacktrace.addEventListener('click', () => {
            stacktraceModal.classList.remove('active');
        });
    }
    if (stacktraceModal) {
        stacktraceModal.addEventListener('click', (e) => {
            if (e.target === stacktraceModal) stacktraceModal.classList.remove('active');
        });
    }

    // ══════════════════════════════
    //  FİLTRE EYLEMLERİ
    // ══════════════════════════════
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            currentPage = 1;
            fetchLogs();
            fetchDashboardStats();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterLogLevel) filterLogLevel.value = '';
            if (filterEventType) filterEventType.value = '';
            if (filterService) filterService.value = '';
            if (filterFrom) filterFrom.value = '';
            if (filterTo) filterTo.value = '';
            if (filterArchived) filterArchived.checked = false;
            if (searchInput) searchInput.value = '';
            
            currentPage = 1;
            fetchLogs();
            fetchDashboardStats();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.querySelector('i').classList.add('fa-spin');
            initializeSystem();
            setTimeout(() => {
                refreshBtn.querySelector('i').classList.remove('fa-spin');
            }, 800);
        });
    }

    // ══════════════════════════════
    //  ARŞİV VE TEST TETİKLEYİCİLERİ
    // ══════════════════════════════
    if (archiveBtn) {
        archiveBtn.addEventListener('click', async () => {
            if (confirm("10.000'den eski logları arşivlemek istiyor musunuz?")) {
                try {
                    const res = await fetch(`${API_BASE}/SystemLogs/archive`, { method: 'POST' });
                    if (res.ok) {
                        alert("Eski loglar başarıyla arşivlendi.");
                        fetchLogs();
                        fetchDashboardStats();
                    } else {
                        alert("Arşivleme işlemi başarısız.");
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    }

    if (testCriticalBtn) {
        testCriticalBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`${API_BASE}/SystemLogs/test-critical`, { method: 'POST' });
                if (res.ok) {
                    alert("Kritik log tetiklendi. Canlı akışa düşecektir.");
                } else {
                    alert("Kritik log testi tetiklenemedi.");
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});
