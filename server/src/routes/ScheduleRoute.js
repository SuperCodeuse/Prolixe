// backend/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const ScheduleController = require('../controllers/ScheduleController'); // Assurez-vous que le chemin est correct

// Route pour récupérer tout l'emploi du temps
router.get('/', ScheduleController.getSchedule);

// Route pour ajouter ou mettre à jour un cours (upsert)
// Utilisez PUT ou POST selon votre préférence, PUT est souvent préféré pour les upserts si l'ID est connu/logique
router.put('/', ScheduleController.upsertCourse);

// Route pour supprimer un cours (basé sur le jour et l'ID du créneau horaire)
router.delete('/:journal_id/:day/:time_slot_id', ScheduleController.deleteCourse);

module.exports = router;