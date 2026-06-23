const API_BASE_URL_SIGNUP = `${getApiBaseUrl()}/signup`;

function getApiBaseUrl() {
    const liveServerPorts = ['5500', '5501', '5502'];
    const isLiveServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && liveServerPorts.includes(window.location.port);

    if (window.location.protocol === 'file:' || isLiveServer) {
        return 'https://localhost:7201/api';
    }

    return `${window.location.origin}/api`;
}

async function registerUser(username, email, password, passwordRepeat) {
    try {
        const response = await fetch(API_BASE_URL_SIGNUP, {
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

        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;

        if (response.ok && (!payload || payload.success !== false)) {
            return { success: true, data: payload?.data ?? payload };
        }

        return {
            success: false,
            message: payload?.error || payload?.message || 'Kayıt başarısız'
        };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, message: 'Bağlantı hatası' };
    }
}
