document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements
    const modal = document.getElementById('roleModal');
    const openBtn = document.getElementById('openRoleModalBtn');
    const closeBtn = document.getElementById('closeRoleModalBtn');
    const cancelBtn = document.getElementById('cancelRoleModalBtn');
    const saveRoleBtn = document.getElementById('saveRoleBtn');
    const modalUserSelect = document.getElementById('modalUserSelect');
    const modalCurrentRole = document.getElementById('modalCurrentRole');
    const modalNewRoleSelect = document.getElementById('modalNewRoleSelect');
    const usersTableBody = document.querySelector('.users-table tbody');

    let allUsers = [];

    const openModal = () => {
        populateModalUserSelect();
        modal.classList.add('active');
    };
    const closeModal = () => modal.classList.remove('active');

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // 2. Fetch Users from Database
const API_BASE_URL = getApiBaseUrl();

function getApiBaseUrl() {
    const liveServerPorts = ['5500', '5501', '5502'];
    const isLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && liveServerPorts.includes(window.location.port);

    if (window.location.protocol === 'file:' || isLiveServer) {
        return 'https://localhost:7201/api';
    }

    return `${window.location.origin}/api`;
}

    async function fetchUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/Users`);
            if (response.ok) {
                const payload = await response.json();
                allUsers = Array.isArray(payload) ? payload : (payload.data ?? []);
                renderUsersTable(allUsers);
            } else {
                console.error('Kullanıcılar alınamadı:', response.statusText);
            }
        } catch (error) {
            console.error('Kullanıcıları getirirken bağlantı hatası oluştu:', error);
        }
    }

    function translateRole(role) {
        if (!role) return 'Misafir';
        const norm = role.toLowerCase().trim();
        if (norm === 'admin' || norm === 'administrator' || norm === 'superadmin') return 'Admin';
        if (norm === 'uye' || norm === 'user' || norm === 'member') return 'Üye';
        return 'Misafir';
    }

    function getRoleBadgeClass(role) {
        const trRole = translateRole(role);
        if (trRole === 'Admin') return 'admin';
        if (trRole === 'Üye') return 'user';
        return 'guest';
    }

    function renderUsersTable(users) {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '';

        if (users.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Kullanıcı bulunamadı.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const trRole = translateRole(user.role);
            const badgeClass = getRoleBadgeClass(user.role);
            const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : 'U';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="avatar">
                        <div class="avatar-placeholder">${firstLetter}</div>
                    </div>
                </td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td><span class="role-badge ${badgeClass}">${trRole}</span></td>
                <td><span class="status-badge online">Aktif</span></td>
                <td>-</td>
                <td>${user.createdAt || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit-role-btn" data-id="${user.id}" title="Rol Düzenle">
                            <i class="fas fa-user-edit"></i>
                        </button>
                        <button class="icon-btn danger-btn" title="Sil" disabled>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Attach event listener to edit button
            const editBtn = tr.querySelector('.edit-role-btn');
            editBtn.addEventListener('click', () => {
                openModal();
                modalUserSelect.value = user.id;
                updateModalCurrentRole();
            });

            usersTableBody.appendChild(tr);
        });
        updateStatCards(users);
    }

    function populateModalUserSelect() {
        if (!modalUserSelect) return;
        modalUserSelect.innerHTML = '';
        allUsers.forEach(user => {
            const opt = document.createElement('option');
            opt.value = user.id;
            opt.textContent = user.username;
            modalUserSelect.appendChild(opt);
        });
        updateModalCurrentRole();
    }

    function updateModalCurrentRole() {
        const userId = parseInt(modalUserSelect.value);
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            modalCurrentRole.textContent = translateRole(user.role);
        } else {
            modalCurrentRole.textContent = '-';
        }
    }

    if (modalUserSelect) {
        modalUserSelect.addEventListener('change', updateModalCurrentRole);
    }

    // 3. Save Role Update
    if (saveRoleBtn) {
        saveRoleBtn.addEventListener('click', async () => {
            const userId = parseInt(modalUserSelect.value);
            const selectedRole = modalNewRoleSelect.value; // e.g. "Admin", "Uye", "Misafir"

            if (!userId) return;

            saveRoleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span> Kaydediliyor...</span>';
            saveRoleBtn.style.pointerEvents = 'none';

            try {
                const response = await fetch(`${API_BASE_URL}/Users/${userId}/role`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ Role: selectedRole })
                });

                if (response.ok) {
                    saveRoleBtn.innerHTML = '<i class="fas fa-check"></i><span> Başarılı!</span>';
                    setTimeout(async () => {
                        closeModal();
                        saveRoleBtn.innerHTML = 'Kaydet';
                        saveRoleBtn.style.pointerEvents = 'auto';
                        await fetchUsers();
                    }, 1000);
                } else {
                    const err = await response.json();
                    alert('Hata: ' + (err.message || 'Güncelleme başarısız.'));
                    saveRoleBtn.innerHTML = 'Kaydet';
                    saveRoleBtn.style.pointerEvents = 'auto';
                }
            } catch (error) {
                console.error('Rol güncellenirken hata oluştu:', error);
                alert('Bağlantı Hatası');
                saveRoleBtn.innerHTML = 'Kaydet';
                saveRoleBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // 4. Son Kullanıcı Hareketleri - SystemLogs API'sından gerçek veriler
    const activityList = document.getElementById('activityList');
    async function loadRecentActivity() {
        if (!activityList) return;
        try {
            const res = await fetch(`${API_BASE_URL}/systemlogs?eventType=Authentication&pageSize=10`);
            if (!res.ok) throw new Error();
            const payload = await res.json();
            const data = payload?.data ?? payload;
            const logs = Array.isArray(data) ? data : (data?.items ?? []);
            if (!logs || logs.length === 0) {
                activityList.innerHTML = '<div style="color:var(--text-secondary);padding:10px">Henüz aktivite kaydı yok.</div>';
                return;
            }
            const getIconConfig = (msg) => {
                const m = (msg || '').toLowerCase();
                if (m.includes('giriş') || m.includes('login')) return { icon: 'fa-sign-in-alt', color: '#2ecc71', bg: 'rgba(46,204,113,0.1)' };
                if (m.includes('çıkış') || m.includes('logout')) return { icon: 'fa-sign-out-alt', color: '#95a5a6', bg: 'rgba(149,165,166,0.1)' };
                if (m.includes('şifre') || m.includes('password')) return { icon: 'fa-key', color: '#f39c12', bg: 'rgba(243,156,18,0.1)' };
                if (m.includes('kayıt') || m.includes('register')) return { icon: 'fa-user-plus', color: '#3498db', bg: 'rgba(52,152,219,0.1)' };
                return { icon: 'fa-circle', color: '#aaa', bg: 'rgba(255,255,255,0.05)' };
            };
            activityList.innerHTML = '';
            logs.forEach(log => {
                const conf = getIconConfig(log.message);
                const time = log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR') : '-';
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="act-info">
                        <div class="act-icon" style="color:${conf.color};background:${conf.bg};">
                            <i class="fas ${conf.icon}"></i>
                        </div>
                        <div class="act-text">
                            <span class="act-user">${log.serviceName || 'Sistem'}</span>
                            <span class="act-time">${time}</span>
                        </div>
                    </div>
                    <div class="act-badge" style="color:${conf.color};font-size:0.9rem;font-weight:500;">
                        ${log.message || '-'}
                    </div>`;
                activityList.appendChild(item);
            });
        } catch {
            if (activityList) activityList.innerHTML = '<div style="color:var(--text-secondary);padding:10px">Aktivite verileri yüklenemedi.</div>';
        }
    }

    // 5. İstatistik kartlarını gerçek verilerle doldur
    function updateStatCards(users) {
        const total = users.length;
        const admins = users.filter(u => translateRole(u.role) === 'Admin').length;
        const members = users.filter(u => translateRole(u.role) === 'Üye').length;
        const totalEl = document.getElementById('statTotalUsers');
        const adminEl = document.getElementById('statAdminCount');
        const memberEl = document.getElementById('statMemberCount');
        if (totalEl) totalEl.textContent = total;
        if (adminEl) adminEl.textContent = admins;
        if (memberEl) memberEl.textContent = members;
    }



    // Load users on startup
    fetchUsers().then(() => updateStatCards(allUsers));
    loadRecentActivity();
});
