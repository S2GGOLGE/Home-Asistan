document.addEventListener('DOMContentLoaded', () => {
    const salonModal = document.getElementById('modal-salon');
    const mutfakModal = document.getElementById('modal-mutfak');

    if (salonModal) {
        salonModal.addEventListener('modal:open', () => {
            setTimeout(initSalonChart, 150);
        });
    }

    if (mutfakModal) {
        mutfakModal.addEventListener('modal:open', () => {
            setTimeout(initMutfakChart, 150);
        });
    }
});

let salonChartInstance = null;

function initSalonChart() {
    if (salonChartInstance || typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chart-salon');
    if (!canvas) return;

    salonChartInstance = new Chart(canvas.getContext('2d'), {
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
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#888888', font: { size: 9 } }
                },
                y: {
                    grid: { color: '#1c1c1c' },
                    ticks: { color: '#888888', font: { size: 9 } }
                }
            }
        }
    });
}

let mutfakChartInstance = null;

function initMutfakChart() {
    if (mutfakChartInstance || typeof Chart === 'undefined') return;

    const canvas = document.getElementById('chart-mutfak');
    if (!canvas) return;

    mutfakChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
            datasets: [{
                data: [12, 19, 14, 15, 22, 28, 20],
                backgroundColor: '#ff9900',
                borderRadius: 4,
                barThickness: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#888888', font: { size: 9 } }
                },
                y: {
                    grid: { color: '#1c1c1c' },
                    ticks: { color: '#888888', font: { size: 9 } }
                }
            }
        }
    });
}
