import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } from '../../services/EvaluationService';
import EvaluationModal from './EvaluationModal';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import { useJournal } from '../../hooks/useJournal';
import './CorrectionList.scss';

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
            setEvaluations([]); // Vide la liste si aucun journal n'est sélectionné
            setLoadingEvaluations(false);
            return;
        }

        setLoadingEvaluations(true);
        setError('');
        try {
            // On passe l'ID du journal courant au service pour filtrer côté backend
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
            await fetchEvaluations(); // Re-fetch pour avoir les données à jour
            success('Évaluation supprimée.');
        } catch (err) {
            showError(err.message || 'Erreur de suppression');
        } finally {
            setConfirmModal({ isOpen: false });
        }
    };

    const handleSaveEvaluation = async (evaluationData) => {
        try {
            // Le payload est déjà correctement préparé par EvaluationModal avec le journal_id
            if (editingEvaluation) {
                await updateEvaluation(editingEvaluation.id, evaluationData);
                success('Évaluation mise à jour !');
            } else {
                await createEvaluation(evaluationData);
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