import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation } from '../../services/EvaluationService';
import EvaluationModal from './EvaluationModal';
import ConfirmModal from '../ConfirmModal';
import { useToast } from '../../hooks/useToast';
import './CorrectionList.scss';

const CorrectionList = () => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [selectedYear, setSelectedYear] = useState('');
    const { success, error: showError } = useToast();

    const fetchEvaluations = async () => {
        try {
            setLoading(true);
            const response = await getEvaluations();
            const data = response.data || [];
            setEvaluations(data);
            if (data.length > 0 && !selectedYear) {
                setSelectedYear(data[0].school_year);
            }
        } catch (err) {
            setError('Impossible de charger les évaluations.');
            showError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvaluations();
    }, [showError]);

    const handleOpenCreateModal = () => {
        setEditingEvaluation(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (ev) => {
        setEditingEvaluation(ev);
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
                setEvaluations(prev => prev.map(e => (e.id === editingEvaluation.id ? response.data : e)));
                success('Évaluation mise à jour !');
            } else {
                const response = await createEvaluation(evaluationData);
                setEvaluations(prev => [response.data, ...prev]);
                success('Évaluation créée avec succès !');
                if (!schoolYears.includes(response.data.school_year)) {
                    setSelectedYear(response.data.school_year);
                }
            }
            setIsModalOpen(false);
            setEditingEvaluation(null);
        } catch (err) {
            showError(err.message || "Erreur lors de la sauvegarde de l'évaluation");
        }
    };

    const schoolYears = useMemo(() => {
        return [...new Set(evaluations.map(e => e.school_year))].sort((a, b) => b.localeCompare(a));
    }, [evaluations]);

    const filteredEvaluations = useMemo(() => {
        if (!selectedYear) return evaluations;
        return evaluations.filter(e => e.school_year === selectedYear);
    }, [evaluations, selectedYear]);

    if (loading) return <div className="loading-fullscreen">Chargement des évaluations...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="correction-list-view">
            <div className="correction-header">
                <div className="header-title">
                    <h1>Évaluations</h1>
                    <p>Gérez et accédez aux corrections de vos évaluations.</p>
                </div>
                <div className="header-actions">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="year-filter">
                        {schoolYears.map(year => (
                            <option key={year} value={year}>Année {year}</option>
                        ))}
                    </select>
                    <button className="btn-primary" onClick={handleOpenCreateModal}>
                        + Créer une évaluation
                    </button>
                </div>
            </div>

            {filteredEvaluations.length > 0 ? (
                <div className="evaluations-container">
                    {filteredEvaluations.map(ev => (
                        <div key={ev.id} className="evaluation-card">
                            <div className="card-header">
                                <h2>{ev.name}</h2>
                                <div className="card-actions">
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ev); }} className="btn-edit">✏️</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(ev); }} className="btn-delete">🗑️</button>
                                </div>
                            </div>
                            <Link to={`/correction/${ev.id}`} className="card-link-area">
                                <div className="card-body">
                                    <p><strong>Classe:</strong> {ev.class_name}</p>
                                    <span className="card-date">{new Date(ev.evaluation_date).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="card-footer">
                                    <span>Corriger</span>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <h3>Aucune évaluation pour l'année {selectedYear || ''}</h3>
                    <p>Créez votre première évaluation pour commencer.</p>
                </div>
            )}

            <EvaluationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvaluation}
                evaluation={editingEvaluation}
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