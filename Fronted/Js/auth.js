document.addEventListener('DOMContentLoaded', () => {
    const sidebarNav = document.querySelector('#sidebar nav');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const authActionBtn = document.getElementById('authActionBtn');

    function getLoginState() {
        return localStorage.getItem('homeasistan_login_state') ||
            sessionStorage.getItem('homeasistan_login_state');
    }

    function isLoggedIn() {
        return Boolean(getLoginState());
    }

    function getUserRole() {
        return localStorage.getItem('homeasistan_user_role') || 'misafir';
    }

    // Redirect unauthenticated users to login page (except login/register pages)
    if (!isLoggedIn() && !window.location.pathname.endsWith('Login.html') && !window.location.pathname.endsWith('Register.html')) {
        window.location.href = '/Fronted/Pages/Login.html';
        return;
    }

    // Role system hierarchy configuration
    const ROLE_LEVELS = {
        'admin': 3,
        'administrator': 3,
        'superadmin': 3,
        'uye': 2,
        'user': 2,
        'member': 2,
        'mod': 2,
        'moderator': 2,
        'misafir': 1,
        'guest': 1
    };

    function getRoleLevel(role) {
        if (!role) return 1;
        const normalized = String(role).toLowerCase().trim();
        return ROLE_LEVELS[normalized] || 1;
    }

    const userRole = getUserRole();
    const userLevel = getRoleLevel(userRole);

    // Page authorization rules
    const pageRules = [
        { pattern: 'kullaniciyonetimi.html', minLevel: 3 },
        { pattern: 'sistemizleme.html', minLevel: 3 },
        { pattern: 'loglar.html', minLevel: 3 },
        { pattern: 'otomasyonlar.html', minLevel: 2 },
        { pattern: 'jarvis.html', minLevel: 2 },
        { pattern: 'kameralar.html', minLevel: 2 }
    ];

    const currentPath = window.location.pathname.toLowerCase();

    // Check direct page access authorization
    for (const rule of pageRules) {
        if (currentPath.endsWith(rule.pattern)) {
            if (userLevel < rule.minLevel) {
                alert('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
                window.location.href = '/Fronted/Pages/index.html';
                return;
            }
        }
    }

    // Enforce elements visibility based on roles
    function applyRoleUi() {
        // Admin-only elements
        document.querySelectorAll('.role-admin, [data-role="admin"]').forEach(el => {
            if (userLevel < 3) {
                el.style.setProperty('display', 'none', 'important');
                el.hidden = true;
            }
        });

        // Member/User-only elements (Admin is level 3, so Admin can see them)
        document.querySelectorAll('.role-uye, [data-role="uye"], [data-role="user"]').forEach(el => {
            if (userLevel < 2) {
                el.style.setProperty('display', 'none', 'important');
                el.hidden = true;
            }
        });

        // Auto-hide sidebar navigation links based on authorization
        document.querySelectorAll('#sidebar nav a').forEach(link => {
            const href = link.getAttribute('href') || '';
            const normalizedHref = href.toLowerCase();
            for (const rule of pageRules) {
                if (normalizedHref.endsWith(rule.pattern)) {
                    if (userLevel < rule.minLevel) {
                        link.style.setProperty('display', 'none', 'important');
                    }
                }
            }
        });
    }

    function applyAuthUi() {
        const loggedIn = isLoggedIn();

        if (sidebarNav) {
            sidebarNav.hidden = !loggedIn;
        }

        if (menuToggle) {
            menuToggle.hidden = !loggedIn;
            menuToggle.setAttribute('aria-hidden', String(!loggedIn));
        }

        if (sidebar) {
            sidebar.classList.toggle('collapsed', !loggedIn);
        }

        if (authActionBtn) {
            const icon = authActionBtn.querySelector('i');
            const text = authActionBtn.querySelector('span');
            if (text) text.textContent = loggedIn ? 'Çıkış Yap' : 'Giriş Yap';
            if (icon) {
                icon.className = loggedIn ? 'fas fa-sign-out-alt' : 'fas fa-sign-in-alt';
            }
            authActionBtn.setAttribute('aria-label', loggedIn ? 'Çıkış Yap' : 'Giriş Yap');
        }

        if (loggedIn) {
            applyRoleUi();
        }
    }

    // Log-out handler
    if (authActionBtn) {
        authActionBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                localStorage.removeItem('homeasistan_login_state');
                sessionStorage.removeItem('homeasistan_login_state');
                localStorage.removeItem('homeasistan_user_role');
                applyAuthUi();
                window.location.href = '/Fronted/Pages/Login.html';
                return;
            }
            window.location.href = '/Fronted/Pages/Login.html';
        });
    }

    applyAuthUi();
});
