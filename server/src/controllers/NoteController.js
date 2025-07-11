// server/src/controllers/NoteController.js

const db = require('../../config/database');

// Récupérer toutes les notes de l'utilisateur
const getNotes = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM notes');
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erreur lors de la récupération des notes:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Créer une nouvelle note
const createNote = async (req, res) => {
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: "Le contenu de la note ne peut pas être vide." });
    }

    try {
        const [rows] = await db.query(
            'INSERT INTO notes (text) VALUES (?)',
            [text]
        );
        res.status(201).json(rows);
    } catch (error) {
        console.error("Erreur lors de la création de la note:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

// Supprimer une note
const deleteNote = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM notes WHERE id = ?', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Note non trouvée ou suppression non autorisée." });
        }

        res.status(200).json({ message: "Note supprimée avec succès" });
    } catch (error) {
        console.error("Erreur lors de la suppression de la note:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};


module.exports = {
    getNotes,
    createNote,
    deleteNote,
};