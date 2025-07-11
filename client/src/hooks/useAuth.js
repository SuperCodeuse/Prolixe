import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

// 1. Créer le contexte d'authentification
const AuthContext = createContext(null);

// 2. Créer le fournisseur (Provider)
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const navigate = useNavigate();

    // Vérifier si l'utilisateur est déjà connecté au chargement
    useEffect(() => {
        const storedUser = AuthService.getCurrentUser();
        if (storedUser) {
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
                // La redirection est gérée par le useEffect dans App.jsx, c'est bien.
                return { success: true };
            } else {
                return { success: false, message: response.message || 'Échec de la connexion' };
            }
        } catch (error) {
            return { success: false, message: error.message || 'Erreur inconnue' };
        }
    }, []);

    // Fonction de déconnexion
    const logout = useCallback(() => {
        AuthService.logout();
        setUser(null);
        setIsAuthenticated(false);
        // Redirige explicitement vers la page de connexion
        navigate('/login', { replace: true });
    }, [navigate]);

    // La valeur qui sera partagée
    const value = { user, isAuthenticated, loadingAuth, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Le hook personnalisé pour consommer le contexte
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }
    return context;
};