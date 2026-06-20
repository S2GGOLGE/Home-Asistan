document.addEventListener('DOMContentLoaded', () => {
    // 1. Modal Logic
    const modal = document.getElementById('roleModal');
    const openBtn = document.getElementById('openRoleModalBtn');
    const closeBtn = document.getElementById('closeRoleModalBtn');
    const cancelBtn = document.getElementById('cancelRoleModalBtn');

    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // 2. Mock Recent Activities
    const activityList = document.getElementById('activityList');
    const activities = [
        { user: "Ahmet Yılmaz", action: "Giriş yaptı", type: "login", time: "2 dk önce" },
        { user: "Zeynep Çelik", action: "Hesap oluşturuldu", type: "create", time: "15 dk önce" },
        { user: "Mehmet Kaya", action: "Şifre değiştirildi", type: "password", time: "1 saat önce" },
        { user: "Ayşe Demir", action: "Çıkış yaptı", type: "logout", time: "3 saat önce" },
        { user: "Caner Yılmaz", action: "Rol değiştirildi (Kullanıcı -> Moderatör)", type: "role", time: "5 saat önce" }
    ];

    const getIconConfig = (type) => {
        switch(type) {
            case 'login': return { icon: 'fa-sign-in-alt', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.1)' };
            case 'logout': return { icon: 'fa-sign-out-alt', color: '#95a5a6', bg: 'rgba(149, 165, 166, 0.1)' };
            case 'password': return { icon: 'fa-key', color: '#f39c12', bg: 'rgba(243, 156, 18, 0.1)' };
            case 'create': return { icon: 'fa-user-plus', color: '#3498db', bg: 'rgba(52, 152, 219, 0.1)' };
            case 'role': return { icon: 'fa-user-tag', color: '#9b59b6', bg: 'rgba(155, 89, 182, 0.1)' };
            default: return { icon: 'fa-circle', color: '#fff', bg: 'rgba(255,255,255,0.1)' };
        }
    };

    activities.forEach(act => {
        const conf = getIconConfig(act.type);
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="act-info">
                <div class="act-icon" style="color: ${conf.color}; background: ${conf.bg};">
                    <i class="fas ${conf.icon}"></i>
                </div>
                <div class="act-text">
                    <span class="act-user">${act.user}</span>
                    <span class="act-time">${act.time}</span>
                </div>
            </div>
            <div class="act-badge" style="color: ${conf.color}; font-size: 0.9rem; font-weight: 500;">
                ${act.action}
            </div>
        `;
        activityList.appendChild(item);
    });

    // 3. Simple action buttons interaction feedback
    const actionButtons = document.querySelectorAll('.icon-btn:not(:disabled)');
    actionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Just a visual feedback
            const originalIcon = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-check" style="color: var(--neon-green);"></i>';
                setTimeout(() => {
                    this.innerHTML = originalIcon;
                }, 1000);
            }, 600);
        });
    });
});
