// server/src/routes/ScheduleModelRoute.js
const express = require('express');
const router = express.Router();
const ScheduleModelController = require('../controllers/ScheduleModelController');

// Route pour créer un nouvel emploi du temps
router.post('/', ScheduleModelController.createSchedule);

// Route pour récupérer tous les emplois du temps
router.get('/', ScheduleModelController.getSchedules);

module.exports = router;