// server/src/models/ScheduleModel.js
const mongoose = require('mongoose');

const scheduleModelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Modification: Ajout de la colonne 'type'
    type: {
        type: String,
        enum: ['COMMON', 'PERSONNAL'], // Définit les valeurs autorisées
        required: true,
        default: 'COMMON' // Par défaut à COMMON pour la création par l'admin
    }
}, { timestamps: true });

module.exports = mongoose.model('ScheduleModel', scheduleModelSchema);