import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations, createEvaluation } from '../../services/EvaluationService';
import EvaluationModal from './EvaluationModal';
import { useToast } from '../../hooks/useToast';
import './CorrectionList.scss';

const CorrectionList = () => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState('');
    const { success, error: showError } = useToast();

    useEffect(() => {
        const fetchEvaluations = async () => {
            try {
                setLoading(true);
                const response = await getEvaluations();
                const data = response.data || [];
                setEvaluations(data);
                if (data.length > 0) {
                    // Sélectionne l'année scolaire la plus récente par défaut
                    setSelectedYear(data[0].school_year);
                }
            } catch (err) {
                setError('Impossible de charger les évaluations.');
                showError(err.message || 'Erreur de chargement');
            } finally {
                setLoading(false);
            }
        };
        fetchEvaluations();
    }, [showError]);

    const handleSaveEvaluation = async (evaluationData) => {
        try {
            const response = await createEvaluation(evaluationData);
            // Ajoute la nouvelle évaluation et retri la liste
            const newEvaluations = [...evaluations, response.data].sort((a, b) => {
                if (a.school_year !== b.school_year) {
                    return b.school_year.localeCompare(a.school_year);
                }
                return new Date(b.date) - new Date(a.date);
            });
            setEvaluations(newEvaluations);
            setIsModalOpen(false);
            success('Évaluation créée avec succès !');
            // Met à jour l'année sélectionnée si c'est une nouvelle année
            if (!schoolYears.includes(response.data.school_year)) {
                setSelectedYear(response.data.school_year);
            }
        } catch (err) {
            showError(err.message || 'Erreur lors de la création de l\'évaluation');
        }
    };

    const schoolYears = useMemo(() => {
        return [...new Set(evaluations.map(e => e.school_year))].sort((a, b) => b.localeCompare(a));
    }, [evaluations]);

    const filteredEvaluations = useMemo(() => {
        if (!selectedYear) return [];
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
                        <option value="">Toutes les années</option>
                        {schoolYears.map(year => (
                            <option key={year} value={year}>Année {year}</option>
                        ))}
                    </select>
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        + Créer une évaluation
                    </button>
                </div>
            </div>

            {filteredEvaluations.length > 0 ? (
                <div className="evaluations-container">
                    {filteredEvaluations.map(ev => (
                        <Link to={`/correction/${ev.id}`} key={ev.id} className="evaluation-card">
                            <div className="card-header">
                                <h2>{ev.name}</h2>
                                <span className="card-date">{new Date(ev.date).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="card-body">
                                <p><strong>Classe:</strong> {ev.class_name}</p>
                            </div>
                            <div className="card-footer">
                                <span>Corriger</span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <h3>Aucune évaluation pour l'année {selectedYear}</h3>
                    <p>Créez votre première évaluation pour commencer.</p>
                </div>
            )}

            <EvaluationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvaluation}
            />
        </div>
    );
};

export default CorrectionList;