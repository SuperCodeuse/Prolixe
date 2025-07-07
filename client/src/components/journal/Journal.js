// client/src/components/journal/Journal.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './Journal.scss';
import { useJournal } from '../../hooks/useJournal';
import { useClasses } from '../../hooks/useClasses';
import { useScheduleHours } from '../../hooks/useScheduleHours';
import { useSchedule } from '../../hooks/useSchedule';
import { useToast } from '../../hooks/useToast';
import { useHolidays } from '../../hooks/useHolidays';
import ConfirmModal from '../ConfirmModal';
import { format, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const Journal = () => {
    // --- 1. HOOKS ---
    const { classes, getClassColor } = useClasses();
    const { hours, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule();
    const { journalEntries, assignments, fetchJournalEntries, fetchAssignments, upsertJournalEntry, deleteJournalEntry, upsertAssignment, deleteAssignment } = useJournal();
    const { success, error: showError } = useToast();
    const { getHolidayForDate, loading: loadingHolidays } = useHolidays();

    // --- 2. STATES ---
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }));
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentForm, setAssignmentForm] = useState({ id: null, classId: '', subject: '', type: 'Devoir', title: '', description: '', due_date: format(new Date(), 'yyyy-MM-dd'), is_completed: false });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [journalDebounce, setJournalDebounce] = useState({});
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [selectedCourseForJournal, setSelectedCourseForJournal] = useState(null);
    const [selectedDayForJournal, setSelectedDayForJournal] = useState(null);
    const [journalForm, setJournalForm] = useState({ planned_work: '', actual_work: '', notes: '' });
    const [currentJournalEntryId, setCurrentJournalEntryId] = useState(null);

    // --- 3. MEMOS & CALLBACKS ---
    const assignmentTypes = ['Interro', 'Devoir', 'Projet', 'Examen', 'Autre'];
    const getDayKeyFromDateFnsString = useCallback((dayName) => ({'lundi':'monday','mardi':'tuesday','mercredi':'wednesday','jeudi':'thursday','vendredi':'friday','samedi':'saturday','dimanche':'sunday'}[dayName]||dayName),[]);

    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 5; i++) {
            const date = addDays(currentWeekStart, i);
            const holidayInfo = getHolidayForDate(date);
            days.push({
                date,
                key: format(date, 'yyyy-MM-dd'),
                label: format(date, 'EEEE dd/MM', { locale: fr }),
                dayOfWeekKey: getDayKeyFromDateFnsString(format(date, 'EEEE', { locale: fr }).toLowerCase()),
                isHoliday: !!holidayInfo,
                holidayName: holidayInfo?.name || null,
            });
        }
        return days;
    }, [currentWeekStart, getDayKeyFromDateFnsString, getHolidayForDate]);

    const getCoursesGroupedByDay = useMemo(() => {
        const grouped = {};
        Object.values(schedule.data || {}).forEach(course => {
            if (!grouped[course.day]) grouped[course.day] = [];
            grouped[course.day].push(course);
        });
        for (const dayKey in grouped) {
            grouped[dayKey].sort((a, b) => {
                const timeA = hours.find(h => h.libelle === a.time_slot_libelle);
                const timeB = hours.find(h => h.libelle === b.time_slot_libelle);
                return (timeA?.order || 0) - (timeB?.order || 0);
            });
        }
        return grouped;
    }, [schedule, hours]);

    const getJournalEntry = useCallback((scheduleId, dateKey) => Object.values(journalEntries).find(entry => entry.schedule_id === scheduleId && entry.date === dateKey), [journalEntries]);

    const handleJournalEntryChange = useCallback(async (entryData, field, value) => {
        const updatedEntryData = { ...entryData, [field]: value };
        const keyForDebounce = `${updatedEntryData.schedule_id}-${updatedEntryData.date}`;
        if (journalDebounce[keyForDebounce]) clearTimeout(journalDebounce[keyForDebounce]);
        const timeoutId = setTimeout(async () => {
            try {
                const savedEntry = await upsertJournalEntry(updatedEntryData);
                if (savedEntry && savedEntry.id) setCurrentJournalEntryId(savedEntry.id);
            } catch (err) {
                showError('Erreur lors de la sauvegarde du journal', 3000);
            } finally {
                setJournalDebounce(prev => { const newState = { ...prev }; delete newState[keyForDebounce]; return newState; });
            }
        }, 1000);
        setJournalDebounce(prev => ({ ...prev, [keyForDebounce]: timeoutId }));
    }, [upsertJournalEntry, showError, journalDebounce]);

    const getClassInfo = useCallback((classId) => classes.find(cls => cls.id === classId), [classes]);
    const navigateWeek = useCallback((direction) => setCurrentWeekStart(prev => addDays(prev, direction * 7)), []);

    const handleOpenJournalModal = useCallback((course, day) => {
        setSelectedCourseForJournal(course);
        setSelectedDayForJournal(day);
        const entry = getJournalEntry(course.id, day.key);
        setJournalForm({ planned_work: entry?.planned_work || '', actual_work: entry?.actual_work || '', notes: entry?.notes || '' });
        setCurrentJournalEntryId(entry?.id || null);
        setShowJournalModal(true);
    }, [getJournalEntry]);

    const handleCloseJournalModal = useCallback(() => {
        setShowJournalModal(false);
        setSelectedCourseForJournal(null);
        setSelectedDayForJournal(null);
        setJournalForm({ planned_work: '', actual_work: '', notes: '' });
        setCurrentJournalEntryId(null);
    }, []);

    const handleDeleteJournalEntry = useCallback(async () => {
        if (!currentJournalEntryId) return;
        try {
            await deleteJournalEntry(currentJournalEntryId);
            success('Entrée de journal supprimée !');
            handleCloseJournalModal();
        } catch (err) {
            showError(`Erreur: ${err.message || 'Impossible de supprimer l\'entrée'}`);
        }
    }, [currentJournalEntryId, deleteJournalEntry, success, showError, handleCloseJournalModal]);

    const handleAddAssignment = useCallback(() => {
        setSelectedAssignment(null);
        setAssignmentForm({ id: null, classId: '', subject: '', type: 'Devoir', title: '', description: '', due_date: format(new Date(), 'yyyy-MM-dd'), is_completed: false });
        setShowAssignmentModal(true);
    }, []);

    const handleEditAssignment = useCallback((assignment) => {
        setSelectedAssignment(assignment);
        setAssignmentForm({
            id: assignment.id,
            classId: assignment.classId,
            subject: assignment.subject,
            type: assignment.type,
            title: assignment.title,
            description: assignment.description || '',
            due_date: assignment.due_date ? format(parseISO(assignment.due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            is_completed: assignment.is_completed
        });
        setShowAssignmentModal(true);
    }, []);

    const handleSaveAssignment = useCallback(async (e) => {
        e.preventDefault();
        if (!assignmentForm.classId || !assignmentForm.subject || !assignmentForm.type || !assignmentForm.title || !assignmentForm.due_date) {
            showError('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        try {
            await upsertAssignment(assignmentForm);
            success('Assignation sauvegardée !');
            setShowAssignmentModal(false);
        } catch (err) {
            showError(`Erreur: ${err.message || 'Impossible de sauvegarder l\'assignation'}`);
        }
    }, [assignmentForm, upsertAssignment, success, showError]);

    const handleDeleteAssignment = useCallback(async () => {
        if (!selectedAssignment?.id) return;
        try {
            await deleteAssignment(selectedAssignment.id);
            success('Assignation supprimée !');
            setShowAssignmentModal(false);
            closeConfirmModal();
        } catch (err) {
            showError(`Erreur: ${err.message || 'Impossible de supprimer l\'assignation'}`);
        }
    }, [selectedAssignment, deleteAssignment, success, showError]);

    const handleDeleteAssignmentConfirm = useCallback(() => {
        setConfirmModal({
            isOpen: true,
            title: 'Supprimer l\'assignation',
            message: `Êtes-vous sûr de vouloir supprimer l'assignation "${selectedAssignment?.title}" ?`,
            onConfirm: handleDeleteAssignment
        });
    }, [selectedAssignment, handleDeleteAssignment]);

    const closeConfirmModal = useCallback(() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null }), []);

    // --- 4. DATA FETCHING ---
    useEffect(() => {
        if (loadingSchedule || loadingHolidays) return;
        if (!errorSchedule && schedule) {
            const endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1, locale: fr });
            fetchJournalEntries(format(currentWeekStart, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
            fetchAssignments(null, format(currentWeekStart, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
        }
    }, [currentWeekStart, schedule, loadingSchedule, errorSchedule, loadingHolidays, fetchJournalEntries, fetchAssignments]);

    // --- 5. LOADING & ERROR STATES ---
    const isLoading = loadingHours || loadingSchedule || loadingHolidays;
    if (isLoading) return <div className="journal-page"><div className="loading-message">Chargement...</div></div>;
    if (errorHours || errorSchedule) return <div className="journal-page"><div className="error-message">Erreur de chargement des données.</div></div>;

    // --- 6. RENDER ---
    return (
        <div className="journal-page">
            <div className="journal-header">
                <h1>Agenda de la semaine</h1>
                <div className="week-navigation">
                    <button className="btn-secondary" onClick={() => navigateWeek(-1)}>&lt; Semaine précédente</button>
                    <span>{format(currentWeekStart, 'dd/MM/yyyy', { locale: fr })} - {format(addDays(currentWeekStart, 6), 'dd/MM/yyyy', { locale: fr })}</span>
                    <button className="btn-secondary" onClick={() => navigateWeek(1)}>Semaine suivante &gt;</button>
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
                                            <div className="holiday-card">
                                                <span className="holiday-icon">🎉</span>
                                                <span className="holiday-name">{day.holidayName}</span>
                                            </div>
                                        ) : (
                                            <div className="day-courses-list">
                                                {coursesForThisDay.map(courseInSchedule => {
                                                    const classInfo = getClassInfo(courseInSchedule.classId);
                                                    const journalEntry = getJournalEntry(courseInSchedule.id, day.key);
                                                    let journalPreview = { text: null, className: '' };
                                                    if (journalEntry) {
                                                        journalPreview.text = journalEntry.actual_work || journalEntry.planned_work;
                                                        journalPreview.className = journalEntry.actual_work ? 'actual-work' : 'planned-work';
                                                    }
                                                    return (
                                                        <div key={courseInSchedule.id} className="journal-slot has-course" style={{ backgroundColor: `${getClassColor(courseInSchedule.subject, classInfo?.level)}20`, borderColor: getClassColor(courseInSchedule.subject, classInfo?.level) }} onClick={() => handleOpenJournalModal(courseInSchedule, day)}>
                                                            <div className="course-summary">
                                                                <div className="course-info-header">
                                                                    <span className="course-time-display">{courseInSchedule.time_slot_libelle}</span>
                                                                    <span className="course-class-display">{classInfo?.name || 'Classe inconnue'}</span>
                                                                </div>
                                                                <div className="course-details">
                                                                    <div className="course-title-display">{courseInSchedule.subject}</div>
                                                                    <div className="course-room-display">{courseInSchedule.room}</div>
                                                                </div>
                                                                {journalPreview.text && (
                                                                    <div className={`journal-entry-preview ${journalPreview.className}`}>
                                                                        {journalPreview.className === 'actual-work' && <span className="preview-icon">📝</span>}
                                                                        <p className="preview-text">{journalPreview.text}</p>
                                                                    </div>
                                                                )}
                                                            </div>
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
                    <button className="btn-primary" onClick={handleAddAssignment}>+ Nouvelle Assignation</button>
                    {assignments.length === 0 ? <p>Aucune assignation prévue cette semaine.</p> : (
                        <div className="assignment-list">
                            {assignments.map(assign => {
                                const assignClass = getClassInfo(assign.classId);
                                return (
                                    <div key={assign.id} className="assignment-item">
                                        <input type="checkbox" checked={assign.is_completed} onChange={() => upsertAssignment({ ...assign, is_completed: !assign.is_completed })}/>
                                        <div className="assignment-details">
                                            <h4>{assign.title} ({assign.type})</h4>
                                            <p>Pour le: {format(parseISO(assign.due_date), 'dd/MM/yy', { locale: fr })} - {assignClass?.name}</p>
                                        </div>
                                        <button className="btn-edit" onClick={() => handleEditAssignment(assign)}>✏️</button>
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
                        <div className="modal-header">
                            <h3>{selectedAssignment ? 'Modifier Assignation' : 'Nouvelle Assignation'}</h3>
                            <button className="modal-close" onClick={() => setShowAssignmentModal(false)}>×</button>
                        </div>
                        <form className="modal-form" onSubmit={handleSaveAssignment}>
                            <div className="modal-body-content">
                                <div className="form-group"><label>Classe *</label><select value={assignmentForm.classId} onChange={(e) => setAssignmentForm({ ...assignmentForm, classId: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} required><option value="">Sélectionnez une classe</option>{classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name} (Niveau: {cls.level})</option>)}</select></div>
                                <div className="form-group"><label>Matière *</label><input type="text" value={assignmentForm.subject} onChange={(e) => setAssignmentForm({ ...assignmentForm, subject: e.target.value })} required /></div>
                                <div className="form-group"><label>Type *</label><select value={assignmentForm.type} onChange={(e) => setAssignmentForm({ ...assignmentForm, type: e.target.value })} required>{assignmentTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                                <div className="form-group"><label>Titre *</label><input type="text" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} required /></div>
                                <div className="form-group"><label>Description</label><textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} rows="3" /></div>
                                <div className="form-group"><label>Date d'échéance *</label><input type="date" value={assignmentForm.due_date} onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })} required /></div>
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
                        <div className="modal-header">
                            <h3>Notes pour {selectedCourseForJournal.subject} le {format(parseISO(selectedDayForJournal.key), 'EEEE dd/MM', { locale: fr })}</h3>
                            <button className="modal-close" onClick={handleCloseJournalModal}>×</button>
                        </div>
                        <div className="modal-body-content">
                            {(() => {
                                const classInfo = getClassInfo(selectedCourseForJournal.classId);
                                const courseColor = getClassColor(selectedCourseForJournal.subject, classInfo?.level);
                                const slotInfoStyle = { borderLeftColor: courseColor || '#cccccc' };
                                return (
                                    <div className="slot-info" style={slotInfoStyle}>
                                        <strong>{selectedCourseForJournal.time_slot_libelle} - {selectedCourseForJournal.room}</strong>
                                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)'}}>Classe: {classInfo?.name || 'Inconnue'}</p>
                                    </div>
                                );
                            })()}
                            <div className="form-group"><label>Travail Prévu:</label><textarea value={journalForm.planned_work} onChange={(e) => { setJournalForm(prev => ({ ...prev, planned_work: e.target.value })); handleJournalEntryChange({ id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...journalForm }, 'planned_work', e.target.value); }} placeholder="Décrivez le travail prévu..." rows="3"/></div>
                            <div className="form-group"><label>Travail Effectué:</label><textarea value={journalForm.actual_work} onChange={(e) => { setJournalForm(prev => ({ ...prev, actual_work: e.target.value })); handleJournalEntryChange({ id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...journalForm }, 'actual_work', e.target.value); }} placeholder="Décrivez le travail réellement effectué..." rows="3"/></div>
                            <div className="form-group"><label>Notes Supplémentaires:</label><textarea value={journalForm.notes} onChange={(e) => { setJournalForm(prev => ({ ...prev, notes: e.target.value })); handleJournalEntryChange({ id: currentJournalEntryId, schedule_id: selectedCourseForJournal.id, date: selectedDayForJournal.key, ...journalForm }, 'notes', e.target.value); }} placeholder="Ajoutez des notes ici..." rows="2"/></div>
                        </div>
                        <div className="modal-footer">
                            {currentJournalEntryId && <button type="button" className="btn-danger" onClick={handleDeleteJournalEntry}>Supprimer l'entrée</button>}
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
