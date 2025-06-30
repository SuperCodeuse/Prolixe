// server/src/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration pour les uploads de fichiers JSON
const upload = multer({ dest: 'uploads/' });

// Routes
//app.use('/api/subjects', require('./routes/subjects'));
//app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/import', require('./routes/import'));

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-planner')
    .then(() => console.log('MongoDB connecté'))
    .catch(err => console.error('Erreur MongoDB:', err));

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
