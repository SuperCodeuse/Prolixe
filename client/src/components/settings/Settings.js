// Settings.jsx
import React, { useState } from 'react';
//import ClassesManager from './ClassesManager';
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

// Composant pour gérer les classes
const ClassesManager = () => {
    const [classes, setClasses] = useState([
        { id: 1, name: '6ème A', level: '6ème', students: 28, subject: 'Mathématiques' },
        { id: 2, name: '5ème B', level: '5ème', students: 25, subject: 'Français' },
        { id: 3, name: '4ème C', level: '4ème', students: 30, subject: 'Histoire' },
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        level: '',
        students: '',
        subject: ''
    });

    const levels = ['1ère', '2ème', '3ème', '4ème', '5ème', 'Rhétos'];
    const subjects = ['Programmation', 'Informatique', 'Ex.Logiciels', 'Base de données'];

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingClass) {
            setClasses(classes.map(cls =>
                cls.id === editingClass.id
                    ? { ...editingClass, ...formData, students: parseInt(formData.students) }
                    : cls
            ));
            setEditingClass(null);
        } else {
            const newClass = {
                id: Date.now(),
                ...formData,
                students: parseInt(formData.students)
            };
            setClasses([...classes, newClass]);
        }

        setFormData({ name: '', level: '', students: '', subject: '' });
        setShowAddForm(false);
    };

    const handleEdit = (classItem) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name,
            level: classItem.level,
            students: classItem.students.toString(),
            subject: classItem.subject
        });
        setShowAddForm(true);
    };

    const handleDelete = (id) => {
        setClasses(classes.filter(cls => cls.id !== id));
    };

    const resetForm = () => {
        setFormData({ name: '', level: '', students: '', subject: '' });
        setShowAddForm(false);
        setEditingClass(null);
    };

    return (
        <div className="classes-manager">
            <div className="classes-header">
                <h2>🏫 Gestion des Classes</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddForm(true)}
                >
                    <span>➕</span> Ajouter une classe
                </button>
            </div>

            {showAddForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editingClass ? 'Modifier la classe' : 'Ajouter une nouvelle classe'}</h3>
                            <button className="modal-close" onClick={resetForm}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="class-form">
                            <div className="form-group">
                                <label>Nom de la classe</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: 6ème A"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Niveau</label>
                                    <select
                                        value={formData.level}
                                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                                        required
                                    >
                                        <option value="">Sélectionner</option>
                                        {levels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Nombre d'élèves</label>
                                    <input
                                        type="number"
                                        value={formData.students}
                                        onChange={(e) => setFormData({...formData, students: e.target.value})}
                                        placeholder="25"
                                        min="1"
                                        max="40"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Matière principale</label>
                                <select
                                    value={formData.subject}
                                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                    required
                                >
                                    <option value="">Sélectionner</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={resetForm}>
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingClass ? 'Modifier' : 'Ajouter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="classes-grid">
                {classes.map(classItem => (
                    <div key={classItem.id} className="class-card">
                        <div className="class-card-header">
                            <h3>{classItem.name}</h3>
                            <div className="class-actions">
                                <button
                                    className="btn-edit"
                                    onClick={() => handleEdit(classItem)}
                                    title="Modifier"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDelete(classItem.id)}
                                    title="Supprimer"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>

                        <div className="class-info">
                            <div className="info-item">
                                <span className="info-label">Niveau:</span>
                                <span className="info-value">{classItem.level}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Élèves:</span>
                                <span className="info-value">{classItem.students}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Matière:</span>
                                <span className="info-value">{classItem.subject}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {classes.length === 0 && (
                <div className="empty-state">
                    <span className="empty-icon">🏫</span>
                    <h3>Aucune classe</h3>
                    <p>Commencez par ajouter vos premières classes</p>
                </div>
            )}
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
