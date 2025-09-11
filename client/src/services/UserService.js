// client/src/services/UserService.js

import ApiService from './api';

class UserService {
    static async register(firstname, name, email, password) {
        try {
            const response = await ApiService.request('/users/register', {
                method: 'POST',
                body: JSON.stringify({ firstname, name, email, password })
            }, false); // <--- ici on passe le paramètre 'false'
            return response;
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            throw error;
        }
    }
}

export default UserService;