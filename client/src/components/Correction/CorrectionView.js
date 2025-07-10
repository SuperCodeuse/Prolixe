// Fichier: src/components/correction/CorrectionView.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvaluationForGrading, saveGrades } from '../../services/EvaluationService';
import { useToast } from '../../hooks/useToast';
import './CorrectionView.scss';

const CorrectionView = () => {
    const { evaluationId } = useParams();
    const [evaluation, setEvaluation] = useState(null);
    const [criteria, setCriteria] = useState([]);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const { success, error: showError } = useToast();

    const fetchData = useCallback(async () => {
        if (!evaluationId) return;
        try {
            setIsLoading(true);
            const response = await getEvaluationForGrading(evaluationId);
            const data = response.data;
            setEvaluation(data.evaluation);
            setCriteria(data.criteria);
            setStudents(data.students);

            if (data.students && data.students.length > 0) {
                setSelectedStudentId(data.students[0].id);
            }

            const gradesObject = data.grades.reduce((acc, grade) => {
                acc[`${grade.student_id}-${grade.criterion_id}`] = grade.score;
                return acc;
            }, {});
            setGrades(gradesObject);
            setError('');
        } catch (err) {
            console.error(err);
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
        let newScore = value === '' || value === null ? null : parseFloat(value);

        if (newScore !== null) {
            if (isNaN(newScore)) return;
            newScore = Math.max(0, Math.min(newScore, criterion.max_score));
        }

        setGrades(prevGrades => ({
            ...prevGrades,
            [`${studentId}-${criterionId}`]: newScore,
        }));
    };

    const getGradeClass = (score, maxScore) => {
        if (score === null || score === undefined || maxScore === 0) return 'neutral';
        const percentage = (score / maxScore) * 100;
        if (percentage < 50) return 'fail';
        if (percentage < 75) return 'pass';
        return 'success';
    };

    const selectedStudentTotal = useMemo(() => {
        if (!selectedStudentId) return 0;
        return criteria.reduce((total, criterion) => {
            const score = grades[`${selectedStudentId}-${criterion.id}`] ?? 0;
            return total + Number(score);
        }, 0);
    }, [selectedStudentId, criteria, grades]);

    const criteriaAverages = useMemo(() => {
        const averages = {};
        criteria.forEach(criterion => {
            const scores = students
                .map(student => grades[`${student.id}-${criterion.id}`])
                .filter(score => score !== null && score !== undefined && score !== '');

            if (scores.length === 0) {
                averages[criterion.id] = { average: 0, count: 0 };
            } else {
                const sum = scores.reduce((total, score) => total + Number(score), 0);
                averages[criterion.id] = { average: sum / scores.length, count: scores.length };
            }
        });
        return averages;
    }, [students, criteria, grades]);

    const handleSave = async () => {
        setIsSaving(true);
        const gradesToSave = Object.entries(grades)
            .map(([key, score]) => {
                const [student_id, criterion_id] = key.split('-');
                return { student_id: Number(student_id), criterion_id: Number(criterion_id), score: score === '' || score === null ? null : Number(score) };
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
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    return (
        <div className="correction-view-focused">
            <div className="correction-header">
                <div className="header-title">
                    <Link to="/correction" className="back-link">← Retour aux évaluations</Link>
                    <h1>{evaluation.name}</h1>
                    <p>{evaluation.class_name} - {new Date(evaluation.evaluation_date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>
                </div>
                <button onClick={handleSave} className="btn-primary save-button" disabled={isSaving}>
                    {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                </button>
            </div>

            <div className="correction-layout">
                <div className="student-correction-panel">
                    <h3>Correction de l'élève</h3>
                    <div className="form-group">
                        <select
                            value={selectedStudentId || ''}
                            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                            className="student-selector btn-select"
                        >
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.lastname} {s.firstname}</option>
                            ))}
                        </select>
                    </div>


                    {selectedStudent && (
                        <div className="criteria-list">
                            {criteria.map(criterion => (
                                <div className="criterion-row" key={criterion.id}>
                                    <label className="criterion-label">{criterion.label}</label>
                                    <div className="grade-input-wrapper">
                                        <input
                                            type="number"
                                            className={`grade-input ${getGradeClass(grades[`${selectedStudent.id}-${criterion.id}`], criterion.max_score)}`}
                                            value={grades[`${selectedStudent.id}-${criterion.id}`] ?? ''}
                                            placeholder="-"
                                            onChange={(e) => handleGradeChange(selectedStudent.id, criterion.id, e.target.value)}
                                            max={criterion.max_score}
                                            min="0"
                                            step="0.5"
                                        />
                                        <span className="max-score">/ {criterion.max_score}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="student-total-row">
                                <span>Total de l'élève</span>
                                <span className={`total-score ${getGradeClass(selectedStudentTotal, totalMaxScore)}`}>
                                    {selectedStudentTotal.toFixed(2)} / {totalMaxScore}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="class-summary-panel">
                    <h3>Moyennes de la classe</h3>
                    <div className="averages-list">
                        {criteria.map(criterion => (
                            <div className="average-row" key={criterion.id}>
                                <span className="criterion-label">{criterion.label}</span>
                                <span className={`average-score ${getGradeClass(criteriaAverages[criterion.id].average, criterion.max_score)}`}>
                                    {criteriaAverages[criterion.id].average.toFixed(2)}
                                    <span className="average-max-score"> / {criterion.max_score}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CorrectionView;