import React, { useState, useEffect } from 'react';
import AttributionService from '../../../services/AttributionService';
import { useToast } from '../../../hooks/useToast';
import ConfirmModal from '../../ConfirmModal';
import { format } from 'date-fns';
import './AttributionManager.scss';

const AttributionManager = () => {
    const [attributions, setAttributions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    // --- MODIFICATION : 'class' renommé en 'className' pour éviter les conflits JS ---
    const [formData, setFormData] = useState({
        school_year: '',
        school_name: '',
        start_date: '',
        end_date: '',
        esi_hours: 0,
        ess_hours: 0,
        className: '' // Renommé ici
    });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const { success, error } = useToast();

    const fetchAttributions = async () => {
        try {
            setIsLoading(true);
            const response = await AttributionService.getAttributions();
            setAttributions(response.data);
        } catch (err) {
            error('Erreur de chargement des attributions.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAttributions();
    }, []);

    const handleAddNew = () => {
        setEditing(null);
        const currentYear = new Date().getFullYear();
        const nextYear = (currentYear + 1).toString();
        setFormData({
            school_year: `${currentYear}-${nextYear}`,
            school_name: '',
            start_date: '',
            end_date: '',
            esi_hours: 0,
            ess_hours: 0,
            className: '', // Modifié ici
        });
        setShowForm(true);
    };

    const handleEdit = (attribution) => {
        setEditing(attribution);
        setFormData({
            id: attribution.id,
            school_year: attribution.school_year,
            school_name: attribution.school_name,
            start_date: format(new Date(attribution.start_date), 'yyyy-MM-dd'),
            end_date: format(new Date(attribution.end_date), 'yyyy-MM-dd'),
            // --- MODIFICATION : Mappe la propriété 'class' de l'objet vers 'className' dans le state ---
            className: attribution.class || '', // Le champ de la BDD s'appelle 'class'
            esi_hours: attribution.esi_hours || 0,
            ess_hours: attribution.ess_hours || 0,
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditing(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            error("La date de fin doit être postérieure à la date de début.");
            return;
        }

        try {
            // Pas de changement nécessaire ici, formData contient déjà 'className'
            const dataToSave = editing ? { ...formData, id: editing.id } : formData;
            // AttributionService doit envoyer { ..., className: '...' } au backend
            await AttributionService.saveAttribution(dataToSave);
            success(`Attribution sauvegardée avec succès.`);
            setShowForm(false);
            setEditing(null);
            fetchAttributions();
        } catch (err) {
            error(err.message || 'Erreur lors de la sauvegarde.');
        }
    };

    const handleDelete = (attribution) => {
        setConfirmModal({
            isOpen: true,
            title: 'Confirmer la suppression',
            message: `Êtes-vous sûr de vouloir supprimer l'attribution pour la classe ${attribution.class} à ${attribution.school_name} ?`,
            onConfirm: async () => {
                try {
                    await AttributionService.deleteAttribution(attribution.id);
                    success('Attribution supprimée.');
                    fetchAttributions();
                } catch (err) {
                    error(err.message || 'Erreur de suppression.');
                } finally {
                    closeConfirmModal();
                }
            }
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false });
    };

    const groupedAttributions = attributions.reduce((acc, curr) => {
        const year = curr.school_year;
        (acc[year] = acc[year] || []).push(curr);
        return acc;
    }, {});

    const sortedYears = Object.keys(groupedAttributions).sort((a, b) => b.localeCompare(a));

    if (isLoading) return <p>Chargement...</p>;

    return (
        <div className="attribution-manager">
            <div className="attribution-header">
                <h2>💼 Mes Attributions</h2>
                <button className="btn-primary" onClick={handleAddNew}>
                    <span>➕</span> Ajouter une attribution
                </button>
            </div>
            <p>Gérez vos informations professionnelles pour chaque contrat et année scolaire.</p>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editing ? 'Modifier l\'attribution' : 'Nouvelle attribution'}</h3>
                            <button className="modal-close" onClick={handleCancel}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className="class-form">
                            <div className="form-group">
                                <label>Année scolaire</label>
                                <input type="text" value={formData.school_year} onChange={(e) => setFormData({ ...formData, school_year: e.target.value })} placeholder="Ex: 2024-2025" required />
                            </div>
                            <div className="form-group">
                                <label>Nom de l'école</label>
                                <input type="text" value={formData.school_name} onChange={(e) => setFormData({ ...formData, school_name: e.target.value })} placeholder="Ex: Institut Saint-Laurent" required />
                            </div>
                            <div className="form-group">
                                <label>Classe</label>
                                {/* --- MODIFICATION : 'value' et 'onChange' utilisent 'className' --- */}
                                <input type="text" value={formData.className} onChange={(e) => setFormData({ ...formData, className: e.target.value })} placeholder="Ex: 3TTINFO" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date de début</label>
                                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Date de fin</label>
                                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Heures ESI</label>
                                    <input type="number" value={formData.esi_hours} onChange={(e) => setFormData({ ...formData, esi_hours: parseInt(e.target.value, 10) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label>Heures ESS</label>
                                    <input type="number" value={formData.ess_hours} onChange={(e) => setFormData({ ...formData, ess_hours: parseInt(e.target.value, 10) || 0 })} />
                                </div>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={handleCancel}>Annuler</button>
                                <button type="submit" className="btn-primary">Sauvegarder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="attribution-list">
                {sortedYears.length > 0 ? (
                    sortedYears.map(year => (
                        <div key={year} className="attribution-year-group">
                            <h3 className="year-group-title">{year}</h3>
                            {groupedAttributions[year].map(item => (
                                <div className="attribution-item" key={item.id}>
                                    <div className="item-details">
                                        {/* --- AJOUT : Affichage du nom de la classe --- */}
                                        <strong>{item.school_name} {item.class && ` - ${item.class}`}</strong>
                                        <p>Du {format(new Date(item.start_date), 'dd/MM/yyyy')} au {format(new Date(item.end_date), 'dd/MM/yyyy')}</p>
                                        <p><strong>ESI:</strong> {item.esi_hours}h | <strong>ESS:</strong> {item.ess_hours}h</p>
                                    </div>
                                    <div className="item-actions">
                                        <button className="btn-edit" onClick={() => handleEdit(item)}>✏️</button>
                                        <button className="btn-delete" onClick={() => handleDelete(item)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                ) : (
                    <p>Aucune attribution enregistrée pour le moment.</p>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Supprimer"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    );
};

export default AttributionManager;