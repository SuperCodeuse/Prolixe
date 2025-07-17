// frontend/src/services/scheduleService.js
import ApiService from './api';

class ScheduleService {
    static async getSchedule(journalId) {
        if (!journalId) return Promise.resolve({ data: {} });
        return ApiService.request(`/schedule?journal_id=${journalId}`);
    }

    static async upsertCourse(day, time_slot_id, courseData, journalId) {
        return ApiService.request('/schedule', {
            method: 'PUT',
            body: JSON.stringify({
                day,
                time_slot_id,
                journal_id: journalId,
                ...courseData
            }),
        });
    }

    static async deleteCourse(day, time_slot_id, journalId) {
        return ApiService.request(`/schedule/${journalId}/${day}/${time_slot_id}`, {
            method: 'DELETE',
        });
    }
}

export default ScheduleService;