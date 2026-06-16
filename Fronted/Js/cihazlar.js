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
    
    // Sağ Detay Paneli Elementleri
    const detailsTitle = document.querySelector('.details-panel .details-header h2');
    const infoItems = document.querySelectorAll('.details-panel .info-item strong');
    const cpuBar = document.querySelectorAll('.res-fill')[0];
    const cpuText = document.querySelectorAll('.res-labels span:last-child')[0];
    const ramBar = document.querySelectorAll('.res-fill')[1];
    const ramText = document.querySelectorAll('.res-labels span:last-child')[1];
    const terminalBox = document.querySelector('.terminal-box');

    // Yeni Cihaz Ekle Form Elementleri
    const deviceModal = document.getElementById('device-modal');
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
                loaderOverlay.addEventListener('transitionend', () => {
                    loaderOverlay.remove();
                });
            }
            logToTerminal("[Sistem] Bütün servisler stabil şekilde başlatıldı.");
        }, 400);
    };

    runInitialLoader();

    if (deviceModal) {
        deviceModal.addEventListener('modal:open', () => {
            logToTerminal("[Sistem] Yeni cihaz ekleme penceresi açıldı.");
        });
    }

    // 🚀 FORM SUBMIT KONTROLÜ (Birleştirilmiş & Çakışmasız Tek Tetikleyici)
    if (addDeviceForm) {
        addDeviceForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Sayfanın refresh olmasını kesin olarak engeller.
            
            const name = document.getElementById('device-name').value;
            const room = document.getElementById('device-room').value;
            
            logToTerminal(`[Sistem] Yeni donanım kuyruğa eklendi: ${name} (${room})`);
            
            // CihazlarEndpoint.js içerisindeki fonksiyonu güvenli bir şekilde çağırır
            if (typeof ekle === "function") {
                const saved = await ekle();
                if (saved && window.HomeOSModal) {
                    window.HomeOSModal.close('device-modal');
                }
            } else {
                console.error("HATA: CihazlarEndpoint.js yüklenemedi veya ekle() fonksiyonu bulunamadı!");
            }
        });
    }

    // ══════════════════════════════
    //  3. ARAMA VE FİLTRELEME SİSTEMİ
    // ══════════════════════════════
    function filterDevices() {
        const deviceCards = document.querySelectorAll('.device-card');
        let visibleCount = 0;

        deviceCards.forEach(card => {
            const deviceType = card.getAttribute('data-type') || 'other';
            const titleEl = card.querySelector('.card-body h3');
            const descEl = card.querySelector('.card-body p');
            const deviceName = (titleEl?.textContent || '').toLowerCase();
            const deviceRoom = (descEl?.textContent || '').toLowerCase();

            const matchesFilter = activeFilter === 'all' || deviceType === activeFilter;
            const matchesSearch = !searchQuery || deviceName.includes(searchQuery) || deviceRoom.includes(searchQuery);

            if (matchesFilter && matchesSearch) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        const grid = document.querySelector('.devices-grid');
        const emptyMsg = document.getElementById('filter-empty-msg');

        if (visibleCount === 0 && deviceCards.length > 0) {
            if (!emptyMsg && grid) {
                const msg = document.createElement('p');
                msg.id = 'filter-empty-msg';
                msg.className = 'bos-mesaj';
                msg.textContent = 'Bu filtreye uygun cihaz bulunamadı.';
                grid.appendChild(msg);
            }
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    window.HomeOS = window.HomeOS || {};
    window.HomeOS.applyDeviceFilters = filterDevices;

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter || 'all';
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
    // Not: API kartları cihazdurumguncelleme.js tarafından yönetilir.
    // ══════════════════════════════
    document.querySelectorAll('.device-card').forEach(card => {
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
    document.querySelectorAll('.device-card').forEach(card => {
        const refreshBtn = card.querySelector('.action-btn:nth-child(1)');
        const deviceName = card.querySelector('.card-body h3').textContent;

        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
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

        card.addEventListener('click', () => {
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
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
