// frontend/src/services/journalService.js
import ApiService from './api';

const JOURNAL_API_URL = '/journal'; // Base URL pour les journaux

class JournalService {
    // --- Journal (Année scolaire) ---
    static async getAllJournals() {
        return ApiService.request(`${JOURNAL_API_URL}/`);
    }

    static async createJournal(data) {
        return ApiService.request(`${JOURNAL_API_URL}/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async archiveJournal(id) {
        return ApiService.request(`${JOURNAL_API_URL}/archive/${id}`, {
            method: 'POST',
        });
    }

    static async importJournal(file) {
        const formData = new FormData();
        formData.append('journalFile', file); // 'journalFile' doit correspondre au nom attendu par Multer
        return ApiService.request(`${JOURNAL_API_URL}/import`, {
            method: 'POST',
            body: formData,
            // Ne pas définir 'Content-Type', le navigateur le fera pour multipart/form-data
            headers: {}
        });
    }

    static async getCurrentJournal() {
        return ApiService.request(`${JOURNAL_API_URL}/current`);
    }

    static async getArchivedJournals() {
        return ApiService.request(`${JOURNAL_API_URL}/archived`);
    }

    static async importJournal(file) {
        const formData = new FormData();
        formData.append('journalFile', file);
        return ApiService.request(`${JOURNAL_API_URL}/import`, {
            method: 'POST',
            body: formData, // Laisse le navigateur définir le Content-Type pour multipart/form-data
            headers: {} // Ne pas mettre 'Content-Type': 'application/json'
        });
    }

    // --- Journal Entries ---
    static async getJournalEntries(startDate, endDate, journal_id) {
        return ApiService.request(`${JOURNAL_API_URL}/entries?startDate=${startDate}&endDate=${endDate}&journal_id=${journal_id}`);
    }

    static async upsertJournalEntry(entryData) {
        return ApiService.request(`${JOURNAL_API_URL}/entries`, {
            method: 'PUT',
            body: JSON.stringify(entryData),
        });
    }

    static async deleteJournalEntry(id) {
        return ApiService.request(`${JOURNAL_API_URL}/entries/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Assignments ---
    static async getAssignments(classId = '', startDate = '', endDate = '') {
        let query = `${JOURNAL_API_URL}/assignments`;
        const params = [];
        if (classId) params.push(`classId=${classId}`);
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) query += '?' + params.join('&');

        return ApiService.request(query);
    }

    static async upsertAssignment(assignmentData) {
        return ApiService.request(`${JOURNAL_API_URL}/assignments`, {
            method: 'PUT',
            body: JSON.stringify(assignmentData),
        });
    }

    static async deleteAssignment(id) {
        return ApiService.request(`${JOURNAL_API_URL}/assignments/${id}`, {
            method: 'DELETE',
        });
    }
}

export default JournalService;
