import ApiService from './api';

class StudentService {
    /**
     * Récupère les élèves d'une classe pour une année scolaire spécifique.
     * @param {number|string} classId - L'ID de la classe.
     */
    static async getStudentsByClass(classId) {
        if (!classId) {
            return Promise.resolve({ data: [] });
        }
        return ApiService.request(`/students/class/${classId}`);
    }

    /**
     * Crée un nouvel élève.
     * @param {object} studentData - Données de l'élève, incluant class_id et school_year_id.
     */
    static async createStudent(studentData) {
        return ApiService.request('/students', {
            method: 'POST',
            body: JSON.stringify(studentData),
        });
    }

    /**
     * Met à jour un élève.
     * @param {number|string} id - L'ID de l'élève.
     * @param {object} studentData - Les nouvelles données de l'élève.
     */
    static async updateStudent(id, studentData) {
        return ApiService.request(`/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(studentData),
        });
    }

    /**
     * Supprime un élève.
     * @param {number|string} id - L'ID de l'élève à supprimer.
     */
    static async deleteStudent(id) {
        return ApiService.request(`/students/${id}`, {
            method: 'DELETE',
        });
    }
}

export default StudentService;