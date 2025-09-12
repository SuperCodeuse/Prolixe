import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import HolidaysManagerService from '../../../services/HolidaysManagerService'; // Importez le nouveau service
import { useToast } from '../../../hooks/useToast';

import './HolidaysManager.scss';

const HolidaysManager = () => {
    const { user } = useAuth();
    const { success: showSuccess, error : showError } = useToast();
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            setFileName('');
            return;
        }

        setFileName(file.name);
        setIsLoading(true);

        try {
            await HolidaysManagerService.uploadHolidaysFile(file);
            showSuccess(`Le calendrier "${file.name}" a été importé avec succès !`);
        } catch (error) {
            console.error('Erreur lors de l\'envoi du fichier:', error);
            showError(error.message || 'Erreur lors du téléchargement du fichier.');
            setFileName('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="holidays-manager">
            <h2>📅 Gestion des Congés Scolaires</h2>
            <p>Importez un fichier JSON contenant la liste des congés pour les synchroniser avec l'agenda.</p>

            {user?.role === 'ADMIN' ? (
                <div className="import-area">
                    <label htmlFor="holiday-file-input" className={`btn-primary ${isLoading ? 'disabled' : ''}`}>
                        <span>📤</span>
                        {isLoading ? 'Importation en cours...' : 'Importer un fichier JSON'}
                    </label>
                    <input
                        id="holiday-file-input"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        disabled={isLoading}
                    />
                    {fileName && <span className="file-name">Fichier sélectionné : {fileName}</span>}
                </div>
            ) : (
                <p>Cette fonctionnalité est réservée aux administrateurs.</p>
            )}

            <div className="help-box">
                <h4>Format attendu du fichier JSON</h4>
                <p>Le fichier doit être un tableau d'objets, où chaque objet représente une période de congé et contient les clés "name", "start" et "end" (format YYYY-MM-DD).</p>
                <pre>
{`[
  {
    "name": "Congé d'automne",
    "start": "2024-10-21",
    "end": "2024-11-03"
  },
  {
    "name": "Armistice",
    "start": "2024-11-11",
    "end": "2024-11-11"
  }
]`}
                </pre>
            </div>
        </div>
    );
};

export default HolidaysManager;