import React, { useState, useEffect } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useJournal } from '../../hooks/useJournal';
import { getEvaluationTemplates, getEvaluationById } from '../../services/EvaluationService';
import { useToast } from '../../hooks/useToast';
import './EvaluationModal.scss';
import { TextField } from "@mui/material";

const EvaluationModal = ({ isOpen, onClose, onSave, evaluation, evaluationToCopy }) => {
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id;
    const { classes } = useClasses(journalId);
    const { error: showError } = useToast();

    // États du formulaire
    const [name, setName] = useState('');
    const [classId, setClassId] = useState('');
    const [date, setDate] = useState('');
    const [criteria, setCriteria] = useState([{ label: '', max_score: '' }]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Effet pour réinitialiser l'état quand la modale est fermée
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setClassId('');
            setDate('');
            setCriteria([{ label: '', max_score: '' }]);
            setSelectedTemplateId('');
            setTemplates([]);
            setIsLoading(false);
        }
    }, [isOpen]);

    // Effet pour charger les données initiales (édition, copie, ou templates)
    useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            if (evaluation) {
                setIsLoading(true);
                try {
                    const response = await getEvaluationById(evaluation.id);
                    const { name: evalName, class_id, evaluation_date, criteria: evalCriteria } = response.data;
                    setName(evalName);
                    setClassId(class_id);
                    setDate(new Date(evaluation_date).toISOString().split('T')[0]);
                    setCriteria(evalCriteria.length ? evalCriteria.map(c => ({ label: c.label, max_score: c.max_score })) : [{ label: '', max_score: '' }]);
                } catch (err) { showError("Erreur au chargement de l'évaluation."); }
                finally { setIsLoading(false); }
            }
            else if (evaluationToCopy) {
                setIsLoading(true);
                try {
                    const response = await getEvaluationById(evaluationToCopy.id);
                    const { name: evalName, class_id, criteria: evalCriteria } = response.data;
                    setName(`Copie de ${evalName}`);
                    setClassId(class_id);
                    setDate(new Date().toISOString().split('T')[0]);
                    setCriteria(evalCriteria.length ? evalCriteria.map(c => ({ label: c.label, max_score: c.max_score })) : [{ label: '', max_score: '' }]);
                } catch (err) { showError("Erreur au chargement du modèle à copier."); }
                finally { setIsLoading(false); }
            }
            else if (currentJournal?.id) {
                try {
                    const response = await getEvaluationTemplates();
                    setTemplates(response.data || []);
                    setDate(new Date().toISOString().split('T')[0]);
                } catch (err) { showError("Impossible de charger les modèles."); }
            }
        };

        loadData();
    }, [isOpen, evaluation, evaluationToCopy, currentJournal, showError]);

    // Effet pour charger les détails d'un template sélectionné
    useEffect(() => {
        if (!selectedTemplateId) return;

        const loadTemplateDetails = async () => {
            setIsLoading(true);
            try {
                const response = await getEvaluationById(selectedTemplateId);
                const { name: evalName, criteria: evalCriteria } = response.data;
                setName(evalName);
                setCriteria(evalCriteria.length ? evalCriteria.map(c => ({ label: c.label, max_score: c.max_score })) : [{ label: '', max_score: '' }]);
            } catch (err) { showError("Erreur au chargement des détails du modèle."); }
            finally { setIsLoading(false); }
        };

        loadTemplateDetails();
    }, [selectedTemplateId, showError]);

    const handleTemplateChange = (e) => {
        const id = e.target.value;
        setSelectedTemplateId(id);
        if (!id) { // Si l'utilisateur choisit "Partir de zéro"
            setName('');
            setCriteria([{ label: '', max_score: '' }]);
        }
    };

    const handleCriterionChange = (index, field, value) => {
        const newCriteria = [...criteria];
        newCriteria[index][field] = value;
        setCriteria(newCriteria);
    };

    const addCriterion = () => setCriteria([...criteria, { label: '', max_score: '' }]);
    const removeCriterion = (index) => {
        if (criteria.length > 1) setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({
            name,
            class_id: classId,
            date,
            journal_id: journalId,
            criteria: criteria.filter(c => c.label && c.max_score),
        });
        setIsSaving(false);
    };

    if (!isOpen) return null;

    const getModalTitle = () => {
        if (evaluation) return "Modifier l'évaluation";
        if (evaluationToCopy) return "Copier l'évaluation";
        return "Nouvelle Évaluation";
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header"><h3>{getModalTitle()}</h3><button className="modal-close" onClick={onClose}>×</button></div>
                {isLoading ? <div className="loading-modal">Chargement...</div> : (
                    <form className="class-form" onSubmit={handleSubmit}>
                        {!evaluation && !evaluationToCopy && (
                            <div className="form-group">
                                <label>Partir d'un modèle (optionnel)</label>
                                <select value={selectedTemplateId} onChange={handleTemplateChange}>
                                    <option value="">-- Partir de zéro --</option>
                                    {templates.map(template => (
                                        <option key={template.id} value={template.id}>
                                            {template.journal_name} - {template.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="form-group"><label>Nom</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Classe</label>
                                <select value={classId} onChange={(e) => setClassId(e.target.value)} required disabled={!!evaluation}>
                                    <option value="">-- Choisir --</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                        </div>
                        <h4>Critères de correction</h4>
                        {criteria.map((criterion, index) => (
                            <div className="criterion-row form-group" key={index}>
                                <TextField fullWidth multiline rows={1} placeholder={`Critère ${index + 1}`} value={criterion.label} onChange={(e) => handleCriterionChange(index, 'label', e.target.value)} />
                                <input type="number" placeholder="Score" value={criterion.max_score} onChange={(e) => handleCriterionChange(index, 'max_score', e.target.value)} />
                                <button type="button" className="btn-delete" onClick={() => removeCriterion(index)} disabled={criteria.length <= 1}>–</button>
                            </div>
                        ))}
                        <button type="button" className="btn-add-criterion" onClick={addCriterion}>+ Ajouter un critère</button>
                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
                            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EvaluationModal;