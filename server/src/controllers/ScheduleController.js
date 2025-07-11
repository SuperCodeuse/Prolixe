// backend/controllers/ScheduleController.js
const mysql = require('mysql2/promise');
const pool = require('../../config/database');

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
        // ... (la validation ne change pas)
        const errors = {};
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        if (!data.day || !validDays.includes(data.day)) errors.day = 'Jour de la semaine invalide.';
        if (!data.time_slot_id || isNaN(parseInt(data.time_slot_id)) || parseInt(data.time_slot_id) <= 0) errors.time_slot_id = 'ID de créneau horaire invalide.';
        if (!data.subject || typeof data.subject !== 'string' || !data.subject.trim()) errors.subject = 'La matière est requise.';
        if (!data.class_id || isNaN(parseInt(data.class_id)) || parseInt(data.class_id) <= 0) errors.class_id = 'ID de classe invalide.';
        if (!data.room || typeof data.room !== 'string' || !data.room.trim()) errors.room = 'Le local est requis.';
        if (!data.journal_id || isNaN(parseInt(data.journal_id)) || parseInt(data.journal_id) <= 0) errors.journal_id = 'ID de journal invalide.';
        return errors;
    }

    static async getScheduleData(journal_id, connection = null) {
        const executeQuery = async (conn) => {
            const [rows] = await conn.execute(`
                SELECT s.id, s.day, s.time_slot_id, h.libelle AS time_slot_libelle, s.subject, s.class_id, c.name AS class_name, c.level AS class_level, s.room, s.notes
                FROM SCHEDULE s
                JOIN schedule_hours h ON s.time_slot_id = h.id
                JOIN CLASS c ON s.class_id = c.id
                WHERE s.journal_id = ?
            `, [journal_id]);
            return rows;
        };
        const scheduleData = connection ? await executeQuery(connection) : await ScheduleController.withConnection(executeQuery);
        const formattedSchedule = {};
        scheduleData.forEach(item => {
            const slotKey = `${item.day}-${item.time_slot_libelle}`;
            formattedSchedule[slotKey] = { id: item.id, day: item.day, time_slot_id: item.time_slot_id, time_slot_libelle: item.time_slot_libelle, subject: item.subject, classId: item.class_id, room: item.room, notes: item.notes, className: item.class_name, classLevel: item.class_level };
        });
        return formattedSchedule;
    }

    static async getSchedule(req, res) {
        const { journal_id } = req.query;
        if (!journal_id) return ScheduleController.handleError(res, new Error('ID de journal manquant'), "L'ID du journal est requis.", 400);
        try {
            const formattedSchedule = await ScheduleController.getScheduleData(journal_id);
            res.json({ success: true, data: formattedSchedule, count: Object.keys(formattedSchedule).length, message: Object.keys(formattedSchedule).length === 0 ? 'Aucun créneau horaire trouvé pour ce journal.' : `${Object.keys(formattedSchedule).length} créneau(x) récupéré(s).` });
        } catch (error) {
            ScheduleController.handleError(res, error, 'Erreur lors de la récupération de l\'emploi du temps.');
        }
    }

    static async upsertCourse(req, res) {
        const { day, time_slot_id, subject, classId, room, notes, journal_id } = req.body;
        const validationErrors = ScheduleController.validateCourseData({ day, time_slot_id, subject, class_id: classId, room, journal_id });
        if (Object.keys(validationErrors).length > 0) return ScheduleController.handleError(res, new Error('Données de validation invalides'), 'Données invalides.', 400, validationErrors);
        try {
            const result = await ScheduleController.withConnection(async (connection) => {
                const [existing] = await connection.execute('SELECT id FROM SCHEDULE WHERE day = ? AND time_slot_id = ? AND journal_id = ?', [day, parseInt(time_slot_id), parseInt(journal_id)]);
                if (existing.length > 0) {
                    const courseId = existing[0].id;
                    await connection.execute('UPDATE SCHEDULE SET subject = ?, class_id = ?, room = ?, notes = ? WHERE id = ?', [subject.trim(), parseInt(classId), room.trim(), notes || null, courseId]);
                    const updatedSchedule = await ScheduleController.getScheduleData(journal_id, connection);
                    return { type: 'updated', id: courseId, schedule: updatedSchedule };
                } else {
                    const [insertResult] = await connection.execute('INSERT INTO SCHEDULE (day, time_slot_id, subject, class_id, room, notes, journal_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [day, parseInt(time_slot_id), subject.trim(), parseInt(classId), room.trim(), notes || null, parseInt(journal_id)]);
                    const updatedSchedule = await ScheduleController.getScheduleData(journal_id, connection);
                    return { type: 'created', id: insertResult.insertId, schedule: updatedSchedule };
                }
            });
            res.status(result.type === 'created' ? 201 : 200).json({ success: true, message: `Cours ${result.type === 'created' ? 'créé' : 'mis à jour'} avec succès.`, data: { course: { id: result.id, day, time_slot_id, subject, classId, room, notes }, schedule: result.schedule }, count: Object.keys(result.schedule).length });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') return ScheduleController.handleError(res, error, 'Un cours existe déjà pour ce créneau.', 409);
            if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_PARENT_2') return ScheduleController.handleError(res, error, 'Classe, créneau horaire ou journal inexistant.', 400, { general: 'Classe, créneau horaire ou journal invalide.' });
            ScheduleController.handleError(res, error, 'Erreur lors de la sauvegarde du cours.');
        }
    }

    static async deleteCourse(req, res) {
        const { journal_id, day, time_slot_id } = req.params;
        if (!day || !time_slot_id || isNaN(parseInt(time_slot_id)) || !journal_id || isNaN(parseInt(journal_id))) return ScheduleController.handleError(res, new Error('Paramètres de suppression invalides'), 'Paramètres de suppression invalides.', 400);
        try {
            const result = await ScheduleController.withConnection(async (connection) => {
                const [deleteResult] = await connection.execute('DELETE FROM SCHEDULE WHERE day = ? AND time_slot_id = ? AND journal_id = ?', [day, parseInt(time_slot_id), parseInt(journal_id)]);
                if (deleteResult.affectedRows === 0) return { deleted: false, schedule: null };
                const updatedSchedule = await ScheduleController.getScheduleData(journal_id, connection);
                return { deleted: true, affectedRows: deleteResult.affectedRows, schedule: updatedSchedule };
            });
            if (!result.deleted) return ScheduleController.handleError(res, new Error('Cours non trouvé'), 'Cours non trouvé pour suppression.', 404);
            res.json({ success: true, message: 'Cours supprimé avec succès.', data: { schedule: result.schedule, deletedCourse: { day, time_slot_id } }, count: Object.keys(result.schedule).length });
        } catch (error) {
            ScheduleController.handleError(res, error, 'Erreur lors de la suppression du cours.');
        }
    }
}

module.exports = ScheduleController;