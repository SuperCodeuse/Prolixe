// client/src/services/classService.js
import apiClient from '../api/axiosConfig'; // <-- Utiliser apiClient

const ClassService = {
    getClasses: (journal_id) => {
        if (!journal_id) {
            return Promise.resolve({ data: [] });
        }
        // Utiliser apiClient et passer les paramètres correctement
        return apiClient.get('/classes', { params: { journal_id } });
    },

    getClass: (id) => {
        return apiClient.get(`/classes/${id}`);
    },

    createClass: (classData) => {
        return apiClient.post('/classes', classData);
    },

    updateClass: (id, classData) => {
        return apiClient.put(`/classes/${id}`, classData);
    },

    deleteClass: (id) => {
        return apiClient.delete(`/classes/${id}`);
    },

    /*
     * NOTE: La méthode getActiveClasses a été commentée car elle ne peut pas fonctionner
     * sans un `journal_id`. La logique métier pour filtrer les classes actives
     * devrait probablement être implémentée dans le composant qui utilise ce service,
     * où le `journal_id` est disponible.
     */
};

export default ClassService;
