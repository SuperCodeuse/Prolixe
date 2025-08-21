// server/src/controllers/NoteController.js
const db = require('../../config/database');

// Récupérer les notes (avec état, date, heure et lieu)
const getNotes = async (req, res) => {
    try {
        const [notes] = await db.query('SELECT id, text, state, date, time, location FROM NOTES ORDER BY createdAt DESC');
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Créer une nouvelle note
const createNote = async (req, res) => {
    const { text, state, date, time, location } = req.body;

    if (!text && !date && !time && !location) {
        return res.status(400).json({ message: "Le contenu de la note ne peut pas être vide." });
    }

    const noteState = state || 'autre';
    const noteDate = date || null;
    const noteTime = time || null;
    const noteLocation = location || null;

    try {
        const [insertResult] = await db.query(
            'INSERT INTO NOTES (text, state, date, time, location) VALUES (?, ?, ?, ?, ?)',
            [text, noteState, noteDate, noteTime, noteLocation]
        );
        const newNoteId = insertResult.insertId;

        const [newNoteRows] = await db.query(
            'SELECT id, text, state, date, time, location FROM NOTES WHERE id = ?',
            [newNoteId]
        );

        res.status(201).json(newNoteRows[0]);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Nouvelle fonction: Mettre à jour une note existante
const updateNote = async (req, res) => {
    const { id } = req.params;
    const { text, state, date, time, location } = req.body;

    if (!text && !date && !time && !location) {
        return res.status(400).json({ message: "Le contenu de la note ne peut pas être vide." });
    }

    const noteState = state || 'autre';
    const noteDate = date || null;
    const noteTime = time || null;
    const noteLocation = location || null;

    try {
        const [result] = await db.query(
            'UPDATE NOTES SET text = ?, state = ?, date = ?, time = ?, location = ? WHERE id = ?',
            [text, noteState, noteDate, noteTime, noteLocation, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Note non trouvée." });
        }
        const [updatedNoteRows] = await db.query(
            'SELECT id, text, state, date, time, location FROM NOTES WHERE id = ?',
            [id]
        );

        res.status(200).json(updatedNoteRows[0]);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// ... (deleteNote ne change pas)
const deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM NOTES WHERE id = ?', [id]);
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
    updateNote, // Ajout de la nouvelle fonction
    deleteNote,
};