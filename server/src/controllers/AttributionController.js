const pool = require('../../config/database');

class AttributionController {
    static async getAttributions(req, res) {
        try {
            // Pas de changement ici
            const [rows] = await pool.execute('SELECT * FROM ATTRIBUTIONS ORDER BY start_date DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la récupération des attributions.' });
        }
    }

    static async createAttribution(req, res) {
        // Ajout de 'className' depuis le corps de la requête
        const { school_year, school_name, start_date, end_date, esi_hours, ess_hours, className } = req.body;
        if (!school_year || !school_name || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: 'Les champs school_year, school_name, start_date et end_date sont requis.' });
        }
        try {
            // Mise à jour de la requête SQL pour inclure la colonne 'class'
            const [result] = await pool.execute(
                'INSERT INTO attributions (school_year, school_name, start_date, end_date, esi_hours, ess_hours, class) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [school_year, school_name, start_date, end_date, esi_hours || 0, ess_hours || 0, className || null] // On utilise la variable 'className'
            );

            const [created] = await pool.execute('SELECT * FROM ATTRIBUTIONS WHERE id = ?', [result.insertId]);
            res.status(201).json({ success: true, message: 'Attribution créée.', data: created[0] });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'attribution.' });
        }
    }

    static async updateAttribution(req, res) {
        const { id } = req.params;
        // Ajout de 'className' depuis le corps de la requête
        const { school_year, school_name, start_date, end_date, esi_hours, ess_hours, className } = req.body;

        try {
            // Mise à jour de la requête SQL pour inclure le champ 'class'
            const [result] = await pool.execute(
                'UPDATE attributions SET school_year = ?, school_name = ?, start_date = ?, end_date = ?, esi_hours = ?, ess_hours = ?, class = ? WHERE id = ?',
                [school_year, school_name, start_date, end_date, esi_hours || 0, ess_hours || 0, className || null, id] // On utilise la variable 'className'
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Attribution non trouvée.' });
            }
            const [updated] = await pool.execute('SELECT * FROM ATTRIBUTIONS WHERE id = ?', [id]);
            res.json({ success: true, message: 'Attribution mise à jour.', data: updated[0] });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'attribution.' });
        }
    }

    static async deleteAttribution(req, res) {
        const { id } = req.params;
        try {
            // Pas de changement ici
            const [result] = await pool.execute('DELETE FROM ATTRIBUTIONS WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Attribution non trouvée.' });
            }
            res.json({ success: true, message: 'Attribution supprimée.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'attribution.' });
        }
    }
}

module.exports = AttributionController;