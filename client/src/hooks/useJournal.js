// frontend/src/hooks/useJournal.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import JournalService from '../services/JournalService';

// 1. Création du contexte
const JournalContext = createContext(null);

// 2. Création du fournisseur (Provider)
export const JournalProvider = ({ children }) => {
    // State pour la gestion des journaux (années scolaires)
    const [journals, setJournals] = useState([]);
    const [currentJournal, setCurrentJournal] = useState(null);
    const [archivedJournals, setArchivedJournals] = useState([]);

    // State pour les données du journal courant
    const [journalEntries, setJournalEntries] = useState({});
    const [assignments, setAssignments] = useState([]);

    // State de chargement et d'erreur
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- GESTION DES JOURNAUX (Années scolaires) ---

    const loadAllJournals = useCallback(async () => {
        setLoading(true);
        try {
            const response = await JournalService.getAllJournals();
            const all = response.data || [];
            setJournals(all);

            const current = all.find(j => j.is_current && !j.is_archived);
            const archived = all.filter(j => j.is_archived);

            const lastSelectedId = localStorage.getItem('prolixe_currentJournalId');
            const lastSelected = all.find(j => j.id === parseInt(lastSelectedId));

            setCurrentJournal(lastSelected || current || (all.length > 0 ? all[0] : null));
            setArchivedJournals(archived);

        } catch (err) {
            setError(err.message || "Erreur lors du chargement des journaux.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllJournals();
    }, [loadAllJournals]);

    const selectJournal = (journal) => {
        if (journal && journal.id) {
            setCurrentJournal(journal);
            localStorage.setItem('prolixe_currentJournalId', journal.id);
        }
    };

    // --- GESTION DES DONNÉES DU JOURNAL COURANT ---

    const fetchJournalEntries = useCallback(async (startDate, endDate) => {
        if (!startDate || !endDate || !currentJournal) return;
        setLoading(true);
        setError(null);
        try {
            const response = await JournalService.getJournalEntries(startDate, endDate, currentJournal.id);
            const formattedEntries = {};
            if (response.data) {
                response.data.forEach(entry => {
                    const slotKey = `${entry.day}-${entry.time_slot_libelle}-${entry.date}`;
                    formattedEntries[slotKey] = entry;
                });
            }
            setJournalEntries(formattedEntries);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération des entrées du journal.');
        } finally {
            setLoading(false);
        }
    }, [currentJournal]);

    const fetchAssignments = useCallback(async (classId, startDate, endDate) => {
        setLoading(true);
        setError(null);
        try {
            const response = await JournalService.getAssignments(classId, startDate, endDate);
            setAssignments(response.data || []);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération des devoirs.');
        } finally {
            setLoading(false);
        }
    }, []);

    const upsertJournalEntry = useCallback(async (entryData) => {
        if (!currentJournal) {
            throw new Error("Aucun journal sélectionné.");
        }
        setError(null);
        try {
            // Assurer que journal_id est inclus
            const dataWithJournalId = { ...entryData, journal_id: currentJournal.id };
            const response = await JournalService.upsertJournalEntry(dataWithJournalId);
            const newEntry = response.data;
            setJournalEntries(prev => {
                const slotKey = `${newEntry.day}-${newEntry.time_slot_libelle}-${newEntry.date}`;
                return { ...prev, [slotKey]: newEntry };
            });
            return newEntry;
        } catch (err) {
            setError(err.message || "Erreur lors de la sauvegarde de l'entrée de journal.");
            throw err;
        }
    }, [currentJournal]);

    const deleteJournalEntry = useCallback(async (id) => {
        setError(null);
        try {
            await JournalService.deleteJournalEntry(id);
            setJournalEntries(prev => {
                const newEntries = { ...prev };
                const keyToDelete = Object.keys(newEntries).find(key => newEntries[key].id === id);
                if (keyToDelete) {
                    delete newEntries[keyToDelete];
                }
                return newEntries;
            });
        } catch (err) {
            setError(err.message || "Erreur lors de la suppression de l'entrée de journal.");
            throw err;
        }
    }, []);

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
                return [...prev, newAssignment].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
            });
            return newAssignment;
        } catch (err) {
            setError(err.message || "Erreur lors de la sauvegarde du devoir.");
            throw err;
        }
    }, []);

    const deleteAssignment = useCallback(async (id) => {
        setError(null);
        try {
            await JournalService.deleteAssignment(id);
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message || "Erreur lors de la suppression du devoir.");
            throw err;
        }
    }, []);

    const value = {
        journals,
        currentJournal,
        archivedJournals,
        selectJournal,
        loadAllJournals,
        journalEntries,
        assignments,
        loading,
        error,
        fetchJournalEntries,
        fetchAssignments,
        upsertJournalEntry,
        deleteJournalEntry,
        upsertAssignment,
        deleteAssignment,
    };

    return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
};

// 3. Le hook personnalisé pour consommer le contexte
export const useJournal = () => {
    const context = useContext(JournalContext);
    if (!context) {
        throw new Error('useJournal doit être utilisé à l\'intérieur d\'un JournalProvider');
    }
    return context;
};
