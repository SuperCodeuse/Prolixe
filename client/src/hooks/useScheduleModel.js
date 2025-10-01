    // client/src/hooks/useScheduleModel.js
    import { useState, useEffect } from 'react';
    import ScheduleModelService from '../services/ScheduleModelService';

    const useScheduleModel = () => {
        const [schedules, setSchedules] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);

        const fetchSchedules = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await ScheduleModelService.getSchedules();
                setSchedules(response.data.schedules);
                setLoading(false);
            } catch (err) {
                setLoading(false);
                const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la récupération des emplois du temps';
                setError(errorMessage);
            }
        };

        // La fonction pour créer un emploi du temps peut être gardée ici
        const createSchedule = async (scheduleData) => {
            setLoading(true);
            setError(null);
            try {
                await ScheduleModelService.createSchedule(
                    scheduleData.name,
                    scheduleData.startDate,
                    scheduleData.endDate
                );
                // Recharger la liste des emplois du temps après la création
                await fetchSchedules();
                setLoading(false);
            } catch (err) {
                setLoading(false);
                const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la création de l\'emploi du temps';
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        };

        useEffect(() => {
            fetchSchedules();
        }, []);

        return { schedules, loading, error, createSchedule, fetchSchedules };
    };

    export default useScheduleModel;