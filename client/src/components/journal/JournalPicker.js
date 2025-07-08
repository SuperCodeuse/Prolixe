import React from 'react';
import { useJournal } from '../../hooks/useJournal';
import './JournalPicker.scss';

const JournalPicker = () => {
    const { journals, selectJournal, loading, error } = useJournal();

    if (loading) return <div>Chargement des journaux...</div>;
    if (error) return <div>Erreur: {error}</div>;

    const current = journals.find(j => !j.is_archived);
    const archived = journals.filter(j => j.is_archived);

    return (
        <div className="journal-picker-container">
            <div className="journal-picker-card">
                <h1>Sélectionnez un journal</h1>
                <p>Choisissez le journal de classe que vous souhaitez consulter.</p>

                <div className="journal-section">
                    <h2>Journal Courant</h2>
                    {current ? (
                        <button className="journal-button current" onClick={() => selectJournal(current)}>
                            {current.name} <span>({current.school_year})</span>
                        </button>
                    ) : (
                        <p>Aucun journal courant. Veuillez en créer un dans les paramètres.</p>
                    )}
                </div>

                {archived.length > 0 && (
                    <div className="journal-section">
                        <h2>Journaux Archivés</h2>
                        <div className="archived-list">
                            {archived.map(journal => (
                                <button key={journal.id} className="journal-button" onClick={() => selectJournal(journal)}>
                                    {journal.name} <span>({journal.school_year})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalPicker;
