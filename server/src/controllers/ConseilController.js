const pool = require('../../config/database');

class ConseilDeClasseController {
    /**
     * Méthode utilitaire pour acquérir et libérer une connexion de pool.
     */
    static async withConnection(operation) {
        let connection;
        try {
            connection = await pool.getConnection();
            return await operation(connection);
        } catch (error) {
            console.error('Erreur SQL dans withConnection:', error.message);
            throw error; // Propage l'erreur pour être gérée par handleError
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Gère et standardise les réponses d'erreur HTTP.
     */
    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500, customErrors = {}) {
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        console.error(`❌ Erreur dans ConseilDeClasseController: ${defaultMessage}`, error);

        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            errors: customErrors,
            error: errorMessage,
        });
    }

    /**
     * Valide les données d'entrée pour un avis du conseil de classe.
     * @param {object} data - Les données de l'avis (notes, decision).
     * @returns {object} Un objet contenant les erreurs de validation.
     */
    static validateConseilData(data) {
        const errors = {};
        const validDecisions = ['AO-A', 'AO-B', 'AO-C'];

        if (data.decision !== undefined && !validDecisions.includes(data.decision)) {
            errors.decision = `La décision doit être l'une des suivantes : ${validDecisions.join(', ')}.`;
        }

        if (data.notes !== undefined && typeof data.notes !== 'string') {
            errors.notes = 'Les notes doivent être une chaîne de caractères.';
        }

        return errors;
    }

    /**
     * Récupère tous les étudiants d'une classe avec leur avis de conseil de classe.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async getConseilDataForClass(req, res) {
        const { class_id } = req.params;

        if (!class_id || isNaN(parseInt(class_id))) {
            return ConseilDeClasseController.handleError(res, new Error('ID de classe invalide'), 'ID de classe invalide.', 400);
        }

        try {
            const data = await ConseilDeClasseController.withConnection(async (connection) => {
                const [rows] = await connection.execute(`
                    SELECT 
                        s.id, 
                        s.firstname, 
                        s.lastname,
                        cc.id as conseil_id,
                        cc.notes,
                        cc.decision
                    FROM STUDENTS s
                    LEFT JOIN CONSEIL_CLASS cc ON s.id = cc.student_id
                    WHERE s.class_id = ?
                    ORDER BY s.lastname ASC, s.firstname ASC
                `, [class_id]);

                return rows.map(student => ({
                    ...student,
                    notes: student.notes || '',
                    decision: student.decision || 'AO-A' // Décision par défaut
                }));
            });

            res.json({
                success: true,
                data: data,
                message: data.length > 0 ? `${data.length} élève(s) récupéré(s) pour la classe.` : 'Aucun élève trouvé pour cette classe.',
            });

        } catch (error) {
            ConseilDeClasseController.handleError(res, error, 'Erreur lors de la récupération des données du conseil de classe.');
        }
    }

    /**
     * Met à jour ou crée l'avis du conseil de classe pour un étudiant.
     * Utilise une requête "UPSERT" pour simplifier la logique.
     * @param {Request} req - L'objet requête Express.
     * @param {Response} res - L'objet réponse Express.
     */
    static async updateStudentConseil(req, res) {
        const { student_id } = req.params;
        const { notes, decision } = req.body;

        if (!student_id || isNaN(parseInt(student_id))) {
            return ConseilDeClasseController.handleError(res, new Error('ID étudiant invalide'), 'ID étudiant invalide.', 400);
        }

        const validationErrors = ConseilDeClasseController.validateConseilData({ notes, decision });
        if (Object.keys(validationErrors).length > 0) {
            return ConseilDeClasseController.handleError(res, new Error('Données invalides'), 'Données invalides.', 400, validationErrors);
        }

        try {
            const query = `
                INSERT INTO conseil_class (student_id, notes, decision)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    notes = VALUES(notes),
                    decision = VALUES(decision)
            `;

            await ConseilDeClasseController.withConnection(async (connection) => {
                await connection.execute(query, [student_id, notes, decision]);
            });

            res.status(200).json({
                success: true,
                message: 'Avis du conseil de classe sauvegardé avec succès.',
                data: { student_id, notes, decision }
            });

        } catch (error) {
            // Gère le cas où l'étudiant n'existerait pas (clé étrangère)
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return ConseilDeClasseController.handleError(res, error, 'L\'étudiant spécifié n\'existe pas.', 404);
            }
            ConseilDeClasseController.handleError(res, error, 'Erreur lors de la sauvegarde de l\'avis.');
        }
    }
}

module.exports = ConseilDeClasseController;