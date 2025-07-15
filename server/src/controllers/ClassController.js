const mysql = require('mysql2/promise');
const pool = require('../../config/database');

class ClassController {
    /**
     * Méthode utilitaire pour acquérir et libérer une connexion de pool.
     * Gère automatiquement la connexion et la libération.
     * @param {function(Connection): Promise<any>} operation - Fonction asynchrone qui prend la connexion en paramètre.
     * @returns {Promise<any>} Le résultat de l'opération.
     * @throws {Error} Toute erreur survenant pendant l'opération ou l'acquisition/libération de la connexion.
     */
    static async withConnection(operation) {
        let connection;
        try {
            // Ici, 'pool' est maintenant l'instance directe du pool mysql2
            connection = await pool.getConnection(); // Ceci fonctionnera maintenant

            // Cette vérification est utile pour le débogage si le pool est mal configuré
            if (typeof connection.release !== 'function') {
                console.error("DEBUG: L'objet de connexion n'a pas la méthode .release(). Vérifiez la configuration du pool.");
                throw new Error("L'objet de connexion obtenu du pool n'est pas valide pour être relâché.");
            }
            return await operation(connection);
        } catch (error) {
            console.error('Erreur SQL dans withConnection:', error.message);
            throw error;
        } finally {
            if (connection) {
                // S'assurer que connection.release est bien une fonction avant de l'appeler
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
        console.error(`❌ Erreur dans ClassController: ${defaultMessage}`, error);

        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            error: errorMessage,
            errors: customErrors // Pour les erreurs de validation, etc.
        });
    }

    /**
     * Valide les données d'entrée pour la création ou la mise à jour d'une classe.
     * @param {object} data - Les données de la classe (name, students, subject, level).
     * @param {boolean} isUpdate - Indique si la validation est pour une mise à jour (certains champs peuvent être optionnels).
     * @returns {object} Un objet contenant les erreurs de validation par champ.
     */
    static validateClassData(data, isUpdate = false) {
        const errors = {};
        const validLevels = [3, 4, 5, 6]; // Niveaux autorisés

        // Validation du nom
        if (!isUpdate || data.name !== undefined) {
            if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
                errors.name = 'Le nom de la classe est requis.';
            } else if (data.name.trim().length < 2) {
                errors.name = 'Le nom de la classe doit contenir au moins 2 caractères.';
            } else if (data.name.trim().length > 100) {
                errors.name = 'Le nom de la classe ne peut pas dépasser 100 caractères.';
            }
        }

        // Validation du nombre d'étudiants
        if (!isUpdate || data.students !== undefined) {
            const studentsNum = parseInt(data.students);
            if (isNaN(studentsNum) || studentsNum < 0) { // On autorise 0 étudiants
                errors.students = "Le nombre d'étudiants doit être un nombre entier positif ou zéro.";
            } else if (studentsNum > 1000) { // Limite haute
                errors.students = "Le nombre d'étudiants ne peut pas dépasser 1000.";
            }
        }

        // Validation de la matière
        if (!isUpdate || data.subject !== undefined) {
            if (!data.subject || typeof data.subject !== 'string' || !data.subject.trim()) {
                errors.subject = 'La matière est requise.';
            } else if (data.subject.trim().length > 100) {
                errors.subject = 'La matière ne peut pas dépasser 100 caractères.';
            }
        }

        // NOUVEAU: Validation du niveau
        if (!isUpdate || data.level !== undefined) {
            const levelNum = parseInt(data.level);
            if (isNaN(levelNum) || !validLevels.includes(levelNum)) {
                errors.level = `Le niveau est requis et doit être l'une des valeurs suivantes : ${validLevels.join(', ')}.`;
            }
        }

