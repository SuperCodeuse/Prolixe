import ApiService from './api';

class StudentService {
    static async getStudentsByClass(classId, schoolYear) {
        // Ajout de l'année scolaire comme paramètre de la requête
        return ApiService.request(`/students/class/${classId}?school_year=${schoolYear}`);
    }

    static async createStudent(studentData) {
        return ApiService.request('/students', {
            method: 'POST',
            body: JSON.stringify(studentData),
        });
    }

    static async updateStudent(id, studentData) {
        return ApiService.request(`/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify(studentData),
        });
    }

    static async deleteStudent(id) {
        return ApiService.request(`/students/${id}`, {
            method: 'DELETE',
        });
    }
}

export default StudentService;