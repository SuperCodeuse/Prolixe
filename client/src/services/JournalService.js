// C:/Temp/Prolixe/client/src/services/JournalService.js
import apiClient from '../api/axiosConfig'; // <-- Utilise l'instance configurée

const JournalService = {
    getAllJournals: () => {
        return apiClient.get('/journals');
    },

    createJournal: (journalData) => {
        return apiClient.post('/journals', journalData);
    },

    archiveJournal: (journalId) => {
        return apiClient.patch(`/journals/${journalId}/archive`);
    },

    deleteJournal: (journalId) => {
        return apiClient.delete(`/journals/${journalId}`);
    },

    clearJournal: (journalId) => {
        return apiClient.post(`/journals/${journalId}/clear`);
    },

    getJournalEntries: (startDate, endDate, journalId) => {
        return apiClient.get(`/journals/${journalId}/entries`, { params: { startDate, endDate } });
    },

    upsertJournalEntry: (entryData) => {
        return apiClient.post('/entries', entryData);
    },

    deleteJournalEntry: (id) => {
        return apiClient.delete(`/entries/${id}`);
    },

    // ... et ainsi de suite pour getAssignments, upsertAssignment, deleteAssignment
};

export default JournalService;