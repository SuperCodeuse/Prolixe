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

        // Créer le pool MySQL (pas new mysql.ConnectionPool)
        pool = mysql.createPool(dbConfig);

        console.log('✅ Pool de connexions MySQL créé !');
        console.log(`📍 Serveur: ${dbConfig.host}:${dbConfig.port}`);
        console.log(`🗄️ Base de données: ${dbConfig.database}`);

        // Rendre le pool accessible globalement
        global.dbPool = pool;

        // Test de connexion et de la table CLASS
        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM CLASS');
        console.log(`📊 ${rows[0].count} classes dans la base`);

    } catch (error) {
        console.error('❌ Erreur connexion base de données:', error);
        console.error('Détails:', {
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database,
            user: dbConfig.user
        });
        process.exit(1);
    }
}

// Configuration pour les uploads de fichiers JSON
const upload = multer({ dest: 'uploads/' });

// Routes
app.use('/api/classes', require('./routes/classRoutes'));

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

// Routes futures (commentées pour l'instant)
//app.use('/api/subjects', require('./routes/subjects'));
//app.use('/api/schedules', require('./routes/schedules'));
//app.use('/api/sessions', require('./routes/sessions'));
//app.use('/api/import', require('./routes/import'));

async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log('🚀 SERVEUR DÉMARRÉ !');
            console.log(`📡 Port: ${PORT}`);
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`🧪 Test API: http://localhost:${PORT}/api/test`);
            console.log(`📋 API Classes: http://localhost:${PORT}/api/classes`);
            console.log(`💾 Statut DB: http://localhost:${PORT}/api/db-status`);
            console.log('');
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
