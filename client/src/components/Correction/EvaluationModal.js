import React, { useState, useEffect } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useJournal } from '../../hooks/useJournal';
import { getEvaluationForGrading } from '../../services/EvaluationService'; // Import du service
import { useToast } from '../../hooks/useToast';
import './EvaluationModal.scss';
import {TextField} from "@mui/material";

const EvaluationModal = ({ isOpen, onClose, onSave, evaluation }) => {
    const { classes } = useClasses();
    const { currentJournal } = useJournal();
    const { error: showError } = useToast();

    const [name, setName] = useState('');
    const [classId, setClassId] = useState('');
    const [date, setDate] = useState('');
    const [criteria, setCriteria] = useState([{ label: '', max_score: '' }]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadEvaluationDetails = async () => {
            if (evaluation && evaluation.id) {
                setIsLoading(true);
                try {
                    // On va chercher les détails complets, y compris les critères
                    const response = await getEvaluationForGrading(evaluation.id);
                    const { evaluation: evalDetails, criteria: evalCriteria } = response.data;

                    setName(evalDetails.name);
                    setClassId(evalDetails.class_id);
                    setDate(new Date(evalDetails.evaluation_date).toISOString().split('T')[0]);
                    setCriteria(evalCriteria.length ? evalCriteria : [{ label: '', max_score: '' }]);

                } catch (err) {
                    showError("Impossible de charger les détails de l'évaluation.");
                    onClose(); // On ferme la modale en cas d'erreur
                } finally {
                    setIsLoading(false);
                }
            } else {
                // On initialise pour une nouvelle évaluation
                setName('');
                setClassId('');
                setDate(new Date().toISOString().split('T')[0]);
                setCriteria([{ label: '', max_score: '' }]);
            }
        };

        if (isOpen) {
            loadEvaluationDetails();
        }
    }, [isOpen, evaluation, showError, onClose]);

    const handleCriterionChange = (index, field, value) => {
        const newCriteria = [...criteria];
        newCriteria[index][field] = value;
        setCriteria(newCriteria);
    };

    const addCriterion = () => {
        setCriteria([...criteria, { label: '', max_score: '' }]);
    };

    const removeCriterion = (index) => {
        if (criteria.length > 1) { // Empêche de supprimer le dernier critère
            const newCriteria = criteria.filter((_, i) => i !== index);
            setCriteria(newCriteria);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const evaluationData = {
            name,
            class_id: classId,
            date,
            school_year: currentJournal.school_year,
            criteria: criteria.filter(c => c.label && c.max_score),
        };
        await onSave(evaluationData);
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>{evaluation ? "Modifier l'évaluation" : 'Nouvelle Évaluation'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                {isLoading ? (
                    <div className="loading-modal">Chargement des détails...</div>
                ) : (
                    <form className="class-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Nom de l'évaluation</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Classe</label>
                                <select value={classId} onChange={(e) => setClassId(e.target.value)} required disabled={!!evaluation}>
                                    <option value="">-- Choisir une classe --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                            </div>
                        </div>

                        <h4>Critères de correction</h4>
                        {criteria.map((criterion, index) => (
                            <div className="criterion-row form-group" key={index}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={1}
                                    placeholder={`Critère ${index + 1}`}
                                    value={criterion.label}
                                    onChange={(e) => handleCriterionChange(index, 'label', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Score max"
                                    value={criterion.max_score}
                                    onChange={(e) => handleCriterionChange(index, 'max_score', e.target.value)}
                                />
                                <button type="button" className="btn-delete" onClick={() => removeCriterion(index)} disabled={criteria.length <= 1}>–</button>
                            </div>
                        ))}
                        <button type="button" className="btn-add-criterion" onClick={addCriterion}>+ Ajouter un critère</button>

                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
                            <button type="submit" className="btn-primary" disabled={isSaving}>
                                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EvaluationModal;