import React, { useState } from 'react';
import './SideMenu.scss';

const SideMenu = ({ currentPage, onPageChange }) => {
    const menuItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: '📊',
            path: '/dashboard'
        },
        {
            id: 'journal',
            label: 'Journal',
            icon: '📖',
            path: '/journal'
        },
        {
            id: 'horaire',
            label: 'Emploi du temps',
            icon: '📅',
            path: '/horaire'
        },
        {
            id: 'skore',
            label: 'Corrections',
            icon: '✅',
            path: '/skore'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: '⚙️',
            path: '/settings'
        }
    ];

    const handleItemClick = (itemId) => {
        onPageChange(itemId);
    };

    return (
        <div className="sidemenu">
            <div className="sidemenu-header">
                <div className="logo">
                    <span className="logo-icon">🎓</span>
                    <span className="logo-text">Prolixe</span>
                </div>
            </div>

            <nav className="sidemenu-nav">
                <ul className="menu-list">
                    {menuItems.map((item) => (
                        <li key={item.id} className="menu-item">
                            <a
                                href={item.path}
                                className={`menu-link ${currentPage === item.id ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleItemClick(item.id);
                                }}
                            >
                                <span className="menu-icon">{item.icon}</span>
                                <span className="menu-label">{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidemenu-footer">
                <div className="user-profile">
                    <div className="user-avatar">👤</div>
                    <div className="user-info">
                        <span className="user-name">DEGUELDRE</span>
                        <span className="user-role">Jedi</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SideMenu;
