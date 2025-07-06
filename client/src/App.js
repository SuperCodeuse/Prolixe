// App.jsx
import React, { useState, useEffect } from 'react'; // Importez useEffect
import SideMenu from './components/navigation/SideMenu';
import Settings from './components/settings/Settings';
import Dashboard from './components/dashboard/Dashboard';
import Horaire from "./components/horaire/Horaire";
import Journal from "./components/journal/Journal";

import './App.scss';

const App = () => {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const breakpoint = 1600; // Définissez votre breakpoint pour basculer le comportement du menu

    // isMenuOpen: vrai si grand écran, faux si petit écran par défaut
    const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= breakpoint);

    // Effet pour détecter la taille de l'écran et ajuster l'état du menu
    useEffect(() => {
        const handleResize = () => {
            // Si la fenêtre est plus petite que le breakpoint, le menu est fermé (pour mobile)
            // Sinon, il est ouvert (pour les écrans larges)
            setIsMenuOpen(window.innerWidth >= breakpoint);
        };

        window.addEventListener('resize', handleResize);
        // Nettoyage de l'event listener au démontage du composant
        return () => window.removeEventListener('resize', handleResize);
    }, []); // S'exécute une seule fois au montage pour configurer l'event listener

    // Fonction pour basculer l'état ouvert/fermé du menu
    const toggleMenu = () => {
        setIsMenuOpen(prev => !prev);
    };

    // Fonction pour rendre le composant de la page actuelle
    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'journal':
                return <Journal />;
            case 'horaire':
                return <Horaire />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        // Ajoute une classe CSS ('menu-open' ou 'menu-closed') à la div racine 'app'
        // pour permettre des styles globaux basés sur l'état du menu.
        <div className={`app ${isMenuOpen ? 'menu-open' : 'menu-closed'}`}>

            {/* Overlay qui apparaît quand le menu est ouvert sur les petits écrans */}
            {/* Clique sur l'overlay pour fermer le menu */}
            {isMenuOpen && window.innerWidth < breakpoint && (
                <div className="sidemenu-overlay" onClick={toggleMenu}></div>
            )}

            {/* Side Menu - Passe l'état d'ouverture et la fonction de bascule */}
            <SideMenu
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                isMenuOpen={isMenuOpen}
                toggleMenu={toggleMenu}
            />

            <main className="main-content">
                {/* Bouton burger pour ouvrir/fermer le menu sur les petits écrans */}
                {/* Positionné fixed, donc hors du flux normal */}
                <button className="menu-toggle-button" onClick={toggleMenu}>
                    {isMenuOpen ? '✕' : '☰'} {/* Affiche 'X' si ouvert, '☰' si fermé */}
                </button>

                {renderCurrentPage()} {/* Contenu de la page actuelle */}
            </main>
        </div>
    );
};

export default App;