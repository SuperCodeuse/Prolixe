// dashboard.jsx
import React from 'react';
import '../../App.scss';
import './dashboard.scss';

const Dashboard = () => {
    // Données d'exemple pour les statistiques
    const stats = [
        {
            title: 'Total Classes',
            value: '12',
            icon: '🏫',
            color: 'primary',
            trend: '+2 ce mois'
        },
        {
            title: 'Cours cette semaine',
            value: '24',
            icon: '📚',
            color: 'info',
            trend: '6 cours/jour'
        },
        {
            title: 'Devoirs à corriger',
            value: '45',
            icon: '📝',
            color: 'warning',
            trend: '3 nouvelles'
        },
        {
            title: 'Étudiants actifs',
            value: '285',
            icon: '👨‍🎓',
            color: 'success',
            trend: '+15 ce mois'
        }
    ];

    // Cours du jour
    const todaySchedule = [
        {
            time: '08:00',
            subject: 'Mathématiques',
            class: '3ème A',
            room: 'Salle 101',
            type: 'cours'
        },
        {
            time: '10:00',
            subject: 'Physique',
            class: '2ème B',
            room: 'Labo 1',
            type: 'tp'
        },
        {
            time: '14:00',
            subject: 'Mathématiques',
            class: '1ère C',
            room: 'Salle 105',
            type: 'cours'
        },
        {
            time: '16:00',
            subject: 'Contrôle',
            class: '3ème A',
            room: 'Salle 101',
            type: 'evaluation'
        }
    ];

    // Tâches récentes
    const recentTasks = [
        {
            id: 1,
            title: 'Corriger les devoirs de Math - 3ème A',
            deadline: '2024-01-15',
            priority: 'high',
            completed: false
        },
        {
            id: 2,
            title: 'Préparer l\'examen de Physique',
            deadline: '2024-01-18',
            priority: 'medium',
            completed: false
        },
        {
            id: 3,
            title: 'Réunion parents-professeurs',
            deadline: '2024-01-20',
            priority: 'low',
            completed: true
        }
    ];

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
                            <div className="stat-trend">{stat.trend}</div>
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
                        {todaySchedule.map((item, index) => (
                            <div key={index} className={`schedule-item ${item.type}`}>
                                <div className="schedule-time">
                                    <span>{item.time}</span>
                                </div>
                                <div className="schedule-details">
                                    <h4>{item.subject}</h4>
                                    <p>{item.class} - {item.room}</p>
                                </div>
                                <div className={`schedule-type ${item.type}`}>
                                    {item.type === 'cours' && '📚'}
                                    {item.type === 'tp' && '🧪'}
                                    {item.type === 'evaluation' && '📝'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Tasks */}
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>✅ Tâches récentes</h2>
                        <button className="view-all-btn">Voir tout</button>
                    </div>
                    <div className="tasks-list">
                        {recentTasks.map((task) => (
                            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                                <div className="task-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => {}}
                                    />
                                </div>
                                <div className="task-content">
                                    <h4>{task.title}</h4>
                                    <p>Échéance: {new Date(task.deadline).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className={`task-priority ${task.priority}`}>
                                    {task.priority === 'high' && '🔴'}
                                    {task.priority === 'medium' && '🟡'}
                                    {task.priority === 'low' && '🟢'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
