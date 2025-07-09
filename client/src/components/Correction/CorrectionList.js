import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CorrectionsList = () => {
    const [evaluations, setEvaluations] = useState([]);

    useEffect(() => {
        // ... logique pour charger les évaluations
        // const fetchedEvals = await EvaluationService.getAllEvaluations();
        // setEvaluations(fetchedEvals.data);
    }, []);

    return (
        <div>
            <h1>Liste des Évaluations</h1>
            {evaluations.map(ev => (
                <div key={ev.id}>
                    <Link to={`/correction/${ev.id}`}>{ev.name}</Link>
                </div>
            ))}
        </div>
    );
};