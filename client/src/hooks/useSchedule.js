// C:/Temp/Prolixe/client/src/hooks/useSchedule.js

import { useState, useEffect, useCallback } from 'react';
import scheduleService from '../services/ScheduleService';
import { useScheduleHours } from './useScheduleHours';
import { useJournal } from './useJournal';
import moment from 'moment';

export const useSchedule = (scheduleSetId) => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { hours, getHourIdByLibelle, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { currentJournal } = useJournal();

    const fetchSchedule = useCallback(async () => {
        if (!currentJournal || !scheduleSetId) {
            setSchedule({});
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await scheduleService.getSchedule(currentJournal.id, scheduleSetId);
            let dataObject = data.data;
            setSchedule(dataObject);
        } catch (err) {
            setError(err.message || "Erreur lors de la récupération de l'emploi du temps.");
        } finally {
            setLoading(false);
        }
    }, [currentJournal, scheduleSetId]);

    useEffect(() => {
        if (!loadingHours && !errorHours && scheduleSetId) {
            fetchSchedule();
        } else if (errorHours) {
            setError(errorHours.message || 'Erreur lors du chargement des créneaux horaires.');
            setLoading(false);
        }
    }, [hours, loadingHours, errorHours, fetchSchedule, currentJournal, scheduleSetId]);

    const upsertCourse = useCallback(async (day, time_libelle, courseDetails) => {
        if (!currentJournal || !scheduleSetId) throw new Error("Aucun journal ou emploi du temps actif sélectionné.");
        setError(null);
        try {
            const time_slot_id = getHourIdByLibelle(time_libelle);
            if (!time_slot_id) throw new Error(`ID de créneau horaire introuvable pour : ${time_libelle}`);

            let response = await scheduleService.upsertCourse({
                day,
                time_slot_id,
                ...courseDetails,
                journal_id: currentJournal.id,
                schedule_set_id: scheduleSetId
            });
            response = response.data;

            if (response.success) {
                await fetchSchedule();
            }
            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors de la sauvegarde du cours.');
            throw err;
        }
    }, [getHourIdByLibelle, currentJournal, fetchSchedule, scheduleSetId]);

    const deleteCourse = useCallback(async (day, time_libelle) => {
        if (!currentJournal || !scheduleSetId) throw new Error("Aucun journal ou emploi du temps actif sélectionné.");
        setError(null);
        try {
            const time_slot_id = getHourIdByLibelle(time_libelle);
            if (!time_slot_id) throw new Error(`ID de créneau horaire introuvable pour : ${time_libelle}`);

            let response = await scheduleService.deleteCourse(day, time_slot_id, currentJournal.id, scheduleSetId);
            response = response.data;

            if (response.success) {
                await fetchSchedule();
            }
            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors de la suppression du cours.');
            throw err;
        }
    }, [getHourIdByLibelle, currentJournal, fetchSchedule, scheduleSetId]);

    const changeCourse = useCallback(async ({ source_day, source_time_slot_id, target_day, target_time_slot_id }) => {
        if (!currentJournal || !scheduleSetId) throw new Error("Aucun journal ou emploi du temps actif sélectionné.");
        setError(null);
        try {
            const courseData = {
                source_day,
                source_time_slot_id,
                target_day,
                target_time_slot_id,
                journal_id: currentJournal.id,
                schedule_set_id: scheduleSetId
            };

            const response = await scheduleService.changeCourse(courseData);
            if (response.data.success) {
                await fetchSchedule();
            }
            return response.data;
        } catch (err) {
            setError(err.message || 'Erreur lors du déplacement du cours.');
            throw err;
        }
    }, [currentJournal, fetchSchedule, scheduleSetId]);

    const getCourseBySlotKey = useCallback((slotKey) => {
        return schedule.data ? schedule.data[slotKey] : null;
    }, [schedule]);

    return { schedule, loading, error, upsertCourse, deleteCourse, getCourseBySlotKey, fetchSchedule, changeCourse };
};