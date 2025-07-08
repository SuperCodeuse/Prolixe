// frontend/src/services/journalService.js
import ApiService from './api';

const JOURNAL_API_URL = '/journal/entries';
const ASSIGNMENT_API_URL = '/journal/assignments';

class JournalService {
    // --- Journal (année scolaire) ---
    static async getAllJournals() {
        return ApiService.request(JOURNAL_API_URL);
    }

    static async createJournal(journalData) {
        return ApiService.request(JOURNAL_API_URL, {
            method: 'POST',
            body: JSON.stringify(journalData),
        });
    }

    static async archiveJournal(id) {
        return ApiService.request(`${JOURNAL_API_URL}/${id}/archive`, {
            method: 'PUT',
        });
    }

    static async setCurrentJournal(id) {
        return ApiService.request(`${JOURNAL_API_URL}/${id}/current`, {
            method: 'PUT',
        });
    }

    static async importJournal(formData) {
        return ApiService.request(`${JOURNAL_API_URL}/import`, {
            method: 'POST',
            body: formData,
            headers: {}, // Laisser le navigateur gérer le Content-Type pour FormData
        });
    }

    // --- Journal Entries ---
    static async getJournalEntries(startDate, endDate) {
        return ApiService.request(`${JOURNAL_API_URL}?startDate=${startDate}&endDate=${endDate}`);
    }

    static async upsertJournalEntry(entryData) {
        return ApiService.request(JOURNAL_API_URL, {
            method: 'PUT',
            body: JSON.stringify(entryData),
        });
    }

    static async deleteJournalEntry(id) {
        return ApiService.request(`${JOURNAL_API_URL}/${id}`, {
            method: 'DELETE',
        });
    }

    // --- Assignments ---
    static async getAssignments(classId = '', startDate = '', endDate = '') {
        let query = ASSIGNMENT_API_URL;
        const params = [];
        if (classId) params.push(`classId=${classId}`);
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length > 0) query += '?' + params.join('&');

        return ApiService.request(query);
    }

    static async upsertAssignment(assignmentData) {
        return ApiService.request(ASSIGNMENT_API_URL, {
            method: 'PUT',
            body: JSON.stringify(assignmentData),
        });
    }

    static async deleteAssignment(id) {
        return ApiService.request(`${ASSIGNMENT_API_URL}/${id}`, {
            method: 'DELETE',
        });
    }
}

export default JournalService;