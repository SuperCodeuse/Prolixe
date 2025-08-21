// client/src/components/dashboard/NotesSection.js
import React, { useState, useEffect } from 'react';
import NoteService from '../../services/NoteService';

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.14L.976 13.05a.5.5 0 0 0-.17.65l.65.65c.187.187.45.263.702.263.253 0 .506-.076.702-.263l12.42-12.42c.187-.187.263-.45.263-.702.0-.253-.076-.506-.263-.702-.187-.187-.45-.263-.702-.263z"/></svg>
);

const NotesSection = () => {
    const [notes, setNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteState, setNewNoteState] = useState('autre');
    const [newNoteDate, setNewNoteDate] = useState('');
    const [newNoteTime, setNewNoteTime] = useState('');
    const [newNoteLocation, setNewNoteLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingNoteId, setEditingNoteId] = useState(null);

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
            const newNote = await NoteService.addNote({
                text: newNoteText,
                state: newNoteState,
                date: newNoteDate,
                time: newNoteTime,
                location: newNoteLocation
            });
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

    const handleUpdateNote = async (id, updatedData) => {
        try {
            const updatedNote = await NoteService.updateNote(id, updatedData);
            setNotes(notes.map(note => note.id === id ? updatedNote : note));
            setEditingNoteId(null); // On quitte le mode édition
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la note:", error);
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

    const NoteItem = ({ note, onDelete, onEdit, isEditing }) => {
        const [editText, setEditText] = useState(note.text);
        const [editDate, setEditDate] = useState(note.date);
        const [editState, setEditState] = useState(note.state);
        const [editTime, setEditTime] = useState(note.time);
        const [editLocation, setEditLocation] = useState(note.location);

        const handleSave = () => {
            onEdit(note.id, {
                text: editText,
                date: editDate,
                state: editState,
                time: editTime,
                location: editLocation
            });
        };

        return (
            <div className={`note-item state-${note.state?.replace(/\s+/g, '-').toLowerCase()}`}>
                {isEditing ? (
                    <div className="note-edit-form">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows="3"
                        />
                        <div className="note-controls form-group">
                            <select
                                value={editState}
                                onChange={(e) => setEditState(e.target.value)}
                            >
                                <option value="autre">Autre</option>
                                <option value="conseil de classe">Conseil de classe</option>
                                <option value="réunions de parents">Réunions de parents</option>
                            </select>
                            <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                            />
                            <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                            />
                            <input
                                type="text"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                placeholder="Lieu (optionnel)"
                            />
                            <button onClick={handleSave} className="save-edit-btn">Enregistrer</button>
                        </div>
                    </div>
                ) : (
                    <div className="note-content-wrapper">
                        {(note.date || note.time || note.location || (note.state && note.state.toLowerCase() !== 'autre')) && (
                            <div className="note-header">
                                {note.date && (
                                    <span className="note-date">🗓️ {new Date(note.date).toLocaleDateString('fr-FR')}</span>
                                )}
                                {note.time && (
                                    <span className="note-time">⏰ {note.time}</span>
                                )}
                                {note.location && (
                                    <span className="note-location">📍 {note.location}</span>
                                )}
                                {(note.state && note.state.toLowerCase() !== 'autre') && (
                                    <strong className={`note-category state-${note.state.replace(/\s+/g, '-').toLowerCase()}`}>
                                        {note.state}
                                    </strong>
                                )}
                            </div>
                        )}
                        {note.text && (
                            <p className="note-text">{note.text}</p>
                        )}
                    </div>
                )}
                <div className="note-actions">
                    <button onClick={() => setEditingNoteId(note.id)} className="edit-note-btn" aria-label="Modifier la note">
                        <EditIcon />
                    </button>
                    <button onClick={onDelete} className="delete-note-btn" aria-label="Supprimer la note">
                        <DeleteIcon />
                    </button>
                </div>
            </div>
        );
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
                        <input
                            type="time"
                            className="note-time-input"
                            value={newNoteTime}
                            onChange={(e) => setNewNoteTime(e.target.value)}
                            placeholder="Heure (optionnel)"
                        />
                        <input
                            type="text"
                            className="note-location-input"
                            value={newNoteLocation}
                            onChange={(e) => setNewNoteLocation(e.target.value)}
                            placeholder="Lieu (optionnel)"
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
                            <NoteItem
                                key={note.id}
                                note={note}
                                onDelete={() => handleDeleteNote(note.id)}
                                onEdit={handleUpdateNote}
                                isEditing={editingNoteId === note.id}
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