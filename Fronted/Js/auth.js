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

    // Redirect unauthenticated users to login page (except login/register pages)
    if (!isLoggedIn() && !window.location.pathname.endsWith('Login.html') && !window.location.pathname.endsWith('Register.html')) {
        window.location.href = '/Fronted/Pages/Login.html';
        return;
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
    }

    if (authActionBtn) {
        authActionBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                localStorage.removeItem('homeasistan_login_state');
                sessionStorage.removeItem('homeasistan_login_state');
                applyAuthUi();
                window.location.href = '/Fronted/Pages/Login.html';
                return;
            }
            window.location.href = '/Fronted/Pages/Login.html';
        });
    }

    applyAuthUi();
});
