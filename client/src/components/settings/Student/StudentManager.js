import React, { useState, useEffect } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import { useJournal } from '../../../hooks/useJournal'; // Utilisation du hook Journal
import StudentService from '../../../services/StudentService';
import { useToast } from '../../../hooks/useToast';
import './StudentManager.scss';

const StudentManager = () => {
    const { classes } = useClasses();
    const { currentJournal } = useJournal(); // Récupère le journal actif
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ firstname: '', lastname: '' });
    const { success, error } = useToast();

    // Recharge les élèves si la classe ou le journal actif change
    useEffect(() => {
        if (selectedClass && currentJournal) {
            fetchStudents(selectedClass, currentJournal.school_year);
        } else {
            setStudents([]);
        }
    }, [selectedClass, currentJournal]);

    const fetchStudents = async (classId, schoolYear) => {
        setIsLoading(true);
        try {
            const response = await StudentService.getStudentsByClass(classId, schoolYear);
            setStudents(response.data);
        } catch (err) {
            error('Erreur de chargement des élèves.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (!currentJournal) {
            error("Veuillez sélectionner un journal de classe actif dans les paramètres.");
            return;
        }

        try {
            // L'année scolaire est maintenant celle du journal actif
            await StudentService.createStudent({ ...formData, class_id: selectedClass, school_year: currentJournal.school_year });
            success('Élève ajouté !');
            setFormData({ firstname: '', lastname: '' });
            fetchStudents(selectedClass, currentJournal.school_year);
        } catch (err) {
            error('Erreur lors de l\'ajout de l\'élève.');
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
            try {
                await StudentService.deleteStudent(studentId);
                success('Élève supprimé.');
                if (selectedClass && currentJournal) {
                    fetchStudents(selectedClass, currentJournal.school_year);
                }
            } catch (err) {
                error('Erreur lors de la suppression.');
            }
        }
    };

    return (
        <div className="student-manager">
            <h2>👥 Gestion des Élèves</h2>

            {currentJournal && !currentJournal.is_archived ? (
                <p className="current-year-info">Gestion pour l'année scolaire : <strong>{currentJournal.school_year}</strong></p>
            ) : (
                <div className="error-message">
                    {currentJournal?.is_archived
                        ? `Le journal "${currentJournal.name}" est archivé. La gestion des élèves est désactivée.`
                        : "Aucun journal de classe actif. Veuillez en définir un dans l'onglet 'Journaux'."
                    }
                </div>
            )}

            <div className="form-group">
                <label>Sélectionnez une classe</label>
                <select
                    className="btn-select"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!currentJournal || currentJournal.is_archived}
                >
                    <option value="">-- Choisissez une classe --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {selectedClass && currentJournal && !currentJournal.is_archived && (
                <>
                    <form onSubmit={handleAddStudent} className="add-student-form form-group">
                        <input
                            type="text"
                            value={formData.firstname}
                            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                            placeholder="Prénom"
                            required
                        />
                        <input
                            type="text"
                            value={formData.lastname}
                            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                            placeholder="Nom"
                            required
                        />
                        <button type="submit" className="btn-primary">Ajouter</button>
                    </form>

                    <div className="student-list">
                        {isLoading ? <p>Chargement...</p> : students.map(student => (
                            <div key={student.id} className="student-item">
                                <span>{student.lastname} {student.firstname}</span>
                                <button onClick={() => handleDeleteStudent(student.id)} className="btn-delete">🗑️</button>
                            </div>
                        ))}
                        {students.length === 0 && !isLoading && <p>Aucun élève dans cette classe pour l'année en cours.</p>}
                    </div>
                </>
            )}
        </div>
    );
};

export default StudentManager;