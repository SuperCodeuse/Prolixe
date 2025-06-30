// server/src/routes/sessions.js
const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');

// GET /api/sessions - Récupérer les sessions avec filtres
router.get('/', importController.getSessions);

// PUT /api/sessions/:id - Mettre à jour une session
router.put('/:id', importController.updateSession);

// DELETE /api/sessions/:id - Supprimer une session
router.delete('/:id', importController.deleteSession);

module.exports = router;
