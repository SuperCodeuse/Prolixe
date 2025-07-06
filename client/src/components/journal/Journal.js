// frontend/src/components/Journal/Journal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './Journal.scss';
import { useJournal } from '../../hooks/useJournal';
import { useClasses } from '../../hooks/useClasses';
import { useScheduleHours } from '../../hooks/useScheduleHours'; // Toujours nécessaire pour getSortedHours()
import { useSchedule } from '../../hooks/useSchedule';
import { useToast } from '../../hooks/useToast';
import Toast from "../Toast";
import ConfirmModal from '../ConfirmModal';

import { format, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const Journal = () => {
    // --- 1. APPELS DES HOOKS REACT ---
    const { classes, getClassColor } = useClasses();
    const { hours, getSortedHours, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule();

    const {
        journalEntries,
        assignments,
        loading: loadingJournal,
        error: errorJournal,
        fetchJournalEntries,
        fetchAssignments,
        upsertJournalEntry,
        deleteJournalEntry,
        upsertAssignment,
        deleteAssignment,
    } = useJournal();

    const { success, error: showError, toasts, removeToast } = useToast();

    // --- 2. ÉTATS LOCAUX ---
    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 1, locale: fr })
    );
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentForm, setAssignmentForm] = useState({
        id: null,
        class_id: '',
        subject: '',
        type: 'Devoir',
        title: '',
        description: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        is_completed: false
    });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });
    const [journalDebounce, setJournalDebounce] = useState({});

    // État pour gérer le modal d'édition de journal
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [selectedCourseForJournal, setSelectedCourseForJournal] = useState(null); // Le cours (de schedule) cliqué
    const [selectedDayForJournal, setSelectedDayForJournal] = useState(null); // Le jour (de weekDays) cliqué
    const [journalForm, setJournalForm] = useState({ // Le formulaire pour le modal du journal
        planned_work: '',
        actual_work: '',
        notes: ''
    });
    const [currentJournalEntryId, setCurrentJournalEntryId] = useState(null);


    // --- 3. CONSTANTES STATIQUES ET HOOKS useMemo / useCallback ---
    const assignmentTypes = ['Interro', 'Devoir', 'Projet', 'Examen', 'Autre']; // Constante statique

    const getDayKeyFromDateFnsString = useCallback((dayName) => {
        const mapping = {
            'lundi': 'monday', 'mardi': 'tuesday', 'mercredi': 'wednesday',
            'jeudi': 'thursday', 'vendredi': 'friday', 'samedi': 'saturday',
            'dimanche': 'sunday'
        };
        return mapping[dayName] || dayName; // Retourne dayName si pas trouvé pour les cas non gérés
    }, []); // Aucune dépendance, fonction stable

    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = addDays(currentWeekStart, i);
            days.push({
                date,
                key: format(date, 'yyyy-MM-dd'), // Ex: 2025-07-04
                label: format(date, 'EEEE dd/MM', { locale: fr }), // Ex: Lundi 04/07
                dayOfWeekKey: getDayKeyFromDateFnsString(format(date, 'EEEE', { locale: fr }).toLowerCase()) // Ex: "monday"
            });
        }
        return days;
    }, [currentWeekStart, getDayKeyFromDateFnsString]);


    const getCoursesGroupedByDay = useMemo(() => {
        const grouped = {};
        // Itérer sur schedule.data (l'objet des créneaux)
        Object.entries(schedule.data || {}).forEach(([key, course]) => {
            const day = course.day; // Ex: 'tuesday'
            const timeLibelle = course.time_slot_libelle; // Ex: '08:25-09:15'

            if (!grouped[day]) grouped[day] = []; // Initialiser comme un tableau pour stocker les cours
            grouped[day].push(course); // Ajouter le cours au tableau du jour
        });

        // Trier les cours de chaque jour par heure
        for (const dayKey in grouped) {
            grouped[dayKey].sort((a, b) => {
                const timeA = hours.find(h => h.libelle === a.time_slot_libelle);
                const timeB = hours.find(h => h.libelle === b.time_slot_libelle);
                return (timeA?.order || 0) - (timeB?.order || 0);
            });
        }

        return grouped;
    }, [schedule, hours]); // Dépend de schedule et hours pour le tri


    const getJournalEntry = useCallback((scheduleId, dateKey) => { // scheduleId est course.id, dateKey est YYYY-MM-DD
        for (const key in journalEntries) {
            const entry = journalEntries[key];
            if (entry.schedule_id === scheduleId && entry.date === dateKey) {
                return entry;
            }
        }
        return null;
    }, [journalEntries]); // Dépend de journalEntries


    const handleJournalEntryChange = useCallback(async (entryData, field, value) => {
        const updatedEntryData = { ...entryData, [field]: value };
        const keyForDebounce = `${updatedEntryData.schedule_id}-${updatedEntryData.date}`;

        if (journalDebounce[keyForDebounce]) {
            clearTimeout(journalDebounce[keyForDebounce]);
        }

        const timeoutId = setTimeout(async () => {
            try {
                await upsertJournalEntry(updatedEntryData);
            } catch (err) {
                console.error('Erreur sauvegarde journal (débounce):', err);
                showError('Erreur lors de la sauvegarde du journal', 3000);
            } finally {
                setJournalDebounce(prev => {
                    const newState = { ...prev };
                    delete newState[keyForDebounce];
                    return newState;
                });
            }
        }, 1000);

        setJournalDebounce(prev => ({
            ...prev,
            [keyForDebounce]: timeoutId
        }));
    }, [upsertJournalEntry, showError, journalDebounce]);


    const getClassInfo = useCallback((classId) => {
        return classes.find(cls => cls.id === classId);
    }, [classes]);


    const navigateWeek = useCallback((direction) => {
        setCurrentWeekStart(prev => addDays(prev, direction * 7));
    }, []);


    const handleAddAssignment = useCallback(() => {
        setSelectedAssignment(null);
        setAssignmentForm({
            id: null, class_id: '', subject: '', type: 'Devoir', title: '', description: '',
            due_date: format(new Date(), 'yyyy-MM-dd'), is_completed: false
        });
        setShowAssignmentModal(true);
    }, []);


    const handleEditAssignment = useCallback((assignment) => {
        setSelectedAssignment(assignment);
        setAssignmentForm({
            id: assignment.id,
            class_id: assignment.class_id,
            subject: assignment.subject,
            type: assignment.type,
            title: assignment.title,
            description: assignment.description || '',
            due_date: assignment.due_date ?
                format(parseISO(assignment.due_date), 'yyyy-MM-dd') :
                format(new Date(), 'yyyy-MM-dd'),
            is_completed: assignment.is_completed
        });
        setShowAssignmentModal(true);
    }, []);


    const handleSaveAssignment = useCallback(async () => {
        if (!assignmentForm.class_id || !assignmentForm.subject ||
            !assignmentForm.type || !assignmentForm.title || !assignmentForm.due_date) {
            showError('Veuillez remplir tous les champs obligatoires de l\'assignation.', 3000);
            return;
        }
        try {
            await upsertAssignment(assignmentForm);
            success('Assignation sauvegardée !', 3000);
            setShowAssignmentModal(false);
        } catch (err) {
            console.error('Erreur sauvegarde assignation:', err);
            showError(`Erreur: ${err.message || String(err)}`, 5000);
        }
    }, [assignmentForm, upsertAssignment, success, showError]);


    const handleDeleteAssignment = useCallback(async () => {
        if (!selectedAssignment?.id) return;
        try {
            await deleteAssignment(selectedAssignment.id);
            success('Assignation supprimée !', 3000);
            setShowAssignmentModal(false);
            setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        } catch (err) {
            console.error('Erreur suppression assignation:', err);
            showError(`Erreur: ${err.message || String(err)}`, 5000);
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


    const closeConfirmModal = useCallback(() => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
    }, []);

    const handleOpenJournalModal = useCallback((course, day) => {
        setSelectedCourseForJournal(course);
        setSelectedDayForJournal(day);

        const entry = getJournalEntry(course.id, day.key);
        setJournalForm({
            planned_work: entry?.planned_work || '',
            actual_work: entry?.actual_work || '',
            notes: entry?.notes || ''
        });
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
        if (currentJournalEntryId) {
            try {
                await deleteJournalEntry(currentJournalEntryId);
                success('Entrée de journal supprimée !', 3000);
                handleCloseJournalModal();
            } catch (err) {
                console.error('Erreur suppression entrée journal:', err);
                showError(`Erreur: ${err.message || String(err)}`, 5000);
            }
        }
    }, [currentJournalEntryId, deleteJournalEntry, success, showError, handleCloseJournalModal]);


    const activeWeekDays = useMemo(() => {
        return weekDays.filter(day => {
            const dayKeyForSchedule = getDayKeyFromDateFnsString(day.dayOfWeekKey);
            // Vérifie si le jour a des cours dans getCoursesGroupedByDay
            return (getCoursesGroupedByDay[dayKeyForSchedule]?.length || 0) > 0;
        });
    }, [weekDays, getCoursesGroupedByDay, getDayKeyFromDateFnsString]);


    // --- 4. useEffect POUR LE CHARGEMENT DES DONNÉES ---
    useEffect(() => {
        if (!loadingSchedule && !errorSchedule && schedule) {
            const endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1, locale: fr });
            fetchJournalEntries(format(currentWeekStart, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
            fetchAssignments(null, format(currentWeekStart, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
        }
    }, [currentWeekStart, loadingSchedule, errorSchedule, schedule, fetchJournalEntries, fetchAssignments]);


    // --- 5. GESTION DU LOADING ET DES ERREURS ---
    const isLoading = loadingHours || loadingSchedule || loadingJournal;
    const isError = errorHours || errorSchedule || errorJournal;

    if (isLoading) {
        return (
            <div className="journal-page">
                <div className="loading-message">
                    Chargement de l'agenda...
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="journal-page">
                <div className="error-message">
                    Erreur de chargement: {(errorHours && errorHours.message) || (errorSchedule && errorSchedule.message) || (errorJournal && errorJournal.message) || "Une erreur inconnue est survenue."}
                </div>
            </div>
        );
    }

    // --- 6. RENDU DU COMPOSANT ---

    return (
        <div className="journal-page">
            <div className="journal-header">
                <h1>Agenda de la semaine</h1>
                <div className="week-navigation">
                    <button className="btn-secondary" onClick={() => navigateWeek(-1)}>
                        &lt; Semaine précédente
                    </button>
                    <span>
                        {format(currentWeekStart, 'dd/MM/yyyy', { locale: fr })} - {' '}
                        {format(addDays(currentWeekStart, 6), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                    <button className="btn-secondary" onClick={() => navigateWeek(1)}>
                        Semaine suivante &gt;
                    </button>
                </div>
            </div>

            <div className="journal-content">
                {/* Section journal des cours - NOUVELLE STRUCTURE */}
                <div className="weekly-agenda-section">
                    <h2>Journal des cours</h2>
                    {activeWeekDays.length === 0 ? (
                        <p className="no-courses-message">Aucun cours programmé pour les jours affichés cette semaine.</p>
                    ) : (
                        <div className="journal-days-container"> {/* Nouveau conteneur pour les jours */}
                            {activeWeekDays.map(day => {
                                const dayKeyForSchedule = getDayKeyFromDateFnsString(day.dayOfWeekKey);
                                const coursesForThisDay = getCoursesGroupedByDay[dayKeyForSchedule] || [];

                                return (
                                    <div key={day.key} className="day-column"> {/* Chaque jour est une colonne */}
                                        <div className="day-header-journal"> {/* En-tête du jour */}
                                            {day.label}
                                        </div>
                                        <div className="day-courses-list"> {/* Liste des cours pour ce jour */}
                                            {coursesForThisDay.length === 0 ? (
                                                <div className="no-courses-for-day-message">
                                                    Aucun cours ce jour-là.
                                                </div>
                                            ) : (
                                                coursesForThisDay.map(courseInSchedule => {
                                                    const classInfo = getClassInfo(courseInSchedule.class_id);
                                                    const backgroundColor = `${getClassColor(courseInSchedule.subject, classInfo?.level)}20`;
                                                    const borderColor = getClassColor(courseInSchedule.subject, classInfo?.level);
                                                    const hasJournalEntry = getJournalEntry(courseInSchedule.id, day.key);

                                                    return (
                                                        <div
                                                            key={courseInSchedule.id} // Clé unique pour le cours
                                                            className="journal-slot has-course"
                                                            style={{ backgroundColor: backgroundColor, borderColor: borderColor }}
                                                            onClick={() => handleOpenJournalModal(courseInSchedule, day)}
                                                        >
                                                            <div className="course-summary">
                                                                <div className="course-info-header">
                                                                    <span className="course-time-display">{courseInSchedule.time_slot_libelle}</span>
                                                                    <span className="course-class-display">{classInfo?.name || 'Classe inconnue'}</span>
                                                                </div>
                                                                <div className="course-details">
                                                                    <div className="course-title-display">
                                                                        {courseInSchedule.subject}
                                                                    </div>
                                                                    <div className="course-room-display">
                                                                        {courseInSchedule.room}
                                                                    </div>
                                                                </div>
                                                                {hasJournalEntry && (
                                                                    <div className="journal-entry-indicator">
                                                                        📝 Notes
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div> {/* Fin de .weekly-agenda-section */}

                {/* Section des assignations */}
                <div className="assignments-section">
                    <h2>Assignations & Évaluations</h2>
                    <button className="btn-primary" onClick={handleAddAssignment}>
                        + Nouvelle Assignation
                    </button>
                    {assignments.length === 0 ? (
                        <p>Aucune assignation prévue cette semaine.</p>
                    ) : (
                        <div className="assignment-list">
                            {assignments.map(assign => {
                                const assignClass = getClassInfo(assign.class_id);
                                return (
                                    <div key={assign.id} className="assignment-item">
                                        <input
                                            type="checkbox"
                                            checked={assign.is_completed}
                                            onChange={() => upsertAssignment({
                                                ...assign,
                                                is_completed: !assign.is_completed
                                            })}
                                        />
                                        <div className="assignment-details">
                                            <h4>{assign.title} ({assign.type})</h4>
                                            <p>
                                                Pour le: {format(parseISO(assign.due_date), 'dd/MM', { locale: fr })} - {' '}
                                                {assignClass?.name} ({assignClass?.level ? `Niveau ${assignClass.level}` : 'Classe inconnue'})
                                            </p>
                                        </div>
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEditAssignment(assign)}
                                        >
                                            ✏️
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div> {/* Fin de .journal-content */}

            {/* Modal assignations */}
            {showAssignmentModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{selectedAssignment ? 'Modifier Assignation' : 'Nouvelle Assignation'}</h3>
                            <button className="modal-close" onClick={() => setShowAssignmentModal(false)}>×</button>
                        </div>
                        <form className="modal-form">
                            <div className="modal-body-content">
                                <div className="form-group">
                                    <label>Classe *</label>
                                    <select
                                        value={assignmentForm.class_id}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            class_id: parseInt(e.target.value)
                                        })}
                                        required
                                    >
                                        <option value="">Sélectionnez une classe</option>
                                        {classes.map(cls => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name} (Niveau: {cls.level})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Matière *</label>
                                    <input
                                        type="text"
                                        value={assignmentForm.subject}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            subject: e.target.value
                                        })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Type *</label>
                                    <select
                                        value={assignmentForm.type}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            type: e.target.value
                                        })}
                                        required
                                    >
                                        {assignmentTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Titre *</label>
                                    <input
                                        type="text"
                                        value={assignmentForm.title}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            title: e.target.value
                                        })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={assignmentForm.description}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            description: e.target.value
                                        })}
                                        rows="3"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date d'échéance *</label>
                                    <input
                                        type="date"
                                        value={assignmentForm.due_date}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            due_date: e.target.value
                                        })}
                                        required
                                    />
                                </div>
                                <div className="form-group checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="completed"
                                        checked={assignmentForm.is_completed}
                                        onChange={(e) => setAssignmentForm({
                                            ...assignmentForm,
                                            is_completed: e.target.checked
                                        })}
                                    />
                                    <label htmlFor="completed" style={{ marginLeft: '10px' }}>
                                        Terminé
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowAssignmentModal(false)}
                                >
                                    Annuler
                                </button>
                                {selectedAssignment && (
                                    <button
                                        type="button"
                                        className="btn-danger"
                                        onClick={handleDeleteAssignmentConfirm}
                                    >
                                        Supprimer
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSaveAssignment}
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Nouveau Modal pour l'édition de Journal */}
            {showJournalModal && selectedCourseForJournal && selectedDayForJournal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                Notes pour {selectedCourseForJournal.subject} le{' '}
                                {format(parseISO(selectedDayForJournal.key), 'EEEE dd/MM', { locale: fr })}
                            </h3>
                            <button className="modal-close" onClick={handleCloseJournalModal}>×</button>
                        </div>
                        <div className="modal-body-content">
                            <div className="slot-info">
                                <strong>
                                    {selectedCourseForJournal.time_slot_libelle} -{' '}
                                    {selectedCourseForJournal.room}
                                </strong>
                                <p>Classe: {getClassInfo(selectedCourseForJournal.class_id)?.name || 'Inconnue'}</p>
                            </div>
                            <div className="form-group">
                                <label>Travail Prévu:</label>
                                <textarea
                                    value={journalForm.planned_work}
                                    onChange={(e) => {
                                        setJournalForm(prev => ({ ...prev, planned_work: e.target.value }));
                                        handleJournalEntryChange(
                                            { // Passer un objet complet pour l'entrée de journal
                                                id: currentJournalEntryId,
                                                schedule_id: selectedCourseForJournal.id,
                                                date: selectedDayForJournal.key,
                                                planned_work: journalForm.planned_work,
                                                actual_work: journalForm.actual_work,
                                                notes: journalForm.notes
                                            },
                                            'planned_work',
                                            e.target.value
                                        );
                                    }}
                                    placeholder="Décrivez le travail prévu..."
                                    rows="3"
                                />
                            </div>
                            <div className="form-group">
                                <label>Travail Effectué:</label>
                                <textarea
                                    value={journalForm.actual_work}
                                    onChange={(e) => {
                                        setJournalForm(prev => ({ ...prev, actual_work: e.target.value }));
                                        handleJournalEntryChange(
                                            { // Passer un objet complet pour l'entrée de journal
                                                id: currentJournalEntryId,
                                                schedule_id: selectedCourseForJournal.id,
                                                date: selectedDayForJournal.key,
                                                planned_work: journalForm.planned_work,
                                                actual_work: journalForm.actual_work,
                                                notes: journalForm.notes
                                            },
                                            'actual_work',
                                            e.target.value
                                        );
                                    }}
                                    placeholder="Décrivez le travail effectué..."
                                    rows="3"
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes Supplémentaires:</label>
                                <textarea
                                    value={journalForm.notes}
                                    onChange={(e) => {
                                        setJournalForm(prev => ({ ...prev, notes: e.target.value }));
                                        handleJournalEntryChange(
                                            { // Passer un objet complet pour l'entrée de journal
                                                id: currentJournalEntryId,
                                                schedule_id: selectedCourseForJournal.id,
                                                date: selectedDayForJournal.key,
                                                planned_work: journalForm.planned_work,
                                                actual_work: journalForm.actual_work,
                                                notes: journalForm.notes
                                            },
                                            'notes',
                                            e.target.value
                                        );
                                    }}
                                    placeholder="Ajoutez des notes ici..."
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            {currentJournalEntryId && (
                                <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={handleDeleteJournalEntry}
                                >
                                    Supprimer l'entrée
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleCloseJournalModal}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast notifications */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Modal de confirmation */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Supprimer"
                cancelText="Annuler"
                type="danger"
            />
        </div>
    );
};

export default Journal;