// C:/Temp/Prolixe/client/src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
    // Assurez-vous que REACT_APP_API_URL est défini dans votre fichier .env.local
    // Exemple: REACT_APP_API_URL=http://localhost:5000
    baseURL: process.env.REACT_APP_API_URL,
});

// Intercepteur pour ajouter le token JWT à chaque requête
apiClient.interceptors.request.use(
    (config) => {
        // Récupère le token depuis le localStorage (ou l'endroit où vous le stockez)
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default apiClient;