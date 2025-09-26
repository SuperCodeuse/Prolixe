// client/src/hooks/useScheduleModel.js
import { useState } from 'react';
import ScheduleModelService from '../services/ScheduleModelService';

const useScheduleModel = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const createSchedule = async (scheduleData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await ScheduleModelService.createSchedule(
                scheduleData.name,
                scheduleData.startDate,
                scheduleData.endDate
            );
            setLoading(false);
            return response.data;
        } catch (err) {
            setLoading(false);
            const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la création de l\'emploi du temps';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    return { createSchedule, loading, error };
};

export default useScheduleModel;