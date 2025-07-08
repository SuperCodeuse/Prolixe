import React from 'react';
import { useJournal } from '../../hooks/useJournal';
import './JournalPicker.scss';

const JournalPicker = () => {
    const { journals, selectJournal, loading, error } = useJournal();

    if (loading) return <div>Chargement des journaux...</div>;
    if (error) return <div>Erreur: {error}</div>;

    const activeJournals = journals.filter(j => !j.is_archived);
    const archived = journals.filter(j => j.is_archived);

    return (
        <div className="journal-picker-container">
            <div className="journal-picker-card">
                <h1>Sélectionnez un journal</h1>
                <p>Choisissez le journal de classe que vous souhaitez consulter.</p>

                <div className="journal-section">
                    <h2>Journaux Actifs</h2>
                    {activeJournals.length > 0 ? (
                        activeJournals.map(journal => (
                            <button key={journal.id} className="journal-button current" onClick={() => selectJournal(journal)}>
                                {journal.name} <span>({journal.school_year})</span>
                            </button>
                        ))
                    ) : (
                        <p>Aucun journal actif. Veuillez en créer un dans les paramètres.</p>
                    )}
                </div>

                {archived.length > 0 && (
                    <div className="journal-section">
                        <h2>Journaux Archivés (Lecture seule)</h2>
                        <div className="archived-list">
                            {archived.map(journal => (
                                <div key={journal.id} style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="journal-button" onClick={() => selectJournal(journal)}>
                                        {journal.name} <span>({journal.school_year})</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JournalPicker;
