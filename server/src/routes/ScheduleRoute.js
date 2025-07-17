// backend/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const ScheduleController = require('../controllers/ScheduleController'); // Assurez-vous que le chemin est correct

router.get('/', ScheduleController.getSchedule);
router.put('/', ScheduleController.upsertCourse);
router.delete('/:journal_id/:day/:time_slot_id', ScheduleController.deleteCourse);

module.exports = router;

