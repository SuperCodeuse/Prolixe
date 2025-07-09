import React, { useState, useEffect } from 'react';
import { useClasses } from '../../../hooks/useClasses';
import StudentService from '../../../services/StudentService';
import { useToast } from '../../../hooks/useToast';
import './StudentManager.scss';

const StudentManager = () => {
    const { classes } = useClasses();
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ firstname: '', lastname: '' });
    const { success, error } = useToast();

    useEffect(() => {
        if (selectedClass) {
            fetchStudents(selectedClass);
        } else {
            setStudents([]);
        }
    }, [selectedClass]);

    const fetchStudents = async (classId) => {
        setIsLoading(true);
        try {
            const response = await StudentService.getStudentsByClass(classId);
            setStudents(response.data);
        } catch (err) {
            error('Erreur de chargement des élèves.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const currentYear = new Date().getFullYear();
        const school_year = `${currentYear}-${currentYear + 1}`;
        try {
            await StudentService.createStudent({ ...formData, class_id: selectedClass, school_year });
            success('Élève ajouté !');
            setFormData({ firstname: '', lastname: '' });
            fetchStudents(selectedClass);
        } catch (err) {
            error('Erreur lors de l\'ajout de l\'élève.');
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
            try {
                await StudentService.deleteStudent(studentId);
                success('Élève supprimé.');
                fetchStudents(selectedClass);
            } catch (err) {
                error('Erreur lors de la suppression.');
            }
        }
    };

    return (
        <div className="student-manager">
            <h2>👥 Gestion des Élèves</h2>
            <div className="form-group">
                <label>Sélectionnez une classe</label>
                <select className="btn-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                    <option value="">-- Choisissez une classe --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {selectedClass && (
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
                    </div>
                </>
            )}
        </div>
    );
};

export default StudentManager;