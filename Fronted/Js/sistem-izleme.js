document.addEventListener('DOMContentLoaded', () => {
    // 1. Update Time
    const updateTime = () => {
        const now = new Date();
        document.getElementById('lastUpdateTime').textContent = now.toLocaleTimeString('tr-TR');
    };
    setInterval(updateTime, 1000);
    updateTime();

    // 2. Mock Live Logs
    const logsContainer = document.getElementById('systemLogs');
    const logLevels = ['INFO', 'WARNING', 'ERROR', 'SUCCESS'];
    const logMessages = [
        "Sistem servisleri kontrol ediliyor...",
        "Kamera #2 bağlantısı kesildi.",
        "Veritabanı yedeği başarıyla alındı.",
        "Yetkisiz erişim denemesi engellendi.",
        "Jarvis NLP modeli güncellendi.",
        "Yeni cihaz algılandı: Akıllı Priz",
        "Sensör verileri senkronize ediliyor.",
        "Yüksek CPU kullanımı tespit edildi.",
        "API isteklerinde gecikme yaşanıyor.",
        "Sistem sıcaklığı normal seviyelerde."
    ];

    const addLog = () => {
        if (logsContainer.children.length > 50) {
            logsContainer.removeChild(logsContainer.lastChild);
        }
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('tr-TR');
        const level = logLevels[Math.floor(Math.random() * logLevels.length)];
        const msg = logMessages[Math.floor(Math.random() * logMessages.length)];
        
        const logEl = document.createElement('div');
        logEl.className = 'log-item';
        logEl.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-level ${level.toLowerCase()}">[${level}]</span>
            <span class="log-msg">${msg}</span>
        `;
        
        logsContainer.insertBefore(logEl, logsContainer.firstChild);
    };

    // Populate initial logs
    for(let i=0; i<15; i++) {
        setTimeout(addLog, i * 100);
    }
    
    // Add log periodically
    setInterval(addLog, 3000);

    // 3. Charts setup (Chart.js)
    Chart.defaults.color = '#A0A0A0';
    Chart.defaults.font.family = 'Inter';

    // API Mini Chart
    const apiCtx = document.getElementById('apiMiniChart');
    if (apiCtx) {
        new Chart(apiCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['1', '2', '3', '4', '5', '6', '7'],
                datasets: [{
                    label: 'Yanıt Süresi',
                    data: [45, 52, 38, 45, 41, 60, 45],
                    borderColor: '#00C853',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false, min: 0 }
                }
            }
        });
    }

    // Main Performance Chart
    const mainCtx = document.getElementById('mainPerformanceChart');
    if (mainCtx) {
        const context = mainCtx.getContext('2d');
        // Gradient for CPU
        const cpuGradient = context.createLinearGradient(0, 0, 0, 400);
        cpuGradient.addColorStop(0, 'rgba(0, 200, 83, 0.5)');
        cpuGradient.addColorStop(1, 'rgba(0, 200, 83, 0.0)');

        // Gradient for RAM
        const ramGradient = context.createLinearGradient(0, 0, 0, 400);
        ramGradient.addColorStop(0, 'rgba(52, 152, 219, 0.5)');
        ramGradient.addColorStop(1, 'rgba(52, 152, 219, 0.0)');

        new Chart(context, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [
                    {
                        label: 'CPU Kullanımı (%)',
                        data: Array.from({length: 24}, () => Math.floor(Math.random() * 40) + 10),
                        borderColor: '#00C853',
                        backgroundColor: cpuGradient,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'RAM Kullanımı (%)',
                        data: Array.from({length: 24}, () => Math.floor(Math.random() * 20) + 50),
                        borderColor: '#3498db',
                        backgroundColor: ramGradient,
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    // 4. Quick Actions
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            icon.classList.add('fa-spin');
            setTimeout(() => icon.classList.remove('fa-spin'), 1000);
            updateTime();
        });
    }
    
    const clearBtn = document.querySelector('.action-btn.clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            logsContainer.innerHTML = '';
            addLog(); // add one to show it's working
        });
    }
});
