// client/src/components/dashboard/NotesSection.js
import React, { useState, useEffect } from 'react';
import NoteService from '../../services/NoteService';
import Note from './Note';

const NotesSection = () => {
    const [notes, setNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteState, setNewNoteState] = useState('autre');
    const [newNoteDate, setNewNoteDate] = useState('');
    const [newNoteTime, setNewNoteTime] = useState('');
    const [newNoteLocation, setNewNoteLocation] = useState('');
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

    const isFormInvalid = !newNoteText.trim() && !newNoteDate && !newNoteTime && !newNoteLocation;

    const handleAddNote = async () => {
        if (isFormInvalid) return;

        try {
            const newNote = await NoteService.addNote(newNoteText, newNoteState, newNoteDate, newNoteTime, newNoteLocation);
            setNotes([newNote, ...notes]);
            setNewNoteText('');
            setNewNoteState('autre');
            setNewNoteDate('');
            setNewNoteTime('');
            setNewNoteLocation('');
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

    const handleUpdateNote = (updatedNote) => {
        setNotes(notes.map(note => note.id === updatedNote.id ? updatedNote : note));
    };

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
                        placeholder="Idée, rappel... (optionnel si une date, heure ou local est choisi)"
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
                        <input
                            type="time"
                            className="note-time-input"
                            value={newNoteTime}
                            onChange={(e) => setNewNoteTime(e.target.value)}
                        />
                        <input
                            type="text"
                            className="note-location-input"
                            value={newNoteLocation}
                            onChange={(e) => setNewNoteLocation(e.target.value)}
                            placeholder="Local"
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
                            <Note
                                key={note.id}
                                note={note}
                                onDelete={handleDeleteNote}
                                onUpdate={handleUpdateNote}
                            />
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