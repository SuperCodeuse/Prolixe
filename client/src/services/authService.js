// frontend/src/services/authService.js
import ApiService from './api'; // Votre service API centralisé

class AuthService {
    static async login(username, password) {
        try {
            const response = await ApiService.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            // Stocker le token et les infos utilisateur si la connexion est réussie
            if (response.success) {
                localStorage.setItem('userToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            return response;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error; // L'erreur sera déjà le message du backend grâce à ApiService
        }
    }

    static logout() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
    }

    static getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static getToken() {
        return localStorage.getItem('userToken');
    }
}

export default AuthService;