// backend/config/database.js
const mysql = require('mysql2/promise');

const config = {
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

let pool = null;

const getConnection = () => {
    if (!pool) {
        pool = mysql.createPool(config);
        console.log('✅ Pool MySQL créé');
        console.log(`📍 Serveur: ${config.host}:${config.port}`);
        console.log(`🗄️ Base de données: ${config.database}`);
    }
    return pool;
};

// Test de connexion au démarrage
const testConnection = async () => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('🔍 Test de connexion réussi:', rows);
        return true;
    } catch (error) {
        console.error('❌ Test de connexion échoué:', error);
        return false;
    }
};

module.exports = {
    getConnection,
    testConnection
};
