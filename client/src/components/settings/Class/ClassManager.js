import React, { useState, useEffect } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import { useToast } from '../../../hooks/useToast';
import ConfirmModal from '../../ConfirmModal';
// Supposons que vous ayez un service pour gérer les années scolaires.
// Vous devrez créer ce fichier et les routes API correspondantes.
// import SchoolYearService from '../../../services/schoolYearService';

// Placeholder pour le service des années scolaires en attendant sa création.
const SchoolYearService = {
    getSchoolYears: () => Promise.resolve({ data: [{id: 1, name: "2024-2025"}, {id: 2, name: "2025-2026"}] })
};


const ClassesManager = () => {
    // State pour la gestion des années scolaires
    const [schoolYears, setSchoolYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [isYearLoading, setIsYearLoading] = useState(true);

    // Le hook useClasses est maintenant piloté par l'année scolaire sélectionnée
    const { classes, loading, error, addClass, updateClass, removeClass } = useClasses(selectedYear);
    const { success, error: showError } = useToast();

    // State pour le formulaire et la modale
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({ name: '', students: '', subject: '', level: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null });

    const lessonOptions = ['Informatique', 'Exp.logiciels', 'Programmation', 'Database'];
    const levelOptions = [3, 4, 5, 6];

    // Charger les années scolaires au montage du composant
    useEffect(() => {
        const fetchYears = async () => {
            try {
                const response = await SchoolYearService.getSchoolYears();
                setSchoolYears(response.data || []);
                if (response.data && response.data.length > 0) {
                    // Sélectionner la première année par défaut
                    setSelectedYear(response.data[0].id);
                }
            } catch (err) {
                showError("Impossible de charger les années scolaires.");
            } finally {
                setIsYearLoading(false);
            }
        };
        fetchYears();
    }, [showError]); // showError est une dépendance car c'est une fonction d'un hook externe

    // Les fonctions de gestion du formulaire et de la modale restent similaires
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
            message: `Êtes-vous sûr de vouloir supprimer la classe "${classItem.name}" ?`,
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
        // La validation est déléguée au backend, on vérifie juste que les champs sont remplis
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
            showError(err.response?.data?.message || err.message || "Une erreur est survenue.");
        }
    };

    // Le rendu est maintenant conditionné par la sélection d'une année scolaire
    const renderContent = () => {
        if (loading || isYearLoading) {
            return <div className="loading"><div className="spinner"></div><p>Chargement...</p></div>;
        }
        if (error) {
            return <div className="error"><h3>❌ Erreur</h3><p>{error}</p></div>;
        }
        if (!selectedYear) {
            return <div className="empty-state"><h3>Veuillez sélectionner une année scolaire pour commencer.</h3></div>;
        }
        if (classes.length === 0) {
            return (
                <div className="empty-state">
                    <span className="empty-icon">🏫</span>
                    <h3>Aucune classe pour cette année</h3>
                    <p>Commencez par ajouter votre première classe pour l'année scolaire sélectionnée.</p>
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
                <h2>🏫 Gestion des Classes</h2>
                <div className="form-group year-selector">
                    <label htmlFor="school-year-select">Année Scolaire</label>
                    <select
                        id="school-year-select"
                        value={selectedYear}
                        className="btn-select"
                        onChange={(e) => setSelectedYear(e.target.value)}
                        disabled={isYearLoading || schoolYears.length === 0}
                    >
                        {isYearLoading && <option>Chargement...</option>}
                        {!isYearLoading && schoolYears.length === 0 && <option>Aucune année trouvée</option>}
                        {schoolYears.map(year => (
                            <option key={year.id} value={year.id}>{year.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn-primary"
                    onClick={() => { resetForm(); setShowAddForm(true); }}
                    disabled={!selectedYear || isYearLoading} // On ne peut pas ajouter de classe sans année
                >
                    <span>➕</span> Ajouter une classe
                </button>
            </div>

            {renderContent()}

            {showAddForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editingClass ? 'Modifier la classe' : 'Ajouter une classe'}</h3>
                            <button className="modal-close" onClick={resetForm}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="class-form">
                            <div className="form-group">
                                <label>Nom de la classe</label>
                                <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required autoFocus />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre d'élèves</label>
                                    <input type="number" value={formData.students} onChange={(e) => handleInputChange('students', e.target.value)} min="1" max="50" required />
                                </div>
                                <div className="form-group">
                                    <label>Niveau</label>
                                    <select value={formData.level} onChange={(e) => handleInputChange('level', e.target.value)} required>
                                        <option value="">Sélectionner</option>
                                        {levelOptions.map(level => <option key={level} value={level}>{level}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Matière principale</label>
                                <select value={formData.subject} onChange={(e) => handleInputChange('subject', e.target.value)} required>
                                    <option value="">Sélectionner</option>
                                    {lessonOptions.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={resetForm}>Annuler</button>
                                <button type="submit" className="btn-primary">{editingClass ? '✏️ Modifier' : '➕ Ajouter'}</button>
                            </div>
                        </form>
                    </div>
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