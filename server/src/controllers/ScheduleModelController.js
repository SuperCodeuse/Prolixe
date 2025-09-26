// server/src/controllers/ScheduleModelController.js
const pool = require('../../config/database');

class ScheduleModelController {
    /**
     * Crée un nouvel emploi du temps.
     * @param {object} req - L'objet de requête Express.
     * @param {object} res - L'objet de réponse Express.
     */
    static async createSchedule(req, res) {
        const { name, startDate, endDate } = req.body;
        const userId = req.user.id; // L'ID de l'utilisateur est extrait du token JWT

        if (!name || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Le nom, la date de début et la date de fin sont requis."
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();

            // Création de l'emploi du temps dans la table SCHEDULE_SETS
            const [result] = await connection.execute(
                'INSERT INTO SCHEDULE_SETS (name, start_date, end_date, user_id) VALUES (?, ?, ?, ?)',
                [name, startDate, endDate, userId]
            );

            res.status(201).json({
                success: true,
                message: "Emploi du temps créé avec succès.",
                scheduleId: result.insertId
            });
        } catch (error) {
            console.error('Erreur lors de la création de l\'emploi du temps:', error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la création de l'emploi du temps."
            });
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Récupère tous les emplois du temps créés par l'utilisateur.
     * @param {object} req - L'objet de requête Express.
     * @param {object} res - L'objet de réponse Express.
     */
    static async getSchedules(req, res) {
        const userId = req.user.id; // L'ID de l'utilisateur est extrait du token JWT
        let connection;
        try {
            connection = await pool.getConnection();
            const [rows] = await connection.execute(
                'SELECT id, name, start_date, end_date FROM SCHEDULE_SETS',
            );

            res.status(200).json({
                success: true,
                message: "Emplois du temps récupérés avec succès.",
                schedules: rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des emplois du temps:', error);
            res.status(500).json({
                success: false,
                message: "Erreur lors de la récupération des emplois du temps."
            });
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = ScheduleModelController;