// Fichier: src/routes/EvaluationRoute.js

const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/EvaluationController');

router.get('/', evaluationController.getEvaluations);
router.post('/', evaluationController.createEvaluation);
router.put('/:id', evaluationController.updateEvaluation);     // <-- AJOUT
router.delete('/:id', evaluationController.deleteEvaluation); // <-- AJOUT

router.get('/:id/grading', evaluationController.getEvaluationForGrading);
router.post('/:evaluationId/grades', evaluationController.saveGrades);

module.exports = router;