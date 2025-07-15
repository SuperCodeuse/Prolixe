import ApiService from './api';

class StudentService {
    /**
     * Récupère les élèves d'une classe pour une année scolaire spécifique.
     * @param {number|string} classId - L'ID de la classe.
     * @param {number|string} journal_id - L'ID de l'année scolaire.
     */
    static async getStudentsByClass(classId, journal_id) {
        if (!classId || !journal_id) {
            return Promise.resolve({ data: [] }); // Évite un appel API invalide
        }
        // CORRIGÉ : Le nom du paramètre est maintenant `school_year_id`.
        return ApiService.request(`/students/class/${classId}?journal_id=${journal_id}`);
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