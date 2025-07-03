// frontend/src/hooks/useClasses.js (mise à jour)
import { useState, useEffect } from 'react';
import ClassService from '../services/ClassService';
import {darken} from "@mui/material";

export const useClasses = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Charger les classes
    const loadClasses = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await ClassService.getClasses();
            setClasses(response.data || []);

        } catch (err) {
            setError(err.message);
            console.error('Erreur chargement classes:', err);
        } finally {
            setLoading(false);
        }
    };

    // Ajouter une classe
    const addClass = async (classData) => {
        try {
            const response = await ClassService.createClass(classData);
            setClasses(prev => [...prev, response.data]);
            return response.data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Modifier une classe
    const updateClass = async (id, classData) => {
        try {
            const response = await ClassService.updateClass(id, classData);
            setClasses(prev => prev.map(cls =>
                cls.id === id ? response.data : cls
            ));
            return response.data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Supprimer une classe
    const removeClass = async (id) => {
        try {
            await ClassService.deleteClass(id);
            setClasses(prev => prev.filter(cls => cls.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Générer une couleur basée sur la matière
    const getClassColor = (subject, level) => {
        // Palette étendue avec des couleurs plus distinctes par niveau et matière.
        // L'objectif est une différenciation rapide et claire.
        const extendedColors = {
            'Informatique_3': '#93C5FD', // Bleu clair
            'Informatique_4': '#1D4ED8', // Bleu foncé
            'Informatique_5': '#1E3A8A', // Bleu très foncé
            'Informatique_6': '#0F172A', // Bleu marine

            // Exp.logiciels - Gamme d'oranges
            'Ex.Logiciels_3': '#FDBA74', // Orange clair
            'Ex.Logiciels_4': '#D97706', // Orange foncé
            'Ex.Logiciels_5': '#B45309', // Orange très foncé
            'Ex.Logiciels_6': '#78350F', // Orange brun

            // Programmation - Gamme de violets
            'Programmation_3': '#C4B5FD', // Violet clair
            'Programmation_4': '#7C3AED', // Violet foncé
            'Programmation_5': '#5B21B6', // Violet très foncé
            'Programmation_6': '#3C1363', // Violet profond

            // Database - Gamme de verts
            'Database_3': '#86EFAC', // Vert clair
            'Database_4': '#059669', // Vert foncé
            'Database_5': '#047857', // Vert très foncé
            'Database_6': '#064E3B', // Vert profond

            // Couleur par défaut si la matière ou le niveau ne correspondent pas
            'default': '#475569' // Un gris légèrement plus foncé pour un meilleur contraste par défaut
        };

        // Construire la clé de combinaison (ex: "Informatique_3")
        const combinationKey = `${subject}_${level}`;

        // Tenter de trouver la couleur spécifique à la combinaison matière_niveau
        if (extendedColors[combinationKey]) {
            return extendedColors[combinationKey];
        }


        const baseSubjectColorsFallback = {
            'Informatique': '#3B82F6',
            'Exp.logiciels': '#F59E0B',
            'Programmation': '#8B5CF6',
            'Database': '#10B981'
        };
        if (baseSubjectColorsFallback[subject]) {
            return baseSubjectColorsFallback[subject];
        }

        return extendedColors.default; // Fallback final
    };

    const getClassShortName = (name) => {
        // Exemple: "Classe 1A" -> "1A", "BTS SIO 1" -> "SIO1"
        const words = name.split(' ');
        if (words.length === 1) {
            return name.substring(0, 6);
        }

        // Prendre les parties importantes
        return words
            .map(word => {
                if (/\d/.test(word)) return word; // Garder les mots avec des chiffres
                return word.charAt(0).toUpperCase(); // Première lettre des autres
            })
            .join('')
            .substring(0, 8);
    };

    // Transformer les classes pour l'horaire
    const getClassesForSchedule = () => {
        return classes.map(cls => ({
            ...cls,
            color: getClassColor(cls.subject, cls.level),
            shortName: getClassShortName(cls.name)
        }));
    };

    // Obtenir les matières uniques
    const getUniqueSubjects = () => {
        return [...new Set(classes.map(cls => cls.subject))];
    };

    // Charger les classes au montage du composant
    useEffect(() => {
        loadClasses().then(r => {
            console.log('Classes chargées:', r);
        });
    }, []);

    return {
        classes,
        loading,
        error,
        loadClasses,
        addClass,
        updateClass,
        removeClass,
        getClassesForSchedule,
        getClassColor,
        getClassShortName,
        getUniqueSubjects
    };
};
