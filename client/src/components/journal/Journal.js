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
        const entryData = { id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...newFormState };
        debouncedSave(entryData);
        if (copyToNextSlot && nextCourseSlot) {
            const nextEntry = getJournalEntry(nextCourseSlot.id, selectedDayForJournal.key);
            const nextEntryData = { id: nextEntry?.id || null, schedule_id: nextCourseSlot.id, date: selectedDayForJournal.key, ...newFormState };
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

        if (newStatus === 'exam') {
            const dayKey = getDayKeyFromDateFnsString(selectedDayForJournal.dayOfWeekKey);
            const coursesForThisDay = getCoursesGroupedByDay[dayKey] || [];
            const otherCoursesOfSameClass = coursesForThisDay.filter(c => c.classId === selectedCourseForJournal.classId && c.id !== selectedCourseForJournal.id);
            otherCoursesOfSameClass.forEach(courseToUpdate => {
                const existingEntry = getJournalEntry(courseToUpdate.id, selectedDayForJournal.key);
                debouncedSave({ id: existingEntry?.id || null, schedule_id: courseToUpdate.id, date: selectedDayForJournal.key, planned_work: '', actual_work: '[EXAM]', notes: newFormState.notes });
            });
            if (otherCoursesOfSameClass.length > 0) success(`Tous les cours de la classe pour cette journée ont été marqués comme "Examen".`);
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
        const entry = getJournalEntry(course.id, day.key);
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
        return Object.values(schedule.data).some(course => course.day === dayKey && course.classId === classId);
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

                                // **LA CORRECTION EST ICI**
                                // On ne garde que les cours avec un classId valide pour éviter les erreurs.
                                const validCoursesForThisDay = coursesForThisDay.filter(course => course.classId != null);

                                if (validCoursesForThisDay.length === 0 && !day.isHoliday) {
                                    return null;
                                }

                                return (
                                    <div key={day.key} className={`day-column ${day.isHoliday ? 'is-holiday' : ''}`}>
                                        <div className="day-header-journal">{day.label}</div>
                                        <div className="day-content">
                                            {day.isHoliday ? (<div className="holiday-card"><span className="holiday-icon">🎉</span><span className="holiday-name">{day.holidayName}</span></div>) : (
                                                <div className="day-courses-list">
                                                    {validCoursesForThisDay.length > 0 ? validCoursesForThisDay.map(courseInSchedule => {
                                                        const classInfo = courseInSchedule;
                                                        const journalEntry = getJournalEntry(courseInSchedule.id, day.key);
                                                        const isCancelled = journalEntry?.actual_work === '[CANCELLED]';
                                                        const isExam = journalEntry?.actual_work === '[EXAM]';
                                                        const isManualHoliday = journalEntry?.actual_work === '[HOLIDAY]';
                                                        const specialStatusNote = journalEntry?.notes;
                                                        let journalPreview = { text: null, className: '' };
                                                        if (journalEntry && !isCancelled && !isExam && !isManualHoliday) {
                                                            journalPreview.text = journalEntry.actual_work || journalEntry.planned_work;
                                                            journalPreview.className = journalEntry.actual_work ? 'actual-work' : 'planned-work';
                                                        }
                                                        return (
                                                            <div key={courseInSchedule.id}
                                                                 className={`journal-slot has-course ${isCancelled ? 'is-cancelled' : ''} ${isExam ? 'is-exam' : ''} ${isManualHoliday ? 'is-holiday' : ''}`}
                                                                 style={{ borderColor: isCancelled ? 'var(--red-danger)' : (isExam || isManualHoliday) ? 'var(--accent-orange)' : getClassColor(classInfo.subject, classInfo.classLevel) }}
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
                                                                        <div className="course-details"><div className="course-title-display">{courseInSchedule.subject}</div><div className="course-room-display">{courseInSchedule.room}</div></div>
                                                                        {journalPreview.text && (<div className={`journal-entry-preview ${journalPreview.className}`}><span className="preview-icon">📝</span><p className="preview-text">{journalPreview.text}</p></div>)}
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
                <div className="assignments-section">{/* ... Assignments section ... */}</div>
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
                            {courseStatus === 'given' ? (
                                <>
                                    <div className="form-group"><label>Travail Prévu:</label><textarea value={journalForm.planned_work} onChange={(e) => handleFormChange('planned_work', e.target.value)} placeholder="Décrivez le travail prévu..." rows="3" disabled={isArchived}/></div>
                                    <div className="form-group"><label>Travail Effectué:</label><textarea value={journalForm.actual_work} onChange={(e) => handleFormChange('actual_work', e.target.value)} placeholder="Décrivez le travail réellement effectué..." rows="3" disabled={isArchived}/></div>
                                    <div className="form-group"><label>Notes Supplémentaires:</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ajoutez des notes ici..." rows="2" disabled={isArchived}/></div>
                                    {nextCourseSlot && !isArchived && (<div className="form-group checkbox-group copy-next-group"><input type="checkbox" id="copyToNextSlot" checked={copyToNextSlot} onChange={handleCopyToNextSlotChange} /><label htmlFor="copyToNextSlot">Copier sur le créneau suivant ({nextCourseSlot.time_slot_libelle})</label></div>)}
                                </>
                            ) : courseStatus === 'cancelled' ? (
                                <div className="form-group"><label>Raison de l'annulation</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ex: Grève, Maladie..." rows="3" disabled={isArchived}/></div>
                            ) : courseStatus === 'exam' ? (
                                <div className="form-group"><label>Sujet de l'examen / Informations</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ex: Sujet de l'examen, matériel autorisé..." rows="3" disabled={isArchived}/></div>
                            ) : (
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
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onClose={closeConfirmModal} onConfirm={confirmModal.onConfirm} confirmText="Supprimer" cancelText="Annuler" type="danger"/>
        </div>
    );
};

export default Journal;