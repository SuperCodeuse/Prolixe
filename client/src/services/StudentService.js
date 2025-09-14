import ApiService from '../api/axiosConfig';
const STUDENT_API_URL = '/students';

class StudentService {
    /**
     * Récupère les élèves d'une classe.
     * Le endpoint est maintenant /students/class/:classId
     * @param {number|string} classId - L'ID de la classe.
     */
    static async getStudentsByClass(classId) {
        if (!classId) {
            // Retourne un objet de réponse standard en cas d'absence de classId
            return { data: { data: [] } };
        }
        return ApiService.get(`${STUDENT_API_URL}/class/${classId}`);
    }

    /**
     * Crée un nouvel élève.
     * @param {object} studentData - Données de l'élève.
     */
    static async createStudent(studentData) {
        return ApiService.post(STUDENT_API_URL, studentData);
    }

    /**
     * Met à jour un élève.
     * @param {number|string} id - L'ID de l'élève.
     * @param {object} studentData - Les nouvelles données de l'élève.
     */
    static async updateStudent(id, studentData) {
        return ApiService.put(`${STUDENT_API_URL}/${id}`, studentData);
    }

    /**
     * Supprime un élève.
     * @param {number|string} id - L'ID de l'élève à supprimer.
     */
    static async deleteStudent(id) {
        return ApiService.delete(`${STUDENT_API_URL}/${id}`);
    }
}

export default StudentService;