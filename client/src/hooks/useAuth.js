import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const navigate = useNavigate();

    const logout = useCallback(() => {
        AuthService.logout();
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
    }, [navigate]);

    useEffect(() => {
        const storedUser = AuthService.getCurrentUser();
        if (storedUser) {
            setUser(storedUser);
            setIsAuthenticated(true);
        }
        setLoadingAuth(false);

        // Écouter les erreurs d'authentification globales
        const handleAuthError = () => {
            logout();
        };
        window.addEventListener('auth-error', handleAuthError);

        return () => {
            window.removeEventListener('auth-error', handleAuthError);
        };
    }, [logout]);

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
            return { success: false, message: error.message || 'Erreur inconnue' };
        }
    }, []);

    const value = { user, isAuthenticated, loadingAuth, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
    }
    return context;
};