// client/src/components/Correction/CorrectionView.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvaluationForGrading, saveGrades } from '../../services/EvaluationService';
import { useToast } from '../../hooks/useToast';
import './CorrectionView.scss';

const CommentDisplay = ({ text }) => {
    if (!text) {
        return null;
    }

    const parts = text.split(/(\/\*[\s\S]*?\*\/)/g).filter(Boolean);

    return (
        <div className="comment-display-container">
            {parts.map((part, index) => {
                if (part.startsWith('/*') && part.endsWith('*/')) {
                    return <pre className="comment-block" key={index}>{part.substring(2, part.length - 2)}</pre>;
                }

                return part.split('\n').map((line, lineIndex) => {
                    const key = `${index}-${lineIndex}`;
                    if (line.trim().startsWith('#')) {
                        return <div key={key}><b>{line.substring(line.indexOf('#') + 1).trim()}</b></div>;
                    }
                    if (line.trim().startsWith('//')) {
                        return <div key={key}><code>{line}</code></div>;
                    }
                    return <div key={key}>{line || '\u00A0'}</div>;
                });
            })}
        </div>
    );
};


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

    const [editingCommentKey, setEditingCommentKey] = useState(null);
    const [absentStudents, setAbsentStudents] = useState(new Set()); // CHANGEMENT : Nouvel état pour les élèves absents

    const fetchData = useCallback(async () => {
        if (!evaluationId) return;
        try {
            setIsLoading(true);
            let { data } = await getEvaluationForGrading(evaluationId);
            data = data.data;

            setEvaluation(data.evaluation);
            setCriteria(data.criteria);
            setStudents(data.students);

            if (data.students && data.students.length > 0) {
                setSelectedStudentId(data.students[0].id);
            }

            const gradesObject = data.grades.reduce((acc, grade) => {
                const key = `${grade.student_id}-${grade.criterion_id}`;
                acc[key] = {
                    score: grade.score,
                    comment: grade.comment || '',
                };
                return acc;
            }, {});

            // CHANGEMENT : Initialiser l'état des élèves absents
            const absentStudentsSet = new Set(data.grades
                .filter(g => g.is_absent)
                .map(g => g.student_id));

            setGrades(gradesObject);
            setAbsentStudents(absentStudentsSet);
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

    const handleGradeChange = (studentId, criterionId, value, maxScore) => {
        const key = `${studentId}-${criterionId}`;
        let newScore = value === '' || value === null ? null : parseFloat(value);

        if (newScore !== null) {
            if (isNaN(newScore)) return;
            if (parseFloat(maxScore) > 0) {
                newScore = Math.max(0, Math.min(newScore, maxScore));
            }
        }

        setGrades(prev => ({
            ...prev,
            [key]: { ...(prev[key] || { comment: '' }), score: newScore }
        }));

        // CHANGEMENT : Si on saisit une note, on considère que l'élève n'est plus absent
        setAbsentStudents(prev => {
            const newSet = new Set(prev);
            newSet.delete(studentId);
            return newSet;
        });
    };

    // CHANGEMENT : Nouvelle fonction pour gérer l'absence globale
    const handleAbsentToggle = (studentId, isAbsent) => {
        setAbsentStudents(prev => {
            const newSet = new Set(prev);
            if (isAbsent) {
                newSet.add(studentId);
            } else {
                newSet.delete(studentId);
            }
            return newSet;
        });
    };

    const handleCommentChange = (studentId, criterionId, comment) => {
        const key = `${studentId}-${criterionId}`;
        setGrades(prev => ({
            ...prev,
            [key]: { ...(prev[key] || { score: null }), comment }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);

        const gradesToSave = [];

        students.forEach(student => {
            const isStudentAbsent = absentStudents.has(student.id);

            criteria.forEach(criterion => {
                const key = `${student.id}-${criterion.id}`;
                const gradeInfo = grades[key] || { score: null, comment: null };

                gradesToSave.push({
                    student_id: Number(student.id),
                    criterion_id: Number(criterion.id),
                    score: isStudentAbsent ? null : (gradeInfo.score === '' || gradeInfo.score === null ? null : Number(gradeInfo.score)),
                    comment: isStudentAbsent ? null : (gradeInfo.comment || null),
                    is_absent: isStudentAbsent
                });
            });
        });

        try {
            await saveGrades(evaluationId, gradesToSave);
            success('Notes et commentaires sauvegardés !');
        } catch (err) {
            showError('Erreur lors de la sauvegarde des notes.');
        } finally {
            setIsSaving(false);
        }
    };

    const getGradeClass = (score, maxScore, isAbsent) => {
        if (isAbsent) return 'absent';
        if (score === null || score === undefined) return 'neutral';
        if (parseFloat(maxScore) === 0) return score < 0 ? 'fail' : 'neutral';
        const percentage = (score / maxScore) * 100;
        if (percentage < 50) return 'fail';
        if (percentage < 75) return 'pass';
        return 'success';
    };

    const studentTotals = useMemo(() => {
        const totals = {};
        students.forEach(student => {
            if (absentStudents.has(student.id)) { // CHANGEMENT : Vérifier l'état global
                totals[student.id] = "-";
            } else {
                let totalScore = 0;
                let hasScores = false;
                criteria.forEach(criterion => {
                    const gradeInfo = grades[`${student.id}-${criterion.id}`];
                    if (gradeInfo?.score !== null && gradeInfo?.score !== undefined) {
                        totalScore += Number(gradeInfo.score);
                        hasScores = true;
                    }
                });
                totals[student.id] = hasScores ? totalScore : 0;
            }
        });
        return totals;
    }, [students, criteria, grades, absentStudents]); // CHANGEMENT : Ajout de absentStudents

    const selectedStudentTotal = useMemo(() => studentTotals[selectedStudentId] || 0, [selectedStudentId, studentTotals]);

    if (isLoading) return <div className="loading-fullscreen">Chargement de la grille de correction...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!evaluation) return <div>Aucune évaluation sélectionnée.</div>;

    const totalMaxScore = criteria.reduce((sum, c) => sum + (c.max_score > 0 ? parseFloat(c.max_score) : 0), 0);
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // CHANGEMENT : Vérifier si l'élève sélectionné est absent
    const isSelectedStudentAbsent = absentStudents.has(selectedStudentId);

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
                    <div className="form-group-student-selector form-group checkbox-group">
                        <select
                            value={selectedStudentId || ''}
                            onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                            className="student-selector btn-select"
                        >
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.lastname} {s.firstname}</option>
                            ))}
                        </select>
                        <div className="absent-toggle-container">
                            <input
                                type="checkbox"
                                id={`absent-toggle`}
                                checked={isSelectedStudentAbsent}
                                onChange={(e) => handleAbsentToggle(selectedStudentId, e.target.checked)}
                            />
                            <label htmlFor={`absent-toggle`}>Absent</label>
                        </div>
                    </div>

                    {selectedStudent && (
                        <div className="criteria-list">
                            {criteria.map(criterion => {
                                const key = `${selectedStudent.id}-${criterion.id}`;
                                const gradeInfo = grades[key] || { score: '', comment: '' };
                                const isMalus = parseFloat(criterion.max_score) === 0;
                                const isEditingThisComment = editingCommentKey === key;

                                return (
                                    <div className="criterion-row" key={criterion.id}>
                                        <div className="criterion-main">
                                            <label className="criterion-label">{criterion.label}</label>
                                            <div className="grade-input-wrapper">
                                                <input
                                                    type="number"
                                                    className={`grade-input ${getGradeClass(gradeInfo.score, criterion.max_score, isSelectedStudentAbsent)}`}
                                                    value={isSelectedStudentAbsent ? '-' : gradeInfo.score ?? ''}
                                                    placeholder="-"
                                                    onChange={(e) => handleGradeChange(selectedStudent.id, criterion.id, e.target.value, criterion.max_score)}
                                                    max={isMalus ? undefined : criterion.max_score}
                                                    min={isMalus ? undefined : "0"}
                                                    step="0.5"
                                                    disabled={isSelectedStudentAbsent} // Désactiver l'input si l'élève est absent
                                                />
                                                <span className="max-score">/ {criterion.max_score}</span>
                                            </div>
                                        </div>
                                        <div className="criterion-comment-section">
                                            {isEditingThisComment ? (
                                                <textarea
                                                    className="comment-textarea"
                                                    placeholder="Justification, code... (# Titre, // Commentaire, /* Bloc */)"
                                                    value={gradeInfo.comment}
                                                    onChange={(e) => handleCommentChange(selectedStudent.id, criterion.id, e.target.value)}
                                                    autoFocus
                                                    onBlur={() => setEditingCommentKey(null)}
                                                    disabled={isSelectedStudentAbsent}
                                                />
                                            ) : (
                                                <div className="comment-display-wrapper" onClick={!isSelectedStudentAbsent ? () => setEditingCommentKey(key) : undefined}>
                                                    {gradeInfo.comment ? (
                                                        <CommentDisplay text={gradeInfo.comment} />
                                                    ) : (
                                                        <button type="button" className="btn-add-comment" disabled={isSelectedStudentAbsent}>
                                                            + Ajouter un commentaire
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="student-total-row">
                                <span>Total de l'élève</span>
                                <span className={`total-score ${getGradeClass(selectedStudentTotal, totalMaxScore, isSelectedStudentAbsent)}`}>
                                    {isSelectedStudentAbsent ? '-' : selectedStudentTotal.toFixed(2)} / {totalMaxScore}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="class-summary-panel">
                    <h3>Résultats de la classe</h3>
                    <div className="student-totals-list">
                        {students.map(student => (
                            <div className="student-result-row" key={student.id}>
                                <span className="student-name">{student.lastname} {student.firstname}</span>
                                <span className={`total-score ${getGradeClass(studentTotals[student.id], totalMaxScore, studentTotals[student.id] === '-')}`}>
                                    {studentTotals[student.id] === '-' ? '-' : studentTotals[student.id].toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bottom-save-container">
                <button onClick={handleSave} className="btn-primary save-button" disabled={isSaving}>
                    {isSaving ? 'Sauvegarde en cours...' : '💾 Sauvegarder les modifications'}
                </button>
            </div>
        </div>
    );
};

export default CorrectionView;