import ApiService from './api';

class StudentService {
    static async getStudentsByClass(classId) {
        return ApiService.request(`/students/class/${classId}`);
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