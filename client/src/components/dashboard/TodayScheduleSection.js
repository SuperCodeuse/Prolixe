import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TodayScheduleSection = ({ todaySchedule, holidayInfo, getClassColor, classes, loading }) => {
    if (loading) {
        todaySchedule.sort((a,b) => parseInt(a.time_slot_id) - parseInt(b.time_slot_id));
        return <div className="loading-message">Chargement de l'emploi du temps...</div>;
    }

    if (holidayInfo) {
        return (
            <div className="daily-schedule-section">
                <h2>Votre journée d'aujourd'hui</h2>
                <div className="holiday-info">
                    <span className="holiday-icon">🎉</span>
                    <p className="holiday-name">{holidayInfo.name}</p>
                    <p>Profitez de ce jour de vacances !</p>
                </div>
            </div>
        );
    }

    if (todaySchedule.length === 0) {
        return (
            <div className="daily-schedule-section">
                <h2>Votre journée d'aujourd'hui</h2>
                <p>Aucun cours n'est prévu pour aujourd'hui.</p>
            </div>
        );
    }

    return (
        <div className="daily-schedule-section">
            <h2>Votre journée d'aujourd'hui</h2>
            <div className="daily-schedule-list">
                {todaySchedule.map(courseInSchedule => {
                    const classInfo = classes.find(c => c.id === courseInSchedule.classId);
                    const specialStatusNote = courseInSchedule.journalEntry?.notes;

                    let journalPreview = { text: null, className: '' };
                    if (courseInSchedule.journalEntry && !courseInSchedule.isCancelled && !courseInSchedule.isExam && !courseInSchedule.isHoliday) {
                        const workText = courseInSchedule.journalEntry.actual_work || courseInSchedule.journalEntry.planned_work;
                        journalPreview.text = courseInSchedule.isInterro ? workText.replace('[INTERRO]', '').trim() : workText;
                        journalPreview.className = courseInSchedule.journalEntry.actual_work ? 'actual-work' : 'planned-work';
                    }

                    return (
                        <div key={courseInSchedule.id}
                             className={`daily-journal-slot ${courseInSchedule.isCancelled ? 'is-cancelled' : ''} ${courseInSchedule.isExam ? 'is-exam' : ''} ${courseInSchedule.isHoliday ? 'is-holiday' : ''} ${courseInSchedule.isInterro ? 'is-interro' : ''}`}
                             style={{ borderColor: courseInSchedule.isCancelled ? 'var(--red-danger)' : (courseInSchedule.isExam || courseInSchedule.isHoliday) ? 'var(--accent-orange)' : getClassColor(courseInSchedule.subject, courseInSchedule.classLevel) }}>
                            {courseInSchedule.isHoliday ? (
                                <div className="cancellation-display holiday-display"><span className="cancellation-icon">🌴</span><p className="cancellation-label">Vacances - Férié</p><p className="cancellation-reason">{specialStatusNote}</p></div>
                            ) : courseInSchedule.isCancelled ? (
                                <div className="cancellation-display"><span className="cancellation-icon">🚫</span><p className="cancellation-label">ANNULÉ</p><p className="cancellation-reason">{specialStatusNote}</p></div>
                            ) : courseInSchedule.isExam ? (
                                <div className="cancellation-display exam-display"><span className="cancellation-icon">✍️</span><p className="cancellation-label">EXAMEN</p><p className="cancellation-reason">{specialStatusNote}</p></div>
                            ) : (
                                <div className="course-summary">
                                    <div className="course-info-header"><span className="course-time-display">{courseInSchedule.time_slot_libelle}</span><span className="course-class-display">{classInfo?.name || 'Classe inconnue'}</span></div>
                                    <div className="course-details">
                                        <div className="course-title-display">{courseInSchedule.subject}</div>
                                        <div className="course-room-display">{courseInSchedule.room}</div>
                                    </div>
                                    {journalPreview.text && (<div className={`journal-entry-preview ${journalPreview.className}`}><span className="preview-icon"></span>
                                        <p className="preview-text">
                                            {courseInSchedule.isInterro && <span className="interro-prefix">Interro : </span>}
                                            {journalPreview.text}</p>
                                    </div>)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TodayScheduleSection;