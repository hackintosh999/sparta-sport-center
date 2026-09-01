import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    User,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    Bell,
    Navigation,
    Share2,
    CalendarPlus,
    X,
    Send,
    Loader2,
    AlertTriangle,
    Info,
    ShieldAlert
} from 'lucide-react';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { SPARTA_SCHEDULE, ScheduleSlot } from '../../constants/spartaSchedule';
import { resolveSpartaCoachAndGroup } from '../../utils/studentLinking';
import { ScheduleOverride } from '../../services/scheduleOverrides';

interface FamilyScheduleSectionProps {
    childProfile: any;
    parentUser?: any;
}

interface DayScheduleInfo {
    dayShort: string;
    dayFull: string;
    dayIndex: number; // 1 = Monday, 7 = Sunday
    dateStr: string; // YYYY-MM-DD
    isToday: boolean;
    isTrainingDay: boolean;
    timeRange: string;
    startTime: string;
    endTime: string;
    location: string;
    coachName: string;
    type: string;
    override?: ScheduleOverride;
}

const DAYS_META = [
    { short: 'Пн', full: 'Понедельник', index: 1, key: 'mon' },
    { short: 'Вт', full: 'Вторник', index: 2, key: 'tue' },
    { short: 'Ср', full: 'Среда', index: 3, key: 'wed' },
    { short: 'Чт', full: 'Четверг', index: 4, key: 'thu' },
    { short: 'Пт', full: 'Пятница', index: 5, key: 'fri' },
    { short: 'Сб', full: 'Суббота', index: 6, key: 'sat' },
    { short: 'Вс', full: 'Воскресенье', index: 7, key: 'sun' }
];

