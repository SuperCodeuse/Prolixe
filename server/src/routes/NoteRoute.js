// server/src/routes/NoteRoute.js

const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/NoteController');

router.get('/', NoteController.getNotes);
router.post('/', NoteController.createNote);
router.delete('/:id', NoteController.deleteNote);

    module.exports = router;