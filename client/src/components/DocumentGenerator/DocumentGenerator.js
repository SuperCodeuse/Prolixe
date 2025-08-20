import React, { useState } from 'react';
import './DocumentGenerator.scss';
import {format} from "date-fns";
import {fr} from "date-fns/locale";

const DocumentGenerator = () => {
    const [text, setText] = useState('');
    const [orientation, setOrientation] = useState('portrait');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError("Veuillez entrer du texte pour générer le document.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/generate-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, orientation }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la génération du document');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const formattedDate = format(new Date(), 'yyyy-MM-dd-HH-mm-ss', { locale: fr });
            a.download = `document-${formattedDate}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erreur de génération:", error);
            setError(`Une erreur est survenue: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>Générateur de Document</h1>
                    <p>Collez le texte à formater pour générer un document PDF.</p>
                </div>
            </header>

            <div className="document-generator-container">
                <textarea
                    className="document-generator__textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Entrez votre texte ici..."
                    aria-label="Texte à générer"
                />

                <div className="document-generator__options">
                    <label className={orientation === 'portrait' ? 'selected' : ''}>
                        <input
                            type="radio"
                            value="portrait"
                            checked={orientation === 'portrait'}
                            onChange={(e) => setOrientation(e.target.value)}
                        />
                        <span className="icon">📄</span>
                        <span>A4 Portrait</span>
                    </label>

                    <label className={orientation === 'landscape' ? 'selected' : ''}>
                        <input
                            type="radio"
                            value="landscape"
                            checked={orientation === 'landscape'}
                            onChange={(e) => setOrientation(e.target.value)}
                        />
                        <span className="icon">🏞️</span>
                        <span>A4 Paysage</span>
                    </label>
                </div>

                {error && (
                    <div className="document-generator__error">
                        {error}
                    </div>
                )}

                <button
                    className="document-generator__button"
                    onClick={handleGenerate}
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading ? 'Génération...' : 'Générer le document'}
                </button>
            </div>
        </div>
    );
};

export default DocumentGenerator;