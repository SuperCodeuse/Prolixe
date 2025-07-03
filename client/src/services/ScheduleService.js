// frontend/src/services/scheduleService.js
import ApiService from './api'; // Importez votre ApiService

class ScheduleService {
    // Récupérer tout l'emploi du temps
    static async getSchedule() {
        return ApiService.request('/schedule');
    }

    // time_slot_libelle est le libellé du créneau (ex: '08:00-08:50')
    // time_slot_id est l'ID numérique du créneau dans la table HOURS
    // courseData contient { subject, classId, room, notes }
    static async upsertCourse(day, time_slot_id, courseData) {
        return ApiService.request('/schedule', {
            method: 'PUT', // Méthode HTTP pour l'upsert
            body: JSON.stringify({ // Stringify le corps de la requête
                day,
                time_slot_id,
                ...courseData
            }),
        });
    }

    // Supprimer un cours
    static async deleteCourse(day, time_slot_id) {
        // La route de suppression utilise des paramètres dans l'URL
        return ApiService.request(`/schedule/${day}/${time_slot_id}`, {
            method: 'DELETE',
        });
    }
}

export default ScheduleService;