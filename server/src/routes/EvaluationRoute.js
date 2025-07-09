// Fichier: src/routes/EvaluationRoute.js

const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/EvaluationController');

// Route pour récupérer toutes les données nécessaires à l'affichage de la grille
router.get('/:id/grading', evaluationController.getEvaluationForGrading);

// Route pour sauvegarder les notes d'une évaluation
router.post('/:evaluationId/grades', evaluationController.saveGrades);

module.exports = router;