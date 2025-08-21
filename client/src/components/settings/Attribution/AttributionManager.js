import React, { useState, useEffect } from 'react';
import AttributionService from '../../../services/AttributionService';
import { useSchoolYears } from "../../../hooks/useSchoolYear";
import { useToast } from '../../../hooks/useToast';
import ConfirmModal from '../../ConfirmModal';
import SchoolYearDisplay from '../../../hooks/SchoolYearDisplay'; // Assurez-vous que le chemin d'importation est correct
import { format } from 'date-fns';

const AttributionManager = () => {
    // Utilisation de votre hook personnalisé pour les années scolaires
    const { schoolYears, loading: schoolYearsLoading } = useSchoolYears();

    // États pour les données de ce composant
    const [attributions, setAttributions] = useState([]);
    const [attributionsLoading, setAttributionsLoading] = useState(true);

    // États pour l'interface utilisateur (UI)
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null });

    // État pour le formulaire
    const [formData, setFormData] = useState({
        school_year_id: '',
        school_name: '',
        start_date: '',
        end_date: '',
        esi_hours: 0,
        ess_hours: 0,
        className: ''
    });

    const { success, error } = useToast();

    // Charge les attributions
    const fetchAttributions = async () => {
        setAttributionsLoading(true);
        try {
            const response = await AttributionService.getAttributions();
            setAttributions(response.data);
        } catch (err) {
            error('Erreur de chargement des attributions.');
        } finally {
            setAttributionsLoading(false);
        }
    };

    useEffect(() => {
        fetchAttributions();
    }, []);

    // Gère les changements dans les champs du formulaire
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Fonctions pour gérer le formulaire (handleAddNew, handleEdit, handleSave)
    const handleAddNew = () => {
        setEditing(null);
        setFormData({ school_year_id: '', school_name: '', start_date: '', end_date: '', esi_hours: 0, ess_hours: 0, className: '' });
        setShowForm(true);
    };

    const handleEdit = (attribution) => {
        setEditing(attribution);
        setFormData({
            id: attribution.id,
            school_year_id: attribution.school_year_id,
            school_name: attribution.school_name,
            start_date: format(new Date(attribution.start_date), 'yyyy-MM-dd'),
            end_date: format(new Date(attribution.end_date), 'yyyy-MM-dd'),
            className: attribution.class || '',
            esi_hours: attribution.esi_hours || 0,
            ess_hours: attribution.ess_hours || 0,
        });
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            error("La date de fin doit être postérieure à la date de début.");
            return;
        }
        if (!formData.school_year_id) {
            error("Veuillez sélectionner une année scolaire.");
            return;
        }
        try {
            await AttributionService.saveAttribution(formData);
            success(`Attribution sauvegardée avec succès.`);
            setShowForm(false);
            setEditing(null);
            fetchAttributions();
        } catch (err) {
            error(err.message || 'Erreur lors de la sauvegarde.');
        }
    };

    // Fonctions pour la modale de confirmation
    const handleDelete = (attribution) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer l'attribution pour ${attribution.school_name} (${attribution.school_year_name}) ?`,
            onConfirm: async () => {
                try {
                    await AttributionService.deleteAttribution(attribution.id);
                    success('Attribution supprimée avec succès.');
                    fetchAttributions();
                } catch (err) {
                    error(err.message || 'Erreur lors de la suppression.');
                }
                closeConfirmModal();
            }
        });
    };

    const closeConfirmModal = () => setConfirmModal({ isOpen: false, onConfirm: null });

    // Logique de groupement par ID d'année scolaire
    const groupedAttributions = attributions.reduce((acc, curr) => {
        const yearId = curr.school_year_id || 'unknown';
        (acc[yearId] = acc[yearId] || []).push(curr);
        return acc;
    }, {});

    // Tri des groupes basé sur le nom de l'année scolaire
    const sortedGroupKeys = Object.keys(groupedAttributions).sort((a, b) => {
        if (a === 'unknown') return 1;
        if (b === 'unknown') return -1;
        const nameA = groupedAttributions[a][0].start_date;
        const nameB = groupedAttributions[b][0].start_date;
        return nameB.localeCompare(nameA);
    });

    const isLoading = attributionsLoading || schoolYearsLoading;

    if (isLoading) {
        return <div className="loading"><div className="spinner"></div><p>Chargement des données...</p></div>;
    }

    return (
        <div className="attribution-manager">
            <div className="attribution-header">
                <h2>💼 Mes Attributions</h2>
                <button className="btn-primary" onClick={handleAddNew}>
                    <span>➕</span> Ajouter une attribution
                </button>
            </div>
            <p className="description">Gérez vos informations professionnelles pour chaque contrat et année scolaire.</p>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editing ? 'Modifier l\'attribution' : 'Nouvelle attribution'}</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className="class-form">
                            <div className="form-group">
                                <label htmlFor="school_year_id">Année scolaire</label>
                                <select id="school_year_id" name="school_year_id" value={formData.school_year_id} onChange={handleFormChange} required>
                                    <option value="">-- Sélectionnez une année --</option>
                                    {schoolYears.map(sy => (
                                        <option key={sy.id} value={sy.id}>{sy.start_date} - {sy.end_date}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="school_name">Nom de l'école</label>
                                <input id="school_name" name="school_name" type="text" value={formData.school_name} onChange={handleFormChange} placeholder="Ex: Institut Saint-Laurent" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="className">Classe (Optionnel)</label>
                                <input id="className" name="className" type="text" value={formData.className} onChange={handleFormChange} placeholder="Ex: 3TTINFO" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="start_date">Date de début</label>
                                    <input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleFormChange} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="end_date">Date de fin</label>
                                    <input id="end_date" name="end_date" type="date" value={formData.end_date} onChange={handleFormChange} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="esi_hours">Heures ESI</label>
                                    <input id="esi_hours" name="esi_hours" type="number" value={formData.esi_hours} onChange={handleFormChange} min="0" />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="ess_hours">Heures ESS</label>
                                    <input id="ess_hours" name="ess_hours" type="number" value={formData.ess_hours} onChange={handleFormChange} min="0" />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                                <button type="submit" className="btn-primary">{editing ? 'Sauvegarder' : 'Ajouter'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="attribution-list">
                {sortedGroupKeys.length > 0 ? (
                    sortedGroupKeys.map(yearId => (
                        <div key={yearId} className="attribution-year-group">
                            <h3 className="year-group-title">
                                <SchoolYearDisplay schoolYearId={yearId} />
                            </h3>
                            {groupedAttributions[yearId].map(item => (
                                <div className="attribution-item" key={item.id}>
                                    <div className="item-details">
                                        <strong>{item.school_name} {item.class && ` - ${item.class}`}</strong>
                                        <p>Du {format(new Date(item.start_date), 'dd/MM/yyyy')} au {format(new Date(item.end_date), 'dd/MM/yyyy')}</p>
                                        <p><strong>ESI:</strong> {item.esi_hours || 0}h | <strong>ESS:</strong> {item.ess_hours || 0}h</p>
                                    </div>
                                    <div className="item-actions">
                                        <button className="btn-edit" onClick={() => handleEdit(item)} title="Modifier">✏️</button>
                                        <button className="btn-delete" onClick={() => handleDelete(item)} title="Supprimer">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <p>Aucune attribution enregistrée pour le moment.</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Confirmer la suppression"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    );
};

export default AttributionManager;