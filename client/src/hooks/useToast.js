import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const idCounter = useRef(0); // Utilisation de useRef pour un compteur persistant

    const addToast = useCallback((type, message, duration = 3000) => {
        const id = idCounter.current++; // Incrémente le compteur et assigne l'ID
        setToasts(currentToasts => [...currentToasts, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, []);

    const success = useCallback((message, duration) => addToast('success', message, duration), [addToast]);
    const error = useCallback((message, duration) => addToast('error', message, duration), [addToast]);
    const warning = useCallback((message, duration) => addToast('warning', message, duration), [addToast]);
    const info = useCallback((message, duration) => addToast('info', message, duration), [addToast]);

    const value = { toasts, removeToast, success, error, warning, info };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast doit être utilisé à l\'intérieur d\'un ToastProvider');
    }
    return context;
};