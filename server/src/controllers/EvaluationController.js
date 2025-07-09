const db = require('../../config/database'); // Assurez-vous que le chemin vers votre connexion db est correct

// Obtenir les détails complets d'une évaluation pour la grille de correction
exports.getEvaluationForGrading = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Récupérer l'évaluation
        const [evaluationResult] = await db.query('SELECT * FROM evaluations WHERE id = ?', [id]);
        const evaluation = evaluationResult[0];

        if (!evaluation) {
            return res.status(404).json({ message: "Évaluation non trouvée." });
        }

        // 2. Récupérer les critères de l'évaluation
        const [criteria] = await db.query('SELECT * FROM evaluation_criteria WHERE evaluation_id = ? ORDER BY id', [id]);

        // 3. Récupérer les élèves de la classe ET de la bonne année scolaire
        const [students] = await db.query(
            'SELECT * FROM students WHERE class_id = ? AND school_year = ? ORDER BY lastname, firstname',
            [evaluation.class_id, evaluation.school_year]
        );

        // 4. Récupérer les notes déjà existantes pour cette évaluation
        const [grades] = await db.query(
            `SELECT sg.student_id, sg.criterion_id, sg.score
             FROM student_grades sg
             JOIN evaluation_criteria ec ON sg.criterion_id = ec.id
             WHERE ec.evaluation_id = ?`,
            [id]
        );

        res.json({ evaluation, criteria, students, grades });
    } catch (error) {
        console.error("Erreur dans getEvaluationForGrading:", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Sauvegarder/Mettre à jour les notes
exports.saveGrades = async (req, res) => {
    const { evaluationId } = req.params;
    const { grades } = req.body; // Le front-end enverra un tableau de notes { student_id, criterion_id, score }

    if (!grades || !Array.isArray(grades)) {
        return res.status(400).json({ message: "Le format des notes est incorrect." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const grade of grades) {
            // On utilise INSERT ... ON DUPLICATE KEY UPDATE pour insérer ou mettre à jour en une seule requête
            await connection.query(
                `INSERT INTO student_grades (student_id, criterion_id, score)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE score = VALUES(score)`,
                [grade.student_id, grade.criterion_id, grade.score]
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
