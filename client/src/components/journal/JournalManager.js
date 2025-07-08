// client/src/components/settings/Journal/JournalManager.js
import React, { useState } from 'react';
import { useJournal } from '../../hooks/useJournal';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../ConfirmModal';
import JournalService from '../../services/JournalService'; // Importez le service
import './JournalManager.scss';

const JournalManager = () => {
    const {
        journals,
        currentJournal,
        archivedJournals,
        selectJournal,
        createJournal,
        archiveJournal,
        loading,
        error,
        loadAllJournals,
    } = useJournal();

    const { success, error: showError } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', school_year: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/json') {
            setSelectedFile(file);
        } else {
            showError('Veuillez sélectionner un fichier JSON valide.');
            setSelectedFile(null);
        }
    };

    const handleImport = async () => {
        console.log("here !!");
        if (!selectedFile) {
            showError('Aucun fichier sélectionné.');
            return;
        }
        setIsImporting(true);
        try {
            const response = await JournalService.importJournal(selectedFile);
            success(response.message || 'Importation réussie !');
            loadAllJournals(); // Recharger les données après l'import
        } catch (err) {
            showError(err.message || 'Erreur lors de l\'importation.');
        } finally {
            setIsImporting(false);
            setSelectedFile(null);
        }
    };

    const handleOpenModal = () => {
        setFormData({ name: '', school_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.school_year) {
            showError("Le nom et l'année scolaire sont requis.");
            return;
        }
        try {
            await createJournal(formData);
            success('Nouveau journal créé avec succès !');
            loadAllJournals(); // Recharger la liste
            handleCloseModal();
        } catch (err) {
            showError(err.message || "Erreur lors de la création du journal.");
        }
    };

    const handleArchive = (journal) => {
        showConfirmModal(
            'Archiver le journal',
            `Êtes-vous sûr de vouloir archiver le journal "${journal.name}" ? Vous ne pourrez plus y ajouter d'entrées.`,
            async () => {
                try {
                    await archiveJournal(journal.id);
                    success('Journal archivé.');
                    loadAllJournals();
                    closeConfirmModal();
                } catch (err) {
                    showError(err.message);
                    closeConfirmModal();
                }
            }
        );
    };

    const showConfirmModal = (title, message, onConfirm) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    };

    if (loading && !journals.length) return <p>Chargement des journaux...</p>;
    if (error) return <p className="error-message">Erreur: {error}</p>;

    return (
        <div className="journal-manager">
            <div className="section-header">
                <h2>📚 Gestion des Journaux</h2>
                <div className="file-container">
                    <div className="file-input-container">
                        {!selectedFile && (
                            <>
                                <input
                                    type="file"
                                    id="import-journal-input"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="file-input"
                                />
                                <label htmlFor="import-journal-input" className="file-input-label">
                            <span className="file-input-label-text">
                              📁 Choisir un fichier
                            </span>
                                </label>
                            </>
                        )}

                        {selectedFile && (
                            <button
                                className="btn-primary"
                                onClick={handleImport}
                                disabled={!selectedFile || isImporting}
                            >
                                {isImporting ? 'Importation...' : 'Importer le journal'}
                            </button>
                        )}

                    </div>

                    <button className="btn-primary" onClick={handleOpenModal}>
                        <span>➕</span> Ajouter un journal
                    </button>
                </div>

            </div>

            <div className="journal-lists">
                <div className="journal-list">
                    <h3>Journal Courant</h3>
                    {currentJournal ? (
                        <div className="journal-card current">
                            <div className="journal-info">
                                <strong>{currentJournal.name}</strong>
                                <span>{currentJournal.school_year}</span>
                            </div>
                            <div className="journal-actions">
                                <span className="status-badge current">Actif</span>
                                <button onClick={() => handleArchive(currentJournal)} className="btn-archive" disabled={journals.length <= 1}>Archiver</button>
                            </div>
                        </div>
                    ) : (
                        <p>Aucun journal courant sélectionné.</p>
                    )}
                </div>

                <div className="journal-list">
                    <h3>Autres Journaux Actifs</h3>
                    {journals.filter(j => j.id !== currentJournal?.id && !j.is_archived).length > 0 ? (
                        journals.filter(j => j.id !== currentJournal?.id && !j.is_archived).map(journal => (
                            <div key={journal.id} className="journal-card">
                                <div className="journal-info">
                                    <strong>{journal.name}</strong>
                                    <span>{journal.school_year}</span>
                                </div>
                                <div className="journal-actions">
                                    <button onClick={() => selectJournal(journal)} className="btn-select">Sélectionner</button>
                                    <button onClick={() => handleArchive(journal)} className="btn-archive">Archiver</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>Aucun autre journal actif.</p>
                    )}
                </div>

                <div className="journal-list">
                    <h3>Journaux Archivés</h3>
                    {archivedJournals.length > 0 ? (
                        archivedJournals.map(journal => (
                            <div key={journal.id} className="journal-card archived">
                                <div className="journal-info">
                                    <strong>{journal.name}</strong>
                                    <span>{journal.school_year}</span>
                                </div>
                                <div className="journal-actions">
                                    <span className="status-badge archived">Archivé</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>Aucun journal archivé.</p>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Créer un nouveau journal</h3>
                            <button className="modal-close" onClick={handleCloseModal}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="class-form">
                            <div className="form-group">
                                <label htmlFor="journalName">Nom du journal</label>
                                <input id="journalName" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ex: Journal Principal" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="schoolYear">Année scolaire</label>
                                <input id="schoolYear" type="text" value={formData.school_year} onChange={(e) => setFormData({...formData, school_year: e.target.value})} placeholder="Ex: 2024-2025" required />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Annuler</button>
                                <button type="submit" className="btn-primary">Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Confirmer"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    );
};

export default JournalManager;
