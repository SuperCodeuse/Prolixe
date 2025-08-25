// server/src/controllers/NoteController.js
const db = require('../../config/database');

// Récupérer les notes (avec état, date, heure et local)
const getNotes = async (req, res) => {
    try {
        const [notes] = await db.query('SELECT id, text, state, date, time, location FROM NOTES ORDER BY date ASC, time ASC');
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Créer une nouvelle note (avec un état et des champs optionnels : date, heure et local)
const createNote = async (req, res) => {
    const { text, state, date, time, location } = req.body;

    if (!text) {
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
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Mettre à jour une note
const updateNote = async (req, res) => {
    const { id } = req.params;
    const { text, state, date, time, location } = req.body;

    if (!text && !state && !date && !time && !location) {
        return res.status(400).json({ message: "Au moins un champ doit être fourni pour la mise à jour." });
    }

    const fieldsToUpdate = {};
    if (text !== undefined) fieldsToUpdate.text = text;
    if (state !== undefined) fieldsToUpdate.state = state;
    if (date !== undefined) fieldsToUpdate.date = date || null;
    if (time !== undefined) fieldsToUpdate.time = time || null;
    if (location !== undefined) fieldsToUpdate.location = location || null;

    const query = 'UPDATE NOTES SET ? WHERE id = ?';
    const params = [fieldsToUpdate, id];

    try {
        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Note non trouvée." });
        }

        const [updatedNoteRows] = await db.query(
            'SELECT id, text, state, date, time, location FROM NOTES WHERE id = ?',
            [id]
        );

        res.status(200).json(updatedNoteRows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Supprimer une note (inchangé)
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
    updateNote,
    deleteNote,
};