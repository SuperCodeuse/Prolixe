// server/src/controllers/NoteController.js
const db = require('../../config/database');

/**
 * Récupérer les notes de l'utilisateur authentifié.
 */
const getNotes = async (req, res) => {
    const userId = req.user.id; // Récupère l'ID de l'utilisateur

    try {
        const [notes] = await db.query(
            'SELECT id, text, state, date, time, location FROM NOTES WHERE user_id = ? ORDER BY date ASC, time ASC',
            [userId]
        );
        res.status(200).json(notes);
    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

/**
 * Créer une nouvelle note pour l'utilisateur authentifié.
 */
const createNote = async (req, res) => {
    const userId = req.user.id; // Récupère l'ID de l'utilisateur
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
            'INSERT INTO NOTES (text, state, date, time, location, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [text, noteState, noteDate, noteTime, noteLocation, userId]
        );
        const newNoteId = insertResult.insertId;

        const [newNoteRows] = await db.query(
            'SELECT id, text, state, date, time, location FROM NOTES WHERE id = ? AND user_id = ?',
            [newNoteId, userId]
        );

        res.status(201).json(newNoteRows[0]);
    } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

/**
 * Mettre à jour une note appartenant à l'utilisateur authentifié.
 */
const updateNote = async (req, res) => {
    const userId = req.user.id; // Récupère l'ID de l'utilisateur
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

    const query = 'UPDATE NOTES SET ? WHERE id = ? AND user_id = ?';
    const params = [fieldsToUpdate, id, userId];

    try {
        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Note non trouvée ou non autorisée." });
        }

        const [updatedNoteRows] = await db.query(
            'SELECT id, text, state, date, time, location FROM NOTES WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        res.status(200).json(updatedNoteRows[0]);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la note:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

/**
 * Supprimer une note appartenant à l'utilisateur authentifié.
 */
const deleteNote = async (req, res) => {
    const userId = req.user.id; // Récupère l'ID de l'utilisateur
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM NOTES WHERE id = ? AND user_id = ?', [id, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Note non trouvée ou non autorisée." });
        }
        res.status(200).json({ message: "Note supprimée avec succès" });
    } catch (error) {
        console.error('Erreur lors de la suppression de la note:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

module.exports = {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
};