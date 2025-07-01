// Settings.jsx
import React, { useState } from 'react';
import ClassesManager from "./Class/ClassManager";
import './Settings.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('classes');

    const settingsTabs = [
        {
            id: 'classes',
            label: 'Classes',
            icon: '🏫',
            component: ClassesManager
        },
        {
            id: 'profile',
            label: 'Profil',
            icon: '👤'
        },
        {
            id: 'preferences',
            label: 'Préférences',
            icon: '⚙️'
        },
        {
            id: 'notifications',
            label: 'Notifications',
            icon: '🔔'
        },
        {
            id: 'security',
            label: 'Sécurité',
            icon: '🔒'
        }
    ];

    const renderTabContent = () => {
        const activeTabData = settingsTabs.find(tab => tab.id === activeTab);

        switch (activeTab) {
            case 'classes':
                return <ClassesManager />;
            case 'profile':
                return <ProfileSettings />;
            case 'preferences':
                return <PreferencesSettings />;
            case 'notifications':
                return <NotificationsSettings />;
            case 'security':
                return <SecuritySettings />;
            default:
                return <ClassesManager />;
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h1>⚙️ Paramètres</h1>
                <p>Gérez vos préférences et configurations</p>
            </div>

            <div className="settings-content">
                <div className="settings-sidebar">
                    <nav className="settings-nav">
                        {settingsTabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="tab-icon">{tab.icon}</span>
                                <span className="tab-label">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="settings-main">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};


// Composants placeholder pour les autres tabs
const ProfileSettings = () => (
    <div className="settings-section">
        <h2>👤 Profil</h2>
        <p>Gestion du profil utilisateur - À développer</p>
    </div>
);

const PreferencesSettings = () => (
    <div className="settings-section">
        <h2>⚙️ Préférences</h2>
        <p>Préférences générales - À développer</p>
    </div>
);

const NotificationsSettings = () => (
    <div className="settings-section">
        <h2>🔔 Notifications</h2>
        <p>Paramètres de notifications - À développer</p>
    </div>
);

const SecuritySettings = () => (
    <div className="settings-section">
        <h2>🔒 Sécurité</h2>
        <p>Paramètres de sécurité - À développer</p>
    </div>
);

export default Settings;
