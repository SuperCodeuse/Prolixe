// client/src/services/api.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        };

        try {
            console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            console.log('✅ API Response:', data);
            return data;

        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }
}

export default ApiService;
