// Settings.jsx
import React, { useState } from 'react';
import ClassesManager from "./Class/ClassManager";
import ScheduleManager from "./Schedule/ScheduleManager";
import HolidaysManager from "./holidays/HolidaysManager";
import JournalManager from "../journal/JournalManager";
import AttributionManager from "./Attribution/AttributionManager";
import StudentManager from "./Student/StudentManager";

const Settings = () => {
    const [activeTab, setActiveTab] = useState('classes');

    const settingsTabs = [
        { id: 'classes', label: 'Classes', icon: '🏫' },
        { id: 'students', label: 'Élèves', icon: '👥' },
        { id: 'schedule', label: 'Horaire', icon: '⏰' },
        { id: 'journals', label: 'Journaux', icon: '📚' },
        { id: 'holidays', label: 'Calendrier', icon: '📅' },
        { id: 'attributions', label: 'Attributions', icon: '💼' },

    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'classes': return <ClassesManager />;
            case 'students': return <StudentManager />;
            case 'schedule': return <ScheduleManager />;
            case 'holidays': return <HolidaysManager />;
            case 'journals': return <JournalManager />;
            case 'attributions': return <AttributionManager />;
            default: return <ClassesManager />;
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

export default Settings;
