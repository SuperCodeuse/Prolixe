const pool = require('../../config/database');

class ClassController {
    /**
     * Méthode utilitaire pour acquérir et libérer une connexion de pool.
     * Gère automatiquement la connexion et la libération.
     * @param {function(Connection): Promise<any>} operation - Fonction asynchrone qui prend la connexion en paramètre.
     * @returns {Promise<any>} Le résultat de l'opération.
     */
    static async withConnection(operation) {
        let connection;
        try {
            connection = await pool.getConnection();
            return await operation(connection);
        } catch (error) {
            console.error('Erreur SQL dans withConnection:', error.message);
            throw error;
        } finally {
            if (connection) {
                connection.release();
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
        console.error(`❌ Erreur dans ClassController: ${defaultMessage}`, error);

        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            error: errorMessage,
            errors: customErrors
        });
    }

    /**
     * Valide les données d'entrée pour la création ou la mise à jour d'une classe.
     * @param {object} data - Les données de la classe (name, students, level).
     * @param {boolean} isUpdate - Indique si la validation est pour une mise à jour.
     * @returns {object} Un objet contenant les erreurs de validation par champ.
     */
    static validateClassData(data, isUpdate = false) {
        const errors = {};
        const validLevels = [3, 4, 5, 6];

        if (!isUpdate || data.name !== undefined) {
            if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
                errors.name = 'Le nom de la classe est requis.';
            } else if (data.name.trim().length < 2) {
                errors.name = 'Le nom de la classe doit contenir au moins 2 caractères.';
            } else if (data.name.trim().length > 100) {
                errors.name = 'Le nom de la classe ne peut pas dépasser 100 caractères.';
            }
        }

        if (!isUpdate || data.journal_id !== undefined) {
            if (!data.journal_id || isNaN(parseInt(data.journal_id))) {
                errors.journal_id = "L'année scolaire est requise.";
            }
        }

        if (!isUpdate || data.students !== undefined) {
            const studentsNum = parseInt(data.students);
            if (isNaN(studentsNum) || studentsNum < 0) {
                errors.students = "Le nombre d'étudiants doit être un nombre entier positif ou zéro.";
            } else if (studentsNum > 1000) {
                errors.students = "Le nombre d'étudiants ne peut pas dépasser 1000.";
            }
        }

        if (!isUpdate || data.level !== undefined) {
            const levelNum = parseInt(data.level);
            if (isNaN(levelNum) || !validLevels.includes(levelNum)) {
                errors.level = `Le niveau est requis et doit être l'une des valeurs suivantes : ${validLevels.join(', ')}.`;
            }
        }

