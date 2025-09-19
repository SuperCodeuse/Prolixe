// client/src/services/ScheduleService.js
import ApiService from '../api/axiosConfig';

class ScheduleService {
    static async getSchedule(journalId) {
        if (!journalId) return Promise.resolve({ data: { data: [] } });
        return ApiService.get('/schedule', { params: { journal_id: journalId } });
    }

    static async upsertCourse(day, time_slot_id, courseData, journalId, effectiveDate = null) {
        return ApiService.put('/schedule', {
            day,
            time_slot_id,
            journal_id: journalId,
            effective_date: effectiveDate,
            ...courseData
        });
    }

    // NOUVEAU: Gère la mise à jour de l'emploi du temps avec une date effective
    static async changeCourse(sourceDay, sourceTime, targetDay, targetTime, courseData, journalId, effectiveDate) {
        return ApiService.put('/schedule/change', {
            journal_id: journalId,
            effective_date: effectiveDate,
            source_day: sourceDay,
            source_time_slot_id: sourceTime,
            target_day: targetDay,
            target_time_slot_id: targetTime,
            ...courseData
        });
    }

    // Mise à jour pour gérer la suppression avec une date effective et un flag "deleteAll"
    static async deleteCourse(day, time_slot_id, journalId, effectiveDate, deleteAll = false) {
        // Utilisation des paramètres d'URL pour éviter l'erreur 404
        return ApiService.delete(`/schedule/${journalId}/${day}/${time_slot_id}?effective_date=${effectiveDate}&delete_all=${deleteAll}`);
    }
}

export default ScheduleService;