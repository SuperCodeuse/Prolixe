const pool = require('../../config/database');

class AttributionController {
    /**
     * Récupère toutes les attributions de l'utilisateur authentifié.
     */
    static async getAttributions(req, res) {
        const userId = req.user.id; // Récupère l'ID de l'utilisateur
        try {
            const [rows] = await pool.execute(`
                SELECT a.*, sy.start_date, sy.end_date
                FROM ATTRIBUTIONS a
                JOIN SCHOOL_YEAR sy ON a.school_year_id = sy.id
                WHERE a.user_id = ?
                ORDER BY sy.start_date DESC
            `, [userId]);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erreur lors de la récupération des attributions.' });
        }
    }

    /**
     * Crée une nouvelle attribution pour l'utilisateur.
     */
    static async createAttribution(req, res) {
        const userId = req.user.id; // Récupère l'ID de l'utilisateur
        const { school_year_id, school_name, start_date, end_date, esi_hours, ess_hours, className } = req.body;

        if (!school_year_id || !school_name || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: 'Les champs school_year_id, school_name, start_date et end_date sont requis.' });
        }

        try {
            const [result] = await pool.execute(
                'INSERT INTO ATTRIBUTIONS (school_year_id, user_id, school_name, start_date, end_date, esi_hours, ess_hours, class) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [school_year_id, userId, school_name, start_date, end_date, esi_hours || 0, ess_hours || 0, className || null]
            );

            const [created] = await pool.execute(`
                SELECT a.*, sy.start_date, sy.end_date
                FROM ATTRIBUTIONS a
                JOIN SCHOOL_YEAR sy ON a.school_year_id = sy.id
                WHERE a.id = ? AND a.user_id = ?
            `, [result.insertId, userId]);

            res.status(201).json({ success: true, message: 'Attribution créée.', data: created[0] });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'attribution.' });
        }
    }

    /**
     * Met à jour une attribution existante de l'utilisateur.
     */
    static async updateAttribution(req, res) {
        const userId = req.user.id; // Récupère l'ID de l'utilisateur
        const { id } = req.params;
        const { school_year_id, school_name, start_date, end_date, esi_hours, ess_hours, className } = req.body;

        try {
            const [result] = await pool.execute(
                'UPDATE ATTRIBUTIONS SET school_year_id = ?, school_name = ?, start_date = ?, end_date = ?, esi_hours = ?, ess_hours = ?, class = ? WHERE id = ? AND user_id = ?',
                [school_year_id, school_name, start_date, end_date, esi_hours || 0, ess_hours || 0, className || null, id, userId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Attribution non trouvée ou non autorisée.' });
            }

            const [updated] = await pool.execute(`
                SELECT a.*, sy.start_date, sy.end_date
                FROM ATTRIBUTIONS a
                JOIN SCHOOL_YEAR sy ON a.school_year_id = sy.id
                WHERE a.id = ? AND a.user_id = ?
            `, [id, userId]);

            res.json({ success: true, message: 'Attribution mise à jour.', data: updated[0] });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'attribution.' });
        }
    }

    /**
     * Supprime une attribution existante de l'utilisateur.
     */
    static async deleteAttribution(req, res) {
        const userId = req.user.id; // Récupère l'ID de l'utilisateur
        const { id } = req.params;

        try {
            const [result] = await pool.execute('DELETE FROM ATTRIBUTIONS WHERE id = ? AND user_id = ?', [id, userId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Attribution non trouvée ou non autorisée.' });
            }

            res.json({ success: true, message: 'Attribution supprimée.' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'attribution.' });
        }
    }
}

module.exports = AttributionController;