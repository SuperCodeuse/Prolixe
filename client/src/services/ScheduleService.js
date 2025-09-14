// client/src/services/ScheduleService.js
import ApiService from '../api/axiosConfig';

class ScheduleService {
    static async getSchedule(journalId) {
        if (!journalId) return Promise.resolve({ data: { data: [] } });
        return ApiService.get('/schedule', { params: { journal_id: journalId } });
    }

    static async upsertCourse(day, time_slot_id, courseData, journalId) {
        return ApiService.put('/schedule', {
            day,
            time_slot_id,
            journal_id: journalId,
            ...courseData
        });
    }

    static async deleteCourse(day, time_slot_id, journalId) {
        return ApiService.delete(`/schedule/${journalId}/${day}/${time_slot_id}`);
    }
}

export default ScheduleService;