// server/src/server.js
const mysql = require('mysql2/promise');
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
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
        pool = mysql.createPool(dbConfig);
        console.log('✅ Pool de connexions MySQL créé !');

        const connection = await pool.getConnection();
        console.log('🔗 Connexion à la base de données réussie.');
        console.log('📝 Vérification et création des tables si nécessaire...');
        connection.release();
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
        process.exit(1);
    }
}

// Configuration pour les uploads de fichiers JSON
const upload = multer({ dest: 'uploads/' });

// Routes
app.use('/api/auth', require('./routes/AuthRoute'));
app.use('/api/classes', require('./routes/ClassRoutes'));
app.use('/api/hours', require('./routes/ScheduleHours'));
app.use('/api/schedule', require('./routes/ScheduleRoute'));
app.use('/api/journal', require('./routes/JournalRoute'));
app.use('/api/attributions', require('./routes/AttributionRoute'));
app.use('/api/evaluations', require('./routes/EvaluationRoute'));
app.use('/api/students', require('./routes/StudentRoute'));
app.use('/api/conseilDeClasse', require('./routes/ConseilRoutes'));
app.use('/api/notes', require('./routes/NoteRoute'));
app.use('/api/school-years', require('./routes/SchoolYearRoute'));


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

app.post('/api/generate-document', (req, res) => {
    const { text, orientation = 'portrait' } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Le texte est requis et doit être une chaîne de caractères' });
    }

    const COLORS = {
        bg: '#FDFAF7',
        textDark: '#2d3748',
        textMuted: '#4a5568',
        accentPrimary: '#6237C8',
        accentSecondary: '#e0d7f4',
        titleGradientStart: '#591CE6',
        titleGradientMid: '#F9598D',
        titleGradientEnd: '#FB8B61'
    };

    function addFooter(doc) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR');

        // Sauvegarder la position actuelle
        const currentY = doc.y;

        // Calculer la position du pied de page
        const footerY = doc.page.height - doc.page.margins.bottom - 15;

        // Positionner le pied de page en bas de la page courante
        doc.fontSize(8)
            .fillColor(COLORS.textMuted)
            .text(`DEGUELDRE C. - ${dateStr}`, 50, footerY, {
                align: 'center',
                width: doc.page.width - 100,
                lineBreak: false
            });

        // Ajouter la ligne de séparation
        doc.moveTo(doc.page.margins.left, footerY - 5)
            .lineTo(doc.page.width - doc.page.margins.right, footerY - 5)
            .stroke();

        // Restaurer la position du curseur à sa position précédente
        doc.y = currentY;
    }

    try {
        const doc = new PDFDocument({
            layout: orientation,
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        doc.on('error', (err) => {
            console.error('Erreur PDFKit:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
            }
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));

        doc.on('end', () => {
            try {
                const pdfData = Buffer.concat(buffers);
                if (!res.headersSent) {
                    res.writeHead(200, {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': 'attachment; filename="document.pdf"',
                        'Content-Length': pdfData.length
                    });
                    res.end(pdfData);
                }
            } catch (err) {
                console.error('Erreur lors de l\'envoi du PDF:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Erreur lors de l\'envoi du PDF' });
                }
            }
        });

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.bg);

        const titleGradient = doc.linearGradient(0, 0, 300, 0);
        titleGradient.stop(0, COLORS.titleGradientStart)
            .stop(0.45, COLORS.titleGradientMid)
            .stop(0.85, COLORS.titleGradientEnd);

        // Variables pour gérer les pages et références
        let currentPage = 1;
        let titlesWithPages = [];

        // Fonction pour extraire les titres et sous-titres
        const extractTitles = (content) => {
            const lines = content.split('\n');
            const titles = [];
            let isFirstTitle = true;

            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (trimmedLine.length === 0) return;

                if (isFirstTitle) {
                    isFirstTitle = false;
                    titles.push(trimmedLine);
                }
                else if (trimmedLine.endsWith(':') || /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s]+\s*:/.test(trimmedLine)) {
                    titles.push(trimmedLine);
                }
            });
            return titles;
        };

        // Fonction pour ajouter la table des matières
        const addTableOfContents = (doc, titlesWithPages) => {
            // Titre de la table des matières avec couleur d'accentuation
            doc.fillColor(COLORS.accentPrimary)
                .font('Helvetica-Bold')
                .fontSize(20)
                .text('Table des matières', { align: 'center' })
                .moveDown(1);

            doc.font('Helvetica');

            // Contenu de la table des matières avec couleur secondaire
            titlesWithPages.forEach((item) => {
                const { title, page } = item;
                const maxWidth = 400;
                const pageNumWidth = 30;

                // Calculer l'espace disponible pour le titre
                const titleWidth = maxWidth - pageNumWidth;

                doc.fillColor(COLORS.textDark)
                    .fontSize(12)
                    .text(title, {
                        width: titleWidth,
                        continued: true,
                        lineBreak: false
                    })
                    .text(' '.repeat(Math.max(1, Math.floor((titleWidth - doc.widthOfString(title)) / doc.widthOfString(' ')))), {
                        continued: true
                    })
                    .text(page.toString(), {
                        align: 'right',
                        width: pageNumWidth
                    })
                    .moveDown(0.5);
            });

            doc.addPage();
            doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.bg);
            currentPage++;
        };

        // Fonction d'ajout de texte formaté avec suivi des pages
        const addFormattedText = (doc, content) => {
            const lines = content.split('\n');
            let isFirstTitle = true;

            lines.forEach((line) => {
                const trimmedLine = line.trim();

                if (trimmedLine.length === 0) {
                    return;
                }

                // Vérifier s'il faut changer de page
                const remainingSpace = doc.page.height - doc.y - doc.page.margins.bottom;
                if (remainingSpace < 100) {
                    doc.addPage();
                    doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.bg);
                    currentPage++;
                }

                if (isFirstTitle) {
                    isFirstTitle = false;
                    titlesWithPages.push({ title: trimmedLine, page: currentPage });
                    doc.fill(titleGradient)
                        .font('Helvetica-Bold')
                        .fontSize(28)
                        .text(trimmedLine)
                        .moveDown(1.5);
                }
                else if (trimmedLine.endsWith(':') || /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s]+\s*:/.test(trimmedLine)) {
                    titlesWithPages.push({ title: trimmedLine, page: currentPage });
                    doc.fill(titleGradient)
                        .font('Helvetica-Bold')
                        .fontSize(18)
                        .text(trimmedLine)
                        .moveDown(0.8);
                }
                else if (/^-\s+.*:/.test(trimmedLine)) {
                    // Gestion des listes avec format "- élément : description"
                    const listMatch = trimmedLine.match(/^-\s+([^:]+):\s*(.+)$/);
                    if (listMatch) {
                        const element = listMatch[1].trim();
                        const description = listMatch[2].trim();

                        // Sauvegarder l'état complet du document
                        const startY = doc.y;
                        const startX = doc.x;
                        doc.save(); // Sauvegarder l'état graphique

                        // Calculer les dimensions nécessaires
                        doc.fontSize(11).font('Helvetica-Bold');
                        const elementTextWidth = doc.widthOfString(element);

                        // Largeur minimale de 80px, mais s'adapte au contenu avec padding
                        const minElementWidth = 80;
                        const elementPadding = 24; // 12px de chaque côté
                        const elementWidth = Math.max(minElementWidth, elementTextWidth + elementPadding);

                        doc.font('Helvetica');
                        const descriptionWidth = doc.widthOfString(description);

                        // Calculer la largeur totale nécessaire avec marges
                        const totalWidth = Math.min(
                            elementWidth + 18 + descriptionWidth + 20, // largeur optimale
                            doc.page.width - startX - 50 // largeur maximum (marge droite)
                        );

                        // Si la largeur totale dépasse, on peut réduire la description mais pas l'élément
                        const maxDescWidth = Math.max(100, totalWidth - elementWidth - 38);

                        // Boîte de fond pour l'élément - largeur dynamique
                        doc.roundedRect(startX, startY - 2, totalWidth, 28, 5)
                            .fillOpacity(0.08)
                            .fill(COLORS.accentPrimary)
                            .strokeOpacity(0.2)
                            .stroke(COLORS.accentPrimary);

                        // Restaurer l'opacité et les couleurs
                        doc.restore();
                        doc.save();

                        // Boîte pour l'élément principal - largeur adaptée au contenu
                        doc.roundedRect(startX + 6, startY + 2, elementWidth, 18, 3)
                            .fill(COLORS.accentPrimary);

                        // Restaurer et configurer pour le texte de l'élément
                        doc.restore();
                        doc.save();
                        doc.fontSize(11)
                            .font('Helvetica-Bold')
                            .fillColor('#FFFFFF');

                        // Texte de l'élément - centré dans sa boîte
                        doc.text(element, startX + 6, startY + 6, {
                            width: elementWidth,
                            align: 'center',
                            lineBreak: false,
                            continued: false
                        });

                        // Restaurer et configurer pour la description
                        doc.restore();
                        doc.fontSize(11)
                            .font('Helvetica')
                            .fillColor(COLORS.textDark);

                        // Description - avec largeur calculée dynamiquement
                        doc.text(description, startX + elementWidth + 18, startY + 6, {
                            width: maxDescWidth,
                            lineBreak: false,
                            continued: false
                        });

                        // Repositionner manuellement le curseur
                        doc.x = startX;
                        doc.y = startY + 35;
                    }
                }
                else if (/^[\s]*[\•\-\*\d+\.]\s+/.test(trimmedLine)) {
                    const bulletMatch = trimmedLine.match(/^[\s]*([\•\-\*\d+\.])\s+(.+)$/);
                    if (bulletMatch) {
                        const bullet = bulletMatch[1];
                        const text = bulletMatch[2];

                        doc.fontSize(12)
                            .fillColor(COLORS.accentPrimary)
                            .font('Helvetica-Bold')
                            .text(bullet, { continued: true })
                            .fillColor(COLORS.textMuted)
                            .font('Helvetica')
                            .text('  ' + text)
                            .moveDown(0.3);
                    }
                }
                else if (/^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ]{2,}\s+/.test(trimmedLine)) {
                    const parts = trimmedLine.split(/\s+/);
                    const keyword = parts[0];
                    const rest = parts.slice(1).join(' ');

                    doc.fontSize(13)
                        .fillColor(COLORS.accentPrimary)
                        .font('Helvetica-Bold')
                        .text(keyword, { continued: true })
                        .fillColor(COLORS.textMuted)
                        .font('Helvetica')
                        .text(' ' + rest)
                        .moveDown(0.4);
                }
                else {
                    doc.fontSize(12)
                        .fillColor(COLORS.textDark)
                        .font('Helvetica')
                        .text(trimmedLine, { align: 'left', lineGap: 2 })
                        .moveDown(0.5);
                }
            });
        };

        // Première passe pour collecter les titres et leurs pages
        const tempDoc = new PDFDocument({
            layout: orientation,
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Simuler l'ajout du contenu pour collecter les pages
        currentPage = 2; // Commencer à la page 2 (après la table des matières)
        titlesWithPages = [];

        // Réinitialiser et générer le vrai document
        currentPage = 1;
        titlesWithPages = [];

        // Première passe rapide pour déterminer les pages des titres
        const lines = text.split('\n');
        let isFirstTitle = true;
        let simulatedPage = 2; // Page de départ après table des matières
        let simulatedY = 50; // Position Y simulée

        lines.forEach((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) return;

            // Simulation de saut de page
            if (simulatedY > 700) {
                simulatedPage++;
                simulatedY = 50;
            }

            if (isFirstTitle) {
                isFirstTitle = false;
                titlesWithPages.push({ title: trimmedLine, page: simulatedPage });
                simulatedY += 50; // Espace pour le titre principal
            }
            else if (trimmedLine.endsWith(':') || /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s]+\s*:/.test(trimmedLine)) {
                titlesWithPages.push({ title: trimmedLine, page: simulatedPage });
                simulatedY += 30; // Espace pour les sous-titres
            }
            else {
                simulatedY += 15; // Espace pour le texte normal
            }
        });

        // Ajouter la table des matières
        addTableOfContents(doc, titlesWithPages);

        // Réinitialiser pour le contenu réel
        currentPage = 2;
        addFormattedText(doc, text);
        addFooter(doc);
        doc.end();

    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur interne du serveur lors de la génération du PDF' });
        }
    }
});

async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('🚀 SERVEUR DÉMARRÉ !');
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