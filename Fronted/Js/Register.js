document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('togglePassword');
    const togglePasswordRepeat = document.getElementById('togglePasswordRepeat');
    const password = document.getElementById('password');
    const passwordRepeat = document.getElementById('passwordRepeat');
    const registerForm = document.getElementById('registerForm');
    const passwordError = document.getElementById('passwordError');

    // Şifre Göster/Gizle Fonksiyonu
    function setupToggle(btn, inputField) {
        btn.addEventListener('click', function () {
            const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
            inputField.setAttribute('type', type);
            
            // İkonu değiştir
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    setupToggle(togglePassword, password);
    setupToggle(togglePasswordRepeat, passwordRepeat);

    // Form Gönderimi (API Bağlantısı)
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Şifre Eşleşme Kontrolü
        if (password.value !== passwordRepeat.value) {
            passwordError.style.display = 'block';
            passwordRepeat.parentElement.style.borderColor = 'var(--color-error)';
            return;
        } else {
            passwordError.style.display = 'none';
            passwordRepeat.parentElement.style.borderColor = 'var(--border-line)';
        }

        const btn = this.querySelector('.btn-login');
        const originalContent = btn.innerHTML;
        const originalBackground = btn.style.background || '';
        const usernameInput = document.getElementById('username').value;
        const emailInput = document.getElementById('email').value;
        const passwordInput = document.getElementById('password').value;
        
        // Yükleniyor durumu
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Hesap Oluşturuluyor...</span>';
        btn.style.pointerEvents = 'none';
        
        try {
            const result = await registerUser(usernameInput, emailInput, passwordInput, passwordRepeat.value);

            if (result.success) {
                btn.innerHTML = '<i class="fas fa-check"></i><span>Kayıt Başarılı!</span>';
                btn.style.background = '#0a2e1a'; /* Koyu yeşil */
                btn.style.color = '#00ff88';
                
                // Login sayfasına yönlendir
                setTimeout(() => {
                    window.location.href = '/Fronted/Pages/Login.html';
                }, 1000);
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

    // Yazarken Hata Mesajını Kaldırma
    passwordRepeat.addEventListener('input', function() {
        if (passwordError.style.display === 'block') {
            passwordError.style.display = 'none';
            this.parentElement.style.borderColor = '';
        }
    });
    
    password.addEventListener('input', function() {
        if (passwordError.style.display === 'block') {
            passwordError.style.display = 'none';
            passwordRepeat.parentElement.style.borderColor = '';
        }
    });
});
