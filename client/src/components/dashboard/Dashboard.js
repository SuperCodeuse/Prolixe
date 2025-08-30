// client/src/components/dashboard/Dashboard.js
import React, { useEffect, useMemo } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from '../../hooks/useJournal';
import { useHolidays } from '../../hooks/useHolidays';
import { format, parseISO } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import '../../App.scss';
import './dashboard.scss';
import NotesSection from "./NoteSection";

const Dashboard = () => {
    const {
        currentJournal,
        assignments,
        fetchAssignments,
        journalEntries,
        fetchJournalEntries,
        loading: loadingJournal
    } = useJournal();

    const journalId = currentJournal?.id;

    const { classes, loading: loadingClasses, error: errorClasses, getClassColor } = useClasses(journalId);
    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule();
    const { getHolidayForDate, loading: loadingHolidays } = useHolidays();

    useEffect(() => {
        if (journalId) {
            fetchAssignments();
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            fetchJournalEntries(todayStr, todayStr);
        }
    }, [journalId, fetchAssignments, fetchJournalEntries, currentJournal]);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const holidayInfo = getHolidayForDate(new Date());

    const todaySchedule = useMemo(() => {
        if (!schedule || !schedule.data || !classes) return [];
        if (holidayInfo) return [];

        const todayKey = format(new Date(), 'eeee', { locale: enGB }).toLowerCase();
        const courses = Object.values(schedule.data).filter(course => course.day === todayKey);

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
        }).sort((a, b) => {
            const timeA = a.time_slot_libelle.split('-')[0];
            const timeB = b.time_slot_libelle.split('-')[0];
            return timeA.localeCompare(timeB);
        });
    }, [schedule, journalEntries, todayStr, classes, holidayInfo]); // Ajout de `classes` et `holidayInfo` comme dépendances

    const stats = useMemo(() => {
        // S'assurer que les données sont prêtes
        if (!classes || !assignments || !todaySchedule) {
            return [];
        }

        const programmedAssignments = assignments.filter(a => !a.is_completed).length;
        const pendingCorrections = assignments.filter(a => a.is_completed && !a.is_corrected).length;

        return [
            { title: 'Total Classes', value: classes.length, icon: '🏫', color: 'primary' },
            { title: 'Cours aujourd\'hui', value: todaySchedule.length, icon: '📚', color: 'info' },
            { title: 'Devoirs programmés', value: programmedAssignments, icon: '📝', color: 'warning' },
            { title: 'Corrections en attente', value: pendingCorrections, icon: '✍️', color: 'success' }
        ];
    }, [classes, todaySchedule, assignments]);

    const { assignmentsToCorrect, upcomingAssignments } = useMemo(() => {
        // S'assurer que les données sont prêtes
        if (!assignments) return { assignmentsToCorrect: [], upcomingAssignments: [] };

        const toCorrect = assignments.filter(a => a.is_completed && !a.is_corrected);
        const upcoming = assignments
            .filter(a => !a.is_completed)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5);
        return { assignmentsToCorrect: toCorrect, upcomingAssignments: upcoming };
    }, [assignments]);

    // Gérer l'état de chargement de manière plus robuste
    if (loadingJournal || loadingClasses || loadingSchedule || loadingHolidays) {
        return <div className="dashboard-status">Chargement du tableau de bord...</div>;
    }

    // Gestion des erreurs
    if (errorClasses || errorSchedule) {
        const errorMessage = (errorClasses?.message || '') + ' ' + (errorSchedule?.message || '');
        return <div className="dashboard-status error">Erreur de chargement: {errorMessage}</div>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>📊 Tableau de bord</h1>
                    <p>Vue d'ensemble de vos activités d'enseignement</p>
                </div>
                <div className="header-date">
                    <span>{format(new Date(), 'PPPP', { locale: fr })}</span>
                </div>
            </div>

            <div className="dashboard-content">
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
                <NotesSection />

                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>✅ À faire</h2>
                    </div>
                    <div className="tasks-list">
                        <h4>Corrections en attente</h4>
                        {assignmentsToCorrect.length > 0 ? (
                            assignmentsToCorrect.map(task => {
                                const classInfo = classes.find(c => c.id == task.class_id);
                                return (
                                    <div key={task.id} className="task-item">
                                        <div className="task-content">
                                            <h4>{task.subject} - {classInfo?.name || 'Classe inconnue'}</h4>
                                            {task.description && <p className="description-task">{task.description}</p>}
                                            <p>Remis le : {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : <p className="empty-state">Aucune correction en attente.</p>}

                        <h4 style={{ marginTop: '1.5rem' }}>Prochains devoirs</h4>
                        {upcomingAssignments.length > 0 ? (
                            upcomingAssignments.map(task => {
                                const classInfo = classes.find(c => c.id == task.class_id);
                                return (
                                    <div key={task.id} className="task-item">
                                        <div className="task-content">
                                            <h4>{task.subject} - {classInfo?.name || 'Classe inconnue'}</h4>
                                            {task.description && <p className="description-task">{task.description}</p>}
                                            <p>À rendre le : {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : <p className="empty-state">Aucun devoir programmé.</p>}
                    </div>
                </div>
            </div>
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className={`stat-card ${stat.color}`}>
                        <div className="stat-header">
                            <div className="stat-icon">{stat.icon}</div>
                        </div>
                        <div className="stat-content">
                            <h3>{stat.value}</h3>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default Dashboard;