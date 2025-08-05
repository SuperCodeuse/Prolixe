import { useState, useEffect, useCallback } from 'react';
import { getConseilDataForClass, saveStudentConseil } from '../services/ConseilClasseService';
import { debounce } from 'lodash';
// On importe le hook useJournal pour obtenir le journalId directement si ce n'est pas passé en paramètre
// mais la meilleure pratique est de le passer en paramètre pour un couplage faible.
import { useJournal } from './useJournal';

/**
 * Hook personnalisé pour gérer la logique du conseil de classe.
 * @param {number} classId - L'ID de la classe à gérer.
 * @param {number} journalId - L'ID du journal (année scolaire) en cours.
 */
export const useConseilDeClasse = (classId, journalId) => { // MODIFIÉ : Ajout de journalId en paramètre
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false); // Initialisé à false, se met à true seulement si on charge
    const [error, setError] = useState(null);
    const [savingStatus, setSavingStatus] = useState({});

    // Fonction pour charger les données initiales
    useEffect(() => {
        // MODIFIÉ : Ne rien faire si classId ou journalId sont manquants
        if (!classId || !journalId) {
            setStudents([]); // Vider les étudiants si pas de classe/journal sélectionné
            return;
        }

        const fetchStudents = async () => {
            try {
                setLoading(true);
                setError(null); // Réinitialiser les erreurs précédentes
                // Le service pourrait aussi avoir besoin du journalId, à adapter si nécessaire
                const response = await getConseilDataForClass(classId, journalId);
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
    }, [classId, journalId]); // MODIFIÉ : Le hook réagit aussi au changement de journal

    // Sauvegarde les modifications pour un étudiant spécifique
    const saveChanges = async (studentId, data) => {
        setSavingStatus(prev => ({ ...prev, [studentId]: 'saving' }));
        try {
            await saveStudentConseil(studentId, data); // La data contient maintenant le journal_id
            setSavingStatus(prev => ({ ...prev, [studentId]: 'saved' }));
            setTimeout(() => setSavingStatus(prev => ({ ...prev, [studentId]: null })), 2000);
        } catch (err) {
            setSavingStatus(prev => ({ ...prev, [studentId]: 'error' }));
        }
    };

    // La fonction debounced n'a pas besoin de changer
    const debouncedSaveChanges = useCallback(debounce(saveChanges, 1000), []);

    // Gère les changements sur les inputs (notes et décision)
    const handleStudentChange = (studentId, field, value) => {
        // Met à jour l'état local immédiatement pour une UI réactive
        const updatedStudents = students.map(student =>
            student.id === studentId ? { ...student, [field]: value } : student
        );
        setStudents(updatedStudents);

        // CORRECTION PRINCIPALE : On ajoute journal_id aux données à sauvegarder
        const dataToSave = {
            [field]: value,
            journal_id: journalId, // Ajout de la clé requise par le backend
        };

        // On ne sauvegarde que si journalId est valide
        if (journalId) {
            debouncedSaveChanges(studentId, dataToSave);
        }
    };

    return { students, loading, error, savingStatus, handleStudentChange };
};