import React, { useState, useEffect, useCallback } from 'react';
import { useClasses } from '../../../hooks/useClasses'; // Votre hook pour les classes
import StudentService from '../../../services/StudentService';
import { useToast } from '../../../hooks/useToast';
import { useJournal } from '../../../hooks/useJournal';
import ConfirmModal from '../../ConfirmModal'; // Assurez-vous d'importer votre modale

const StudentManager = () => {
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id; // On extrait l'ID du journal actif

    const { classes, loading: classesLoading } = useClasses(journalId);

    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ firstname: '', lastname: '' });
    const { success, error } = useToast();

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
    });

    // Charge les élèves pour la classe et le journal sélectionnés.
    const fetchStudents = useCallback(async () => {
        if (!selectedClass) {
            setStudents([]);
            return;
        }
        setIsLoading(true);
        try {
            const response = await StudentService.getStudentsByClass(selectedClass);
            setStudents(response.data);
        } catch (err) {
            error('Erreur de chargement des élèves.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedClass, error]);

    // Déclenche le rechargement des élèves si la sélection change.
    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Réinitialise la classe sélectionnée si la liste des classes change (ex: changement de journal).
    useEffect(() => {
        setSelectedClass('');
    }, [classes]);



    // Gère l'ajout d'un élève.
    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!formData.firstname.trim() || !formData.lastname.trim()) {
            error("Le prénom et le nom de l'élève sont requis.");
            return;
        }
        try {
            const studentData = {
                ...formData,
                class_id: selectedClass,
            };
            await StudentService.createStudent(studentData);
            success('Élève ajouté avec succès !');
            setFormData({ firstname: '', lastname: '' });
            await fetchStudents();
        } catch (err) {
            error(err.response?.data?.message || 'Erreur lors de l\'ajout de l\'élève.');
        }
    };

    const performDelete = async (studentId, studentName) => {
        try {
            await StudentService.deleteStudent(studentId);
            success(`${studentName} a été supprimé.`);
            await fetchStudents();
        } catch (err) {
            error(err.response?.data?.message || 'Erreur lors de la suppression.');
        } finally {
            closeConfirmModal();
        }
    };

    const handleDeleteStudent = (studentId, studentName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer l\'élève',
            message: `Êtes-vous sûr de vouloir supprimer ${studentName} ? Cette action est définitive.`,
            onConfirm: () => performDelete(studentId, studentName),
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    };


    // Vérifie si l'interface doit être désactivée.
    const isUiDisabled = !currentJournal || currentJournal.is_archived;

    return (
        <div className="student-manager">
            <h2>👥 Gestion des Élèves par Classe</h2>

            {/* Affiche le contexte du journal de classe actif */}
            {currentJournal ? (
                <p className="current-year-info">
                    Gestion pour le journal : <strong>{currentJournal.name}</strong>
                    {currentJournal.is_archived ? (<span className="archived-tag"> (Archivé)</span>) : null}
                </p>
            ) : (
                <div className="error-message">Aucun journal de classe sélectionné.</div>
            )}

            <div className="form-group">
                <label>Sélectionnez une classe</label>
                <select
                    className="btn-select"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={isUiDisabled || classesLoading || classes.length === 0}
                >
                    <option value="">-- Choisissez une classe --</option>
                    {classesLoading && <option>Chargement des classes...</option>}
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {selectedClass && !isUiDisabled && (
                <>
                    <form onSubmit={handleAddStudent} className="add-student-form form-group">
                        <input
                            type="text" value={formData.firstname}
                            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                            placeholder="Prénom" required
                        />
                        <input
                            type="text" value={formData.lastname}
                            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                            placeholder="Nom" required
                        />
                        <button type="submit" className="btn-primary">Ajouter Élève</button>
                    </form>

                    <div className="student-list">
                        {isLoading ? <p>Chargement des élèves...</p> : (
                            <>
                                {students.map(student => (
                                    <div key={student.id} className="student-item">
                                        <span>{student.lastname.toUpperCase()} {student.firstname}</span>
                                        <button onClick={() => handleDeleteStudent(student.id, `${student.firstname} ${student.lastname}`)} className="btn-delete" title="Supprimer">🗑️</button>
                                    </div>
                                ))}
                                {students.length === 0 && <p>Aucun élève dans cette classe pour ce journal.</p>}
                            </>
                        )}
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Confirmer la suppression"
                cancelText="Annuler"
                type="danger"
            />

        </div>
    );
};

export default StudentManager;