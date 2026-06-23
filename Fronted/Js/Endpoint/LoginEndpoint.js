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

function unwrapApiResponse(payload) {
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
        return payload;
    }

    return { success: true, data: payload, error: null };
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Username: username,
                PasswordHash: password
            })
        });

        const text = await response.text();
        const payload = text ? unwrapApiResponse(JSON.parse(text)) : { success: response.ok, data: null, error: null };

        if (response.ok && payload.success) {
            return { success: true, data: payload.data };
        }

        return {
            success: false,
            message: payload.error || payload.message || 'Giriş başarısız'
        };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Bağlantı hatası' };
    }
}
