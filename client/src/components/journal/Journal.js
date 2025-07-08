// client/src/components/journal/Journal.js
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
import { format, addDays, startOfWeek, endOfWeek, parseISO, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const Journal = () => {
    const { currentJournal } = useJournal();
    return currentJournal ? <JournalView /> : <JournalPicker />;
};

const JournalView = () => {
    const { currentJournal, upsertJournalEntry, deleteJournalEntry, upsertAssignment, deleteAssignment, fetchJournalEntries, fetchAssignments, journalEntries, assignments } = useJournal();
    const { classes, getClassColor } = useClasses();
    const { hours, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule();
    const { success, error: showError } = useToast();
    const { getHolidayForDate, loading: loadingHolidays } = useHolidays();

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
    const [courseStatus, setCourseStatus] = useState('given'); // 'given' ou 'cancelled'

    const isArchived = currentJournal?.is_archived;

    // --- MEMOS & CALLBACKS ---
    const closeConfirmModal = useCallback(() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null }), []);
    const assignmentTypes = ['Interro', 'Devoir', 'Projet', 'Examen', 'Autre'];
    const getDayKeyFromDateFnsString = useCallback((dayName) => ({'lundi':'monday','mardi':'tuesday','mercredi':'wednesday','jeudi':'thursday','vendredi':'friday','saturday':'saturday','dimanche':'sunday'}[dayName]||dayName),[]);

    const weekDays = useMemo(() => Array.from({ length: 5 }).map((_, i) => {
        const date = addDays(currentWeekStart, i);
        const holidayInfo = getHolidayForDate(date);
        return { date, key: format(date, 'yyyy-MM-dd'), label: format(date, 'EEEE dd/MM', { locale: fr }), dayOfWeekKey: getDayKeyFromDateFnsString(format(date, 'EEEE', { locale: fr }).toLowerCase()), isHoliday: !!holidayInfo, holidayName: holidayInfo?.name || null };
    }), [currentWeekStart, getDayKeyFromDateFnsString, getHolidayForDate]);

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
                if (savedEntry && savedEntry.id && entryData.schedule_id === selectedCourseForJournal.id) {
                    setCurrentJournalEntryId(savedEntry.id);
                }
            } catch (err) {
                showError('Erreur de sauvegarde: ' + err.message);
            } finally {
                setJournalDebounce(prev => { const newState = { ...prev }; delete newState[keyForDebounce]; return newState; });
            }
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
        let newFormState;
        if (newStatus === 'cancelled') {
            newFormState = { planned_work: '', actual_work: '[CANCELLED]', notes: journalForm.notes };
        } else {
            newFormState = { planned_work: journalForm.planned_work, actual_work: '', notes: '' };
        }
        setJournalForm(newFormState);
        const entryData = { id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...newFormState };
        debouncedSave(entryData);
    };

    const handleCopyToNextSlotChange = async (e) => {
        if (isArchived) return;
        const isChecked = e.target.checked;
        setCopyToNextSlot(isChecked);

        if (isChecked && nextCourseSlot) {
            try {
                const nextEntry = getJournalEntry(nextCourseSlot.id, selectedDayForJournal.key);
                const nextEntryData = { id: nextEntry?.id || null, schedule_id: nextCourseSlot.id, date: selectedDayForJournal.key, ...journalForm };
                await upsertJournalEntry(nextEntryData);
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

        if (entry && entry.actual_work === '[CANCELLED]') {
            setCourseStatus('cancelled');
            setJournalForm({ planned_work: '', actual_work: '[CANCELLED]', notes: entry.notes || '' });
        } else {
            setCourseStatus('given');
            setJournalForm({ planned_work: entry?.planned_work || '', actual_work: entry?.actual_work || '', notes: entry?.notes || '' });
        }

        setCurrentJournalEntryId(entry?.id || null);
        setCopyToNextSlot(false);

        const dayKeyForSchedule = getDayKeyFromDateFnsString(day.dayOfWeekKey);
        const coursesForThisDay = getCoursesGroupedByDay[dayKeyForSchedule] || [];
        const currentIndex = coursesForThisDay.findIndex(c => c.id === course.id);
        const nextCourse = (currentIndex > -1 && currentIndex + 1 < coursesForThisDay.length) ? coursesForThisDay[currentIndex + 1] : null;

        if (nextCourse && nextCourse.classId === course.classId && nextCourse.subject === course.subject) {
            setNextCourseSlot(nextCourse);
        } else {
            setNextCourseSlot(null);
        }
        setShowJournalModal(true);
    }, [getJournalEntry, getCoursesGroupedByDay, getDayKeyFromDateFnsString]);

    const handleCloseJournalModal = useCallback(() => {
        setShowJournalModal(false);
        setCourseStatus('given');
    }, []);

    const getClassInfo = useCallback((classId) => classes.find(cls => cls.id === classId), [classes]);
    const navigateWeek = useCallback((direction) => setCurrentWeekStart(prev => addDays(prev, direction * 7)), []);
    const goToToday = useCallback(() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr })), []);

    const isSchoolDay = useCallback((date) => {
        const dayOfWeek = getDay(date);
        return dayOfWeek !== 0 && dayOfWeek !== 6 && !getHolidayForDate(date);
    }, [getHolidayForDate]);

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
            if (isCourseDayForClass(assignmentForm.class_id, date) && isSchoolDay(date)) {
                dates.push({ value: format(date, 'yyyy-MM-dd'), label: format(date, 'EEEE dd MMMM', { locale: fr }) });
            }
        }
        return dates;
    }, [assignmentForm.class_id, currentWeekStart, isCourseDayForClass, isSchoolDay]);

    useEffect(() => {
        if (loadingSchedule || loadingHolidays || !currentJournal) return;
        if (!errorSchedule && schedule) {
            const endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1, locale: fr });
            fetchJournalEntries(format(currentWeekStart, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
            fetchAssignments(null, format(currentWeekStart, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
        }
    }, [currentWeekStart, schedule, loadingSchedule, errorSchedule, loadingHolidays, fetchJournalEntries, fetchAssignments, currentJournal]);

    const handleDeleteJournalEntry = useCallback(async () => {
        if (!currentJournalEntryId || isArchived) return;
        try {
            await deleteJournalEntry(currentJournalEntryId);
            success('Entrée de journal supprimée !');
            handleCloseJournalModal();
        } catch (err) {
            showError(`Erreur: ${err.message || 'Impossible de supprimer l\'entrée'}`);
        }
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
        setAssignmentForm({
            id: assignment.id,
            class_id: assignment.class_id,
            subject: assignment.subject,
            type: assignment.type,
            description: assignment.description || '',
            due_date: assignment.due_date ? format(parseISO(assignment.due_date), 'yyyy-MM-dd') : '',
            is_completed: !!assignment.is_completed,
            is_corrected: !!assignment.is_corrected
        });
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
        } catch (err) {
            showError(err.message || "Erreur lors de la sauvegarde de l'assignation");
        }
    }, [assignmentForm, upsertAssignment, success, showError, isArchived]);

    const handleDeleteAssignment = useCallback(async () => {
        if (!selectedAssignment?.id || isArchived) return;
        try {
            await deleteAssignment(selectedAssignment.id);
            success('Assignation supprimée !');
            setShowAssignmentModal(false);
            closeConfirmModal();
        } catch (err) {
            showError(`Erreur: ${err.message || 'Impossible de supprimer l\'assignation'}`);
        }
    }, [selectedAssignment, deleteAssignment, success, showError, closeConfirmModal, isArchived]);

    const handleDeleteAssignmentConfirm = useCallback(() => {
        if (isArchived) return;
        setConfirmModal({ isOpen: true, title: 'Supprimer l\'assignation', message: 'Êtes-vous sûr de vouloir supprimer cette assignation ?', onConfirm: handleDeleteAssignment });
    }, [handleDeleteAssignment, isArchived]);

    const isLoading = loadingHours || loadingSchedule || loadingHolidays;
    if (isLoading) return <div className="journal-page"><div className="loading-message">Chargement...</div></div>;
    if (errorHours || errorSchedule) return <div className="journal-page"><div className="error-message">Erreur de chargement des données.</div></div>;

    return (
        <div className="journal-page">
            <div className="journal-header">
                <div className="journal-header-left">
                    <h1>{currentJournal?.name}</h1>
                    {isArchived && <span>(Archivé - Lecture seule)</span>}
                </div>
                <div className="week-navigation">
                    <button className="btn-secondary" onClick={() => navigateWeek(-1)}>&lt; Précédent</button>
                    <button className="btn-today" onClick={goToToday}>Aujourd'hui</button>
                    <span>{format(currentWeekStart, 'dd/MM/yyyy', { locale: fr })} - {format(addDays(currentWeekStart, 4), 'dd/MM/yyyy', { locale: fr })}</span>
                    <button className="btn-secondary" onClick={() => navigateWeek(1)}>Suivant &gt;</button>
                </div>
            </div>
            <div className="journal-content">
                <div className="weekly-agenda-section">
                    <h2>Journal des cours</h2>
                    <div className="journal-days-container">
                        {weekDays.map(day => {
                            const dayKeyForSchedule = getDayKeyFromDateFnsString(day.dayOfWeekKey);
                            const coursesForThisDay = getCoursesGroupedByDay[dayKeyForSchedule] || [];
                            if (!day.isHoliday && coursesForThisDay.length === 0) return null;
                            return (
                                <div key={day.key} className={`day-column ${day.isHoliday ? 'is-holiday' : ''}`}>
                                    <div className="day-header-journal">{day.label}</div>
                                    <div className="day-content">
                                        {day.isHoliday ? (
                                            <div className="holiday-card"><span className="holiday-icon">🎉</span><span className="holiday-name">{day.holidayName}</span></div>
                                        ) : (
                                            <div className="day-courses-list">
                                                {coursesForThisDay.map(courseInSchedule => {
                                                    const classInfo = getClassInfo(courseInSchedule.classId);
                                                    const journalEntry = getJournalEntry(courseInSchedule.id, day.key);
                                                    const isCancelled = journalEntry && journalEntry.actual_work === '[CANCELLED]';
                                                    const cancellationReason = isCancelled ? journalEntry.notes : null;

                                                    let journalPreview = { text: null, className: '' };
                                                    if (journalEntry && !isCancelled) {
                                                        journalPreview.text = journalEntry.actual_work || journalEntry.planned_work;
                                                        journalPreview.className = journalEntry.actual_work ? 'actual-work' : 'planned-work';
                                                    }

                                                    return (
                                                        <div
                                                            key={courseInSchedule.id}
                                                            className={`journal-slot has-course ${isCancelled ? 'is-cancelled' : ''}`}
                                                            style={{ backgroundColor: `${getClassColor(courseInSchedule.subject, classInfo?.level)}20`, borderColor: isCancelled ? 'var(--red-danger)' : getClassColor(courseInSchedule.subject, classInfo?.level) }}
                                                            onClick={() => handleOpenJournalModal(courseInSchedule, day)}
                                                        >
                                                            {isCancelled ? (
                                                                <div className="cancellation-display">
                                                                    <span className="cancellation-icon">🚫</span>
                                                                    <p className="cancellation-label">ANNULÉ</p>
                                                                    <p className="cancellation-reason">{cancellationReason}</p>
                                                                </div>
                                                            ) : (
                                                                <div className="course-summary">
                                                                    <div className="course-info-header"><span className="course-time-display">{courseInSchedule.time_slot_libelle}</span><span className="course-class-display">{classInfo?.name || 'Classe inconnue'}</span></div>
                                                                    <div className="course-details"><div className="course-title-display">{courseInSchedule.subject}</div><div className="course-room-display">{courseInSchedule.room}</div></div>
                                                                    {journalPreview.text && (<div className={`journal-entry-preview ${journalPreview.className}`}>{journalPreview.className === 'actual-work' && <span className="preview-icon">📝</span>}<p className="preview-text">{journalPreview.text}</p></div>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
            {showAssignmentModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header"><h3>{selectedAssignment ? 'Modifier Assignation' : 'Nouvelle Assignation'}</h3><button className="modal-close" onClick={() => setShowAssignmentModal(false)}>×</button></div>
                        <form className="modal-form" onSubmit={handleSaveAssignment}>
                            <div className="modal-body-content">
                                <div className="form-group"><label>Classe *</label><select value={assignmentForm.class_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, class_id: e.target.value ? parseInt(e.target.value, 10) : '' })} required><option value="">Sélectionnez une classe</option>{classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name} (Niveau: {cls.level})</option>)}</select></div>
                                <div className="form-group"><label>Matière *</label><input type="text" value={assignmentForm.subject} onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })} required /></div>
                                <div className="form-group"><label>Type *</label><select value={assignmentForm.type} onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })} required>{assignmentTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                                <div className="form-group"><label>Description</label><textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} rows="3" /></div>
                                <div className="form-group">
                                    <label>Date d'échéance *</label>
                                    <select value={assignmentForm.due_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })} required disabled={!assignmentForm.class_id || availableDueDates.length === 0}>
                                        <option value="">{assignmentForm.class_id ? (availableDueDates.length > 0 ? 'Sélectionnez une date' : 'Aucun jour de cours disponible') : 'Sélectionnez d\'abord une classe'}</option>
                                        {availableDueDates.map(date => (<option key={date.value} value={date.value}>{date.label}</option>))}
                                    </select>
                                    <small className="form-hint">Seuls les jours de cours pour la classe sélectionnée sont affichés.</small>
                                </div>
                                <div className="form-group checkbox-group"><input type="checkbox" id="completed" checked={assignmentForm.is_completed} onChange={(e) => setAssignmentForm({ ...assignmentForm, is_completed: e.target.checked })} /><label htmlFor="completed">Terminé</label></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowAssignmentModal(false)}>Annuler</button>
                                {selectedAssignment && <button type="button" className="btn-danger" onClick={handleDeleteAssignmentConfirm}>Supprimer</button>}
                                <button type="submit" className="btn-primary">Sauvegarder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showJournalModal && selectedCourseForJournal && selectedDayForJournal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header"><h3>Notes pour {selectedCourseForJournal.subject} le {format(parseISO(selectedDayForJournal.key), 'EEEE dd/MM', { locale: fr })}</h3><button className="modal-close" onClick={handleCloseJournalModal}>×</button></div>
                        <div className="modal-body-content">
                            {(() => {
                                const classInfo = getClassInfo(selectedCourseForJournal.classId);
                                return (<div className="slot-info" style={{ borderLeftColor: getClassColor(selectedCourseForJournal.subject, classInfo?.level) || '#cccccc' }}><p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)'}}>Classe: {classInfo?.name || 'Inconnue'}</p></div>);
                            })()}

                            <div className="form-group">
                                <label>Statut du cours</label>
                                <select value={courseStatus} onChange={handleStatusChange} className="status-select" disabled={isArchived}>
                                    <option value="given">Cours donné</option>
                                    <option value="cancelled">Cours annulé</option>
                                </select>
                            </div>

                            {courseStatus === 'given' ? (
                                <>
                                    <div className="form-group"><label>Travail Prévu:</label><textarea value={journalForm.planned_work} onChange={(e) => handleFormChange('planned_work', e.target.value)} placeholder="Décrivez le travail prévu..." rows="3" disabled={isArchived}/></div>
                                    <div className="form-group"><label>Travail Effectué:</label><textarea value={journalForm.actual_work} onChange={(e) => handleFormChange('actual_work', e.target.value)} placeholder="Décrivez le travail réellement effectué..." rows="3" disabled={isArchived}/></div>
                                    <div className="form-group"><label>Notes Supplémentaires:</label><textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ajoutez des notes ici..." rows="2" disabled={isArchived}/></div>

                                    {nextCourseSlot && !isArchived && (
                                        <div className="form-group checkbox-group copy-next-group">
                                            <input type="checkbox" id="copyToNextSlot" checked={copyToNextSlot} onChange={handleCopyToNextSlotChange} />
                                            <label htmlFor="copyToNextSlot">Copier sur le créneau suivant ({nextCourseSlot.time_slot_libelle})</label>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="form-group">
                                    <label>Raison de l'annulation</label>
                                    <textarea value={journalForm.notes} onChange={(e) => handleFormChange('notes', e.target.value)} placeholder="Ex: Grève, Maladie..." rows="3" disabled={isArchived}/>
                                </div>
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
