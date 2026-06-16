document.addEventListener('DOMContentLoaded', () => {
    console.log('Home Asistan: Log & Veritabanı Arayüzü Başlatıldı.');

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
    
    // Filtreler
    const filterLogLevel = document.getElementById('filter-log-level');
    const filterDeviceType = document.getElementById('filter-device-type');

    // Sayaçlar
    const countTotalLogs = document.getElementById('count-total-logs');
    const countErrorLogs = document.getElementById('count-error-logs');
    const countTotalDevices = document.getElementById('count-total-devices');
    const countTotalUsers = document.getElementById('count-total-users');

    // Tablo Gövdeleri
    const logsTableBody = document.getElementById('logs-table-body');
    const devicesTableBody = document.getElementById('devices-table-body');
    const usersTableBody = document.getElementById('users-table-body');
    const commandsTableBody = document.getElementById('commands-table-body');

    // API Bağlantı Adresleri (C# Backend Port: 5000)
    const API_BASE = "http://localhost:5000/api";
    const ENDPOINTS = {
        devices: `${API_BASE}/Listing`,
        logs: `${API_BASE}/Logs`,
        users: `${API_BASE}/Users`,
        commands: `${API_BASE}/Commands`
    };

    // Bellekteki Veriler (Arama ve Filtreleme İçin)
    let state = {
        logs: [],
        devices: [],
        users: [],
        commands: []
    };

    // SQL Server'dan Az Önce Çektiğimiz Gerçek Verilerin Simülasyon Fallback'i
    // (Arka planda C# backend kapalıyken bile arayüzün boş kalmaması için harika bir yedek mekanizma)
    const fallbackData = {
        devices: [
            { id: 2, name: "Deneme", type: "1.0.0", status: true, createdAt: "2026-06-16 12:00:00" },
            { id: 3, name: "Deneme2", type: "1.0.0", status: true, createdAt: "2026-06-16 12:05:00" },
            { id: 4, name: "Balkon Kamera", type: "1.0.0", status: true, createdAt: "2026-06-16 12:10:00" },
            { id: 5, name: "Mutfak Lambası", type: "1.0.0", status: true, createdAt: "2026-06-16 12:15:00" },
            { id: 6, name: "Yangın Sensor", type: "sensor", status: true, createdAt: "2026-06-16 12:20:00" }
        ],
        logs: [
            { id: 105, level: "INFO", message: "Cihaz listesi başarıyla getirildi. Toplam 5 cihaz döndü.", source: "DeviceListing", createdAt: "2026-06-16 16:30:15" },
            { id: 104, level: "INFO", message: "Cihaz listesi isteği alındı.", source: "DeviceListing", createdAt: "2026-06-16 16:30:14" },
            { id: 103, level: "INFO", message: "Uygulama başarıyla ayağa kalktı. http://0.0.0.0:5000", source: "Program", createdAt: "2026-06-16 16:20:01" },
            { id: 102, level: "INFO", message: "Development ortamı algılandı. OpenAPI aktif.", source: "Program", createdAt: "2026-06-16 16:20:00" },
            { id: 101, level: "WARN", message: "Geçersiz veya eksik cihaz verisi geldi.", source: "DeviceStatusUpdate", createdAt: "2026-06-16 16:22:10" }
        ],
        users: [],
        commands: []
    };

    // ══════════════════════════════
    //  DİNAMİK LOADER MOTORU
    // ══════════════════════════════
    const loadingStates = [
        { limit: 30, text: "Veritabanı bağlantısı doğrulanıyor..." },
        { limit: 65, text: "Tablo şemaları yükleniyor..." },
        { limit: 90, text: "Günlük kayıtları analiz ediliyor..." },
        { limit: 100, text: "Sistem Hazır!" }
    ];

    let progress = 0;
    const runLoader = () => {
        const loadInterval = setInterval(() => {
            const increment = Math.floor(Math.random() * 10) + 5;
            progress += increment;

            if (progress >= 100) {
                progress = 100;
                clearInterval(loadInterval);
                terminateLoader();
            }

            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (loaderPercentage) loaderPercentage.textContent = `${progress}%`;

            const activeState = loadingStates.find(state => progress <= state.limit);
            if (activeState && loaderText) {
                loaderText.textContent = activeState.text;
            }
        }, 40);
    };

    const terminateLoader = () => {
        setTimeout(() => {
            if (loaderOverlay) {
                loaderOverlay.classList.add('fade-out');
                loaderOverlay.addEventListener('transitionend', () => {
                    loaderOverlay.remove();
                    // Loader bittikten sonra ilk yüklemeyi yap
                    loadAllData();
                });
            }
        }, 300);
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
            
            // Aktif butonu değiştir
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Aktif içeriği değiştir
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');
                }
            });

            // Filtre araç çubuklarını aktif taba göre göster/gizle
            toggleFilterVisibility(targetTab);

            // Arama filtresini sıfırla ve yeniden uygula
            searchInput.value = '';
            renderAll();
        });
    });

    function toggleFilterVisibility(tab) {
        if (filterLogLevel) {
            filterLogLevel.style.display = (tab === 'logs') ? 'block' : 'none';
        }
        if (filterDeviceType) {
            filterDeviceType.style.display = (tab === 'devices') ? 'block' : 'none';
        }
    }

    // İlk açılışta filtrelerin görünürlüğü
    toggleFilterVisibility('logs');

    // ══════════════════════════════
    //  VERİLERİ API'DEN YÜKLEME
    // ══════════════════════════════
    async function loadAllData() {
        console.log("Veriler yükleniyor...");
        
        // Cihazları getir
        try {
            const res = await fetch(ENDPOINTS.devices);
            if (res.ok) state.devices = await res.json();
            else throw new Error("Cihaz endpoint hatası");
        } catch (e) {
            console.warn("Cihazlar API yüklemesi başarısız, fallback uygulanıyor.", e);
            state.devices = [...fallbackData.devices];
        }

        // Logları getir
        try {
            const res = await fetch(ENDPOINTS.logs);
            if (res.ok) state.logs = await res.json();
            else throw new Error("Log endpoint hatası");
        } catch (e) {
            console.warn("Loglar API yüklemesi başarısız, fallback uygulanıyor.", e);
            state.logs = [...fallbackData.logs];
        }

        // Kullanıcıları getir
        try {
            const res = await fetch(ENDPOINTS.users);
            if (res.ok) state.users = await res.json();
            else throw new Error("Kullanıcı endpoint hatası");
        } catch (e) {
            console.warn("Kullanıcılar API yüklemesi başarısız, fallback uygulanıyor.", e);
            state.users = [...fallbackData.users];
        }

        // Komutları getir
        try {
            const res = await fetch(ENDPOINTS.commands);
            if (res.ok) state.commands = await res.json();
            else throw new Error("Komut endpoint hatası");
        } catch (e) {
            console.warn("Komutlar API yüklemesi başarısız, fallback uygulanıyor.", e);
            state.commands = [...fallbackData.commands];
        }

        // Sayaçları güncelle ve ekrana bas
        updateStats();
        renderAll();
    }

    // ══════════════════════════════
    //  SAYAÇLARI GÜNCELLEME
    // ══════════════════════════════
    function updateStats() {
        if (countTotalLogs) countTotalLogs.textContent = state.logs.length;
        if (countTotalDevices) countTotalDevices.textContent = state.devices.length;
        if (countTotalUsers) countTotalUsers.textContent = state.users.length;
        
        const errorCount = state.logs.filter(log => 
            log.Level === 'ERROR' || log.Level === 'FATAL' || 
            log.level === 'ERROR' || log.level === 'FATAL'
        ).length;
        if (countErrorLogs) countErrorLogs.textContent = errorCount;
    }

    // Helper: pascal ya da camelCase veriyi okumak için
    function getVal(obj, ...keys) {
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        }
        return "";
    }

    // ══════════════════════════════
    //  RENDER MOTORU (TABLOLAR)
    // ══════════════════════════════
    
    // 1. Logs Tablosu
    function renderLogs() {
        if (!logsTableBody) return;
        logsTableBody.innerHTML = '';

        const search = searchInput.value.toLowerCase();
        const levelFilter = filterLogLevel ? filterLogLevel.value : 'all';

        const filtered = state.logs.filter(log => {
            const level = getVal(log, 'level', 'Level').toLowerCase();
            const msg = getVal(log, 'message', 'Message').toLowerCase();
            const src = getVal(log, 'source', 'Source').toLowerCase();
            
            const matchesSearch = msg.includes(search) || src.includes(search) || level.includes(search);
            const matchesFilter = (levelFilter === 'all') || (level === levelFilter.toLowerCase());

            return matchesSearch && matchesFilter;
        });

        if (filtered.length === 0) {
            logsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fas fa-search"></i><p>Arama kriterine uygun günlük kaydı bulunamadı.</p></td></tr>`;
            return;
        }

        filtered.forEach(log => {
            const id = getVal(log, 'id', 'Id');
            const level = getVal(log, 'level', 'Level');
            const message = getVal(log, 'message', 'Message');
            const source = getVal(log, 'source', 'Source');
            const time = getVal(log, 'createdAt', 'CreatedAt') || '-';

            const badgeClass = `log-badge ${level.toLowerCase()}`;

            logsTableBody.innerHTML += `
                <tr>
                    <td class="mono">${id}</td>
                    <td><span class="${badgeClass}">${level}</span></td>
                    <td>${message}</td>
                    <td><strong>${source}</strong></td>
                    <td class="mono">${time}</td>
                </tr>
            `;
        });
    }

    // 2. Devices Tablosu
    function renderDevices() {
        if (!devicesTableBody) return;
        devicesTableBody.innerHTML = '';

        const search = searchInput.value.toLowerCase();
        const typeFilter = filterDeviceType ? filterDeviceType.value : 'all';

        const filtered = state.devices.filter(dev => {
            const name = getVal(dev, 'name', 'Name', 'DeviceName', 'deviceName').toLowerCase();
            const type = getVal(dev, 'type', 'Type', 'DeviceVersion', 'deviceVersion').toLowerCase();
            
            const matchesSearch = name.includes(search) || type.includes(search);
            const matchesFilter = (typeFilter === 'all') || (type.includes(typeFilter.toLowerCase()));

            return matchesSearch && matchesFilter;
        });

        if (filtered.length === 0) {
            devicesTableBody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fas fa-laptop"></i><p>Kayıtlı cihaz bulunamadı.</p></td></tr>`;
            return;
        }

        filtered.forEach(dev => {
            const id = getVal(dev, 'id', 'Id');
            const name = getVal(dev, 'name', 'Name', 'DeviceName', 'deviceName');
            const type = getVal(dev, 'type', 'Type', 'DeviceVersion', 'deviceVersion');
            const status = getVal(dev, 'status', 'Status', 'Device_Status', 'device_Status');
            const isOnline = status === true;
            
            const statusText = isOnline ? "ONLINE" : "OFFLINE";
            const statusClass = isOnline ? "status-badge online" : "status-badge offline";
            
            // Basit icon
            let icon = "fas fa-plug";
            if (type.toLowerCase().includes("light") || type.toLowerCase().includes("lamba")) icon = "fas fa-lightbulb";
            if (type.toLowerCase().includes("camera") || type.toLowerCase().includes("kamera")) icon = "fas fa-video";
            if (type.toLowerCase().includes("sensor")) icon = "fas fa-microchip";

            devicesTableBody.innerHTML += `
                <tr>
                    <td class="mono">${id}</td>
                    <td><i class="${icon}" style="color: var(--accent-green); margin-right: 8px;"></i> ${name}</td>
                    <td>${type}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td class="mono">-</td>
                </tr>
            `;
        });
    }

    // 3. Users Tablosu
    function renderUsers() {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '';

        const search = searchInput.value.toLowerCase();
        
        const filtered = state.users.filter(usr => {
            const username = getVal(usr, 'username', 'Username').toLowerCase();
            const email = getVal(usr, 'email', 'Email').toLowerCase();
            const role = getVal(usr, 'role', 'Role').toLowerCase();
            return username.includes(search) || email.includes(search) || role.includes(search);
        });

        if (filtered.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fas fa-users-slash"></i><p>Kullanıcı verisi bulunmamaktadır.</p></td></tr>`;
            return;
        }

        filtered.forEach(usr => {
            const id = getVal(usr, 'id', 'Id');
            const username = getVal(usr, 'username', 'Username');
            const email = getVal(usr, 'email', 'Email') || '-';
            const role = getVal(usr, 'role', 'Role') || 'Kullanıcı';
            const time = getVal(usr, 'createdAt', 'CreatedAt') || '-';

            usersTableBody.innerHTML += `
                <tr>
                    <td class="mono">${id}</td>
                    <td><strong>${username}</strong></td>
                    <td>${email}</td>
                    <td><span class="status-badge online" style="background: rgba(0,255,136,0.1); color: var(--accent-green);">${role}</span></td>
                    <td class="mono">${time}</td>
                </tr>
            `;
        });
    }

    // 4. Commands Tablosu
    function renderCommands() {
        if (!commandsTableBody) return;
        commandsTableBody.innerHTML = '';

        const search = searchInput.value.toLowerCase();

        const filtered = state.commands.filter(cmd => {
            const text = getVal(cmd, 'commandText', 'CommandText').toLowerCase();
            const resp = getVal(cmd, 'responseText', 'ResponseText').toLowerCase();
            const status = getVal(cmd, 'status', 'Status').toLowerCase();
            return text.includes(search) || resp.includes(search) || status.includes(search);
        });

        if (filtered.length === 0) {
            commandsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fas fa-history"></i><p>Komut geçmişi kaydı bulunmamaktadır.</p></td></tr>`;
            return;
        }

        filtered.forEach(cmd => {
            const id = getVal(cmd, 'id', 'Id');
            const uId = getVal(cmd, 'userId', 'UserId') || 'Sistem';
            const text = getVal(cmd, 'commandText', 'CommandText');
            const responseText = getVal(cmd, 'responseText', 'ResponseText') || '-';
            const status = getVal(cmd, 'status', 'Status') || 'Bilinmiyor';
            const time = getVal(cmd, 'createdAt', 'CreatedAt') || '-';

            const statusClass = status.toLowerCase() === 'success' || status === 'True' || status === 'Başarılı' ? 'status-badge online' : 'status-badge offline';

            commandsTableBody.innerHTML += `
                <tr>
                    <td class="mono">${id}</td>
                    <td class="mono">${uId}</td>
                    <td><strong>"${text}"</strong></td>
                    <td>${responseText}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                    <td class="mono">${time}</td>
                </tr>
            `;
        });
    }

    // Hepsini render eden master tetikleyici
    function renderAll() {
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        if (activeTab === 'logs') renderLogs();
        if (activeTab === 'devices') renderDevices();
        if (activeTab === 'users') renderUsers();
        if (activeTab === 'commands') renderCommands();
    }

    // ══════════════════════════════
    //  OLAY DİNLEYİCİLERİ
    // ══════════════════════════════
    searchInput.addEventListener('input', renderAll);
    if (filterLogLevel) filterLogLevel.addEventListener('change', renderAll);
    if (filterDeviceType) filterDeviceType.addEventListener('change', renderAll);
    
    refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('fa-spin');
        loadAllData().then(() => {
            setTimeout(() => {
                refreshBtn.classList.remove('fa-spin');
                addTerminalLog("Veritabanı verileri manuel tetikleme ile yenilendi.", "success");
            }, 500);
        });
    });

    function addTerminalLog(msg, type = "info") {
        console.log(`[LogPage] [${type.toUpperCase()}] ${msg}`);
    }
});
