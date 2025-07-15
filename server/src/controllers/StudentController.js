const pool = require('../../config/database');

class StudentController {
    /**
     * Récupère les élèves d'une classe pour une année scolaire donnée.
     * Attend maintenant `school_year_id` en paramètre de requête.
     */
    static async getStudentsByClass(req, res) {
        const { classId } = req.params;
        // On récupère maintenant l'ID de l'année scolaire, pas son nom.
        const { school_year_id } = req.query;

        if (!school_year_id) {
            // Le message d'erreur est mis à jour pour plus de clarté.
            return res.status(400).json({ success: false, message: "L'ID de l'année scolaire (school_year_id) est requis." });
        }

        try {
            // La requête SQL est mise à jour pour filtrer sur `school_year_id`.
            const [rows] = await pool.execute(
                'SELECT * FROM STUDENTS WHERE class_id = ? AND school_year_id = ? ORDER BY lastname, firstname',
                [classId, school_year_id]
            );journal
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error(error); // Il est bon de logger l'erreur côté serveur.
            res.status(500).json({ success: false, message: 'Erreur lors de la récupération des élèves.' });
        }
    }

    /**
     * Crée un nouvel élève.
     * Attend maintenant `school_year_id` dans le corps de la requête.
     */
    static async createStudent(req, res) {
        // On attend `school_year_id` au lieu de `school_year`.
        const { class_id, firstname, lastname, school_year_id } = req.body;

        if (!class_id || !firstname || !lastname || !school_year_id) {
            return res.status(400).json({ success: false, message: 'Tous les champs (class_id, firstname, lastname, school_year_id) sont requis.' });
        }
        try {
            // La requête d'insertion est mise à jour pour utiliser la colonne `school_year_id`.
            const [result] = await pool.execute(
                'INSERT INTO STUDENTS (class_id, firstname, lastname, school_year_id) VALUES (?, ?, ?, ?)',
                [class_id, firstname, lastname, school_year_id]
            );
            res.status(201).json({ success: true, message: 'Élève ajouté.', data: { id: result.insertId, ...req.body } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'élève.' });
        }
    }

    /**
     * Met à jour un élève.
     * Cette fonction ne modifiait pas l'année scolaire, donc elle reste fonctionnelle.
     * Si vous souhaitez permettre la modification de l'année scolaire d'un élève,
     * il faudra ajouter `school_year_id` aux champs à mettre à jour.
     */
    static async updateStudent(req, res) {
        const { id } = req.params;
        const { firstname, lastname, class_id } = req.body;
        try {
            const [result] = await pool.execute(
                'UPDATE STUDENTS SET firstname = ?, lastname = ?, class_id = ? WHERE id = ?',
                [firstname, lastname, class_id, id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Élève non trouvé.' });
            }
            res.json({ success: true, message: 'Élève mis à jour.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'élève.' });
        }
    }

    /**
     * Supprime un élève.
     * Cette fonction n'est pas affectée par le changement de schéma.
     */
    static async deleteStudent(req, res) {
        const { id } = req.params;
        try {
            const [result] = await pool.execute('DELETE FROM STUDENTS WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Élève non trouvé.' });
            }
            res.json({ success: true, message: 'Élève supprimé.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'élève.' });
        }
    }
}

module.exports = StudentController;
