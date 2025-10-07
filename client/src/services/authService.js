// frontend/src/services/authService.js
import ApiService from './api'; // Votre service API centralisé

class AuthService {
    static async login(username, password, rememberMe) { // Ajout du paramètre rememberMe
        try {
            const response = await ApiService.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password, rememberMe })
            }, false);
            if (response.success) {
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            return response;
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error; // L'erreur sera déjà le message du backend grâce à ApiService
        }
    }

    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    static getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    static getToken() {
        return localStorage.getItem('authToken');
    }
}

export default AuthService;