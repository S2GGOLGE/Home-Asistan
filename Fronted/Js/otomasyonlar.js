document.addEventListener('DOMContentLoaded', () => {
    // ══════════════════════════════
    //  1. BAŞLANGIÇ ANİMASYONU (LOADER MOTORU)
    // ══════════════════════════════
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loaderPercentage = document.getElementById('loader-percentage');

    const loadingStates = [
        { limit: 25, text: "Otomasyon modülleri yükleniyor..." },
        { limit: 55, text: "Tetikleyiciler ve koşullar okunuyor..." },
        { limit: 80, text: "Zamanlanmış görevler senkronize ediliyor..." },
        { limit: 100, text: "Otomasyon sistemi hazır." }
    ];

    let progress = 0;

    const runLoader = () => {
        const loadInterval = setInterval(() => {
            const increment = Math.floor(Math.random() * 5) + 3;
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
        }, 30);
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
    //  2. SAYFA ELEMANLARI VE KONTROLLER
    // ══════════════════════════════
    const backButton = document.getElementById('backButton');
    const automationCards = document.querySelectorAll('[data-automation-id]');
    const automationForm = document.getElementById('automationForm');
    const autoNameInput = document.getElementById('autoName');

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = '/Fronted/Pages/index.html';
        });
    }

    automationCards.forEach((card) => {
        card.addEventListener('click', () => {
            card.classList.toggle('active');
        });
    });

    if (automationForm && autoNameInput) {
        automationForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const automationName = autoNameInput.value.trim();
            if (!automationName) return;

            console.log('Yeni Kaydedilen Otomasyon:', automationName);
            alert(`"${automationName}" otomasyonu başarıyla eklendi!`);

            if (window.HomeOSModal) {
                window.HomeOSModal.close('automationModal');
            } else {
                automationForm.reset();
            }
        });
    }
});
