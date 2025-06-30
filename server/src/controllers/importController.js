// server/src/controllers/importController.js
const CourseSession = require('../models/CourseSession');
const Subject = require('../models/Subject');
const moment = require('moment');

// Fonction pour parser les dates françaises
const parseFrenchDate = (dateStr) => {
    // "vendredi 10 janv. 2025" -> Date
    const months = {
        'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5,
        'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11
    };

    const parts = dateStr.split(' ');
    const day = parseInt(parts[1]);
    const month = months[parts[2]];
    const year = parseInt(parts[3]);

    return new Date(year, month, day);
};

// Extraire les matières uniques du JSON
const extractSubjects = (sessions) => {
    const subjects = new Set();

    sessions.forEach(session => {
        if (typeof session.matiere === 'string') {
            subjects.add(session.matiere);
        } else if (typeof session.matiere === 'object') {
            Object.values(session.matiere).forEach(subject => subjects.add(subject));
        }
    });

    return Array.from(subjects);
};

exports.importJournal = async (req, res) => {
    try {
        const journalData = req.body; // Ton JSON sera envoyé ici

        console.log(`Import de ${journalData.length} sessions...`);

        // 1. Créer les matières si elles n'existent pas
        const subjectNames = extractSubjects(journalData);
        const subjectPromises = subjectNames.map(async (name) => {
            let subject = await Subject.findOne({ name });
            if (!subject) {
                subject = new Subject({ name, code: name.substring(0, 4).toUpperCase() });
                await subject.save();
                console.log(`Matière créée: ${name}`);
            }
            return subject;
        });

        await Promise.all(subjectPromises);

        // 2. Transformer et importer chaque session
        const importPromises = journalData.map(async (sessionData) => {
            try {
                const date = parseFrenchDate(sessionData.date);

                // Vérifier si la session existe déjà
                const existingSession = await CourseSession.findOne({
                    date: {
                        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
                    },
                    classes: sessionData.classes
                });

                if (existingSession) {
                    console.log(`Session existante ignorée: ${sessionData.date}`);
                    return null;
                }

                // Créer la nouvelle session
                const newSession = new CourseSession({
                    date,
                    classes: sessionData.classes,
                    subjects: sessionData.matiere,
                    duration: sessionData.duree,
                    activities: sessionData.activites || [],
                    remediation: sessionData.remediation || [],
                    events: sessionData.evenements || [],
                    homework: '',
                    preparation: '',
                    notes: ''
                });

                await newSession.save();
                return newSession;
            } catch (error) {
                console.error(`Erreur pour la session ${sessionData.date}:`, error.message);
                return null;
            }
        });

        const results = await Promise.all(importPromises);
        const successCount = results.filter(r => r !== null).length;

        res.json({
            success: true,
            message: `Import terminé: ${successCount} sessions importées sur ${journalData.length}`,
            imported: successCount,
            total: journalData.length
        });

    } catch (error) {
        console.error('Erreur import:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Récupérer les sessions avec filtres
exports.getSessions = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            className,
            subject,
            page = 1,
            limit = 50
        } = req.query;

        let query = {};

        // Filtre par date
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Filtre par classe
        if (className) {
            query.classes = { $regex: className, $options: 'i' };
        }

        const skip = (page - 1) * limit;

        const sessions = await CourseSession.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await CourseSession.countDocuments(query);

        // Filtrer par matière si nécessaire (recherche dans l'objet subjects)
        let filteredSessions = sessions;
        if (subject) {
            filteredSessions = sessions.filter(session => {
                if (typeof session.subjects === 'string') {
                    return session.subjects.toLowerCase().includes(subject.toLowerCase());
                } else if (typeof session.subjects === 'object') {
                    return Object.values(session.subjects).some(s =>
                        s.toLowerCase().includes(subject.toLowerCase())
                    );
                }
                return false;
            });
        }

        res.json({
            sessions: filteredSessions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSession = async (req, res) => {
    try {
        const session = await CourseSession.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!session) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const session = await CourseSession.findByIdAndDelete(req.params.id);

        if (!session) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }

        res.json({ message: 'Session supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
