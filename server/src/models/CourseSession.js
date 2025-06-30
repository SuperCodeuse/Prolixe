// server/src/models/CourseSession.js
const mongoose = require('mongoose');

const courseSessionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    classes: String, // "3TTI-4TTI"
    subjects: mongoose.Schema.Types.Mixed, // Objet flexible pour tes matières
    duration: mongoose.Schema.Types.Mixed, // Objet flexible pour tes durées

    // Activités du cours
    activities: [{
        time: String, // "08h25"
        description: String
    }],

    // Données de remédiation si présentes
    remediation: [{
        time: String,
        description: String
    }],

    // Événements spéciaux
    events: [String],

    // Champs pour le journal (ajoutés manuellement)
    homework: String,
    preparation: String,
    quiz: {
        date: Date,
        topic: String,
        description: String
    },
    notes: String
}, { timestamps: true });

module.exports = mongoose.model('CourseSession', courseSessionSchema);
