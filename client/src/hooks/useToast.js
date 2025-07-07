import React, { createContext, useContext, useState, useCallback } from 'react';

// 1. Création du Contexte pour les toasts
const ToastContext = createContext(null);

// 2. Création du Fournisseur (Provider) qui contiendra la logique et l'état
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [idCounter, setIdCounter] = useState(0);

    const addToast = useCallback((type, message, duration = 3000) => {
        const id = idCounter;
        setToasts(currentToasts => [...currentToasts, { id, message, type, duration }]);
        setIdCounter(prev => prev + 1);
    }, [idCounter]);

    const removeToast = useCallback((id) => {
        setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, []);

    // Fonctions pour les différents types de toasts
    const success = useCallback((message, duration) => addToast('success', message, duration), [addToast]);
    const error = useCallback((message, duration) => addToast('error', message, duration), [addToast]);
    const warning = useCallback((message, duration) => addToast('warning', message, duration), [addToast]);
    const info = useCallback((message, duration) => addToast('info', message, duration), [addToast]);

    // La valeur partagée avec tous les composants enfants
    const value = { toasts, removeToast, success, error, warning, info };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};

// 3. Le hook `useToast` que vos composants continueront d'utiliser
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast doit être utilisé à l\'intérieur d\'un ToastProvider');
    }
    return context;
};