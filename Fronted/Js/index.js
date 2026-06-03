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

    // ══════════════════════════════
    //  KAYNAK ÇUBUKLARI GÜNCELLEME
    // ══════════════════════════════
    const cpu = 27;
    const ram = 48;

    if (document.getElementById("cpuBar")) document.getElementById("cpuBar").style.width = cpu + "%";
    if (document.getElementById("ramBar")) document.getElementById("ramBar").style.width = ram + "%";

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