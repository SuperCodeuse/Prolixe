// client/src/services/ScheduleHoursService.js
import apiClient from '../api/axiosConfig';

const ScheduleHoursService = {
    // Récupère toutes les tranches horaires
    getScheduleHours: () => {
        return apiClient.get('/hours'); // L'URL complète sera /api/hours
    },
};

export default ScheduleHoursService;