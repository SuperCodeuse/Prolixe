import { useState, useEffect, useCallback } from 'react';
import { isWithinInterval, parseISO } from 'date-fns';

export const useHolidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    // Charge les congés depuis le localStorage au démarrage
    useEffect(() => {
        try {
            const storedData = localStorage.getItem('schoolHolidays');
            if (storedData) {
                setHolidays(JSON.parse(storedData));
            }
        } catch (error) {
            console.error("Erreur lors du chargement des congés depuis le localStorage:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Vérifie si une date est un jour de congé
    const getHolidayForDate = useCallback((date) => {
        if (!date || holidays.length === 0) return null;

        for (const holiday of holidays) {
            const interval = {
                start: parseISO(holiday.start),
                end: parseISO(holiday.end)
            };
            if (isWithinInterval(date, interval)) {
                return holiday;
            }
        }
        return null;
    }, [holidays]);

    return { holidays, loading, getHolidayForDate };
};