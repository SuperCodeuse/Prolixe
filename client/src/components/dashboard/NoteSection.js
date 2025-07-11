// client/src/components/dashboard/NotesSection.js
import React, { useState, useEffect } from 'react';
import NoteService from '../../services/NoteService';

// Le composant DeleteIcon ne change pas
const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
);


const NotesSection = () => {
    const [notes, setNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteState, setNewNoteState] = useState('autre');
    const [newNoteDate, setNewNoteDate] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const fetchedNotes = await NoteService.getNotes();
                setNotes(fetchedNotes);
            } catch (error) {
                console.error("Erreur lors de la récupération des notes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotes();
    }, []);

    // NOUVELLE LOGIQUE DE VALIDATION
    const isFormInvalid = !newNoteText.trim() && !newNoteDate;

    const handleAddNote = async () => {
        // On utilise la nouvelle logique de validation
        if (isFormInvalid) return;

        try {
            const newNote = await NoteService.addNote(newNoteText, newNoteState, newNoteDate);
            setNotes([newNote, ...notes]);
            // On réinitialise tous les champs
            setNewNoteText('');
            setNewNoteState('autre');
            setNewNoteDate('');
        } catch (error) {
            console.error("Erreur lors de l'ajout de la note:", error);
        }
    };

    const handleDeleteNote = async (id) => {
        try {
            await NoteService.deleteNote(id);
            setNotes(notes.filter((note) => note.id !== id));
        } catch (error) {
            console.error("Erreur lors de la suppression de la note:", error);
        }
    };

    // Le composant Note individuel
    const NoteItem = ({ note, onDelete }) => (
        <div className={`note-item state-${note.state.replace(/\s+/g, '-',).toLowerCase()}`}>

            <div className="note-content-wrapper">

                <div className="note-header">
                    {note.date && (
                        <span className="note-date">
                        🗓️ {new Date(note.date).toLocaleDateString('fr-FR')}
                    </span>
                    )}
                    <strong className={`note-category state-${note.state.replace(/\s+/g, '-',).toLowerCase()}`}> {note.state}</strong>
                </div>

                {note.text && (
                    <p className="note-text">{note.text}</p>
                )}

            </div>

            <button onClick={onDelete} className="delete-note-btn" aria-label="Supprimer la note">
                <DeleteIcon />
            </button>
        </div>
    );

    if (loading) {
        return <div className="dashboard-section"><p>Chargement des notes...</p></div>;
    }

    return (
        <div className="dashboard-section">
            <div className="section-header">
                <h2>📌 Notes rapides</h2>
            </div>
            <div className="notes-widget">
                <div className="note-input-area">
                    <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Idée, rappel... (optionnel si une date est choisie)"
                        rows="3"
                    />
                    <div className="note-controls form-group">
                        <select
                            className={`note-state-select state-${newNoteState.replace(/\s+/g, '-').toLowerCase()}`}
                            value={newNoteState}
                            onChange={(e) => setNewNoteState(e.target.value)}
                        >
                            <option value="autre">Autre</option>
                            <option value="conseil de classe">Conseil de classe</option>
                            <option value="réunions de parents">Réunions de parents</option>
                        </select>
                        <input
                            type="date"
                            className="note-date-input"
                            value={newNoteDate}
                            onChange={(e) => setNewNoteDate(e.target.value)}
                        />
                        <button
                            onClick={handleAddNote}
                            className="add-note-btn"
                            disabled={isFormInvalid}
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
                <div className="notes-list-container">
                    {notes.length > 0 ? (
                        notes.map((note) => (
                            <NoteItem key={note.id} note={note} onDelete={() => handleDeleteNote(note.id)} />
                        ))
                    ) : (
                        <div className="empty-notes-message">
                            <p>Vos notes s'afficheront ici.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesSection;