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
    const API_BASE_URL = 'https://localhost:7201/api';

    async function fetchUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/Users`);
            if (response.ok) {
                allUsers = await response.json();
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

    // 4. Mock Recent Activities
    const activityList = document.getElementById('activityList');
    if (activityList) {
        const activities = [
            { user: "Ahmet Yılmaz", action: "Giriş yaptı", type: "login", time: "2 dk önce" },
            { user: "Zeynep Çelik", action: "Hesap oluşturuldu", type: "create", time: "15 dk önce" },
            { user: "Mehmet Kaya", action: "Şifre değiştirildi", type: "password", time: "1 saat önce" },
            { user: "Ayşe Demir", action: "Çıkış yaptı", type: "logout", time: "3 saat önce" }
        ];

        const getIconConfig = (type) => {
            switch(type) {
                case 'login': return { icon: 'fa-sign-in-alt', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.1)' };
                case 'logout': return { icon: 'fa-sign-out-alt', color: '#95a5a6', bg: 'rgba(149, 165, 166, 0.1)' };
                case 'password': return { icon: 'fa-key', color: '#f39c12', bg: 'rgba(243, 156, 18, 0.1)' };
                case 'create': return { icon: 'fa-user-plus', color: '#3498db', bg: 'rgba(52, 152, 219, 0.1)' };
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
    }

    // Load users on startup
    fetchUsers();
});
