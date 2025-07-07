// backend/controllers/JournalController.js
const mysql = require('mysql2/promise');
const pool = require('../../config/database');

class JournalController {
    static async withConnection(operation) {
        let connection;
        try {
            connection = await pool.getConnection();
            return await operation(connection);
        } catch (error) {
            console.error('Erreur SQL dans withConnection (JournalController):', error.message);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500, customErrors = {}) {
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        console.error(`❌ Erreur dans JournalController: ${defaultMessage}`, error);
        res.status(statusCode).json({ success: false, message: defaultMessage, error: errorMessage, errors: customErrors });
    }

    // --- JOURNAL_ENTRY Operations ---

    /**
     * Récupère les entrées de journal pour une semaine donnée ou une plage de dates.
     * @param {Request} req.query.startDate - Format YYYY-MM-DD
     * @param {Request} req.query.endDate - Format YYYY-MM-DD
     */
    static async getJournalEntries(req, res) {
        const { startDate, endDate } = req.query; // Pour filtrer par semaine
        if (!startDate || !endDate) {
            return JournalController.handleError(res, new Error('Dates requises'), 'Veuillez fournir une date de début et de fin.', 400);
        }

        try {
            const entries = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT
                        je.id,
                        je.date,
                        je.planned_work,
                        je.actual_work,
                        je.notes,
                        s.id AS schedule_id,
                        s.day,
                        s.time_slot_id, -- Référence à time_slot_id unique
                        sh.libelle AS time_slot_libelle, -- Récupère le libellé
                        s.subject AS course_subject,
                        c.id AS class_id,
                        c.name AS class_name,
                        c.level AS class_level,
                        s.room
                    FROM JOURNAL_ENTRY je
                    JOIN SCHEDULE s ON je.schedule_id = s.id
                    JOIN schedule_hours sh ON s.time_slot_id = sh.id -- Jointure avec schedule_hours via time_slot_id
                    JOIN CLASS c ON s.class_id = c.id
                    WHERE je.date BETWEEN ? AND ?
                `, [startDate, endDate]);
                return rows;
            });
            console.log(`✅ ${entries.length} entrées de journal récupérées pour la période.`);
            res.json({ success: true, data: entries, count: entries.length, message: `${entries.length} entrées de journal récupérées.` });
        } catch (error) {
            console.error("DÉTAIL ERREUR GET JOURNAL ENTRIES:", error); // Utile pour le débogage
            JournalController.handleError(res, error, 'Erreur lors de la récupération des entrées de journal.');
        }
    }

    /**
     * Crée ou met à jour une entrée de journal.
     */
    static async upsertJournalEntry(req, res) {
        const { id, schedule_id, date, planned_work, actual_work, notes } = req.body;

        if (!schedule_id || !date) {
            return JournalController.handleError(res, new Error('ID de l\'emploi du temps et date sont requis.'), 'Données invalides.', 400);
        }

        try {
            const result = await JournalController.withConnection(async (connection) => {
                if (id) {
                    // Mettre à jour
                    await connection.execute(
                        'UPDATE JOURNAL_ENTRY SET planned_work = ?, actual_work = ?, notes = ?, date = ?, schedule_id = ? WHERE id = ?',
                        [planned_work, actual_work, notes, date, schedule_id, id]
                    );
                    return { type: 'updated', id };
                } else {
                    // Insérer
                    const [insertResult] = await connection.execute(
                        'INSERT INTO JOURNAL_ENTRY (schedule_id, date, planned_work, actual_work, notes) VALUES (?, ?, ?, ?, ?)',
                        [schedule_id, date, planned_work, actual_work, notes]
                    );
                    return { type: 'created', id: insertResult.insertId };
                }
            });
            console.log(`✅ Entrée de journal ${result.type} avec succès (ID: ${result.id})`);

            // Récupérer l'entrée complète après upsert pour le frontend
            const [entry] = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT
                        je.id, je.date, je.planned_work, je.actual_work, je.notes,
                        s.id AS schedule_id, s.day, s.time_slot_id, sh.libelle AS time_slot_libelle,
                        s.subject AS course_subject, c.id AS class_id, c.name AS class_name, c.level AS class_level, s.room
                    FROM JOURNAL_ENTRY je
                    JOIN SCHEDULE s ON je.schedule_id = s.id
                    JOIN schedule_hours sh ON s.time_slot_id = sh.id
                    JOIN CLASS c ON s.class_id = c.id
                    WHERE je.id = ?
                `, [result.id]);
                return rows;
            });

            if (!entry) {
                return JournalController.handleError(res, new Error('Entrée non trouvée après upsert'), 'Impossible de retrouver l\'entrée après sauvegarde.', 404);
            }

