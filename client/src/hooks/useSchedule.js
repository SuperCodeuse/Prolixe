// frontend/src/hooks/useSchedule.js
import { useState, useEffect, useCallback } from 'react';
import scheduleService from '../services/ScheduleService';
import { useScheduleHours } from './useScheduleHours';

export const useSchedule = () => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const {
        hours,
        getHourIdByLibelle,
        loading: loadingHours,
        error: errorHours
    } = useScheduleHours();

    // Fonction de chargement de l'emploi du temps
    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await scheduleService.getSchedule();
            setSchedule(data);
        } catch (err) {
            setError(err.message || 'Erreur lors de la récupération de l\'emploi du temps.');
        } finally {
            setLoading(false);
        }
    }, []);

    // useEffect pour déclencher le chargement de l'emploi du temps
    useEffect(() => {
        if (loadingHours) {
            setLoading(true);
            return;
        }

        if (!loadingHours && !errorHours) {
            if (hours && hours.length > 0) {
                fetchSchedule();
            } else if (hours && hours.length === 0) {
                setSchedule({});
                setLoading(false);
            }
        } else if (errorHours) {
            setError(errorHours.message || 'Erreur lors du chargement des créneaux horaires.');
            setLoading(false);
        }
    }, [hours, loadingHours, errorHours, fetchSchedule]);

    // 🎯 Fonction pour ajouter/mettre à jour un cours - CORRIGÉE
    const upsertCourse = useCallback(async (day, time_libelle, courseDetails) => {
        setError(null);
        try {
            const time_slot_id = getHourIdByLibelle(time_libelle);
            if (!time_slot_id) {
                throw new Error(`ID de créneau horaire introuvable pour le libellé: ${time_libelle}`);
            }

            const response = await scheduleService.upsertCourse(day, time_slot_id, courseDetails);

            // 🚀 CORRECTION : Utiliser l'emploi du temps complet retourné par le backend
            if (response.success && response.data.schedule) {
                setSchedule({ data: response.data.schedule }); // Format cohérent avec getSchedule
            }

            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors de la sauvegarde du cours.');
            throw err;
        }
    }, [getHourIdByLibelle]);

    // 🎯 Fonction pour supprimer un cours - CORRIGÉE
    const deleteCourse = useCallback(async (day, time_libelle) => {
        setError(null);
        try {
            const time_slot_id = getHourIdByLibelle(time_libelle);
            if (!time_slot_id) {
                throw new Error(`ID de créneau horaire introuvable pour le libellé: ${time_libelle}`);
            }

            const response = await scheduleService.deleteCourse(day, time_slot_id);

            // 🚀 CORRECTION : Utiliser l'emploi du temps complet retourné par le backend
            if (response.success && response.data.schedule) {
                setSchedule({ data: response.data.schedule }); // Format cohérent avec getSchedule
            }

            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors de la suppression du cours.');
            throw err;
        }
    }, [getHourIdByLibelle]);

    // Fonction pour récupérer un cours par jour et libellé de créneau
    const getCourseBySlotKey = useCallback((slotKey) => {
        return schedule.data ? schedule.data[slotKey] : null;
    }, [schedule]);

    return {
        schedule,
        loading,
        error,
        upsertCourse,
        deleteCourse,
        getCourseBySlotKey,
        fetchSchedule // Exposer fetchSchedule si besoin de forcer un reload
    };
};
