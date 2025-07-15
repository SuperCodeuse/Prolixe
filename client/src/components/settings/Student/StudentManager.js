import React, { useState, useEffect, useCallback } from 'react';
import { useClasses } from '../../../hooks/useClasses'; // Votre hook pour les classes
import StudentService from '../../../services/StudentService';
import { useToast } from '../../../hooks/useToast';
import { useJournal } from '../../../hooks/useJournal';
import './StudentManager.scss';

const StudentManager = () => {
    // Le journal actif est la source de vérité pour l'ID.
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id; // On extrait l'ID du journal actif

    // Le hook useClasses est maintenant initialisé avec l'ID du journal.
    // Assurez-vous que `useClasses` est adapté pour charger les classes par `journalId`.
    const { classes, loading: classesLoading } = useClasses(journalId);

    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ firstname: '', lastname: '' });
    const { success, error } = useToast();

    // Charge les élèves pour la classe et le journal sélectionnés.
    const fetchStudents = useCallback(async () => {
        if (!selectedClass || !journalId) {
            setStudents([]);
            return;
        }
        setIsLoading(true);
        try {
            // Assurez-vous que votre `StudentService` et votre API attendent bien `journalId`.
            const response = await StudentService.getStudentsByClass(selectedClass, journalId);
            setStudents(response.data);
        } catch (err) {
            error('Erreur de chargement des élèves.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedClass, journalId, error]);

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
            // CORRIGÉ : On envoie `journal_id` dans le corps de la requête.
            const studentData = {
                ...formData,
                class_id: selectedClass,
                journal_id: journalId
            };
            await StudentService.createStudent(studentData);
            success('Élève ajouté avec succès !');
            setFormData({ firstname: '', lastname: '' });
            await fetchStudents();
        } catch (err) {
            error(err.response?.data?.message || 'Erreur lors de l\'ajout de l\'élève.');
        }
    };

    // Gère la suppression d'un élève.
    const handleDeleteStudent = async (studentId, studentName) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${studentName} ?`)) {
            try {
                await StudentService.deleteStudent(studentId);
                success(`${studentName} a été supprimé.`);
                await fetchStudents();
            } catch (err) {
                error(err.response?.data?.message || 'Erreur lors de la suppression.');
            }
        }
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

            {/* Le sélecteur de classe */}
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

            {/* Formulaire d'ajout et liste des élèves (visibles seulement si une classe est sélectionnée) */}
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
        </div>
    );
};

export default StudentManager;