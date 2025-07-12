const pool = require('../../config/database');

class AttributionController {
    static async getAttributions(req, res) {
        try {
            const [rows] = await pool.execute('SELECT * FROM ATTRIBUTIONS ORDER BY start_date DESC');
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la récupération des attributions.' });
        }
    }

    static async createAttribution(req, res) {
        const { school_year, school_name, start_date, end_date, esi_hours, ess_hours } = req.body;
        if (!school_year || !school_name || !start_date || !end_date) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
        }
        try {
            const [result] = await pool.execute(
                'INSERT INTO attributions (school_year, school_name, start_date, end_date, esi_hours, ess_hours) VALUES (?, ?, ?, ?, ?, ?)',
                [school_year, school_name, start_date, end_date, esi_hours || 0, ess_hours || 0]
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
        const { school_year, school_name, start_date, end_date, esi_hours, ess_hours } = req.body;

        try {
            const [result] = await pool.execute(
                'UPDATE attributions SET school_year = ?, school_name = ?, start_date = ?, end_date = ?, esi_hours = ?, ess_hours = ? WHERE id = ?',
                [school_year, school_name, start_date, end_date, esi_hours || 0, ess_hours || 0, id]
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