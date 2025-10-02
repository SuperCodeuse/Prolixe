import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useSchedule } from '../../hooks/useSchedule';
import { useJournal } from '../../hooks/useJournal';
import { useScheduleHours } from '../../hooks/useScheduleHours';
import useScheduleModel from '../../hooks/useScheduleModel';
import HolidaysManagerService from '../../services/HolidaysManagerService';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import './dashboard.scss';
import './dashboard_mobile.scss';
import NoteSection from './NoteSection';
import TodayScheduleSection from './TodayScheduleSection';

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
        loadAllJournals,
        loading: loadingJournal
    } = useJournal();

    const journalId = currentJournal?.id;

    const { classes, loading: loadingClasses, getClassColor } = useClasses(journalId);
    const { schedules, loading: loadingSchedules } = useScheduleModel();
    const { hours, loading: loadingHours } = useScheduleHours();

    const getDayKeyFromDateFnsString = useCallback((dayName) => ({'lundi':'monday','mardi':'tuesday','mercredi':'wednesday','jeudi':'thursday','vendredi':'friday'}[dayName]||dayName),[]);

    const getScheduleSetForDate = useCallback((date) => {
        if (!schedules || schedules.length === 0) return null;
        const scheduleSet = schedules.find(schedule => {
            try {
                const startDate = parseISO(schedule.start_date);
                const endDate = parseISO(schedule.end_date);
                return isWithinInterval(date, { start: startDate, end: endDate });
            } catch (e) {
                console.error('Erreur de parsing des dates du schedule:', schedule, e);
                return false;
            }
        });
        return scheduleSet || null;
    }, [schedules]);

    const currentScheduleSet = useMemo(() => {
        return getScheduleSetForDate(new Date());
    }, [getScheduleSetForDate]);

    const { schedule, loading: loadingSchedule, error: errorSchedule } = useSchedule(currentScheduleSet?.id);

    const fetchHolidays = async () => {
        setLoadingHolidays(true);
        try {
            const cachedHolidays = localStorage.getItem('prolixeHolidays');
            if (cachedHolidays) {
                setHolidays(JSON.parse(cachedHolidays));
                setLoadingHolidays(false);
                return;
            }
            const response = await HolidaysManagerService.getHolidays();
            const fetchedHolidays = response.data;
            setHolidays(fetchedHolidays);
            localStorage.setItem('prolixeHolidays', JSON.stringify(fetchedHolidays));
        } catch (error) {
            console.error('Erreur lors de la récupération des jours fériés:', error);
            setHolidays([]);
            localStorage.removeItem('prolixeHolidays');
        } finally {
            setLoadingHolidays(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    useEffect(() => {
        loadAllJournals();
    }, [loadAllJournals]);

    useEffect(() => {
        if (journalId && currentScheduleSet) {
            fetchAssignments();
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            fetchJournalEntries(todayStr, todayStr);
        }
    }, [journalId, fetchAssignments, fetchJournalEntries, currentJournal, currentScheduleSet]);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const getHolidayForDate = useCallback((date) => {
        if (!holidays || holidays.length === 0) return null;
        const formattedDate = format(date, 'yyyy-MM-dd');
        return holidays.find(h => h.date === formattedDate) || null;
    }, [holidays]);

    const holidayInfo = getHolidayForDate(new Date());

    const todaySchedule = useMemo(() => {
        if (!schedule || !schedule.data || !classes || holidayInfo) return [];

        const todayKey = getDayKeyFromDateFnsString(format(new Date(), 'EEEE', { locale: fr }).toLowerCase());
        const courses = Object.values(schedule.data).filter(course => course.day === todayKey);

        const sortedCourses = courses.map(course => {
            const journalEntry = journalEntries.find(entry =>
                entry.schedule_id === course.id &&
                entry.date && format(parseISO(entry.date), 'yyyy-MM-dd') === todayStr
            );
            const isCancelled = journalEntry?.actual_work === '[CANCELLED]';
            const isExam = journalEntry?.actual_work === '[EXAM]';
            const isHoliday = journalEntry?.actual_work === '[HOLIDAY]';
            const isInterro = journalEntry?.actual_work?.startsWith('[INTERRO]');

            return {
                ...course,
                key: `${course.day}-${course.time_slot_libelle}`,
                journalEntry,
                isCancelled,
                isExam,
                isHoliday,
                isInterro,
            };
        }).sort((a, b) => {
            // Utilisation de parseInt() pour garantir un tri numérique fiable
            return parseInt(a.time_slot_id) - parseInt(b.time_slot_id);
        });

        return sortedCourses;
    }, [schedule, journalEntries, todayStr, classes, holidayInfo, getDayKeyFromDateFnsString]);

    const { assignmentsToCorrect, upcomingAssignments } = useMemo(() => {
        const safeAssignments = Array.isArray(assignments) ? assignments : [];
        if (!safeAssignments) return { assignmentsToCorrect: [], upcomingAssignments: [] };

        const toCorrect = safeAssignments.filter(a => a.is_completed && !a.is_corrected);
        const upcoming = safeAssignments
            .filter(a => !a.is_completed)
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5);
        return { assignmentsToCorrect: toCorrect, upcomingAssignments: upcoming };
    }, [assignments]);

    const stats = useMemo(() => {
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


    const isLoading = loadingClasses || loadingJournal || loadingSchedule || loadingHolidays || loadingHours || loadingSchedules;
    if (!user) {
        return <div>Chargement...</div>;
    }

    if (isLoading) {
        return <div className="dashboard-page"><div className="loading-message">Chargement...</div></div>;
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
                        <TodayScheduleSection
                            todaySchedule={todaySchedule}
                            holidayInfo={holidayInfo}
                            getClassColor={getClassColor}
                            classes={classes}
                            loading={loadingSchedule || loadingHours}
                        />
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