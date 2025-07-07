// components/navigation/SideMenu.js
import React, { useState } from 'react'; // Importez useState pour l'état du menu déroulant
import { NavLink } from 'react-router-dom'; // NavLink pour la navigation
import { useAuth } from '../../hooks/useAuth'; // Hook d'authentification

import './SideMenu.scss'; // Styles du SideMenu

// Composant SideMenu
// Reçoit l'état d'ouverture/fermeture du menu principal (isMenuOpen)
// et la fonction pour basculer (toggleMenu)
const SideMenu = ({ isMenuOpen, toggleMenu }) => {
    // Récupère la fonction de déconnexion du hook useAuth
    const { logout } = useAuth();
    const breakpoint = 1600;
    // État local pour contrôler la visibilité du menu déroulant de déconnexion
    const [isLogoutDropdownOpen, setIsLogoutDropdownOpen] = useState(false);

    // Liste des éléments du menu de navigation
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
        { id: 'journal', label: 'Journal', icon: '📝', path: '/journal' },
        { id: 'horaire', label: 'Emploi du temps', icon: '⏰', path: '/horaire' },
        { id: 'settings', label: 'Paramètres', icon: '⚙️', path: '/settings' }
    ];

    // Gère le clic sur un élément du menu de navigation
    const handleMenuItemClick = () => {
        if (window.innerWidth < breakpoint) {
            toggleMenu();
        }
        setIsLogoutDropdownOpen(false);
    };

    // Gère la déconnexion
    const handleLogout = () => {
        logout();
        // Ferme le menu déroulant de déconnexion
        setIsLogoutDropdownOpen(false);
        // Ferme le menu principal si sur mobile après déconnexion
        if (window.innerWidth < breakpoint) {
            toggleMenu();
        }
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

            <nav className="sidemenu-nav">
                <ul className="menu-list">
                    {menuItems.map(item => (
                        <li key={item.id} className="menu-item">
                            {/* NavLink pour la navigation interne avec style actif automatique */}
                            <NavLink
                                to={item.path}
                                className="menu-link"
                                onClick={handleMenuItemClick} // Gère le clic pour la navigation et la fermeture
                            >
                                <span className="menu-icon">{item.icon}</span>
                                <span className="menu-label">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidemenu-footer">
                {/* Conteneur pour le profil utilisateur et le menu déroulant de déconnexion */}
                {/* Ajoute la classe 'active' si le dropdown est ouvert */}
                <div className={`user-menu-dropdown ${isLogoutDropdownOpen ? 'active' : ''}`}>
                    {/* Zone du profil utilisateur, cliquable pour basculer le dropdown */}
                    <div className="user-profile" onClick={handleUserProfileClick}>
                        <div className="user-avatar">AD</div> {/* Avatar de l'utilisateur */}
                        <div className="user-info">
                            <span className="user-name">Admin User</span>
                            <span className="user-role">Administrateur</span>
                        </div>
                        {/* Indicateur de flèche pour le dropdown */}
                        <span className="dropdown-arrow"></span>
                    </div>

                    {/* Contenu du menu déroulant (le bouton de déconnexion) */}
                    <div className="dropdown-content">
                        <button onClick={handleLogout} className="logout-btn">
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SideMenu;
