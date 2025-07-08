// frontend/src/hooks/useJournal.js
import {useState, useEffect, useCallback, useContext} from 'react';
import JournalService from '../services/JournalService';
import { useSchedule } from './useSchedule'; // Pour récupérer l'emploi du temps

export const JournalProvider = () => {
    const [journals, setJournals] = useState([]);
    const [currentJournal, setCurrentJournal] = useState(null);
    const [archivedJournals, setArchivedJournals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [journalEntries, setJournalEntries] = useState({});
    const [assignments, setAssignments] = useState([]);

    const loadAllJournals = useCallback(async () => {
        setLoading(true);
        try {
            const response = await JournalService.getAllJournals();
            const all = response.data || [];
            setJournals(all);

            const current = all.find(j => j.is_current && !j.is_archived);
            const archived = all.filter(j => j.is_archived);

            // Tente de charger le dernier journal sélectionné depuis le localStorage
            const lastSelectedId = localStorage.getItem('prolixe_currentJournalId');
            const lastSelected = all.find(j => j.id === parseInt(lastSelectedId));

            setCurrentJournal(lastSelected || current || null);
            setArchivedJournals(archived);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllJournals();
    }, [loadAllJournals]);

    const selectJournal = (journal) => {
        setCurrentJournal(journal);
        localStorage.setItem('prolixe_currentJournalId', journal.id);
    };


    // Fetch journal entries for a given week/period
    const fetchJournalEntries = useCallback(async (startDate, endDate) => {
        if (!startDate || !endDate) return;
        setLoading(true);
        setError(null);
        try {
            const response = await JournalService.getJournalEntries(startDate, endDate);
            const formattedEntries = {};
            response.data.forEach(entry => {
                const slotKey = `${entry.day}-${entry.time_slot_libelle}-${entry.date}`; // Utilise time_slot_libelle
                formattedEntries[slotKey] = entry;

            });
            setJournalEntries(formattedEntries);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération des entrées du journal.');
        } finally {
            setLoading(false);
        }
    }, []); // Les fonctions de mise à jour d'état (set...) sont stables et n'ont pas besoin d'être listées.

    // Fetch assignments
    const fetchAssignments = useCallback(async (classId, startDate, endDate) => {
        setLoading(true); // Ou un état de chargement séparé
        setError(null);
        try {
            const response = await JournalService.getAssignments(classId, startDate, endDate);
            setAssignments(response.data);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération des assignations.');
        } finally {
            setLoading(false);
        }
    }, []); // Les fonctions de mise à jour d'état (set...) sont stables et n'ont pas besoin d'être listées.

    // **NOUVEAU useEffect pour charger les données au montage**
    useEffect(() => {
        // Charger toutes les assignations au démarrage
        fetchAssignments();
    }, [fetchAssignments]);


    // Upsert journal entry
    const upsertJournalEntry = useCallback(async (entryData) => {
        setError(null);
        try {
            const response = await JournalService.upsertJournalEntry(entryData);
            const newEntry = response.data;
            setJournalEntries(prev => {
                const slotKey = `${newEntry.day}-${newEntry.time_slot_libelle}-${newEntry.date}`; // Utilise time_slot_libelle
                return { ...prev, [slotKey]: newEntry };
            });
            return newEntry;
        } catch (err) {
            setError(err.message || 'Erreur lors de la sauvegarde de l\'entrée de journal.');
            throw err;
        }
    }, []);

    // Delete journal entry
    const deleteJournalEntry = useCallback(async (id) => {
        setError(null);
        try {
            await JournalService.deleteJournalEntry(id);
            setJournalEntries(prev => {
                const newEntries = { ...prev };
                // Trouver la clé pour l'entrée supprimée (par ID)
                for (const key in newEntries) {
                    if (newEntries[key].id === id) {
                        delete newEntries[key];
                        break;
                    }
                }
                return newEntries;
            });
        } catch (err) {
            setError(err.message || 'Erreur lors de la suppression de l\'entrée de journal.');
            throw err;
        }
    }, []);

    // Upsert assignment
    const upsertAssignment = useCallback(async (assignmentData) => {
        setError(null);
        try {
            const response = await JournalService.upsertAssignment(assignmentData);
            const newAssignment = response.data;
            setAssignments(prev => {
                const existingIndex = prev.findIndex(a => a.id === newAssignment.id);
                if (existingIndex > -1) {
                    return prev.map((a, i) => (i === existingIndex ? newAssignment : a));
                }
                return [...prev, newAssignment];
            });
            return newAssignment;
        } catch (err) {
            setError(err.message || 'Erreur lors de la sauvegarde de l\'assignation.');
            throw err;
        }
    }, []);

    // Delete assignment
    const deleteAssignment = useCallback(async (id) => {
        setError(null);
        try {
            await JournalService.deleteAssignment(id);
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message || 'Erreur lors de la suppression de l\'assignation.');
            throw err;
        }
    }, []);

    const updateAssignmentInState = useCallback((updatedAssignment) => {
        setAssignments(prev => prev.map(assignment =>
            assignment.id === updatedAssignment.id
                ? { ...assignment, ...updatedAssignment }
                : assignment
        ));
    }, []);

    const value = {
        journals,
        currentJournal,
        archivedJournals,
        journalEntries,
        assignments,
        selectJournal,
        loadAllJournals,
        loading: loading || loadingSchedule, // Combiner les statuts de chargement
        error: error || errorSchedule,       // Combiner les erreurs
        fetchJournalEntries,
        fetchAssignments,
        upsertJournalEntry,
        deleteJournalEntry,
        upsertAssignment,
        deleteAssignment,
        updateAssignmentInState
    };

    return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
};

export const useJournal = () => {
    const context = useContext(JournalContext);
    if (!context) {
        throw new Error('useJournal doit être utilisé à l\'intérieur d\'un JournalProvider');
    }
    return context;
};
