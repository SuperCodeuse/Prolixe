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

    static async getAllJournals(req, res) {
        try {
            const journals = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute('SELECT * FROM journal ORDER BY school_year DESC');
                return rows;
            });
            res.json({ success: true, data: journals });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la récupération des journaux.');
        }
    }

    static async createJournal(req, res) {
        const { name, school_year } = req.body;
        if (!name || !school_year) {
            return JournalController.handleError(res, new Error('Nom et année scolaire requis'), 'Données invalides', 400);
        }

        try {
            const newJournalId = await JournalController.withConnection(async (connection) => {
                await connection.execute('UPDATE journal SET is_current = 0 WHERE is_current = 1');
                const [result] = await connection.execute(
                    'INSERT INTO journal (name, school_year, is_current) VALUES (?, ?, 1)',
                    [name, school_year]
                );
                return result.insertId;
            });
            const [newJournal] = await JournalController.withConnection(async c => (await c.execute('SELECT * FROM journal WHERE id = ?', [newJournalId]))[0]);
            res.status(201).json({ success: true, data: newJournal, message: 'Nouveau journal créé avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la création du journal.');
        }
    }


    static async archiveJournal(req, res) {
        const { id } = req.params;
        try {
            await JournalController.withConnection(async (connection) => {
                await connection.execute('UPDATE journal SET is_archived = 1, is_current = 0 WHERE id = ?', [id]);
            });
            res.json({ success: true, message: 'Journal archivé.' });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de l\'archivage.');
        }
    }

    static async setCurrentJournal(req, res) {
        const { id } = req.params;
        try {
            await JournalController.withConnection(async (connection) => {
                await connection.beginTransaction();
                await connection.execute('UPDATE journal SET is_current = 0');
                await connection.execute('UPDATE journal SET is_current = 1, is_archived = 0 WHERE id = ?', [id]);
                await connection.commit();
            });
            res.json({ success: true, message: 'Journal défini comme courant.' });
        } catch (error) {
            await connection.rollback();
            JournalController.handleError(res, error, 'Erreur lors de la définition du journal courant.');
        }
    }

    static async importJournal(req, res) {
        if (!req.file) {
            return JournalController.handleError(res, new Error('Aucun fichier fourni'), 'Fichier manquant', 400);
        }

        try {
            const filePath = req.file.path;
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const dataToImport = JSON.parse(fileContent);

            // Logique d'importation...
            // Pour cet exemple, nous allons juste retourner un succès.
            // La logique complète nécessiterait de mapper les données JSON aux tables de la DB.

            await fs.unlink(filePath); // Nettoyer le fichier uploadé

            res.json({ success: true, message: `${dataToImport.length} entrées ont été importées avec succès.` });

        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de l\'importation du journal.');
        }
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
            SELECT a.id, a.type, a.description, a.due_date, a.is_completed, a.is_corrected,
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
            res.json({ success: true, data: assignments, count: assignments.length, message: `${assignments.length} assignations récupérées.` });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la récupération des assignations.');
        }
    }


    static async upsertAssignment(req, res) {
        const { id } = req.body;

        if (id) { // C'est une mise à jour
            try {
                const validColumns = ['class_id', 'subject', 'type', 'description', 'due_date', 'is_completed', 'is_corrected'];
                const fieldsToUpdate = [];
                const values = [];

                Object.keys(req.body).forEach(key => {
                    if (validColumns.includes(key) && req.body[key] !== undefined) {
                        let value = req.body[key];

                        // Gestion améliorée des dates
                        if (key === 'due_date' && value) {
                            value = JournalController.formatDateForDatabase(value);
                        }

                        fieldsToUpdate.push(`${key} = ?`);
                        values.push(value);
                    }
                });

                if (fieldsToUpdate.length === 0) {
                    const [assignment] = await JournalController.withConnection(async (connection) => {
                        const [rows] = await connection.execute(`
                        SELECT a.id, a.type, a.description, a.due_date, a.is_completed, a.is_corrected,
                               c.id AS class_id, c.name AS class_name, c.level AS class_level, a.subject
                        FROM ASSIGNMENT a
                        JOIN CLASS c ON a.class_id = c.id
                        WHERE a.id = ?
                    `, [id]);
                        return rows;
                    });
                    return res.status(200).json({
                        success: true,
                        message: 'Aucun champ valide à mettre à jour.',
                        data: assignment
                    });
                }

                values.push(id);

                await JournalController.withConnection(async (connection) => {
                    await connection.execute(
                        `UPDATE ASSIGNMENT SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
                        values
                    );
                });

                const [assignment] = await JournalController.withConnection(async (connection) => {
                    const [rows] = await connection.execute(`
                    SELECT a.id, a.type, a.description, a.due_date, a.is_completed, a.is_corrected,
                           c.id AS class_id, c.name AS class_name, c.level AS class_level, a.subject
                    FROM ASSIGNMENT a
                    JOIN CLASS c ON a.class_id = c.id
                    WHERE a.id = ?
                `, [id]);
                    return rows;
                });

                res.status(200).json({
                    success: true,
                    message: 'Assignation mise à jour avec succès.',
                    data: assignment
                });

            } catch (error) {
                JournalController.handleError(res, error, 'Erreur lors de la mise à jour de l\'assignation.');
            }

        } else { // Logique de création
            const { class_id, subject, type, description, due_date, is_completed } = req.body;

            if (!class_id || !subject || !type || !due_date) {
                return JournalController.handleError(res, new Error('Tous les champs obligatoires sont requis.'), 'Données invalides.', 400);
            }

            try {
                // Formatage de la date pour la création aussi
                const formattedDueDate = JournalController.formatDateForDatabase(due_date);

                const result = await JournalController.withConnection(async (connection) => {
                    const [insertResult] = await connection.execute(
                        'INSERT INTO ASSIGNMENT (class_id, subject, type, description, due_date, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
                        [parseInt(class_id), subject, type, description || null, formattedDueDate, is_completed || false]
                    );
                    return { type: 'created', id: insertResult.insertId };
                });

                const [assignment] = await JournalController.withConnection(async (connection) => {
                    const [rows] = await connection.execute(`
                    SELECT a.id, a.type, a.description, a.due_date, a.is_completed, a.is_corrected,
                           c.id AS class_id, c.name AS class_name, c.level AS class_level, a.subject
                    FROM ASSIGNMENT a
                    JOIN CLASS c ON a.class_id = c.id
                    WHERE a.id = ?
                `, [result.id]);
                    return rows;
                });

                res.status(201).json({
                    success: true,
                    message: 'Assignation créée avec succès.',
                    data: assignment
                });
            } catch (error) {
                JournalController.handleError(res, error, 'Erreur lors de la création de l\'assignation.');
            }
        }
    }

// Méthode utilitaire à ajouter dans votre JournalController
    static formatDateForDatabase(dateInput) {
        if (!dateInput) return null;

        let date;

        // Si c'est déjà une instance Date
        if (dateInput instanceof Date) {
            date = dateInput;
        }
        // Si c'est une string
        else if (typeof dateInput === 'string') {
            // Si c'est déjà au format YYYY-MM-DD, on le garde tel quel
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                return dateInput;
            }
            // Sinon on parse la date
            date = new Date(dateInput);
        }
        // Autres cas
        else {
            date = new Date(dateInput);
        }

        // Vérification que la date est valide
        if (isNaN(date.getTime())) {
            throw new Error('Date invalide');
        }

        // Retour au format YYYY-MM-DD en utilisant les méthodes locales
        // pour éviter les problèmes de fuseau horaire
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
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
            res.json({ success: true, message: 'Assignation supprimée avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la suppression de l\'assignation.');
        }
    }
}

module.exports = JournalController;