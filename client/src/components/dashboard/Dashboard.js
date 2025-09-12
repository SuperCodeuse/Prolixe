import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from '../../hooks/useJournal';
import HolidaysManagerService from '../../services/HolidaysManagerService'; // Importez le service
import { format, parseISO } from 'date-fns';
import { fr, enGB } from 'date-fns/locale';
import './dashboard.scss';
import './dashboard_mobile.scss';
import NoteSection from './NoteSection';
import ScheduleSection from './ScheduleSection';

const Dashboard = () => {
    const { user } = useAuth();
    const [holidays, setHolidays] = useState([]);
    const [loadingHolidays, setLoadingHolidays] = useState(true);

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

    // Fonction pour récupérer les vacances
    const fetchHolidays = async () => {
        setLoadingHolidays(true);
        try {
            // Vérifier le cache du localStorage
            const cachedHolidays = localStorage.getItem('prolixeHolidays');
            if (cachedHolidays) {
                setHolidays(JSON.parse(cachedHolidays));
                setLoadingHolidays(false);
                return;
            }

            // Si non présent, appeler l'API
            const response = await HolidaysManagerService.getHolidays();
            const fetchedHolidays = response.data;
            setHolidays(fetchedHolidays);
            // Stocker dans le localStorage
            localStorage.setItem('prolixeHolidays', JSON.stringify(fetchedHolidays));
        } catch (error) {
            console.error('Erreur lors de la récupération des jours fériés:', error);
            // En cas d'erreur (fichier non trouvé par exemple), on réinitialise les vacances
            setHolidays([]);
            localStorage.removeItem('prolixeHolidays');
        } finally {
            setLoadingHolidays(false);
        }
    };

    useEffect(() => {
        // Appeler la fonction de chargement des vacances au montage du composant
        fetchHolidays();
    }, []);

    useEffect(() => {
        if (journalId) {
            fetchAssignments();
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            fetchJournalEntries(todayStr, todayStr);
        }
    }, [journalId, fetchAssignments, fetchJournalEntries, currentJournal]);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const getHolidayForDate = (date) => {
        if (!holidays || holidays.length === 0) return null;
        const formattedDate = format(date, 'yyyy-MM-dd');
        return holidays.find(h => h.date === formattedDate) || null;
    };
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
    }, [schedule, journalEntries, todayStr, classes, holidayInfo]); // Ajout de `holidays` comme dépendance

    const stats = useMemo(() => {
        // Correction : S'assurer que `assignments` est un tableau avant de l'utiliser
        const safeAssignments = Array.isArray(assignments) ? assignments : [];

        if (!classes || !safeAssignments || !todaySchedule) {
            return [];
        }

        const programmedAssignments = safeAssignments.filter(a => !a.is_completed).length;
        const pendingCorrections = safeAssignments.filter(a => a.is_completed && !a.is_corrected).length;

        return [
            { title: 'Total Classes', value: classes.length, icon: '🏫', color: 'primary' },
            { title: 'Cours aujourd\'hui', value: todaySchedule.length, icon: '📚', color: 'info' },
            { title: 'Devoirs programmés', value: programmedAssignments, icon: '📝', color: 'warning' },
            { title: 'Corrections en attente', value: pendingCorrections, icon: '✍️', color: 'success' }
        ];
    }, [classes, todaySchedule, assignments]);

    const { assignmentsToCorrect, upcomingAssignments } = useMemo(() => {
        // Correction : S'assurer que `assignments` est un tableau avant de l'utiliser
        const safeAssignments = Array.isArray(assignments) ? assignments : [];
        if (!safeAssignments) return { assignmentsToCorrect: [], upcomingAssignments: [] };

        const toCorrect = safeAssignments.filter(a => a.is_completed && !a.is_corrected);
        const upcoming = safeAssignments
            .filter(a => !a.is_completed)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5);
        return { assignmentsToCorrect: toCorrect, upcomingAssignments: upcoming };
    }, [assignments]);

    if (!user) {
        return <div>Chargement...</div>;
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <h1>Bonjour {user.firstname} ! 👋</h1>
                <p>Bienvenue sur votre tableau de bord Prolixe</p>
            </div>

            <div className="dashboard-content">
                <div className="dashboard-columns">
                    <div className="column main-column margin-bottom-lg">
                        <ScheduleSection />
                    </div>
                    <div className="column side-column">
                        <NoteSection />
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