// frontend/src/hooks/useClasses.js (mise à jour)
import { useState, useEffect } from 'react';
import ClassService from '../services/ClassService';

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

    // NOUVELLES FONCTIONS UTILITAIRES POUR L'HORAIRE
    // Générer une couleur basée sur la matière
    const getClassColor = (subject) => {
        const colors = {
            'Informatique': '#3B82F6',      // Bleu
            'Exp.logiciels': '#10B981',     // Vert
            'Programmation': '#8B5CF6',     // Violet
            'Database': '#F59E0B',          // Orange
            'Mathématiques': '#EF4444',     // Rouge
            'Français': '#14B8A6',          // Teal
            'Anglais': '#F97316',           // Orange foncé
            'Histoire': '#8B5CF6',          // Violet
            'default': '#6B7280'            // Gris par défaut
        };
        return colors[subject] || colors.default;
    };

    // Générer un nom court pour l'affichage dans l'horaire
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
            color: getClassColor(cls.subject),
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
        // Nouvelles fonctions pour l'horaire
        getClassesForSchedule,
        getClassColor,
        getClassShortName,
        getUniqueSubjects
    };
};
