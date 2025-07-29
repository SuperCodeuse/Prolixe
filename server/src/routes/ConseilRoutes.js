const express = require('express');
const router = express.Router();
// Assurez-vous que le nom du fichier du contrôleur est correct
const ConseilController = require('../controllers/ConseilController');

// GET /api/conseil-de-classe/:class_id
// Récupère les données du conseil pour tous les élèves d'une classe.
router.get('/:class_id', ConseilController.getConseilDataForClass);

// PUT /api/conseil-de-classe/student/:student_id
// Met à jour ou crée l'avis pour un élève spécifique.
router.put('/student/:student_id', ConseilController.updateStudentConseil);

module.exports = router;