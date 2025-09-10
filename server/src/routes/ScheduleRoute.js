// backend/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const ScheduleController = require('../controllers/ScheduleController');
const verifyToken = require('../middleware/authMiddleware'); // Importer le middleware

// Appliquer le middleware à toutes les routes de ce fichier
router.use(verifyToken);

router.get('/', ScheduleController.getSchedule);
router.put('/', ScheduleController.upsertCourse);
router.delete('/:journal_id/:day/:time_slot_id', ScheduleController.deleteCourse);

module.exports = router;
