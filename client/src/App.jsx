// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SideMenu from './components/navigation/SideMenu';
import Settings from './components/settings/Settings';
import Dashboard from './components/dashboard/Dashboard';
import Horaire from "./components/horaire/Horaire";
import Journal from "./components/journal/Journal";
import Login from './components/authentification/login';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast'; // Import du hook
import Toast from './components/Toast';     // Import du composant

import './App.scss';

// ... (le composant AuthenticatedAppContent ne change pas)
const AuthenticatedAppContent = ({ isMenuOpen, toggleMenu }) => {
    const breakpoint = 1600;
    return (
        <>
            {isMenuOpen && window.innerWidth < breakpoint && (
                <div className="sidemenu-overlay" onClick={toggleMenu}></div>
            )}

            <SideMenu isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} />
            <main className="main-content">
                <button className="menu-toggle-button" onClick={toggleMenu}>
                    {isMenuOpen ? '✕' : '☰'}
                </button>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/horaire" element={<Horaire />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main>
        </>
    );
};

// Composant principal
const App = () => {
    const { isAuthenticated, loadingAuth } = useAuth();
    const navigate = useNavigate();
    const { toasts, removeToast } = useToast(); // Récupération des toasts

    const breakpoint = 1600;
    const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= breakpoint);

    useEffect(() => {
        const handleResize = () => setIsMenuOpen(window.innerWidth >= breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleMenu = () => setIsMenuOpen(prev => !prev);

    useEffect(() => {
        if (!loadingAuth) {
            const currentPath = window.location.pathname;
            if (isAuthenticated) {
                if (currentPath === '/login' || currentPath === '/') {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                if (currentPath !== '/login') {
                    navigate('/login', { replace: true });
                }
            }
        }
    }, [isAuthenticated, loadingAuth, navigate]);

    if (loadingAuth) {
        return <div className="loading-fullscreen">Chargement...</div>;
    }

    return (
        <div className={`app ${isMenuOpen ? 'menu-open' : 'menu-closed'}`}>
            {isAuthenticated ? (
                <AuthenticatedAppContent
                    isMenuOpen={isMenuOpen}
                    toggleMenu={toggleMenu}
                />
            ) : (
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            )}

            {/* --- CONTENEUR DE NOTIFICATIONS GLOBAL --- */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default App;