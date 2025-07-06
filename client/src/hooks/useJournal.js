// frontend/src/hooks/useJournal.js
import { useState, useEffect, useCallback } from 'react';
import JournalService from '../services/JournalService';
import { useSchedule } from './useSchedule'; // Pour récupérer l'emploi du temps

export const useJournal = () => {
    const [journalEntries, setJournalEntries] = useState({}); // {date-day-time_libelle: entry}
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule(); // Pour les cours du planning

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
    }, []);

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
    }, []);

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

    return {
        journalEntries,
        assignments,
        loading: loading || loadingSchedule, // Combiner les statuts de chargement
        error: error || errorSchedule,       // Combiner les erreurs
        fetchJournalEntries,
        fetchAssignments,
        upsertJournalEntry,
        deleteJournalEntry,
        upsertAssignment,
        deleteAssignment,
    };
};