// frontend/services/schoolYearService.js

const SY_API_URL = 'http://localhost:5000/api/school-years'; // Adaptez si votre préfixe d'API est différent

/**
 * Gère la réponse de l'API, renvoie les données JSON ou lève une erreur.
 * @param {Response} response La réponse de l'API
 * @returns {Promise<any>} Les données JSON
 */
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        // Tente de récupérer le message d'erreur du backend, sinon utilise un message par défaut.
        const error = (data && data.message) || response.statusText;
        throw new Error(error);
    }
    return data;
};

const schoolYearService = {
    /**
     * Récupère toutes les années scolaires.
     * @returns {Promise<Array>} Une promesse résolue avec le tableau des années scolaires.
     */
    getAll: async () => {
        const response = await fetch(SY_API_URL);
        const data = await handleResponse(response);
        return data.data; // Le contrôleur renvoie { success: true, data: [...] }
    },

    /**
     * Récupère une année scolaire par son ID.
     * @param {number|string} id - L'ID de l'année scolaire à récupérer.
     * @returns {Promise<object>}
     */
    getById: async (id) => {
        const response = await fetch(`${SY_API_URL}/${id}`);
        const data = await handleResponse(response);
        return data.data;
    },

    /**
     * Crée une nouvelle année scolaire.
     * @param {object} schoolYearData - Les données de l'année scolaire { name, start_date, end_date }.
     * @returns {Promise<object>} Une promesse résolue avec l'objet de la nouvelle année scolaire.
     */
    create: async (schoolYearData) => {
        const response = await fetch(SY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schoolYearData),
        });
        const data = await handleResponse(response);
        return data.data;
    },

    /**
     * Met à jour une année scolaire.
     * @param {number|string} id - L'ID de l'année scolaire à mettre à jour.
     * @param {object} schoolYearData - Les nouvelles données.
     * @returns {Promise<object>} Une promesse résolue avec l'objet de l'année scolaire mise à jour.
     */
    update: async (id, schoolYearData) => {
        const response = await fetch(`${SY_API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schoolYearData),
        });
        const data = await handleResponse(response);
        return data.data;
    },

    /**
     * Supprime une année scolaire.
     * @param {number|string} id - L'ID de l'année scolaire à supprimer.
     * @returns {Promise<void>}
     */
    remove: async (id) => {
        const response = await fetch(`${SY_API_URL}/${id}`, {
            method: 'DELETE',
        });
        await handleResponse(response);
    },
};

export default schoolYearService;

