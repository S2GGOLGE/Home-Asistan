/**
 * Home Asistan - Kamera Sistemleri Yönetim Scripti
 * Performans odaklı, dinamik veri yükleme simülasyonlu akıllı katman.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Home Asistan: Kamera Kontrol Arayüzü Başlatıldı.');

    // DOM Elementlerini Önbelleğe Al (Caching)
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loaderPercentage = document.getElementById('loader-percentage');

    // Dinamik Yükleme Adımları ve Gerçek Zamanlı Sistem Mesajları
    const loadingStates = [
        { limit: 25, text: "Ağ geçitleri taranıyor..." },
        { limit: 55, text: "Video akış portları doğrulanıyor..." },
        { limit: 80, text: "Güvenli tünel (RTSP) şifreleniyor..." },
        { limit: 95, text: "Matris eşleşmesi tamamlanıyor..." },
        { limit: 100, text: "Kamera odası aktif!" }
    ];

    let progress = 0;

    /**
     * Akıllı Yükleme Barı ve Yüzde Sayacı Yönetimi
     */
    const runSystemLoading = () => {
        const loadInterval = setInterval(() => {
            // İlerlemeye doğal bir asimetri (hızlanma/yavaşlama) katmak için dinamik adımlar
            const increment = Math.floor(Math.random() * 5) + 2;
            progress += increment;

            if (progress >= 100) {
                progress = 100;
                clearInterval(loadInterval);
                terminateLoader();
            }

            // UI Güncellemelerini Uygula
            if (loaderBar) loaderBar.style.width = `${progress}%`;
            if (loaderPercentage) loaderPercentage.textContent = `${progress}%`;

            // İlerleme yüzdesine uygun durum mesajını seçip ekrana bas
            const activeState = loadingStates.find(state => progress <= state.limit);
            if (activeState && loaderText) {
                loaderText.textContent = activeState.text;
            }

        }, 45); // Toplamda ~1.5 - 2 saniye arası akıcı yükleme hızı sunar
    };

    /**
     * Yükleme Ekranını Kapatan ve Bellekten Temizleyen Kapanış Fonksiyonu
     */
    const terminateLoader = () => {
        setTimeout(() => {
            if (loaderOverlay) {
                loaderOverlay.classList.add('fade-out');
                
                // Animasyon geçişi (0.8s) bittikten sonra DOM'u yormamak için elementi tamamen kaldırır
                loaderOverlay.addEventListener('transitionend', () => {
                    loaderOverlay.remove();
                    triggerCameraStatusPolling(); // Kameraları dinlemeye başla
                });
            }
        }, 400); // 100%'e ulaştıktan sonraki stabilite bekleme süresi
    };

    /**
     * İleride SQL veya WebSocket bağlandığında kameraların durumunu 
     * anlık tetiklemek için ayrılmış performans döngüsü alt yapısı
     */
    const triggerCameraStatusPolling = () => {
        console.log("Home Asistan: Kamera izleme havuzu dinleniyor...");
        // İleride buraya kameraların canlı veri akış durumunu çekecek SQL tetikleyicileri eklenebilir.
    };

    // Yükleme motorunu ateşle
    runSystemLoading();
});