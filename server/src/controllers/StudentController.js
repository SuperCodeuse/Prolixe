const pool = require('../../config/database');

class StudentController {
    static async getStudentsByClass(req, res) {
        const { classId } = req.params;
        try {
            const [rows] = await pool.execute('SELECT * FROM students WHERE class_id = ? ORDER BY lastname, firstname', [classId]);
            res.json({ success: true, data: rows });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la récupération des élèves.' });
        }
    }

    static async createStudent(req, res) {
        const { class_id, firstname, lastname, school_year } = req.body;
        if (!class_id || !firstname || !lastname || !school_year) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
        }
        try {
            const [result] = await pool.execute(
                'INSERT INTO students (class_id, firstname, lastname, school_year) VALUES (?, ?, ?, ?)',
                [class_id, firstname, lastname, school_year]
            );
            res.status(201).json({ success: true, message: 'Élève ajouté.', data: { id: result.insertId, ...req.body } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la création de l\'élève.' });
        }
    }

    static async updateStudent(req, res) {
        const { id } = req.params;
        const { firstname, lastname, class_id } = req.body;
        try {
            const [result] = await pool.execute(
                'UPDATE students SET firstname = ?, lastname = ?, class_id = ? WHERE id = ?',
                [firstname, lastname, class_id, id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Élève non trouvé.' });
            }
            res.json({ success: true, message: 'Élève mis à jour.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de l\'élève.' });
        }
    }

    static async deleteStudent(req, res) {
        const { id } = req.params;
        try {
            const [result] = await pool.execute('DELETE FROM students WHERE id = ?', [id]);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Élève non trouvé.' });
            }
            res.json({ success: true, message: 'Élève supprimé.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Erreur lors de la suppression de l\'élève.' });
        }
    }
}

module.exports = StudentController;