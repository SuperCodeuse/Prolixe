import React, { useState } from 'react';
import NoteService from '../../services/NoteService';

const Note = ({ note, onDelete, onUpdate }) => {
    // Fonction utilitaire pour s'assurer que la date est au bon format
    const getFormattedDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.text);
    const [editDate, setEditDate] = useState(getFormattedDate(note.date));
    const [editTime, setEditTime] = useState(note.time);
    const [editLocation, setEditLocation] = useState(note.location);
    const [editState, setEditState] = useState(note.state);

    const handleSave = async () => {
        try {
            const updatedNote = await NoteService.updateNote(note.id, {
                text: editText,
                date: editDate,
                time: editTime,
                location: editLocation,
                state: editState,
            });
            onUpdate(updatedNote);
            setIsEditing(false);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la note:", error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditText(note.text);
        setEditDate(getFormattedDate(note.date));
        setEditTime(note.time);
        setEditLocation(note.location);
        setEditState(note.state);
    };

    const NoteDisplay = () => (
        <div className={`note-item state-${note.state?.replace(/\s+/g, '-').toLowerCase()}`} onDoubleClick={() => setIsEditing(true)}>
            <div className="note-content-wrapper">
                {(note.date || note.time || note.location || (note.state && note.state.toLowerCase() !== 'autre')) && (
                    <div className="note-header">
                        {note.date && <span className="note-date">🗓️ {new Date(note.date).toLocaleDateString('fr-FR')}</span>}
                        {note.time && <span className="note-time">🕒 {note.time.slice(0, 5)}</span>}
                        {note.location && <span className="note-location">🚩{note.location}</span>}
                        {(note.state && note.state.toLowerCase() !== 'autre') && (
                            <strong className={`note-category state-${note.state.replace(/\s+/g, '-').toLowerCase()}`}>{note.state}</strong>
                        )}
                    </div>
                )}
                {note.text && <p className="note-text">{note.text}</p>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="delete-note-btn" aria-label="Supprimer la note">
                🗑️
            </button>
        </div>
    );

    const NoteEditForm = () => (
        <div className="note-item-edit-form">
            <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Idée, rappel..."
                rows="3"
            />
            <div className="note-controls form-group">
                <select value={editState} onChange={(e) => setEditState(e.target.value)} className="btn-select">
                    <option value="autre">Autre</option>
                    <option value="cap">CAP</option>
                    <option value="conseil de classe">Conseil de classe</option>
                    <option value="réunions de parents">Réunions de parents</option>
                </select>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Local" />
            </div>
            <div className="note-actions form-group">
                <button onClick={handleSave} className="btn-actions save-btn">Enregistrer</button>
                <button onClick={handleCancel} className="btn-actions cancel-btn">Annuler</button>
            </div>
        </div>
    );

    return isEditing ? <NoteEditForm /> : <NoteDisplay />;
};

export default Note;