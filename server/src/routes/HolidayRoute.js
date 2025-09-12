// server/src/routes/HolidayRoute.js
const express = require('express');
const router = express.Router();
const HolidayController = require('../controllers/HolidayController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configuration de multer pour le stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', '..', 'uploads');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Nomme le fichier holidays.json, en écrasant l'ancien
        cb(null, 'holidays.json');
    }
});

const upload = multer({ storage: storage });

// Route pour l'upload (admin uniquement)
router.post('/upload', authMiddleware, upload.single('holidaysFile'), HolidayController.uploadHolidays);

// Route pour la récupération (pour tous les utilisateurs authentifiés)
router.get('/', authMiddleware, HolidayController.getHolidays);

module.exports = router;