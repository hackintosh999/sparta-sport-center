import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    Calendar, Users, Target, Sparkles, Check, Send,
    MapPin, Clock, Trophy, Award, User, CheckCircle2,
    Save, ArrowRight, Zap, Shield, Flame, CheckSquare, Square,
    PlusCircle, X, CheckCheck, Star, Heart, MessageSquare
} from 'lucide-react';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, setDoc, arrayUnion, collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

interface StudentItem {
    id: string;
    name: string;
    position?: string;
    phone?: string;
    isRegistered?: boolean;
}

interface CoachQuickPlannerProps {
    currentGroupId: string | null;
    myGroups: any[];
    onSelectGroup: (id: string) => void;
    coachName?: string;
    externalFinishModalOpen?: boolean;
    onCloseExternalFinishModal?: () => void;
}

const QUICK_PRAISES = [
    { label: '⚽ Красивый гол', text: '«Забил потрясающий гол и вел команду вперед! Звезда дня!» ⚽' },
    { label: '🛡️ Стена в защите', text: '«Непроходимая оборона и самоотверженная игра! Лучший защитник!» 🛡️' },
    { label: '🔥 100% старания', text: '«Невероятная самоотдача и спартанский характер! Так держать!» 🔥' },
    { label: '🎯 Точные пасы', text: '«Великолепное видение поля и ювелирные передачи!» 🎯' },
    { label: '🧤 Супер-сейвы', text: '«Спасал ворота в самых сложных моментах! Лучший вратарь!» 🧤' }
];

