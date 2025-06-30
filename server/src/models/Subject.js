// server/src/models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: String,
    color: { type: String, default: '#1976d2' }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
