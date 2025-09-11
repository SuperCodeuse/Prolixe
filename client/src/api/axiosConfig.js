// C:/Temp/Prolixe/client/src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Intercepteur pour ajouter le token JWT à chaque requête
apiClient.interceptors.request.use(
    (config) => {
        // Récupère le token depuis le localStorage (ou l'endroit où vous le stockez)
        const token = localStorage.getItem('authToken');
        console.log('Token:', token);
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;