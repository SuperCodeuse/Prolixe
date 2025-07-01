import ApiService from './api';

class ScheduleService {
    // Récupérer tous les créneaux horaires
    static async getHours() {
        return ApiService.request('/hours');
    }

    // Récupérer un créneau horaire spécifique
    static async getHour(id) { // Changé de getHours à getHour
        return ApiService.request(`/hours/${id}`);
    }

    // Créer un nouveau créneau horaire
    static async createHour(hourData) {
        return ApiService.request('/hours', {
            method: 'POST',
            body: JSON.stringify(hourData),
        });
    }

    // Modifier un créneau horaire
    static async updateHour(id, hourData) { // Changé de updateHours à updateHour
        return ApiService.request(`/hours/${id}`, {
            method: 'PUT',
            body: JSON.stringify(hourData),
        });
    }

    // Supprimer un créneau horaire
    static async deleteHour(id) {
        return ApiService.request(`/hours/${id}`, {
            method: 'DELETE',
        });
    }
}

export default ScheduleService;
