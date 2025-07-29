import { useState, useEffect, useCallback } from 'react';
import { getConseilDataForClass, saveStudentConseil } from '../services/ConseilClasseService';
import { debounce } from 'lodash';

/**
 * Hook personnalisé pour gérer la logique du conseil de classe.
 * @param {number} classId - L'ID de la classe à gérer.
 */
export const useConseilDeClasse = (classId) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingStatus, setSavingStatus] = useState({}); // Pour suivre l'état de sauvegarde par élève

    // Fonction pour charger les données initiales
    useEffect(() => {
        if (!classId) return;

        const fetchStudents = async () => {
            try {
                setLoading(true);
                const response = await getConseilDataForClass(classId);
                if (response.success) {
                    setStudents(response.data);
                } else {
                    throw new Error(response.message || 'Erreur lors de la récupération des données.');
                }
            } catch (err) {
                setError(err.message || 'Une erreur est survenue.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [classId]); // Se déclenche quand classId change

    // Sauvegarde les modifications pour un étudiant spécifique
    const saveChanges = async (studentId, data) => {
        setSavingStatus(prev => ({ ...prev, [studentId]: 'saving' }));
        try {
            await saveStudentConseil(studentId, data);
            setSavingStatus(prev => ({ ...prev, [studentId]: 'saved' }));
            // Cache l'indicateur "sauvegardé" après 2 secondes
            setTimeout(() => setSavingStatus(prev => ({ ...prev, [studentId]: null })), 2000);
        } catch (err) {
            setSavingStatus(prev => ({ ...prev, [studentId]: 'error' }));
        }
    };

    // Crée une version "debounce" de la sauvegarde pour ne pas surcharger le serveur
    const debouncedSaveChanges = useCallback(debounce(saveChanges, 1000), []);

    // Gère les changements sur les inputs (notes et décision)
    const handleStudentChange = (studentId, field, value) => {
        // Met à jour l'état local immédiatement pour une UI réactive
        const updatedStudents = students.map(student =>
            student.id === studentId ? { ...student, [field]: value } : student
        );
        setStudents(updatedStudents);

        // Prépare et sauvegarde les données modifiées
        const dataToSave = { [field]: value };
        debouncedSaveChanges(studentId, dataToSave);
    };

    return { students, loading, error, savingStatus, handleStudentChange };
};