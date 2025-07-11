// client/src/components/dashboard/Dashboard.js
import React, { useEffect } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from '../../hooks/useJournal';
import { format, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import '../../App.scss';
import './dashboard.scss';
import NotesSection from "./NoteSection";

const Dashboard = () => {
    const { classes } = useClasses();
    const { schedule } = useSchedule();
    const { assignments, fetchAssignments } = useJournal();

    useEffect(() => {
        // On s'assure de toujours avoir la liste complète des devoirs sur le dashboard
        fetchAssignments();
    }, [fetchAssignments]);


    // --- Statistiques dynamiques ---
    const programmedAssignments = assignments.filter(a => !a.is_completed).length;
    const pendingCorrections = assignments.filter(a => a.is_completed && !a.is_corrected).length;

    // --- Emploi du temps du jour ---
    const dayOfWeekMap = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const todayKey = dayOfWeekMap[getDay(new Date())];
    const todaySchedule = Object.values(schedule.data || {}).filter(course => course.day === todayKey);

    const stats = [
        {
            title: 'Total Classes',
            value: classes.length,
            icon: '🏫',
            color: 'primary',
        },
        {
            title: 'Cours aujourd\'hui',
            value: todaySchedule.length,
            icon: '📚',
            color: 'info',
        },
        {
            title: 'Devoirs programmés',
            value: programmedAssignments,
            icon: '📝',
            color: 'warning',
        },
        {
            title: 'Corrections en attente',
            value: pendingCorrections,
            icon: '✍️',
            color: 'success',
        }
    ];

    // --- Tâches à faire ---
    const assignmentsToCorrect = assignments.filter(a => a.is_completed && !a.is_corrected);
    const upcomingAssignments = assignments.filter(a => !a.is_completed).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);

    return (
        <div className="dashboard">
            {/* Header */}
             <div className="dashboard-header">
                <div className="header-content">
                    <h1>📊 Tableau de bord</h1>
                    <p>Vue d'ensemble de vos activités d'enseignement</p>
                </div>
                <div className="header-date">
                    <span>{new Date().toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
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
                        <button className="view-all-btn">Voir tout</button>
                    </div>
                    <div className="schedule-list">
                        {todaySchedule.length > 0 ? todaySchedule.map((item, index) => {
                            const classInfo = classes.find(c => c.id === item.classId);
                            return (
                                <div key={index} className="schedule-item">
                                    <div className="schedule-time">
                                        <span>{item.time_slot_libelle.split('-')[0]}</span>
                                    </div>
                                    <div className="schedule-details">
                                        <h4>{item.subject}</h4>
                                        <p>{classInfo?.name || 'Classe inconnue'} - {item.room}</p>
                                    </div>
                                </div>
                            )
                        }) : <p>Aucun cours programmé pour aujourd'hui.</p>}
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
                            assignmentsToCorrect.map(task => (
                                <div key={task.id} className="task-item">
                                    <div className="task-content">
                                        <h4>{task.subject} - {classes.find(c => c.id === task.class_id)?.name}</h4>
                                        {task.description?.length > 0 ? (
                                            <p className="description-task">{task.description} </p>) : ''
                                        }
                                        <p>Remis le: {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}</p>
                                    </div>
                                </div>
                            ))
                        ) : <p>Aucune correction en attente.</p>}

                        <h4 style={{marginTop: '1.5rem'}}>Prochains devoirs</h4>
                        {upcomingAssignments.length > 0 ? (
                            upcomingAssignments.map(task => (
                                <div key={task.id} className="task-item">
                                    <div className="task-content">
                                        <h4>{task.subject} - {classes.find(c => c.id === task.class_id)?.name}</h4>
                                        {task.description?.length > 0 ? (
                                            <p className="description-task">{task.description} </p>) : ''
                                        }
                                        <p>À rendre le: {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}</p>
                                    </div>
                                </div>
                            ))
                        ) : <p>Aucun devoir programmé.</p>}
                    </div>
                </div>

                <NotesSection />
            </div>
        </div>
    );
};

export default Dashboard;