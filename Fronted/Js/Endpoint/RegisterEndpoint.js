const API_BASE_URL_SIGNUP = 'https://localhost:7201/api/signup';

async function registerUser(username, email, password, passwordRepeat) {
    try {
        const response = await fetch(`${API_BASE_URL_SIGNUP}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Username: username,
                Email: email,
                Password: password,
                PasswordRepeat: passwordRepeat
            })
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.text();
            return { success: false, message: errorData || 'Kayıt Başarısız' };
        }
    } catch (error) {
        return { success: false, message: 'Bağlantı Hatası' };
    }
}
