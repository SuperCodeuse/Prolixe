import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvaluations } from '../../services/EvaluationService'; // Assurez-vous d'avoir cette fonction dans votre service
import './CorrectionList.scss'; // Nous allons créer ce fichier de style

const CorrectionList = () => {
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEvaluations = async () => {
            try {
                const response = await getEvaluations();
                console.log(response);
                setEvaluations(response.data);
            } catch (err) {
                setError('Impossible de charger les évaluations.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvaluations();
    }, []);

    if (loading) return <div>Chargement des évaluations...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="correction-list-view">
            <h1>Évaluations à corriger</h1>
            <div className="evaluations-container">
                {evaluations.length > 0 ? (
                    evaluations.map(ev => (
                        <Link to={`/correction/${ev.id}`} key={ev.id} className="evaluation-card">
                            <h2>{ev.name}</h2>
                            <p>Classe: {ev.class_name}</p>
                            <p>Date: {new Date(ev.date).toLocaleDateString('fr-FR')}</p>
                        </Link>
                    ))
                ) : (
                    <p>Aucune évaluation à afficher.</p>
                )}
            </div>
        </div>
    );
};

export default CorrectionList;