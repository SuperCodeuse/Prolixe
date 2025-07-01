require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuration de la base de données à partir des variables d'environnement
const config = {
    host: process.env.DB_HOST || process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false // Pour les certificats auto-signés
    },
    connectTimeout: 30000,
    acquireTimeout: 30000,
    connectionLimit: 10,
    queueLimit: 0,
    reconnect: true,
    idleTimeout: 300000,
    timeout: 60000
};


async function testConnection() {
    console.log('🔗 Test de connexion à la base de données MySQL...');
    console.log(`📊 Serveur: ${config.host}:${config.port}`);
    console.log(`🗄️  Base de données: ${config.database}`);
    console.log(`👤 Utilisateur: ${config.user}`);
    console.log('─'.repeat(50));

    let connection;
    let pool;

    try {
        // Création du pool de connexions
        console.log('⏳ Création du pool de connexions...');

        // Utilisez config ou testConnectionString selon vos besoins
        pool = mysql.createPool(config);
        // pool = mysql.createPool(testConnectionString); // Alternative

        // Test de connexion
        console.log('⏳ Connexion en cours...');
        connection = await pool.getConnection();

        console.log('✅ Connexion établie avec succès !');

        // Test d'une requête simple
        console.log('⏳ Test d\'une requête simple...');
        const [versionResult] = await connection.execute('SELECT VERSION() as version, NOW() as current_time');

        console.log('✅ Requête exécutée avec succès !');
        console.log('📋 Informations du serveur:');
        console.log(`   Version: ${versionResult[0].version}`);
        console.log(`   Heure actuelle: ${versionResult[0].current_time}`);

        // Test d'informations sur la base de données
        const [dbInfo] = await connection.execute(`
            SELECT 
                DATABASE() as database_name,
                USER() as current_user,
                @@hostname as server_name,
                @@port as server_port
        `);

        console.log('🔍 Informations de connexion:');
        console.log(`   Base de données: ${dbInfo[0].database_name}`);
        console.log(`   Utilisateur connecté: ${dbInfo[0].current_user}`);
        console.log(`   Nom du serveur: ${dbInfo[0].server_name}`);
        console.log(`   Port du serveur: ${dbInfo[0].server_port}`);

        // Test optionnel: afficher les tables disponibles
        console.log('⏳ Récupération de la liste des tables...');
        const [tables] = await connection.execute('SHOW TABLES');

        if (tables.length > 0) {
            console.log('📋 Tables disponibles:');
            tables.slice(0, 5).forEach((table, index) => {
                const tableName = Object.values(table)[0];
                console.log(`   ${index + 1}. ${tableName}`);
            });
            if (tables.length > 5) {
                console.log(`   ... et ${tables.length - 5} autres tables`);
            }
        } else {
            console.log('📋 Aucune table trouvée dans la base de données');
        }

    } catch (error) {
        console.error('❌ Erreur de connexion:');
        console.error(`   Message: ${error.message}`);
        console.error(`   Code: ${error.code || 'N/A'}`);
        console.error(`   Errno: ${error.errno || 'N/A'}`);

        // Messages d'erreur spécifiques pour MySQL
        switch (error.code) {
            case 'ER_ACCESS_DENIED_ERROR':
                console.error('🔐 Erreur d\'authentification - Vérifiez vos identifiants');
                break;
            case 'ECONNREFUSED':
                console.error('🚫 Connexion refusée - Vérifiez que le serveur MySQL est démarré');
                break;
            case 'ENOTFOUND':
                console.error('🌐 Serveur non trouvé - Vérifiez l\'adresse du serveur');
                break;
            case 'ETIMEDOUT':
                console.error('⏰ Timeout de connexion - Vérifiez le serveur et le port');
                break;
            case 'ER_BAD_DB_ERROR':
                console.error('🗄️ Base de données inexistante - Vérifiez le nom de la base de données');
                break;
            case 'ECONNRESET':
                console.error('🔄 Connexion réinitialisée par le serveur');
                break;
            default:
                console.error('❓ Erreur inconnue - Vérifiez votre configuration');
        }

        process.exit(1);

    } finally {
        // Fermeture de la connexion
        if (connection) {
            try {
                connection.release();
                console.log('🔓 Connexion libérée du pool');
            } catch (releaseError) {
                console.error('⚠️  Erreur lors de la libération de la connexion:', releaseError.message);
            }
        }

        if (pool) {
            try {
                await pool.end();
                console.log('🔒 Pool de connexions fermé proprement');
            } catch (closeError) {
                console.error('⚠️  Erreur lors de la fermeture du pool:', closeError.message);
            }
        }
    }
}

// Vérification des variables d'environnement
function checkEnvironmentVariables() {
    const required = ['DB_HOST', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
    // Alternative si vous utilisez DB_SERVER au lieu de DB_HOST
    const requiredAlt = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];

    const missing = required.filter(key => !process.env[key]);
    const missingAlt = requiredAlt.filter(key => !process.env[key]);

    // Vérifier si au moins un ensemble de variables est présent
    if (missing.length > 0 && missingAlt.length > 0) {
        console.error('❌ Variables d\'environnement manquantes:');
        console.error('   Option 1 (recommandée):');
        required.forEach(key => {
            if (!process.env[key]) console.error(`     - ${key}`);
        });
        console.error('   Option 2:');
        requiredAlt.forEach(key => {
            if (!process.env[key]) console.error(`     - ${key}`);
        });
        console.error('\n💡 Vérifiez votre fichier .env');
        console.error('💡 Utilisez DB_HOST ou DB_SERVER pour l\'adresse du serveur');
        process.exit(1);
    }
}

// Test de la configuration avant connexion
function validateConfig() {
    console.log('🔍 Validation de la configuration...');

    if (!config.host) {
        console.error('❌ Adresse du serveur manquante');
        return false;
    }

    if (!config.database) {
        console.error('❌ Nom de la base de données manquant');
        return false;
    }

    if (!config.user) {
        console.error('❌ Nom d\'utilisateur manquant');
        return false;
    }

    if (config.port < 1 || config.port > 65535) {
        console.error('❌ Port invalide (doit être entre 1 et 65535)');
        return false;
    }

    console.log('✅ Configuration valide');
    return true;
}

// Script principal
async function main() {
    console.log('🚀 Démarrage du test de connexion MySQL');
    console.log('═'.repeat(50));

    checkEnvironmentVariables();

    if (!validateConfig()) {
        process.exit(1);
    }

    await testConnection();

    console.log('═'.repeat(50));
    console.log('✨ Test terminé avec succès !');
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('💥 Erreur non gérée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promise rejetée non gérée:', reason);
    process.exit(1);
});

// Exécution du script
main().catch(console.error);
