// Modal Açma Fonksiyonu
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Sayfa kaymasını durdur
        
        // Sadece modal açıldığında grafikleri çizdir (Performans optimizasyonu)
        setTimeout(() => {
            if (modalId === 'modal-salon') initSalonChart();
            if (modalId === 'modal-mutfak') initMutfakChart();
        }, 150);
    }
}

// Modal Kapatma Fonksiyonları
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeModal(event, modalId) {
    const modal = document.getElementById(modalId);
    if (modal && event.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ESC Tuşu ile Kapatma Desteği
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
    }
});

// ================= GRAFİK MOTORLARI (CHART.JS) =================
let salonChartInstance = null;
function initSalonChart() {
    if (salonChartInstance) return; // Zaten çizildiyse tekrar tetikleme
    const ctx = document.getElementById('chart-salon').getContext('2d');
    salonChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            datasets: [{
                data: [21, 20.5, 22, 23.5, 24, 22.4],
                borderColor: '#00ff88',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                x: { grid: { display: false }, ticks: { color: '#888888', font: { size: 9 } } }, 
                y: { grid: { color: '#1c1c1c' }, ticks: { color: '#888888', font: { size: 9 } } } 
            }
        }
    });
}

let mutfakChartInstance = null;
function initMutfakChart() {
    if (mutfakChartInstance) return;
    const ctx = document.getElementById('chart-mutfak').getContext('2d');
    mutfakChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{ data: [12, 19, 14, 15, 22, 28, 20], backgroundColor: '#ff9900', borderRadius: 4, barThickness: 12 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                x: { grid: { display: false }, ticks: { color: '#888888', font: { size: 9 } } }, 
                y: { grid: { color: '#1c1c1c' }, ticks: { color: '#888888', font: { size: 9 } } } 
            }
        }
    });
}