// client/src/services/ScheduleService.js
import apiClient from '../api/axiosConfig';

const ScheduleService = {
    /**
     * Récupère l'emploi du temps pour un journal et un ensemble d'horaires donnés.
     * @param {number} journalId - L'ID du journal.
     * @param {number} scheduleSetId - L'ID de l'ensemble d'horaires.
     * @returns {Promise<object>}
     */
    getSchedule: (journalId, scheduleSetId) => {
        console.log("scheduleSetid : ", scheduleSetId);
        return apiClient.get('/schedule', {
            params: {
                journal_id: journalId,
                schedule_set_id: scheduleSetId
            }
        });
    },

    /**
     * Ajoute ou met à jour un cours dans l'emploi du temps.
     * @param {object} data - Les données du cours.
     * @returns {Promise<object>}
     */
    upsertCourse: (data) => {
        return apiClient.put('/schedule', data);
    },

    /**
     * Supprime un cours de l'emploi du temps.
     * @param {string} day - Le jour de la semaine.
     * @param {number} timeSlotId - L'ID du créneau horaire.
     * @param {number} journalId - L'ID du journal.
     * @param {number} scheduleSetId - L'ID de l'ensemble d'horaires.
     * @returns {Promise<object>}
     */
    deleteCourse: (day, timeSlotId, journalId, scheduleSetId) => {
        return apiClient.delete(`/schedule/${journalId}/${day}/${timeSlotId}`, {
            params: {
                schedule_set_id: scheduleSetId // Ajout du paramètre
            }
        });
    },

    /**
     * Change la position d'un cours par glisser-déposer.
     * @param {object} data - Les données du cours à déplacer.
     * @returns {Promise<object>}
     */
    changeCourse: (data) => {
        console.log("data : ", data);
        return apiClient.put('/schedule/change', data);
    },
};

export default ScheduleService;