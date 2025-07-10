import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } from '../../services/EvaluationService';
import EvaluationModal from './EvaluationModal';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import { useJournal } from '../../hooks/useJournal';
import './CorrectionList.scss';

const CorrectionList = () => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState(null);
    const [evaluationToCopy, setEvaluationToCopy] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const { currentJournal } = useJournal();
    const [selectedYear, setSelectedYear] = useState('');
    const { success, error: showError } = useToast();

    const fetchEvaluations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getEvaluations();
            setEvaluations(response.data || []);
        } catch (err) {
            const errorMessage = 'Impossible de charger les évaluations.';
            setError(errorMessage);
            showError(err.message || errorMessage);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations]);

    // Effet pour synchroniser l'année sélectionnée
    useEffect(() => {
        setSelectedYear(currentJournal?.school_year);

    }, [evaluations, currentJournal, selectedYear]);


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
            setEvaluations(prev => prev.filter(e => e.id !== id));
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
                const response = await updateEvaluation(editingEvaluation.id, evaluationData);
                await fetchEvaluations(); // Re-fetch pour avoir la liste à jour
                success('Évaluation mise à jour !');
            } else {
                const response = await createEvaluation(evaluationData);
                await fetchEvaluations(); // Re-fetch pour avoir la liste à jour
                success('Évaluation créée avec succès !');
                // Sélectionner la nouvelle année si elle n'existait pas
                if (!schoolYears.includes(response.data.school_year)) {
                    setSelectedYear(response.data.school_year);
                }
            }
            setIsModalOpen(false);
            setEditingEvaluation(null);
            setEvaluationToCopy(null);
        } catch (err) {
            showError(err.message || "Erreur lors de la sauvegarde de l'évaluation");
        }
    };

    const schoolYears = useMemo(() => {
        return [...new Set(evaluations.map(e => e.school_year))].sort((a, b) => b.localeCompare(a));
    }, [evaluations]);

    const filteredEvaluations = useMemo(() => {
        if (!selectedYear) return []; // Retourne un tableau vide si aucune année n'est sélectionnée
        return evaluations.filter(e => e.school_year === selectedYear);
    }, [evaluations, selectedYear]);

    if (loading) return <div className="loading-fullscreen">Chargement des évaluations...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const isArchivedYear = currentJournal.is_archived;

    return (
        <div className="correction-list-view">
            <div className="correction-header">
                <div className="header-title">
                    <h1>Évaluations</h1>
                    <p>Gérez et accédez aux corrections de vos évaluations.</p>
                </div>
                <div className="header-actions">
                    <select value={selectedYear} className="year-filter" readOnly>
                        {schoolYears.map(year => (
                            <option key={year} value={selectedYear}>Année {selectedYear}</option>
                        ))}
                    </select>
                    {!isArchivedYear && (
                        <button className="btn-primary" onClick={handleOpenCreateModal}>
                            + Créer une évaluation
                        </button>
                    )}
                </div>
            </div>
            {isArchivedYear && selectedYear ? (
                <div className="archive-warning">
                    Vous consultez une année archivée ({selectedYear}). Les modifications sont désactivées.
                </div>
            ) : null}

            {filteredEvaluations.length > 0 ? (
                <div className="evaluations-container">
                    {filteredEvaluations.map(ev => (
                        <div key={ev.id} className="evaluation-card">
                            <div className="card-header">
                                <h2>{ev.name}</h2>
                                <div className="card-actions">
                                    {!isArchivedYear && (
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ev); }} className="btn-edit" title="Modifier">✏️</button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenCopyModal(ev); }} className="btn-copy" title="Copier">📄</button>
                                    {!isArchivedYear && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(ev); }} className="btn-delete" title="Supprimer">🗑️</button>
                                    )}
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
                !loading && (
                    <div className="empty-state">
                        <h3>Aucune évaluation pour l'année {selectedYear || ''}</h3>
                        <p>Créez votre première évaluation pour commencer.</p>
                    </div>
                )
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