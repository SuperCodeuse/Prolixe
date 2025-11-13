import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const idCounter = useRef(0);

    const addToast = useCallback((type, message, duration = 3000) => {
        const id = idCounter.current++;
        setToasts(currentToasts => [...currentToasts, { id, message, type, duration }]);
        // MODIFICATION : Retourner l'ID du toast
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, []);

    // MODIFICATION : Les fonctions de type retournent l'ID de addToast
    const success = useCallback((message, duration) => addToast('success', message, duration), [addToast]);
    const error = useCallback((message, duration) => addToast('error', message, duration), [addToast]);
    const warning = useCallback((message, duration) => addToast('warning', message, duration), [addToast]);
    const info = useCallback((message, duration) => addToast('info', message, duration), [addToast]);

    // MODIFICATION : Exposer removeToast dans le contexte
    const value = { toasts, removeToast, success, error, warning, info };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    // La correction est ici : on utilise bien ToastContext
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};