// client/src/services/AttributionService.js
import ApiService from './api';

const ATTRIBUTION_API_URL = '/attributions'; // Base URL pour les attributions

class AttributionService {
    /**
     * Récupère toutes les attributions.
     */
    static async getAttributions() {
        return ApiService.request(ATTRIBUTION_API_URL);
    }

    /**
     * Sauvegarde une attribution (crée ou met à jour).
     * @param {object} attributionData - Les données de l'attribution.
     */
    static async saveAttribution(attributionData) {
        const { id, ...data } = attributionData;
        const method = id ? 'PUT' : 'POST';
        const endpoint = id ? `${ATTRIBUTION_API_URL}/${id}` : ATTRIBUTION_API_URL;

        return ApiService.request(endpoint, {
            method,
            body: JSON.stringify(data),
        });
    }

    /**
     * Supprime une attribution par son ID.
     * @param {number} id - L'ID de l'attribution à supprimer.
     */
    static async deleteAttribution(id) {
        return ApiService.request(`${ATTRIBUTION_API_URL}/${id}`, {
            method: 'DELETE',
        });
    }
}

export default AttributionService;