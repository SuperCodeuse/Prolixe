import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } from '../../services/EvaluationService';
import EvaluationModal from './EvaluationModal';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import { useJournal } from '../../hooks/useJournal';
import './CorrectionList.scss';

const CorrectionList = () => {
    // 1. Destructurer correctement le hook useJournal
    const { journals, currentJournal, loading: loadingJournal } = useJournal();
    const { success, error: showError } = useToast();

    const [evaluations, setEvaluations] = useState([]);
    const [loadingEvaluations, setLoadingEvaluations] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState(null);
    const [evaluationToCopy, setEvaluationToCopy] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [selectedYear, setSelectedYear] = useState('');

    // 2. Récupérer les évaluations UNIQUEMENT pour le journal courant
    const fetchEvaluations = useCallback(async () => {
        if (!currentJournal) return; // Ne rien faire si aucun journal n'est sélectionné

        setLoadingEvaluations(true);
        setError('');
        try {
            // On suppose que getEvaluations peut prendre un ID de journal
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

    // Relancer la récupération si le journal courant change
    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations]);

    // 3. Corriger la synchronisation de l'année sélectionnée
    useEffect(() => {
        if (currentJournal) {
            // On suppose que le nom du journal est l'année scolaire
            setSelectedYear(currentJournal.name);
        }
    }, [currentJournal]);

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
            // La meilleure pratique est de refaire un fetch pour avoir les données à jour
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
            const payload = { ...evaluationData, journal_id: currentJournal.id };
            if (editingEvaluation) {
                await updateEvaluation(editingEvaluation.id, payload);
                success('Évaluation mise à jour !');
            } else {
                await createEvaluation(payload);
                success('Évaluation créée avec succès !');
            }
            await fetchEvaluations(); // Re-fetch pour avoir la liste à jour
            setIsModalOpen(false);
            setEditingEvaluation(null);
            setEvaluationToCopy(null);
        } catch (err) {
            showError(err.message || "Erreur lors de la sauvegarde de l'évaluation");
        }
    };

    // La liste des années vient des journaux disponibles
    const schoolYears = useMemo(() => journals.map(j => j.name), [journals]);

    // Le filtrage se fait maintenant sur toutes les évaluations récupérées pour le journal
    const filteredEvaluations = useMemo(() => {
        if (!selectedYear) return [];
        // On suppose que `evaluation.school_year` correspond à `journal.name`
        return evaluations.filter(e => e.school_year === selectedYear);
    }, [evaluations, selectedYear]);

    // 4. Ajouter des gardes pour les états de chargement et l'absence de journal
    if (loadingJournal) return <div className="loading-fullscreen">Chargement du journal...</div>;
    if (!currentJournal) return <div className="empty-state"><h3>Aucun journal sélectionné</h3><p>Veuillez sélectionner un journal pour continuer.</p></div>;
    if (loadingEvaluations) return <div className="loading-fullscreen">Chargement des évaluations...</div>;
    if (error) return <div className="error-message">{error}</div>;

    // 5. Utiliser l'optional chaining pour la sécurité
    const isArchivedYear = currentJournal?.is_archived ?? false;

    return (
        <div className="correction-list-view">
            <div className="correction-header">
                <div className="header-title">
                    <h1>Évaluations</h1>
                    <p>Gérez et accédez aux corrections de vos évaluations.</p>
                </div>
                <div className="header-actions">
                    {/* 6. Corriger le select et ajouter un handler onChange */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="year-filter"
                    >
                        {schoolYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    {!isArchivedYear && (
                        <button className="btn-primary" onClick={handleOpenCreateModal}>
                            + Créer une évaluation
                        </button>
                    )}
                </div>
            </div>

            {isArchivedYear ? (
                <div className="archive-warning">
                    Vous consultez un journal archivé ({selectedYear}). Les modifications sont désactivées.
                </div>
            ) : null}

            {filteredEvaluations.length > 0 ? (
                <div className="evaluations-container">
                    {filteredEvaluations.map(ev => (
                        <div key={ev.id} className="evaluation-card">
                            <div className="card-header">
                                <h2>{ev.name}</h2>
                                <div className="card-actions">
                                    {!isArchivedYear && <button onClick={() => handleOpenEditModal(ev)} className="btn-edit" title="Modifier">✏️</button>}
                                    <button onClick={() => handleOpenCopyModal(ev)} className="btn-copy" title="Copier">📄</button>
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
                    <h3>Aucune évaluation pour le journal : {selectedYear || ''}</h3>
                    <p>Créez votre première évaluation pour commencer.</p>
                </div>
            )}

            <EvaluationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvaluation}
                evaluation={editingEvaluation}
                evaluationToCopy={evaluationToCopy}
                currentJournalId={currentJournal.id}
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