export const FamilyScheduleSection: React.FC<FamilyScheduleSectionProps> = ({
    childProfile,
    parentUser
}) => {
    const [groupData, setGroupData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [absenceReason, setAbsenceReason] = useState<'sick' | 'vacation' | 'family' | 'other'>('sick');
    const [absenceDate, setAbsenceDate] = useState<string>('');
    const [absenceComment, setAbsenceComment] = useState('');
    const [isSendingAbsence, setIsSendingAbsence] = useState(false);
    const [absenceSuccessMsg, setAbsenceSuccessMsg] = useState('');
    const [copiedAddress, setCopiedAddress] = useState(false);

    const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);

    // Current real-world day index (1 = Monday ... 7 = Sunday)
    const currentDayIndex = useMemo(() => {
        const jsDay = new Date().getDay();
        return jsDay === 0 ? 7 : jsDay;
    }, []);

    // Calculate dates for Monday-Sunday of the current week (YYYY-MM-DD)
    const currentWeekDates = useMemo(() => {
        const now = new Date();
        const jsDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
        const diffToMon = (jsDay === 0 ? -6 : 1) - jsDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);

        const dates: Record<number, string> = {};
        for (let i = 1; i <= 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + (i - 1));
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dates[i] = `${yyyy}-${mm}-${dd}`;
        }
        return dates;
    }, []);

    // 0. Listen to real-time schedule overrides (cancellations, reschedules, replacements)
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'schedule_overrides'), (snapshot) => {
            const data: ScheduleOverride[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as ScheduleOverride));
            setOverrides(data);
        }, (err) => {
            console.error('Error listening to schedule overrides:', err);
        });

        return () => unsub();
    }, []);

    // 1. Listen to real group document from Firestore if groupId exists
    useEffect(() => {
        if (!childProfile?.groupId) {
            setGroupData(null);
            return;
        }

        setLoading(true);
        const unsub = onSnapshot(doc(db, 'groups', childProfile.groupId), (snap) => {
            if (snap.exists()) {
                setGroupData({ id: snap.id, ...snap.data() });
            } else {
                setGroupData(null);
            }
            setLoading(false);
        }, (err) => {
            console.error('Error listening to group:', err);
            setLoading(false);
        });

        return () => unsub();
    }, [childProfile?.groupId]);

    // 2. Comprehensive matching against all Sparta Official Groups
    const matchedSpartaPreset: ScheduleSlot = useMemo(() => {
        const rawGroupId = (childProfile?.groupId || '').toLowerCase();
        const rawGroup = (childProfile?.groupName || groupData?.name || '').toLowerCase();
        const rawCoach = (childProfile?.coachName || groupData?.coachName || '').toLowerCase();
        const childBirthYear = childProfile?.birthYear || childProfile?.childBirthYear || (childProfile?.childAge ? 2026 - childProfile.childAge : null);

        // 0. Direct ID match
        if (rawGroupId) {
            const byId = SPARTA_SCHEDULE.find(s => s.id === rawGroupId);
            if (byId) return byId;
        }

        // 1. Weekend groups check
        const isWeekend = rawGroup.includes('выходн') || rawGroup.includes('сб') || rawGroup.includes('вс');
        if (isWeekend) {
            if (rawGroup.includes('2018') || rawGroup.includes('2019') || rawGroup.includes('2020') || (childBirthYear && childBirthYear >= 2018)) {
                return SPARTA_SCHEDULE.find(s => s.id === 'ponomarev_4') || SPARTA_SCHEDULE[5];
            }
            if (rawGroup.includes('2016') || rawGroup.includes('2017') || (childBirthYear && (childBirthYear === 2016 || childBirthYear === 2017))) {
                return SPARTA_SCHEDULE.find(s => s.id === 'ponomarev_3') || SPARTA_SCHEDULE[4];
            }
            return SPARTA_SCHEDULE.find(s => s.id === 'ponomarev_5') || SPARTA_SCHEDULE[6];
        }

        // 2. Weekday groups by Coach & Age
        if (rawGroup.includes('якупов') || (rawGroup.includes('2016') && rawGroup.includes('2018')) || (rawGroup.includes('2017') && !rawGroup.includes('пономарев'))) {
            return SPARTA_SCHEDULE.find(s => s.id === 'yakupov_1') || SPARTA_SCHEDULE[0];
        }
        if (rawGroup.includes('кубарь') || (rawGroup.includes('2014') && rawGroup.includes('2015') && rawGroup.includes('20:00'))) {
            return SPARTA_SCHEDULE.find(s => s.id === 'kubar_1') || SPARTA_SCHEDULE[1];
        }
        if (rawGroup.includes('пономарев') && (rawGroup.includes('2012') || rawGroup.includes('2013'))) {
            return SPARTA_SCHEDULE.find(s => s.id === 'ponomarev_1') || SPARTA_SCHEDULE[2];
        }
        if (rawGroup.includes('пономарев') && (rawGroup.includes('2014') || rawGroup.includes('2015'))) {
            return SPARTA_SCHEDULE.find(s => s.id === 'ponomarev_2') || SPARTA_SCHEDULE[3];
        }

        // 3. Match by birth year
        if (childBirthYear) {
            const byYear = SPARTA_SCHEDULE.find(s => s.birthYears.includes(Number(childBirthYear)));
            if (byYear) return byYear;
        }

        // 4. Match by coach name in schedule
        if (rawCoach) {
            const byCoach = SPARTA_SCHEDULE.find(s => rawCoach.includes(s.coachName.toLowerCase().split(' ')[0]));
            if (byCoach) return byCoach;
        }

        return SPARTA_SCHEDULE[0];
    }, [childProfile?.groupId, childProfile?.birthYear, childProfile?.childBirthYear, childProfile?.childAge, childProfile?.groupName, childProfile?.coachName, groupData?.name, groupData?.coachName]);

    // 3. Build 7-day schedule array with Overrides
    const weekSchedule: DayScheduleInfo[] = useMemo(() => {
        const resolved = resolveSpartaCoachAndGroup(
            groupData?.name || childProfile?.groupName,
            groupData?.coachName || childProfile?.coachName || matchedSpartaPreset?.coachName,
            childProfile?.birthYear || childProfile?.childBirthYear,
            childProfile?.childAge
        );
        const coachName = resolved.coachName;
        const location = groupData?.location || 'Манеж Sparta • ул. Российская, 36';

        let rawDaysString = groupData?.days || groupData?.scheduleDays || '';
        let rawTimeString = groupData?.time || groupData?.scheduleTime || '';

        if (!rawDaysString || rawDaysString.trim().length < 2) {
            rawDaysString = matchedSpartaPreset?.days || 'Пн, Ср, Пт';
        }
        if (!rawTimeString || rawTimeString.trim().length < 3) {
            rawTimeString = matchedSpartaPreset?.time || '19:00 - 20:00';
        }

        const daysLower = String(rawDaysString).toLowerCase();
        const [rawStart = '19:00', rawEnd = '20:00'] = rawTimeString.split(/[-–—]/).map((s: string) => s.trim());

        const targetGroup = (resolved.groupName || childProfile?.groupName || '').toLowerCase();
        const targetGroupId = childProfile?.groupId || matchedSpartaPreset?.id || '';

        return DAYS_META.map(d => {
            const isToday = d.index === currentDayIndex;
            const dateStr = currentWeekDates[d.index] || '';
            let isTrainingDay = false;

            if (Array.isArray(groupData?.schedule) && groupData.schedule.length > 0) {
                isTrainingDay = groupData.schedule.some((slot: any) => {
                    const sDay = (slot.day || '').toLowerCase();
                    return sDay.includes(d.short.toLowerCase()) || sDay.includes(d.full.toLowerCase());
                });
            } else {
                isTrainingDay = daysLower.includes(d.short.toLowerCase()) || 
                               (d.index === 1 && (daysLower.includes('пн') || daysLower.includes('понедельник'))) ||
                               (d.index === 2 && (daysLower.includes('вт') || daysLower.includes('вторник'))) ||
                               (d.index === 3 && (daysLower.includes('ср') || daysLower.includes('среда'))) ||
                               (d.index === 4 && (daysLower.includes('чт') || daysLower.includes('четверг'))) ||
                               (d.index === 5 && (daysLower.includes('пт') || daysLower.includes('пятница'))) ||
                               (d.index === 6 && (daysLower.includes('сб') || daysLower.includes('суббота'))) ||
                               (d.index === 7 && (daysLower.includes('вс') || daysLower.includes('воскресенье')));
            }

            // Find matching override for this specific date
            const override = overrides.find(o => {
                if (o.date !== dateStr) return false;
                const oGroup = (o.groupName || o.groupId || '').toLowerCase();
                return o.groupId === targetGroupId || 
                       o.groupId === 'all' ||
                       (targetGroup && (oGroup.includes(targetGroup.slice(0, 8)) || targetGroup.includes(oGroup.slice(0, 8))));
            });

            // Adjust times and coach if overridden
            let activeStartTime = rawStart;
            let activeEndTime = rawEnd;
            let activeCoach = coachName;

            if (override) {
                if (override.status === 'rescheduled' && override.newTime) {
                    const [oStart = rawStart, oEnd = rawEnd] = override.newTime.split(/[-–—]/).map((s: string) => s.trim());
                    activeStartTime = oStart;
                    activeEndTime = oEnd;
                }
                if (override.status === 'replacement' && override.replacementCoach) {
                    activeCoach = override.replacementCoach;
                }
            }

            return {
                dayShort: d.short,
                dayFull: d.full,
                dayIndex: d.index,
                dateStr,
                isToday,
                isTrainingDay,
                timeRange: isTrainingDay ? `${activeStartTime} – ${activeEndTime}` : '',
                startTime: activeStartTime,
                endTime: activeEndTime,
                location,
                coachName: activeCoach,
                type: isTrainingDay ? 'Футбол (Тренировка)' : 'Отдых',
                override
            };
        });
    }, [groupData, matchedSpartaPreset, childProfile, currentDayIndex, overrides, currentWeekDates]);

    // 4. Calculate next training session
    const nextSession = useMemo(() => {
        // Look from today onwards in the current week
        for (let i = currentDayIndex; i <= 7; i++) {
            const day = weekSchedule.find(d => d.dayIndex === i);
            if (day && day.isTrainingDay) {
                if (i === currentDayIndex) {
                    // Check if time hasn't passed today
                    const now = new Date();
                    const [h, m] = day.startTime.split(':').map(Number);
                    const sessionTime = new Date();
                    sessionTime.setHours(h || 19, m || 0, 0, 0);

                    if (now < sessionTime) {
                        return { day, label: 'Сегодня', relative: `Сегодня в ${day.startTime}`, isToday: true };
                    }
                } else if (i === currentDayIndex + 1) {
                    return { day, label: 'Завтра', relative: `Завтра (${day.dayShort}) в ${day.startTime}`, isToday: false };
                } else {
                    return { day, label: day.dayFull, relative: `В ${day.dayFull.toLowerCase()} в ${day.startTime}`, isToday: false };
                }
            }
        }

        // Otherwise next week's first session
        const firstDayNextWeek = weekSchedule.find(d => d.isTrainingDay);
        if (firstDayNextWeek) {
            return {
                day: firstDayNextWeek,
                label: firstDayNextWeek.dayFull,
                relative: `В след. ${firstDayNextWeek.dayFull.toLowerCase()} в ${firstDayNextWeek.startTime}`,
                isToday: false
            };
        }

        return null;
    }, [weekSchedule, currentDayIndex]);

    // Handle Quick Absence notification
    const handleSubmitAbsence = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingAbsence(true);
        try {
            const childName = childProfile?.childName || childProfile?.displayName || 'Воспитанник';
            const reasonLabels: Record<string, string> = {
                sick: 'Болезнь (по справке)',
                vacation: 'Отпуск / Отъезд',
                family: 'Семейные обстоятельства',
                other: 'Другая причина'
            };

            await addDoc(collection(db, 'requests'), {
                type: 'absence_notification',
                title: `Пропуск тренировки: ${childName}`,
                childId: childProfile?.id || childProfile?.uid,
                childName,
                parentId: parentUser?.uid || childProfile?.parentId || '',
                parentName: parentUser?.displayName || parentUser?.parentName || 'Родитель',
                parentPhone: parentUser?.phone || parentUser?.parentPhone || childProfile?.parentPhone || '',
                groupId: childProfile?.groupId || groupData?.id || '',
                groupName: childProfile?.groupName || groupData?.name || '',
                coachName: childProfile?.coachName || groupData?.coachName || '',
                date: absenceDate || new Date().toISOString().split('T')[0],
                reason: reasonLabels[absenceReason] || absenceReason,
                comment: absenceComment.trim(),
                status: 'pending',
                createdAt: serverTimestamp()
            });

            setAbsenceSuccessMsg('Тренер и администратор уведомлены о пропуске!');
            setTimeout(() => {
                setAbsenceSuccessMsg('');
                setIsAbsenceModalOpen(false);
                setAbsenceComment('');
            }, 2500);
        } catch (error) {
            console.error('Error sending absence report:', error);
            alert('Ошибка при отправке. Пожалуйста, попробуйте снова.');
        } finally {
            setIsSendingAbsence(false);
        }
    };

    const handleCopyAddress = () => {
        navigator.clipboard.writeText('г. Иваново, Спортивный Центр SPARTA, ул. Ленина');
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2500);
    };

    // Find any active override for the current displayed week
    const activeWeekOverride = useMemo(() => {
        return weekSchedule.find(d => d.override)?.override;
    }, [weekSchedule]);

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header & Next Workout Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center border border-sparta-gold/40 shadow-md">
                            <CalendarIcon size={18} />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">
                            Расписание тренировок
                        </h3>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                        График группы: <strong className="text-white uppercase">
                            {resolveSpartaCoachAndGroup(groupData?.name || childProfile?.groupName, childProfile?.coachName, childProfile?.birthYear, childProfile?.childAge).groupName}
                        </strong>
                    </p>
                </div>

                {/* Next Workout Hero Badge */}
                {nextSession && (
                    <div className="bg-gradient-to-r from-sparta-gold/25 via-yellow-500/15 to-transparent border border-sparta-gold/50 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-sparta-gold/10">
                        <div className="w-10 h-10 rounded-xl bg-sparta-gold text-black flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <span className="text-[10px] font-black uppercase text-sparta-gold tracking-widest">
                                    Ближайшая тренировка
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm font-russo text-white uppercase">
                                {nextSession.relative}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Active Schedule Alert / Force Majeure Banner */}
            {activeWeekOverride && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 sm:p-5 rounded-3xl border flex items-start gap-4 shadow-xl ${
                        activeWeekOverride.status === 'cancelled'
                            ? 'bg-gradient-to-r from-red-500/20 via-red-950/40 to-black border-red-500/40 text-red-200'
                            : activeWeekOverride.status === 'rescheduled'
                            ? 'bg-gradient-to-r from-amber-500/20 via-amber-950/40 to-black border-amber-500/40 text-amber-200'
                            : 'bg-gradient-to-r from-blue-500/20 via-blue-950/40 to-black border-blue-500/40 text-blue-200'
                    }`}
                >
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
                        activeWeekOverride.status === 'cancelled'
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : activeWeekOverride.status === 'rescheduled'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                    }`}>
                        <ShieldAlert size={22} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10">
                                {activeWeekOverride.status === 'cancelled' ? '⚠️ Отмена тренировки' : activeWeekOverride.status === 'rescheduled' ? '⏰ Перенос времени' : '🔄 Замена тренера'}
                            </span>
                            <span className="text-xs text-white/60 font-semibold">{activeWeekOverride.date}</span>
                        </div>
                        <p className="text-sm font-russo text-white uppercase tracking-wide">
                            {activeWeekOverride.title}: {activeWeekOverride.reason}
                        </p>
                        <p className="text-xs text-white/70">
                            {activeWeekOverride.status === 'cancelled'
                                ? 'Занятие сохранено на балансе абонемента (срок продлен автоматически).'
                                : activeWeekOverride.status === 'rescheduled'
                                ? `Новое время тренировки: ${activeWeekOverride.newTime}.`
                                : `Занятие проведет тренер ${activeWeekOverride.replacementCoach}.`}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* 7-DAY WEEKLY SCHEDULE CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                {weekSchedule.map((day) => {
                    const isTraining = day.isTrainingDay;
                    const isToday = day.isToday;
                    const hasOverride = !!day.override;

                    return (
                        <div
                            key={day.dayShort}
                            className={`relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-300 flex flex-col justify-between min-h-[140px] sm:min-h-[155px] ${
                                hasOverride && day.override?.status === 'cancelled'
                                    ? 'bg-gradient-to-b from-red-500/20 via-red-950/20 to-black border-red-500/50 shadow-lg shadow-red-500/10'
                                    : hasOverride && day.override?.status === 'rescheduled'
                                    ? 'bg-gradient-to-b from-amber-500/20 via-amber-950/20 to-black border-amber-500/50 shadow-lg shadow-amber-500/10'
                                    : hasOverride && day.override?.status === 'replacement'
                                    ? 'bg-gradient-to-b from-blue-500/20 via-blue-950/20 to-black border-blue-500/50 shadow-lg shadow-blue-500/10'
                                    : isTraining
                                    ? isToday
                                        ? 'bg-gradient-to-b from-sparta-gold/25 via-[#1a1708] to-[#121214] border-sparta-gold shadow-lg shadow-sparta-gold/15 scale-[1.02] ring-1 ring-sparta-gold/50'
                                        : 'bg-gradient-to-b from-white/10 via-[#18181b] to-black border-sparta-gold/30 hover:border-sparta-gold/60'
                                    : isToday
                                        ? 'bg-white/5 border-white/20 ring-1 ring-white/30 opacity-75'
                                        : 'bg-black/30 border-white/5 opacity-50 hover:opacity-75'
                            }`}
                        >
                            {/* Day Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-base sm:text-lg font-russo uppercase ${
                                        hasOverride && day.override?.status === 'cancelled'
                                            ? 'text-red-400 font-bold'
                                            : isTraining
                                            ? (isToday ? 'text-sparta-gold font-extrabold' : 'text-white')
                                            : 'text-white/60'
                                    }`}>
                                        {day.dayShort}
                                    </span>
                                    <span className="text-[10px] text-white/40 hidden sm:inline">
                                        {day.dayFull.slice(0, 3)}
                                    </span>
                                </div>

                                {isToday && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-sparta-gold text-black font-black text-[9px] uppercase tracking-wider shadow-sm animate-pulse">
                                        Сегодня
                                    </span>
                                )}
                            </div>

                            {/* Center Status */}
                            <div className="my-2">
                                {day.override ? (
                                    <div className="space-y-1">
                                        {day.override.status === 'cancelled' ? (
                                            <div>
                                                <span className="px-2 py-1 rounded-lg bg-red-500/25 border border-red-500/50 text-red-300 font-bold text-[10px] uppercase block text-center">
                                                    🚫 Отменена
                                                </span>
                                                <p className="text-[9px] text-red-200/70 truncate mt-1 text-center" title={day.override.reason}>
                                                    {day.override.reason}
                                                </p>
                                            </div>
                                        ) : day.override.status === 'rescheduled' ? (
                                            <div>
                                                <span className="px-2 py-1 rounded-lg bg-amber-500/25 border border-amber-500/50 text-amber-300 font-bold text-[10px] uppercase block text-center">
                                                    ⏰ {day.override.newTime}
                                                </span>
                                                <p className="text-[9px] text-amber-200/70 truncate mt-1 text-center">
                                                    {day.override.reason}
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="px-2 py-1 rounded-lg bg-blue-500/25 border border-blue-500/50 text-blue-300 font-bold text-[10px] uppercase block text-center">
                                                    🔄 Замена
                                                </span>
                                                <p className="text-[9px] text-blue-200/70 truncate mt-1 text-center">
                                                    {day.override.replacementCoach?.split(' ')[0]}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : isTraining ? (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-sparta-gold">
                                            <Clock size={13} className="shrink-0" />
                                            <span className="text-xs sm:text-sm font-russo text-white tracking-tight">
                                                {day.timeRange}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-white/60">
                                            <span className="w-1.5 h-1.5 rounded-full bg-sparta-gold shrink-0" />
                                            <span className="truncate font-semibold">60 минут</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5 text-center py-2">
                                        <span className="text-lg opacity-40">🛌</span>
                                        <p className="text-[10px] uppercase font-bold text-white/30 tracking-wider">
                                            Отдых
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer */}
                            <div className="pt-2 border-t border-white/5 text-[10px]">
                                {day.override && day.override.status === 'cancelled' ? (
                                    <span className="text-emerald-400 font-semibold text-[9px] block text-center">
                                        ✓ Баланс сохранен
                                    </span>
                                ) : isTraining ? (
                                    <div className="flex items-center justify-between text-sparta-gold/80 font-bold">
                                        <span className="truncate">{day.coachName.split(' ')[0]}</span>
                                        <span className="text-[9px] bg-sparta-gold/15 text-sparta-gold px-1.5 py-0.2 rounded border border-sparta-gold/30">
                                            Зал 1
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-white/20 text-[9px] block text-center">
                                        Восстановление
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* QUICK ACTIONS & LOCATION BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* 1. Absence Report Button */}
                <button
                    onClick={() => {
                        setAbsenceDate(new Date().toISOString().split('T')[0]);
                        setIsAbsenceModalOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/25 hover:border-red-500/50 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-red-400 block">
                                Не сможем прийти?
                            </span>
                            <span className="text-xs sm:text-sm font-russo text-white uppercase group-hover:text-red-300 transition-colors">
                                Предупредить о пропуске
                            </span>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-white/20 group-hover:text-red-400 transition-colors" />
                </button>

                {/* 2. Hall Location & Navigation */}
                <button
                    onClick={handleCopyAddress}
                    className="p-4 rounded-2xl bg-gradient-to-r from-sparta-gold/10 via-yellow-500/5 to-transparent border border-sparta-gold/25 hover:border-sparta-gold/50 transition-all flex items-center justify-between text-left group cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0 border border-sparta-gold/30">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-black tracking-wider text-sparta-gold block">
                                {copiedAddress ? 'Адрес скопирован!' : 'Место занятий'}
                            </span>
                            <span className="text-xs sm:text-sm font-russo text-white uppercase group-hover:text-sparta-gold transition-colors truncate block max-w-[180px]">
                                Манеж Sparta • ул. Российская, 36
                            </span>
                        </div>
                    </div>
                    <Navigation size={18} className="text-white/20 group-hover:text-sparta-gold transition-colors" />
                </button>

                {/* 3. Coach Direct Contact Info */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 text-white/80 flex items-center justify-center shrink-0">
                            <User size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-white/40 block">
                                Тренер группы
                            </span>
                            <span className="text-xs sm:text-sm font-russo text-white uppercase truncate block max-w-[170px]">
                                {resolveSpartaCoachAndGroup(groupData?.name || childProfile?.groupName, childProfile?.coachName || groupData?.coachName, childProfile?.birthYear, childProfile?.childAge).coachName}
                            </span>
                        </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30">
                        В зале
                    </span>
                </div>
            </div>

            {/* ABSENCE NOTIFICATION MODAL */}
            <AnimatePresence>
                {isAbsenceModalOpen && (
                    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAbsenceModalOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.93, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.93, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#141417] border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-russo text-white uppercase">
                                            Предупредить о пропуске
                                        </h3>
                                        <p className="text-[11px] text-white/50">
                                            {childProfile?.childName || 'Воспитанник'} • {childProfile?.groupName || 'Группа'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAbsenceModalOpen(false)}
                                    className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {absenceSuccessMsg ? (
                                <div className="py-8 text-center space-y-3">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h4 className="text-lg font-russo text-white uppercase">
                                        Спасибо, принято!
                                    </h4>
                                    <p className="text-xs text-white/60">
                                        {absenceSuccessMsg}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmitAbsence} className="space-y-4">
                                    {/* Date of missed session */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                            Дата тренировки
                                        </label>
                                        <input
                                            type="date"
                                            value={absenceDate}
                                            onChange={(e) => setAbsenceDate(e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:border-red-500/50 outline-none transition-colors"
                                        />
                                    </div>

                                    {/* Reason */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-white/50 block mb-1.5">
                                            Причина пропуска
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'sick', label: '🤒 Болезнь' },
                                                { id: 'vacation', label: '✈️ Отпуск / Отъезд' },
                                                { id: 'family', label: '🏡 По семейным' },
                                                { id: 'other', label: '✏️ Другое' }
                                            ].map(r => (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => setAbsenceReason(r.id as any)}
                                                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                                                        absenceReason === r.id
                                                            ? 'bg-red-500/20 border-red-500/50 text-white'
                                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                                    }`}
                                                >
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Additional note */}
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                            Комментарий для тренера (необязательно)
                                        </label>
                                        <textarea
                                            value={absenceComment}
                                            onChange={(e) => setAbsenceComment(e.target.value)}
                                            rows={2}
                                            placeholder="Например: вернемся в понедельник со справкой..."
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-red-500/50 outline-none transition-colors resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsAbsenceModalOpen(false)}
                                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs uppercase transition-colors cursor-pointer"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSendingAbsence}
                                            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-russo text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isSendingAbsence ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={14} />
                                                    <span>Отправить</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
