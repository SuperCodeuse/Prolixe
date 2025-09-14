// client/src/hooks/useJournal.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import JournalService from '../services/JournalService';

const JournalContext = createContext(null);

export const JournalProvider = ({ children }) => {
    const [journals, setJournals] = useState([]);
    const [currentJournal, setCurrentJournal] = useState(null); // Initialisé à null
    const [archivedJournals, setArchivedJournals] = useState([]);
    const [journalEntries, setJournalEntries] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAllJournals = useCallback(async () => {
        setLoading(true);
        try {
            const response = await JournalService.getAllJournals();
            const all = response.data;
            const journalsArray = all.data || []; // Accéder au tableau dans la propriété `data`

            setJournals(all);

            const current = journalsArray.find(j => j.is_current && !j.is_archived);
            const archived = journalsArray.filter(j => j.is_archived);
            const lastSelectedId = localStorage.getItem('prolixe_currentJournalId');
            const lastSelected = journalsArray.find(j => j.id === parseInt(lastSelectedId));

            const journalToSet = lastSelected || current || journalsArray.find(j => !j.is_archived);

            setCurrentJournal(journalToSet);
            setArchivedJournals(archived);
        } catch (err) {
            // Log the error for debugging purposes
            console.error("Failed to load journals:", err);
            setError(err.message || "Erreur lors du chargement des journaux.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllJournals();
    }, [loadAllJournals]);

    useEffect(() => {
        if (currentJournal) {

        }
    }, [currentJournal]); // Se déclenche à chaque fois que currentJournal change

    const selectJournal = (journal) => {
        if (journal && journal.id) {
            setCurrentJournal(journal);
            localStorage.setItem('prolixe_currentJournalId', journal.id);
        }
    };

    // Les autres fonctions qui dépendent de currentJournal (comme fetchJournalEntries, fetchAssignments) sont déjà des `useCallback`
    // avec `[currentJournal]` comme dépendance, ce qui est une bonne pratique.
    // Elles seront donc recréées et pourront utiliser la nouvelle valeur de `currentJournal` au prochain rendu.

    const clearJournal = useCallback(async (journalId) => {
        try {
            await JournalService.clearJournal(journalId);
            if (currentJournal && currentJournal.id === journalId) {
                setJournalEntries([]);
            }
        } catch (err) {
            throw err;
        }
    }, [currentJournal]);

    const createJournal = useCallback(async (journalData) => {
        try {
            const response = await JournalService.createJournal(journalData);
            await loadAllJournals();
            return response.data;
        } catch (err) {
            setError(err.message || "Erreur lors de la création du journal.");
            throw err;
        }
    }, [loadAllJournals]);

    const archiveJournal = useCallback(async (journalId) => {
        try {
            await JournalService.archiveJournal(journalId);
            await loadAllJournals();
        } catch (err) {
            setError(err.message || "Erreur lors de l'archivage du journal.");
            throw err;
        }
    }, [loadAllJournals]);

    const deleteArchivedJournal = useCallback(async (journalId) => {
        try {
            await JournalService.deleteJournal(journalId);
            await loadAllJournals();
        } catch (err) {
            setError(err.message || "Erreur lors de la suppression du journal.");
            throw err;
        }
    }, [loadAllJournals]);

    const fetchJournalEntries = useCallback(async (startDate, endDate) => {
        if (!startDate || !endDate || !currentJournal) return;
        setLoading(true);
        setError(null);
        try {
            const response = await JournalService.getJournalEntries(startDate, endDate, currentJournal.id);
            setJournalEntries(response.data || []);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération des entrées du journal.');
        } finally {
            setLoading(false);
        }
    }, [currentJournal]);

    const fetchAssignments = useCallback(async (classId, startDate, endDate) => {
        if (!currentJournal) {
            setAssignments([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await JournalService.getAssignments(currentJournal.id, classId, startDate, endDate);
            setAssignments(response.data.data || []);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération des devoirs.');
        } finally {
            setLoading(false);
        }
    }, [currentJournal]);

    const upsertJournalEntry = useCallback(async (entryData) => {
        if (!currentJournal) throw new Error("Aucun journal sélectionné.");
        if (currentJournal.is_archived) throw new Error("Impossible de modifier un journal archivé.");
        setError(null);
        try {
            const dataWithJournalId = { ...entryData, journal_id: currentJournal.id };
            const response = await JournalService.upsertJournalEntry(dataWithJournalId);
            const newEntry = response.data;
            setJournalEntries(prev => {
                const index = prev.findIndex(e => e.id === newEntry.id);
                if (index > -1) {
                    const newEntries = [...prev];
                    newEntries[index] = newEntry;
                    return newEntries;
                }
                return [...prev, newEntry];
            });
            return newEntry;
        } catch (err) {
            setError(err.message || "Erreur lors de la sauvegarde de l'entrée de journal.");
            throw err;
        }
    }, [currentJournal]);

    const deleteJournalEntry = useCallback(async (id) => {
        if (currentJournal && currentJournal.is_archived) throw new Error("Impossible de modifier un journal archivé.");
        setError(null);
        try {
            await JournalService.deleteJournalEntry(id);
            setJournalEntries(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message || "Erreur lors de la suppression de l'entrée de journal.");
            throw err;
        }
    }, [currentJournal]);

    const upsertAssignment = useCallback(async (assignmentData) => {
        if (!currentJournal) throw new Error("Aucun journal sélectionné.");
        if (currentJournal.is_archived) throw new Error("Impossible de modifier un journal archivé.");
        setError(null);
        try {
            const dataWithJournalId = { ...assignmentData, journal_id: currentJournal.id };
            const response = await JournalService.upsertAssignment(dataWithJournalId);
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
    }, [currentJournal]);

    const deleteAssignment = useCallback(async (id) => {
        if (currentJournal && currentJournal.is_archived) throw new Error("Impossible de modifier un journal archivé.");
        setError(null);
        try {
            await JournalService.deleteAssignment(id);
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message || "Erreur lors de la suppression du devoir.");
            throw err;
        }
    }, [currentJournal]);

    const value = {
        journals, currentJournal, archivedJournals, selectJournal, loadAllJournals, createJournal, archiveJournal, deleteArchivedJournal,
        journalEntries, assignments, loading, error, fetchJournalEntries, fetchAssignments,
        upsertJournalEntry, deleteJournalEntry, upsertAssignment, deleteAssignment,clearJournal
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