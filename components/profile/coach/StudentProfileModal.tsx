import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Phone,
    MessageSquare,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Save,
    Loader2,
    Sparkles
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getSmartSubscriptionStatus, checkProfileCompleteness } from '../../../utils/subscriptionStatusEngine';
import { BaseModal } from '../../ui/BaseModal';

interface StudentProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    attendanceStats?: { rate: number; present?: number; total?: number };
    onContactParent: (student: any) => void;
    onTogglePayment?: (studentId: string, currentStatus: string) => Promise<void>;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
    isOpen,
    onClose,
    student,
    attendanceStats,
    onContactParent,
    onTogglePayment
}) => {
    const [liveStudent, setLiveStudent] = useState<any>(student);
    const [liveParent, setLiveParent] = useState<any>(null);
    const [coachNotes, setCoachNotes] = useState<string>('');
    const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
    const [noteSaveStatus, setNoteSaveStatus] = useState<'idle' | 'saved'>('idle');

    // Skills Interactive State & Floating Feedback
    const [skillsState, setSkillsState] = useState<Record<string, number>>({
        technique: 75,
        speed: 80,
        power: 70
    });
    const [floatingFeedback, setFloatingFeedback] = useState<Record<string, { id: number; text: string } | null>>({});

    // 1. Real-time Firestore sync for student and parent documents
    useEffect(() => {
        if (!student || !isOpen) return;

        setLiveStudent(student);
        setCoachNotes(student.notes || student.coachNotes || student.originalUser?.notes || '');
        setNoteSaveStatus('idle');

        if (student.skills) {
            setSkillsState({
                technique: student.skills.technique ?? 75,
                speed: student.skills.speed ?? 80,
                power: student.skills.power ?? student.skills.strength ?? 70
            });
        }

        const studentId = student.id || student.uid || student.studentId;
        if (!studentId) return;

        // Listen to student document
        const unsubStudent = onSnapshot(doc(db, 'students', studentId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveStudent((prev: any) => ({
                    ...prev,
                    ...data,
                    id: snap.id
                }));
                if (data.notes !== undefined) {
                    setCoachNotes(data.notes);
                }
                if (data.skills) {
                    setSkillsState({
                        technique: data.skills.technique ?? 75,
                        speed: data.skills.speed ?? 80,
                        power: data.skills.power ?? data.skills.strength ?? 70
                    });
                }
            } else {
                // Try listening in 'users' collection if not in 'students'
                const unsubUser = onSnapshot(doc(db, 'users', studentId), (userSnap) => {
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        setLiveStudent((prev: any) => ({
                            ...prev,
                            ...uData,
                            id: userSnap.id
                        }));
                        if (uData.notes !== undefined) {
                            setCoachNotes(uData.notes);
                        }
                        if (uData.skills) {
                            setSkillsState({
                                technique: uData.skills.technique ?? 75,
                                speed: uData.skills.speed ?? 80,
                                power: uData.skills.power ?? uData.skills.strength ?? 70
                            });
                        }
                    }
                });
                return () => unsubUser();
            }
        });

        // Listen to parent document if parentId exists
        let unsubParent = () => {};
        const pId = student.parentId || student.parentUid || student.originalUser?.parentId;
        if (pId) {
            unsubParent = onSnapshot(doc(db, 'users', pId), (snap) => {
                if (snap.exists()) {
                    setLiveParent(snap.data());
                }
            });
        }

        return () => {
            unsubStudent();
            unsubParent();
        };
    }, [student, isOpen]);

    if (!liveStudent) return null;

    // Computed values
    const subBadge = getSmartSubscriptionStatus(liveStudent);
    const profileCompleteness = checkProfileCompleteness(liveStudent);

    const parentDisplayName = liveParent?.displayName ||
        liveParent?.parentName ||
        liveParent?.name ||
        liveStudent.parentName ||
        liveStudent.originalUser?.parentName ||
        'Родитель';

    const rawParentPhone = liveParent?.phone ||
        liveStudent.parentPhone ||
        liveStudent.phone ||
        liveStudent.originalUser?.parentPhone ||
        liveStudent.originalUser?.phone ||
        '';

    const cleanParentPhone = String(rawParentPhone).replace(/[^\d+]/g, '');

    const birthInfo = liveStudent.birthYear
        ? `${liveStudent.birthYear} г.р.`
        : liveStudent.birthDate
            ? `${liveStudent.birthDate}`
            : liveStudent.age
                ? `${liveStudent.age} лет`
                : 'Возраст не указан';

    const sportLabel = liveStudent.sport === 'tennis' ? 'Большой теннис' : 'Футбол';
    const groupName = liveStudent.groupName || liveStudent.groupTitle || 'Основная группа';

    // Attendance stats
    const attendanceRate = attendanceStats?.rate !== undefined
        ? attendanceStats.rate
        : (typeof liveStudent.attendanceRate === 'number' ? liveStudent.attendanceRate : 85);

    const presentCount = attendanceStats?.present || 0;
    const totalSessions = attendanceStats?.total || 0;

    // Gaming stats
    const spartaCoins = liveStudent.coins ?? liveStudent.balance ?? liveStudent.spartaCoins ?? liveStudent.originalUser?.coins ?? 150;
    const totalXp = liveStudent.xp ?? liveStudent.originalUser?.xp ?? 420;

    // Badges
    const badges = Array.isArray(liveStudent.badges) && liveStudent.badges.length > 0
        ? liveStudent.badges
        : [
            { id: '1', name: 'Первые шаги', icon: '⚡' },
            { id: '2', name: 'Снайпер', icon: '🎯' },
            { id: '3', name: 'Дисциплина', icon: '🛡️' }
        ];

    // Medical certificate status
    const hasMed = profileCompleteness.hasMedCertificate;

    // Interactive Skill Mutation Handlers
    const handleSkillChange = async (skillKey: string, delta: number) => {
        const currentVal = skillsState[skillKey] ?? 60;
        const newVal = Math.max(0, Math.min(100, currentVal + delta));
        if (newVal === currentVal) return;

        const updatedSkills = {
            ...skillsState,
            [skillKey]: newVal
        };
        setSkillsState(updatedSkills);

        if (delta > 0) {
            const feedbackId = Date.now();
            setFloatingFeedback(prev => ({
                ...prev,
                [skillKey]: { id: feedbackId, text: '+10 XP ⭐' }
            }));
            setTimeout(() => {
                setFloatingFeedback(prev => (prev[skillKey]?.id === feedbackId ? { ...prev, [skillKey]: null } : prev));
            }, 1100);
        }

        const studentId = liveStudent.id || liveStudent.uid || liveStudent.studentId;
        if (studentId) {
            try {
                const updatePayload: any = {
                    skills: updatedSkills,
                    updatedAt: new Date().toISOString()
                };
                if (delta > 0) {
                    updatePayload.xp = (liveStudent.xp || 0) + 10;
                }
                try {
                    await updateDoc(doc(db, 'students', studentId), updatePayload);
                } catch {
                    await setDoc(doc(db, 'users', studentId), updatePayload, { merge: true });
                }
            } catch (err) {
                console.error('Error updating skill in Firestore:', err);
            }
        }
    };

    const handleSetSkillSegment = async (skillKey: string, segmentIndex: number) => {
        const targetVal = segmentIndex * 20;
        const currentVal = skillsState[skillKey] ?? 60;
        const delta = targetVal - currentVal;
        if (targetVal === currentVal) return;

        const updatedSkills = {
            ...skillsState,
            [skillKey]: targetVal
        };
        setSkillsState(updatedSkills);

        if (delta > 0) {
            const feedbackId = Date.now();
            setFloatingFeedback(prev => ({
                ...prev,
                [skillKey]: { id: feedbackId, text: '+10 XP ⭐' }
            }));
            setTimeout(() => {
                setFloatingFeedback(prev => (prev[skillKey]?.id === feedbackId ? { ...prev, [skillKey]: null } : prev));
            }, 1100);
        }

        const studentId = liveStudent.id || liveStudent.uid || liveStudent.studentId;
        if (studentId) {
            try {
                const updatePayload: any = {
                    skills: updatedSkills,
                    updatedAt: new Date().toISOString()
                };
                if (delta > 0) {
                    updatePayload.xp = (liveStudent.xp || 0) + 10;
                }
                try {
                    await updateDoc(doc(db, 'students', studentId), updatePayload);
                } catch {
                    await setDoc(doc(db, 'users', studentId), updatePayload, { merge: true });
                }
            } catch (err) {
                console.error('Error updating skill segment in Firestore:', err);
            }
        }
    };

    // Save Coach Notes
    const handleSaveCoachNotes = async () => {
        const studentId = liveStudent.id || liveStudent.uid || liveStudent.studentId;
        if (!studentId) return;

        setIsSavingNotes(true);
        try {
            try {
                await updateDoc(doc(db, 'students', studentId), {
                    notes: coachNotes,
                    updatedAt: new Date().toISOString()
                });
            } catch {
                await setDoc(doc(db, 'users', studentId), {
                    notes: coachNotes,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
            setNoteSaveStatus('saved');
            setTimeout(() => setNoteSaveStatus('idle'), 2500);
        } catch (err) {
            console.error('Error saving coach notes:', err);
        } finally {
            setIsSavingNotes(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            glowColor="amber"
            zIndex="z-[250]"
        >
            <div className="space-y-6 text-left">
                {/* HEADER: Left (Athlete) + Right (Parent Contacts) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/10 pr-10">
                    {/* Athlete Info */}
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-br from-amber-500/20 via-sparta-gold/20 to-amber-500/20 border-2 border-sparta-gold/40 text-sparta-gold font-russo text-xl sm:text-2xl font-bold flex items-center justify-center shrink-0 shadow-lg shadow-sparta-gold/10">
                            {liveStudent.name ? liveStudent.name.slice(0, 2).toUpperCase() : 'СП'}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-tight truncate">
                                {liveStudent.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-bold text-white/60">
                                    {birthInfo}
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-sparta-gold uppercase tracking-wider">
                                    {groupName}
                                </span>
                                <span className="text-[10px] text-white/40 font-medium">
                                    {sportLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Parent Contact Card */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shrink-0 min-w-[210px]">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <User size={13} className="text-sparta-gold shrink-0" />
                                <span className="text-xs font-bold text-white truncate">{parentDisplayName}</span>
                            </div>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Родитель</span>
                        </div>

                        {cleanParentPhone ? (
                            <a
                                href={`tel:${cleanParentPhone}`}
                                className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-sparta-gold transition-colors"
                            >
                                <Phone size={12} className="text-sparta-gold" />
                                <span>{rawParentPhone}</span>
                            </a>
                        ) : (
                            <span className="text-xs text-amber-400/80 font-medium flex items-center gap-1.5">
                                <AlertTriangle size={12} />
                                <span>Телефон не указан</span>
                            </span>
                        )}

                        {/* Contact Parent CTA Button */}
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onContactParent(liveStudent);
                            }}
                            className="mt-1 w-full py-2.5 px-3 bg-sparta-gold hover:bg-yellow-400 active:scale-95 text-black rounded-xl text-[11px] font-russo uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sparta-gold/20 cursor-pointer"
                        >
                            <MessageSquare size={13} />
                            <span>Чат с родителем</span>
                        </button>
                    </div>
                </div>

                {/* SECTION 1: STATUSES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Subscription Status Card */}
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Статус абонемента</span>
                            <button
                                type="button"
                                onClick={() => onTogglePayment?.(liveStudent.id, liveStudent.paymentStatus || 'due')}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer ${subBadge.badgeClass}`}
                                title="Нажмите для смены статуса"
                            >
                                {subBadge.label}
                            </button>
                        </div>
                        <p className="text-xs text-white/70 font-medium">
                            {subBadge.description}
                        </p>
                        {liveStudent.remainingSessions !== undefined && (
                            <div className="text-[11px] text-white/50 font-bold flex items-center gap-1.5">
                                <Clock size={11} className="text-sparta-gold" />
                                <span>Остаток занятий: <strong className="text-white">{liveStudent.remainingSessions}</strong></span>
                            </div>
                        )}
                    </div>

                    {/* Medical Certificate Card */}
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Медицинский допуск</span>
                            {hasMed ? (
                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <ShieldCheck size={11} />
                                    <span>Справка есть</span>
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    <span>Нет справки</span>
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-white/70 font-medium">
                            {hasMed
                                ? 'Действующая медсправка загружена и подтверждена'
                                : 'Требуется предоставить медицинскую справку о допуске'}
                        </p>
                    </div>
                </div>

                {/* SECTION 2: GAMING STATS */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/5 via-sparta-gold/5 to-transparent border border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-russo text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} className="text-sparta-gold" />
                            <span>Игровой прогресс Sparta</span>
                        </h4>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-sparta-gold/15 text-sparta-gold rounded-xl border border-sparta-gold/30">
                                <span className="text-xs font-black">🪙 {spartaCoins}</span>
                                <span className="text-[9px] font-bold uppercase">Coins</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 text-white/80 rounded-xl border border-white/10">
                                <span className="text-xs font-black">⭐ {totalXp}</span>
                                <span className="text-[9px] font-bold uppercase">XP</span>
                            </div>
                        </div>
                    </div>

                    {/* Badges List */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {badges.map((badge: any, idx: number) => (
                            <div
                                key={badge.id || idx}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10"
                            >
                                <span className="text-sm">{badge.icon || '🏆'}</span>
                                <span className="text-xs font-bold text-white/80">{badge.name || badge.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION 3: SPORTS METRICS & ATTENDANCE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Attendance Bar */}
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Посещаемость</span>
                            <span className="text-sm font-russo text-emerald-400">{attendanceRate}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-sparta-gold to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-white/40 font-bold">
                            {totalSessions > 0
                                ? `Посещено ${presentCount} из ${totalSessions} занятий`
                                : 'Высокая регулярность тренировок'}
                        </p>
                    </div>

                    {/* Interactive Skills Block */}
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-sparta-gold" />
                                <h4 className="text-xs sm:text-sm font-russo text-white uppercase tracking-wide">
                                    Оценка навыков
                                </h4>
                            </div>
                            <span className="text-[11px] font-bold text-sparta-gold">
                                (нажимайте + для прокачки)
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {[
                                { key: 'technique', label: 'Техника', color: 'from-amber-400 to-sparta-gold', activeBorder: 'border-sparta-gold/60' },
                                { key: 'speed', label: 'Скорость', color: 'from-blue-400 to-cyan-400', activeBorder: 'border-cyan-400/60' },
                                { key: 'power', label: 'Сила / Мощь', color: 'from-red-400 to-amber-500', activeBorder: 'border-red-400/60' }
                            ].map((sk) => {
                                const val = skillsState[sk.key] ?? 60;
                                const activeSegmentsCount = Math.round(val / 20);
                                const feedback = floatingFeedback[sk.key];

                                return (
                                    <div
                                        key={sk.key}
                                        className="relative flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                                    >
                                        {/* Skill Name */}
                                        <span className="text-xs font-bold text-white/90 w-24 truncate shrink-0">
                                            {sk.label}
                                        </span>

                                        {/* Minus Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleSkillChange(sk.key, -20)}
                                            disabled={val <= 0}
                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 text-white border border-white/20 flex items-center justify-center text-sm font-black transition-all cursor-pointer select-none shrink-0 active:scale-95"
                                            title="Уменьшить уровень (-20%)"
                                        >
                                            —
                                        </button>

                                        {/* 5-Segment Progress Bar */}
                                        <div className="flex-1 flex items-center gap-1.5 h-6">
                                            {[1, 2, 3, 4, 5].map((seg) => {
                                                const isFilled = seg <= activeSegmentsCount;
                                                return (
                                                    <button
                                                        key={seg}
                                                        type="button"
                                                        onClick={() => handleSetSkillSegment(sk.key, seg)}
                                                        title={`Уровень ${seg} из 5 (${seg * 20}%)`}
                                                        className={`flex-1 h-5.5 rounded-lg transition-all duration-200 cursor-pointer border relative flex items-center justify-center font-russo text-[10px] select-none ${
                                                            isFilled
                                                                ? `bg-gradient-to-r ${sk.color} ${sk.activeBorder} text-black font-black shadow-sm`
                                                                : 'bg-white/5 border-white/10 hover:bg-white/20 hover:border-white/30 text-white/30 hover:text-white/70'
                                                        }`}
                                                    >
                                                        <span>{seg}</span>
                                                        <span className="opacity-0 hover:opacity-100 absolute inset-0 rounded-lg bg-white/20 transition-opacity pointer-events-none" />
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Plus Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleSkillChange(sk.key, 20)}
                                            disabled={val >= 100}
                                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-amber-400 via-sparta-gold to-yellow-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black disabled:opacity-20 disabled:hover:from-sparta-gold border border-amber-300 flex items-center justify-center text-sm font-black transition-all cursor-pointer select-none shrink-0 shadow-md shadow-sparta-gold/30 hover:scale-105 active:scale-95"
                                            title="Повысить уровень (+10 XP)"
                                        >
                                            +
                                        </button>

                                        {/* Value Label */}
                                        <div className="w-12 text-right shrink-0">
                                            <div className="text-[11px] font-russo text-white leading-tight">
                                                {activeSegmentsCount}/5
                                            </div>
                                            <div className="text-[9px] font-bold text-white/40 leading-none">
                                                {val}%
                                            </div>
                                        </div>

                                        {/* Floating Feedback Badge */}
                                        <AnimatePresence>
                                            {feedback && (
                                                <motion.div
                                                    key={feedback.id}
                                                    initial={{ opacity: 0, y: 4, scale: 0.7 }}
                                                    animate={{ opacity: 1, y: -22, scale: 1 }}
                                                    exit={{ opacity: 0, y: -30, scale: 0.8 }}
                                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                                    className="absolute right-5 -top-1 pointer-events-none z-30 px-2 py-0.5 rounded-lg bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/40 border border-emerald-300 flex items-center gap-1"
                                                >
                                                    <span>{feedback.text}</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* SECTION 4: COACH NOTES */}
                <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
                            Заметки тренера / Индивидуальные особенности
                        </label>
                        {noteSaveStatus === 'saved' && (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>Сохранено</span>
                            </span>
                        )}
                    </div>
                    <textarea
                        value={coachNotes}
                        onChange={(e) => setCoachNotes(e.target.value)}
                        rows={3}
                        placeholder="Особенности техники, рекомендации, прогресс или индивидуальные задачи спортсмена..."
                        className="w-full p-3.5 bg-black/50 border border-white/10 focus:border-sparta-gold rounded-2xl text-xs text-white placeholder-white/30 outline-none resize-none"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSaveCoachNotes}
                            disabled={isSavingNotes}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {isSavingNotes ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            <span>{isSavingNotes ? 'Сохранение...' : 'Сохранить заметку'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default StudentProfileModal;
