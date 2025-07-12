// backend/controllers/journalController.js
const mysql = require('mysql2/promise');
const pool = require('../../config/database');

const parseFrenchDate = (dateStr) => {
    const months = { 'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5, 'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11 };
    const parts = dateStr.toLowerCase().split(' ');
    const day = parseInt(parts[1], 10);
    const month = months[parts[2]];
    const year = parseInt(parts[3], 10);
    return new Date(year, month, day);
};

const getDayKeyFromDate = (date) => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][date.getDay()];

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
                const [rows] = await connection.execute('SELECT id, name, school_year, is_archived, is_current FROM JOURNAL ORDER BY school_year DESC');
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
            return JournalController.handleError(res, new Error('Champs manquants'), 'Le nom et l\'année scolaire sont requis.', 400);
        }
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();
            await connection.execute('UPDATE JOURNAL SET is_current = 0 WHERE is_current = 1');
            const [insertResult] = await connection.execute('INSERT INTO JOURNAL (name, school_year, is_current, is_archived) VALUES (?, ?, 1, 0)', [name, school_year]);
            const newJournalId = insertResult.insertId;
            await connection.commit();
            const [newJournal] = await connection.execute('SELECT * FROM JOURNAL WHERE id = ?', [newJournalId]);
            res.status(201).json({ success: true, message: 'Journal créé avec succès.', data: newJournal[0] });
        } catch (error) {
            if (connection) await connection.rollback();
            JournalController.handleError(res, error, 'Erreur lors de la création du journal.');
        } finally {
            if (connection) connection.release();
        }
    }

    static async archiveJournal(req, res) {
        const { id } = req.params;
        try {
            const [result] = await JournalController.withConnection(async (connection) => await connection.execute('UPDATE JOURNAL SET is_archived = 1, is_current = 0 WHERE id = ?', [id]));
            if (result.affectedRows === 0) {
                return JournalController.handleError(res, new Error('Journal non trouvé'), 'Journal non trouvé.', 404);
            }
            res.json({ success: true, message: 'Journal archivé avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, "Erreur lors de l'archivage du journal.");
        }
    }

    static async deleteJournal(req, res) {
        const { id } = req.params;
        let connection; // Déclarer la connexion ici pour la visibilité dans le catch/finally

        try {
            connection = await pool.getConnection();
            await connection.beginTransaction(); // Démarrer une transaction
            await connection.execute('DELETE FROM JOURNAL_ENTRY WHERE journal_id = ?', [id]);

            const [result] = await connection.execute('DELETE FROM JOURNAL WHERE id = ? AND is_archived = 1', [id]);

            if (result.affectedRows === 0) {
                // Si rien n'a été supprimé, c'est que le journal n'a pas été trouvé ou n'était pas archivé
                await connection.rollback(); // Annuler la transaction
                return JournalController.handleError(res, new Error('Journal non trouvé ou non archivé'), 'Journal non trouvé ou non archivé.', 404);
            }

            await connection.commit(); // Valider la transaction
            res.json({ success: true, message: 'Journal supprimé définitivement.' });

        } catch (error) {
            if (connection) await connection.rollback(); // En cas d'erreur, annuler toutes les opérations
            JournalController.handleError(res, error, "Erreur lors de la suppression du journal.");
        } finally {
            if (connection) connection.release(); // Libérer la connexion
        }
    }
    static async importJournal(req, res) {
        if (!req.file) return JournalController.handleError(res, new Error('Aucun fichier fourni'), 'Veuillez fournir un fichier.', 400);

        const { journal_id } = req.body; // Récupérer l'ID du journal depuis le corps de la requête
        let connection;

        try {
            const jsonData = JSON.parse(req.file.buffer.toString('utf8'));
            if (!Array.isArray(jsonData)) throw new Error("Le JSON doit être un tableau de sessions.");

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [classes] = await connection.execute('SELECT id, name FROM CLASS');
            const [scheduleHours] = await connection.execute('SELECT id, libelle FROM SCHEDULE_HOURS');
            const [schedule] = await connection.execute('SELECT id, day, time_slot_id, class_id FROM SCHEDULE WHERE journal_id = ?', [journal_id]);
            const timeSlotMap = new Map(scheduleHours.map(h => [h.libelle, h.id]));

            let importedCount = 0;
            let skippedCount = 0;

            for (const sessionData of jsonData) {
                const sessionDate = parseFrenchDate(sessionData.date);
                if (!sessionDate) {
                    console.warn(`Date invalide ignorée: ${sessionData.date}`);
                    skippedCount++;
                    continue;
                }
                const dayKey = getDayKeyFromDate(sessionDate);
                for (const activity of sessionData.activites) {
                    const activityTime = activity.heure.replace('h', ':');
                    const foundLibelle = Array.from(timeSlotMap.keys()).find(libelle => libelle.startsWith(activityTime));
                    const timeSlotId = foundLibelle ? timeSlotMap.get(foundLibelle) : undefined;
                    if (!timeSlotId) {
                        console.warn(`Créneau horaire non trouvé pour ${activityTime} le ${sessionData.date}`);
                        continue;
                    }
                    const scheduleEntry = schedule.find(s => s.day === dayKey && s.time_slot_id === timeSlotId);
                    if (!scheduleEntry) {
                        console.warn(`Aucun cours trouvé dans l'horaire pour le ${dayKey} à ${activityTime} dans le journal ${journal_id}`);
                        skippedCount++;
                        continue;
                    }
                    const actual_work = activity.description;
                    const notesDescription = sessionData.remediation?.map(r => r.description).join('\n') || '';
                    await connection.execute(`INSERT INTO JOURNAL_ENTRY (journal_id, schedule_id, date, actual_work, notes) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE actual_work = CONCAT(IFNULL(actual_work, ''), '\\n', VALUES(actual_work)), notes = CONCAT(IFNULL(notes, ''), '\\n', VALUES(notes))`, [journal_id, scheduleEntry.id, sessionDate, actual_work, notesDescription]);
                    importedCount++;
                }
            }

            await connection.commit();
            res.json({ success: true, message: `Importation terminée. ${importedCount} entrées ajoutées, ${skippedCount} ignorées.`, data: { itemsImported: importedCount, itemsSkipped: skippedCount } });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error("Erreur détaillée de l'importation:", error);
            JournalController.handleError(res, error, `Erreur lors de l'importation du journal : ${error.message}`);
        } finally {
            if (connection) connection.release();
        }
    }

    static async getCurrentJournal(req, res) {
        try {
            const [journal] = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute('SELECT * FROM JOURNAL WHERE is_current = 1 LIMIT 1');
                return rows;
            });
            res.json({ success: true, data: journal || null });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la récupération du journal courant.');
        }
    }

    static async getArchivedJournals(req, res) {
        try {
            const journals = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute('SELECT * FROM JOURNAL WHERE is_archived = 1 ORDER BY school_year DESC');
                return rows;
            });
            res.json({ success: true, data: journals });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la récupération des journaux archivés.');
        }
    }

    static async getJournalEntries(req, res) {
        const { startDate, endDate, journal_id } = req.query;
        if (!startDate || !endDate || !journal_id) {
            return JournalController.handleError(res, new Error('Paramètres manquants'), 'Les dates de début, de fin et l\'ID du journal sont requis.', 400);
        }
        try {
            const entries = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT je.id, je.date, je.planned_work, je.actual_work, je.notes, je.journal_id, s.id AS schedule_id, s.day, s.time_slot_id, sh.libelle AS time_slot_libelle, s.subject AS course_subject, c.id AS class_id, c.name AS class_name, c.level AS class_level, s.room
                    FROM JOURNAL_ENTRY je
                    JOIN SCHEDULE s ON je.schedule_id = s.id
                    JOIN SCHEDULE_HOURS sh ON s.time_slot_id = sh.id
                    JOIN CLASS c ON s.class_id = c.id
                    WHERE je.journal_id = ? AND je.date BETWEEN ? AND ?`, [journal_id, startDate, endDate]);
                return rows;
            });
            res.json({ success: true, data: entries, count: entries.length, message: `${entries.length} entrées de journal récupérées.` });
        } catch (error) {
            JournalController.handleError(res, error, 'Erreur lors de la récupération des entrées de journal.');
        }
    }

    static async upsertJournalEntry(req, res) {
        const { id, schedule_id, date, planned_work, actual_work, notes, journal_id } = req.body;
        if (!schedule_id || !date || !journal_id) {
            return JournalController.handleError(res, new Error("L'ID de l'horaire, la date et l'ID du journal sont requis."), 'Données invalides.', 400);
        }
        try {
            const result = await JournalController.withConnection(async (connection) => {
                if (id) {
                    await connection.execute('UPDATE JOURNAL_ENTRY SET planned_work = ?, actual_work = ?, notes = ?, date = ?, schedule_id = ?, journal_id = ? WHERE id = ?', [planned_work, actual_work, notes, date, schedule_id, journal_id, id]);
                    return { type: 'updated', id };
                } else {
                    const [insertResult] = await connection.execute('INSERT INTO JOURNAL_ENTRY (schedule_id, date, planned_work, actual_work, notes, journal_id) VALUES (?, ?, ?, ?, ?, ?)', [schedule_id, date, planned_work, actual_work, notes, journal_id]);
                    return { type: 'created', id: insertResult.insertId };
                }
            });
            const [entry] = await JournalController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT je.id, je.date, je.planned_work, je.actual_work, je.notes, je.journal_id, s.id AS schedule_id, s.day, s.time_slot_id, sh.libelle AS time_slot_libelle, s.subject AS course_subject, c.id AS class_id, c.name AS class_name, c.level AS class_level, s.room
                    FROM JOURNAL_ENTRY je JOIN SCHEDULE s ON je.schedule_id = s.id JOIN SCHEDULE_HOURS sh ON s.time_slot_id = sh.id JOIN CLASS c ON s.class_id = c.id
                    WHERE je.id = ?`, [result.id]);
                return rows;
            });
            if (!entry) {
                return JournalController.handleError(res, new Error("Entrée non trouvée après upsert"), "Impossible de retrouver l'entrée après sauvegarde.", 404);
            }
            res.status(id ? 200 : 201).json({ success: true, message: `Entrée de journal ${id ? 'mise à jour' : 'créée'} avec succès.`, data: entry });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return JournalController.handleError(res, error, 'Une entrée existe déjà pour ce cours à cette date.', 409);
            JournalController.handleError(res, error, "Erreur lors de la sauvegarde de l'entrée de journal.");
        }
    }

    static async deleteJournalEntry(req, res) {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            return JournalController.handleError(res, new Error('ID invalide'), "ID d'entrée de journal invalide.", 400);
        }
        try {
            const result = await JournalController.withConnection(async (connection) => await connection.execute('DELETE FROM JOURNAL_ENTRY WHERE id = ?', [parseInt(id)]));
            if (result.affectedRows === 0) {
                return JournalController.handleError(res, new Error('Entrée non trouvée'), 'Entrée de journal non trouvée.', 404);
            }
            res.json({ success: true, message: 'Entrée de journal supprimée avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, "Erreur lors de la suppression de l'entrée de journal.");
        }
    }

    static async clearJournal(req, res) {
        const { journal_id } = req.params;
        if (!journal_id || isNaN(parseInt(journal_id))) {
            return JournalController.handleError(res, new Error('ID de journal invalide'), "ID de journal invalide.", 400);
        }
        try {
            const result = await JournalController.withConnection(async (connection) => {
                const [deleteResult] = await connection.execute(
                    'DELETE FROM JOURNAL_ENTRY WHERE journal_id = ?',
                    [parseInt(journal_id)]
                );
                return deleteResult;
            });
            res.json({ success: true, message: `Journal vidé avec succès. ${result.affectedRows} entrée(s) supprimée(s).`, data: { deletedCount: result.affectedRows } });
        } catch (error) {
            JournalController.handleError(res, error, "Erreur lors du vidage du journal.");
        }
    }

    static async getAssignments(req, res) {
        const { classId, startDate, endDate } = req.query;
        let query = `
            SELECT a.id, a.type, a.description, a.due_date, a.is_completed, a.is_corrected, c.id AS class_id, c.name AS class_name, c.level AS class_level, a.subject
            FROM ASSIGNMENT a JOIN CLASS c ON a.class_id = c.id`;
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
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
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
        if (id) {
            try {
                const validColumns = ['class_id', 'subject', 'type', 'description', 'due_date', 'is_completed', 'is_corrected'];
                const fieldsToUpdate = [];
                const values = [];
                Object.keys(req.body).forEach(key => {
                    if (validColumns.includes(key) && req.body[key] !== undefined) {
                        let value = req.body[key];
                        if (key === 'due_date' && value) value = JournalController.formatDateForDatabase(value);
                        fieldsToUpdate.push(`${key} = ?`);
                        values.push(value);
                    }
                });
                if (fieldsToUpdate.length === 0) {
                    const [assignment] = await JournalController.withConnection(async (c) => c.execute('SELECT a.*, c.name as class_name, c.level as class_level FROM ASSIGNMENT a JOIN CLASS c ON a.class_id = c.id WHERE a.id = ?', [id]));
                    return res.status(200).json({ success: true, message: 'Aucun champ valide à mettre à jour.', data: assignment[0] });
                }
                values.push(id);
                await JournalController.withConnection(async (c) => c.execute(`UPDATE ASSIGNMENT SET ${fieldsToUpdate.join(', ')} WHERE id = ?`, values));
                const [assignment] = await JournalController.withConnection(async (c) => c.execute('SELECT a.*, c.name as class_name, c.level as class_level FROM ASSIGNMENT a JOIN CLASS c ON a.class_id = c.id WHERE a.id = ?', [id]));
                res.status(200).json({ success: true, message: 'Assignation mise à jour avec succès.', data: assignment[0] });
            } catch (error) {
                JournalController.handleError(res, error, "Erreur lors de la mise à jour de l'assignation.");
            }
        } else {
            const { class_id, subject, type, description, due_date, is_completed } = req.body;
            if (!class_id || !subject || !type || !due_date) return JournalController.handleError(res, new Error('Champs obligatoires manquants'), 'Données invalides.', 400);
            try {
                const formattedDueDate = JournalController.formatDateForDatabase(due_date);

                console.log("date :", formattedDueDate);
                console.log("class_id :", class_id);
                console.log("subject :", subject);
                console.log("type :", type);
                console.log("description :", description);
                console.log("is_completed :", is_completed);

                const [result] = await JournalController.withConnection(async (c) => c.execute('INSERT INTO ASSIGNMENT (class_id, subject, type, description, due_date, is_completed) VALUES (?, ?, ?, ?, ?, ?)', [parseInt(class_id), subject, type, description || null, formattedDueDate, is_completed || false]));
                const [assignment] = await JournalController.withConnection(async (c) => c.execute('SELECT a.*, c.name as class_name, c.level as class_level FROM ASSIGNMENT a JOIN CLASS c ON a.class_id = c.id WHERE a.id = ?', [result.insertId]));
                res.status(201).json({ success: true, message: 'Assignation créée avec succès.', data: assignment[0] });
            } catch (error) {
                JournalController.handleError(res, error, "Erreur lors de la création de l'assignation.");
            }
        }
    }

    static formatDateForDatabase(dateInput) {
        if (!dateInput) return null;
        let date;
        if (dateInput instanceof Date) date = dateInput;
        else if (typeof dateInput === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return dateInput;
            date = new Date(dateInput);
        } else date = new Date(dateInput);
        if (isNaN(date.getTime())) throw new Error('Date invalide');
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static async deleteAssignment(req, res) {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) return JournalController.handleError(res, new Error('ID invalide'), "ID d'assignation invalide.", 400);
        try {
            const result = await JournalController.withConnection(async (c) => c.execute('DELETE FROM ASSIGNMENT WHERE id = ?', [parseInt(id)]));
            if (result.affectedRows === 0) return JournalController.handleError(res, new Error('Assignation non trouvée'), 'Assignation non trouvée.', 404);
            res.json({ success: true, message: 'Assignation supprimée avec succès.' });
        } catch (error) {
            JournalController.handleError(res, error, "Erreur lors de la suppression de l'assignation.");
        }
    }
}

module.exports = JournalController;
