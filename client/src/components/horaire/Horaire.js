// Horaire.jsx
import React, { useState } from 'react';
import './Horaire.css';
import {useClasses} from "../../hooks/useClasses";
import {useScheduleHours} from "../../hooks/useScheduleHours";

const Horaire = () => {
    const { classes} = useClasses();
    const { hours, getSortedHours } = useScheduleHours();

    // Liste des matières disponibles
    const subjects = ['Programmation', 'Informatique', 'Ex.Logiciels', 'Base de données'];

    // Récupérer les classes depuis le localStorage
    const getClasses = () => {
        const classes = localStorage.getItem('classes');
        return classes ? JSON.parse(classes) : [];
    };

    const [schedule, setSchedule] = useState(() => {
        const saved = localStorage.getItem('schedule');
        return saved ? JSON.parse(saved) : {};
    });
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [courseForm, setCourseForm] = useState({
        subject: '',
        classId: '',
        room: '',
        notes: ''
    });

    // Configuration des créneaux horaires
    /*
    const timeSlots = [
        '08:25-09:15',
        '09:15-10:05',
        '10:20-11:10',
        '11:10-12:00',
        '12:45-13:35',
        '13:35-14:20',
        '14:30-15:15',
        '15:15-16:05',
    ];*/

    const timeSlots = getSortedHours().map(hour => hour.libelle);

    const daysOfWeek = [
        { key: 'monday', label: 'Lundi' },
        { key: 'tuesday', label: 'Mardi' },
        { key: 'wednesday', label: 'Mercredi' },
        { key: 'thursday', label: 'Jeudi' },
        { key: 'friday', label: 'Vendredi' },
        { key: 'saturday', label: 'Samedi' }
    ];

    // Sauvegarder dans localStorage
    const saveSchedule = (newSchedule) => {
        localStorage.setItem('schedule', JSON.stringify(newSchedule));
        setSchedule(newSchedule);
    };

    // Ouvrir le modal pour ajouter/modifier un cours
    const handleSlotClick = (day, time) => {
        const slotKey = `${day}-${time}`;
        setSelectedSlot({ day, time, key: slotKey });

        // Pré-remplir le formulaire si le cours existe
        const existingCourse = schedule[slotKey];
        if (existingCourse) {
            setCourseForm(existingCourse);
        } else {
            setCourseForm({
                subject: '',
                classId: '',
                room: '',
                notes: ''
            });
        }
        setShowModal(true);
    };

    // Sauvegarder le cours
    const handleSaveCourse = () => {
        if (!courseForm.subject || !courseForm.classId || !courseForm.room) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        const newSchedule = {
            ...schedule,
            [selectedSlot.key]: courseForm
        };

        saveSchedule(newSchedule);
        setShowModal(false);
        setCourseForm({
            subject: '',
            classId: '',
            room: '',
            notes: ''
        });
    };

    // Supprimer un cours
    const handleDeleteCourse = () => {
        const newSchedule = { ...schedule };
        delete newSchedule[selectedSlot.key];
        saveSchedule(newSchedule);
        setShowModal(false);
    };

    // Obtenir les informations d'une classe
    const getClassInfo = (classId) => {
        return classes.find(cls => cls.id === classId);
    };

    // Obtenir la couleur d'une matière
    const getSubjectColor = (subject) => {
        const colors = {
            'Programmation': '#3b82f6',
            'Informatique': '#10b981',
            'Ex.Logiciels': '#f59e0b',
            'Base de données': '#8b5cf6'
        };
        return colors[subject] || '#64748b';
    };

    return (
        <div className="horaire">
            <div className="horaire-header">
                <h1>📅 Emploi du temps</h1>
                <p>Cliquez sur un créneau pour ajouter ou modifier un cours</p>
            </div>

            <div className="schedule-container">
                <div className="schedule-grid">
                    {/* En-tête avec les heures */}
                    <div className="time-header">Horaires</div>
                    {daysOfWeek.map(day => (
                        <div key={day.key} className="day-header">
                            {day.label}
                        </div>
                    ))}

                    {/* Créneaux horaires */}
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
                                            backgroundColor: course ? `${getSubjectColor(course.subject)}20` : 'transparent',
                                            borderColor: course ? getSubjectColor(course.subject) : '#334155'
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

            {/* Modal pour ajouter/modifier un cours */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>
                                {schedule[selectedSlot?.key] ? 'Modifier le cours' : 'Ajouter un cours'}
                            </h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
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
                                className="btn-secondary"
                                onClick={() => setShowModal(false)}
                            >
                                Annuler
                            </button>
                            {schedule[selectedSlot?.key] && (
                                <button
                                    className="btn-danger"
                                    onClick={handleDeleteCourse}
                                >
                                    Supprimer
                                </button>
                            )}
                            <button
                                className="btn-primary"
                                onClick={handleSaveCourse}
                            >
                                Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Horaire;
