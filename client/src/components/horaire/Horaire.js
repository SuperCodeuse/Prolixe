// Horaire.jsx
import React, { useState, useEffect } from 'react';
import './Horaire.scss';
import { useClasses } from "../../hooks/useClasses";
import { useScheduleHours } from "../../hooks/useScheduleHours";
import { useToast } from '../../hooks/useToast';
import Toast from "../Toast";
import ConfirmModal from '../ConfirmModal';
import { useSchedule } from '../../hooks/useSchedule'; // <-- CORRECTION ICI : useSchedule au lieu de useShedule

const Horaire = () => {
    const { classes, getClassColor } = useClasses();
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
        onConfirm: null
    });

    const subjects = ['Programmation', 'Informatique', 'Exp.logiciels', 'Database'];
    const timeSlots = getSortedHours().map(hour => hour.libelle);

    const daysOfWeek = [
        { key: 'monday', label: 'Lundi' },
        { key: 'tuesday', label: 'Mardi' },
        { key: 'wednesday', label: 'Mercredi' },
        { key: 'thursday', label: 'Jeudi' },
        { key: 'friday', label: 'Vendredi' },
        { key: 'saturday', label: 'Samedi' }
    ];

    const handleSlotClick = (day, time_libelle) => {
        const slotKey = `${day}-${time_libelle}`;
        setSelectedSlot({ day, time_libelle, key: slotKey });

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
            await upsertCourse(selectedSlot.day, selectedSlot.time_libelle, courseForm);
            success('Cours enregistré avec succès !', 3000);
            setShowModal(false);
            setCourseForm({ subject: '', classId: '', room: '', notes: '' });
        } catch (err) {
            console.error("Erreur lors de la sauvegarde du cours:", err);
            showError(`Erreur lors de l'enregistrement: ${(err && err.message) || String(err)}`, 5000); // Amélioration message erreur
        }
    };

    const showConfirmModal = (title, message, onConfirm) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm
        });
    };

    const closeConfirmModal = () => {
        setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null
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
            () => performDeleteCourse()
        );
    };

    const performDeleteCourse = async () => {
        try {
            await deleteCourseFromHook(selectedSlot.day, selectedSlot.time_libelle);
            success('Cours supprimé avec succès !', 3000);
            setShowModal(false);
            closeConfirmModal();
            setCourseForm({ subject: '', classId: '', room: '', notes: '' });
        } catch (err) {
            console.error("Erreur lors de la suppression du cours:", err);
            showError(`Erreur lors de la suppression: ${(err && err.message) || String(err)}`, 5000); // Amélioration message erreur
        }
    };


    const getClassInfo = (classId) => {
        return classes.find(cls => cls.id == classId);
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

    return (
        <div className="horaire">
            <div className="horaire-header">
                <h1>📅 Emploi du temps</h1>
                <p>Cliquez sur un créneau pour ajouter ou modifier un cours</p>
            </div>

            <div className="schedule-container">
                <div className="schedule-grid">
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
                                        style={{
                                            backgroundColor: course ? `${getClassColor(course.subject, classInfo?.level)}20` : 'transparent',
                                            borderColor: course ? getClassColor(course.subject, classInfo?.level) : '#334155'
                                        }}
                                    >
                                        {course && (
                                            <div className="course-info">
                                                <div className="course-subject">{course.subject}</div>
                                                <div className="course-class">{classInfo?.name}</div>
                                                <div className="course-room">{course.room}</div>
                                            </div>
                                        )}
                                        {!course && (
                                            <div className="empty-slot">
                                                <span>+</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

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

            {/* Affichage des toasts */}
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

export default Horaire;