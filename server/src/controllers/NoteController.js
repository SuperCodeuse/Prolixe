// server/src/controllers/NoteController.js
const db = require('../../config/database');

// Récupérer les notes (avec état et date)
const getNotes = async (req, res) => {
    try {
        const [notes] = await db.query('SELECT id, text, state, date FROM notes');
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Créer une nouvelle note (avec un état et une date optionnelle)
const createNote = async (req, res) => {
    const { text, state, date } = req.body;

    if (date === null) {
        return res.status(400).json({ message: "Le contenu de la note ne peut pas être vide et ne pas avoir de date" });
    }

    const noteState = state || 'autre';
    // Si la date est une chaîne vide ou non fournie, on la stocke comme NULL
    const noteDate = date || null;

    try {
        const [insertResult] = await db.query(
            'INSERT INTO notes (text, state, date) VALUES (?, ?, ?)',
            [text, noteState, noteDate]
        );
        const newNoteId = insertResult.insertId;

        const [newNoteRows] = await db.query(
            'SELECT id, text, state, date FROM notes WHERE id = ?',
            [newNoteId]
        );

        res.status(201).json(newNoteRows[0]);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ... (deleteNote ne change pas)
const deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM notes WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Note non trouvée." });
        }
        res.status(200).json({ message: "Note supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};


module.exports = {
    getNotes,
    createNote,
    deleteNote,
};