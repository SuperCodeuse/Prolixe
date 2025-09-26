// server/src/routes/ScheduleModelRoute.js
const express = require('express');
const router = express.Router();
const ScheduleModelController = require('../controllers/ScheduleModelController');

// Route pour créer un nouvel emploi du temps
router.post('/', ScheduleModelController.createSchedule);

module.exports = router;