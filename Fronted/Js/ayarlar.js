document.addEventListener("DOMContentLoaded", () => {

    // --- 1. BİREBİR YÜKLEME EKRANI (LOADING SYSTEM) ---
    const loadingScreen = document.getElementById("loading-screen");
    const loaderPercent = document.getElementById("loader-percent");
    const loaderStatus = document.getElementById("loader-status");
    const progressCircle = document.getElementById("loader-progress-circle");

    let currentPercent = 0;
    const circleCircumference = 283; // 2 * PI * r (Çember Çevresi uzunluğu)

    const loadingInterval = setInterval(() => {
        currentPercent++;

        // Yüzdelik sayacı bas
        loaderPercent.textContent = `${currentPercent}%`;

        // Dairesel SVG barı ilerlet
        const offset = circleCircumference - (currentPercent / 100) * circleCircumference;
        progressCircle.style.strokeDashoffset = offset;

        // Gerçekçi aşamalı durum metinleri
        if (currentPercent === 35) {
            loaderStatus.textContent = "SİSTEM BİLEŞENLERİ KONTROL EDİLİYOR...";
        } else if (currentPercent === 70) {
            loaderStatus.textContent = "AYAR MODÜLLERİ YAPILANDIRILIYOR...";
        } else if (currentPercent === 95) {
            loaderStatus.textContent = "SİSTEM HAZIR!";
        }

        // 100 olunca yumuşakça arayüze geçiş yap
        if (currentPercent >= 100) {
            clearInterval(loadingInterval);
            setTimeout(() => {
                loadingScreen.classList.add("fade-out");
            }, 350);
        }
    }, 20); // Videodaki akış hızına sadık kalındı

    // --- 2. DEĞİŞKENLER VE PANEL KONTROLLERİ ---
    const navItems = document.querySelectorAll(".nav-item:not(.back-button)");
    const sections = document.querySelectorAll(".settings-section");
    const sectionTitle = document.getElementById("section-title");
    const sectionDesc = document.getElementById("section-desc");
    const settingsForm = document.getElementById("settings-form");
    const btnReset = document.getElementById("btn-reset");
    const btnBack = document.getElementById("btn-back");
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");

    // Sekme Değiştirme Mantığı
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            document.querySelector(".nav-item.active")?.classList.remove("active");
            item.classList.add("active");

            const target = item.getAttribute("data-target");
            sections.forEach(section => {
                if (section.id === `section-${target}`) {
                    section.classList.add("active-section");
                } else {
                    section.classList.remove("active-section");
                }
            });

            updateHeader(target, item.innerText.trim());
        });
    });

    function updateHeader(target, titleText) {
        sectionTitle.textContent = titleText;

        const descriptions = {
            genel: "Sistem temel yapılandırma ayarlarını buradan yönetebilirsiniz.",
            kullanici: "Hesap şifresi, yetkilendirmeler ve oturum zaman aşımı yönetimi.",
            guvenlik: "2FA, API anahtarları ve güvenlik duvarı protokolleri.",
            bildirimler: "Sistem uyarıları, e-posta ve sesli bildirim tercihleri.",
            jarvis: "Yapay zeka modeli, sesli komut hassasiyeti ve uyandırma kelimesi.",
            cihazlar: "Evdeki akıllı cihazların odalara göre dağılımı ve keşif modları.",
            otomasyon: "Senaryolar, hata yönetim politikaları ve çalışma logları.",
            kamera: "Kamera yayın kalitesi, döngüsel kayıt günleri ve depolama hedefi.",
            izleme: "CPU, RAM ve donanım performans modlarının anlık takibi.",
            yedekleme: "Sistem veritabanı yedekleme takvimi ve manuel kurtarma.",
            gelistirici: "WebSocket, SignalR durumu ve geliştirici konsolu araçları."
        };

        sectionDesc.textContent = descriptions[target] || "HomeOS Yapılandırma Paneli.";
    }

    // --- 3. TOAST SİSTEMİ ---
    function showToast(message, isError = false) {
        toastMessage.textContent = message;
        const icon = toast.querySelector("i");

        if (isError) {
            toast.style.borderLeft = "4px solid var(--color-error)";
            icon.style.color = "var(--color-error)";
            icon.className = "fa-solid fa-circle-exclamation";
        } else {
            toast.style.borderLeft = "4px solid var(--accent-green)";
            icon.style.color = "var(--accent-green)";
            icon.className = "fa-solid fa-circle-check";
        }

        toast.classList.remove("hidden");

        setTimeout(() => {
            toast.classList.add("hidden");
        }, 3000);
    }

    // --- 4. FORM AKSİYONLARI ---
    settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(settingsForm);
        const settingsData = {};

        formData.forEach((value, key) => {
            settingsData[key] = value;
        });

        const checkboxes = settingsForm.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => {
            settingsData[cb.name] = cb.checked;
        });

        console.log("HomeOS Ayarları Kaydedildi: ", settingsData);
        localStorage.setItem("homeos_settings", JSON.stringify(settingsData));
        showToast("Ayarlar başarıyla sisteme işlendi!");
    });

    btnReset.addEventListener("click", () => {
        if (confirm("Değişiklikleri geri almak istediğinize emin misiniz?")) {
            settingsForm.reset();
            showToast("Form orijinal değerlerine döndürüldü.", true);
        }
    });

    // --- 5. GERİ DÖN AKSİYONU ---
    if (btnBack) {
        btnBack.addEventListener("click", () => {
            window.history.back();
        });
    }
});