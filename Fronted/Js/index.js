document.addEventListener('DOMContentLoaded', () => {
    console.log('Home Asistan: Ana Kontrol Paneli Başlatıldı.');

    // ══════════════════════════════
    //  DOM ELEMENTLERİNİ ÖNBELLEĞE AL
    // ══════════════════════════════
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loaderPercentage = document.getElementById('loader-percentage');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const logContainer = document.getElementById("logs");
    const authActionBtn = document.getElementById('authActionBtn');
    const sidebarNav = sidebar?.querySelector('nav');

    function getLoginState() {
        return localStorage.getItem('homeasistan_login_state') || sessionStorage.getItem('homeasistan_login_state');
    }

    function isLoggedIn() {
        return Boolean(getLoginState());
    }

    function applyAuthUi() {
        const loggedIn = isLoggedIn();

        if (sidebarNav) {
            sidebarNav.hidden = !loggedIn;
        }

        if (menuToggle) {
            menuToggle.hidden = !loggedIn;
            menuToggle.setAttribute('aria-hidden', String(!loggedIn));
        }

        if (sidebar) {
            sidebar.classList.toggle('collapsed', !loggedIn);
        }

        if (authActionBtn) {
            const icon = authActionBtn.querySelector('i');
            const text = authActionBtn.querySelector('span');
            if (text) text.textContent = loggedIn ? '\u00C7\u0131k\u0131\u015F Yap' : 'Giri\u015F Yap';
            if (icon) {
                icon.className = loggedIn ? 'fas fa-sign-out-alt' : 'fas fa-sign-in-alt';
            }
            authActionBtn.setAttribute('aria-label', loggedIn ? '\u00C7\u0131k\u0131\u015F Yap' : 'Giri\u015F Yap');
        }
    }

    if (authActionBtn) {
        authActionBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                localStorage.removeItem('homeasistan_login_state');
                sessionStorage.removeItem('homeasistan_login_state');
                applyAuthUi();
                return;
            }

            window.location.href = '/Fronted/Pages/Login.html';
        });
    }

    applyAuthUi();

    // ══════════════════════════════
    //  KAYNAK ÇUBUKLARI GÜNCELLEME
    // ══════════════════════════════
    const cpuBar = document.getElementById("cpuBar");
    const cpuText = document.getElementById("cpuText");
    const ramBar = document.getElementById("ramBar");
    const ramText = document.getElementById("ramText");
    const diskText = document.getElementById("diskText");
    const diskFill = document.querySelector(".fill.disk");

    function updateResources() {
        const cpuVal = Math.floor(Math.random() * 20) + 15; // 15% - 35%
        const ramVal = Math.floor(Math.random() * 10) + 45; // 45% - 55%
        const diskVal = 61; // sabit

        if (cpuBar) cpuBar.style.width = cpuVal + "%";
        if (cpuText) cpuText.textContent = cpuVal + "%";
        
        if (ramBar) ramBar.style.width = ramVal + "%";
        if (ramText) ramText.textContent = ramVal + "%";

        if (diskFill) diskFill.style.width = diskVal + "%";
        if (diskText) diskText.textContent = diskVal + "%";
    }

    // ══════════════════════════════
    //  SİSTEM SAĞLIK & BULUT BAĞLANTI DURUMU DİNAMİK KONTROLÜ
    // ══════════════════════════════
    async function checkServices() {
        let activeCount = 0;
        const totalServices = 6;

        // 1. Backend Servisi (C# API on Port 7201)
        let backendOk = false;
        try {
            const backendUrl = (window.location.protocol === 'file:') ? 'https://localhost:7201/api/Listing' : `${window.location.origin}/api/Listing`;
            const res = await fetch(backendUrl);
            backendOk = res.ok;
        } catch (e) {
            backendOk = false;
        }

        const badgeBackend = document.getElementById("badge-backend");
        if (badgeBackend) {
            if (backendOk) {
                badgeBackend.textContent = "Çalışıyor";
                badgeBackend.className = "badge success";
                activeCount++;
            } else {
                badgeBackend.textContent = "Çevrimdışı";
                badgeBackend.className = "badge danger";
            }
        }

        // 2. Jarvis Çekirdeği (Python API on Port 8082)
        let jarvisOk = false;
        try {
            const res = await fetch("http://localhost:8082/");
            jarvisOk = res.ok || res.status === 404;
        } catch (e) {
            jarvisOk = false;
        }

        const badgeJarvis = document.getElementById("badge-jarvis");
        if (badgeJarvis) {
            if (jarvisOk) {
                badgeJarvis.textContent = "Çalışıyor";
                badgeJarvis.className = "badge success";
                activeCount++;
            } else {
                badgeJarvis.textContent = "Çevrimdışı";
                badgeJarvis.className = "badge danger";
            }
        }

        // 3. Watchdog (Jarvis durumunu takip eder)
        const badgeWatchdog = document.getElementById("badge-watchdog");
        if (badgeWatchdog) {
            if (jarvisOk) {
                badgeWatchdog.textContent = "Çalışıyor";
                badgeWatchdog.className = "badge success";
                activeCount++;
            } else {
                badgeWatchdog.textContent = "Durduruldu";
                badgeWatchdog.className = "badge danger";
            }
        }

        // 4. SignalR (Backend durumunu takip eder)
        const badgeSignalr = document.getElementById("badge-signalr");
        if (badgeSignalr) {
            if (backendOk) {
                badgeSignalr.textContent = "Bağlı";
                badgeSignalr.className = "badge success";
                activeCount++;
            } else {
                badgeSignalr.textContent = "Bağlantı Yok";
                badgeSignalr.className = "badge danger";
            }
        }

        // 5. Veritabanı (Backend durumunu takip eder)
        const badgeDatabase = document.getElementById("badge-database");
        if (badgeDatabase) {
            if (backendOk) {
                badgeDatabase.textContent = "Bağlı";
                badgeDatabase.className = "badge success";
                activeCount++;
            } else {
                badgeDatabase.textContent = "Bağlantı Yok";
                badgeDatabase.className = "badge danger";
            }
        }

        // 6. MQTT (Backend durumunu takip eder)
        const badgeMqtt = document.getElementById("badge-mqtt");
        if (badgeMqtt) {
            if (backendOk) {
                badgeMqtt.textContent = "Bağlı";
                badgeMqtt.className = "badge success";
                activeCount++;
            } else {
                badgeMqtt.textContent = "Bağlantı Yok";
                badgeMqtt.className = "badge danger";
            }
        }

        // Yüzde hesaplama
        const percentage = Math.round((activeCount / totalServices) * 100);

        // Arayüzdeki üst durum göstergesini güncelleme
        const systemStatusEl = document.getElementById("system-status-indicator");
        if (systemStatusEl) {
            systemStatusEl.textContent = `Sistem Durumu %${percentage}`;
            if (percentage === 100) {
                systemStatusEl.style.color = "var(--accent-green)";
            } else if (percentage >= 50) {
                systemStatusEl.style.color = "var(--color-warn)";
            } else {
                systemStatusEl.style.color = "var(--color-error)";
            }
        }
    }

    // İlk çalıştırmalar ve döngüler
    updateResources();
    checkServices();
    setInterval(updateResources, 3000);
    setInterval(checkServices, 5000);

    // ══════════════════════════════
    //  DİNAMİK LOADER MOTORU
    // ══════════════════════════════
    const loadingStates = [
        { limit: 25, text: "Çekirdek modüller yükleniyor..." },
        { limit: 60, text: "MQTT ve SignalR hatları bağlanıyor..." },
        { limit: 85, text: "Jarvis veritabanı senkronize ediliyor..." },
        { limit: 100, text: "Sistem hazır!" }
    ];

    let progress = 0;

    const runLoader = () => {
        const loadInterval = setInterval(() => {
            const increment = Math.floor(Math.random() * 5) + 2;
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
                loaderOverlay.addEventListener('transitionend', () => loaderOverlay.remove());
            }
        }, 300);
    };

    runLoader();

    // ══════════════════════════════
    //  SIDEBAR TOGGLE MECHANISM
    // ══════════════════════════════
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            menuToggle.classList.toggle('open');
        });
    }

    // ══════════════════════════════
    //  CANLI LOG SİSTEMİ
    // ══════════════════════════════
    const logMessages = [
        "[BİLGİ] Backend başlatıldı",
        "[BİLGİ] SignalR bağlantısı kuruldu",
        "[BİLGİ] Jarvis çekirdeği hazır",
        "[BİLGİ] MQTT bağlantısı kuruldu",
        "[BİLGİ] Cihaz izleyici aktif",
        "[BİLGİ] Sesli komut alındı",
        "[BİLGİ] Otomasyon tetiklendi"
    ];

    let logIndex = 0;

    function addLog() {
        if (!logContainer) return;
        
        const div = document.createElement("div");
        div.classList.add("log");
        div.textContent = logMessages[logIndex % logMessages.length];
        logContainer.prepend(div);
        logIndex++;

        // Ram koruması: Log listesi aşırı büyürse eski elementleri siler
        if (logContainer.children.length > 40) {
            logContainer.lastChild.remove();
        }
    }

    // İlk 5 logu hemen göster
    for (let i = 0; i < 5; i++) {
        addLog();
    }

    // Sonrasında her 2 saniyede bir yeni log ekle
    setInterval(addLog, 2000);
});
