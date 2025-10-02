import React, { useMemo } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from '../../hooks/useJournal';
import { useHolidays } from '../../hooks/useHolidays';
import { format, parseISO } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import './dashboard.scss';

const ScheduleSection = () => {
    const { currentJournal, journalEntries, loading: loadingJournal } = useJournal();
    const { classes, loading: loadingClasses, getClassColor } = useClasses(currentJournal?.id);
    const { schedule, loading: loadingSchedule } = useSchedule();
    const { getHolidayForDate, loading: loadingHolidays } = useHolidays();

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const holidayInfo = getHolidayForDate(new Date());

    const todaySchedule = useMemo(() => {
        if (!schedule || !schedule.data || !classes) return [];
        if (holidayInfo) return [];

        const todayKey = format(new Date(), 'eeee', { locale: enGB }).toLowerCase();
        const courses = Object.values(schedule.data).filter(course => course.day === todayKey);

        // MODIFICATION ICI: Tri des cours par time_slot_id
        return courses.map(course => {
            const journalEntry = journalEntries.find(entry =>
                entry.schedule_id === course.id &&
                format(parseISO(entry.date), 'yyyy-MM-dd') === todayStr
            );
            const isCancelled = journalEntry?.actual_work === '[CANCELLED]';

            return {
                ...course,
                key: `${course.day}-${course.time_slot_libelle}`,
                isCancelled: isCancelled,
                cancellationNotes: isCancelled ? journalEntry.notes : null
            };
        }).sort((a, b) => a.time_slot_id - b.time_slot_id); // Tri par ID numérique
    }, [schedule, journalEntries, todayStr, classes, holidayInfo]);

    const isLoading = loadingJournal || loadingClasses || loadingSchedule || loadingHolidays;

    if (isLoading) {
        return <div className="loading"><div className="spinner"></div><p>Chargement de l'horaire...</p></div>;
    }

    return (
        <div className="dashboard-section">
            <div className="section-header">
                <h2>📅 Emploi du temps d'aujourd'hui</h2>
            </div>
            <div className="schedule-list">
                {holidayInfo ? (
                    <div className="holiday-card-dashboard">
                        <span className="holiday-icon">🎉</span>
                        <div className="holiday-details">
                            <h4>Jour de congé</h4>
                            <p>{holidayInfo.name}</p>
                        </div>
                    </div>
                ) : todaySchedule.length > 0 ? (
                    todaySchedule.map((item) => {
                        const classInfo = classes.find(c => c.id == item.classId);
                        const itemColor = getClassColor(item.subject, classInfo?.classLevel);

                        return (
                            <div
                                key={item.key}
                                className={`schedule-item ${item.isCancelled ? 'is-cancelled' : ''}`}
                                style={{ borderLeftColor: item.isCancelled ? 'var(--red-danger)' : itemColor }}
                            >
                                {item.isCancelled ? (
                                    <>
                                        <div className="schedule-time">{item.time_slot_libelle.split('-')[0]}</div>
                                        <div className="schedule-details">
                                            <h4 className="cancelled-text">{item.subject} - ANNULÉ</h4>
                                            <p>{classInfo?.name || 'Classe inconnue'} - {item.room}</p>
                                            {item.cancellationNotes && <p className="cancellation-reason">{item.cancellationNotes}</p>}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="schedule-time">
                                            <span>{item.time_slot_libelle.split('-')[0]}</span>
                                        </div>
                                        <div className="schedule-details">
                                            <h4>{item.subject}</h4>
                                            <p>{classInfo?.name || 'Classe inconnue'} - {item.room}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="empty-state">Aucun cours programmé pour aujourd'hui.</p>
                )}
            </div>
        </div>
    );
};

export default ScheduleSection;