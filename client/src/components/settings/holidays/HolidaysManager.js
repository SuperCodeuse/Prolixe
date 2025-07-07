import React, { useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import './HolidaysManager.scss';

const HolidaysManager = () => {
    const { success, error: showError } = useToast();
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            setFileName('');
            return;
        }

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const holidays = JSON.parse(content);

                // Validation simple du format
                if (!Array.isArray(holidays) || !holidays.every(h => h.name && h.start && h.end)) {
                    throw new Error('Format de fichier JSON invalide.');
                }

                // Stocker les données dans le localStorage
                localStorage.setItem('schoolHolidays', JSON.stringify(holidays));
                success(`Calendrier "${file.name}" importé avec succès !`);

            } catch (err) {
                showError(err.message || 'Erreur lors de la lecture du fichier.');
                setFileName('');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="holidays-manager">
            <h2>📅 Gestion des Congés Scolaires</h2>
            <p>Importez un fichier JSON contenant la liste des congés pour les synchroniser avec l'agenda.</p>

            <div className="import-area">
                <label htmlFor="holiday-file-input" className="btn-primary">
                    <span>📤</span>
                    Importer un fichier JSON
                </label>
                <input
                    id="holiday-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                {fileName && <span className="file-name">Fichier sélectionné : {fileName}</span>}
            </div>

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