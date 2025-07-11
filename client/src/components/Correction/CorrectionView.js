import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvaluationForGrading, saveGrades } from '../../services/EvaluationService';
import { useToast } from '../../hooks/useToast';
import './CorrectionView.scss';

// Le composant d'affichage a été amélioré pour gérer les blocs de commentaires
const CommentDisplay = ({ text }) => {
    if (!text) {
        return null;
    }

    // Sépare le texte par les commentaires de bloc `/* ... */`, en les conservant comme délimiteurs
    const parts = text.split(/(\/\*[\s\S]*?\*\/)/g).filter(Boolean);

    return (
        <div className="comment-display-container">
            {parts.map((part, index) => {
                // Si la partie est un commentaire de bloc
                if (part.startsWith('/*') && part.endsWith('*/')) {
                    // On retire les délimiteurs et on l'affiche dans une balise <pre>
                    return <pre className="comment-block" key={index}>{part.substring(2, part.length - 2)}</pre>;
                }

                // Pour les autres parties, on traite ligne par ligne
                return part.split('\n').map((line, lineIndex) => {
                    const key = `${index}-${lineIndex}`;
                    if (line.trim().startsWith('#')) {
                        return <div key={key}><b>{line.substring(line.indexOf('#') + 1).trim()}</b></div>;
                    }
                    if (line.trim().startsWith('//')) {
                        return <div key={key}><code>{line}</code></div>;
                    }
                    // Affiche une ligne normale ou un espace insécable pour les lignes vides
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

    const fetchData = useCallback(async () => {
        if (!evaluationId) return;
        try {
            setIsLoading(true);
            const { data } = await getEvaluationForGrading(evaluationId);
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
                    comment: grade.comment || ''
                };
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
        const gradesToSave = Object.entries(grades).map(([key, value]) => {
            const [student_id, criterion_id] = key.split('-');
            return {
                student_id: Number(student_id),
                criterion_id: Number(criterion_id),
                score: value.score === '' || value.score === null ? null : Number(value.score),
                comment: value.comment || null
            };
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

    const getGradeClass = (score, maxScore) => {
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
            totals[student.id] = criteria.reduce((total, criterion) => {
                const gradeInfo = grades[`${student.id}-${criterion.id}`];
                const score = gradeInfo?.score ?? 0;
                return total + Number(score);
            }, 0);
        });
        return totals;
    }, [students, criteria, grades]);

    const selectedStudentTotal = useMemo(() => studentTotals[selectedStudentId] || 0, [selectedStudentId, studentTotals]);

    if (isLoading) return <div className="loading-fullscreen">Chargement de la grille de correction...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!evaluation) return <div>Aucune évaluation sélectionnée.</div>;

    const totalMaxScore = criteria.reduce((sum, c) => sum + (c.max_score > 0 ? parseFloat(c.max_score) : 0), 0);
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
                                                    className={`grade-input ${getGradeClass(gradeInfo.score, criterion.max_score)}`}
                                                    value={gradeInfo.score ?? ''}
                                                    placeholder="-"
                                                    onChange={(e) => handleGradeChange(selectedStudent.id, criterion.id, e.target.value, criterion.max_score)}
                                                    max={isMalus ? undefined : criterion.max_score}
                                                    min={isMalus ? undefined : "0"}
                                                    step="0.5"
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
                                                />
                                            ) : (
                                                <div className="comment-display-wrapper" onClick={() => setEditingCommentKey(key)}>
                                                    {gradeInfo.comment ? (
                                                        <CommentDisplay text={gradeInfo.comment} />
                                                    ) : (
                                                        <button type="button" className="btn-add-comment">
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
                                <span className={`total-score ${getGradeClass(selectedStudentTotal, totalMaxScore)}`}>
                                    {selectedStudentTotal.toFixed(2)} / {totalMaxScore}
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
                                <span className={`total-score ${getGradeClass(studentTotals[student.id], totalMaxScore)}`}>
                                    {studentTotals[student.id].toFixed(2)}
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
