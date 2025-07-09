// server/src/server.js
const mysql = require('mysql2/promise');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 30000,
    connectionLimit: 10,
    queueLimit: 0,
    idleTimeout: 300000,
    acquireTimeout: 60000,
    timeout: 60000
};

let pool;

async function initDatabase() {
    try {
        console.log('🔄 Initialisation de la base de données...');
        pool = mysql.createPool(dbConfig);

        console.log('✅ Pool de connexions MySQL créé !');
        console.log(`📍 Serveur: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`🗄️  Base de données: ${dbConfig.database}`);

        const connection = await pool.getConnection();
        console.log('🔗 Connexion à la base de données réussie.');

        console.log('📝 Vérification et création des tables si nécessaire...');

        // Création des tables dans le bon ordre pour respecter les clés étrangères
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`journal\` (
                                                       \`id\` int NOT NULL AUTO_INCREMENT,
                                                       \`name\` varchar(255) NOT NULL,
                                                       \`school_year\` varchar(100) DEFAULT NULL,
                                                       \`is_archived\` tinyint(1) DEFAULT 0,
                                                       \`is_current\` tinyint(1) DEFAULT 0,
                                                       \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                                       PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB;
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`class\` (
                                                     \`id\` int NOT NULL AUTO_INCREMENT,
                                                     \`name\` varchar(100) NOT NULL,
                                                     \`students\` int DEFAULT NULL,
                                                     \`lesson\` text,
                                                     \`level\` int DEFAULT NULL,
                                                     PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB;
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`schedule_hours\` (
                                                              \`id\` int NOT NULL AUTO_INCREMENT,
                                                              \`libelle\` text,
                                                              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB;
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`assignment\` (
                                                          \`id\` int NOT NULL AUTO_INCREMENT,
                                                          \`class_id\` int NOT NULL,
                                                          \`subject\` varchar(100) NOT NULL,
                                                          \`type\` enum('Interro','Devoir','Projet','Examen','Autre') NOT NULL,
                                                          \`title\` varchar(255) NOT NULL,
                                                          \`description\` text,
                                                          \`due_date\` date NOT NULL,
                                                          \`is_completed\` tinyint(1) DEFAULT 0,
                                                          \`is_corrected\` tinyint(1) DEFAULT 0,
                                                          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                                          \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                          PRIMARY KEY (\`id\`),
                                                          KEY \`fk_assignment_class_idx\` (\`class_id\`),
                                                          CONSTRAINT \`fk_assignment_class\` FOREIGN KEY (\`class_id\`) REFERENCES \`class\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`schedule\` (
                                                        \`id\` int NOT NULL AUTO_INCREMENT,
                                                        \`day\` varchar(20) NOT NULL,
                                                        \`time_slot_id\` int NOT NULL,
                                                        \`subject\` varchar(100) NOT NULL,
                                                        \`class_id\` int NOT NULL,
                                                        \`room\` varchar(50) NOT NULL,
                                                        \`notes\` text,
                                                        \`journal_id\` int NULL,
                                                        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                                                        \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                        PRIMARY KEY (\`id\`),
                                                        UNIQUE KEY \`uq_schedule_journal_slot\` (\`journal_id\`, \`day\`, \`time_slot_id\`),
                                                        KEY \`fk_schedule_class_idx\` (\`class_id\`),
                                                        KEY \`fk_schedule_time_slot_idx\` (\`time_slot_id\`),
                                                        CONSTRAINT \`fk_schedule_class\` FOREIGN KEY (\`class_id\`) REFERENCES \`class\` (\`id\`) ON DELETE CASCADE,
                                                        CONSTRAINT \`fk_schedule_time_slot\` FOREIGN KEY (\`time_slot_id\`) REFERENCES \`schedule_hours\` (\`id\`) ON DELETE CASCADE,
                                                        CONSTRAINT \`fk_schedule_journal\` FOREIGN KEY (\`journal_id\`) REFERENCES \`journal\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`journal_entry\` (
              \`id\` int NOT NULL AUTO_INCREMENT,
              \`schedule_id\` int NOT NULL,
              \`date\` date NOT NULL,
              \`planned_work\` text,
              \`actual_work\` text,
              \`notes\` text,
              \`journal_id\` int NOT NULL,
              \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
              \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (\`id\`),
              UNIQUE KEY \`uq_journal_session\` (\`schedule_id\`, \`date\`),
              KEY \`fk_journal_schedule_idx\` (\`schedule_id\`),
              KEY \`fk_entry_journal_idx\` (\`journal_id\`),
              CONSTRAINT \`fk_journal_schedule\` FOREIGN KEY (\`schedule_id\`) REFERENCES \`schedule\` (\`id\`) ON DELETE CASCADE,
              CONSTRAINT \`fk_entry_journal\` FOREIGN KEY (\`journal_id\`) REFERENCES \`journal\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`attributions\` (
                                                            \`id\` INT NOT NULL AUTO_INCREMENT,
                                                            \`school_year\` VARCHAR(100) NOT NULL,
                                                            \`school_name\` VARCHAR(255) NOT NULL,
                                                            \`start_date\` DATE NOT NULL,
                                                            \`end_date\` DATE NOT NULL,
                                                            \`esi_hours\` INT DEFAULT 0,
                                                            \`ess_hours\` INT DEFAULT 0,
                                                            \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                                                            \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                                                            PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB;
        `);

        console.log('✅ Tables créées ou déjà existantes.');

        // Insertion des données par défaut si la table des heures est vide
        const [hours] = await connection.execute('SELECT COUNT(*) as count FROM schedule_hours');
        if (hours[0].count === 0) {
            console.log('🕒 Insertion des créneaux horaires par défaut...');
            await connection.execute(`
                INSERT INTO \`schedule_hours\` (id, libelle) VALUES
                                                                 (1, '08:25-09:15'), (2, '09:15-10:05'), (3, '10:20-11:10'),
                                                                 (4, '11:10-12:00'), (5, '12:45-13:35'), (6, '13:35-14:20'),
                                                                 (7, '14:30-15:15'), (8, '15:15-16:05');
            `);
            console.log('👍 Créneaux horaires insérés.');
        }

        connection.release();

        global.dbPool = pool;

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
        process.exit(1);
    }
}

