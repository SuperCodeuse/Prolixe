// client/src/components/Correction/CorrectionList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation, getEvaluationForGrading } from '../../services/EvaluationService';
import EvaluationModal from './EvaluationModal';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import { useJournal } from '../../hooks/useJournal';
import './CorrectionList.scss';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CorrectionList = () => {
    const { currentJournal, loading: loadingJournal } = useJournal();
    const { success, error: showError } = useToast();

    const [evaluations, setEvaluations] = useState([]);
    const [loadingEvaluations, setLoadingEvaluations] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState(null);
    const [evaluationToCopy, setEvaluationToCopy] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const fetchEvaluations = useCallback(async () => {
        if (!currentJournal?.id) {
            setEvaluations([]);
            setLoadingEvaluations(false);
            return;
        }

        setLoadingEvaluations(true);
        setError('');
        try {
            const response = await getEvaluations(currentJournal.id);
            setEvaluations(response.data || []);
        } catch (err) {
            const errorMessage = 'Impossible de charger les évaluations.';
            setError(errorMessage);
            showError(err.message || errorMessage);
        } finally {
            setLoadingEvaluations(false);
        }
    }, [currentJournal, showError]);

    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations]);


    const handleOpenCreateModal = () => {
        setEditingEvaluation(null);
        setEvaluationToCopy(null);
        setIsModalOpen(true);
    };

    const handleOpenCopyModal = (ev) => {
        setEditingEvaluation(null);
        setEvaluationToCopy(ev);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (ev) => {
        setEditingEvaluation(ev);
        setEvaluationToCopy(null);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (ev) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer l'évaluation "${ev.name}" ? Cette action est irréversible.`,
            onConfirm: () => performDelete(ev.id),
        });
    };

    const performDelete = async (id) => {
        try {
            await deleteEvaluation(id);
            await fetchEvaluations();
            success('Évaluation supprimée.');
        } catch (err) {
            showError(err.message || 'Erreur de suppression');
        } finally {
            setConfirmModal({ isOpen: false });
        }
    };

    const handleSaveEvaluation = async (evaluationData) => {
        try {
            if (editingEvaluation) {
                await updateEvaluation(editingEvaluation.id, evaluationData);
                success('Évaluation mise à jour !');
            } else {
                await createEvaluation(evaluationData);
                success('Évaluation créée avec succès !');
            }
            await fetchEvaluations();
            setIsModalOpen(false);
            setEditingEvaluation(null);
            setEvaluationToCopy(null);
        } catch (err) {
            showError(err.message || "Erreur lors de la sauvegarde de l'évaluation");
        }
    };

    const handleExportPDF = async (evaluationId, evaluationName) => {
        try {
            const { data } = await getEvaluationForGrading(evaluationId);
            const evaluationData = data.evaluation;
            const students = data.students;
            const criteria = data.criteria;
            const grades = data.grades;

            // Fonction pour générer le HTML de commentaire formaté
            const formatCommentHtml = (text) => {
                if (!text) return '';
                const parts = text.split(/(\/\*[\s\S]*?\*\/)/g).filter(Boolean);
                let html = '';
                parts.forEach((part) => {
                    if (part.startsWith('/*') && part.endsWith('*/')) {
                        html += `<pre class="comment-block" style="background-color: rgba(98, 151, 241, 0.1); padding: 8px; border-left: 3px solid rgba(98, 151, 241, 0.94); margin: 5px 0; font-family: 'Courier New', monospace; font-size: 0.8rem; white-space: pre-wrap;">${part.substring(2, part.length - 2).trim()}</pre>`;
                    } else {
                        html += part.split('\n').map((line) => {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('#')) {
                                return `<b style="color: rgba(98, 151, 241, 0.94); font-size: 0.9rem;">${trimmedLine.substring(1).trim()}</b><br/>`;
                            }
                            if (trimmedLine.startsWith('//')) {
                                return `<code style="font-family: 'Courier New', monospace; background-color: rgba(6, 182, 212, 0.1); padding: 2px 4px; border-radius: 3px; font-size: 0.8rem;">${line}</code><br/>`;
                            }
                            return `<span style="line-height: 1.4;">${line}</span><br/>`;
                        }).join('');
                    }
                });
                return html;
            };

            const studentGrades = students.map(student => {
                const studentId = student.id;
                const isAbsent = grades.some(g => g.student_id === studentId && g.is_absent);
                const scores = criteria.map(criterion => {
                    const grade = grades.find(g => g.student_id === studentId && g.criterion_id === criterion.id);
                    // Si l'élève n'est pas absent et n'a pas de note, on met 0
                    let scoreValue;
                    if (isAbsent) {
                        scoreValue = '-';
                    } else if (!grade || grade.score === null || grade.score === undefined || grade.score === '') {
                        scoreValue = 0;
                    } else {
                        scoreValue = Number(grade.score);
                    }

                    return {
                        criterionId: criterion.id,
                        label: criterion.label,
                        score: scoreValue,
                        maxScore: criterion.max_score,
                        comment: grade ? grade.comment : ''
                    };
                });
                const totalScore = scores.reduce((sum, s) => sum + (s.score !== '-' && s.score !== null ? Number(s.score) : 0), 0);
                const totalMaxScore = criteria.reduce((sum, c) => sum + parseFloat(c.max_score), 0);
                return {
                    ...student,
                    scores,
                    totalScore: isAbsent ? '-' : totalScore,
                    totalMaxScore,
                    isAbsent
                };
            });

            // Créer une page pour chaque étudiant
            const pdfPages = [];

            studentGrades.forEach((student, index) => {
                const pdfContainer = document.createElement('div');
                pdfContainer.style.width = '210mm';
                pdfContainer.style.minHeight = '297mm'; // A4 height
                pdfContainer.style.padding = '20mm';
                pdfContainer.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
                pdfContainer.style.boxSizing = 'border-box';
                pdfContainer.style.color = '#1a1a1a';
                pdfContainer.style.fontSize = '12px';
                pdfContainer.style.backgroundColor = '#ffffff';
                pdfContainer.style.position = 'relative';

                // En-tête avec dégradé
                const headerHtml = `
                <div style="
                    background: linear-gradient(135deg, rgba(98, 151, 241, 0.94) 0%, rgba(6, 182, 212, 1) 100%);
                    margin: -20mm -20mm 25px -20mm;
                    padding: 25px 20mm 20px 20mm;
                    color: white;
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="position: relative; z-index: 2;">
                        <h1 style="font-size: 1.8rem; margin: 0 0 8px 0; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            Grille de cotation
                        </h1>
                        <h2 style="font-size: 1.3rem; margin: 0 0 12px 0; font-weight: 400; opacity: 0.95;">
                            ${evaluationName}
                        </h2>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; opacity: 0.9;">
                            <span>Classe: <strong>${evaluationData.class_name}</strong></span>
                            <span>Date: <strong>${new Date(evaluationData.evaluation_date).toLocaleDateString('fr-FR')}</strong></span>
                        </div>
                    </div>
                    <!-- Élément décoratif -->
                    <div style="
                        position: absolute;
                        top: -50%;
                        right: -10%;
                        width: 200px;
                        height: 200px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 50%;
                        z-index: 1;
                    "></div>
                </div>
            `;

                // Informations de l'étudiant
                const studentInfoHtml = `
                <div style="
                    background: ${student.isAbsent ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'};
                    padding: 20px 25px;
                    border-radius: 12px;
                    margin-bottom: 25px;
                    color: white;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="font-size: 1.4rem; margin: 0 0 5px 0; font-weight: 600;">
                                ${student.firstname} ${student.lastname}
                            </h2>
                            ${student.isAbsent ? '<span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">ABSENT</span>' : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 2px;">Total</div>
                            <div style="font-size: 1.8rem; font-weight: 700; line-height: 1;">
                                ${student.isAbsent ? '-' : student.totalScore.toFixed(1)} <span style="font-size: 1.2rem; font-weight: 400;">/ ${student.totalMaxScore}</span>
                            </div>
                            ${!student.isAbsent ? `<div style="font-size: 0.85rem; opacity: 0.8;">${((student.totalScore / student.totalMaxScore) * 100).toFixed(1)}%</div>` : ''}
                        </div>
                    </div>
                </div>
            `;

                // Tableau des critères
                const tableHtml = `
                <div style="overflow: hidden; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, rgba(98, 151, 241, 0.94) 0%, rgba(6, 182, 212, 1) 100%); color: white;">
                                <th style="padding: 16px; text-align: left; font-weight: 600; width: 35%;">Critère</th>
                                <th style="padding: 16px; text-align: center; font-weight: 600; width: 15%;">Note</th>
                                <th style="padding: 16px; text-align: left; font-weight: 600; width: 50%;">Commentaire</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${student.scores.map((score, scoreIndex) => {
                    const isEven = scoreIndex % 2 === 0;
                    const percentage = score.score !== '-' ? (Number(score.score) / Number(score.maxScore)) * 100 : 0;
                    let scoreColor = '#64748b';
                    if (score.score !== '-') {
                        if (percentage >= 80) scoreColor = '#10b981';
                        else if (percentage >= 60) scoreColor = '#f59e0b';
                        else scoreColor = '#ef4444';
                    }

                    return `
                                    <tr style="background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 16px; border-right: 1px solid #e2e8f0; font-weight: 500; color: #334155;">
                                            ${score.label}
                                        </td>
                                        <td style="padding: 16px; text-align: center; border-right: 1px solid #e2e8f0;">
                                            <div style="display: inline-flex; align-items: center; background: ${score.score === '-' ? '#f1f5f9' : 'rgba(98, 151, 241, 0.1)'}; padding: 6px 12px; border-radius: 20px; font-weight: 600; color: ${scoreColor};">
                                                ${score.score !== null && score.score !== '' ? score.score : '0'} / ${score.maxScore}
                                            </div>
                                        </td>
                                        <td style="padding: 16px; line-height: 1.5; color: #475569;">
                                            ${score.comment ? formatCommentHtml(score.comment) : '<em style="color: #94a3b8;">Aucun commentaire</em>'}
                                        </td>
                                    </tr>
                                `;
                }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

                // Pied de page
                const footerHtml = `
                <div style="
                    position: absolute;
                    bottom: 15mm;
                    left: 20mm;
                    right: 20mm;
                    text-align: center;
                    font-size: 0.8rem;
                    color: #64748b;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 10px;
                ">
                    Page ${index + 1} / ${studentGrades.length} - Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                </div>
            `;

                pdfContainer.innerHTML = headerHtml + studentInfoHtml + tableHtml + footerHtml;
                pdfPages.push(pdfContainer);
            });

            // Créer le PDF avec toutes les pages
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < pdfPages.length; i++) {
                const container = pdfPages[i];
                document.body.appendChild(container);

                const options = {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: container.scrollWidth,
                    height: container.scrollHeight,
                    backgroundColor: '#ffffff'
                };

                const canvas = await html2canvas(container, options);
                const imgData = canvas.toDataURL('image/png', 1.0);

                if (i > 0) {
                    pdf.addPage();
                }

                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pageWidth;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pageHeight));

                document.body.removeChild(container);
            }

            pdf.save(`Evaluation-${evaluationName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
            success('PDF exporté avec succès !');

        } catch (err) {
            console.error(err);
            showError('Erreur lors de l\'exportation du PDF.');
        }
    };

    if (loadingJournal) return <div className="loading-fullscreen">Chargement du journal...</div>;
    if (!currentJournal) return <div className="empty-state"><h3>Aucun journal sélectionné</h3><p>Veuillez sélectionner un journal pour continuer.</p></div>;
    if (loadingEvaluations) return <div className="loading-fullscreen">Chargement des évaluations...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const isArchivedYear = currentJournal?.is_archived ?? false;

    return (
        <div className="correction-list-view">
            <div className="correction-header">
                <div className="header-title">
                    <h1>Évaluations ({currentJournal.name})</h1>
                    <p>Gérez et accédez aux corrections de vos évaluations.</p>
                </div>
                <div className="header-actions">
                    {!isArchivedYear && (
                        <button className="btn-primary" onClick={handleOpenCreateModal}>
                            + Créer une évaluation
                        </button>
                    )}
                </div>
            </div>

            {isArchivedYear ? (
                <div className="archive-warning">
                    Vous consultez un journal archivé. Les modifications sont désactivées.
                </div>
            ) : null}

            {evaluations.length > 0 ? (
                <div className="evaluations-container">
                    {evaluations.map(ev => (
                        <div key={ev.id} className="evaluation-card">
                            <div className="card-header">
                                <h2>{ev.name}</h2>
                                <div className="card-actions">
                                    {!isArchivedYear && <button onClick={() => handleOpenEditModal(ev)} className="btn-edit" title="Modifier">✏️</button>}
                                    <button onClick={() => handleOpenCopyModal(ev)} className="btn-copy" title="Copier">📄</button>
                                    <button onClick={() => handleExportPDF(ev.id, ev.name)} className="btn-export" title="Exporter en PDF">
                                        <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                                             width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000"
                                             preserveAspectRatio="xMidYMid meet">

                                            <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
                                               fill="#F5383F" stroke="none">
                                                <path d="M518 4926 c-87 -24 -156 -85 -197 -176 -20 -45 -21 -57 -21 -2191 0
                                                -2396 -6 -2195 72 -2284 22 -25 64 -58 92 -73 l51 -27 1600 0 1600 0 51 27
                                                c60 32 118 93 148 157 l21 46 0 1325 c0 1097 -2 1334 -14 1380 -16 62 -52 140
                                                -88 187 -31 40 -114 97 -183 125 -53 22 -68 23 -520 28 l-465 5 -55 26 c-70
                                                33 -123 79 -156 135 -56 96 -57 106 -64 564 -6 410 -7 427 -29 488 -55 151
                                                -173 239 -355 262 -114 15 -1431 11 -1488 -4z m955 -2402 c65 -11 138 -63 166
                                                -117 34 -67 35 -182 2 -250 -49 -101 -128 -137 -298 -137 l-113 0 0 -150 0
                                                -150 -130 0 -130 0 0 405 0 405 233 0 c127 0 249 -3 270 -6z m796 -4 c29 -5
                                                69 -18 89 -27 59 -28 126 -102 153 -169 21 -52 23 -75 24 -204 0 -144 0 -146
                                                -33 -212 -38 -78 -101 -138 -170 -164 -39 -14 -91 -18 -289 -22 l-243 -4 0
                                                406 0 406 209 0 c114 0 232 -4 260 -10z m1021 -80 l0 -90 -180 0 -180 0 0 -70
                                                0 -70 155 0 156 0 -3 -82 -3 -83 -152 -3 -153 -3 0 -159 0 -160 -130 0 -130 0
                                                0 405 0 405 310 0 310 0 0 -90z"/>
                                                <path d="M1230 2270 l0 -93 58 6 c31 2 69 10 84 17 51 24 60 97 16 136 -13 13
                                                    -40 20 -89 22 l-69 4 0 -92z"/>
                                                <path d="M2050 2119 l0 -222 70 6 c138 12 165 46 165 212 -1 138 -15 177 -77
                                                    205 -26 12 -65 20 -100 20 l-58 0 0 -221z"/>
                                                <path d="M2398 4830 c17 -25 46 -88 64 -140 l33 -95 5 -390 c7 -442 7 -447 86
                                                    -534 25 -27 66 -60 92 -73 46 -23 53 -23 472 -29 477 -7 502 -10 621 -84 33
                                                    -20 62 -35 64 -34 2 2 -267 265 -597 584 -881 852 -875 845 -840 795z"/>
                                                    </g>
                                        </svg>

                                    </button>
                                    {!isArchivedYear && <button onClick={() => handleDeleteClick(ev)} className="btn-delete" title="Supprimer">🗑️</button>}
                                </div>
                            </div>
                            <Link to={`/correction/${ev.id}`} className="card-link-area">
                                <div className="card-body">
                                    <p><strong>Classe:</strong> {ev.class_name}</p>
                                    <span className="card-date">{new Date(ev.evaluation_date).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="card-footer">
                                    <span>{isArchivedYear ? 'Visualiser' : 'Corriger'}</span>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <h3>Aucune évaluation pour le journal : {currentJournal.name}</h3>
                    <p>Créez votre première évaluation pour commencer.</p>
                </div>
            )}

            <EvaluationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvaluation}
                evaluation={editingEvaluation}
                evaluationToCopy={evaluationToCopy}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={() => setConfirmModal({ isOpen: false })}
                onConfirm={confirmModal.onConfirm}
            />
        </div>
    );
};

export default CorrectionList;