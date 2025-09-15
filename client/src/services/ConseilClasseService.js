import ApiService from '../api/axiosConfig';

const API_BASE_URL = '/conseilDeClasse';

/**
 * Récupère les données du conseil pour tous les élèves d'une classe.
 */
export const getConseilDataForClass = async (classId) => {

    if (!classId) {
        return { success: true, data: [] };
    }
    // Utiliser ApiService.get avec le chemin complet
    return ApiService.get(`${API_BASE_URL}/${classId}`);
};

/**
 * Sauvegarde les notes et/ou la décision pour un étudiant.
 */
export const saveStudentConseil = async (studentId, data) => {
    if (!studentId) return;
    return ApiService.put(`${API_BASE_URL}/student/${studentId}`, data);
};