const API_BASE_URL = (window.location.protocol === 'file:') ? 'https://localhost:7201/api' : `${window.location.origin}/api`;

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Username: username,
                PasswordHash: password
            })
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, data: data };
        } else {
            const errorText = await response.text();
            let errorMessage = 'Giriş Başarısız';
            try {
                if (errorText.trim().startsWith('{')) {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.Message || errorMessage;
                } else {
                    errorMessage = errorText || errorMessage;
                }
            } catch (e) {
                if (errorText) errorMessage = errorText;
            }
            return { success: false, message: errorMessage };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Bağlantı Hatası' };
    }
}
