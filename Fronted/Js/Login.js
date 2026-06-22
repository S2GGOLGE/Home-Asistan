document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');
    const username = document.getElementById('username');
    const remember = document.getElementById('remember');
    const rememberedUsername = localStorage.getItem('homeasistan_remembered_username');

    if (rememberedUsername) {
        username.value = rememberedUsername;
        remember.checked = true;
        password.focus();
    } else {
        username.focus();
    }

    // Şifre Göster/Gizle
    togglePassword.addEventListener('click', function () {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        
        // İkonu değiştir
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Gerçek API Bağlantısı
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = this.querySelector('.btn-login');
        const originalContent = btn.innerHTML;
        const originalBackground = btn.style.background || '';
        const usernameInput = username.value.trim();
        const passwordInput = password.value;
        
        // Yükleniyor durumu
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Giriş Yapılıyor...</span>';
        btn.style.pointerEvents = 'none';
        
        try {
            const result = await loginUser(usernameInput, passwordInput);

            if (result.success) {
                const responseData = result.data || {};
                const userRole = responseData.role || responseData.Role || 'User';

                const loginState = JSON.stringify({
                    username: usernameInput,
                    role: userRole,
                    loginTime: new Date().toISOString()
                });

                // Always store role in localStorage so auth.js can check it easily on DOMContentLoaded
                localStorage.setItem('homeasistan_user_role', userRole);

                if (remember.checked) {
                    localStorage.setItem('homeasistan_remembered_username', usernameInput);
                    localStorage.setItem('homeasistan_login_state', loginState);
                    sessionStorage.removeItem('homeasistan_login_state');
                } else {
                    localStorage.removeItem('homeasistan_remembered_username');
                    localStorage.removeItem('homeasistan_login_state');
                    sessionStorage.setItem('homeasistan_login_state', loginState);
                }

                btn.innerHTML = '<i class="fas fa-check"></i><span>Başarılı!</span>';
                btn.style.background = '#0a2e1a'; /* Koyu yeşil */
                btn.style.color = '#00ff88';
                
                // Ana sayfaya yönlendir
                setTimeout(() => {
                    window.location.href = '/Fronted/Pages/index.html';
                }, 800);
            } else {
                btn.innerHTML = `<i class="fas fa-times"></i><span style="font-size: 13px;">Hata: ${result.message}</span>`;
                btn.style.background = 'var(--color-error)';
                
                setTimeout(() => {
                    btn.innerHTML = originalContent;
                    btn.style.background = originalBackground;
                    btn.style.pointerEvents = 'auto';
                }, 3000);
            }
        } catch (error) {
            btn.innerHTML = '<i class="fas fa-times"></i><span>Bağlantı Hatası</span>';
            btn.style.background = 'var(--color-error)';
            
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = originalBackground;
                btn.style.pointerEvents = 'auto';
            }, 3000);
        }
    });
});
