// client/src/components/dashboard/Note.js
import React from 'react';

// Le style du composant sera géré par dashboard.scss
const Note = ({ note, onDelete }) => {
    return (
        <div className="note-item">
            <p>{note.text}</p>
            <button onClick={() => onDelete(note.id)} className="delete-note-btn">
                🗑️
            </button>
        </div>
    );
};

export default Note;