// Configuration pour les uploads de fichiers JSON
const upload = multer({ dest: 'uploads/' });

// Routes
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/hours', require('./routes/ScheduleHours'));
app.use('/api/schedule', require('./routes/ScheduleRoute'));
app.use('/api/journal', require('./routes/JournalRoute'));
app.use('/api/attributions', require('./routes/AttributionRoute'));

// Route de test
app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM CLASS');
        res.json({
            success: true,
            message: 'API fonctionnelle !',
            classCount: rows[0].count,
            database: {
                host: dbConfig.host,
                database: dbConfig.database,
                connected: true
            }
        });
    } catch (error) {
        console.error('❌ Erreur test API:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            database: {
                connected: false
            }
        });
    }
});

// Route racine avec documentation
app.get('/', (req, res) => {
    res.json({
        message: 'API Prolixe Backend',
        status: 'Active',
        version: '1.0.0',
        endpoints: [
            'GET /api/test - Test de l\'API et de la DB',
            'GET /api/classes - Liste des classes',
            'POST /api/classes - Créer une classe',
            'GET /api/classes/:id - Récupérer une classe',
            'PUT /api/classes/:id - Modifier une classe',
            'DELETE /api/classes/:id - Supprimer une classe'
        ]
    });
});

// Route pour tester la connexion DB spécifiquement
app.get('/api/db-status', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1 as test');
        res.json({
            success: true,
            message: 'Base de données accessible',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur de connexion à la base de données',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur interne',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
    });
});


async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('🚀 SERVEUR DÉMARRÉ !');
        });
    } catch (error) {
        console.error('❌ Erreur démarrage serveur:', error);
        process.exit(1);
    }
}

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
    console.log('\n🔄 Fermeture du serveur...');
    try {
        if (pool) {
            await pool.end();
            console.log('✅ Pool de connexions fermé');
        }
        console.log('✅ Serveur fermé proprement');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la fermeture:', error);
        process.exit(1);
    }
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejection non gérée:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exception non capturée:', error);
    process.exit(1);
});

startServer().catch(console.error);

module.exports = app;
