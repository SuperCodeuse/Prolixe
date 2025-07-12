import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
// 1. Importer le service complet
import JournalService from '../services/JournalService';

const JournalContext = createContext(null);

export const JournalProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();

    // --- State pour la gestion des journaux ---
    const [journals, setJournals] = useState([]);
    const [currentJournal, setCurrentJournal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- State pour les données du journal courant ---
    const [journalEntries, setJournalEntries] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [loadingAssignments, setLoadingAssignments] = useState(false);

    // --- Fonctions de gestion des Journaux (liste) ---

    const fetchJournals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Utilisation de la méthode du service
            const { data } = await JournalService.getAllJournals();
            setJournals(data || []);
            if (data && data.length > 0) {
                const nonArchived = data.filter(j => !j.is_archived);
                // Sélectionne le premier journal non archivé par défaut
                setCurrentJournal(nonArchived.length > 0 ? nonArchived[0] : data[0]);
            } else {
                setCurrentJournal(null);
            }
        } catch (err) {
            setError(err.message || "Impossible de charger les journaux.");
        } finally {
            setLoading(false);
        }
    }, []);

    const selectJournal = useCallback((journalId) => {
        const journalToSelect = journals.find(j => j.id === journalId);
        setCurrentJournal(journalToSelect || null);
    }, [journals]);

    const createJournal = useCallback(async (journalData) => {
        const { data } = await JournalService.createJournal(journalData);
        setJournals(prev => [...prev, data]);
        setCurrentJournal(data);
        return data;
    }, []);

    // Remplacé 'updateJournal' par 'archiveJournal' pour correspondre au service
    const archiveJournal = useCallback(async (id) => {
        const { data } = await JournalService.archiveJournal(id);
        // Met à jour la liste locale pour refléter l'archivage
        setJournals(prev => prev.map(j => (j.id === id ? { ...j, is_archived: true } : j)));
        // Si le journal archivé était le courant, on le met à jour
        if (currentJournal?.id === id) {
            setCurrentJournal(data);
        }
        return data;
    }, [currentJournal]);

    const deleteJournal = useCallback(async (id) => {
        await JournalService.deleteJournal(id);
        const remainingJournals = journals.filter(j => j.id !== id);
        setJournals(remainingJournals);
        if (currentJournal?.id === id) {
            setCurrentJournal(remainingJournals.length > 0 ? remainingJournals[0] : null);
        }
    }, [journals, currentJournal]);

    // --- Fonctions de gestion des entrées et assignations (pour le journal courant) ---

    const fetchJournalEntries = useCallback(async (startDate, endDate) => {
        if (!currentJournal) return;
        setLoadingEntries(true);
        try {
            // L'ID du journal est passé en 3ème argument, comme dans le service
            const { data } = await JournalService.getJournalEntries(startDate, endDate, currentJournal.id);
            setJournalEntries(data || []);
        } catch (err) {
            console.error("Erreur de chargement des entrées de journal:", err);
        } finally {
            setLoadingEntries(false);
        }
    }, [currentJournal]);

    const upsertJournalEntry = useCallback(async (entryData) => {
        // Le service attend les données complètes, y compris l'ID du journal
        const { data } = await JournalService.upsertJournalEntry(entryData);
        setJournalEntries(prev => {
            const index = prev.findIndex(e => e.id === data.id);
            if (index > -1) {
                const newEntries = [...prev];
                newEntries[index] = data;
                return newEntries;
            }
            return [...prev, data];
        });
        return data;
    }, []);

    const deleteJournalEntry = useCallback(async (entryId) => {
        await JournalService.deleteJournalEntry(entryId);
        setJournalEntries(prev => prev.filter(e => e.id !== entryId));
    }, []);

    const fetchAssignments = useCallback(async (classId, startDate, endDate) => {
        setLoadingAssignments(true);
        try {
            // Le service ne prend pas de journal_id pour les assignations
            const { data } = await JournalService.getAssignments(classId, startDate, endDate);
            setAssignments(data || []);
        } catch (err) {
            console.error("Erreur de chargement des assignations:", err);
        } finally {
            setLoadingAssignments(false);
        }
    }, []);

    const upsertAssignment = useCallback(async (assignmentData) => {
        // Le service ne semble pas nécessiter de journal_id, on envoie directement les données
        const { data } = await JournalService.upsertAssignment(assignmentData);
        setAssignments(prev => {
            const index = prev.findIndex(a => a.id === data.id);
            if (index > -1) {
                const newAssignments = [...prev];
                newAssignments[index] = data;
                return newAssignments;
            }
            return [...prev, data];
        });
        return data;
    }, []);

    const deleteAssignment = useCallback(async (assignmentId) => {
        await JournalService.deleteAssignment(assignmentId);
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    }, []);

    // --- Effet de chargement initial ---
    useEffect(() => {
        if (isAuthenticated) {
            fetchJournals();
        } else {
            setJournals([]);
            setCurrentJournal(null);
            setJournalEntries([]);
            setAssignments([]);
        }
    }, [isAuthenticated, fetchJournals]);

    // 2. Exposer la valeur, en remplaçant 'updateJournal' par 'archiveJournal'
    const value = useMemo(() => ({
        journals,
        currentJournal,
        loading,
        error,
        selectJournal,
        createJournal,
        archiveJournal,
        deleteJournal,
        journalEntries,
        assignments,
        loadingEntries,
        loadingAssignments,
        fetchJournalEntries,
        upsertJournalEntry,
        deleteJournalEntry,
        fetchAssignments,
        upsertAssignment,
        deleteAssignment
    }), [
        journals, currentJournal, loading, error, selectJournal, createJournal, archiveJournal, deleteJournal,
        journalEntries, assignments, loadingEntries, loadingAssignments,
        fetchJournalEntries, upsertJournalEntry, deleteJournalEntry, fetchAssignments, upsertAssignment, deleteAssignment
    ]);

    return (
        <JournalContext.Provider value={value}>
            {children}
        </JournalContext.Provider>
    );
};