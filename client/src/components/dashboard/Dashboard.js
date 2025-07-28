// client/src/components/dashboard/Dashboard.js
import React, { useEffect, useMemo } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from '../../hooks/useJournal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import '../../App.scss';
import './dashboard.scss';
import NotesSection from "./NoteSection";

const Dashboard = () => {
    const { currentJournal } = useJournal();
    const journalId = currentJournal?.id;
    const { classes, loading: loadingClasses, error: errorClasses } = useClasses(journalId);
    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule();
    const { assignments, fetchAssignments } = useJournal();

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);


    const todaySchedule = useMemo(() => {
        if (!schedule || !schedule.data) return [];

        const todayKey = format(new Date(), 'eeee').toLowerCase();

        return Object.entries(schedule.data)
            .filter(([key]) => key.startsWith(todayKey))
            .map(([key, course]) => {
                const time = key.substring(todayKey.length + 1);
                return {
                    ...course,
                    key,
                    time_slot_libelle: time,
                };
            })
            .sort((a, b) => {
                const timeA = a.time_slot_libelle.split('-')[0];
                const timeB = b.time_slot_libelle.split('-')[0];
                return timeA.localeCompare(timeB);
            });
    }, [schedule]);

    const stats = useMemo(() => {
        const programmedAssignments = assignments.filter(a => !a.is_completed).length;
        const pendingCorrections = assignments.filter(a => a.is_completed && !a.is_corrected).length;

        return [
            { title: 'Total Classes', value: classes.length, icon: '🏫', color: 'primary' },
            { title: 'Cours aujourd\'hui', value: todaySchedule.length, icon: '📚', color: 'info' },
            { title: 'Devoirs programmés', value: programmedAssignments, icon: '📝', color: 'warning' },
            { title: 'Corrections en attente', value: pendingCorrections, icon: '✍️', color: 'success' }
        ];
    }, [classes.length, todaySchedule.length, assignments]);

    // --- Tâches à faire ---
    const { assignmentsToCorrect, upcomingAssignments } = useMemo(() => {
        const toCorrect = assignments.filter(a => a.is_completed && !a.is_corrected);
        const upcoming = assignments
            .filter(a => !a.is_completed)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5);
        return { assignmentsToCorrect: toCorrect, upcomingAssignments: upcoming };
    }, [assignments]);


    // --- Gestion des états de chargement et d'erreur ---
    if (loadingClasses || loadingSchedule) {
        return <div className="dashboard-status">Chargement du tableau de bord...</div>;
    }

    if (errorClasses || errorSchedule) {
        const errorMessage = (errorClasses?.message || '') + ' ' + (errorSchedule?.message || '');
        return <div className="dashboard-status error">Erreur de chargement: {errorMessage}</div>;
    }

    return (
        <div className="dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>📊 Tableau de bord</h1>
                    <p>Vue d'ensemble de vos activités d'enseignement</p>
                </div>
                <div className="header-date">
                    <span>{format(new Date(), 'PPPP', { locale: fr })}</span>
                </div>
            </div>

            {/* Statistics Cards */}
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

            <div className="dashboard-content">
                {/* Today's Schedule */}
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>📅 Emploi du temps d'aujourd'hui</h2>
                        {/* Ce bouton pourrait naviguer vers la page Horaire complète */}
                        <button className="view-all-btn">Voir tout</button>
                    </div>
                    <div className="schedule-list">
                        {todaySchedule.length > 0 ? todaySchedule.map((item) => {
                            // Utilisation de '==' pour la comparaison d'ID par sécurité (si les types diffèrent)
                            const classInfo = classes.find(c => c.id == item.classId);
                            return (
                                <div key={item.key} className="schedule-item">
                                    <div className="schedule-time">
                                        {/* Affiche l'heure de début du cours */}
                                        <span>{item.time_slot_libelle.split('-')[0]}</span>
                                    </div>
                                    <div className="schedule-details">
                                        <h4>{item.subject}</h4>
                                        <p>{classInfo?.name || 'Classe inconnue'} - {item.room}</p>
                                    </div>
                                </div>
                            )
                        }) : <p className="empty-state">Aucun cours programmé pour aujourd'hui.</p>}
                    </div>
                </div>

                {/* "À faire" Section */}
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

                        <h4 style={{marginTop: '1.5rem'}}>Prochains devoirs</h4>
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

                <NotesSection />
            </div>
        </div>
    );
};

export default Dashboard;
