const API_BASE_URL = 'https://localhost:7201/api';

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Username: username,
                PasswordHash: password // Arka uç LoginModels PasswordHash bekliyor
            })
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.text();
            return { success: false, message: errorData || 'Giriş Başarısız' };
        }
    } catch (error) {
        return { success: false, message: 'Bağlantı Hatası' };
    }
}
