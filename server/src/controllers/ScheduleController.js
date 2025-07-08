// backend/controllers/ScheduleController.js
const mysql = require('mysql2/promise');
const pool = require('../../config/database'); // Assurez-vous que le chemin est correct

class ScheduleController {
    /**
     * Méthode utilitaire pour acquérir et libérer une connexion de pool.
     * @param {function(Connection): Promise<any>} operation - Fonction asynchrone qui prend la connexion en paramètre.
     * @returns {Promise<any>} Le résultat de l'opération.
     * @throws {Error} Toute erreur survenant.
     */
    static async withConnection(operation) {
        let connection;
        try {
            connection = await pool.getConnection();
            if (typeof connection.release !== 'function') {
                console.error("DEBUG: L'objet de connexion n'a pas la méthode .release(). Vérifiez la configuration du pool.");
                throw new Error("L'objet de connexion obtenu du pool n'est pas valide pour être relâché.");
            }
            return await operation(connection);
        } catch (error) {
            console.error('Erreur SQL dans withConnection (ScheduleController):', error.message);
            throw error;
        } finally {
            if (connection) {
                if (typeof connection.release === 'function') {
                    connection.release();
                } else {
                    console.warn("Avertissement: Impossible de libérer la connexion car la méthode 'release' est manquante.");
                }
            }
        }
    }

