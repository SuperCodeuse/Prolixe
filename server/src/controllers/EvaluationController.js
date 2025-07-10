// server/src/controllers/EvaluationController.js

const db = require('../../config/database');

exports.getEvaluations = async (req, res) => {
    try {
        const [evaluations] = await db.query(`
            SELECT e.id, e.name, e.evaluation_date, e.school_year, c.name as class_name, c.id as class_id
            FROM evaluations e
            JOIN class c ON e.class_id = c.id
            ORDER BY e.school_year DESC, e.evaluation_date DESC
        `);
        res.json({ success: true, data: evaluations });
    } catch (error) {
        console.error("Erreur dans getEvaluations:", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

exports.getEvaluationById = async (req, res) => {
    const { id } = req.params;
    try {
        const [evaluationResult] = await db.query('SELECT * FROM evaluations WHERE id = ?', [id]);
        const evaluation = evaluationResult[0];

        if (!evaluation) {
            return res.status(404).json({ success: false, message: "Évaluation non trouvée." });
        }

        const [criteria] = await db.query('SELECT id, label, max_score FROM evaluation_criteria WHERE evaluation_id = ? ORDER BY id', [id]);

        res.json({ success: true, data: { ...evaluation, criteria } });
    } catch (error) {
        console.error("Erreur dans getEvaluationById:", error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

exports.createEvaluation = async (req, res) => {
    const { name, class_id, school_year, date, criteria } = req.body;

    if (!name || !class_id || !school_year || !date || !Array.isArray(criteria) || criteria.length === 0) {
        return res.status(400).json({ success: false, message: "Les champs nom, classe, année scolaire, date et au moins un critère sont requis." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [evalResult] = await connection.query(
            'INSERT INTO evaluations (name, class_id, school_year, evaluation_date) VALUES (?, ?, ?, ?)',
            [name, class_id, school_year, date]
        );
        const evaluationId = evalResult.insertId;

        for (const criterion of criteria) {
            if (!criterion.label || criterion.max_score == null) {
                throw new Error("Chaque critère doit avoir un label et un score maximum.");
            }
            await connection.query(
                'INSERT INTO evaluation_criteria (evaluation_id, label, max_score) VALUES (?, ?, ?)',
                [evaluationId, criterion.label, criterion.max_score]
            );
        }

        await connection.commit();

        const [newEvaluation] = await connection.query(
            'SELECT e.id, e.name, e.evaluation_date, c.name as class_name FROM evaluations e JOIN class c ON e.class_id = c.id WHERE e.id = ?',
            [evaluationId]
        );

        res.status(201).json({ success: true, message: "Évaluation créée avec succès.", data: newEvaluation[0] });
    } catch (error) {
        await connection.rollback();
        console.error("Erreur dans createEvaluation:", error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    } finally {
        connection.release();
    }
};

// Obtenir les détails complets d'une évaluation pour la grille de correction
exports.getEvaluationForGrading = async (req, res) => {
    const { id } = req.params;
    try {
        const [evaluationResult] = await db.query('SELECT e.*, c.name as class_name FROM evaluations e JOIN class c ON e.class_id = c.id WHERE e.id = ?', [id]);
        const evaluation = evaluationResult[0];

        if (!evaluation) {
            return res.status(404).json({ message: "Évaluation non trouvée." });
        }

        const [criteria] = await db.query('SELECT * FROM evaluation_criteria WHERE evaluation_id = ? ORDER BY id', [id]);
        const [students] = await db.query('SELECT * FROM students WHERE class_id = ? AND school_year = ? ORDER BY lastname, firstname', [evaluation.class_id, evaluation.school_year]);

        // MODIFIÉ : On récupère aussi les commentaires
        const [grades] = await db.query(
            `SELECT sg.student_id, sg.criterion_id, sg.score, sg.comment
             FROM student_grades sg
             JOIN evaluation_criteria ec ON sg.criterion_id = ec.id
             WHERE ec.evaluation_id = ?`,
            [id]
        );

        res.json({ success: true, data: { evaluation, criteria, students, grades } });
    } catch (error) {
        console.error("Erreur dans getEvaluationForGrading:", error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

// Sauvegarder/Mettre à jour les notes
exports.saveGrades = async (req, res) => {
    const { evaluationId } = req.params;
    const { grades } = req.body;

    if (!grades || !Array.isArray(grades)) {
        return res.status(400).json({ message: "Le format des notes est incorrect." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const grade of grades) {
            // MODIFIÉ : La requête gère maintenant la colonne `comment`
            await connection.query(
                `INSERT INTO student_grades (student_id, criterion_id, score, comment)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE score = VALUES(score), comment = VALUES(comment)`,
                [grade.student_id, grade.criterion_id, grade.score, grade.comment || null]
            );
        }

        await connection.commit();
        res.status(200).json({ message: "Notes sauvegardées avec succès." });
    } catch (error) {
        await connection.rollback();
        console.error("Erreur dans saveGrades:", error);
        res.status(500).json({ message: "Erreur lors de la sauvegarde", error: error.message });
    } finally {
        connection.release();
    }
};

exports.updateEvaluation = async (req, res) => {
    const { id } = req.params;
    const { name, date, criteria } = req.body;

    if (!name || !date || !Array.isArray(criteria)) {
        return res.status(400).json({ success: false, message: "Les champs nom, date et critères sont requis." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            'UPDATE evaluations SET name = ?, evaluation_date = ? WHERE id = ?',
            [name, date, id]
        );

        await connection.query('DELETE FROM evaluation_criteria WHERE evaluation_id = ?', [id]);

        for (const criterion of criteria) {
            if (!criterion.label || criterion.max_score == null) {
                throw new Error("Chaque critère doit avoir un label et un score maximum.");
            }
            await connection.query(
                'INSERT INTO evaluation_criteria (evaluation_id, label, max_score) VALUES (?, ?, ?)',
                [id, criterion.label, criterion.max_score]
            );
        }

        await connection.commit();

        const [updatedEvaluation] = await connection.query(
            'SELECT e.id, e.name, e.evaluation_date, e.school_year, c.name as class_name FROM evaluations e JOIN class c ON e.class_id = c.id WHERE e.id = ?',
            [id]
        );

        res.status(200).json({ success: true, message: "Évaluation mise à jour.", data: updatedEvaluation[0] });

    } catch (error) {
        await connection.rollback();
        console.error("Erreur dans updateEvaluation:", error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteEvaluation = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM evaluations WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Évaluation supprimée avec succès.' });
    } catch (error) {
        console.error("Erreur dans deleteEvaluation:", error);
        res.status(500).json({ success: false, message: "Erreur lors de la suppression de l'évaluation.", error: error.message });
    }
};

exports.getEvaluationTemplates = async (req, res) => {
    const { school_year } = req.params;
    if (!school_year) {
        return res.status(400).json({ success: false, message: "L'année scolaire est requise." });
    }
    try {
        const query = `
            SELECT id, name, school_year
            FROM evaluations
            WHERE school_year != ?
            ORDER BY school_year DESC, name ASC;
        `;
        const [templates] = await db.query(query, [school_year]);
        res.json({ success: true, data: templates });
    } catch (error) {
        console.error("Erreur dans getEvaluationTemplates:", error);
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};
