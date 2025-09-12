// server/src/controllers/HolidayController.js
const fs = require('fs/promises');
const path = require('path');
const holidaysFilePath = path.join(__dirname, '..', '..', 'uploads', 'holidays.json');

class HolidayController {
    // Gérer le téléchargement du fichier de vacances par l'ADMIN
    static async uploadHolidays(req, res) {
        // Le middleware d'authentification a déjà vérifié le rôle de l'utilisateur
        // Vérification de l'autorisation de manière explicite pour plus de sécurité
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Accès interdit. Seuls les administrateurs peuvent télécharger ce fichier.' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Aucun fichier n\'a été téléchargé.' });
        }

        try {
            // Le fichier est déjà enregistré par Multer. On peut le renommer si besoin.
            // Le fichier est déjà nommé holidays.json par le middleware.
            res.status(200).json({
                success: true,
                message: 'Fichier de vacances téléchargé avec succès.'
            });
        } catch (error) {
            console.error('Erreur lors du traitement du fichier de vacances:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur lors du traitement du fichier.'
            });
        }
    }

    // Récupérer le fichier de vacances pour tous les utilisateurs
    static async getHolidays(req, res) {
        try {
            // Vérifier si le fichier existe
            await fs.access(holidaysFilePath);
            const data = await fs.readFile(holidaysFilePath, 'utf8');
            const holidays = JSON.parse(data);

            res.status(200).json({
                success: true,
                data: holidays,
                message: 'Données de vacances récupérées avec succès.'
            });
        } catch (error) {
            // Si le fichier n'existe pas, ou s'il y a une erreur de lecture/parsing
            if (error.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    message: 'Fichier de vacances non trouvé.'
                });
            }
            console.error('Erreur lors de la récupération du fichier de vacances:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur serveur lors de la lecture du fichier de vacances.'
            });
        }
    }
}

module.exports = HolidayController;