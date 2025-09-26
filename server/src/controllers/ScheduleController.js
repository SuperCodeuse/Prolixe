// backend/controllers/ScheduleController.js
const mysql = require('mysql2/promise');
const pool = require('../../config/database');
const JournalController = require('./JournalController');

class ScheduleController {
    static async withConnection(operation) {
        let connection;
        try {
            connection = await pool.getConnection();
            if (typeof connection.release !== 'function') {
                console.error("DEBUG: L'objet de connexion n'a pas la méthode .release().");
                throw new Error("L'objet de connexion obtenu du pool n'est pas valide.");
            }
            return await operation(connection);
        } catch (error) {
            console.error('Erreur SQL dans withConnection (ScheduleController):', error.message);
            throw error;
        } finally {
            if (connection && typeof connection.release === 'function') {
                connection.release();
            }
        }
    }

    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500, customErrors = {}) {
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        console.error(`❌ Erreur dans ScheduleController: ${defaultMessage}`, error);
        res.status(statusCode).json({ success: false, message: defaultMessage, error: errorMessage, errors: customErrors });
    }

    static validateCourseData(data) {
        const errors = {};
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (!data.day || !validDays.includes(data.day)) errors.day = 'Jour de la semaine invalide.';
        if (!data.time_slot_id || isNaN(parseInt(data.time_slot_id)) || parseInt(data.time_slot_id) <= 0) errors.time_slot_id = 'ID de créneau horaire invalide.';
        if (!data.subject || typeof data.subject !== 'string' || !data.subject.trim()) errors.subject = 'La matière est requise.';
        if (!data.class_id || isNaN(parseInt(data.class_id)) || parseInt(data.class_id) <= 0) errors.class_id = 'ID de classe invalide.';
        if (!data.room || typeof data.room !== 'string' || !data.room.trim()) errors.room = 'Le local est requis.';
        if (!data.journal_id || isNaN(parseInt(data.journal_id)) || parseInt(data.journal_id) <= 0) errors.journal_id = 'ID de journal invalide.';
        if (!data.schedule_set_id || isNaN(parseInt(data.schedule_set_id)) || parseInt(data.schedule_set_id) <= 0) errors.schedule_set_id = 'ID de l\'ensemble d\'horaires invalide.';
        return errors;
    }

    static async getScheduleData(journal_id, userId, schedule_set_id, connection = null) {
        const executeQuery = async (conn) => {
            const [rows] = await conn.execute(`
                SELECT s.id, s.day, s.time_slot_id, h.libelle AS time_slot_libelle, s.subject, s.class_id, c.name AS class_name, c.level AS class_level, s.room, s.notes, s.start_date, s.end_date
                FROM SCHEDULE s
                JOIN SCHEDULE_HOURS h ON s.time_slot_id = h.id
                JOIN CLASS c ON s.class_id = c.id
                WHERE s.journal_id = ? AND s.user_id = ? AND s.schedule_set_id = ?
            `, [journal_id, userId, schedule_set_id]);
            return rows;
        };
        const scheduleData = connection ? await executeQuery(connection) : await ScheduleController.withConnection(executeQuery);
        const formattedSchedule = {};
        scheduleData.forEach(item => {
            const slotKey = `${item.day}-${item.time_slot_libelle}`;
            formattedSchedule[slotKey] = { id: item.id, day: item.day, time_slot_id: item.time_slot_id, time_slot_libelle: item.time_slot_libelle, subject: item.subject, classId: item.class_id, room: item.room, notes: item.notes, className: item.class_name, classLevel: item.class_level, startDate: item.start_date, endDate: item.end_date };
        });
        return formattedSchedule;
    }

    static async getSchedule(req, res) {
        const { journal_id, schedule_set_id } = req.query;
        const userId = req.user.id;

        if (!journal_id || !schedule_set_id) return ScheduleController.handleError(res, new Error('ID de journal ou d\'ensemble d\'horaires manquant'), "L'ID du journal et de l'ensemble d'horaires sont requis.", 400);
        if (!userId) return ScheduleController.handleError(res, new Error('ID utilisateur manquant'), "L'authentification est requise.", 401);

        try {
            const formattedSchedule = await ScheduleController.getScheduleData(parseInt(journal_id), userId, parseInt(schedule_set_id));
            res.json({ success: true, data: formattedSchedule, count: Object.keys(formattedSchedule).length, message: Object.keys(formattedSchedule).length === 0 ? 'Aucun créneau horaire trouvé pour ce journal.' : `${Object.keys(formattedSchedule).length} créneau(x) récupéré(s).` });
        } catch (error) {
            ScheduleController.handleError(res, error, 'Erreur lors de la récupération de l\'emploi du temps.');
        }
    }

    static async changeCourse(req, res) {
        const { source_day, source_time_slot_id, target_day, target_time_slot_id, subject, classId, room, notes, journal_id, effective_date, schedule_set_id } = req.body;
        const userId = req.user.id;

        if (!userId) return ScheduleController.handleError(res, new Error('ID utilisateur manquant'), "L'authentification est requise.", 401);

        const validationErrors = ScheduleController.validateCourseData({ day: target_day, time_slot_id: target_time_slot_id, subject, class_id: classId, room, journal_id, schedule_set_id });
        if (Object.keys(validationErrors).length > 0) return ScheduleController.handleError(res, new Error('Données de validation invalides'), 'Données invalides.', 400, validationErrors);

        const effectiveDateObj = effective_date ? new Date(effective_date) : new Date();
        effectiveDateObj.setHours(0, 0, 0, 0);

        const dayBeforeEffective = new Date(effectiveDateObj);
        dayBeforeEffective.setDate(effectiveDateObj.getDate() - 1);

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            await connection.execute(`
            UPDATE SCHEDULE
            SET end_date = ?
            WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ? AND (end_date IS NULL OR end_date >= ?) AND start_date < ?
        `, [dayBeforeEffective, source_day, parseInt(source_time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id), effectiveDateObj, effectiveDateObj]);

            await connection.execute(`
            UPDATE SCHEDULE
            SET end_date = ?
            WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ? AND (end_date IS NULL OR end_date >= ?) AND start_date < ?
        `, [dayBeforeEffective, target_day, parseInt(target_time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id), effectiveDateObj, effectiveDateObj]);

            const [existingTargetCourse] = await connection.execute(`
            SELECT id FROM SCHEDULE
            WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ? AND start_date = ? AND (end_date IS NULL OR end_date >= ?)
        `, [target_day, parseInt(target_time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id), effectiveDateObj, effectiveDateObj]);

            let insertResult;

            if (existingTargetCourse.length > 0) {
                const targetCourseId = existingTargetCourse[0].id;
                await connection.execute(`
                UPDATE SCHEDULE
                SET subject = ?, class_id = ?, room = ?, notes = ?
                WHERE id = ? AND user_id = ? AND schedule_set_id = ?
            `, [subject.trim(), parseInt(classId), room.trim(), notes || null, targetCourseId, userId, parseInt(schedule_set_id)]);

                insertResult = { insertId: targetCourseId };
            } else {
                const [result] = await connection.execute(
                    'INSERT INTO SCHEDULE (day, time_slot_id, subject, class_id, room, notes, journal_id, user_id, start_date, schedule_set_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [target_day, parseInt(target_time_slot_id), subject.trim(), parseInt(classId), room.trim(), notes || null, parseInt(journal_id), userId, effectiveDateObj, parseInt(schedule_set_id)]
                );
                insertResult = result;
            }

            await JournalController.reassignJournalEntries(connection, parseInt(journal_id), userId, effectiveDateObj, insertResult.insertId);

            await connection.commit();
            res.status(200).json({ success: true, message: `Emploi du temps mis à jour à partir du ${effective_date}.` });
        } catch (error) {
            if (connection) await connection.rollback();
            ScheduleController.handleError(res, error, "Erreur lors de la mise à jour de l'emploi du temps.");
        } finally {
            if (connection) connection.release();
        }
    }

    static async upsertCourse(req, res) {
        const { day, time_slot_id, subject, classId, room, notes, journal_id, effective_date, schedule_set_id } = req.body;
        const userId = req.user.id;

        if (!userId) return ScheduleController.handleError(res, new Error('ID utilisateur manquant'), "L'authentification est requise.", 401);

        const validationErrors = ScheduleController.validateCourseData({ day, time_slot_id, subject, class_id: classId, room, journal_id, schedule_set_id });
        if (Object.keys(validationErrors).length > 0) return ScheduleController.handleError(res, new Error('Données de validation invalides'), 'Données invalides.', 400, validationErrors);

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const today = effective_date ? new Date(effective_date) : new Date();
            today.setHours(0, 0, 0, 0);

            // D'abord, fermer tous les cours existants pour ce créneau exact avant la date effective
            const dayBefore = new Date(today);
            dayBefore.setDate(today.getDate() - 1);

            await connection.execute(`
                UPDATE SCHEDULE 
                SET end_date = ? 
                WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ? 
                AND (end_date IS NULL OR end_date >= ?) AND start_date < ?
            `, [dayBefore, day, parseInt(time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id), today, today]);

            // Vérifier s'il existe déjà un cours actif exactement à la date effective
            const [existingAtDate] = await connection.execute(`
                SELECT id FROM SCHEDULE 
                WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ? 
                AND start_date = ?
            `, [day, parseInt(time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id), today]);

            if (existingAtDate.length > 0) {
                // Mettre à jour le cours existant à cette date
                const courseId = existingAtDate[0].id;
                await connection.execute(`
                    UPDATE SCHEDULE 
                    SET subject = ?, class_id = ?, room = ?, notes = ?
                    WHERE id = ?
                `, [subject.trim(), parseInt(classId), room.trim(), notes || null, courseId]);

                await connection.commit();
                const updatedSchedule = await ScheduleController.getScheduleData(journal_id, userId, parseInt(schedule_set_id));
                return res.status(200).json({
                    success: true,
                    message: 'Cours mis à jour avec succès.',
                    data: {
                        course: { id: courseId, day, time_slot_id, subject, classId, room, notes },
                        schedule: updatedSchedule
                    },
                    count: Object.keys(updatedSchedule).length
                });
            } else {
                const [insertResult] = await connection.execute(`
                    INSERT INTO SCHEDULE (day, time_slot_id, subject, class_id, room, notes, journal_id, user_id, start_date, schedule_set_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [day, parseInt(time_slot_id), subject.trim(), parseInt(classId), room.trim(), notes || null, parseInt(journal_id), userId, today, parseInt(schedule_set_id)]);

                await connection.commit();
                const updatedSchedule = await ScheduleController.getScheduleData(journal_id, userId, parseInt(schedule_set_id));
                return res.status(201).json({
                    success: true,
                    message: 'Cours créé avec succès.',
                    data: {
                        course: { id: insertResult.insertId, day, time_slot_id, subject, classId, room, notes },
                        schedule: updatedSchedule
                    },
                    count: Object.keys(updatedSchedule).length
                });
            }
        } catch (error) {
            if (connection) await connection.rollback();

            if (error.code === 'ER_DUP_ENTRY') {
                // Cela ne devrait plus arriver avec notre logique, mais au cas où
                return ScheduleController.handleError(res, error, 'Un conflit de contrainte unique s\'est produit. Un cours identique existe peut-être déjà.', 409);
            }
            if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_PARENT_2') {
                return ScheduleController.handleError(res, error, 'Classe, créneau horaire ou journal inexistant.', 400, { general: 'Classe, créneau horaire ou journal invalide.' });
            }
            ScheduleController.handleError(res, error, 'Erreur lors de la sauvegarde du cours.');
        } finally {
            if (connection) connection.release();
        }
    }

    static async deleteCourse(req, res) {
        const { journal_id, day, time_slot_id } = req.params;
        const { effective_date, delete_all, schedule_set_id } = req.query;
        const userId = req.user.id;

        if (!userId) return ScheduleController.handleError(res, new Error('ID utilisateur manquant'), "L'authentification est requise.", 401);
        if (!day || !time_slot_id || isNaN(parseInt(time_slot_id)) || !journal_id || isNaN(parseInt(journal_id)) || !schedule_set_id || isNaN(parseInt(schedule_set_id))) return ScheduleController.handleError(res, new Error('Paramètres de suppression invalides'), 'Paramètres de suppression invalides.', 400);

        const effectiveDateObj = effective_date ? new Date(effective_date) : new Date();
        effectiveDateObj.setHours(0, 0, 0, 0);

        try {
            const result = await ScheduleController.withConnection(async (connection) => {
                let sql;
                let params;

                if (delete_all === 'true') {
                    sql = `
                        DELETE FROM SCHEDULE
                        WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ?
                    `;
                    params = [day, parseInt(time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id)];
                } else {
                    const dayBeforeEffective = new Date(effectiveDateObj);
                    dayBeforeEffective.setDate(effectiveDateObj.getDate() - 1);

                    sql = `
                        UPDATE SCHEDULE
                        SET end_date = ?
                        WHERE day = ? AND time_slot_id = ? AND journal_id = ? AND user_id = ? AND schedule_set_id = ? AND (end_date IS NULL OR end_date >= ?) AND start_date <= ?
                    `;
                    params = [dayBeforeEffective, day, parseInt(time_slot_id), parseInt(journal_id), userId, parseInt(schedule_set_id), effectiveDateObj, effectiveDateObj];
                }

                const [updateResult] = await connection.execute(sql, params);

                if (updateResult.affectedRows === 0) return { deleted: false, schedule: null };

                const updatedSchedule = await ScheduleController.getScheduleData(journal_id, userId, parseInt(schedule_set_id), connection);
                return { deleted: true, affectedRows: updateResult.affectedRows, schedule: updatedSchedule };
            });

            if (!result.deleted) return ScheduleController.handleError(res, new Error('Cours non trouvé'), 'Cours non trouvé pour suppression (ou vous n\'avez pas les droits).', 404);

            res.json({ success: true, message: 'Cours supprimé avec succès.', data: { schedule: result.schedule, deletedCourse: { day, time_slot_id } }, count: Object.keys(result.schedule).length });
        } catch (error) {
            ScheduleController.handleError(res, error, 'Erreur lors de la suppression du cours.');
        }
    }
}

module.exports = ScheduleController;