    /**
     * Gère et standardise les réponses d'erreur HTTP.
     * @param {Response} res - L'objet réponse Express.
     * @param {Error} error - L'objet erreur.
     * @param {string} defaultMessage - Message d'erreur par défaut pour l'utilisateur.
     * @param {number} statusCode - Code de statut HTTP de l'erreur.
     * @param {object} customErrors - Erreurs spécifiques à renvoyer (ex: validation).
     */
    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500, customErrors = {}) {
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        console.error(`❌ Erreur dans ScheduleController: ${defaultMessage}`, error);

        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            error: errorMessage, // En dev, error.message sera affiché
            errors: customErrors
        });
    }

    /**
     * Valide les données d'entrée pour un créneau horaire de cours.
     * @param {object} data - Les données du cours (day, time_slot_id, subject, class_id, room).
     * @returns {object} Un objet contenant les erreurs de validation par champ.
     */
    static validateCourseData(data) {
        const errors = {};
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        if (!data.day || !validDays.includes(data.day)) {
            errors.day = 'Jour de la semaine invalide.';
        }
        // time_slot_id doit être un entier positif
        if (!data.time_slot_id || isNaN(parseInt(data.time_slot_id)) || parseInt(data.time_slot_id) <= 0) {
            errors.time_slot_id = 'ID de créneau horaire invalide.';
        }
        if (!data.subject || typeof data.subject !== 'string' || !data.subject.trim()) {
            errors.subject = 'La matière est requise.';
        }
        // class_id doit être un entier positif
        if (!data.class_id || isNaN(parseInt(data.class_id)) || parseInt(data.class_id) <= 0) {
            errors.class_id = 'ID de classe invalide.';
        }
        if (!data.room || typeof data.room !== 'string' || !data.room.trim()) {
            errors.room = 'Le local est requis.';
        }
        // Notes est optionnel, pas besoin de validation ici sauf si contraintes spécifiques
        return errors;
    }

    /**
     * Récupère et formate l'emploi du temps complet.
     * @param {Connection} connection - Connexion à la base de données (optionnelle).
     * @returns {Promise<object>} L'emploi du temps formaté.
     */
    static async getScheduleData(connection = null) {
        const executeQuery = async (conn) => {
            const [rows] = await conn.execute(`
                SELECT
                    s.id,
                    s.day,
                    s.time_slot_id,
                    h.libelle AS time_slot_libelle,
                    s.subject,
                    s.class_id,
                    c.name AS class_name,
                    c.level AS class_level,
                    s.room,
                    s.notes
                FROM SCHEDULE s
                JOIN schedule_hours h ON s.time_slot_id = h.id
                JOIN CLASS c ON s.class_id = c.id
            `);
            return rows;
        };

        const scheduleData = connection
            ? await executeQuery(connection)
            : await ScheduleController.withConnection(executeQuery);

        // Transformer les données pour qu'elles correspondent au format { day-time_libelle: courseData }
        const formattedSchedule = {};
        scheduleData.forEach(item => {
            const slotKey = `${item.day}-${item.time_slot_libelle}`;
            formattedSchedule[slotKey] = {
                id: item.id,
                day: item.day,
                time_slot_id: item.time_slot_id,
                time_slot_libelle: item.time_slot_libelle,
                subject: item.subject,
                classId: item.class_id,
                room: item.room,
                notes: item.notes,
                className: item.class_name,
                classLevel: item.class_level
            };
        });

        return formattedSchedule;
    }

    /**
     * Récupère tout l'emploi du temps.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getSchedule(req, res) {
        try {
            const formattedSchedule = await ScheduleController.getScheduleData();

            res.json({
                success: true,
                data: formattedSchedule,
                count: Object.keys(formattedSchedule).length,
                message: Object.keys(formattedSchedule).length === 0 ? 'Aucun créneau horaire trouvé.' : `${Object.keys(formattedSchedule).length} créneau(x) récupéré(s).`
            });

        } catch (error) {
            console.error("DÉTAIL ERREUR GET SCHEDULE:", error);
            ScheduleController.handleError(res, error, 'Erreur lors de la récupération de l\'emploi du temps.');
        }
    }

    /**
     * Ajoute ou met à jour un cours dans l'emploi du temps.
     * @param {Request} req - L'objet requête Express (contient req.body).
     * @param {Response} res - L'objet réponse Express.
     */
    static async upsertCourse(req, res) {
        const { day, time_slot_id, subject, classId, room, notes } = req.body;

        // Validation des données
        const validationErrors = ScheduleController.validateCourseData({ day, time_slot_id, subject, class_id: classId, room });
        if (Object.keys(validationErrors).length > 0) {
            return ScheduleController.handleError(res, new Error('Données de validation invalides'), 'Données invalides.', 400, validationErrors);
        }

        try {
            const result = await ScheduleController.withConnection(async (connection) => {
                // Vérifier si un cours existe déjà pour ce créneau (day, time_slot_id)
                const [existing] = await connection.execute(
                    'SELECT id FROM SCHEDULE WHERE day = ? AND time_slot_id = ?',
                    [day, parseInt(time_slot_id)]
                );

                if (existing.length > 0) {
                    // Mettre à jour le cours existant
                    const courseId = existing[0].id;
                    await connection.execute(
                        'UPDATE SCHEDULE SET subject = ?, class_id = ?, room = ?, notes = ? WHERE id = ?',
                        [subject.trim(), parseInt(classId), room.trim(), notes || null, courseId]
                    );

                    // Récupérer l'emploi du temps mis à jour
                    const updatedSchedule = await ScheduleController.getScheduleData(connection);

                    return {
                        type: 'updated',
                        id: courseId,
                        schedule: updatedSchedule
                    };
                } else {
                    // Insérer un nouveau cours
                    const [insertResult] = await connection.execute(
                        'INSERT INTO SCHEDULE (day, time_slot_id, subject, class_id, room, notes) VALUES (?, ?, ?, ?, ?, ?)',
                        [day, parseInt(time_slot_id), subject.trim(), parseInt(classId), room.trim(), notes || null]
                    );

                    // Récupérer l'emploi du temps mis à jour
                    const updatedSchedule = await ScheduleController.getScheduleData(connection);

                    return {
                        type: 'created',
                        id: insertResult.insertId,
                        schedule: updatedSchedule
                    };
                }
            });

            res.status(result.type === 'created' ? 201 : 200).json({
                success: true,
                message: `Cours ${result.type === 'created' ? 'créé' : 'mis à jour'} avec succès.`,
                data: {
                    course: { id: result.id, day, time_slot_id, subject, classId, room, notes },
                    schedule: result.schedule // 🎯 Emploi du temps complet mis à jour
                },
                count: Object.keys(result.schedule).length
            });

        } catch (error) {
            // Gérer les erreurs spécifiques comme les contraintes d'unicité, etc.
            if (error.code === 'ER_DUP_ENTRY') {
                return ScheduleController.handleError(res, error, 'Un cours existe déjà pour ce créneau.', 409);
            }
            if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_PARENT_2') {
                return ScheduleController.handleError(res, error, 'Classe ou créneau horaire inexistant.', 400, {
                    class_id: 'Classe ou créneau horaire invalide.'
                });
            }
            ScheduleController.handleError(res, error, 'Erreur lors de la sauvegarde du cours.');
        }
    }

    /**
     * Supprime un cours de l'emploi du temps.
     * @param {Request} req - L'objet requête Express (contient req.params.day et req.params.time_slot_id).
     * @param {Response} res - L'objet réponse Express.
     */
    static async deleteCourse(req, res) {
        const { day, time_slot_id } = req.params;

        if (!day || !time_slot_id || isNaN(parseInt(time_slot_id))) {
            return ScheduleController.handleError(res, new Error('Paramètres de suppression invalides'), 'Paramètres de suppression invalides.', 400);
        }

        try {
            const result = await ScheduleController.withConnection(async (connection) => {
                const [deleteResult] = await connection.execute(
                    'DELETE FROM SCHEDULE WHERE day = ? AND time_slot_id = ?',
                    [day, parseInt(time_slot_id)]
                );

                if (deleteResult.affectedRows === 0) {
                    return { deleted: false, schedule: null };
                }

                // Récupérer l'emploi du temps mis à jour après suppression
                const updatedSchedule = await ScheduleController.getScheduleData(connection);

                return {
                    deleted: true,
                    affectedRows: deleteResult.affectedRows,
                    schedule: updatedSchedule
                };
            });

            if (!result.deleted) {
                return ScheduleController.handleError(res, new Error('Cours non trouvé'), 'Cours non trouvé pour suppression.', 404);
            }

            res.json({
                success: true,
                message: 'Cours supprimé avec succès.',
                data: {
                    schedule: result.schedule, // 🎯 Emploi du temps complet mis à jour
                    deletedCourse: { day, time_slot_id }
                },
                count: Object.keys(result.schedule).length
            });

        } catch (error) {
            console.error("DÉTAIL ERREUR DELETE COURSE:", error);
            ScheduleController.handleError(res, error, 'Erreur lors de la suppression du cours.');
        }
    }
}

module.exports = ScheduleController;
