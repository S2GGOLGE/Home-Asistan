document.addEventListener('DOMContentLoaded', () => {
    console.log('HomeOS: Çekirdek Sistem, Animasyonlar ve Buton Kontrolleri Aktif.');

    // ══════════════════════════════
    //  DOM SEÇİCİLERİ
    // ══════════════════════════════
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loaderPercentage = document.getElementById('loader-percentage');

    const searchInput = document.querySelector('.search-box input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const deviceCards = document.querySelectorAll('.device-card');
    
    // Sağ Detay Paneli Elementleri
    const detailsTitle = document.querySelector('.details-panel .details-header h2');
    const infoItems = document.querySelectorAll('.details-panel .info-item strong');
    const cpuBar = document.querySelectorAll('.res-fill')[0];
    const cpuText = document.querySelectorAll('.res-labels span:last-child')[0];
    const ramBar = document.querySelectorAll('.res-fill')[1];
    const ramText = document.querySelectorAll('.res-labels span:last-child')[1];
    const terminalBox = document.querySelector('.terminal-box');

    // Yeni Cihaz Ekle Modal Elementleri
    const openModalBtn = document.querySelector('.add-btn');
    const deviceModal = document.getElementById('device-modal');
    const closeModalX = document.getElementById('close-modal');
    const closeModalCancel = document.getElementById('cancel-modal');
    const addDeviceForm = document.getElementById('add-device-form');

    // Arama ve Filtre Hafızası
    let activeFilter = 'all';
    let searchQuery = '';

    // ══════════════════════════════
    //  1. BAŞLANGIÇ ANİMASYONU (LOADER MOTORU)
    // ══════════════════════════════
    const loadingStates = [
        { limit: 30, text: "HomeOS çekirdeği taranıyor..." },
        { limit: 65, text: "Ağ geçitleri ve IP adresleri doğrulanıyor..." },
        { limit: 85, text: "Cihaz durumları senkronize ediliyor..." },
        { limit: 100, text: "Sistem bileşenleri hazır." }
    ];

    let progress = 0;

    const runInitialLoader = () => {
        const interval = setInterval(() => {
            // Animasyon hızı ve rastgele yüklenme adımları
            const step = Math.floor(Math.random() * 6) + 4;
            progress += step;

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                hideLoader();
            }

            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (loaderPercentage) loaderPercentage.textContent = `${progress}%`;

            const currentState = loadingStates.find(state => progress <= state.limit);
            if (currentState && loaderText) {
                loaderText.textContent = currentState.text;
            }
        }, 35);
    };

    const hideLoader = () => {
        setTimeout(() => {
            if (loaderOverlay) {
                loaderOverlay.classList.add('fade-out');
                // Performans için animasyon bitince DOM'dan kaldırır
                loaderOverlay.addEventListener('transitionend', () => {
                    loaderOverlay.remove();
                });
            }
            logToTerminal("[Sistem] Bütün servisler stabil şekilde başlatıldı.");
        }, 400);
    };

    // Animasyon motorunu hemen ateşle
    runInitialLoader();

    // ══════════════════════════════
    //  2. YENİ CİHAZ EKLE MODAL POPUP
    // ══════════════════════════════
    if (openModalBtn && deviceModal) {
        openModalBtn.addEventListener('click', () => {
            deviceModal.classList.add('show');
            logToTerminal("[Sistem] Yeni cihaz ekleme penceresi açıldı.");
        });
    }

    const closeModal = () => {
        if (deviceModal) {
            deviceModal.classList.remove('show');
            if (addDeviceForm) addDeviceForm.reset();
        }
    };

    if (closeModalX) closeModalX.addEventListener('click', closeModal);
    if (closeModalCancel) closeModalCancel.addEventListener('click', closeModal);

    window.addEventListener('click', (e) => {
        if (e.target === deviceModal) closeModal();
    });

    if (addDeviceForm) {
        addDeviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('device-name').value;
            const room = document.getElementById('device-room').value;
            logToTerminal(`[Sistem] Yeni donanım kuyruğa eklendi: ${name} (${room})`);
            closeModal();
        });
    }

    // ══════════════════════════════
    //  3. ARAMA VE FİLTRELEME SİSTEMİ
    // ══════════════════════════════
    function filterDevices() {
        deviceCards.forEach(card => {
            const deviceType = card.getAttribute('data-type');
            const deviceName = card.querySelector('.card-body h3').textContent.toLowerCase();
            const deviceRoom = card.querySelector('.card-body p').textContent.toLowerCase();
            
            const matchesFilter = (activeFilter === 'all' || deviceType === activeFilter);
            const matchesSearch = deviceName.includes(searchQuery) || deviceRoom.includes(searchQuery);

            if (matchesFilter && matchesSearch) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Tıklanan buton ismini küçük harfe çevirip eşle
            const btnText = button.textContent.trim().toLowerCase();
            
            if (btnText === 'ışıklar') activeFilter = 'light';
            else if (btnText === 'kameralar') activeFilter = 'camera';
            else if (btnText === 'sensörler') activeFilter = 'sensor';
            else if (btnText === 'prizler') activeFilter = 'plug';
            else if (btnText === 'klima') activeFilter = 'climate';
            else activeFilter = 'all';

            filterDevices();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            filterDevices();
        });
    }

    // ══════════════════════════════
    //  4. SWITCH (AÇMA / KAPAMA) KONTROLLERİ
    // ══════════════════════════════
    deviceCards.forEach(card => {
        const toggleSwitch = card.querySelector('.switch input');
        const badge = card.querySelector('.badge');
        const deviceName = card.querySelector('.card-body h3').textContent;

        if (toggleSwitch) {
            toggleSwitch.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                
                if (badge && badge.textContent !== 'Bakımda') {
                    if (isChecked) {
                        badge.textContent = 'Online';
                        badge.className = 'badge online';
                        logToTerminal(`[${deviceName}] Güç durumu: ON (Açık)`);
                    } else {
                        badge.textContent = 'Offline';
                        badge.className = 'badge offline';
                        logToTerminal(`[${deviceName}] Güç durumu: OFF (Kapalı)`);
                    }
                }
            });
        }
    });

    // ══════════════════════════════
    //  5. YENİLEME (REFRESH) VE SAĞ DETAY PANELİ
    // ══════════════════════════════
    deviceCards.forEach(card => {
        const refreshBtn = card.querySelector('.action-btn:nth-child(1)');
        const deviceName = card.querySelector('.card-body h3').textContent;

        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Karta tıklama olayını tetiklemesin
                refreshBtn.style.transform = 'rotate(360deg)';
                refreshBtn.style.transition = 'transform 0.5s ease';
                logToTerminal(`[${deviceName}] Donanım ping talebi gönderildi...`);
                
                setTimeout(() => {
                    refreshBtn.style.transform = 'none';
                    refreshBtn.style.transition = 'none';
                    logToTerminal(`[${deviceName}] Sinyal stabil. Ping: ${Math.floor(Math.random() * 30) + 10}ms`);
                }, 500);
            });
        }

        // Kart Seçimi
        card.addEventListener('click', () => {
            deviceCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const name = card.querySelector('.card-body h3').textContent;
            const type = card.getAttribute('data-type');

            if (detailsTitle) {
                let icon = 'fa-lightbulb';
                if (type === 'camera') icon = 'fa-video';
                if (type === 'plug') icon = 'fa-plug';
                if (type === 'climate') icon = 'fa-snowflake';
                detailsTitle.innerHTML = `<i class="fas ${icon}"></i> ${name}`;
            }

            if (infoItems.length >= 2) {
                infoItems[0].textContent = card.querySelector('.card-body p').textContent.split('•')[0].trim();
                infoItems[1].textContent = `192.168.1.${Math.floor(Math.random() * 80) + 110}`;
            }

            const cpu = Math.floor(Math.random() * 35) + 5;
            const ram = Math.floor(Math.random() * 45) + 15;
            if (cpuBar) { cpuBar.style.width = `${cpu}%`; cpuText.textContent = `%${cpu}`; }
            if (ramBar) { ramBar.style.width = `${ram}%`; ramText.textContent = `${ram} MB`; }

            logToTerminal(`[Arayüz] ${name} detay matrisi yüklendi.`);
        });
    });

    // Yardımcı Terminal Log Fonksiyonu
    function logToTerminal(message) {
        if (!terminalBox) return;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const p = document.createElement('p');
        p.className = 'log-line';
        p.innerHTML = `<span class="time">[${timeStr}]</span> ${message}`;
        terminalBox.appendChild(p);
        terminalBox.scrollTop = terminalBox.scrollHeight;
    }
});