// Fichier: src/routes/EvaluationRoute.js

const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/EvaluationController');

router.get('/', evaluationController.getEvaluations);
router.post('/', evaluationController.createEvaluation);
router.put('/:id', evaluationController.updateEvaluation);
router.delete('/:id', evaluationController.deleteEvaluation);

// NOUVELLE ROUTE : Obtenir les détails d'une évaluation spécifique pour la copie
router.get('/:id', evaluationController.getEvaluationById);

router.get('/:id/grading', evaluationController.getEvaluationForGrading);
router.post('/:evaluationId/grades', evaluationController.saveGrades);

module.exports = router;