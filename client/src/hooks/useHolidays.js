// client/src/hooks/useHolidays.js
import { useState, useEffect, useCallback } from 'react';
import { isWithinInterval, parseISO, endOfDay } from 'date-fns';
import { useJournal } from './useJournal';

export const useHolidays = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentJournal } = useJournal();

    useEffect(() => {
        if (currentJournal?.id) {
            try {
                // Utilisation de l'id du journal pour la clé du localStorage
                const storedData = localStorage.getItem(`${currentJournal.id}-schoolHolidays`);
                if (storedData) {
                    setHolidays(JSON.parse(storedData));
                }
            } catch (error) {
                console.error("Erreur lors du chargement des congés depuis le localStorage:", error);
            } finally {
                setLoading(false);
            }
        } else {
            // Gérer le cas où currentJournal est null
            setHolidays([]);
            setLoading(false);
        }
    }, [currentJournal]); // CHANGEMENT : Le useEffect se déclenchera à chaque fois que currentJournal change

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