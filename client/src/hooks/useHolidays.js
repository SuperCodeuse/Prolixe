// client/src/hooks/useHolidays.js
import { useState, useEffect, useCallback } from 'react';
// 1. Importer la fonction 'endOfDay'
import { isWithinInterval, parseISO, endOfDay } from 'date-fns';
import { useJournal } from './useJournal'; // Importer le hook de journal


export const useHolidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentJournal } = useJournal();


    // Charge les congés depuis le localStorage au démarrage
    useEffect(() => {
        try {
            const storedData = localStorage.getItem(`${currentJournal.name}-schoolHolidays`);
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
                end: endOfDay(parseISO(holiday.end))
            };

            if (isWithinInterval(date, interval)) {
                return holiday;
            }
        }
        return null;
    }, [holidays]);

    return { holidays, loading, getHolidayForDate };
};