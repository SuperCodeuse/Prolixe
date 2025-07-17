// frontend/src/hooks/useSchedule.js
import { useState, useEffect, useCallback } from 'react';
import scheduleService from '../services/ScheduleService';
import { useScheduleHours } from './useScheduleHours';
import { useJournal } from './useJournal'; // Importer le hook de journal

export const useSchedule = () => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { hours, getHourIdByLibelle, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { currentJournal } = useJournal(); // Obtenir le journal courant

    const fetchSchedule = useCallback(async () => {
        if (!currentJournal) {
            setSchedule({});
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await scheduleService.getSchedule(currentJournal.id);
            setSchedule(data);
        } catch (err) {
            setError(err.message || "Erreur lors de la récupération de l'emploi du temps.");
        } finally {
            setLoading(false);
        }
    }, [currentJournal]); // Dépendre de currentJournal

    useEffect(() => {
        if (!loadingHours && !errorHours) {
            fetchSchedule();
        } else if (errorHours) {
            setError(errorHours.message || 'Erreur lors du chargement des créneaux horaires.');
            setLoading(false);
        }
    }, [hours, loadingHours, errorHours, fetchSchedule, currentJournal]);

    const upsertCourse = useCallback(async (day, time_libelle, courseDetails) => {
        if (!currentJournal) throw new Error("Aucun journal actif sélectionné.");
        setError(null);
        try {
            const time_slot_id = getHourIdByLibelle(time_libelle);
            if (!time_slot_id) throw new Error(`ID de créneau horaire introuvable pour : ${time_libelle}`);

            const response = await scheduleService.upsertCourse(day, time_slot_id, courseDetails, currentJournal.id);

            if (response.success && response.data.schedule) {
                setSchedule({ data: response.data.schedule });
            }
            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors de la sauvegarde du cours.');
            throw err;
        }
    }, [getHourIdByLibelle, currentJournal]); // Ajouter currentJournal

    const deleteCourse = useCallback(async (day, time_libelle) => {
        if (!currentJournal) throw new Error("Aucun journal actif sélectionné.");
        setError(null);
        try {
            const time_slot_id = getHourIdByLibelle(time_libelle);
            if (!time_slot_id) throw new Error(`ID de créneau horaire introuvable pour : ${time_libelle}`);

            // Passer l'ID du journal courant au service
            const response = await scheduleService.deleteCourse(day, time_slot_id, currentJournal.id);

            if (response.success && response.data.schedule) {
                setSchedule({ data: response.data.schedule });
            }
            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors de la suppression du cours.');
            throw err;
        }
    }, [getHourIdByLibelle, currentJournal]); // Ajouter currentJournal

    const getCourseBySlotKey = useCallback((slotKey) => {
        return schedule.data ? schedule.data[slotKey] : null;
    }, [schedule]);

    return { schedule, loading, error, upsertCourse, deleteCourse, getCourseBySlotKey, fetchSchedule };
};