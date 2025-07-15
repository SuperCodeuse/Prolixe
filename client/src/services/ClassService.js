// client/src/services/classService.js
import ApiService from './api';

class ClassService {

    static async getClasses(schoolYearId) {
        if (!schoolYearId) {
            return Promise.resolve({ data: [] });
        }
        return ApiService.request(`/classes?school_year_id=${schoolYearId}`);
    }

    static async getClass(id) {
        return ApiService.request(`/classes/${id}`);
    }

    static async createClass(classData) {
        return ApiService.request('/classes', {
            method: 'POST',
            body: JSON.stringify(classData),
        });
    }

    static async updateClass(id, classData) {
        return ApiService.request(`/classes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(classData),
        });
    }

    static async deleteClass(id) {
        return ApiService.request(`/classes/${id}`, {
            method: 'DELETE',
        });
    }

    // Vous pouvez ajouter de la logique métier spécifique aux classes
    static async getActiveClasses() {
        const classes = await this.getClasses();
        return classes.filter(cls => cls.active);
    }

    static async getClassWithStudents(id) {
        const classData = await this.getClass(id);
        // Logique supplémentaire si nécessaire
        return classData;
    }
}

export default ClassService;
