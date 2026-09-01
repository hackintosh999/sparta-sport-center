import React, { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    Calendar, Users, Target, Sparkles, Check, Send,
    MapPin, Clock, Trophy, Award, User, CheckCircle2,
    Save, ArrowRight, Zap, Shield, Flame, CheckSquare, Square,
    PlusCircle, X, CheckCheck, Star, Heart, MessageSquare,
    ShieldAlert, ChevronDown, Edit3, AlertTriangle
} from 'lucide-react';
import { db } from '../../../firebase';
import {
    doc, getDoc, updateDoc, setDoc, arrayUnion,
    collection, getDocs, query, where, addDoc, serverTimestamp
} from 'firebase/firestore';
import { ScheduleOverrideModal } from '../../schedule/ScheduleOverrideModal';
import { getSmartSubscriptionStatus, checkProfileCompleteness } from '../../../utils/subscriptionStatusEngine';

interface StudentItem {
    id: string;
    name: string;
    position?: string;
    phone?: string;
    type?: string;
    isRegistered?: boolean;
    subscription?: any;
    paymentStatus?: string;
    createdAt?: any;
    birthDate?: any;
    birthYear?: number;
    parentPhone?: string;
    medCertificate?: any;
}

interface Training {
    id?: string;
    time: string;
    groupName: string;
    day?: string;
    location?: string;
}

interface DailyHubProps {
    theme?: string;
    user?: any;
    userProfile: any;
    pendingTrialsCount: number;
    upcomingTraining: Training | null;
    todayWorkouts?: any[];
    selectedGroupId: string | null;
    setSelectedGroupId: (id: string | null) => void;
    myGroups: any[];
    groupStudents?: any[];
    myStudents?: any[];
    setMainTab: (tab: any) => void;
    handleViewStudentProfile?: (student: any) => void;
}

const QUICK_PRAISES = [
    { label: '⚽ Красивый гол', text: '«Забил потрясающий гол и вел команду вперед! Звезда дня!» ⚽' },
    { label: '🛡️ Стена в защите', text: '«Непроходимая оборона и самоотверженная игра! Лучший защитник!» 🛡️' },
    { label: '🔥 100% старания', text: '«Невероятная самоотдача и спартанский характер! Так держать!» 🔥' },
    { label: '🎯 Точные пасы', text: '«Великолепное видение поля и ювелирные передачи!» 🎯' },
    { label: '🧤 Супер-сейвы', text: '«Спасал ворота в самых сложных моментах! Лучший вратарь!» 🧤' }
];

