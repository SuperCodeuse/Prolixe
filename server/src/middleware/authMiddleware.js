const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Accès non autorisé. Jeton manquant ou mal formaté.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attache les données de l'utilisateur à la requête
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Jeton invalide ou expiré.' });
    }
};

module.exports = verifyToken;
