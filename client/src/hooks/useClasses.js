import { useState, useEffect, useCallback } from 'react';
import ClassService from '../services/ClassService';

/**
 * Hook pour gérer les données des classes, désormais dépendant d'une année scolaire.
 * @param {number|string} schoolYearId - L'ID de l'année scolaire sélectionnée.
 */
export const useClasses = (schoolYearId) => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadClasses = useCallback(async () => {
        if (!schoolYearId) {
            setClasses([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await ClassService.getClasses(schoolYearId);
            setClasses(response.data || []);
        } catch (err) {
            setError(err.message);
            console.error('Erreur chargement classes:', err);
        } finally {
            setLoading(false);
        }
    }, [schoolYearId]); // La dépendance est `schoolYearId`

    // Cet effet se déclenche au montage et à chaque fois que `loadClasses` est recréé (donc quand `schoolYearId` change).
    useEffect(() => {
        loadClasses();
    }, [loadClasses]);

    // Ajouter une classe en injectant automatiquement l'ID de l'année scolaire.
    const addClass = async (classData) => {
        if (!schoolYearId) {
            throw new Error("Impossible d'ajouter une classe sans année scolaire sélectionnée.");
        }
        try {
            const dataToSend = { ...classData, school_year_id: schoolYearId };
            const response = await ClassService.createClass(dataToSend);
            setClasses(prev => [...prev, response.data]);
            return response.data;
        } catch (err) {
            setError(err.message);
            throw err; // Propage l'erreur pour la gérer dans le composant
        }
    };

    // Mettre à jour une classe.
    const updateClass = async (id, classData) => {
        try {
            const response = await ClassService.updateClass(id, classData);
            setClasses(prev => prev.map(cls => (cls.id === id ? response.data : cls)));
            return response.data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Supprimer une classe.
    const removeClass = async (id) => {
        try {
            await ClassService.deleteClass(id);
            setClasses(prev => prev.filter(cls => cls.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Les fonctions utilitaires restent inchangées.
    const getClassColor = (subject, level) => {
        const extendedColors = {
            'Informatique_3': '#93C5FD', 'Informatique_4': '#1D4ED8', 'Informatique_5': '#1E3A8A', 'Informatique_6': '#0F172A',
            'Exp.logiciels_3': '#FDBA74', 'Exp.logiciels_4': '#D97706', 'Exp.logiciels_5': '#B45309', 'Exp.logiciels_6': '#78350F',
            'Programmation_3': '#C4B5FD', 'Programmation_4': '#7C3AED', 'Programmation_5': '#5B21B6', 'Programmation_6': '#3C1363',
            'Database_3': '#86EFAC', 'Database_4': '#059669', 'Database_5': '#047857', 'Database_6': '#064E3B',
            'default': '#475569'
        };
        const combinationKey = `${subject}_${level}`;
        if (extendedColors[combinationKey]) return extendedColors[combinationKey];
        const baseSubjectColorsFallback = { 'Informatique': '#3B82F6', 'Exp.logiciels': '#F59E0B', 'Programmation': '#8B5CF6', 'Database': '#10B981' };
        return baseSubjectColorsFallback[subject] || extendedColors.default;
    };

    const getClassShortName = (name) => {
        const words = name.split(' ');
        if (words.length === 1) return name.substring(0, 6);
        return words.map(word => /\d/.test(word) ? word : word.charAt(0).toUpperCase()).join('').substring(0, 8);
    };

    const getClassesForSchedule = () => classes.map(cls => ({ ...cls, color: getClassColor(cls.subject, cls.level), shortName: getClassShortName(cls.name) }));
    const getUniqueSubjects = () => [...new Set(classes.map(cls => cls.subject))];

    return {
        classes,
        loading,
        error,
        loadClasses,
        addClass,
        updateClass,
        removeClass,
        getClassesForSchedule,
        getUniqueSubjects,
        getClassColor,
        getClassShortName
    };
};