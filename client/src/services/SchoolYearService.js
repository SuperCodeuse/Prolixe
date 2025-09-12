// client/src/services/SchoolYearService.js

import api from '../api/axiosConfig'; // Importation de l'instance axios configurée

const schoolYearService = {
    /**
     * Récupère toutes les années scolaires.
     * @returns {Promise<Array>} Une promesse résolue avec le tableau des années scolaires.
     */
    getAll: async () => {
        const response = await api.get('/school-years');
        return response.data.data; // Accéder aux données via response.data
    },

    /**
     * Récupère une année scolaire par son ID.
     * @param {number|string} id - L'ID de l'année scolaire à récupérer.
     * @returns {Promise<object>}
     */
    getById: async (id) => {
        const response = await api.get(`/school-years/${id}`);
        return response.data.data;
    },

    /**
     * Crée une nouvelle année scolaire.
     * @param {object} schoolYearData - Les données de l'année scolaire { name, start_date, end_date }.
     * @returns {Promise<object>} Une promesse résolue avec l'objet de la nouvelle année scolaire.
     */
    create: async (schoolYearData) => {
        const response = await api.post('/school-years', schoolYearData);
        return response.data.data;
    },

    /**
     * Met à jour une année scolaire.
     * @param {number|string} id - L'ID de l'année scolaire à mettre à jour.
     * @param {object} schoolYearData - Les nouvelles données.
     * @returns {Promise<object>} Une promesse résolue avec l'objet de l'année scolaire mise à jour.
     */
    update: async (id, schoolYearData) => {
        const response = await api.put(`/school-years/${id}`, schoolYearData);
        return response.data.data;
    },

    /**
     * Supprime une année scolaire.
     * @param {number|string} id - L'ID de l'année scolaire à supprimer.
     * @returns {Promise<void>}
     */
    remove: async (id) => {
        await api.delete(`/school-years/${id}`);
    },
};

export default schoolYearService;