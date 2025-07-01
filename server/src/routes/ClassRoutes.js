// backend/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/classController');

// GET /api/classes - Récupérer toutes les classes
router.get('/', ClassController.getAllClasses);

// GET /api/classes/:id - Récupérer une classe par ID
router.get('/:id', ClassController.getClassById);

// POST /api/classes - Créer une nouvelle classe
router.post('/', ClassController.createClass);

// PUT /api/classes/:id - Mettre à jour une classe
router.put('/:id', ClassController.updateClass);

// DELETE /api/classes/:id - Supprimer une classe
router.delete('/:id', ClassController.deleteClass);

module.exports = router;
