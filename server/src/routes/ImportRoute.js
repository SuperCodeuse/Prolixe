// server/src/routes/import.js
const express = require('express');
const router = express.Router();
const importController = require('../controllers/ImportController');
const multer = require('multer');

// Configuration de Multer pour stocker en mémoire
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /api/import/journal - Importer le JSON du journal
// Utilise le middleware 'upload.single' avec le nom de champ 'journalFile'
router.post('/journal', upload.single('journalFile'), importController.importJournal);

module.exports = router;