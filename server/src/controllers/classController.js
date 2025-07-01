const mysql = require('mysql2/promise');

const pool = require('../../config/database');

class ClassController {
    // Récupérer toutes les classes
    static async getAllClasses(req, res) {
        try {
            console.log('📚 Récupération des classes...');

            const connection = await pool.getConnection();
            const [rows] = await connection.execute(`
                SELECT 
                  id,
                  name,
                  name as level,
                  FLOOR(RAND() * 15 + 20) as students,
                  'Matière générale' as subject
                FROM CLASS 
                ORDER BY name
            `);

            console.log(`✅ ${rows.length} classes trouvées`);

            res.json({
                success: true,
                data: rows,
                count: rows.length
            });

        } catch (error) {
            console.error('❌ Erreur récupération classes:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des classes',
                error: error.message
            });
        }
    }

    // Récupérer une classe par ID
    static async getClassById(req, res) {
        try {
            const { id } = req.params;
            console.log(`🔍 Récupération classe ID: ${id}`);

            const connection = await pool.getConnection();
            const [rows] = await connection.execute(`
                SELECT 
                  id,
                  name,
                  name as level,
                  FLOOR(RAND() * 15 + 20) as students,
                  'Matière générale' as subject
                FROM CLASS 
                WHERE id = ?
            `, [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Classe non trouvée'
                });
            }

            console.log('✅ Classe trouvée');
            res.json({
                success: true,
                data: rows[0]
            });

        } catch (error) {
            console.error('❌ Erreur récupération classe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la classe',
                error: error.message
            });
        }
    }

    // Créer une nouvelle classe
    static async createClass(req, res) {
        try {
            const { name } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom de la classe est requis'
                });
            }

            console.log(`➕ Création classe: ${name}`);

            const connection = await pool.getConnection();

            // Vérifier si la classe existe déjà
            const [existingClass] = await connection.execute(
                'SELECT id FROM CLASS WHERE name = ?',
                [name.trim()]
            );

            if (existingClass.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Une classe avec ce nom existe déjà'
                });
            }

            // Créer la classe
            const [result] = await connection.execute(
                'INSERT INTO CLASS (name) VALUES (?)',
                [name.trim()]
            );

            // Récupérer la classe créée
            const [newClass] = await connection.execute(
                'SELECT id, name FROM CLASS WHERE id = ?',
                [result.insertId]
            );

            const responseData = {
                ...newClass[0],
                level: newClass[0].name,
                students: 0,
                subject: 'Matière générale'
            };

            console.log('✅ Classe créée avec succès');
            res.status(201).json({
                success: true,
                data: responseData,
                message: 'Classe créée avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur création classe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création de la classe',
                error: error.message
            });
        }
    }

    // Mettre à jour une classe
    static async updateClass(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom de la classe est requis'
                });
            }

            console.log(`📝 Mise à jour classe ID: ${id}`);

            const connection = await pool.getConnection();

            // Vérifier si une autre classe a déjà ce nom
            const [existingClass] = await connection.execute(
                'SELECT id FROM CLASS WHERE name = ? AND id != ?',
                [name.trim(), id]
            );

            if (existingClass.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Une autre classe avec ce nom existe déjà'
                });
            }

            // Mettre à jour
            const [result] = await connection.execute(
                'UPDATE CLASS SET name = ? WHERE id = ?',
                [name.trim(), id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Classe non trouvée'
                });
            }

            // Récupérer la classe mise à jour
            const [updatedClass] = await connection.execute(
                'SELECT id, name FROM CLASS WHERE id = ?',
                [id]
            );

            const responseData = {
                ...updatedClass[0],
                level: updatedClass[0].name,
                students: 0,
                subject: 'Matière générale'
            };

            console.log('✅ Classe mise à jour');
            res.json({
                success: true,
                data: responseData,
                message: 'Classe mise à jour avec succès'
            });

        } catch (error) {
            console.error('❌ Erreur mise à jour classe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de la classe',
                error: error.message
            });
        }
    }

    // Supprimer une classe
    static async deleteClass(req, res) {
        try {
            const { id } = req.params;
            console.log(`🗑️ Suppression classe ID: ${id}`);

            const connection = await pool.getConnection();

            // Récupérer les infos avant suppression
            const [classToDelete] = await connection.execute(
                'SELECT id, name FROM CLASS WHERE id = ?',
                [id]
            );

            if (classToDelete.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Classe non trouvée'
                });
            }

            // Supprimer la classe
            const [result] = await connection.execute(
                'DELETE FROM CLASS WHERE id = ?',
                [id]
            );

            console.log('✅ Classe supprimée');
            res.json({
                success: true,
                message: 'Classe supprimée avec succès',
                data: classToDelete[0]
            });

        } catch (error) {
            console.error('❌ Erreur suppression classe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de la classe',
                error: error.message
            });
        }
    }
}

module.exports = ClassController;
