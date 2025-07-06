// backend/routes/ScheduleHours.js
const express = require('express');
const router = express.Router();
const ScheduleHoursController = require('../controllers/ScheduleHoursController');

// GET /api/hours - Récupérer tous les créneaux horaires
router.get('/', ScheduleHoursController.getAllHours);

// GET /api/hours/:id - Récupérer un créneau horaire par ID
router.get('/:id', ScheduleHoursController.getHourById);

// POST /api/hours - Créer un nouveau créneau horaire
router.post('/', ScheduleHoursController.createHour);

// PUT /api/hours/:id - Mettre à jour un créneau horaire
router.put('/:id', ScheduleHoursController.updateHour);

// DELETE /api/hours/:id - Supprimer un créneau horaire
router.delete('/:id', ScheduleHoursController.deleteHour);

module.exports = router;
