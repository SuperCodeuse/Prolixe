// frontend/src/components/Settings/ClassesManager.jsx
import React, { useState } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import Toast from '../../Toast';
import ConfirmModal from '../../ConfirmModal';
import { useToast } from '../../../hooks/useToast';

const ClassesManager = () => {
    const { classes, loading, error, addClass, updateClass, removeClass } = useClasses();
    const { toasts, removeToast, success, error: showError, warning } = useToast();

    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        students: '',
        subject: '',
        level: '', // <-- NOUVEAU : champ level
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // Données fictives pour les matières
    const lesson = ['Informatique', 'Exp.logiciels', 'Programmation', 'Database'];
    // NOUVEAU : Données fictives pour les niveaux
    const levels = [3, 4, 5, 6];

    // Fonction pour afficher la modal de confirmation
    const showConfirmModal = (title, message, onConfirm) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm
        });
    };

    // Fermer la modal de confirmation
    const closeConfirmModal = () => {
        setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null
        });
    };

    // Réinitialiser les champs du formulaire et fermer la modale
    const resetForm = () => {
        setFormData({
            name: '',
            students: '',
            subject: '',
            level: '', // <-- NOUVEAU : réinitialiser level
        });
        setEditingClass(null);
        setShowAddForm(false);
    };

    // Validation du formulaire avec messages d'erreur détaillés
    const validateForm = () => {
        const errors = [];

        if (!formData.name.trim()) {
            errors.push('Le nom de la classe est requis');
        } else if (formData.name.trim().length < 2) {
            errors.push('Le nom de la classe doit contenir au moins 2 caractères');
        }

        if (!formData.students) {
            errors.push('Le nombre d\'élèves est requis');
        } else if (isNaN(formData.students) || parseInt(formData.students) <= 0) {
            errors.push('Le nombre d\'élèves doit être un nombre positif');
        } else if (parseInt(formData.students) > 50) {
            errors.push('Le nombre d\'élèves ne peut pas dépasser 50');
        }

        if (!formData.subject) {
            errors.push('La matière principale est requise');
        }

        // <-- NOUVELLE VALIDATION POUR LE NIVEAU
        if (!formData.level) {
            errors.push('Le niveau est requis');
        } else if (!levels.includes(parseInt(formData.level))) {
            errors.push('Le niveau sélectionné est invalide');
        }

        // Vérification des doublons (uniquement pour l'ajout ou si le nom a changé)
        const isDuplicate = classes.some(cls =>
            cls.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
            (!editingClass || cls.id !== editingClass.id)
        );

        if (isDuplicate) {
            errors.push(`Une classe avec le nom "${formData.name}" existe déjà`);
        }

        if (errors.length > 0) {
            errors.forEach(errorMsg => {
                showError(errorMsg, 4000);
            });
            return false;
        }

        return true;
    };

    // Validation en temps réel des champs
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Validation en temps réel pour le nombre d'élèves
        if (field === 'students' && value) {
            const numStudents = parseInt(value);
            if (isNaN(numStudents) || numStudents <= 0) {
                warning('Le nombre d\'élèves doit être un nombre positif');
            } else if (numStudents > 50) {
                warning('Attention : nombre d\'élèves très élevé (max recommandé: 50)');
            }
        }
    };

    // Gérer la soumission du formulaire
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (editingClass) {
                await updateClass(editingClass.id, formData);
                success(`Classe "${formData.name}" modifiée avec succès !`);
            } else {
                await addClass(formData);
                success(`Classe "${formData.name}" ajoutée avec succès !`);
            }
            resetForm();
        } catch (err) {
            console.error('Erreur:', err);
            showError(`Erreur lors de ${editingClass ? 'la modification' : 'l\'ajout'} de la classe: ${err.message}`);
        }
    };

    // Gérer la modification d'une classe
    const handleEdit = (classItem) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name || '',
            students: classItem.students || '',
            subject: classItem.subject || classItem.lesson || '',
            level: classItem.level || '', // <-- NOUVEAU : récupérer le niveau
        });
        setShowAddForm(true);
    };

    // Gérer l'annulation avec confirmation si formulaire modifié
    const handleCancelForm = () => {
        const isFormDirty = formData.name.trim() || formData.students || formData.subject || formData.level; // <-- NOUVEAU : inclure level

        if (isFormDirty) {
            showConfirmModal(
                'Annuler les modifications',
                'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir annuler ?',
                () => {
                    resetForm();
                    closeConfirmModal();
                }
            );
        } else {
            resetForm();
        }
    };

    // Gérer la suppression avec confirmation
    const handleDelete = (classItem) => {
        const studentCount = classItem.students;
        const warningMessage = studentCount > 0
            ? `Cette classe contient ${studentCount} élève${studentCount > 1 ? 's' : ''}.\n\n`
            : '';

        showConfirmModal(
            'Supprimer la classe',
            `${warningMessage}Êtes-vous sûr de vouloir supprimer définitivement la classe "${classItem.name}" ?\n\nCette action est irréversible.`,
            () => performDelete(classItem.id, classItem.name)
        );
    };

    // Effectuer la suppression
    const performDelete = async (id, className) => {
        try {
            await removeClass(id);
            success(`Classe "${className}" supprimée avec succès !`);
            closeConfirmModal();
        } catch (err) {
            console.error('Erreur suppression:', err);
            showError(`Erreur lors de la suppression: ${err.message}`);
            closeConfirmModal();
        }
    };

    // Gestion des états de chargement et d'erreur
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
                {/* Toasts même en cas d'erreur */}
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
    }

    return (
        <div className="classes-manager">
            <div className="classes-header">
                <h2>🏫 Gestion des Classes</h2>
                <button
                    className="btn-primary"
                    onClick={() => {
                        resetForm();
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
                            <button className="modal-close" onClick={handleCancelForm}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="class-form">
                            <div className="form-group">
                                <label>Nom de la classe</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="Ex: 6ème A"
                                    required
                                    autoFocus
                                    maxLength={50}
                                />
                                <small className="form-hint">
                                    {formData.name.length}/50 caractères
                                </small>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre d'élèves</label>
                                    <input
                                        type="number"
                                        value={formData.students}
                                        onChange={(e) => handleInputChange('students', e.target.value)}
                                        placeholder="25"
                                        min="1"
                                        max="50"
                                        required
                                    />
                                    <small className="form-hint">
                                        Entre 1 et 50 élèves
                                    </small>
                                </div>

                                {/* NOUVEAU : Champ pour le niveau */}
                                <div className="form-group">
                                    <label>Niveau</label>
                                    <select
                                        value={formData.level}
                                        onChange={(e) => handleInputChange('level', e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un niveau</option>
                                        {levels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Matière principale</label>
                                <select
                                    value={formData.subject}
                                    onChange={(e) => handleInputChange('subject', e.target.value)}
                                    required
                                >
                                    <option value="">Sélectionner une matière</option>
                                    {lesson.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCancelForm}
                                >
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingClass ? '✏️ Modifier' : '➕ Ajouter'}
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
                        <button
                            className="btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            ➕ Ajouter ma première classe
                        </button>
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
                                        title="Modifier la classe"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDelete(classItem)}
                                        title="Supprimer la classe"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <div className="class-info">
                                <div className="info-item">
                                    <span className="info-label">👥 Élèves:</span>
                                    <span className="info-value">{classItem.students}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">🎓 Niveau:</span>
                                    <span className="info-value">{classItem.level}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">📚 Matière:</span>
                                    <span className="info-value">{classItem.subject}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Affichage des toasts */}
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

            {/* Modal de confirmation */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Confirmer"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    );
};

export default ClassesManager;