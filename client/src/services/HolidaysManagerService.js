// client/src/services/HolidaysManagerService.js
import api from '../api/axiosConfig';

const HolidaysManagerService = {
    uploadHolidaysFile: async (file) => {
        const formData = new FormData();
        formData.append('holidaysFile', file);
        try {
            const response = await api.post('/holidays/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getHolidays: async () => {
        try {
            const response = await api.get('/holidays');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default HolidaysManagerService;