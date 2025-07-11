// client/src/components/dashboard/NotesSection.js
import React, { useState, useEffect } from 'react';
import Note from './Note';
import NoteService from '../../services/NoteService'; // 👈 Importer le service

const NotesSection = () => {
    const [notes, setNotes] = useState([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [loading, setLoading] = useState(true); // 👈 État de chargement

    // Charger les notes depuis le backend au premier rendu
    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const fetchedNotes = await NoteService.getNotes();
                setNotes(fetchedNotes);
            } catch (error) {
                console.error("Erreur lors de la récupération des notes:", error);
                // Gérer l'erreur, ex: afficher un message à l'utilisateur
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, []); // Le tableau vide assure que l'effet ne s'exécute qu'une fois

    // Gérer l'ajout d'une note
    const handleAddNote = async () => {
        if (newNoteText.trim() === '') return;

        try {
            const newNote = await NoteService.addNote(newNoteText);
            setNotes([newNote, ...notes]); // Ajoute la nouvelle note au début
            setNewNoteText('');
        } catch (error) {
            console.error("Erreur lors de l'ajout de la note:", error);
        }
    };

    // Gérer la suppression
    const handleDeleteNote = async (id) => {
        try {
            await NoteService.deleteNote(id);
            setNotes(notes.filter((note) => note.id !== id));
        } catch (error) {
            console.error("Erreur lors de la suppression de la note:", error);
        }
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
                <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Conseil de classe, réunion, idées..."
                />
                <button onClick={handleAddNote} className="add-note-btn">
                    Ajouter
                </button>
                <div className="notes-list">
                    {notes.length > 0 ? (
                        notes.map((note) => (
                            <Note key={note.id} note={note} onDelete={() => handleDeleteNote(note.id)} />
                        ))
                    ) : (
                        <p className="empty-notes-message">Aucune note pour le moment.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesSection;