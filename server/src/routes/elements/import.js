// server/src/routes/import.js
const express = require('express');
const router = express.Router();
const importController = require('../../controllers/importController');

// POST /api/import/journal - Importer le JSON du journal
router.post('/journal', importController.importJournal);

module.exports = router;
