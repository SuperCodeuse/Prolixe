// backend/routes/schoolYearRoutes.js
const express = require('express');
const router = express.Router();
const SchoolYearController = require('../controllers/SchoolYearController');

// ======================================================
// Définition des routes pour la ressource "school-years"
// Préfixe de base: /api/school-years
// ======================================================

/**
 * @route   GET /api/school-years
 * @desc    Récupérer toutes les années scolaires
 * @access  Public
 */
router.get('/', SchoolYearController.getAllSchoolYears);

router.get('/:id', SchoolYearController.getSchoolYearById);

/**
 * @route   POST /api/school-years
 * @desc    Créer une nouvelle année scolaire
 * @access  Public
 */
router.post('/', SchoolYearController.createSchoolYear);

/**
 * @route   PUT /api/school-years/:id
 * @desc    Mettre à jour une année scolaire spécifique
 * @access  Public
 */
router.put('/:id', SchoolYearController.updateSchoolYear);

/**
 * @route   DELETE /api/school-years/:id
 * @desc    Supprimer une année scolaire spécifique
 * @access  Public
 */
router.delete('/:id', SchoolYearController.deleteSchoolYear);

module.exports = router;
