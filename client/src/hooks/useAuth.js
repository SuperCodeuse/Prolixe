// frontend/src/hooks/useAuth.js
import { useState, useEffect, useCallback } from 'react';
import AuthService from '../services/authService';

export const useAuth = () => {
    const [user, setUser] = useState(null); // Stocke l'objet utilisateur si authentifié
    const [isAuthenticated, setIsAuthenticated] = useState(false); // État de l'authentification
    const [loadingAuth, setLoadingAuth] = useState(true); // État de chargement initial de l'authentification

    // Vérifier l'état d'authentification au chargement de l'application
    useEffect(() => {
        const storedUser = AuthService.getCurrentUser();
        const storedToken = AuthService.getToken();

        if (storedUser && storedToken) {
            // Dans une vraie application, vous vérifieriez ici la validité du token avec le backend
            // Pour ce basique, la présence du token et de l'utilisateur est suffisante.
            setUser(storedUser);
            setIsAuthenticated(true);
        }
        setLoadingAuth(false);
    }, []);

    // Fonction de connexion
    const login = useCallback(async (username, password) => {
        try {
            const response = await AuthService.login(username, password);
            if (response.success) {
                setUser(response.user);
                setIsAuthenticated(true);
                return { success: true };
            } else {
                return { success: false, message: response.message || 'Échec de la connexion' };
            }
        } catch (error) {
            console.error('Erreur de connexion dans useAuth:', error);
            return { success: false, message: error || 'Erreur inconnue lors de la connexion' };
        }
    }, []);

    // Fonction de déconnexion
    const logout = useCallback(() => {
        AuthService.logout();
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    return {
        user,
        isAuthenticated,
        loadingAuth,
        login,
        logout
    };
};