        return errors;
    }

    /**
     * Récupère toutes les classes pour un journal donné, appartenant à l'utilisateur.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getAllClasses(req, res) {
        const { journal_id } = req.query;
        const userId = req.user.id;

        if (!journal_id) {
            return ClassController.handleError(res, new Error('ID du journal manquant'), 'Un ID de journal est requis.', 400);
        }

        try {
            const data = await ClassController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT id, name, students, level
                    FROM CLASS
                    WHERE journal_id = ? AND user_id = ?
                    ORDER BY name ASC
                `, [journal_id, userId]);
                return rows;
            });

            res.json({
                success: true,
                data: data,
                count: data.length,
                message: data.length === 0 ? 'Aucune classe trouvée pour ce journal.' : `${data.length} classe(s) récupérée(s).`
            });
        } catch (error) {
            ClassController.handleError(res, error, 'Erreur lors de la récupération des classes.');
        }
    }

    /**
     * Récupère une classe par son ID.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getClassById(req, res) {
        const { id } = req.params;
        const userId = req.user.id;

        if (!id || isNaN(parseInt(id))) {
            return ClassController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        try {
            const classData = await ClassController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT id, name, students, level FROM CLASS WHERE id = ? AND user_id = ?
                `, [parseInt(id), userId]);
                return rows[0] || null;
            });

            if (!classData) {
                return ClassController.handleError(res, new Error('Classe non trouvée'), 'Classe non trouvée ou non autorisée.', 404);
            }

            res.json({
                success: true,
                data: classData,
                message: 'Classe récupérée avec succès.'
            });
        } catch (error) {
            ClassController.handleError(res, error, 'Erreur lors de la récupération de la classe.');
        }
    }

    /**
     * Crée une nouvelle classe.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async createClass(req, res) {
        const { name, students, level, journal_id, subject } = req.body;
        const userId = req.user.id;

        const validationErrors = ClassController.validateClassData({ name, students, level, journal_id, subject });

        if (Object.keys(validationErrors).length > 0) {
            return ClassController.handleError(res, new Error('Données invalides'), 'Données invalides.', 400, validationErrors);
        }

        try {
            const newClass = await ClassController.withConnection(async (connection) => {
                const [existing] = await connection.execute(
                    'SELECT id FROM CLASS WHERE LOWER(name) = LOWER(?) AND journal_id = ? AND user_id = ?',
                    [name.trim(), journal_id, userId]
                );

                if (existing.length > 0) {
                    const err = new Error('Une classe avec ce nom existe déjà pour ce journal.');
                    err.name = 'DUPLICATE_NAME';
                    throw err;
                }



                const [result] = await connection.execute(
                    'INSERT INTO CLASS (name, students, level, journal_id, user_id) VALUES (?, ?, ?, ?, ?)',
                    [name.trim(), parseInt(students), parseInt(level), parseInt(journal_id), userId]
                );

                const [newClassData] = await connection.execute(
                    'SELECT id, name, students, level FROM CLASS WHERE id = ?',
                    [result.insertId]
                );

                return newClassData[0];
            });

            res.status(201).json({
                success: true,
                data: newClass,
                message: 'Classe créée avec succès.'
            });

        } catch (error) {
            if (error.name === 'DUPLICATE_NAME') {
                return ClassController.handleError(res, error, error.message, 409, { name: error.message });
            }
            ClassController.handleError(res, error, 'Erreur lors de la création de la classe.');
        }
    }

    /**
     * Met à jour une classe existante par son ID.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async updateClass(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user.id;

        if (!id || isNaN(parseInt(id))) {
            return ClassController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        const validationErrors = ClassController.validateClassData(updateData, true);
        if (Object.keys(validationErrors).length > 0) {
            return ClassController.handleError(res, new Error('Données de validation invalides'), 'Données invalides pour la mise à jour.', 400, validationErrors);
        }

        try {
            const updatedClass = await ClassController.withConnection(async (connection) => {
                const [existingRows] = await connection.execute(
                    'SELECT id, journal_id FROM CLASS WHERE id = ? AND user_id = ?',
                    [parseInt(id), userId]
                );

                if (existingRows.length === 0) {
                    const err = new Error('Classe non trouvée ou non autorisée.');
                    err.name = 'CLASS_NOT_FOUND';
                    throw err;
                }
                const existingClass = existingRows[0];

                const fieldsToUpdate = [];
                const values = [];

                if (updateData.name !== undefined) {
                    const trimmedName = updateData.name.trim();
                    const journalIdForCheck = updateData.journal_id || existingClass.journal_id;

                    const [duplicate] = await connection.execute(
                        'SELECT id FROM CLASS WHERE LOWER(name) = LOWER(?) AND id != ? AND journal_id = ? AND user_id = ?',
                        [trimmedName, parseInt(id), journalIdForCheck, userId]
                    );

                    if (duplicate.length > 0) {
                        const err = new Error('Une autre classe avec ce nom existe déjà pour ce journal.');
                        err.name = 'DUPLICATE_NAME';
                        throw err;
                    }
                    fieldsToUpdate.push('name = ?');
                    values.push(trimmedName);
                }

                if (updateData.students !== undefined) {
                    fieldsToUpdate.push('students = ?');
                    values.push(parseInt(updateData.students));
                }

                if (updateData.journal_id !== undefined) {
                    fieldsToUpdate.push('journal_id = ?');
                    values.push(parseInt(updateData.journal_id));
                }

                if (updateData.level !== undefined) {
                    fieldsToUpdate.push('level = ?');
                    values.push(parseInt(updateData.level));
                }

                if (updateData.subject !== undefined) {
                    fieldsToUpdate.push('subject = ?');
                    values.push(updateData.subject);
                }

                if (fieldsToUpdate.length === 0) {
                    const err = new Error('Aucune donnée à mettre à jour.');
                    err.name = 'NO_UPDATE_DATA';
                    throw err;
                }

                values.push(parseInt(id), userId);

                await connection.execute(
                    `UPDATE CLASS SET ${fieldsToUpdate.join(', ')} WHERE id = ? AND user_id = ?`,
                    values
                );

                const [updatedData] = await connection.execute(
                    'SELECT id, name, students, level, subject FROM CLASS WHERE id = ?',
                    [parseInt(id)]
                );

                return updatedData[0];
            });

            res.json({
                success: true,
                data: updatedClass,
                message: 'Classe mise à jour avec succès.'
            });

        } catch (error) {
            if (error.name === 'CLASS_NOT_FOUND') {
                return ClassController.handleError(res, error, 'Classe non trouvée.', 404);
            }
            if (error.name === 'DUPLICATE_NAME') {
                return ClassController.handleError(res, error, error.message, 409, { name: error.message });
            }
            if (error.name === 'NO_UPDATE_DATA') {
                return ClassController.handleError(res, error, 'Aucune donnée à mettre à jour.', 400);
            }
            ClassController.handleError(res, error, 'Erreur lors de la mise à jour de la classe.');
        }
    }

    /**
     * Supprime une classe par son ID.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async deleteClass(req, res) {
        const { id } = req.params;
        const userId = req.user.id;

        if (!id || isNaN(parseInt(id))) {
            return ClassController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        try {
            const deletedClassInfo = await ClassController.withConnection(async (connection) => {
                const [classToDelete] = await connection.execute(
                    'SELECT id, name FROM CLASS WHERE id = ? AND user_id = ?',
                    [parseInt(id), userId]
                );

                if (classToDelete.length === 0) {
                    const err = new Error('Classe non trouvée ou non autorisée.');
                    err.name = 'CLASS_NOT_FOUND';
                    throw err;
                }

                await connection.execute('DELETE FROM CLASS WHERE id = ? AND user_id = ?', [parseInt(id), userId]);
                return classToDelete[0];
            });

            res.json({
                success: true,
                message: 'Classe supprimée avec succès.',
                data: {
                    id: deletedClassInfo.id,
                    name: deletedClassInfo.name
                }
            });

        } catch (error) {
            if (error.name === 'CLASS_NOT_FOUND') {
                return ClassController.handleError(res, error, 'Classe non trouvée.', 404);
            }
            ClassController.handleError(res, error, 'Erreur lors de la suppression de la classe.');
        }
    }

    /**
     * Récupère les statistiques agrégées des classes de l'utilisateur.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getClassesStats(req, res) {
        const userId = req.user.id;
        try {
            const stats = await ClassController.withConnection(async (connection) => {
                const [result] = await connection.execute(`
                    SELECT
                        COUNT(*) as total_classes,
                        SUM(students) as total_students,
                        AVG(students) as avg_students_per_class
                    FROM CLASS
                    WHERE user_id = ?
                `, [userId]);
                return result[0];
            });

            res.json({
                success: true,
                data: {
                    totalClasses: stats.total_classes || 0,
                    totalStudents: stats.total_students || 0,
                    averageStudentsPerClass: Math.round(stats.avg_students_per_class || 0)
                },
                message: 'Statistiques récupérées avec succès.'
            });

        } catch (error) {
            ClassController.handleError(res, error, 'Erreur lors de la récupération des statistiques des classes.');
        }
    }
}

module.exports = ClassController;