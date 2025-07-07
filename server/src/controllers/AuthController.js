// backend/controllers/AuthController.js
const users = require('../../config/users'); // Importe le fichier d'utilisateurs
const jwt = require('jsonwebtoken'); // Pour la génération de token JWT (optionnel mais recommandé)

// Assurez-vous d'avoir une clé secrète pour JWT (à mettre dans votre .env)
const JWT_SECRET = process.env.JWT_SECRET;

class AuthController {

    /**
     * Gère et standardise les réponses d'erreur HTTP.
     * @param {Response} res - L'objet réponse Express.
     * @param {Error} error - L'objet erreur.
     * @param {string} defaultMessage - Message d'erreur par défaut pour l'utilisateur.
     * @param {number} statusCode - Code de statut HTTP de l'erreur.
     * @param {object} customErrors - Erreurs spécifiques à renvoyer (ex: validation).
     */

    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500, customErrors = {}) {
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        console.error(`❌ Erreur dans AuthController: ${defaultMessage}`, error);

        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            error: errorMessage,
            errors: customErrors
        });
    }

    /**
     * Gère la connexion de l'utilisateur.
     * @param {Request} req - L'objet requête Express (contient req.body.username et req.body.password).
     * @param {Response} res - L'objet réponse Express.
     */
    static async login(req, res) {
        const { username, password } = req.body;

        if (!username || !password) {
            return AuthController.handleError(res, new Error('Identifiants manquants'), 'Nom d\'utilisateur et mot de passe sont requis.', 400);
        }

        const user = users[username];

        if (!user || user.password !== password) {
            return AuthController.handleError(res, new Error('Identifiants invalides'), 'Nom d\'utilisateur ou mot de passe incorrect.', 401);
        }

        try {

            const userPayload = {
                username: username,
                role: user.role,
                firstname: user.firstname,
                name: user.name
            };

            // Générer un token JWT

            const token = jwt.sign(
                { id: username, role: user.role }, // Payload du token
                JWT_SECRET,                       // Clé secrète
                { expiresIn: '1h' }               // Expiration du token (ex: 1 heure)
            );

            console.log(`✅ Utilisateur '${username}' connecté avec succès.`);
            res.json({
                success: true,
                message: 'Connexion réussie !',
                token: token,
                user: userPayload // Informations utilisateur (sans le mot de passe)
            });

        } catch (error) {
            AuthController.handleError(res, error, 'Erreur lors de la connexion.');
        }
    }

    /**
     * Middleware pour protéger les routes.
     * (Ce middleware n'est pas utilisé directement ici, mais est un exemple de ce que vous feriez)
     */
    static authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

        if (token == null) return res.status(401).json({ success: false, message: 'Token non fourni.' });

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                console.error("JWT Verification Error:", err);
                return res.status(403).json({ success: false, message: 'Token invalide ou expiré.' });
            }
            req.user = user; // Ajoute l'utilisateur décodé à l'objet req
            next(); // Passe au middleware/route suivant
        });
    }
}

module.exports = AuthController;