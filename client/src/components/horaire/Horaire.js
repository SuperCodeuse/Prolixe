// Horaire.jsx
import React, { useState } from 'react';
import './Horaire.scss'; // Assurez-vous que ce chemin est correct
import { useClasses } from "../../hooks/useClasses";
import { useScheduleHours } from "../../hooks/useScheduleHours";
import { useToast } from '../../hooks/useToast';
import Toast from "../Toast";
import ConfirmModal from '../ConfirmModal';

const Horaire = () => {
    const { classes, getClassColor } = useClasses();
    const { hours, getSortedHours } = useScheduleHours();
    const { success, error: showError, toasts, removeToast } = useToast();

    const subjects = ['Programmation', 'Informatique', 'Exp.logiciels', 'Database'];

    const [schedule, setSchedule] = useState(() => {
        const saved = localStorage.getItem('schedule');
        return saved ? JSON.parse(saved) : {};
    });
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // MODIFICATION 1 : Supprimer 'room: '21'' de l'état initial
    const [courseForm, setCourseForm] = useState({
        subject: '',
        classId: '',
        room: '', // Laissez ceci vide, la logique de '21' sera dans handleSlotClick
        notes: ''
    });

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    const timeSlots = getSortedHours().map(hour => hour.libelle);

    const daysOfWeek = [
        { key: 'monday', label: 'Lundi' },
        { key: 'tuesday', label: 'Mardi' },
        { key: 'wednesday', label: 'Mercredi' },
        { key: 'thursday', label: 'Jeudi' },
        { key: 'friday', label: 'Vendredi' },
        { key: 'saturday', label: 'Samedi' }
    ];

    const saveSchedule = (newSchedule) => {
        localStorage.setItem('schedule', JSON.stringify(newSchedule));
        setSchedule(newSchedule);
    };

    const handleSlotClick = (day, time) => {
        const slotKey = `${day}-${time}`;
        setSelectedSlot({ day, time, key: slotKey });

        const existingCourse = schedule[slotKey];
        if (existingCourse) {
            // Si un cours existe, pré-remplir avec ses données
            setCourseForm(existingCourse);
        } else {
            // MODIFICATION 2 : Définir 'room: '21'' ici UNIQUMENT pour les NOUVEAUX créneaux
            setCourseForm({
                subject: '',
                classId: '',
                room: '21', // <-- C'est l'unique endroit où '21' est défini par défaut pour un NOUVEAU formulaire
                notes: ''
            });
        }
        setShowModal(true);
    };

    const handleSaveCourse = () => {
        if (!courseForm.subject || !courseForm.classId || !courseForm.room) {
            showError('Veuillez remplir tous les champs obligatoires (Matière, Classe, Local).', 3000);
            return;
        }

        const newSchedule = {
            ...schedule,
            [selectedSlot.key]: courseForm
        };

        saveSchedule(newSchedule);
        success('Cours enregistré avec succès !', 3000);
        setShowModal(false);
        // MODIFICATION 3 : Réinitialiser le formulaire à un état vide après sauvegarde
        // Cela inclut 'room' pour qu'il ne garde pas '21' en mémoire pour le prochain ajout
        setCourseForm({
            subject: '',
            classId: '',
            room: '',
            notes: ''
        });
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

    const handleDeleteCourse = () => {
        const course = schedule[selectedSlot?.key];
        const classInfo = course ? getClassInfo(course.classId) : null;
        const className = classInfo?.name || 'inconnue';
        const courseSubject = course?.subject || 'ce cours';

        showConfirmModal(
            'Supprimer ce cours',
            `Êtes-vous sûr de vouloir supprimer le cours de "${courseSubject}" pour la classe "${className}" (${selectedSlot?.time}) ?\n\nCette action est irréversible.`,
            () => performDeleteCourse()
        );
    };

    const performDeleteCourse = () => {
        const newSchedule = { ...schedule };
        delete newSchedule[selectedSlot.key];
        saveSchedule(newSchedule);
        success('Cours supprimé avec succès !', 3000);
        setShowModal(false);
        closeConfirmModal();
    };

    const getClassInfo = (classId) => {
        return classes.find(cls => cls.id == classId);
    };

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

                    {timeSlots.map(time => (
                        <React.Fragment key={time}>
                            <div className="time-slot-label">{time}</div>
                            {daysOfWeek.map(day => {
                                const slotKey = `${day.key}-${time}`;
                                const course = schedule[slotKey];
                                const classInfo = course ? getClassInfo(course.classId) : null;
                                return (
                                    <div
                                        key={slotKey}
                                        className={`schedule-slot ${course ? 'has-course' : 'empty'}`}
                                        onClick={() => handleSlotClick(day.key, time)}
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
                                {schedule[selectedSlot?.key] ? 'Modifier le cours' : 'Ajouter un cours'}
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
                                        {daysOfWeek.find(d => d.key === selectedSlot?.day)?.label} - {selectedSlot?.time}
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
                                                {cls.name} (Niveau: {cls.level})
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
                                {schedule[selectedSlot?.key] && (
                                    <button
                                        type="button"
                                        className="btn-danger"
                                        onClick={handleDeleteCourse}
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