            res.status(id ? 200 : 201).json({ success: true, message: `Entrée de journal ${id ? 'mise à jour' : 'créée'} avec succès.`, data: entry });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return JournalController.handleError(res, error, 'Une entrée existe déjà pour ce cours à cette date.', 409);
            }
            JournalController.handleError(res, error, 'Erreur lors de la sauvegarde de l\'entrée de journal.');
        }
    }

    /**
     * Supprime une entrée de journal.
     */
    static async deleteJournalEntry(req, res) {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return JournalController.handleError(res, new Error('ID invalide'), 'ID d\'entrée de journal invalide.', 400);
        }
        try {
            const result = await JournalController.withConnection(async (connection) => {
                const [deleteResult] = await connection.execute('DELETE FROM JOURNAL_ENTRY WHERE id = ?', [parseInt(id)]);
                return deleteResult;
            });
            if (result.affectedRows === 0) {
                return JournalController.handleError(res, new Error('Entrée non trouvée'), 'Entrée de journal non trouvée.', 404);
            }
            console.log(`✅ Entrée de journal supprimée avec succès (ID: ${id})`);
            res.json({ success: true, message: 'Entrée de journal supprimée avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la suppression de l\'entrée de journal.');
        }
    }

    // --- ASSIGNMENT Operations ---

    /**
     * Récupère les assignations (interros, devoirs) pour une semaine donnée ou une classe.
     */
    static async getAssignments(req, res) {
        const { classId, startDate, endDate } = req.query; // Filtrer par classe ou par date
        let query = `
            SELECT a.id, a.type, a.description, a.due_date, a.is_completed,
                   c.id AS class_id, c.name AS class_name, c.level AS class_level, a.subject
            FROM ASSIGNMENT a
            JOIN CLASS c ON a.class_id = c.id
        `;
        const params = [];
        const conditions = [];

        if (classId) {
            conditions.push('a.class_id = ?');
            params.push(parseInt(classId));
        }
        if (startDate && endDate) {
            conditions.push('a.due_date BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY a.due_date ASC, a.type ASC';

        try {
            const assignments = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute(query, params);
                return rows;
            });
            console.log(`✅ ${assignments.length} assignations récupérées.`);
            res.json({ success: true, data: assignments, count: assignments.length, message: `${assignments.length} assignations récupérées.` });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la récupération des assignations.');
        }
    }

    /**
     * Crée ou met à jour une assignation.
     */
    static async upsertAssignment(req, res) {
        const { id, class_id, subject, type, description, due_date, is_completed } = req.body;

        if (!class_id || !subject || !type || !due_date) {
            return JournalController.handleError(res, new Error('Tous les champs obligatoires sont requis.'), 'Données invalides.', 400);
        }

        try {
            const result = await JournalController.withConnection(async (connection) => {
                if (id) {
                    // Mettre à jour
                    await connection.execute(
                        'UPDATE ASSIGNMENT SET class_id = ?, subject = ?, type = ?, description = ?, due_date = ?, is_completed = ? WHERE id = ?',
                        [parseInt(class_id), subject, type, description, due_date, is_completed, id]
                    );
                    return { type: 'updated', id };
                } else {
                    // Insérer
                    const [insertResult] = await connection.execute(
                        'INSERT INTO ASSIGNMENT (class_id, subject, type, description, due_date, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
                        [parseInt(class_id), subject, type, description, due_date, is_completed]
                    );
                    return { type: 'created', id: insertResult.insertId };
                }
            });
            console.log(`✅ Assignation ${result.type} avec succès (ID: ${result.id})`);
            // Récupérer l'assignation complète après upsert pour le frontend
            const [assignment] = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT a.id, a.type, a.description, a.due_date, a.is_completed,
                           c.id AS class_id, c.name AS class_name, c.level AS class_level, a.subject
                    FROM ASSIGNMENT a
                    JOIN CLASS c ON a.class_id = c.id
                    WHERE a.id = ?
                `, [result.id]);
                return rows;
            });
            res.status(id ? 200 : 201).json({ success: true, message: `Assignation ${id ? 'mise à jour' : 'créée'} avec succès.`, data: assignment });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la sauvegarde de l\'assignation.');
        }
    }

    /**
     * Supprime une assignation.
     */
    static async deleteAssignment(req, res) {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return JournalController.handleError(res, new Error('ID invalide'), 'ID d\'assignation invalide.', 400);
        }
        try {
            const result = await JournalController.withConnection(async (connection) => {
                const [deleteResult] = await connection.execute('DELETE FROM ASSIGNMENT WHERE id = ?', [parseInt(id)]);
                return deleteResult;
            });
            if (result.affectedRows === 0) {
                return JournalController.handleError(res, new Error('Assignation non trouvée'), 'Assignation non trouvée.', 404);
            }
            console.log(`✅ Assignation supprimée avec succès (ID: ${id})`);
            res.json({ success: true, message: 'Assignation supprimée avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la suppression de l\'assignation.');
        }
    }
}

module.exports = JournalController;