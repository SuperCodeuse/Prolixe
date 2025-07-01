// frontend/src/hooks/useClasses.js
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

    // Charger les classes au montage du composant
    useEffect(() => {
        loadClasses().then(r =>
        console.log(r)
        );
    }, []);

    return {
        classes,
        loading,
        error,
        loadClasses,
        addClass,
        updateClass,
        removeClass
    };
};
