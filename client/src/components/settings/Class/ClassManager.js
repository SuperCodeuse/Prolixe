import React, { useState, useEffect } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import { useToast } from '../../../hooks/useToast';
import ConfirmModal from '../../ConfirmModal';
import { useJournal } from '../../../hooks/useJournal';

const ClassesManager = () => {
    // Le journal actif est la source de vérité
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id;

    // Le hook useClasses est piloté par l'ID du journal actif
    const { classes, loading, error, addClass, updateClass, removeClass } = useClasses(journalId);
    const { success, error: showError } = useToast();

    // State pour le formulaire et la modale
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({ name: '', students: '', subject: '', level: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null });

    const lessonOptions = ['Informatique', 'Exp.logiciels', 'Programmation', 'Database'];
    const levelOptions = [3, 4, 5, 6];

    const resetForm = () => { setFormData({ name: '', students: '', subject: '', level: '' }); setEditingClass(null); setShowAddForm(false); };
    const closeConfirmModal = () => setConfirmModal({ isOpen: false, onConfirm: null });
    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleEdit = (classItem) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name || '',
            students: classItem.students || '',
            subject: classItem.subject || '',
            level: classItem.level || '',
        });
        setShowAddForm(true);
    };

    const handleDelete = (classItem) => {
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer la classe',
            message: `Êtes-vous sûr de vouloir supprimer la classe "${classItem.name}" ? Ses élèves ne seront plus liés à une classe.`,
            onConfirm: () => performDelete(classItem.id, classItem.name),
        });
    };

    const performDelete = async (id, className) => {
        try {
            await removeClass(id);
            success(`Classe "${className}" supprimée.`);
            closeConfirmModal();
        } catch (err) {
            showError(err.message);
            closeConfirmModal();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.students || !formData.subject || !formData.level) {
            showError("Tous les champs du formulaire sont requis.");
            return;
        }

        const classData = {
            ...formData,
            students: parseInt(formData.students, 10),
            level: parseInt(formData.level, 10),
        };

        try {
            if (editingClass) {
                await updateClass(editingClass.id, classData);
                success(`Classe "${classData.name}" modifiée.`);
            } else {
                await addClass(classData);
                success(`Classe "${classData.name}" ajoutée.`);
            }
            resetForm();
        } catch (err) {
            showError(err.response?.data?.message || "Une erreur est survenue.");
        }
    };

    const isUiDisabled = !currentJournal || currentJournal.is_archived;

    const renderContent = () => {
        if (loading) {
            return <div className="loading"><div className="spinner"></div><p>Chargement des classes...</p></div>;
        }
        if (error) {
            return <div className="error"><h3>❌ Erreur</h3><p>{error}</p></div>;
        }
        if (isUiDisabled) {
            return <div className="empty-state"><h3>Sélectionnez un journal de classe actif pour gérer les classes.</h3></div>;
        }
        if (classes.length === 0) {
            return (
                <div className="empty-state">
                    <span className="empty-icon">🏫</span>
                    <h3>Aucune classe dans ce journal</h3>
                    <p>Commencez par ajouter une classe pour organiser vos élèves.</p>
                    <div className="container">
                        <button className="btn-primary" onClick={() => setShowAddForm(true)}>➕ Ajouter une classe</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="classes-grid">
                {classes.map(classItem => (
                    <div key={classItem.id} className="class-card">
                        <div className="class-card-header">
                            <h3>{classItem.name}</h3>
                            <div className="class-actions">
                                <button className="btn-edit" onClick={() => handleEdit(classItem)} title="Modifier">✏️</button>
                                <button className="btn-delete" onClick={() => handleDelete(classItem)} title="Supprimer">🗑️</button>
                            </div>
                        </div>
                        <div className="class-info">
                            <div className="info-item"><span>👥 Élèves:</span><span>{classItem.students}</span></div>
                            <div className="info-item"><span>🎓 Niveau:</span><span>{classItem.level}</span></div>
                            <div className="info-item"><span>📚 Matière:</span><span>{classItem.subject}</span></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="classes-manager">
            <div className="classes-header">
                <h2>🏫 Gestion des Classes du Journal</h2>
                <button
                    className="btn-primary"
                    onClick={() => { resetForm(); setShowAddForm(true); }}
                    disabled={isUiDisabled}
                >
                    <span>➕</span> Ajouter une classe
                </button>
            </div>

            {renderContent()}

            {showAddForm && (
                <div className="modal-overlay">
                    {/* ... Le JSX de votre modale reste identique ... */}
                </div>
            )}

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