// server/src/routes/NoteRoutes.js
const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/NoteController');

router.get('/', NoteController.getNotes);
router.post('/', NoteController.createNote);
router.put('/:id', NoteController.updateNote); // Nouvelle route pour la modification
router.delete('/:id', NoteController.deleteNote);

module.exports = router;