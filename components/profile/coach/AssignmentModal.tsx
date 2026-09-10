import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Calendar, Loader2, CheckCircle2, User, Users, ChevronDown, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { doc, collection, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase';
import { SpartaCoinIcon } from '../../SpartaCoinIcon';
import { BaseModal } from '../../ui/BaseModal';

export interface AssignmentTargetStudent {
    id: string;
    uid?: string;
    studentId?: string;
    assignedUid?: string;
    name: string;
    childName?: string;
    displayName?: string;
    groupId?: string;
    groupName?: string;
    birthYear?: number | string;
}

export interface AssignmentTargetGroup {
    id: string;
    name: string;
    title?: string;
    sport?: string;
    memberCount?: number;
}

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student?: AssignmentTargetStudent | null;
    currentGroup?: AssignmentTargetGroup | null;
    groupStudents?: AssignmentTargetStudent[];
    coachId?: string;
    coachName?: string;
    initialData?: any | null;
    onSuccess?: (task: any) => void;
}

type DueOption = 'next_training' | '3_days' | '1_week';
type RewardOption = 'standard' | 'recommended' | 'epic';

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
    isOpen,
    onClose,
    student,
    currentGroup,
    groupStudents = [],
    coachId = '',
    coachName = 'Тренер',
    initialData = null,
    onSuccess
}) => {
    const isEditMode = Boolean(initialData?.id);
    const [targetMode, setTargetMode] = useState<'group' | 'student'>('group');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueOption, setDueOption] = useState<DueOption>('next_training');
    const [rewardOption, setRewardOption] = useState<RewardOption>('recommended');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Deduplicate students list
    const uniqueGroupStudents = React.useMemo(() => {
        const map = new Map<string, AssignmentTargetStudent>();
        groupStudents.forEach(s => {
            const id = s.id || s.uid || s.studentId || s.assignedUid;
            if (id && !map.has(id)) {
                map.set(id, s);
            }
        });
        return Array.from(map.values());
    }, [groupStudents]);

    useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
            setToastMessage(null);

            if (initialData) {
                setTitle(initialData.title || initialData.taskTitle || '');
                setDescription(initialData.description || initialData.taskDescription || '');

                const isPersonal = Boolean(initialData.studentId || initialData.studentUid || initialData.targetType === 'student');
                setTargetMode(isPersonal ? 'student' : 'group');
                setSelectedStudentId(initialData.studentId || initialData.studentUid || (uniqueGroupStudents?.[0]?.id || ''));

                const c = Number(initialData.rewardCoins || initialData.coins);
                if (c <= 20) setRewardOption('standard');
                else if (c >= 50) setRewardOption('epic');
                else setRewardOption('recommended');

                setDueOption('next_training');
            } else {
                setTitle('');
                setDescription('');
                setDueOption('next_training');
                setRewardOption('recommended');

                if (student) {
                    setTargetMode('student');
                    setSelectedStudentId(student.id);
                } else {
                    setTargetMode('group');
                    setSelectedStudentId(uniqueGroupStudents?.[0]?.id || '');
                }
            }
        }
    }, [isOpen, student, uniqueGroupStudents, initialData]);

    // Active student and group resolution
    const isGroupWide = targetMode === 'group';
    const activeStudent = isGroupWide
        ? null
        : (uniqueGroupStudents.find(s => s.id === selectedStudentId) || student || uniqueGroupStudents[0] || null);

    const activeStudentName = activeStudent
        ? (activeStudent.name || activeStudent.childName || activeStudent.displayName || 'Спортсмен')
        : (initialData?.studentName || null);

    const targetGroupName = currentGroup?.name || currentGroup?.title || activeStudent?.groupName || initialData?.groupName || 'Группа';
    const targetGroupId = currentGroup?.id || activeStudent?.groupId || initialData?.groupId || '';

    // Calculate due date based on selected option
    const getCalculatedDueDate = (option: DueOption): string => {
        const now = new Date();
        const d = new Date(now);
        if (option === 'next_training') {
            d.setDate(d.getDate() + 2);
        } else if (option === '3_days') {
            d.setDate(d.getDate() + 3);
        } else if (option === '1_week') {
            d.setDate(d.getDate() + 7);
        }
        return format(d, 'yyyy-MM-dd');
    };

    // Calculate reward values
    const getRewardValues = (option: RewardOption) => {
        switch (option) {
            case 'standard':
                return { coins: 20, xp: 30, label: '+20 монет / 30 XP' };
            case 'epic':
                return { coins: 50, xp: 100, label: '+50 монет / 100 XP' };
            case 'recommended':
            default:
                return { coins: 30, xp: 50, label: '+30 монет / 50 XP (Рекомендуется)' };
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;

        setIsSubmitting(true);
        try {
            const calculatedDueDate = getCalculatedDueDate(dueOption);
            const { coins, xp } = getRewardValues(rewardOption);
            const studentId = isGroupWide ? null : (activeStudent?.id || activeStudent?.uid || activeStudent?.studentId || null);
            const studentUid = isGroupWide ? null : (activeStudent?.uid || activeStudent?.assignedUid || activeStudent?.id || null);

            // EDIT MODE
            if (isEditMode && initialData?.id) {
                const batch = writeBatch(db);
                const updatePayload: any = {
                    title: trimmedTitle,
                    description: description.trim(),
                    rewardCoins: coins,
                    coins: coins,
                    rewardXp: xp,
                    xp: xp,
                    dueDate: calculatedDueDate,
                    deadline: calculatedDueDate,
                    groupId: targetGroupId,
                    groupName: targetGroupName,
                    coachId: coachId || initialData.coachId || '',
                    coachName: coachName || initialData.coachName || 'Тренер',
                    isGroupWide: isGroupWide,
                    targetType: isGroupWide ? 'group' : 'student',
                    studentId: studentId,
                    studentUid: studentUid,
                    studentName: isGroupWide ? null : activeStudentName,
                    updatedAt: serverTimestamp()
                };

                const hwRef = doc(db, "homework", initialData.id);
                batch.set(hwRef, updatePayload, { merge: true });

                const planId = initialData.planId || initialData.id;
                if (planId) {
                    const planRef = doc(db, "trainingPlan", planId);
                    batch.set(planRef, updatePayload, { merge: true });
                }

                const assignedRef = doc(db, "assigned_tasks", initialData.id);
                batch.set(assignedRef, {
                    ...updatePayload,
                    taskId: initialData.id,
                    taskTitle: trimmedTitle,
                    taskDescription: description.trim()
                }, { merge: true });

                if (isGroupWide && targetGroupId) {
                    const groupRef = doc(db, 'groups', targetGroupId);
                    batch.set(groupRef, {
                        weeklyChallengeTitle: trimmedTitle,
                        weeklyChallengeReward: xp,
                        weeklyChallengeDeadline: calculatedDueDate,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }

                await batch.commit();

                confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                setToastMessage('Задание успешно обновлено! ✨');

                setTimeout(() => {
                    onSuccess?.({
                        ...initialData,
                        ...updatePayload,
                        id: initialData.id
                    });
                    onClose();
                }, 800);
                return;
            }

            // CREATE MODE
            const batch = writeBatch(db);
            const sharedDocId = doc(collection(db, "homework")).id;

            const newPlanRef = doc(db, "trainingPlan", sharedDocId);
            const planPayload = {
                id: sharedDocId,
                title: trimmedTitle,
                description: description.trim(),
                coins: coins,
                rewardCoins: coins,
                xp: xp,
                rewardXp: xp,
                dueDate: calculatedDueDate,
                deadline: calculatedDueDate,
                date: format(new Date(), 'yyyy-MM-dd'),
                groupId: targetGroupId,
                groupName: targetGroupName,
                coachId: coachId,
                coachName: coachName,
                isGroupWide: isGroupWide,
                targetType: isGroupWide ? 'group' : 'student',
                studentId: studentId,
                studentUid: studentUid,
                studentName: isGroupWide ? null : activeStudentName,
                status: 'active',
                createdAt: serverTimestamp(),
                type: isGroupWide ? 'challenge' : 'personal_challenge'
            };
            batch.set(newPlanRef, planPayload);

            const homeworkRef = doc(db, "homework", sharedDocId);
            const homeworkPayload = {
                id: sharedDocId,
                planId: sharedDocId,
                title: trimmedTitle,
                description: description.trim(),
                rewardCoins: coins,
                rewardXp: xp,
                dueDate: calculatedDueDate,
                groupId: targetGroupId,
                groupName: targetGroupName,
                coachId: coachId,
                coachName: coachName,
                isGroupWide: isGroupWide,
                targetType: isGroupWide ? 'group' : 'student',
                studentId: studentId,
                studentUid: studentUid,
                studentName: isGroupWide ? null : activeStudentName,
                status: 'active',
                createdAt: serverTimestamp()
            };
            batch.set(homeworkRef, homeworkPayload);

            const assignedRef = doc(db, "assigned_tasks", sharedDocId);
            batch.set(assignedRef, {
                ...homeworkPayload,
                taskId: sharedDocId,
                taskTitle: trimmedTitle,
                taskDescription: description.trim()
            });

            if (!isGroupWide) {
                const targetUId = studentUid || studentId;
                if (targetUId) {
                    const userDocRef = doc(db, 'users', targetUId);
                    batch.set(userDocRef, {
                        personalAssignments: arrayUnion({
                            id: homeworkRef.id,
                            title: trimmedTitle,
                            description: description.trim(),
                            rewardCoins: coins,
                            rewardXp: xp,
                            dueDate: calculatedDueDate,
                            coachName: coachName,
                            assignedAt: new Date().toISOString(),
                            status: 'active'
                        })
                    }, { merge: true });
                }
            }

            if (isGroupWide && targetGroupId) {
                const groupRef = doc(db, 'groups', targetGroupId);
                batch.set(groupRef, {
                    weeklyChallengeTitle: trimmedTitle,
                    weeklyChallengeReward: xp,
                    weeklyChallengeDeadline: calculatedDueDate,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                if (currentGroup?.sport) {
                    const challengeRef = doc(db, 'club_challenges', currentGroup.sport);
                    batch.set(challengeRef, {
                        weeklyChallengeTitle: trimmedTitle,
                        weeklyChallengeReward: xp,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }
            }

            if (!isGroupWide && (studentId || studentUid)) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: studentUid || studentId,
                    type: 'new_assignment',
                    title: '⚡ Новое задание от тренера!',
                    message: `Тренер ${coachName} назначил упражнение: «${trimmedTitle}» (+${coins} монет)`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    read: false
                });
            } else if (isGroupWide && groupStudents && groupStudents.length > 0) {
                groupStudents.forEach(st => {
                    const stId = st.id || st.uid || st.studentId || st.assignedUid;
                    if (stId) {
                        const notifRef = doc(collection(db, "notifications"));
                        batch.set(notifRef, {
                            userId: stId,
                            type: 'new_assignment',
                            title: '⚡ Новое задание для группы!',
                            message: `Тренер ${coachName} назначил упражнение: «${trimmedTitle}» (+${coins} монет)`,
                            createdAt: serverTimestamp(),
                            isRead: false,
                            read: false
                        });
                    }
                });
            }

            await batch.commit();

            confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });

            onSuccess?.({
                id: homeworkRef.id,
                planId: newPlanRef.id,
                title: trimmedTitle,
                description: description.trim(),
                rewardCoins: coins,
                rewardXp: xp,
                dueDate: calculatedDueDate,
                isGroupWide: isGroupWide,
                studentName: isGroupWide ? null : activeStudentName,
                groupName: targetGroupName,
                createdAt: new Date()
            });

            setToastMessage('Задание успешно отправлено!');
            setTimeout(() => {
                setToastMessage(null);
                onClose();
            }, 1000);

        } catch (err) {
            console.error('Error creating assignment:', err);
            alert('Не удалось сохранить задание. Попробуйте еще раз.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            glowColor="amber"
            zIndex="z-[200]"
        >
            {/* Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 right-6 z-[300] bg-emerald-500 text-black px-5 py-3.5 rounded-2xl font-bold font-russo uppercase text-xs shadow-2xl flex items-center gap-2.5 border border-emerald-400"
                    >
                        <CheckCircle2 size={16} />
                        <span>{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative space-y-6 text-left">
                {/* 1. HEADER */}
                <div className="flex items-start gap-4 pr-10">
                    <div className="p-3 bg-gradient-to-br from-amber-500/20 to-sparta-gold/20 text-sparta-gold rounded-2xl border border-sparta-gold/30 shrink-0 shadow-inner">
                        {isEditMode ? <Edit3 size={22} className="text-sparta-gold" /> : <Zap size={22} className="fill-sparta-gold" />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xl font-russo text-white uppercase tracking-tight flex items-center gap-2">
                            <span>{isEditMode ? 'Редактировать задание' : 'Назначить задание'}</span>
                        </h3>
                        <p className="text-xs text-white/60 font-medium mt-1 truncate">
                            {isGroupWide ? (
                                <span className="flex items-center gap-1.5">
                                    <Users size={13} className="text-sparta-gold shrink-0" />
                                    <span>Для всей группы: <strong className="text-white font-bold">{targetGroupName}</strong></span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5">
                                    <User size={13} className="text-sparta-gold shrink-0" />
                                    <span>Для: <strong className="text-white font-bold">{activeStudentName || 'Ученика'}</strong> ({targetGroupName})</span>
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* 2. TARGET MODE SWITCHER */}
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 p-1.5 bg-black/50 rounded-2xl border border-white/10">
                        <button
                            type="button"
                            onClick={() => setTargetMode('group')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-russo uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isGroupWide
                                    ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/20'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Users size={14} />
                            <span>Всей группе</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTargetMode('student');
                                if (!selectedStudentId && groupStudents.length > 0) {
                                    setSelectedStudentId(groupStudents[0].id);
                                }
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-russo uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                !isGroupWide
                                    ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/20'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <User size={14} />
                            <span>Лично ученику</span>
                        </button>
                    </div>

                    {/* Student Select Dropdown */}
                    {!isGroupWide && uniqueGroupStudents.length > 0 && (
                        <div className="space-y-1.5 animate-fadeIn">
                            <label className="text-[11px] font-black text-white/60 uppercase tracking-wider block">
                                Выберите спортсмена
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/50 border border-white/15 focus:border-sparta-gold rounded-2xl text-xs font-bold text-white outline-none cursor-pointer appearance-none transition-all focus:bg-black/70 pr-10"
                                >
                                    {uniqueGroupStudents.map(s => (
                                        <option key={s.id} value={s.id} className="bg-[#18181b] text-white">
                                            {s.name || s.childName || s.displayName} {s.birthYear ? `(${s.birthYear} г.р.)` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. FORM FIELDS */}
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    {/* Title input */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-white/60 uppercase tracking-wider block">
                            Название задания <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введите название задания (например: Набивание мяча)"
                            className="w-full px-4 py-3.5 bg-black/50 border border-white/15 focus:border-sparta-gold rounded-2xl text-xs font-bold text-white placeholder-zinc-400 outline-none transition-all focus:bg-black/70"
                        />
                    </div>

                    {/* Description textarea */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-white/60 uppercase tracking-wider block">
                            Комментарий / Совет тренера <span className="text-white/30 text-[10px] font-normal lowercase">(необязательно)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Опишите технику выполнения, количество повторений или советы..."
                            className="w-full px-4 py-3.5 bg-black/50 border border-white/15 focus:border-sparta-gold rounded-2xl text-xs text-white placeholder-zinc-400 outline-none resize-none transition-all focus:bg-black/70"
                        />
                    </div>

                    {/* Due Date Dropdown */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-white/60 uppercase tracking-wider block">
                            Срок сдачи
                        </label>
                        <div className="relative">
                            <select
                                value={dueOption}
                                onChange={(e) => setDueOption(e.target.value as DueOption)}
                                className="w-full px-4 py-3.5 bg-black/50 border border-white/15 focus:border-sparta-gold rounded-2xl text-xs font-bold text-white outline-none cursor-pointer appearance-none transition-all focus:bg-black/70 pr-10"
                            >
                                <option value="next_training" className="bg-[#18181b] text-white">
                                    К следующей тренировке (через 2 дня)
                                </option>
                                <option value="3_days" className="bg-[#18181b] text-white">
                                    Через 3 дня
                                </option>
                                <option value="1_week" className="bg-[#18181b] text-white">
                                    Через 1 неделю
                                </option>
                            </select>
                            <Calendar size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        </div>
                    </div>

                    {/* Reward Selection Chips */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-white/60 uppercase tracking-wider block">
                            Награда за выполнение
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {(['standard', 'recommended', 'epic'] as RewardOption[]).map(opt => {
                                const isSelected = rewardOption === opt;
                                const data = getRewardValues(opt);
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setRewardOption(opt)}
                                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                                            isSelected
                                                ? 'bg-sparta-gold/15 border-sparta-gold text-white shadow-lg shadow-sparta-gold/10'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {opt === 'recommended' && (
                                            <span className="text-[8px] font-black uppercase tracking-wider text-sparta-gold bg-sparta-gold/20 px-1.5 py-0.5 rounded-md inline-block mb-1 w-fit">
                                                Рекомендуется
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1.5 font-russo text-xs text-white">
                                            <SpartaCoinIcon size={14} animate />
                                            <span>+{data.coins} монет</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-emerald-400 mt-0.5">
                                            +{data.xp} XP
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4. FOOTER BUTTONS */}
                    <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:flex-1 py-3 sm:py-3.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer text-center"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="w-full sm:flex-1 py-3 sm:py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black rounded-2xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 font-black"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Сохранение...</span>
                                </>
                            ) : (
                                <span>{isEditMode ? '💾 Сохранить изменения' : '🚀 Назначить задание'}</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </BaseModal>
    );
};

export default AssignmentModal;
