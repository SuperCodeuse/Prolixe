// frontend/src/components/Settings/ClassesManager.jsx - MISE À JOUR
import React, { useState } from 'react';
import { useClasses } from '../../../hooks/useClasses';

const ClassesManager = () => {
    const { classes, loading, error, addClass, updateClass, removeClass } = useClasses();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null); // Stocke l'objet classe en cours de modification
    const [formData, setFormData] = useState({
        name: '',
        level: '',
        students: '',
        subject: '',
    });

    // Données fictives pour les niveaux et les matières - à remplacer par les données réelles de votre backend si disponibles
    const levels = ['Maternelle', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale'];
    const subjects = ['Mathématiques', 'Français', 'Histoire-Géographie', 'Sciences', 'Anglais', 'Physique-Chimie', 'SVT', 'Espagnol', 'Allemand', 'Arts Plastiques', 'Musique', 'EPS'];

    // Réinitialiser les champs du formulaire et fermer la modale
    const resetForm = () => {
        setFormData({
            name: '',
            level: '',
            students: '',
            subject: '',
        });
        setEditingClass(null);
        setShowAddForm(false);
    };

    // Gérer la soumission du formulaire pour ajouter ou modifier une classe
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.level || !formData.students || !formData.subject) {
            alert('Veuillez remplir tous les champs.');
            return;
        }

        try {
            if (editingClass) {
                // Mettre à jour une classe existante
                await updateClass(editingClass.id, formData);
                alert('Classe modifiée avec succès !');
            } else {
                // Ajouter une nouvelle classe
                await addClass(formData);
                alert('Classe ajoutée avec succès !');
            }
            resetForm();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    };

    // Gérer la modification d'une classe : ouvrir la modale et pré-remplir le formulaire
    const handleEdit = (classItem) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name,
            level: classItem.level,
            students: classItem.students,
            subject: classItem.subject,
        });
        setShowAddForm(true);
    };

    // Gérer la suppression d'une classe
    const handleDelete = async (id, className) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la classe "${className}" ?`)) {
            try {
                await removeClass(id);
                alert('Classe supprimée avec succès !');
            } catch (error) {
                alert(`Erreur: ${error.message}`);
            }
        }
    };

    if (loading) {
        return (
            <div className="classes-manager">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Chargement des classes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="classes-manager">
                <div className="error">
                    <h3>❌ Erreur</h3>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="classes-manager">
            <div className="classes-header">
                <h2>🏫 Gestion des Classes</h2>
                <button
                    className="btn-primary"
                    onClick={() => {
                        resetForm(); // S'assurer que le formulaire est vide lors de l'ajout
                        setShowAddForm(true);
                    }}
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
                                    autoFocus
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
                {classes.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🏫</span>
                        <h3>Aucune classe</h3>
                        <p>Commencez par ajouter vos premières classes !</p>
                    </div>
                ) : (
                    classes.map(classItem => (
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
                                        onClick={() => handleDelete(classItem.id, classItem.name)}
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
                    ))
                )}
            </div>
        </div>
    );
};

export default ClassesManager;