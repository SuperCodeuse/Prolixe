const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';
// Définir les durées d'expiration pour les tokens
const SHORT_LIVED_TOKEN_EXPIRATION = '1h'; // 1 heure par défaut
const LONG_LIVED_TOKEN_EXPIRATION = '30d'; // 30 jours pour "Rester connecté"

class AuthController {

    static handleError(res, error, defaultMessage = 'Erreur serveur', statusCode = 500) {
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : defaultMessage;
        console.error(`❌ Erreur dans AuthController: ${defaultMessage}`, error);

        res.status(statusCode).json({
            success: false,
            message: defaultMessage,
            error: errorMessage,
        });
    }

    static async login(req, res) {
        // Ajout de 'rememberMe' au destructuring du corps de la requête
        const { username, password, rememberMe } = req.body;
        console.log(rememberMe);

        const pool = req.pool;

        if (!username || !password) {
            return AuthController.handleError(res, new Error('Identifiants manquants'), 'Email et mot de passe sont requis.', 400);
        }

        try {
            const connection = await pool.getConnection();
            const [rows] = await connection.execute('SELECT * FROM USER WHERE email = ?', [username]);
            connection.release();

            if (rows.length === 0) {
                return AuthController.handleError(res, new Error('Utilisateur non trouvé'), 'Email ou mot de passe incorrect.', 401);
            }

            const user = rows[0];

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return AuthController.handleError(res, new Error('Mot de passe incorrect'), 'Email ou mot de passe incorrect.', 401);
            }

            const userPayload = {
                id: user.id,
                email: user.email,
                role: user.role,
                firstname: user.firstname,
                name: user.name
            };

            // Déterminer la durée d'expiration du token en fonction de 'rememberMe'
            const expiresIn = rememberMe ? LONG_LIVED_TOKEN_EXPIRATION : SHORT_LIVED_TOKEN_EXPIRATION;

            const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: expiresIn });

            res.json({
                success: true,
                message: 'Connexion réussie !',
                token: token,
                user: userPayload
            });

        } catch (error) {
            AuthController.handleError(res, error, 'Erreur lors de la connexion.');
        }
    }
}

module.exports = AuthController;