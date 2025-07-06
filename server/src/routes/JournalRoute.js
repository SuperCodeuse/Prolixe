// backend/routes/journalRoutes.js
const express = require('express');
const router = express.Router();
const JournalController = require('../controllers/JournalController'); // Assurez-vous que le chemin est correct

// Routes pour les entrées de journal
router.get('/entries', JournalController.getJournalEntries);
router.put('/entries', JournalController.upsertJournalEntry); // Upsert (créer/mettre à jour)
router.delete('/entries/:id', JournalController.deleteJournalEntry);

// Routes pour les assignations (interros/devoirs)
router.get('/assignments', JournalController.getAssignments);
router.put('/assignments', JournalController.upsertAssignment); // Upsert
router.delete('/assignments/:id', JournalController.deleteAssignment);

module.exports = router;