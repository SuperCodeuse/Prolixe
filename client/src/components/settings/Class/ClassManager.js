import React, { useState } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import ConfirmModal from '../../ConfirmModal';
import { useToast } from '../../../hooks/useToast';

const ClassesManager = () => {
    const { classes, loading, error, addClass, updateClass, removeClass } = useClasses();
    // On ne récupère que ce qui est nécessaire du hook useToast
    const { success, error: showError, warning } = useToast();

    // ... (toute votre logique existante reste la même)
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({ name: '', students: '', subject: '', level: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const lesson = ['Informatique', 'Exp.logiciels', 'Programmation', 'Database'];
    const levels = [3, 4, 5, 6];

    const showConfirmModal = (title, message, onConfirm) => setConfirmModal({ isOpen: true, title, message, onConfirm });
    const closeConfirmModal = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    const resetForm = () => {
        setFormData({ name: '', students: '', subject: '', level: '' });
        setEditingClass(null);
        setShowAddForm(false);
    };
    const validateForm = () => {
        const errors = [];
        if (!formData.name.trim() || formData.name.trim().length < 2) errors.push('Le nom de la classe doit contenir au moins 2 caractères.');
        if (!formData.students || isNaN(formData.students) || parseInt(formData.students) <= 0 || parseInt(formData.students) > 50) errors.push('Le nombre d\'élèves doit être entre 1 et 50.');
        if (!formData.subject) errors.push('La matière principale est requise.');
        if (!formData.level || !levels.includes(parseInt(formData.level))) errors.push('Le niveau est invalide.');
        if (classes.some(cls => cls.name.toLowerCase().trim() === formData.name.toLowerCase().trim() && (!editingClass || cls.id !== editingClass.id))) errors.push(`Une classe avec le nom "${formData.name}" existe déjà.`);
        if (errors.length > 0) {
            errors.forEach(errorMsg => showError(errorMsg, 4000));
            return false;
        }
        return true;
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'students' && value) {
            const numStudents = parseInt(value);
            if (isNaN(numStudents) || numStudents <= 0) warning('Le nombre d\'élèves doit être un nombre positif');
            else if (numStudents > 50) warning('Attention : nombre d\'élèves très élevé (max recommandé: 50)');
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
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
            showError(`Erreur lors de ${editingClass ? 'la modification' : 'l\'ajout'}: ${err.message}`);
        }
    };
    const handleEdit = (classItem) => {
        setEditingClass(classItem);
        setFormData({
            name: classItem.name || '',
            students: classItem.students || '',
            subject: classItem.subject || classItem.lesson || '',
            level: classItem.level || '',
        });
        setShowAddForm(true);
    };
    const handleCancelForm = () => {
        const isFormDirty = formData.name.trim() || formData.students || formData.subject || formData.level;
        if (isFormDirty) {
            showConfirmModal('Annuler les modifications', 'Êtes-vous sûr de vouloir annuler ?', () => {
                resetForm();
                closeConfirmModal();
            });
        } else {
            resetForm();
        }
    };
    const handleDelete = (classItem) => {
        const studentCount = classItem.students;
        const warningMessage = studentCount > 0 ? `Cette classe contient ${studentCount} élève${studentCount > 1 ? 's' : ''}.\n\n` : '';
        showConfirmModal('Supprimer la classe', `${warningMessage}Êtes-vous sûr de vouloir supprimer la classe "${classItem.name}" ?`, () => performDelete(classItem.id, classItem.name));
    };
    const performDelete = async (id, className) => {
        try {
            await removeClass(id);
            success(`Classe "${className}" supprimée avec succès !`);
            closeConfirmModal();
        } catch (err) {
            showError(`Erreur lors de la suppression: ${err.message}`);
            closeConfirmModal();
        }
    };


    if (loading) return <div className="classes-manager"><div className="loading"><div className="spinner"></div><p>Chargement...</p></div></div>;
    if (error) return <div className="classes-manager"><div className="error"><h3>❌ Erreur</h3><p>{error}</p><button onClick={() => window.location.reload()}>Réessayer</button></div></div>;

    return (
        <div className="classes-manager">
            {/* ... Le reste de votre JSX ... */}
            <div className="classes-header">
                <h2>🏫 Gestion des Classes</h2>
                <button className="btn-primary" onClick={() => { resetForm(); setShowAddForm(true); }}><span>➕</span> Ajouter une classe</button>
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
                                <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="Ex: 6ème A" required autoFocus maxLength={50}/>
                                <small className="form-hint">{formData.name.length}/50</small>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre d'élèves</label>
                                    <input type="number" value={formData.students} onChange={(e) => handleInputChange('students', e.target.value)} placeholder="25" min="1" max="50" required/>
                                    <small className="form-hint">Entre 1 et 50</small>
                                </div>
                                <div className="form-group">
                                    <label>Niveau</label>
                                    <select value={formData.level} onChange={(e) => handleInputChange('level', e.target.value)} required>
                                        <option value="">Sélectionner</option>
                                        {levels.map(level => <option key={level} value={level}>{level}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Matière principale</label>
                                <select value={formData.subject} onChange={(e) => handleInputChange('subject', e.target.value)} required>
                                    <option value="">Sélectionner</option>
                                    {lesson.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={handleCancelForm}>Annuler</button>
                                <button type="submit" className="btn-primary">{editingClass ? '✏️ Modifier' : '➕ Ajouter'}</button>
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
                        <button className="btn-primary" onClick={() => setShowAddForm(true)}>➕ Ajouter ma première classe</button>
                    </div>
                ) : (
                    classes.map(classItem => (
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
                    ))
                )}
            </div>

            {/* Le conteneur de toasts a bien été retiré d'ici */}

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