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
import { useToast } from './hooks/useToast'; // AJOUTÉ : Import du hook pour les toasts
import Toast from './components/Toast';     // AJOUTÉ : Import du composant Toast

import './App.scss';

// Composant pour le contenu de l'application une fois authentifié
const breakpoint = 1600;
const AuthenticatedAppContent = ({ isMenuOpen, toggleMenu }) => {
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

// Composant principal de l'application
const App = () => {
    const { isAuthenticated, loadingAuth } = useAuth();
    const navigate = useNavigate();
    const { toasts, removeToast } = useToast(); // AJOUTÉ : Récupération des toasts

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
            if (isAuthenticated) {
                if (window.location.pathname === '/login' || window.location.pathname === '/') {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                if (window.location.pathname !== '/login') {
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