        return errors;
    }

    /**
     * Récupère toutes les classes.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getAllClasses(req, res) {
        try {
            const data = await ClassController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT
                        id,
                        name,
                        students,
                        level,
                        lesson AS subject
                    FROM CLASS
                    ORDER BY name ASC
                `);
                return rows;
            });

            res.json({
                success: true,
                data: data,
                count: data.length,
                message: data.length === 0 ? 'Aucune classe trouvée.' : `${data.length} classe(s) récupérée(s).`
            });
        } catch (error) {
            ClassController.handleError(res, error, 'Erreur lors de la récupération des classes.');
        }
    }

    /**
     * Récupère une classe par son ID.
     * @param {Request} req - L'objet requête Express (contient req.params.id).
     * @param {Response} res - L'objet réponse Express.
     */
    static async getClassById(req, res) {
        const { id } = req.params;

        // Validation de l'ID
        if (!id || isNaN(parseInt(id))) {
            return ClassController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        try {
            const classData = await ClassController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT
                        id,
                        name,
                        students,
                        level,          -- Inclure 'level'
                        lesson AS subject
                    FROM CLASS
                    WHERE id = ?
                `, [parseInt(id)]);
                return rows[0] || null;
            });

            if (!classData) {
                return ClassController.handleError(res, new Error('Classe non trouvée'), 'Classe non trouvée.', 404);
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
     * @param {Request} req - L'objet requête Express (contient req.body).
     * @param {Response} res - L'objet réponse Express.
     */
    static async createClass(req, res) {
        // Inclure 'level' dans la déstructuration
        const { name, students, subject, level } = req.body;

        // Validation des données (maintenant incluant 'level')
        const validationErrors = ClassController.validateClassData({ name, students, subject, level });
        if (Object.keys(validationErrors).length > 0) {
            return ClassController.handleError(res, new Error('Données de validation invalides'), 'Données invalides.', 400, validationErrors);
        }

        try {
            const newClass = await ClassController.withConnection(async (connection) => {
                // Vérifier l'unicité du nom
                const [existing] = await connection.execute(
                    'SELECT id FROM CLASS WHERE LOWER(name) = LOWER(?)',
                    [name.trim()]
                );

                if (existing.length > 0) {
                    const err = new Error('Une classe avec ce nom existe déjà.');
                    err.name = 'DUPLICATE_NAME'; // Nommer l'erreur pour la gestion spécifique
                    throw err;
                }

                const [result] = await connection.execute(
                    'INSERT INTO CLASS (name, students, lesson, level) VALUES (?, ?, ?, ?)',
                    [name.trim(), parseInt(students), subject.trim(), parseInt(level)]
                );

                const [newClassData] = await connection.execute(
                    'SELECT id, name, students, lesson AS subject, level FROM CLASS WHERE id = ?',
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
     * @param {Request} req - L'objet requête Express (contient req.params.id et req.body).
     * @param {Response} res - L'objet réponse Express.
     */
    static async updateClass(req, res) {
        const { id } = req.params;
        const updateData = req.body; // Peut contenir name, students, subject, level

        // Validation de l'ID
        if (!id || isNaN(parseInt(id))) {
            return ClassController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        // Validation des données (mode update, les champs sont optionnels)
        // Passer toutes les données reçues, la validation s'occupera des champs undefined
        const validationErrors = ClassController.validateClassData(updateData, true);
        if (Object.keys(validationErrors).length > 0) {
            return ClassController.handleError(res, new Error('Données de validation invalides'), 'Données invalides pour la mise à jour.', 400, validationErrors);
        }

        try {
            const updatedClass = await ClassController.withConnection(async (connection) => {
                // Vérifier que la classe existe
                const [existing] = await connection.execute(
                    'SELECT id, name, level, students FROM CLASS WHERE id = ?',
                    [parseInt(id)]
                );

                if (existing.length === 0) {
                    const err = new Error('Classe non trouvée.');
                    err.name = 'CLASS_NOT_FOUND';
                    throw err;
                }

                const fieldsToUpdate = [];
                const values = [];

                if (updateData.name !== undefined) {
                    const trimmedName = updateData.name.trim();
                    // Vérifier l'unicité du nom (sauf pour la classe actuelle)
                    const [duplicate] = await connection.execute(
                        'SELECT id FROM CLASS WHERE LOWER(name) = LOWER(?) AND id != ?',
                        [trimmedName, parseInt(id)]
                    );

                    if (duplicate.length > 0) {
                        const err = new Error('Une autre classe avec ce nom existe déjà.');
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

                if (updateData.subject !== undefined) {
                    fieldsToUpdate.push('lesson = ?'); // 'lesson' est le nom de la colonne de la DB pour la matière
                    values.push(updateData.subject.trim());
                }

                // NOUVEAU: Ajouter la mise à jour du level
                if (updateData.level !== undefined) {
                    fieldsToUpdate.push('level = ?');
                    values.push(parseInt(updateData.level));
                }

                if (fieldsToUpdate.length === 0) {
                    const err = new Error('Aucune donnée à mettre à jour.');
                    err.name = 'NO_UPDATE_DATA';
                    throw err;
                }

                // Ajouter l'ID à la fin des valeurs pour la clause WHERE
                values.push(parseInt(id));

                await connection.execute(
                    `UPDATE CLASS SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
                    values
                );

                // Récupérer la classe mise à jour pour renvoyer les données complètes
                const [updatedData] = await connection.execute(
                    'SELECT id, name, students, lesson AS subject, level FROM CLASS WHERE id = ?',
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
     * @param {Request} req - L'objet requête Express (contient req.params.id).
     * @param {Response} res - L'objet réponse Express.
     */
    static async deleteClass(req, res) {
        const { id } = req.params;

        // Validation de l'ID
        if (!id || isNaN(parseInt(id))) {
            return ClassController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        try {
            const deletedClassInfo = await ClassController.withConnection(async (connection) => {
                // Récupérer les infos de la classe avant suppression
                const [classToDelete] = await connection.execute(
                    'SELECT id, name FROM CLASS WHERE id = ?',
                    [parseInt(id)]
                );

                if (classToDelete.length === 0) {
                    const err = new Error('Classe non trouvée.');
                    err.name = 'CLASS_NOT_FOUND';
                    throw err;
                }

                await connection.execute('DELETE FROM CLASS WHERE id = ?', [parseInt(id)]);
                return classToDelete[0]; // Retourne les infos de la classe supprimée
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
            if (error.name === 'CLASS_HAS_DEPENDENCIES') {
                // Si vous avez des contraintes de clé étrangère, cette erreur pourrait être déclenchée.
                // Assurez-vous que votre base de données gère bien la suppression en cascade si c'est ce que vous voulez,
                // ou gérez l'erreur de contrainte d'intégrité ici.
                return ClassController.handleError(res, error, error.message, 409);
            }
            ClassController.handleError(res, error, 'Erreur lors de la suppression de la classe.');
        }
    }

    /**
     * Récupère les statistiques agrégées des classes.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getClassesStats(req, res) {
        try {
            const stats = await ClassController.withConnection(async (connection) => {
                const [result] = await connection.execute(`
                    SELECT
                        COUNT(*) as total_classes,
                        SUM(students) as total_students,
                        AVG(students) as avg_students_per_class,
                        COUNT(DISTINCT lesson) as unique_subjects
                        -- Ajoutez SUM(CASE WHEN level = X THEN 1 ELSE 0 END) pour des stats par niveau si besoin
                    FROM CLASS
                `);
                return result[0];
            });

            res.json({
                success: true,
                data: {
                    totalClasses: stats.total_classes || 0,
                    totalStudents: stats.total_students || 0,
                    averageStudentsPerClass: Math.round(stats.avg_students_per_class || 0),
                    uniqueSubjects: stats.unique_subjects || 0
                },
                message: 'Statistiques récupérées avec succès.'
            });

        } catch (error) {
            ClassController.handleError(res, error, 'Erreur lors de la récupération des statistiques des classes.');
        }
    }
}

module.exports = ClassController;