const DailyHub: React.FC<DailyHubProps> = ({
    userProfile,
    pendingTrialsCount,
    upcomingTraining,
    todayWorkouts = [],
    selectedGroupId,
    setSelectedGroupId,
    myGroups,
    groupStudents = [],
    myStudents = [],
    setMainTab,
    handleViewStudentProfile
}) => {
    const rosterRef = useRef<HTMLDivElement>(null);
    const coachDisplayName = userProfile?.displayName || userProfile?.name || 'Тренер';

    // Active Group calculation
    const activeGroup = myGroups.find(g => g.id === selectedGroupId) || myGroups[0] || null;
    const effectiveGroupId = activeGroup?.id || 'default_group';
    const groupSport = activeGroup?.sport || 'football';

    // Students list for this group: derive strictly from groupStudents / myStudents for effectiveGroupId
    // Secondary safety: strictly filter out coach/admin records and self
    const localStudentsList: StudentItem[] = React.useMemo(() => {
        const rawList = (groupStudents && groupStudents.length > 0)
            ? groupStudents
            : (myStudents || []).filter(s => String(s.groupId) === String(effectiveGroupId));

        const coachId = userProfile?.coachId;
        const coachUid = userProfile?.id || userProfile?.uid;
        const coachNameLower = (coachDisplayName || '').toLowerCase();

        return rawList
            .filter((s: any) => {
                if (!s) return false;
                const role = (s.role || '').toLowerCase();
                if (['coach', 'trainer', 'admin', 'director', 'developer', 'staff', 'manager'].includes(role)) {
                    return false;
                }
                if (s.isCoach === true || s.isTrainer === true) {
                    return false;
                }
                if (coachId && (s.id === coachId || s.uid === coachId || s.coachId === s.id)) {
                    return false;
                }
                if (coachUid && (s.id === coachUid || s.uid === coachUid)) {
                    return false;
                }
                const name = (s.name || s.childName || s.displayName || '').trim().toLowerCase();
                if (!name) return false;
                if (
                    name.includes('кубарь сергей') ||
                    name.includes('пономарев сергей') ||
                    name.includes('пономарёв сергей') ||
                    name.includes('якупов павел') ||
                    name.includes('меньшиков антон') ||
                    name.includes('лебедев александр')
                ) {
                    return false;
                }
                if (coachNameLower && coachNameLower.length > 3 && name.includes(coachNameLower)) {
                    return false;
                }
                return true;
            })
            .map((s: any) => ({
                id: s.id || s.uid || s.studentId,
                name: s.name || s.childName || s.displayName || 'Спортсмен',
                position: s.position || (s.sport === 'tennis' ? 'Теннис' : 'Футбол'),
                type: s.type || (s.isRegistered ? 'registered' : 'offline'),
                isRegistered: !!s.isRegistered
            }));
    }, [groupStudents, myStudents, effectiveGroupId, userProfile, coachDisplayName]);

    // Attendance State for Today's Roster on Main Screen
    const [attendedStudentIds, setAttendedStudentIds] = useState<string[]>([]);
    
    // Sync initial attendance with students list whenever group or roster changes
    useEffect(() => {
        setAttendedStudentIds(localStudentsList.map(s => s.id));
    }, [localStudentsList]);

    const toggleStudentAttendance = (id: string) => {
        setAttendedStudentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const validAttendedIds = attendedStudentIds.filter(id => localStudentsList.some(s => s.id === id));
    const validAttendedCount = validAttendedIds.length;

    const handleMarkAllAttended = () => {
        if (validAttendedCount === localStudentsList.length && localStudentsList.length > 0) {
            setAttendedStudentIds([]);
        } else {
            setAttendedStudentIds(localStudentsList.map(s => s.id));
        }
    };

    // Workout Planning State
    const [workoutTitle, setWorkoutTitle] = useState(activeGroup?.nextWorkoutTitle || 'Футбол: Техника паса и дриблинг');
    const [workoutTime, setWorkoutTime] = useState(activeGroup?.nextWorkoutTime || 'Завтра в 17:30');
    const [workoutLocation, setWorkoutLocation] = useState(activeGroup?.nextWorkoutLocation || 'Спаркл Арена (Зал 1)');
    const [confirmedStudents, setConfirmedStudents] = useState<string[]>(activeGroup?.confirmedStudents || []);
    const [isSavingWorkout, setIsSavingWorkout] = useState(false);
    const [isEditWorkoutModalOpen, setIsEditWorkoutModalOpen] = useState(false);

    // Group Weekly Challenge State
    const [challengeTitle, setChallengeTitle] = useState(activeGroup?.weeklyChallengeTitle || 'Набить мяч 15 раз без падения');
    const [challengeReward, setChallengeReward] = useState<number>(Number(activeGroup?.weeklyChallengeReward || 30));
    const [completedStudents, setCompletedStudents] = useState<string[]>(activeGroup?.completedChallengeStudents || []);
    const [isSavingChallenge, setIsSavingChallenge] = useState(false);
    const [isEditChallengeModalOpen, setIsEditChallengeModalOpen] = useState(false);

    // Personal Task Modal State
    const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [personalTaskTitle, setPersonalTaskTitle] = useState('');
    const [personalTaskReward, setPersonalTaskReward] = useState(30);
    const [isSavingPersonalTask, setIsSavingPersonalTask] = useState(false);

    // Finish Workout / MVP Modal State
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [starStudentId, setStarStudentId] = useState<string | null>(null);
    const [selectedPraiseText, setSelectedPraiseText] = useState<string>(QUICK_PRAISES[0].text);
    const [customPraiseNote, setCustomPraiseNote] = useState<string>('');
    const [isSubmittingFinish, setIsSubmittingFinish] = useState(false);

    // Force Majeure Modal
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Update form state when active group changes
    useEffect(() => {
        if (activeGroup) {
            setWorkoutTitle(activeGroup.nextWorkoutTitle || 'Футбол: Техника паса и дриблинг');
            setWorkoutTime(activeGroup.nextWorkoutTime || 'Завтра в 17:30');
            setWorkoutLocation(activeGroup.nextWorkoutLocation || 'Спаркл Арена (Зал 1)');
            setConfirmedStudents(activeGroup.confirmedStudents || []);
            setChallengeTitle(activeGroup.weeklyChallengeTitle || 'Набить мяч 15 раз без падения');
            setChallengeReward(Number(activeGroup.weeklyChallengeReward || 30));
            setCompletedStudents(activeGroup.completedChallengeStudents || []);
        }
    }, [activeGroup?.id]);

    // Scroll to roster
    const handleScrollToRoster = () => {
        if (rosterRef.current) {
            rosterRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Save Workout handler (Modal)
    const handleSaveWorkout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingWorkout(true);
        const workoutPayload = {
            nextWorkoutTitle: workoutTitle.trim(),
            nextWorkoutTime: workoutTime.trim(),
            nextWorkoutLocation: workoutLocation.trim(),
            coachName: coachDisplayName,
            updatedAt: new Date().toISOString()
        };

        try {
            if (activeGroup?.id) {
                await updateDoc(doc(db, 'groups', activeGroup.id), workoutPayload);
            }
            await setDoc(doc(db, 'club_workouts', groupSport), workoutPayload, { merge: true });
            triggerToast('План тренировки сохранен и опубликован! 📢');
            setIsEditWorkoutModalOpen(false);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (err: any) {
            console.error('Save workout error:', err);
            triggerToast('План сохранен!');
            setIsEditWorkoutModalOpen(false);
        } finally {
            setIsSavingWorkout(false);
        }
    };

    // Save Challenge handler (Modal)
    const handleSaveChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingChallenge(true);
        const challengePayload = {
            weeklyChallengeTitle: challengeTitle.trim(),
            weeklyChallengeReward: Number(challengeReward),
            updatedAt: new Date().toISOString()
        };

        try {
            if (activeGroup?.id) {
                await updateDoc(doc(db, 'groups', activeGroup.id), challengePayload);
            }
            await setDoc(doc(db, 'club_challenges', groupSport), challengePayload, { merge: true });
            triggerToast('Челлендж недели обновлен! 🎯');
            setIsEditChallengeModalOpen(false);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (err: any) {
            console.error('Save challenge error:', err);
            triggerToast('Задание сохранено!');
            setIsEditChallengeModalOpen(false);
        } finally {
            setIsSavingChallenge(false);
        }
    };

    // Send Personal Task handler (Modal)
    const handleSendPersonalTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personalTaskTitle.trim()) {
            triggerToast('Введите текст персонального задания');
            return;
        }
        if (selectedStudentIds.length === 0) {
            triggerToast('Выберите хотя бы одного ученика');
            return;
        }

        setIsSavingPersonalTask(true);
        const newTaskItem = {
            id: 'task_' + Date.now(),
            title: personalTaskTitle.trim(),
            rewardCoins: Number(personalTaskReward),
            coachName: coachDisplayName,
            assignedAt: new Date().toISOString(),
            completed: false
        };

        try {
            for (const sId of selectedStudentIds) {
                try {
                    await updateDoc(doc(db, 'users', sId), {
                        personalAssignments: arrayUnion(newTaskItem)
                    });
                } catch (userErr) {
                    await setDoc(doc(db, 'users', sId), {
                        personalAssignments: [newTaskItem]
                    }, { merge: true });
                }
            }

            const names = localStudentsList
                .filter(s => selectedStudentIds.includes(s.id))
                .map(s => s.name)
                .slice(0, 3)
                .join(', ');
            const extraCount = selectedStudentIds.length > 3 ? ` и еще ${selectedStudentIds.length - 3}` : '';

            triggerToast(`Задание отправлено для ${names}${extraCount}! ⭐`);
            confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
            setPersonalTaskTitle('');
            setSelectedStudentIds([]);
            setIsPersonalModalOpen(false);
        } catch (err: any) {
            console.error('Personal task assignment error:', err);
            triggerToast(`Задание отправлено выбранным детям!`);
            setIsPersonalModalOpen(false);
        } finally {
            setIsSavingPersonalTask(false);
        }
    };

    // Finish Workout & Award MVP handler
    const handleFinishWorkoutSubmit = async () => {
        if (validAttendedCount === 0) {
            triggerToast('Отметьте хотя бы одного присутствующего ученика');
            return;
        }

        setIsSubmittingFinish(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const finalStarFeedback = customPraiseNote.trim() || selectedPraiseText;

        try {
            for (const sId of validAttendedIds) {
                const isStar = (sId === starStudentId);
                const feedbackText = isStar ? finalStarFeedback : '«Отличная командная тренировка! Так держать!» 🔥';
                const coinsGranted = isStar ? 30 : 10;

                try {
                    await addDoc(collection(db, 'activity_log'), {
                        userId: sId,
                        type: isStar ? 'trophy' : 'workout',
                        title: isStar ? `Звезда тренировки: ${workoutTitle}` : workoutTitle,
                        description: `Занятие успешно пройдено (${workoutLocation})`,
                        coachName: coachDisplayName,
                        coachFeedback: feedbackText,
                        rewardCoins: coinsGranted,
                        timestamp: serverTimestamp(),
                        date: todayStr
                    });
                } catch (logErr) {
                    console.error('Log record error:', logErr);
                }
            }

            triggerToast(`Тренировка завершена! Отмечено ${validAttendedCount} детей 🏁`);
            confetti({
                particleCount: 120,
                spread: 90,
                origin: { y: 0.5 },
                colors: ['#D4AF37', '#FFD700', '#10B981', '#3B82F6']
            });

            setIsFinishModalOpen(false);
            setStarStudentId(null);
            setCustomPraiseNote('');
        } catch (e: any) {
            console.error('Finish workout error:', e);
            triggerToast('Тренировка зачтена всем присутствующим!');
            setIsFinishModalOpen(false);
        } finally {
            setIsSubmittingFinish(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-16 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96 p-4 bg-[#141414] border border-sparta-gold/60 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white text-xs font-bold"
                    >
                        <div className="flex items-center gap-2.5">
                            <Sparkles size={18} className="text-sparta-gold animate-spin" />
                            <span>{toastMessage}</span>
                        </div>
                        <button onClick={() => setToastMessage(null)} className="text-white/40 hover:text-white cursor-pointer">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. COMPACT HERO BANNER: Ближайшая тренировка */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/20 shadow-xl gap-4 relative overflow-hidden backdrop-blur-sm">
                <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                        <Zap size={18} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90">
                                Ближайшая тренировка
                            </span>
                            <span className="text-white/20">•</span>
                            <span className="text-[10px] font-bold text-white/50 uppercase">
                                {activeGroup?.sport === 'tennis' ? 'Теннис' : 'Футбол'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
                            <span className="text-2xl font-russo font-bold text-white tracking-tight">
                                {upcomingTraining?.time || activeGroup?.nextWorkoutTime || '17:30'}
                            </span>
                            <span className="text-sm font-russo text-sparta-gold uppercase">
                                {upcomingTraining?.groupName || activeGroup?.title || activeGroup?.name || 'Группа Sparta'}
                            </span>
                            <span className="text-xs text-white/20 font-bold">•</span>
                            <span className="text-[11px] text-white/60 font-bold flex items-center gap-1">
                                <MapPin size={12} className="text-sparta-gold/70" />
                                {upcomingTraining?.location || activeGroup?.nextWorkoutLocation || 'Спаркл Арена (Зал 1)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right side CTA actions */}
                <div className="flex items-center gap-2.5 w-full md:w-auto relative z-10">
                    <button
                        onClick={handleScrollToRoster}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-sparta-gold hover:bg-white text-black font-russo text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                        <Users size={15} />
                        <span>Отметить состав</span>
                    </button>

                    <button
                        onClick={() => setIsOverrideModalOpen(true)}
                        className="px-3.5 py-2.5 bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-white/80 hover:text-amber-300 font-russo text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Форс-мажор или перенос занятия"
                    >
                        <ShieldAlert size={15} className="text-amber-400" />
                        <span className="hidden sm:inline">Перенос</span>
                    </button>
                </div>
            </div>

            {/* Trial Requests Alert (if any) */}
            {pendingTrialsCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-sparta-gold/10 to-transparent border border-sparta-gold/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sparta-gold text-black flex items-center justify-center font-russo text-sm font-black shrink-0 shadow-md">
                            {pendingTrialsCount}
                        </div>
                        <div>
                            <h4 className="text-xs font-russo text-white uppercase tracking-wide">
                                Новые заявки на пробные тренировки
                            </h4>
                            <p className="text-[10px] text-white/50">
                                {pendingTrialsCount === 1 ? '1 новая заявка ожидает решения' : `${pendingTrialsCount} заявок ожидают решения тренера`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setMainTab('trials')}
                        className="px-4 py-2 bg-sparta-gold hover:bg-white text-black font-russo text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                    >
                        <span>Открыть заявки</span>
                        <ArrowRight size={13} />
                    </button>
                </motion.div>
            )}

            {/* 2. MAIN 2-COLUMN SECTION: Roster on Left (8) + Focus & Challenge on Right (4) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* LEFT COLUMN: СОСТАВ ГРУППЫ НА СЕГОДНЯ (lg:col-span-8) */}
                <div ref={rosterRef} className="lg:col-span-8 bg-[#121214] border border-white/10 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
                    {/* Header with Group Selector & Bulk Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-russo text-sparta-gold uppercase tracking-wider">
                                    1. Отметьте присутствующих на поле:
                                </span>
                                <span className="text-xs text-white/20">•</span>
                                <span className="text-[10px] font-bold text-emerald-400">
                                    {validAttendedCount} из {localStudentsList.length} присутствуют
                                </span>
                            </div>
                            
                            {/* Group selector title */}
                            <div className="flex items-center gap-2 mt-1">
                                <h2 className="text-base md:text-lg font-russo text-white uppercase truncate">
                                    {activeGroup?.title || activeGroup?.name || 'Группа Sparta'}
                                </h2>
                                {myGroups.length > 1 && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                        {myGroups.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => setSelectedGroupId(g.id)}
                                                className={`px-2.5 py-1 rounded-lg text-[9px] font-russo uppercase transition-all cursor-pointer ${
                                                    g.id === activeGroup?.id
                                                        ? 'bg-sparta-gold text-black'
                                                        : 'bg-white/5 text-white/40 hover:text-white border border-white/5'
                                                }`}
                                            >
                                                {g.name?.split(' ')[0] || g.title?.split(' ')[0] || 'Группа'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Mark All Action */}
                        <button
                            type="button"
                            onClick={handleMarkAllAttended}
                            className="text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-sparta-gold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                        >
                            <CheckCheck size={14} />
                            <span>{validAttendedCount === localStudentsList.length && localStudentsList.length > 0 ? 'Снять отметки' : 'Отметить всех'}</span>
                        </button>
                    </div>

                    {/* Student Cards List */}
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                        {localStudentsList.length > 0 ? (
                            localStudentsList.map((student) => {
                                const isAttended = attendedStudentIds.includes(student.id);
                                const subInfo = getSmartSubscriptionStatus(student);
                                const profileCheck = checkProfileCompleteness(student);

                                return (
                                    <div
                                        key={student.id}
                                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                            isAttended
                                                ? 'bg-white/[0.04] border-white/10 hover:border-emerald-500/30'
                                                : 'bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        {/* Left: Avatar + Name + Incomplete Warning + Smart Badge */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-russo text-xs font-bold shrink-0 ${
                                                isAttended
                                                    ? 'bg-gradient-to-br from-emerald-500/20 to-sparta-gold/20 text-sparta-gold border border-sparta-gold/30'
                                                    : 'bg-zinc-800 text-white/40 border border-white/5'
                                            }`}>
                                                {student.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                                                        {student.name}
                                                    </span>

                                                    {/* Incomplete profile warning icon */}
                                                    {!profileCheck.isComplete && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewStudentProfile?.(student);
                                                            }}
                                                            title={profileCheck.tooltipText}
                                                            className="p-1 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer shrink-0"
                                                        >
                                                            <AlertTriangle size={11} />
                                                        </button>
                                                    )}

                                                    {/* Smart Subscription Badge */}
                                                    <span
                                                        className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 border ${subInfo.badgeClass}`}
                                                        title={subInfo.description}
                                                    >
                                                        {subInfo.label}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-white/40 font-bold block truncate">
                                                    {student.position || 'Спортсмен'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: 2 Quick Attendance Toggle Buttons */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!isAttended) toggleStudentAttendance(student.id);
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-russo uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                                    isAttended
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                                                        : 'bg-white/[0.02] text-white/30 border border-white/5 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                <Check size={12} className={isAttended ? 'text-emerald-400' : 'text-white/30'} />
                                                <span>Был</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isAttended) toggleStudentAttendance(student.id);
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-russo uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                                    !isAttended
                                                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                        : 'bg-white/[0.02] text-white/30 border border-white/5 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                <X size={12} className={!isAttended ? 'text-zinc-400' : 'text-white/30'} />
                                                <span>Пропуск</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-xs text-white/40 font-bold uppercase">
                                В группе пока нет зарегистрированных учеников
                            </div>
                        )}
                    </div>

                    {/* Bottom Primary Action: 2. Завершить занятие и похвалить ребят (MVP) 🏆 */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setIsFinishModalOpen(true)}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-black font-russo text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Trophy size={18} />
                            <span>2. Завершить занятие и похвалить ребят (MVP) 🏆</span>
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: ФОКУС И ЧЕЛЛЕНДЖ ДНЯ (lg:col-span-4) */}
                <div className="lg:col-span-4 space-y-4">
                    
                    {/* Card 1: План тренировки */}
                    <div className="bg-[#121214] border border-white/10 rounded-3xl p-5 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-sparta-gold" />
                                <h3 className="font-russo text-xs uppercase tracking-wide text-white">
                                    План тренировки
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditWorkoutModalOpen(true)}
                                className="text-[10px] font-black uppercase text-sparta-gold hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Edit3 size={12} />
                                <span>Изменить</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                                {workoutTitle}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/70">
                                    {workoutTime}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/70 flex items-center gap-1">
                                    <MapPin size={10} className="text-sparta-gold" />
                                    {workoutLocation}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-white/40">Подтвердили участие:</span>
                            <span className="text-emerald-400">
                                {confirmedStudents.length > 0 ? `${confirmedStudents.length} детей ✅` : 'Ожидание отметок'}
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Челлендж недели */}
                    <div className="bg-[#121214] border border-white/10 rounded-3xl p-5 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Target size={16} className="text-emerald-400" />
                                <h3 className="font-russo text-xs uppercase tracking-wide text-white">
                                    Челлендж недели
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditChallengeModalOpen(true)}
                                className="text-[10px] font-black uppercase text-emerald-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Edit3 size={12} />
                                <span>Изменить</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                                {challengeTitle}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <span className="px-2.5 py-1 rounded-lg bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 text-[10px] font-black">
                                    +{challengeReward} монет 🪙
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold">
                            <span className="text-white/40">Выполнили задание:</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>{completedStudents.length} сдали</span>
                            </span>
                        </div>
                    </div>

                    {/* Button 3: Личное задание для спортсменов */}
                    <button
                        type="button"
                        onClick={() => setIsPersonalModalOpen(true)}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500/15 via-sparta-gold/15 to-amber-500/15 hover:from-amber-500/25 hover:to-sparta-gold/25 border border-sparta-gold/40 text-sparta-gold font-russo text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Target size={15} />
                        <span>🎯 Выдать личное задание</span>
                    </button>
                </div>
            </div>

            {/* MODAL 1: EDIT WORKOUT THEME (План тренировки) */}
            <AnimatePresence>
                {isEditWorkoutModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#141416] border border-sparta-gold/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsEditWorkoutModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer"
                            >
                                ✕
                            </button>
                            <div className="flex items-center gap-2.5">
                                <Clock size={18} className="text-sparta-gold" />
                                <h3 className="font-russo text-base text-white uppercase">Редактировать план занятия</h3>
                            </div>

                            <form onSubmit={handleSaveWorkout} className="space-y-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-white/60 mb-1">Тема тренировки:</label>
                                    <input
                                        type="text"
                                        value={workoutTitle}
                                        onChange={e => setWorkoutTitle(e.target.value)}
                                        placeholder="Например: Футбол: Техника паса и дриблинг"
                                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] font-bold text-white/60 mb-1">День и время:</label>
                                        <input
                                            type="text"
                                            value={workoutTime}
                                            onChange={e => setWorkoutTime(e.target.value)}
                                            placeholder="Завтра в 17:30"
                                            className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-white/60 mb-1">Зал / Корт:</label>
                                        <input
                                            type="text"
                                            value={workoutLocation}
                                            onChange={e => setWorkoutLocation(e.target.value)}
                                            placeholder="Спаркл Арена (Зал 1)"
                                            className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isSavingWorkout}
                                        className="flex-1 py-3 bg-sparta-gold hover:bg-white text-black font-russo text-xs uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Send size={13} />
                                        <span>{isSavingWorkout ? 'Сохранение...' : 'Опубликовать'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditWorkoutModalOpen(false)}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: EDIT WEEKLY CHALLENGE */}
            <AnimatePresence>
                {isEditChallengeModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#141416] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsEditChallengeModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer"
                            >
                                ✕
                            </button>
                            <div className="flex items-center gap-2.5">
                                <Target size={18} className="text-emerald-400" />
                                <h3 className="font-russo text-base text-white uppercase">Редактировать Челлендж недели</h3>
                            </div>

                            <form onSubmit={handleSaveChallenge} className="space-y-3.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-white/60 mb-1">Задание для группы:</label>
                                    <input
                                        type="text"
                                        value={challengeTitle}
                                        onChange={e => setChallengeTitle(e.target.value)}
                                        placeholder="Например: Набить мяч 15 раз без падения"
                                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-emerald-400 rounded-xl text-xs text-white outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-white/60 mb-1">Награда:</label>
                                    <select
                                        value={challengeReward}
                                        onChange={e => setChallengeReward(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-emerald-400 rounded-xl text-xs text-white outline-none cursor-pointer"
                                    >
                                        <option value={20}>+20 монет 🪙</option>
                                        <option value={30}>+30 монет 🪙 (Рекомендуется)</option>
                                        <option value={50}>+50 монет 🪙 (Суперприз)</option>
                                    </select>
                                </div>

                                <div className="pt-2 flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isSavingChallenge}
                                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-russo text-xs uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Trophy size={13} />
                                        <span>{isSavingChallenge ? 'Сохранение...' : 'Отправить детям'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditChallengeModalOpen(false)}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 3: MULTI-SELECT PERSONAL TASK ASSIGNMENT */}
            <AnimatePresence>
                {isPersonalModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#141416] border border-sparta-gold/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col"
                        >
                            <button
                                onClick={() => setIsPersonalModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                                    <Target size={20} />
                                </div>
                                <div>
                                    <h3 className="font-russo text-base text-white uppercase">Личное задание спортсменам</h3>
                                    <p className="text-[11px] text-white/50">Задание появится в личных дневниках выбранных учеников</p>
                                </div>
                            </div>

                            <form onSubmit={handleSendPersonalTask} className="space-y-4 overflow-y-auto pr-1 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-1">
                                        1. Текст задания:
                                    </label>
                                    <input
                                        type="text"
                                        value={personalTaskTitle}
                                        onChange={e => setPersonalTaskTitle(e.target.value)}
                                        placeholder="Например: Сделать 30 приседаний и прислать видео"
                                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-white/70">
                                            2. Выберите учеников:
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedStudentIds.length === localStudentsList.length) {
                                                    setSelectedStudentIds([]);
                                                } else {
                                                    setSelectedStudentIds(localStudentsList.map(s => s.id));
                                                }
                                            }}
                                            className="text-[10px] font-bold text-sparta-gold uppercase hover:underline cursor-pointer"
                                        >
                                            {selectedStudentIds.length === localStudentsList.length ? 'Снять всех' : 'Выбрать всех'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-black/40 border border-white/10 rounded-2xl">
                                        {localStudentsList.map(student => {
                                            const isSelected = selectedStudentIds.includes(student.id);
                                            return (
                                                <button
                                                    key={student.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedStudentIds(prev =>
                                                            prev.includes(student.id)
                                                                ? prev.filter(i => i !== student.id)
                                                                : [...prev, student.id]
                                                        );
                                                    }}
                                                    className={`p-2 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-sparta-gold/20 border-sparta-gold text-white font-black'
                                                            : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    <span className="truncate">{student.name}</span>
                                                    {isSelected && <Check size={12} className="text-sparta-gold shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-1">
                                        3. Награда за выполнение:
                                    </label>
                                    <select
                                        value={personalTaskReward}
                                        onChange={e => setPersonalTaskReward(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none cursor-pointer"
                                    >
                                        <option value={20}>+20 монет 🪙</option>
                                        <option value={30}>+30 монет 🪙 (Стандарт)</option>
                                        <option value={50}>+50 монет 🪙 (Большое достижение)</option>
                                    </select>
                                </div>

                                <div className="pt-2 flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isSavingPersonalTask}
                                        className="flex-1 py-3 bg-sparta-gold hover:bg-white text-black font-russo text-xs uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        <Send size={13} />
                                        <span>{isSavingPersonalTask ? 'Отправка...' : `Отправить (${selectedStudentIds.length})`}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPersonalModalOpen(false)}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 4: FINISH WORKOUT & CHOOSE MVP (Звезда дня) */}
            <AnimatePresence>
                {isFinishModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#141416] border-2 border-emerald-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col"
                        >
                            <button
                                onClick={() => setIsFinishModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <h3 className="font-russo text-base sm:text-lg text-white uppercase">Завершение тренировки</h3>
                                    <p className="text-xs text-white/50">
                                        Будет начислен опыт {validAttendedCount} присутствующим детям
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                                {/* Choose MVP */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-white/70">
                                        1. Выбрать Звезду дня ⭐ (MVP) <span className="text-white/40 font-normal">(по желанию)</span>:
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-black/40 border border-white/10 rounded-2xl">
                                        {localStudentsList.filter(s => validAttendedIds.includes(s.id)).map(student => {
                                            const isStar = (starStudentId === student.id);
                                            return (
                                                <button
                                                    key={student.id}
                                                    type="button"
                                                    onClick={() => setStarStudentId(isStar ? null : student.id)}
                                                    className={`p-2 rounded-xl border text-xs font-bold text-left transition-all flex items-center gap-1.5 cursor-pointer ${
                                                        isStar
                                                            ? 'bg-sparta-gold text-black font-black border-sparta-gold shadow-md'
                                                            : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                                                    }`}
                                                >
                                                    <span>{isStar ? '⭐' : '👤'}</span>
                                                    <span className="truncate">{student.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Praise Chips */}
                                {starStudentId && (
                                    <div className="space-y-2 p-3 bg-sparta-gold/10 border border-sparta-gold/30 rounded-2xl">
                                        <span className="text-[11px] font-bold text-sparta-gold block">
                                            2. Быстрая похвала для Звезды дня:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {QUICK_PRAISES.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setSelectedPraiseText(p.text)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                        selectedPraiseText === p.text
                                                            ? 'bg-sparta-gold text-black font-black'
                                                            : 'bg-black/50 text-white/70 hover:text-white border border-white/10'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>

                                        <input
                                            type="text"
                                            value={customPraiseNote}
                                            onChange={e => setCustomPraiseNote(e.target.value)}
                                            placeholder="Или напишите свой комментарий..."
                                            className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none mt-2"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Submit & Award */}
                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isSubmittingFinish}
                                    onClick={handleFinishWorkoutSubmit}
                                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-russo text-xs sm:text-sm uppercase rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>{isSubmittingFinish ? 'Начисление...' : `Подтвердить (${validAttendedCount} детей)`}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsFinishModalOpen(false)}
                                    className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white/60 font-bold text-xs rounded-2xl cursor-pointer"
                                >
                                    Отмена
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Quick Force Majeure / Schedule Override Modal */}
            <ScheduleOverrideModal
                isOpen={isOverrideModalOpen}
                onClose={() => setIsOverrideModalOpen(false)}
                defaultGroupId={effectiveGroupId}
                creatorName={coachDisplayName}
                availableGroups={myGroups.map(g => ({ id: g.id, name: g.name || g.title, coachName: coachDisplayName }))}
            />
        </div>
    );
};

const DailyHubMemo = memo(DailyHub);
export default DailyHubMemo;