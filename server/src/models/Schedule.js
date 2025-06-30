// server/src/models/Schedule.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    classes: String, // "3TTI", "4TTI", "3TTI-4TTI"
    subjects: [{
        className: String, // "3TTI"
        subjectName: String, // "Informatique"
        duration: String // "1h40min"
    }],
    dayOfWeek: Number, // calculé à partir de la date
    startDate: Date,
    endDate: Date
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
