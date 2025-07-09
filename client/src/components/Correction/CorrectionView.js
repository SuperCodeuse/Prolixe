// Fichier: src/components/correction/CorrectionView.js

import React, { useState, useEffect, useMemo } from 'react';
import { getEvaluationForGrading, saveGrades } from '../../services/EvaluationService';
import './CorrectionView.scss'; // On va créer un fichier de style

const CorrectionView = ({ evaluationId }) => {
    const [evaluation, setEvaluation] = useState(null);
    const [criteria, setCriteria] = useState([]);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({}); // Format: { 'studentId-criterionId': score }
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!evaluationId) return;

        const fetchData = async () => {
            try {
                setIsLoading(true);
                const { data } = await getEvaluationForGrading(evaluationId);
                setEvaluation(data.evaluation);
                setCriteria(data.criteria);
                setStudents(data.students);

                const gradesObject = data.grades.reduce((acc, grade) => {
                    acc[`${grade.student_id}-${grade.criterion_id}`] = grade.score;
                    return acc;
                }, {});
                setGrades(gradesObject);
                setError('');
            } catch (err) {
                setError('Impossible de charger les données de correction.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [evaluationId]);

    const handleGradeChange = (studentId, criterionId, value) => {
        const criterion = criteria.find(c => c.id === criterionId);
        let newScore = parseFloat(value);

        // Gérer le cas où le champ est vidé
        if (isNaN(newScore)) {
            newScore = '';
        } else if (newScore > criterion.max_score) {
            newScore = criterion.max_score; // Plafonne à la note max
        } else if (newScore < 0) {
            newScore = 0; // Empêche les notes négatives
        }

        setGrades(prevGrades => ({
            ...prevGrades,
            [`${studentId}-${criterionId}`]: newScore,
        }));
    };

    const studentTotals = useMemo(() => {
        const totals = {};
        students.forEach(student => {
            totals[student.id] = criteria.reduce((total, criterion) => {
                const score = grades[`${student.id}-${criterion.id}`] || 0;
                return total + Number(score);
            }, 0);
        });
        return totals;
    }, [students, criteria, grades]);

    const handleSave = async () => {
        const gradesToSave = Object.keys(grades)
            .filter(key => grades[key] !== '' && grades[key] !== null) // N'envoie que les notes saisies
            .map(key => {
                const [student_id, criterion_id] = key.split('-');
                return { student_id: Number(student_id), criterion_id: Number(criterion_id), score: Number(grades[key]) };
            });

        try {
            await saveGrades(evaluationId, gradesToSave);
            alert('Notes sauvegardées avec succès !');
        } catch (err) {
            alert('Erreur lors de la sauvegarde des notes.');
            console.error(err);
        }
    };

    if (isLoading) return <div>Chargement de la grille de correction...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!evaluation) return <div>Aucune évaluation sélectionnée.</div>;

    return (
        <div className="correction-view">
            <div className="header">
                <h1>Correction : {evaluation.name}</h1>
                <button onClick={handleSave} className="save-button">
                    Sauvegarder les notes
                </button>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                    <tr>
                        <th>Élève</th>
                        {criteria.map(c => (
                            <th key={c.id}>{c.label} <span>/{c.max_score}</span></th>
                        ))}
                        <th>Total</th>
                    </tr>
                    </thead>
                    <tbody>
                    {students.map(student => (
                        <tr key={student.id}>
                            <td>{student.lastname} {student.firstname}</td>
                            {criteria.map(criterion => (
                                <td key={criterion.id}>
                                    <input
                                        type="number"
                                        value={grades[`${student.id}-${criterion.id}`] ?? ''}
                                        placeholder="-"
                                        onChange={(e) => handleGradeChange(student.id, criterion.id, e.target.value)}
                                        max={criterion.max_score}
                                        min="0"
                                    />
                                </td>
                            ))}
                            <td className="total-cell">{studentTotals[student.id].toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CorrectionView;