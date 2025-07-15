const pool = require('../../config/database');

class StudentController {
    // Re-using the utility methods for consistency
    static async withConnection(operation) {
        let connection;
        try {
            connection = await pool.getConnection();
            return await operation(connection);
        } catch (error) {
            console.error('SQL Error in StudentController:', error.message);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500) {
        console.error(`❌ Erreur dans StudentController: ${defaultMessage}`, error);
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        res.status(statusCode).json({ success: false, message: defaultMessage, error: errorMessage });
    }

    /**
     * Récupère les élèves d'une classe pour une année scolaire donnée.
     */
    static async getStudentsByClass(req, res) {
        const { classId } = req.params;
        const { journal_id } = req.query;

        if (!classId || !journal_id) {
            return StudentController.handleError(res, new Error("Paramètres manquants"), "L'ID de la classe et du journal sont requis.", 400);
        }

        try {
            const students = await StudentController.withConnection(async (connection) => {
                const [rows] = await connection.execute(
                    'SELECT * FROM STUDENTS WHERE class_id = ? AND journal_id = ? ORDER BY lastname, firstname',
                    [classId, journal_id]
                );
                return rows;
            });
            res.json({ success: true, data: students });
        } catch (error) {
            StudentController.handleError(res, error, 'Erreur lors de la récupération des élèves.');
        }
    }

    /**
     * Crée un nouvel élève lié à une classe et une année scolaire.
     */
    static async createStudent(req, res) {
        const { class_id, firstname, lastname, journal_id } = req.body;

        if (!class_id || !firstname || !lastname || !journal_id) {
            return StudentController.handleError(res, new Error("Champs manquants"), 'Tous les champs (class_id, firstname, lastname, journal_id) sont requis.', 400);
        }

        try {
            const newStudent = await StudentController.withConnection(async (connection) => {
                const [result] = await connection.execute(
                    'INSERT INTO STUDENTS (class_id, firstname, lastname, journal_id) VALUES (?, ?, ?, ?)',
                    [class_id, firstname.trim(), lastname.trim(), journal_id]
                );
                return { id: result.insertId, class_id, firstname, lastname, journal_id };
            });
            res.status(201).json({ success: true, message: 'Élève ajouté avec succès.', data: newStudent });
        } catch (error) {
            StudentController.handleError(res, error, 'Erreur lors de la création de l\'élève.');
        }
    }

    /**
     * Met à jour un élève. Peut changer son nom ou sa classe (au sein de la même année scolaire).
     */
    static async updateStudent(req, res) {
        const { id } = req.params;
        const { firstname, lastname, class_id } = req.body; // L'année scolaire d'un élève ne devrait pas changer.

        if (!firstname || !lastname || !class_id) {
            return StudentController.handleError(res, new Error("Champs manquants"), 'Les champs firstname, lastname et class_id sont requis.', 400);
        }

        try {
            const result = await StudentController.withConnection(async (connection) => {
                const [updateResult] = await connection.execute(
                    'UPDATE STUDENTS SET firstname = ?, lastname = ?, class_id = ? WHERE id = ?',
                    [firstname.trim(), lastname.trim(), class_id, id]
                );
                return updateResult;
            });

            if (result.affectedRows === 0) {
                return StudentController.handleError(res, new Error("Élève non trouvé"), 'Élève non trouvé.', 404);
            }
            res.json({ success: true, message: 'Élève mis à jour avec succès.' });
        } catch (error) {
            StudentController.handleError(res, error, 'Erreur lors de la mise à jour de l\'élève.');
        }
    }

    /**
     * Supprime un élève.
     */
    static async deleteStudent(req, res) {
        const { id } = req.params;

        try {
            const result = await StudentController.withConnection(async (connection) => {
                const [deleteResult] = await connection.execute('DELETE FROM STUDENTS WHERE id = ?', [id]);
                return deleteResult;
            });

            if (result.affectedRows === 0) {
                return StudentController.handleError(res, new Error("Élève non trouvé"), 'Élève non trouvé.', 404);
            }
            res.json({ success: true, message: 'Élève supprimé avec succès.' });
        } catch (error) {
            // Gérer les erreurs de clé étrangère si un élève est lié à d'autres tables (ex: notes)
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return StudentController.handleError(res, error, "Impossible de supprimer cet élève car il est lié à d'autres données (ex: des notes).", 409);
            }
            StudentController.handleError(res, error, 'Erreur lors de la suppression de l\'élève.');
        }
    }
}

module.exports = StudentController;