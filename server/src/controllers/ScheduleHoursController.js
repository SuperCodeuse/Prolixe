// backend/controllers/ScheduleHoursController.js
const mysql = require('mysql2/promise');
const pool = require('../../config/database');

class ScheduleHoursController {
    // Récupérer tous les créneaux horaires
    static async getAllHours(req, res) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM SCHEDULE_HOURS ORDER BY libelle ASC'
            );

            res.status(200).json({
                success: true,
                data: rows,
                message: 'Créneaux horaires récupérés avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des créneaux horaires:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des créneaux horaires',
                error: error.message
            });
        }
    }

    // Récupérer un créneau horaire par ID
    static async getHourById(req, res) {
        const { id } = req.params;

        try {
            // Validation de l'ID
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de créneau horaire invalide'
                });
            }

            const [rows] = await pool.execute(
                'SELECT * FROM SCHEDULE_HOURS WHERE id = ?',
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Créneau horaire non trouvé'
                });
            }

            res.status(200).json({
                success: true,
                data: rows[0],
                message: 'Créneau horaire récupéré avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du créneau horaire:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du créneau horaire',
                error: error.message
            });
        }
    }

    // Créer un nouveau créneau horaire
    static async createHour(req, res) {
        const { libelle } = req.body;

        try {
            // Validation des données
            if (!libelle || typeof libelle !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Le libellé du créneau horaire est requis'
                });
            }

            // Validation du format du libellé (HH:MM-HH:MM)
            const timeSlotRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeSlotRegex.test(libelle)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de créneau horaire invalide. Format attendu: HH:MM-HH:MM'
                });
            }

            // Valider que l'heure de fin est après l'heure de début
            const [startTime, endTime] = libelle.split('-');
            if (startTime >= endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'heure de fin doit être après l\'heure de début'
                });
            }

            // Vérifier que le créneau n'existe pas déjà
            const [existingHours] = await pool.execute(
                'SELECT id FROM SCHEDULE_HOURS WHERE libelle = ?',
                [libelle]
            );

            if (existingHours.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ce créneau horaire existe déjà'
                });
            }

            // Créer le créneau horaire
            const [result] = await pool.execute(
                'INSERT INTO SCHEDULE_HOURS (libelle) VALUES (?)',
                [libelle]
            );

            // Récupérer le créneau créé
            const [newHour] = await pool.execute(
                'SELECT * FROM SCHEDULE_HOURS WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                data: newHour[0],
                message: 'Créneau horaire créé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la création du créneau horaire:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création du créneau horaire',
                error: error.message
            });
        }
    }

    // Mettre à jour un créneau horaire
    static async updateHour(req, res) {
        const { id } = req.params;
        const { libelle } = req.body;

        try {
            // Validation de l'ID
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de créneau horaire invalide'
                });
            }

            // Validation des données
            if (!libelle || typeof libelle !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Le libellé du créneau horaire est requis'
                });
            }

            // Validation du format du libellé
            const timeSlotRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeSlotRegex.test(libelle)) {
                return res.status(400).json({
                    success: false,
                    message: 'Format de créneau horaire invalide. Format attendu: HH:MM-HH:MM'
                });
            }

            // Valider que l'heure de fin est après l'heure de début
            const [startTime, endTime] = libelle.split('-');
            if (startTime >= endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'heure de fin doit être après l\'heure de début'
                });
            }

            // Vérifier que le créneau existe
            const [existingHour] = await pool.execute(
                'SELECT id FROM SCHEDULE_HOURS WHERE id = ?',
                [id]
            );

            if (existingHour.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Créneau horaire non trouvé'
                });
            }

            // Vérifier que le nouveau libellé n'existe pas déjà (sauf pour le créneau actuel)
            const [duplicateHour] = await pool.execute(
                'SELECT id FROM SCHEDULE_HOURS WHERE libelle = ? AND id != ?',
                [libelle, id]
            );

            if (duplicateHour.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Ce créneau horaire existe déjà'
                });
            }

            // Mettre à jour le créneau horaire
            await pool.execute(
                'UPDATE SCHEDULE_HOURS SET libelle = ? WHERE id = ?',
                [libelle, id]
            );

            // Récupérer le créneau mis à jour
            const [updatedHour] = await pool.execute(
                'SELECT * FROM SCHEDULE_HOURS WHERE id = ?',
                [id]
            );

            res.status(200).json({
                success: true,
                data: updatedHour[0],
                message: 'Créneau horaire mis à jour avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour du créneau horaire:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du créneau horaire',
                error: error.message
            });
        }
    }

    // Supprimer un créneau horaire
    static async deleteHour(req, res) {
        const { id } = req.params;

        try {
            // Validation de l'ID
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de créneau horaire invalide'
                });
            }

            // Vérifier que le créneau existe
            const [existingHour] = await pool.execute(
                'SELECT id FROM SCHEDULE_HOURS WHERE id = ?',
                [id]
            );

            if (existingHour.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Créneau horaire non trouvé'
                });
            }

            // Supprimer le créneau horaire
            await pool.execute(
                'DELETE FROM SCHEDULE_HOURS WHERE id = ?',
                [id]
            );

            res.status(200).json({
                success: true,
                message: 'Créneau horaire supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du créneau horaire:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression du créneau horaire',
                error: error.message
            });
        }
    }
}

module.exports = ScheduleHoursController;
