// client/src/components/ImportJournal.js
import React, { useState } from 'react';
import {
    Paper,
    Typography,
    Box,
    Button,
    Alert,
    CircularProgress,
    LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { importService } from '../services/api';

export default function ImportJournal() {
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setImporting(true);
            setError('');
            setResult(null);

            const text = await file.text();
            const jsonData = JSON.parse(text);

            const response = await importService.importJournal(jsonData);
            setResult(response.data);

        } catch (err) {
            console.error('Erreur import:', err);
            setError(err.response?.data?.error || err.message || 'Erreur lors de l\'import');
        } finally {
            setImporting(false);
        }
    };

    const handlePasteJSON = () => {
        const jsonText = prompt('Collez votre JSON ici:');
        if (!jsonText) return;

        try {
            setImporting(true);
            setError('');
            setResult(null);

            const jsonData = JSON.parse(jsonText);

            importService.importJournal(jsonData)
                .then(response => {
                    setResult(response.data);
                })
                .catch(err => {
                    setError(err.response?.data?.error || err.message || 'Erreur lors de l\'import');
                })
                .finally(() => {
                    setImporting(false);
                });

        } catch (err) {
            setError('JSON invalide');
            setImporting(false);
        }
    };

    return (
        <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>
                Importer le journal de classe
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                Importez votre journal de classe existant au format JSON pour conserver vos données.
            </Typography>

            {importing && (
                <Box sx={{ mb: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                        Import en cours...
                    </Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {result && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Import réussi !</Typography>
                    <Typography variant="body2">
                        {result.message}
                    </Typography>
                </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    disabled={importing}
                    sx={{ flex: 1 }}
                >
                    Choisir un fichier JSON
                    <input
                        type="file"
                        accept=".json"
                        hidden
                        onChange={handleFileUpload}
                    />
                </Button>

                <Button
                    variant="outlined"
                    onClick={handlePasteJSON}
                    disabled={importing}
                    sx={{ flex: 1 }}
                >
                    Coller le JSON
                </Button>
            </Box>

            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                Le fichier JSON sera analysé et vos cours seront automatiquement importés dans l'application.
            </Typography>
        </Paper>
    );
}
