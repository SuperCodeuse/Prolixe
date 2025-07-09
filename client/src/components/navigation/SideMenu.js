// components/navigation/SideMenu.js
import React, { useState } from 'react'; // Importez useState pour l'état du menu déroulant
import { NavLink } from 'react-router-dom'; // NavLink pour la navigation
import { useAuth } from '../../hooks/useAuth'; // Hook d'authentification

import './SideMenu.scss'; // Styles du SideMenu

const SideMenu = ({ isMenuOpen, toggleMenu }) => {

    const { logout, user } = useAuth()
    const [isLogoutDropdownOpen, setIsLogoutDropdownOpen] = useState(false);

    // Liste des éléments du menu de navigation
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { id: 'journal', label: 'Journal', icon: '📝', path: '/journal' },
        { id: 'horaire', label: 'Emploi du temps', icon: '⏰', path: '/horaire' },
        { id: 'correction', label: 'Correction', icon: '✅', path: '/correction' },
        { id: 'settings', label: 'Paramètres', icon: '⚙️', path: '/settings' }
    ];

    // Gère le clic sur un élément du menu de navigation
    const handleMenuItemClick = () => {
        setIsLogoutDropdownOpen(false);
    };

    // Gère la déconnexion
    const handleLogout = () => {
        logout();
        setIsLogoutDropdownOpen(false);
    };

    // Gère le clic sur la zone du profil utilisateur pour basculer le menu déroulant
    const handleUserProfileClick = () => {
        setIsLogoutDropdownOpen(prev => !prev);
    };

    return (
        // Applique des classes CSS dynamiques basées sur l'état du menu (open/closed)
        <div className={`sidemenu ${isMenuOpen ? 'open' : 'closed'}`}>
            <div className="sidemenu-header">
                <div className="logo">
                    <span className="logo-icon">🎓</span> {/* Icône du logo */}
                    <span className="logo-text">Prolixe</span> {/* Texte du logo */}
                </div>
            </div>

            <div className="sidemenu-content">
                <nav className="sidemenu-nav">
                    <ul className="menu-list">
                        {menuItems.map(item => (
                            <li key={item.id} className="menu-item">
                                <NavLink
                                    to={item.path}
                                    className="menu-link"
                                    onClick={handleMenuItemClick}
                                >
                                    <span className="menu-icon">{item.icon}</span>
                                    <span className="menu-label">{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="sidemenu-footer">
                    <div className={`user-menu-dropdown ${isLogoutDropdownOpen ? 'active' : ''}`}>
                        <div className="user-profile" onClick={handleUserProfileClick}>
                            <div className="user-avatar">{user?.firstname[0]}{user?.name[0]}</div>
                            <div className="user-info">
                                <span className="user-name">{user?.name }</span>
                                <span className="user-role">{user?.role}</span>
                            </div>
                            <span className="dropdown-arrow"></span>
                        </div>

                        <div className="dropdown-content">
                            <button onClick={handleLogout} className="logout-btn">
                                Déconnexion
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SideMenu;
