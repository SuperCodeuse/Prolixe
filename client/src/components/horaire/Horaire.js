// Horaire.jsx
import React, { useState, useEffect } from 'react';
import './Horaire.scss';
import { useClasses } from "../../hooks/useClasses";
import { useScheduleHours } from "../../hooks/useScheduleHours";
import { useToast } from '../../hooks/useToast';
import Toast from "../Toast";
import ConfirmModal from '../ConfirmModal';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from "../../hooks/useJournal";
import moment from 'moment';
import ScheduleService from '../../services/ScheduleService';

const Horaire = () => {
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id;
    const { classes, getClassColor } = useClasses(journalId);

    const { hours, getSortedHours, loading: loadingHours, error: errorHours } = useScheduleHours();
    const { success, error: showError, toasts, removeToast } = useToast();

    const {
        schedule,
        loading: loadingSchedule,
        error: errorSchedule,
        upsertCourse,
        deleteCourse: deleteCourseFromHook,
        getCourseBySlotKey
    } = useSchedule();

    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [courseForm, setCourseForm] = useState({
        subject: '',
        classId: '',
        room: '',
        notes: ''
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        showCheckbox: false,
        checkboxLabel: '',
        checkboxState: false
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [draggedCourse, setDraggedCourse] = useState(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const subjects = ['Programmation', 'Informatique', 'Exp.logiciels', 'Database'];
    const timeSlots = getSortedHours().map(hour => hour.libelle);

    const daysOfWeek = [
        { key: 'monday', label: 'Lundi' },
        { key: 'tuesday', label: 'Mardi' },
        { key: 'wednesday', label: 'Mercredi' },
        { key: 'thursday', label: 'Jeudi' },
        { key: 'friday', label: 'Vendredi' }
    ];

    const handleSlotClick = (day, time_libelle) => {
        const slotKey = `${day}-${time_libelle}`;
        const selectedHour = hours.find(h => h.libelle === time_libelle);

        setSelectedSlot({
            day,
            time_libelle,
            key: slotKey,
            time_slot_id: selectedHour?.id // Stocker l'ID du créneau
        });

        const existingCourse = getCourseBySlotKey(slotKey);
        if (existingCourse) {
            setCourseForm({
                subject: existingCourse.subject,
                classId: existingCourse.classId,
                room: existingCourse.room,
                notes: existingCourse.notes || ''
            });
        } else {
            setCourseForm({
                subject: '',
                classId: '',
                room: '21',
                notes: ''
            });
        }
        setShowModal(true);
    };

    const handleSaveCourse = async () => {
        if (!courseForm.subject || !courseForm.classId || !courseForm.room) {
            showError('Veuillez remplir tous les champs obligatoires (Matière, Classe, Local).', 3000);
            return;
        }

        try {
            const effectiveDate = moment().format('YYYY-MM-DD');
            await upsertCourse(selectedSlot.day, selectedSlot.time_slot_id, courseForm);
            success('Cours enregistré avec succès !', 3000);
            setShowModal(false);
            setCourseForm({ subject: '', classId: '', room: '', notes: '' });
        } catch (err) {
            console.error("Erreur lors de la sauvegarde du cours:", err);
            showError(`Erreur lors de l'enregistrement: ${(err && err.message) || String(err)}`, 5000);
        }
    };

    const showConfirmModal = (title, message, onConfirm, showCheckbox = false, checkboxLabel = '', checkboxState = false) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm,
            showCheckbox,
            checkboxLabel,
            checkboxState
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null,
            showCheckbox: false,
            checkboxLabel: '',
            checkboxState: false
        });
    };

    const handleDeleteCourseConfirmation = () => {
        const course = getCourseBySlotKey(selectedSlot?.key);
        const classInfo = course ? getClassInfo(course.classId) : null;
        const className = classInfo?.name || 'inconnue';
        const courseSubject = course?.subject || 'ce cours';

        showConfirmModal(
            'Supprimer ce cours',
            `Êtes-vous sûr de vouloir supprimer le cours de "${courseSubject}" pour la classe "${className}" (${selectedSlot?.time_libelle}) ?\n\nCette action est irréversible.`,
            (deleteAll) => performDeleteCourse(deleteAll),
            true,
            'Supprimer tout le cours (y compris dans le passé)',
            false
        );
    };

    const performDeleteCourse = async (deleteAll) => {
        try {
            const today = moment().format('YYYY-MM-DD');
            await deleteCourseFromHook(selectedSlot.day, selectedSlot.time_libelle, today, deleteAll);
            success('Cours supprimé avec succès !', 3000);
            setShowModal(false);
            closeConfirmModal();
            setCourseForm({ subject: '', classId: '', room: '', notes: '' });
        } catch (err) {
            console.error("Erreur lors de la suppression du cours:", err);
            showError(`Erreur lors de la suppression: ${(err && err.message) || String(err)}`, 5000);
        }
    };

    const getClassInfo = (classId) => {
        return classes.find(cls => cls.id == classId);
    };

    // Drag and Drop Handlers
    const handleDragStart = (e, day, time_libelle) => {
        const slotKey = `${day}-${time_libelle}`;
        const course = getCourseBySlotKey(slotKey);
        if (course) {
            setDraggedCourse({ ...course, day, time_libelle, slotKey });
            e.dataTransfer.setData("text/plain", slotKey);
        } else {
            e.preventDefault();
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = async (e, targetDay, targetTime) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!draggedCourse || draggedCourse.day === targetDay && draggedCourse.time_libelle === targetTime) {
            setDraggedCourse(null);
            return;
        }

        const effectiveDate = moment().format('YYYY-MM-DD');

        try {
            // Utilise la nouvelle fonction changeCourse pour gérer le déplacement
            await ScheduleService.changeCourse(
                draggedCourse.day,
                draggedCourse.time_libelle,
                targetDay,
                targetTime,
                draggedCourse,
                journalId,
                effectiveDate
            );

            success('Cours déplacé avec succès !', 3000);
            // Recharger les données après le déplacement
            // Si useSchedule a une fonction de rechargement, l'appeler ici
        } catch (err) {
            console.error("Erreur lors du déplacement du cours:", err);
            showError(`Erreur lors du déplacement: ${(err && err.message) || String(err)}`, 5000);
        }
        setDraggedCourse(null);
    };

    if (loadingHours || loadingSchedule) {
        return (
            <div className="horaire">
                <div className="loading-message">
                    Chargement de l'emploi du temps...
                </div>
            </div>
        );
    }

    if (errorHours || errorSchedule) {
        return (
            <div className="horaire">
                <div className="error-message">
                    Erreur de chargement: {(errorHours && errorHours.message) || (errorSchedule && errorSchedule.message) || "Une erreur inconnue est survenue."}
                </div>
            </div>
        );
    }

    // Générer une liste de tous les créneaux pour le rendu mobile
    const allSlots = daysOfWeek.flatMap(day =>
        timeSlots.map(time_libelle => ({
            day: day.key,
            dayLabel: day.label,
            time: time_libelle,
            slotKey: `${day.key}-${time_libelle}`
        }))
    );

    return (
        <div className="horaire">
            <div className="horaire-header">
                <h1>📅 Emploi du temps</h1>
                <p>Cliquez sur un créneau pour ajouter ou modifier un cours, ou glissez-déposez un cours pour le déplacer.</p>
            </div>

            <div className="schedule-container">
                {/* Rendu pour les écrans de bureau */}
                {!isMobile && (
                    <div className="schedule-grid desktop-grid">
                        <div className="time-header">Horaires</div>
                        {daysOfWeek.map(day => (
                            <div key={day.key} className="day-header">
                                {day.label}
                            </div>
                        ))}

                        {timeSlots.map(time_libelle => (
                            <React.Fragment key={time_libelle}>
                                <div className="time-slot-label">{time_libelle}</div>
                                {daysOfWeek.map(day => {
                                    const slotKey = `${day.key}-${time_libelle}`;
                                    const course = getCourseBySlotKey(slotKey);
                                    const classInfo = course ? getClassInfo(course.classId) : null;
                                    return (
                                        <div
                                            key={slotKey}
                                            className={`schedule-slot ${course ? 'has-course' : 'empty'}`}
                                            onClick={() => handleSlotClick(day.key, time_libelle)}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, day.key, time_libelle)}
                                            style={{
                                                backgroundColor: course ? `${getClassColor(course.subject, classInfo?.level)}20` : 'transparent',
                                                borderColor: course ? getClassColor(course.subject, classInfo?.level) : '#334155'
                                            }}
                                        >
                                            {course && (
                                                <div
                                                    className="course-info"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, day.key, time_libelle)}
                                                >
                                                    <div className="course-subject">{course.subject}</div>
                                                    <div className="course-class">{classInfo?.name}</div>
                                                    <div className="course-room">{course.room}</div>
                                                </div>
                                            )}
                                            {!course && (
                                                <div className="empty-slot">
                                                    <span>+ Ajouter un cours </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Rendu pour les écrans mobiles */}
                {isMobile && (
                    <div className="schedule-list mobile-list">
                        {allSlots.map(slot => {
                            const course = getCourseBySlotKey(slot.slotKey);
                            const classInfo = course ? getClassInfo(course.classId) : null;
                            const slotHasCourse = !!course;
                            return (
                                <div
                                    key={slot.slotKey}
                                    className={`schedule-list-item ${slotHasCourse ? 'has-course' : 'empty'}`}
                                    onClick={() => handleSlotClick(slot.day, slot.time)}
                                    style={{
                                        borderLeftColor: slotHasCourse ? getClassColor(course.subject, classInfo?.level) : 'var(--accent-blue)'
                                    }}
                                >
                                    <div className="slot-header">
                                        <span className="slot-day">{slot.dayLabel}</span>
                                        <span className="slot-time">{slot.time}</span>
                                    </div>
                                    {slotHasCourse ? (
                                        <div className="course-info-mobile">
                                            <div className="course-subject">{course.subject}</div>
                                            <div className="course-details">
                                                <span className="course-class">{classInfo?.name}</span>
                                                <span className="course-room">
                                                    <i className="fas fa-map-marker-alt"></i> {course.room}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="empty-slot-mobile">
                                            <span>Ajouter un cours</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Le reste du code (modals, toasts) est inchangé */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {getCourseBySlotKey(selectedSlot?.key) ? 'Modifier le cours' : 'Ajouter un cours'}
                            </h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form className="modal-form">
                            <div className="modal-body-content">
                                <div className="slot-info">
                                    <strong>
                                        {daysOfWeek.find(d => d.key === selectedSlot?.day)?.label} - {selectedSlot?.time_libelle}
                                    </strong>
                                </div>

                                <div className="form-group">
                                    <label>Matière *</label>
                                    <select
                                        value={courseForm.subject}
                                        onChange={(e) => setCourseForm({...courseForm, subject: e.target.value})}
                                    >
                                        <option value="">Sélectionnez une matière</option>
                                        {subjects.map(subject => (
                                            <option key={subject} value={subject}>
                                                {subject}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Classe *</label>
                                    <select
                                        value={courseForm.classId}
                                        onChange={(e) => setCourseForm({...courseForm, classId: e.target.value})}
                                    >
                                        <option value="">Sélectionnez une classe</option>
                                        {classes.map(cls => (
                                            <option key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Local *</label>
                                    <input
                                        type="text"
                                        value={courseForm.room}
                                        onChange={(e) => setCourseForm({...courseForm, room: e.target.value})}
                                        placeholder="Ex: Salle 101"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        value={courseForm.notes}
                                        onChange={(e) => setCourseForm({...courseForm, notes: e.target.value})}
                                        placeholder="Notes supplémentaires..."
                                        rows="3"
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Annuler
                                </button>
                                {getCourseBySlotKey(selectedSlot?.key) && (
                                    <button
                                        type="button"
                                        className="btn-danger"
                                        onClick={handleDeleteCourseConfirmation}
                                    >
                                        Supprimer
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleSaveCourse}
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                confirmText="Supprimer"
                cancelText="Annuler"
                type="danger"
                showCheckbox={confirmModal.showCheckbox}
                checkboxLabel={confirmModal.checkboxLabel}
                checkboxState={confirmModal.checkboxState}
                onCheckboxChange={(e) => setConfirmModal({...confirmModal, checkboxState: e.target.checked})}
            />
        </div>
    );
};

export default Horaire;