import React, { useState, useEffect } from 'react';
import { useSchoolYears } from './useSchoolYear'; // Assurez-vous que le chemin est correct


const SchoolYearDisplay = ({ schoolYearId }) => {
    const [displayName, setDisplayName] = useState('...'); // Affiche "..." pendant le chargement
    const { getSchoolYearName } = useSchoolYears();

    useEffect(() => {
        let isMounted = true; // Pour éviter les mises à jour sur un composant démonté

        const fetchName = async () => {
            if (!schoolYearId) {
                setDisplayName(''); // Si pas d'ID, on n'affiche rien
                return;
            }
            const name = await getSchoolYearName(schoolYearId);
            if (isMounted) {
                setDisplayName(name);
            }
        };

        fetchName();

        return () => {
            isMounted = false; // Nettoyage au démontage
        };
    }, [schoolYearId, getSchoolYearName]); // Se ré-exécute si l'ID ou la fonction change

    return <>{displayName}</>;
};

export default SchoolYearDisplay;
