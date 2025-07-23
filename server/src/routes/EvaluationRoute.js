// Fichier: src/routes/EvaluationRoute.js
const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/EvaluationController');

router.get('/templates', evaluationController.getEvaluationTemplates);
router.get('/:id/grading', evaluationController.getEvaluationForGrading);

router.get('/:id', evaluationController.getEvaluationById);
router.get('/', evaluationController.getEvaluations);


router.post('/', evaluationController.createEvaluation);
router.post('/:evaluationId/grades', evaluationController.saveGrades);

router.put('/:id', evaluationController.updateEvaluation);

router.delete('/:id', evaluationController.deleteEvaluation);

module.exports = router;