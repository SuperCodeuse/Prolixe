import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './Journal.scss';
import { useJournal } from '../../hooks/useJournal';
import { useClasses } from '../../hooks/useClasses';
import { useScheduleHours } from '../../hooks/useScheduleHours';
import { useSchedule } from '../../hooks/useSchedule';
import { useToast } from '../../hooks/useToast';
import { useHolidays } from '../../hooks/useHolidays';
import JournalPicker from './JournalPicker';
import ConfirmModal from '../ConfirmModal';
import { format, addDays, startOfWeek, endOfWeek, parseISO, getDay, isAfter, isBefore, min, max } from 'date-fns';
import { fr } from 'date-fns/locale';

const Journal = () => {
    const { currentJournal } = useJournal();
    return currentJournal ? <JournalView /> : <JournalPicker />;
};

const JournalView = () => {
    const { currentJournal, upsertJournalEntry, deleteJournalEntry, upsertAssignment, deleteAssignment, fetchJournalEntries, fetchAssignments, journalEntries, assignments } = useJournal();
    const journalId = currentJournal?.id;
    const { classes, getClassColor } = useClasses(journalId);
    const { hours, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule();
    const { success, error: showError } = useToast();
    const { getHolidayForDate, holidays, loading: loadingHolidays } = useHolidays();

    // --- STATES ---
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }));
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentForm, setAssignmentForm] = useState({ id: null, class_id: '', subject: '', type: 'Devoir', description: '', due_date: '', is_completed: false, is_corrected: false });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [journalDebounce, setJournalDebounce] = useState({});
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [selectedCourseForJournal, setSelectedCourseForJournal] = useState(null);
    const [selectedDayForJournal, setSelectedDayForJournal] = useState(null);
    const [journalForm, setJournalForm] = useState({ planned_work: '', actual_work: '', notes: '' });
    const [currentJournalEntryId, setCurrentJournalEntryId] = useState(null);
    const [nextCourseSlot, setNextCourseSlot] = useState(null);
    const [copyToNextSlot, setCopyToNextSlot] = useState(false);
    const [courseStatus, setCourseStatus] = useState('given');
    const [cancelEntireDay, setCancelEntireDay] = useState(false);
    const [isInterro, setIsInterro] = useState(false);

    const isArchived = currentJournal?.is_archived;

    // --- MEMOS & CALLBACKS ---
    const journalBounds = useMemo(() => {
        if (!holidays || holidays.length === 0) return null;
        try {
            const allDates = holidays.flatMap(h => [parseISO(h.start), parseISO(h.end)]);
            return {
                start: startOfWeek(min(allDates), { weekStartsOn: 1 }),
                end: startOfWeek(max(allDates), { weekStartsOn: 1 })
            };
        } catch (e) {
            console.error("Erreur lors du parsing des dates de congés:", e);
            return null;
        }
    }, [holidays]);

    const isPrevDisabled = !journalBounds || !isAfter(currentWeekStart, journalBounds.start);
    const isNextDisabled = !journalBounds || !isBefore(currentWeekStart, journalBounds.end);

    const closeConfirmModal = useCallback(() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null }), []);
    const assignmentTypes = ['Interro', 'Devoir', 'Projet', 'Examen', 'Autre'];
    const getDayKeyFromDateFnsString = useCallback((dayName) => ({'lundi':'monday','mardi':'tuesday','mercredi':'wednesday','jeudi':'thursday','vendredi':'friday'}[dayName]||dayName),[]);

    const goToStart = useCallback(() => { if (journalBounds) setCurrentWeekStart(journalBounds.start); }, [journalBounds]);
    const goToEnd = useCallback(() => { if (journalBounds) setCurrentWeekStart(journalBounds.end); }, [journalBounds]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 5 }).map((_, i) => {
            const date = addDays(currentWeekStart, i);
            const holidayInfo = getHolidayForDate(date);
            return { date, key: format(date, 'yyyy-MM-dd'), label: format(date, 'EEEE dd/MM', { locale: fr }), dayOfWeekKey: getDayKeyFromDateFnsString(format(date, 'EEEE', { locale: fr }).toLowerCase()), isHoliday: !!holidayInfo, holidayName: holidayInfo?.name || null };
        });
    }, [currentWeekStart, getDayKeyFromDateFnsString, getHolidayForDate]);

    const getCoursesGroupedByDay = useMemo(() => {
        const grouped = {};
        Object.values(schedule.data || {}).forEach(course => {
            if (!grouped[course.day]) grouped[course.day] = [];
            grouped[course.day].push(course);
        });
        for (const dayKey in grouped) {
            grouped[dayKey].sort((a, b) => (hours.find(h => h.libelle === a.time_slot_libelle)?.order || 0) - (hours.find(h => h.libelle === b.time_slot_libelle)?.order || 0));
        }
        return grouped;
    }, [schedule, hours]);

    const getJournalEntry = useCallback((scheduleId, dateKey) => journalEntries.find(entry => entry.schedule_id === scheduleId && format(new Date(entry.date), 'yyyy-MM-dd') === dateKey), [journalEntries]);

    const debouncedSave = (entryData) => {
        if (isArchived) return;
        const keyForDebounce = `${entryData.schedule_id}-${entryData.date}`;
        if (journalDebounce[keyForDebounce]) clearTimeout(journalDebounce[keyForDebounce]);
        const timeoutId = setTimeout(async () => {
            try {
                const savedEntry = await upsertJournalEntry(entryData);
                if (savedEntry && savedEntry.id && selectedCourseForJournal && entryData.schedule_id === selectedCourseForJournal.id) {
                    setCurrentJournalEntryId(savedEntry.id);
                }
            } catch (err) { showError('Erreur de sauvegarde: ' + err.message); }
            finally { setJournalDebounce(prev => { const newState = { ...prev }; delete newState[keyForDebounce]; return newState; }); }
        }, 1000);
        setJournalDebounce(prev => ({ ...prev, [keyForDebounce]: timeoutId }));
    };

    const handleFormChange = (field, value) => {
        if (isArchived) return;
        const newFormState = { ...journalForm, [field]: value };
        setJournalForm(newFormState);

        let actualWorkToSave = (field === 'actual_work') ? value : newFormState.actual_work;
        if (isInterro) {
            actualWorkToSave = `[INTERRO] ${ (field === 'actual_work') ? value : newFormState.actual_work }`;
        }

        const entryData = { ...newFormState, id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, actual_work: actualWorkToSave };
        debouncedSave(entryData);

        const dayKey = getDayKeyFromDateFnsString(selectedDayForJournal.dayOfWeekKey);
        const allCoursesForThisDay = getCoursesGroupedByDay[dayKey] || [];
        const otherCourses = allCoursesForThisDay.filter(course => course.id !== selectedCourseForJournal.id);

        if ((courseStatus === 'holiday' || (courseStatus === 'cancelled' && cancelEntireDay)) && field === 'notes') {
            const statusToPropagate = courseStatus === 'holiday' ? '[HOLIDAY]' : '[CANCELLED]';
            otherCourses.forEach(courseToUpdate => {
                const existingEntry = getJournalEntry(courseToUpdate.id, selectedDayForJournal.key);
                debouncedSave({ id: existingEntry?.id || null, schedule_id: courseToUpdate.id, date: selectedDayForJournal.key, planned_work: '', actual_work: statusToPropagate, notes: value });
            });
        }

        if (copyToNextSlot && nextCourseSlot) {
            const nextEntry = getJournalEntry(nextCourseSlot.id, selectedDayForJournal.key);
            const nextEntryData = { ...newFormState, id: nextEntry?.id || null, schedule_id: nextCourseSlot.id, date: selectedDayForJournal.key, actual_work: actualWorkToSave };
            debouncedSave(nextEntryData);
        }
    };
    const handleStatusChange = (e) => {
        if (isArchived) return;
        const newStatus = e.target.value;
        setCourseStatus(newStatus);
        let newFormState = { planned_work: '', actual_work: '', notes: journalForm.notes || '' };

        if (newStatus === 'cancelled') {
            newFormState.actual_work = '[CANCELLED]';
        } else if (newStatus === 'exam') {
            newFormState.actual_work = '[EXAM]';
            newFormState.notes = journalForm.notes || 'Sujet : ';
        } else if (newStatus === 'holiday') {
            newFormState.actual_work = '[HOLIDAY]';
            newFormState.notes = journalForm.notes || 'Férié';
        } else {
            newFormState = { planned_work: journalForm.planned_work, actual_work: '', notes: '' };
        }

        setJournalForm(newFormState);
        const entryData = { id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...newFormState };
        debouncedSave(entryData);

        const dayKey = getDayKeyFromDateFnsString(selectedDayForJournal.dayOfWeekKey);
        const allCoursesForThisDay = getCoursesGroupedByDay[dayKey] || [];

        if (newStatus === 'holiday') {
            const otherCoursesToUpdate = allCoursesForThisDay.filter(course => course.id !== selectedCourseForJournal.id);
            otherCoursesToUpdate.forEach(courseToUpdate => {
                const existingEntry = getJournalEntry(courseToUpdate.id, selectedDayForJournal.key);
                debouncedSave({ id: existingEntry?.id || null, schedule_id: courseToUpdate.id, date: selectedDayForJournal.key, planned_work: '', actual_work: '[HOLIDAY]', notes: newFormState.notes });
            });
            if (otherCoursesToUpdate.length > 0) success(`Toute la journée a été marquée comme "Vacances".`);
        }

        if (newStatus === 'exam') {
            const otherCoursesOfSameClass = allCoursesForThisDay.filter(c => c.classId === selectedCourseForJournal.classId && c.id !== selectedCourseForJournal.id);
            otherCoursesOfSameClass.forEach(courseToUpdate => {
                const existingEntry = getJournalEntry(courseToUpdate.id, selectedDayForJournal.key);
                debouncedSave({ id: existingEntry?.id || null, schedule_id: courseToUpdate.id, date: selectedDayForJournal.key, planned_work: '', actual_work: '[EXAM]', notes: newFormState.notes });
            });
            if (otherCoursesOfSameClass.length > 0) success(`Tous les cours de la classe pour cette journée ont été marqués comme "Examen".`);
        }
    };

    // --- AJOUT : Handler pour la case à cocher d'annulation de journée ---
    const handleCancelEntireDayChange = (e) => {
        const isChecked = e.target.checked;
        setCancelEntireDay(isChecked);

        if (isChecked) {
            const dayKey = getDayKeyFromDateFnsString(selectedDayForJournal.dayOfWeekKey);
            const allCoursesForThisDay = getCoursesGroupedByDay[dayKey] || [];
            const otherCoursesToUpdate = allCoursesForThisDay.filter(course => course.id !== selectedCourseForJournal.id);

            otherCoursesToUpdate.forEach(courseToUpdate => {
                const existingEntry = getJournalEntry(courseToUpdate.id, selectedDayForJournal.key);
                debouncedSave({
                    id: existingEntry?.id || null,
                    schedule_id: courseToUpdate.id,
                    date: selectedDayForJournal.key,
                    planned_work: '',
                    actual_work: '[CANCELLED]',
                    notes: journalForm.notes // On utilise la note actuelle
                });
            });
            if (otherCoursesToUpdate.length > 0) success(`Toute la journée a été marquée comme "Annulée".`);
        }
    };

    const handleIsInterroChange = async (e) => {
        const isChecked = e.target.checked;
        setIsInterro(isChecked);

        const currentActualWork = journalForm.actual_work.replace('[INTERRO]', '').trim();
        const newActualWork = isChecked ? `[INTERRO] ${currentActualWork}` : currentActualWork;

        const updatedForm = { ...journalForm, actual_work: newActualWork };
        const entryData = { id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...updatedForm };
        debouncedSave(entryData);

        // --- NOUVELLE LOGIQUE POUR L'ASSIGNATION ---
        if (isChecked) {
            // Créer une nouvelle assignation (ou la mettre à jour si elle existe)
            const newAssignment = {
                // On utilise les informations du cours sélectionné
                class_id: selectedCourseForJournal.classId,
                subject: selectedCourseForJournal.subject,
                type: 'Interro',
                description: updatedForm.actual_work.replace('[INTERRO]', '').trim(),
                due_date: selectedDayForJournal.key, // La date de l'interro est la date d'échéance
                is_completed: true, // L'interro est considérée comme "terminée"
                is_corrected: false,
            };

            // Chercher si une assignation pour cette interro existe déjà
            const existingAssignment = assignments.find(
                a => a.class_id === newAssignment.class_id &&
                    a.subject === newAssignment.subject &&
                    a.type === 'Interro' &&
                    a.due_date === newAssignment.due_date
            );

            // Si elle existe, on met à jour son ID pour la fonction upsert
            if (existingAssignment) {
                newAssignment.id = existingAssignment.id;
                // On s'assure de ne pas écraser l'état "corrigé" si c'est déjà fait
                newAssignment.is_corrected = existingAssignment.is_corrected;
            }

            try {
                await upsertAssignment(newAssignment);
                success('Une assignation "Interro" a été créée ou mise à jour.');
            } catch (err) {
                showError('Erreur lors de la création de l\'assignation: ' + err.message);
            }
        } else {
            // Si on décoche la case, on peut potentiellement supprimer l'assignation si elle existe
            const existingAssignment = assignments.find(
                a => a.class_id === selectedCourseForJournal.classId &&
                    a.subject === selectedCourseForJournal.subject &&
                    a.type === 'Interro' &&
                    a.due_date === selectedDayForJournal.key
            );
            if (existingAssignment) {
                try {
                    await deleteAssignment(existingAssignment.id);
                    success('L\'assignation "Interro" a été supprimée.');
                } catch (err) {
                    showError('Erreur lors de la suppression de l\'assignation: ' + err.message);
                }
            }
        }
    };

    const handleCopyToNextSlotChange = async (e) => {
        if (isArchived) return;
        const isChecked = e.target.checked;
        setCopyToNextSlot(isChecked);
        if (isChecked && nextCourseSlot) {
            try {
                const nextEntry = getJournalEntry(nextCourseSlot.id, selectedDayForJournal.key);
                await upsertJournalEntry({ id: nextEntry?.id || null, schedule_id: nextCourseSlot.id, date: selectedDayForJournal.key, ...journalForm });
                success('Notes copiées sur le créneau suivant.');
            } catch (err) {
                showError('Erreur lors de la copie: ' + err.message);
                setCopyToNextSlot(false);
            }
        }
    };

    const handleOpenJournalModal = useCallback((course, day) => {
        setSelectedCourseForJournal(course);
        setSelectedDayForJournal(day);
        setCancelEntireDay(false);
        const entry = getJournalEntry(course.id, day.key);
        setIsInterro(entry?.actual_work?.startsWith('[INTERRO]') || false);
        let status = 'given';
        if (entry) {
            if (entry.actual_work === '[CANCELLED]') status = 'cancelled';
            else if (entry.actual_work === '[EXAM]') status = 'exam';
            else if (entry.actual_work === '[HOLIDAY]') status = 'holiday';
        }
        setCourseStatus(status);
        setJournalForm({ planned_work: entry?.planned_work || '', actual_work: entry?.actual_work || '', notes: entry?.notes || '' });
        setCurrentJournalEntryId(entry?.id || null);
        setCopyToNextSlot(false);
        const dayKeyForSchedule = getDayKeyFromDateFnsString(day.dayOfWeekKey);
        const coursesForThisDay = getCoursesGroupedByDay[dayKeyForSchedule] || [];
        const currentIndex = coursesForThisDay.findIndex(c => c.id === course.id);
        const nextCourse = (currentIndex > -1 && currentIndex + 1 < coursesForThisDay.length) ? coursesForThisDay[currentIndex + 1] : null;
        setNextCourseSlot(nextCourse && nextCourse.classId === course.classId && nextCourse.subject === course.subject ? nextCourse : null);
        setShowJournalModal(true);
    }, [getJournalEntry, getCoursesGroupedByDay, getDayKeyFromDateFnsString]);

    const handleCloseJournalModal = useCallback(() => { setShowJournalModal(false); setCourseStatus('given'); }, []);
    const getClassInfo = useCallback((classId) => classes.find(cls => cls.id === classId), [classes]);
    const navigateWeek = useCallback((direction) => setCurrentWeekStart(prev => addDays(prev, direction * 7)), []);
    const goToToday = useCallback(() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr })), []);

    const isCourseDayForClass = useCallback((classId, date) => {
        if (!classId || !date || !schedule.data) return false;
        const dayKey = getDayKeyFromDateFnsString(format(date, 'EEEE', { locale: fr }).toLowerCase());
        return Object.values(schedule.data).some(course => course.day === dayKey && course.classId == classId);
    }, [schedule.data, getDayKeyFromDateFnsString]);

    const availableDueDates = useMemo(() => {
        const dates = [];
        if (!assignmentForm.class_id) return [];
        for (let i = 0; i < 5; i++) {
            const date = addDays(currentWeekStart, i);
            if (isCourseDayForClass(assignmentForm.class_id, date) && !getHolidayForDate(date)) {
                dates.push({ value: format(date, 'yyyy-MM-dd'), label: format(date, 'EEEE dd MMMM', { locale: fr }) });
            }
        }
        return dates;
    }, [assignmentForm.class_id, currentWeekStart, isCourseDayForClass, getHolidayForDate]);

    useEffect(() => {
        if (loadingSchedule || loadingHolidays || !currentJournal) return;
        if (!errorSchedule && schedule) {
            const startDate = format(currentWeekStart, 'yyyy-MM-dd');
            const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1, locale: fr }), 'yyyy-MM-dd');
            fetchJournalEntries(startDate, endDate);
            fetchAssignments(null, startDate, endDate);
        }
    }, [currentWeekStart, schedule, loadingSchedule, errorSchedule, loadingHolidays, fetchJournalEntries, fetchAssignments, currentJournal]);

    const handleDeleteJournalEntry = useCallback(async () => {
        if (!currentJournalEntryId || isArchived) return;
        try {
            await deleteJournalEntry(currentJournalEntryId);
            success('Entrée de journal supprimée !');
            handleCloseJournalModal();
        } catch (err) { showError(`Erreur: ${err.message || 'Impossible de supprimer l\'entrée'}`); }
    }, [currentJournalEntryId, deleteJournalEntry, success, showError, handleCloseJournalModal, isArchived]);

    const handleAddAssignment = useCallback(() => {
        if (isArchived) return;
        setSelectedAssignment(null);
        setAssignmentForm({ id: null, class_id: '', subject: '', type: 'Devoir', description: '', due_date: '', is_completed: false, is_corrected: false });
        setShowAssignmentModal(true);
    }, [isArchived]);

    const handleEditAssignment = useCallback((assignment) => {
        console.log("here");
        console.log("here");
        if (isArchived) return;
        setSelectedAssignment(assignment);
        setAssignmentForm({ ...assignment, due_date: assignment.due_date ? format(parseISO(assignment.due_date), 'yyyy-MM-dd') : '' });
        setShowAssignmentModal(true);
    }, [isArchived]);

    const handleSaveAssignment = useCallback(async (e) => {
        e.preventDefault();
        if (isArchived) return;
        if (!assignmentForm.class_id || !assignmentForm.subject || !assignmentForm.type || !assignmentForm.due_date) {
            return showError('Veuillez remplir tous les champs obligatoires.');
        }
        try {
            await upsertAssignment(assignmentForm);
            success('Assignation sauvegardée !');
            setShowAssignmentModal(false);
        } catch (err) { showError(err.message || "Erreur lors de la sauvegarde de l'assignation"); }
    }, [assignmentForm, upsertAssignment, success, showError, isArchived]);

    const handleDeleteAssignment = useCallback(async () => {
        if (!selectedAssignment?.id || isArchived) return;
        try {
            await deleteAssignment(selectedAssignment.id);
            success('Assignation supprimée !');
            setShowAssignmentModal(false);
            closeConfirmModal();
        } catch (err) { showError(`Erreur: ${err.message || 'Impossible de supprimer l\'assignation'}`); }
    }, [selectedAssignment, deleteAssignment, success, showError, closeConfirmModal, isArchived]);

    const handleDeleteAssignmentConfirm = useCallback(() => {
        if (isArchived) return;
        setConfirmModal({ isOpen: true, title: 'Supprimer l\'assignation', message: 'Êtes-vous sûr de vouloir supprimer cette assignation ?', onConfirm: handleDeleteAssignment });
    }, [handleDeleteAssignment, isArchived]);

    const isLoading = loadingHours || loadingSchedule || loadingHolidays;
    if (isLoading) return <div className="journal-page"><div className="loading-message">Chargement...</div></div>;
    if (errorHours || errorSchedule) return <div className="journal-page"><div className="error-message">Erreur de chargement des données.</div></div>;

    const hasSchedule = schedule?.data && Object.keys(schedule.data).length > 0;

    return (
        <div className="journal-page">
            <div className="journal-header">
                <div className="journal-header-left"><h1>{currentJournal?.name}</h1></div>
                <div className="week-navigation">
                    <button className="btn-secondary" onClick={goToStart} disabled={isPrevDisabled} title="Aller au début">&lt;&lt;</button>
                    <button className="btn-secondary" onClick={() => navigateWeek(-1)} disabled={isPrevDisabled} title="Semaine précédente">&lt; Précédent</button>
                    <button className="btn-today" onClick={goToToday}>Aujourd'hui</button>
                    <span>{format(currentWeekStart, 'dd/MM/yyyy', { locale: fr })} - {format(addDays(currentWeekStart, 4), 'dd/MM/yyyy', { locale: fr })}</span>
                    <button className="btn-secondary" onClick={() => navigateWeek(1)} disabled={isNextDisabled} title="Semaine suivante">Suivant &gt;</button>
                    <button className="btn-secondary" onClick={goToEnd} disabled={isNextDisabled} title="Aller à la fin">&gt;&gt;</button>
                </div>
            </div>
            <div className="journal-content">
                <div className="weekly-agenda-section">
                    <h2>Journal des cours</h2>
                    <div className="journal-days-container">
                        {hasSchedule ? (
                            weekDays.map(day => {
                                const dayKeyForSchedule = day.dayOfWeekKey;
                                const coursesForThisDay = getCoursesGroupedByDay[dayKeyForSchedule] || [];
                                const validCoursesForThisDay = coursesForThisDay.filter(course => course.classId != null);
                                if (validCoursesForThisDay.length === 0 && !day.isHoliday) { return null; }
                                return (
                                    <div key={day.key} className={`day-column ${day.isHoliday ? 'is-holiday' : ''}`}>
                                        <div className="day-header-journal">{day.label}</div>
                                        <div className="day-content">
                                            {day.isHoliday ? (<div className="holiday-card"><span className="holiday-icon">🎉</span><span className="holiday-name">{day.holidayName}</span></div>) : (
                                                <div className="day-courses-list">
                                                    {validCoursesForThisDay.length > 0 ? validCoursesForThisDay.map(courseInSchedule => {
                                                        const classInfo = courseInSchedule
                                                        const journalEntry = getJournalEntry(courseInSchedule.id, day.key);
                                                        const isCancelled = journalEntry?.actual_work === '[CANCELLED]';
                                                        const isExam = journalEntry?.actual_work === '[EXAM]';
                                                        const isManualHoliday = journalEntry?.actual_work === '[HOLIDAY]';
                                                        const isInterro = journalEntry?.actual_work?.startsWith('[INTERRO]');
                                                        const specialStatusNote = journalEntry?.notes;
                                                        let journalPreview = { text: null, className: '' };
                                                        if (journalEntry && !isCancelled && !isExam && !isManualHoliday) {
                                                            const workText = journalEntry.actual_work || journalEntry.planned_work;
                                                            journalPreview.text = isInterro ? workText.replace('[INTERRO]', '').trim() : workText;
                                                            journalPreview.className = journalEntry.actual_work ? 'actual-work' : 'planned-work';
                                                        }
                                                        return (
                                                            <div key={courseInSchedule.id}
                                                                 className={`journal-slot has-course ${isCancelled ? 'is-cancelled' : ''} ${isExam ? 'is-exam' : ''} ${isManualHoliday ? 'is-holiday' : ''} ${isInterro ? 'is-interro' : ''}`}
                                                                 style={{ borderColor: isCancelled ? 'var(--red-danger)' : (isExam || isManualHoliday) ? 'var(--accent-orange)' : getClassColor(courseInSchedule.subject, courseInSchedule.classLevel) }}
                                                                 onClick={() => handleOpenJournalModal(courseInSchedule, day)} >
                                                                {isManualHoliday ? (
                                                                    <div className="cancellation-display holiday-display"><span className="cancellation-icon">🌴</span><p className="cancellation-label">Vacances - Férié</p><p className="cancellation-reason">{specialStatusNote}</p></div>
                                                                ) : isCancelled ? (
                                                                    <div className="cancellation-display"><span className="cancellation-icon">🚫</span><p className="cancellation-label">ANNULÉ</p><p className="cancellation-reason">{specialStatusNote}</p></div>
                                                                ) : isExam ? (
                                                                    <div className="cancellation-display exam-display"><span className="cancellation-icon">✍️</span><p className="cancellation-label">EXAMEN</p><p className="cancellation-reason">{specialStatusNote}</p></div>
                                                                ) : (
                                                                    <div className="course-summary">
                                                                        <div className="course-info-header"><span className="course-time-display">{courseInSchedule.time_slot_libelle}</span><span className="course-class-display">{classInfo.className || 'Classe inconnue'}</span></div>
                                                                        <div className="course-details">
                                                                            <div className="course-title-display">{courseInSchedule.subject}</div>
                                                                            <div className="course-room-display">{courseInSchedule.room}</div>
                                                                        </div>
                                                                        {journalPreview.text && (<div className={`journal-entry-preview ${journalPreview.className}`}><span className="preview-icon"></span>
                                                                            <p className="preview-text">
                                                                                {isInterro && <span className="interro-prefix">Interro : </span>}
                                                                                {journalPreview.text}</p>
                                                                        </div>)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }) : <div className="no-courses-for-day-message">Aucun cours ce jour-là.</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-courses-message">
                                <p>Votre emploi du temps semble vide.</p>
                                <p>Veuillez le configurer pour pouvoir utiliser le journal de classe.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="assignments-section">
                    <h2>Assignations & Évaluations</h2>
                    {!isArchived && <button className="btn-primary" onClick={handleAddAssignment}>+ Nouvelle Assignation</button>}
                    {assignments.length === 0 ? <p>Aucune assignation prévue cette semaine.</p> : (
                        <div className="assignment-list">
                            {assignments.map(assign => {
                                const assignClass = getClassInfo(assign.class_id);
                                return (
                                    <div key={assign.id} className={`assignment-item ${assign.is_completed && assign.is_corrected ? 'fully-corrected' : ''}`}>
                                        <input type="checkbox" checked={assign.is_completed} title="Terminé ?" onChange={() => { if(!isArchived) {const payload = { ...assign, is_completed: !assign.is_completed }; if (!payload.is_completed) payload.is_corrected = false; upsertAssignment(payload); }}} disabled={isArchived} />
                                        <div className="assignment-details">
                                            <h4>{assign.subject} ({assign.type})</h4>
                                            <p>Pour le: {format(parseISO(assign.due_date), 'dd/MM/yy', { locale: fr })} - {assignClass?.name}</p>
                                        </div>
                                        {assign.is_completed && (
                                            <div className="corrected-checkbox-wrapper">
                                                <label htmlFor={`corrected-${assign.id}`}>Corrigé</label>
                                                <input type="checkbox" id={`corrected-${assign.id}`} title="Corrigé ?" checked={!!assign.is_corrected} onChange={() => {if(!isArchived) upsertAssignment({ id: assign.id, is_corrected: !assign.is_corrected })}} disabled={isArchived}/>
                                            </div>
                                        )}
                                        {!isArchived && <button className="btn-edit" onClick={() => handleEditAssignment(assign)}>✏️</button>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {showJournalModal && selectedCourseForJournal && selectedDayForJournal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header"><h3>Notes pour {selectedCourseForJournal.subject} le {format(parseISO(selectedDayForJournal.key), 'EEEE dd/MM', { locale: fr })}</h3><button className="modal-close" onClick={handleCloseJournalModal}>×</button></div>
                        <div className="modal-body-content">
                            <div className="form-group">
                                <label>Statut du cours</label>
                                <select value={courseStatus} onChange={handleStatusChange} className="status-select" disabled={isArchived}>
                                    <option value="given">Cours donné</option>
                                    <option value="cancelled">Cours annulé</option>
                                    <option value="exam">Période d'examen</option>
                                    <option value="holiday">Vacances / Férié</option>
                                </select>
                            </div>
                            {/* --- MODIFICATION ICI --- */}
                            {/* On affiche "Travail Prévu" si le cours est 'given' OU 'cancelled' */}
                            {(courseStatus === 'given' || courseStatus === 'cancelled') && (
                                <div className="form-group">
                                    <label>Travail Prévu:</label>
                                    <textarea value={journalForm.planned_work} onChange={(e) => handleFormChange('planned_work', e.target.value)} placeholder="Décrivez le travail prévu..." rows="3" disabled={isArchived}/>
                                </div>
                            )}

                            {courseStatus === 'given' ? (
                                <>
                                    <div className="form-group">
                                        <label>Travail Effectué:</label>
                                        <textarea value={journalForm.actual_work} onChange={(e) => handleFormChange('actual_work', e.target.value)} placeholder="Décrivez le travail réellement effectué..." rows="3" disabled={isArchived}/>
                                    </div>
                                    <div className="form-group checkbox-group">
                                        <input type="checkbox" id="isInterro" checked={isInterro} onChange={handleIsInterroChange} disabled={isArchived} />
                                        <label htmlFor="isInterro">Cette heure de cours est une interrogation</label>
                                    </div>
                                    <div className="form-group"><label>Notes Supplémentaires:</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ajoutez des notes ici..." rows="2" disabled={isArchived}/></div>
                                    {nextCourseSlot && !isArchived && (<div className="form-group checkbox-group copy-next-group"><input type="checkbox" id="copyToNextSlot" checked={copyToNextSlot} onChange={handleCopyToNextSlotChange} /><label htmlFor="copyToNextSlot">Copier sur le créneau suivant ({nextCourseSlot.time_slot_libelle})</label></div>)}
                                </>
                            ) : courseStatus === 'cancelled' ? (
                                <>
                                    <div className="form-group"><label>Raison de l'annulation (Notes)</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ex: Grève, Maladie..." rows="3" disabled={isArchived}/></div>
                                    <div className="form-group checkbox-group">
                                        <input type="checkbox" id="cancelEntireDay" checked={cancelEntireDay} onChange={handleCancelEntireDayChange} disabled={isArchived} />
                                        <label htmlFor="cancelEntireDay">Annuler toute la journée</label>
                                    </div>
                                </>
                            ) : courseStatus === 'exam' ? (
                                <div className="form-group"><label>Sujet de l'examen / Informations</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ex: Sujet de l'examen, matériel autorisé..." rows="3" disabled={isArchived}/></div>
                            ) : ( // courseStatus === 'holiday'
                                <div className="form-group"><label>Motif (Jour blanc, etc.)</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ex: Jour blanc, Fête de l'école..." rows="3" disabled={isArchived}/></div>
                            )}
                        </div>
                        <div className="modal-footer">
                            {currentJournalEntryId && !isArchived && <button type="button" className="btn-danger" onClick={handleDeleteJournalEntry}>Supprimer l'entrée</button>}
                            <button type="button" className="btn-secondary" onClick={handleCloseJournalModal}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}
            {showAssignmentModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{selectedAssignment ? 'Modifier l\'assignation' : 'Nouvelle assignation'}</h3>
                            <button className="modal-close" onClick={() => setShowAssignmentModal(false)}>×</button>
                        </div>
                        <div className="modal-body-content">
                            <form onSubmit={handleSaveAssignment}>
                                <div className="form-group">
                                    <label>Classe</label>
                                    <select
                                        value={assignmentForm.class_id}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, class_id: e.target.value })}
                                        required
                                        disabled={isArchived}
                                    >
                                        <option value="">Sélectionnez une classe</option>
                                        {classes.map(cls => (
                                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Matière</label>
                                    <input
                                        type="text"
                                        value={assignmentForm.subject}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })}
                                        required
                                        disabled={isArchived}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        value={assignmentForm.type}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })}
                                        required
                                        disabled={isArchived}
                                    >
                                        {assignmentTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={assignmentForm.description}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                                        rows="3"
                                        disabled={isArchived}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date d'échéance</label>
                                    <select
                                        value={assignmentForm.due_date}
                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                                        required
                                        disabled={isArchived}
                                    >
                                        <option value="">Sélectionnez une date</option>
                                        {availableDueDates.map(date => (
                                            <option key={date.value} value={date.value}>{date.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-footer">
                                    {selectedAssignment && !isArchived && (
                                        <button type="button" className="btn-danger" onClick={handleDeleteAssignmentConfirm}>Supprimer</button>
                                    )}
                                    <button type="submit" className="btn-primary" disabled={isArchived}>Sauvegarder</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onClose={closeConfirmModal} onConfirm={confirmModal.onConfirm} confirmText="Supprimer" cancelText="Annuler" type="danger"/>
        </div>
    );
};

export default Journal;