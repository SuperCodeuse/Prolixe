// Fichier: src/components/correction/CorrectionView.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getEvaluationForGrading, saveGrades } from '../../services/EvaluationService';
import { useToast } from '../../hooks/useToast';
import './CorrectionView.scss';

const CorrectionView = () => {
    const { evaluationId } = useParams();
    const [evaluation, setEvaluation] = useState(null);
    const [criteria, setCriteria] = useState([]);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const { success, error: showError } = useToast();

    const fetchData = useCallback(async () => {
        if (!evaluationId) return;
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
            showError(err.message || 'Erreur de chargement');
        } finally {
            setIsLoading(false);
        }
    }, [evaluationId, showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGradeChange = (studentId, criterionId, value) => {
        const criterion = criteria.find(c => c.id === criterionId);
        let newScore = value === '' ? null : parseFloat(value);

        if (newScore !== null) {
            if (isNaN(newScore)) return;
            newScore = Math.max(0, Math.min(newScore, criterion.max_score));
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
        setIsSaving(true);
        const gradesToSave = Object.entries(grades)
            .filter(([, score]) => score !== null && score !== '')
            .map(([key, score]) => {
                const [student_id, criterion_id] = key.split('-');
                return { student_id: Number(student_id), criterion_id: Number(criterion_id), score: Number(score) };
            });

        try {
            await saveGrades(evaluationId, gradesToSave);
            success('Notes sauvegardées avec succès !');
        } catch (err) {
            showError('Erreur lors de la sauvegarde des notes.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-fullscreen">Chargement de la grille de correction...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!evaluation) return <div>Aucune évaluation sélectionnée.</div>;

    const totalMaxScore = criteria.reduce((sum, c) => sum + c.max_score, 0);

    return (
        <div className="correction-view">
            <div className="header">
                <h1>Correction : {evaluation.name} ({evaluation.class_name})</h1>
                <button onClick={handleSave} className="save-button" disabled={isSaving}>
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
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
                        <th>Total <span>/{totalMaxScore}</span></th>
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
                                        onBlur={(e) => handleGradeChange(student.id, criterion.id, e.target.value)}
                                        max={criterion.max_score}
                                        min="0"
                                        step="0.5"
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