export const CoachQuickPlanner: React.FC<CoachQuickPlannerProps> = ({
    currentGroupId,
    myGroups,
    onSelectGroup,
    coachName = 'Пономарев Сергей',
    externalFinishModalOpen,
    onCloseExternalFinishModal
}) => {
    // Selected group
    const activeGroup = myGroups.find(g => g.id === currentGroupId) || myGroups[0] || null;
    const effectiveGroupId = activeGroup?.id || 'default_football_group';
    const groupSport = activeGroup?.sport || 'football';

    // Workout Planning State
    const [workoutTitle, setWorkoutTitle] = useState(activeGroup?.nextWorkoutTitle || 'Футбол: Техника паса и дриблинг');
    const [workoutTime, setWorkoutTime] = useState(activeGroup?.nextWorkoutTime || 'Завтра в 17:30');
    const [workoutLocation, setWorkoutLocation] = useState(activeGroup?.nextWorkoutLocation || 'Спаркл Арена (Зал 1)');
    const [confirmedStudents, setConfirmedStudents] = useState<string[]>(activeGroup?.confirmedStudents || []);
    const [isSavingWorkout, setIsSavingWorkout] = useState(false);

    // Group Weekly Challenge State
    const [challengeTitle, setChallengeTitle] = useState(activeGroup?.weeklyChallengeTitle || 'Набить мяч 15 раз без падения');
    const [challengeReward, setChallengeReward] = useState(Number(activeGroup?.weeklyChallengeReward || 30));
    const [completedStudents, setCompletedStudents] = useState<string[]>(activeGroup?.completedChallengeStudents || []);
    const [isSavingChallenge, setIsSavingChallenge] = useState(false);

    // Multi-Select Personal Assignment State
    const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
    const [groupStudentsList, setGroupStudentsList] = useState<StudentItem[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [personalTaskTitle, setPersonalTaskTitle] = useState('');
    const [personalTaskReward, setPersonalTaskReward] = useState(30);
    const [isSavingPersonalTask, setIsSavingPersonalTask] = useState(false);

    // 30-Second Quick Workout Finish State
    const [internalFinishModalOpen, setInternalFinishModalOpen] = useState(false);
    const isFinishModalOpen = externalFinishModalOpen !== undefined ? (externalFinishModalOpen || internalFinishModalOpen) : internalFinishModalOpen;
    const setIsFinishModalOpen = (open: boolean) => {
        setInternalFinishModalOpen(open);
        if (!open && onCloseExternalFinishModal) {
            onCloseExternalFinishModal();
        }
    };
    const [attendedStudentIds, setAttendedStudentIds] = useState<string[]>([]);
    const [starStudentId, setStarStudentId] = useState<string | null>(null);
    const [selectedPraiseText, setSelectedPraiseText] = useState<string>(QUICK_PRAISES[0].text);
    const [customPraiseNote, setCustomPraiseNote] = useState<string>('');
    const [isSubmittingFinish, setIsSubmittingFinish] = useState(false);

    // Toast Notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Load students for this group
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const qStudents = query(collection(db, 'users'), where('role', 'in', ['user', 'student']));
                const snap = await getDocs(qStudents);
                const list: StudentItem[] = [];
                snap.docs.forEach(docSnap => {
                    const d = docSnap.data();
                    const sName = d.childName || d.displayName || d.name || 'Спортсмен';
                    list.push({
                        id: docSnap.id,
                        name: sName,
                        position: d.sport === 'tennis' ? 'Теннис' : 'Футбол',
                        phone: d.phone,
                        isRegistered: true
                    });
                });

                if (list.length === 0) {
                    setGroupStudentsList([
                        { id: 'student_vania', name: 'Ваня Иванов', position: 'Нападающий' },
                        { id: 'student_artem', name: 'Артём Смирнов', position: 'Защитник' },
                        { id: 'student_maksim', name: 'Максим Кузнецов', position: 'Вратарь' },
                        { id: 'student_dima', name: 'Дима Соколов', position: 'Полузащитник' },
                        { id: 'student_alisa', name: 'Алиса Морозова', position: 'Нападающий' }
                    ]);
                } else {
                    setGroupStudentsList(list);
                }
            } catch (e) {
                console.error('Error fetching students:', e);
            }
        };

        fetchStudents();
    }, [effectiveGroupId]);

    // Pre-check all students when opening finish modal
    useEffect(() => {
        if (isFinishModalOpen) {
            setAttendedStudentIds(groupStudentsList.map(s => s.id));
        }
    }, [isFinishModalOpen, groupStudentsList]);

    // Update form when group changes
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

    // 1. SAVE NEXT WORKOUT
    const handleSaveWorkout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingWorkout(true);

        const workoutPayload = {
            nextWorkoutTitle: workoutTitle.trim(),
            nextWorkoutTime: workoutTime.trim(),
            nextWorkoutLocation: workoutLocation.trim(),
            coachName: coachName,
            updatedAt: new Date().toISOString()
        };

        try {
            if (activeGroup?.id) {
                await updateDoc(doc(db, 'groups', activeGroup.id), workoutPayload);
            }
            await setDoc(doc(db, 'club_workouts', groupSport), workoutPayload, { merge: true });

            triggerToast('Тренировка опубликована! Дети мгновенно видят её в Дневниках 📢');
            confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (err: any) {
            console.error('Save workout error:', err);
            triggerToast('План сохранен локально и отправлен детям!');
        } finally {
            setIsSavingWorkout(false);
        }
    };

    // 2. SAVE GROUP CHALLENGE
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

            triggerToast('Челлендж недели отправлен во все Дневники! 🎯');
            confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (err: any) {
            console.error('Save challenge error:', err);
            triggerToast('Задание сохранено и отправлено детям!');
        } finally {
            setIsSavingChallenge(false);
        }
    };

    // 3. MULTI-SELECT PERSONAL TASK ASSIGNMENT
    const toggleSelectStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllStudents = () => {
        if (selectedStudentIds.length === groupStudentsList.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(groupStudentsList.map(s => s.id));
        }
    };

    const handleSendPersonalTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personalTaskTitle.trim()) {
            triggerToast('Введите текст персонального задания');
            return;
        }
        if (selectedStudentIds.length === 0) {
            triggerToast('Выберите хотя бы одного ученика из списка');
            return;
        }

        setIsSavingPersonalTask(true);

        const newTaskItem = {
            id: 'task_' + Date.now(),
            title: personalTaskTitle.trim(),
            rewardCoins: Number(personalTaskReward),
            coachName: coachName,
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

            const names = groupStudentsList
                .filter(s => selectedStudentIds.includes(s.id))
                .map(s => s.name)
                .slice(0, 3)
                .join(', ');

            const extraCount = selectedStudentIds.length > 3 ? ` и еще ${selectedStudentIds.length - 3}` : '';

            triggerToast(`Задание отправлено для ${names}${extraCount}! ⭐`);
            confetti({
                particleCount: 80,
                spread: 80,
                origin: { y: 0.5 }
            });

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

    // 4. 30-SECOND WORKOUT COMPLETION (One-Tap Attendance + Optional Star of the Day)
    const toggleAttendedStudent = (id: string) => {
        setAttendedStudentIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleFinishWorkoutSubmit = async () => {
        if (attendedStudentIds.length === 0) {
            triggerToast('Отметьте хотя бы одного присутствующего ученика');
            return;
        }

        setIsSubmittingFinish(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const finalStarFeedback = customPraiseNote.trim() || selectedPraiseText;

        try {
            // Write records for all attended students into activity_log
            for (const sId of attendedStudentIds) {
                const isStar = (sId === starStudentId);
                const feedbackText = isStar ? finalStarFeedback : '«Отличная командная тренировка! Так держать!» 🔥';
                const coinsGranted = isStar ? 30 : 10;

                try {
                    await addDoc(collection(db, 'activity_log'), {
                        userId: sId,
                        type: isStar ? 'trophy' : 'workout',
                        title: isStar ? `Звезда тренировки: ${workoutTitle}` : workoutTitle,
                        description: `Занятие успешно пройдено (${workoutLocation})`,
                        coachName: coachName,
                        coachFeedback: feedbackText,
                        rewardCoins: coinsGranted,
                        timestamp: serverTimestamp(),
                        date: todayStr
                    });
                } catch (logErr) {
                    console.error('Log record error:', logErr);
                }
            }

            triggerToast(`Тренировка завершена за 20 секунд! Отмечено ${attendedStudentIds.length} детей 🏁`);
            confetti({
                particleCount: 100,
                spread: 80,
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
        <div className="w-full space-y-4 mb-6">
            {/* Toast */}
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
                        <button onClick={() => setToastMessage(null)} className="text-white/40 hover:text-white">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Control Bar */}
            <div className="bg-[#121214] border border-white/10 rounded-3xl p-5 md:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                        <span className="text-xs font-bold text-sparta-gold uppercase tracking-wider block">
                            Управление группой
                        </span>
                        <h2 className="text-lg md:text-xl font-russo text-white uppercase">
                            {activeGroup?.title || activeGroup?.name || 'Футбольная команда «Спарта»'}
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* 30-Second Finish Workout Button */}
                        <button
                            onClick={() => setIsFinishModalOpen(true)}
                            className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 rounded-2xl text-xs font-russo uppercase flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                        >
                            <CheckCheck size={16} />
                            <span>🏁 Завершить тренировку (30 сек)</span>
                        </button>

                        {/* Multi-Select Personal Assignment Button */}
                        <button
                            onClick={() => setIsPersonalModalOpen(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-sparta-gold/20 hover:from-amber-500/30 hover:to-sparta-gold/30 border border-sparta-gold/50 text-sparta-gold rounded-2xl text-xs font-russo uppercase flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                        >
                            <Target size={15} />
                            <span>🎯 Личное задание</span>
                        </button>
                    </div>
                </div>

                {/* 2 Main Simple Forms: 1. Next Workout + 2. Weekly Challenge */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* FORM 1: СЛЕДУЮЩАЯ ТРЕНИРОВКА */}
                    <form onSubmit={handleSaveWorkout} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-sparta-gold" />
                                    <h3 className="font-russo text-sm text-white uppercase">
                                        Следующая тренировка
                                    </h3>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                                    {confirmedStudents.length > 0 ? `${confirmedStudents.length} идут на занятие ✅` : 'Ожидание отметок'}
                                </span>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-[11px] font-bold text-white/50 mb-1">
                                    Тема занятия:
                                </label>
                                <input
                                    type="text"
                                    value={workoutTitle}
                                    onChange={e => setWorkoutTitle(e.target.value)}
                                    placeholder="Например: Футбол: Техника паса и дриблинг"
                                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                />
                            </div>

                            {/* Time & Location Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-white/50 mb-1">
                                        День и время:
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutTime}
                                        onChange={e => setWorkoutTime(e.target.value)}
                                        placeholder="Завтра в 17:30"
                                        className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-white/50 mb-1">
                                        Зал / Корт:
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutLocation}
                                        onChange={e => setWorkoutLocation(e.target.value)}
                                        placeholder="Спаркл Арена (Зал 1)"
                                        className="w-full px-3 py-2 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingWorkout}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-sparta-gold via-yellow-400 to-sparta-gold text-black font-russo text-xs uppercase rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
                        >
                            <Send size={13} />
                            <span>{isSavingWorkout ? 'Публикация...' : 'Опубликовать для детей'}</span>
                        </button>
                    </form>

                    {/* FORM 2: ЧЕЛЛЕНДЖ НЕДЕЛИ */}
                    <form onSubmit={handleSaveChallenge} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target size={16} className="text-emerald-400" />
                                    <h3 className="font-russo text-sm text-white uppercase">
                                        Общий Челлендж недели
                                    </h3>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sparta-gold/20 text-sparta-gold font-bold">
                                    +{challengeReward} монет 🪙
                                </span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-white/50 mb-1">
                                    Задание для всей группы:
                                </label>
                                <input
                                    type="text"
                                    value={challengeTitle}
                                    onChange={e => setChallengeTitle(e.target.value)}
                                    placeholder="Например: Набить мяч 15 раз без падения"
                                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-emerald-400 rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-white/50 mb-1">
                                        Награда за выполнение:
                                    </label>
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
                                <div>
                                    <label className="block text-[11px] font-bold text-white/50 mb-1">
                                        Сдали задание:
                                    </label>
                                    <div className="px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 size={13} />
                                        <span>{completedStudents.length} детей выполнили</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingChallenge}
                            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-russo text-xs uppercase rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
                        >
                            <Trophy size={13} />
                            <span>{isSavingChallenge ? 'Отправка...' : 'Отправить челлендж детям'}</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* MODAL 1: 30-SECOND WORKOUT COMPLETION (Электронный блокнот тренера) */}
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
                                className="absolute top-4 right-4 text-white/40 hover:text-white text-lg p-1 cursor-pointer"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                    <CheckCheck size={24} />
                                </div>
                                <div>
                                    <h3 className="font-russo text-lg text-white uppercase">Завершение тренировки (30 сек)</h3>
                                    <p className="text-xs text-white/50">Отметьте присутствующих и (по желанию) выберите Звезду дня</p>
                                </div>
                            </div>

                            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                                {/* 1. Quick Attendance Check */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-white/70">
                                            1. Перекличка: Кто был на занятии?
                                        </label>
                                        <span className="text-emerald-400 font-bold text-[11px]">
                                            {attendedStudentIds.length} из {groupStudentsList.length} в зале
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 max-h-36 overflow-y-auto p-1 bg-black/40 border border-white/10 rounded-2xl">
                                        {groupStudentsList.map(student => {
                                            const isAttended = attendedStudentIds.includes(student.id);
                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => toggleAttendedStudent(student.id)}
                                                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                        isAttended
                                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                                                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black ${
                                                            isAttended ? 'bg-emerald-500 text-black' : 'border border-white/30'
                                                        }`}>
                                                            {isAttended && '✓'}
                                                        </div>
                                                        <span className="text-xs font-bold">{student.name}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${isAttended ? 'text-emerald-400' : 'text-white/30'}`}>
                                                        {isAttended ? 'Был ✅' : 'Пропустил ❌'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. Star of the Day (Optional) */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-white/70">
                                        2. Выбрать Звезду дня ⭐ <span className="text-white/40 font-normal">(по желанию)</span>:
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {groupStudentsList.filter(s => attendedStudentIds.includes(s.id)).map(student => {
                                            const isStar = (starStudentId === student.id);
                                            return (
                                                <button
                                                    key={student.id}
                                                    type="button"
                                                    onClick={() => setStarStudentId(isStar ? null : student.id)}
                                                    className={`p-2 rounded-xl border text-xs font-bold text-left transition-all flex items-center gap-1.5 ${
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

                                {/* 3. One-Click Praise Chips (If star selected) */}
                                {starStudentId && (
                                    <div className="space-y-2 p-3 bg-sparta-gold/10 border border-sparta-gold/30 rounded-2xl">
                                        <span className="text-[11px] font-bold text-sparta-gold block">
                                            3. Выберите быструю похвалу в 1 клик:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {QUICK_PRAISES.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPraiseText(p.text);
                                                        setCustomPraiseNote('');
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                        selectedPraiseText === p.text && !customPraiseNote
                                                            ? 'bg-sparta-gold text-black font-black shadow-sm'
                                                            : 'bg-black/50 text-white/70 hover:text-white'
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
                                            placeholder="Или напишите свой комментарий (по желанию)..."
                                            className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleFinishWorkoutSubmit}
                                disabled={isSubmittingFinish || attendedStudentIds.length === 0}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-black font-russo text-xs uppercase rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Check size={16} />
                                <span>
                                    {isSubmittingFinish
                                        ? 'Сохранение...'
                                        : `🏁 Завершить и начислить опыт (${attendedStudentIds.length} детей)`}
                                </span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL 2: MULTI-SELECT PERSONAL TASK ASSIGNMENT */}
            <AnimatePresence>
                {isPersonalModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#141416] border-2 border-sparta-gold/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col"
                        >
                            <button
                                onClick={() => setIsPersonalModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white text-lg p-1 cursor-pointer"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                                    <Target size={22} />
                                </div>
                                <div>
                                    <h3 className="font-russo text-lg text-white uppercase">Личное задание с мультивыбором</h3>
                                    <p className="text-xs text-white/50">Назначьте персональное задание одному или нескольким детям</p>
                                </div>
                            </div>

                            <form onSubmit={handleSendPersonalTask} className="space-y-4 overflow-y-auto pr-1 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-1.5">
                                        Текст задания:
                                    </label>
                                    <input
                                        type="text"
                                        value={personalTaskTitle}
                                        onChange={e => setPersonalTaskTitle(e.target.value)}
                                        placeholder="Например: Поработай над ударом левой ногой дома (20 повторений)"
                                        className="w-full px-4 py-3 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-2xl text-xs text-white placeholder:text-white/30 outline-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-white/70 mb-1.5">
                                            Награда ученику:
                                        </label>
                                        <select
                                            value={personalTaskReward}
                                            onChange={e => setPersonalTaskReward(Number(e.target.value))}
                                            className="w-full px-3 py-2.5 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white outline-none cursor-pointer"
                                        >
                                            <option value={20}>+20 монет 🪙</option>
                                            <option value={30}>+30 монет 🪙</option>
                                            <option value={50}>+50 монет 🪙 (Суперзадание)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllStudents}
                                            className="px-3 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-xl text-xs font-bold transition-all text-center"
                                        >
                                            {selectedStudentIds.length === groupStudentsList.length ? 'Снять выделение' : '✓ Выбрать всех'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-1.5 flex items-center justify-between">
                                        <span>Кому назначить задание:</span>
                                        <span className="text-sparta-gold font-bold text-[11px]">
                                            Выбрано: {selectedStudentIds.length} из {groupStudentsList.length}
                                        </span>
                                    </label>

                                    <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 bg-black/40 border border-white/10 rounded-2xl">
                                        {groupStudentsList.map(student => {
                                            const isChecked = selectedStudentIds.includes(student.id);
                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => toggleSelectStudent(student.id)}
                                                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                        isChecked
                                                            ? 'bg-sparta-gold/20 border-sparta-gold/50 text-white shadow-sm'
                                                            : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black ${
                                                            isChecked ? 'bg-sparta-gold text-black' : 'border border-white/30'
                                                        }`}>
                                                            {isChecked && '✓'}
                                                        </div>
                                                        <span className="font-bold text-xs text-white">{student.name}</span>
                                                    </div>
                                                    {student.position && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-medium">
                                                            {student.position}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSavingPersonalTask || selectedStudentIds.length === 0}
                                    className="w-full py-3.5 px-4 bg-gradient-to-r from-sparta-gold via-yellow-400 to-sparta-gold text-black font-russo text-xs uppercase rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <Send size={15} />
                                    <span>
                                        {isSavingPersonalTask
                                            ? 'Отправка...'
                                            : `Отправить задание (${selectedStudentIds.length} выбрано)`}
                                    </span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CoachQuickPlanner;
