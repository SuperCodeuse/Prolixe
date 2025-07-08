// client/src/hooks/useJournal.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import JournalService from '../services/JournalService';

const JournalContext = createContext(null);

export const JournalProvider = ({ children }) => {
    const [journals, setJournals] = useState([]);
    const [currentJournal, setCurrentJournal] = useState(null);
    const [archivedJournals, setArchivedJournals] = useState([]);
    const [journalEntries, setJournalEntries] = useState([]); // Changé pour un tableau
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const fetchJournalEntries = useCallback(async (startDate, endDate) => {
        if (!startDate || !endDate || !currentJournal) return;
        setLoading(true);
        setError(null);
        try {
            const response = await JournalService.getJournalEntries(startDate, endDate, currentJournal.id);
            setJournalEntries(response.data || []); // Stocker directement le tableau
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
        if (!currentJournal) throw new Error("Aucun journal sélectionné.");
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
        setError(null);
        try {
            await JournalService.deleteJournalEntry(id);
            setJournalEntries(prev => prev.filter(a => a.id !== id));
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
        journals, currentJournal, archivedJournals, selectJournal, loadAllJournals, createJournal, archiveJournal,
        journalEntries, assignments, loading, error, fetchJournalEntries, fetchAssignments,
        upsertJournalEntry, deleteJournalEntry, upsertAssignment, deleteAssignment,
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