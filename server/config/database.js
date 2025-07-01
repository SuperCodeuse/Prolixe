// backend/config/database.js
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true, // Important pour les connexions distantes
        trustServerCertificate: false, // Pour les serveurs hébergés
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise = null;

const getConnection = () => {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then(pool => {
                console.log('✅ Connecté à SQL Server hébergé');
                console.log(`📍 Serveur: ${config.server}:${config.port}`);
                console.log(`🗄️ Base de données: ${config.database}`);
                return pool;
            })
            .catch(err => {
                console.error('❌ Erreur de connexion à la base de données:', err);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
};

// Test de connexion au démarrage
const testConnection = async () => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT 1 as test');
        console.log('🔍 Test de connexion réussi:', result.recordset);
        return true;
    } catch (error) {
        console.error('❌ Test de connexion échoué:', error);
        return false;
    }
};

module.exports = {
    sql,
    getConnection,
    testConnection
};
