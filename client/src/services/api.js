// client/src/services/api.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = localStorage.getItem('token');

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                // Si le token est invalide (401/403), on notifie l'application
                if (response.status === 401 || response.status === 403) {
                    // Dispatch a global event that the AuthProvider can listen to.
                    window.dispatchEvent(new Event('auth-error'));
                }
                const data = await response.json();
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            // Si la réponse n'a pas de contenu (ex: 204 No Content)
            if (response.status === 204) {
                return { success: true };
            }

            return await response.json();

        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }
}

export default ApiService;
