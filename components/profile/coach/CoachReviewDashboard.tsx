import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    CheckCircle2, XCircle, Clock, Zap, User, Users,
    Search, Filter, MessageSquare, AlertTriangle, Sparkles,
    Check, X, Loader2, Award, Calendar, ArrowRight, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    collection, query, where, onSnapshot, doc, writeBatch,
    serverTimestamp, increment, getDoc, updateDoc, setDoc
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { SpartaCoinIcon } from '../../SpartaCoinIcon';

export interface SubmissionItem {
    id: string;
    homeworkId?: string;
    taskId?: string;
    planId?: string;
    studentId: string;
    studentName: string;
    title: string;
    description?: string;
    rewardCoins: number;
    rewardXp: number;
    groupId?: string;
    groupName?: string;
    coachName?: string;
    coachComment?: string;
    status: 'pending_review' | 'completed' | 'rejected' | 'active';
    submittedAt?: number | string | any;
    approvedAt?: number | string | any;
    rejectedAt?: number | string | any;
    mediaUrl?: string;
    studentComment?: string;
}

interface CoachReviewDashboardProps {
    theme?: string;
    coachId?: string;
    coachName?: string;
    myGroups?: any[];
    selectedGroupId?: string | null;
    onViewStudentProfile?: (studentId: string) => void;
}

export const CoachReviewDashboard: React.FC<CoachReviewDashboardProps> = ({
    theme = 'dark',
    coachId = '',
    coachName = 'Тренер',
    myGroups = [],
    selectedGroupId = null,
    onViewStudentProfile
}) => {
    const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectingItem, setRejectingItem] = useState<SubmissionItem | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Realtime Submissions Listener
    useEffect(() => {
        setIsLoading(true);
        const subMap = new Map<string, SubmissionItem>();
        const unsubs: Array<() => void> = [];

        const parseTimestamp = (val: any): number => {
            if (!val) return Date.now();
            if (typeof val === 'number') return val;
            if (val.seconds) return val.seconds * 1000;
            if (typeof val === 'string') {
                const p = Date.parse(val);
                return isNaN(p) ? Date.now() : p;
            }
            return Date.now();
        };

        const processDoc = (docId: string, d: any) => {
            if (!d) return;
            const st = (d.status || 'pending_review').toLowerCase();
            const normalizedStatus: SubmissionItem['status'] =
                st === 'completed' ? 'completed' :
                st === 'rejected' ? 'rejected' : 'pending_review';

            const coins = Number(d.rewardCoins || d.coins) || 30;
            const xp = Number(d.rewardXp || d.xp) || 50;

            const item: SubmissionItem = {
                id: docId,
                homeworkId: d.homeworkId || d.taskId || docId,
                taskId: d.taskId || d.homeworkId || docId,
                planId: d.planId || docId,
                studentId: d.studentId || d.userId || 'unknown_student',
                studentName: d.studentName || d.student || 'Спортсмен',
                title: d.title || d.taskTitle || 'Домашнее задание',
                description: d.description || d.taskDescription || '',
                rewardCoins: coins,
                rewardXp: xp,
                groupId: d.groupId || '',
                groupName: d.groupName || '',
                coachName: d.coachName || coachName,
                coachComment: d.coachComment || d.reviewComment || '',
                status: normalizedStatus,
                submittedAt: parseTimestamp(d.submittedAt || d.createdAt),
                approvedAt: d.approvedAt ? parseTimestamp(d.approvedAt) : undefined,
                rejectedAt: d.rejectedAt ? parseTimestamp(d.rejectedAt) : undefined,
                mediaUrl: d.mediaUrl || d.videoUrl || undefined,
                studentComment: d.comment || d.studentComment || undefined
            };

            subMap.set(docId, item);
        };

        const syncToState = () => {
            const dedup = new Map<string, SubmissionItem>();
            subMap.forEach(item => {
                const compositeKey = `${item.studentId}_${item.homeworkId || item.taskId || item.title}`;
                const existing = dedup.get(compositeKey) || dedup.get(item.id);
                if (!existing) {
                    dedup.set(compositeKey, item);
                } else {
                    const merged: SubmissionItem = {
                        ...existing,
                        ...item,
                        status: (existing.status === 'completed' || item.status === 'completed') ? 'completed'
                              : (existing.status === 'pending_review' || item.status === 'pending_review') ? 'pending_review'
                              : 'rejected'
                    };
                    dedup.set(compositeKey, merged);
                }
            });

            setSubmissions(Array.from(dedup.values()));
            setIsLoading(false);
        };

        // Source 1: homework_submissions
        try {
            const qSub = query(collection(db, 'homework_submissions'));
            unsubs.push(onSnapshot(qSub, snap => {
                snap.docs.forEach(d => processDoc(d.id, d.data()));
                syncToState();
            }, err => {
                console.warn('Error loading homework_submissions:', err);
                setIsLoading(false);
            }));
        } catch (e) {
            console.warn('homework_submissions query error:', e);
        }

        // Source 2: completed_tasks with pending_review status
        try {
            const qComp = query(collection(db, 'completed_tasks'), where('status', '==', 'pending_review'));
            unsubs.push(onSnapshot(qComp, snap => {
                snap.docs.forEach(d => processDoc(d.id, d.data()));
                syncToState();
            }, err => {
                console.warn('Error loading completed_tasks:', err);
            }));
        } catch (e) {
            console.warn('completed_tasks query error:', e);
        }

        return () => {
            unsubs.forEach(u => u());
        };
    }, [coachName]);

    // Filtered lists
    const pendingList = useMemo(() => {
        return submissions.filter(s => s.status === 'pending_review');
    }, [submissions]);

    const completedList = useMemo(() => {
        return submissions.filter(s => s.status === 'completed');
    }, [submissions]);

    const displayedSubmissions = useMemo(() => {
        let list = activeTab === 'pending' ? pendingList : completedList;

        if (selectedGroupFilter !== 'all') {
            const targetGroup = myGroups.find(g => g.id === selectedGroupFilter);
            const targetGroupName = (targetGroup?.name || targetGroup?.title || '').toLowerCase().trim();

            list = list.filter(s => {
                if (!s.groupId && !s.groupName) return true;
                if (s.groupId && s.groupId === selectedGroupFilter) return true;
                if (targetGroupName && s.groupName && s.groupName.toLowerCase().includes(targetGroupName)) return true;
                return false;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(s =>
                s.studentName.toLowerCase().includes(q) ||
                s.title.toLowerCase().includes(q) ||
                (s.groupName && s.groupName.toLowerCase().includes(q))
            );
        }

        return list.sort((a, b) => {
            const timeA = Number(a.submittedAt || 0);
            const timeB = Number(b.submittedAt || 0);
            return timeB - timeA;
        });
    }, [activeTab, pendingList, completedList, selectedGroupFilter, myGroups, searchQuery]);

    // ==========================================
    // ACTION 1: APPROVE TASK & REWARD STUDENT
    // ==========================================
    const handleApprove = async (sub: SubmissionItem) => {
        if (processingId) return;
        setProcessingId(sub.id);

        try {
            const batch = writeBatch(db);
            const coins = sub.rewardCoins || 30;
            const xp = sub.rewardXp || 50;
            const targetStudentId = sub.studentId;

            // 1. Update homework_submissions
            const subRef = doc(db, 'homework_submissions', sub.id);
            batch.set(subRef, {
                status: 'completed',
                approvedAt: serverTimestamp(),
                coachName: coachName,
                coachComment: 'Отлично выполнено! Задание принято тренером.'
            }, { merge: true });

            // 2. Update completed_tasks document
            const compDocId = `${targetStudentId}_${sub.homeworkId || sub.taskId || sub.id}`;
            const compRef = doc(db, 'completed_tasks', compDocId);
            batch.set(compRef, {
                status: 'completed',
                approvedAt: serverTimestamp(),
                completedAt: serverTimestamp(),
                coachName: coachName,
                coachComment: 'Отлично выполнено! Задание принято тренером.',
                rewardCoins: coins,
                rewardXp: xp,
                title: sub.title,
                studentId: targetStudentId,
                studentName: sub.studentName
            }, { merge: true });

            // 3. Update homework / trainingPlan docs if exist
            if (sub.homeworkId) {
                const hwRef = doc(db, 'homework', sub.homeworkId);
                batch.set(hwRef, {
                    status: 'completed',
                    completedAt: serverTimestamp()
                }, { merge: true });
            }

            if (sub.planId) {
                const planRef = doc(db, 'trainingPlan', sub.planId);
                batch.set(planRef, {
                    status: 'completed',
                    completedAt: serverTimestamp()
                }, { merge: true });
            }

            // 4. Atomically credit coins and XP in user document
            if (targetStudentId && targetStudentId !== 'unknown_student') {
                const userDocRef = doc(db, 'users', targetStudentId);
                batch.set(userDocRef, {
                    coins: increment(coins),
                    totalEarnedCoins: increment(coins),
                    xp: increment(xp),
                    balance: increment(coins),
                    completedTasksCount: increment(1),
                    lastTaskCompletedAt: serverTimestamp()
                }, { merge: true });

                // Also update in students collection if present
                const studentDocRef = doc(db, 'students', targetStudentId);
                batch.set(studentDocRef, {
                    coins: increment(coins),
                    xp: increment(xp),
                    completedTasksCount: increment(1)
                }, { merge: true });

                // 5. Send celebratory notification
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, {
                    userId: targetStudentId,
                    type: 'task_approved',
                    title: '🎉 Тренер принял задание!',
                    message: `Тренер ${coachName} принял задание «${sub.title}»! Тебе начислено +${coins} монет и +${xp} XP 🚀`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    read: false
                });
            }

            await batch.commit();

            confetti({
                particleCount: 70,
                spread: 70,
                origin: { y: 0.6 }
            });

            showToast(`Задание для «${sub.studentName}» принято! Начислено +${coins} 🪙`);
        } catch (err) {
            console.error('Error approving task submission:', err);
            alert('Ошибка при принятии задания. Попробуйте еще раз.');
        } finally {
            setProcessingId(null);
        }
    };

    // ==========================================
    // ACTION 2: REJECT / REQUEST REVISION
    // ==========================================
    const handleConfirmReject = async () => {
        if (!rejectingItem || processingId) return;
        setProcessingId(rejectingItem.id);

        try {
            const batch = writeBatch(db);
            const feedbackText = rejectComment.trim() || 'Тренер просит повторить упражнение с акцентом на правильную технику.';
            const targetStudentId = rejectingItem.studentId;

            // 1. Update homework_submissions
            const subRef = doc(db, 'homework_submissions', rejectingItem.id);
            batch.set(subRef, {
                status: 'rejected',
                rejectedAt: serverTimestamp(),
                coachName: coachName,
                coachComment: feedbackText
            }, { merge: true });

            // 2. Update completed_tasks document
            const compDocId = `${targetStudentId}_${rejectingItem.homeworkId || rejectingItem.taskId || rejectingItem.id}`;
            const compRef = doc(db, 'completed_tasks', compDocId);
            batch.set(compRef, {
                status: 'rejected',
                coachComment: feedbackText,
                rejectedAt: serverTimestamp()
            }, { merge: true });

            // 3. Return homework / trainingPlan back to active status
            if (rejectingItem.homeworkId) {
                const hwRef = doc(db, 'homework', rejectingItem.homeworkId);
                batch.set(hwRef, {
                    status: 'active',
                    coachComment: feedbackText
                }, { merge: true });
            }

            if (rejectingItem.planId) {
                const planRef = doc(db, 'trainingPlan', rejectingItem.planId);
                batch.set(planRef, {
                    status: 'active',
                    coachComment: feedbackText
                }, { merge: true });
            }

            // 4. Send notification to student
            if (targetStudentId && targetStudentId !== 'unknown_student') {
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, {
                    userId: targetStudentId,
                    type: 'task_rejected',
                    title: '⚠️ Задание отправлено на доработку',
                    message: `Тренер ${coachName} оставил комментарий к заданию «${rejectingItem.title}»: ${feedbackText}`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    read: false
                });
            }

            await batch.commit();

            showToast(`Задание отправлено на доработку спортсмену «${rejectingItem.studentName}»`);
            setRejectingItem(null);
            setRejectComment('');
        } catch (err) {
            console.error('Error rejecting submission:', err);
            alert('Ошибка при отправке на доработку. Попробуйте еще раз.');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6 text-left">
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

            {/* 1. TOP HEADER & SUMMARY BANNER */}
            <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/10 pb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500/20 to-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center shrink-0 shadow-inner">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-tight">
                                    Проверка заданий
                                </h2>
                                {pendingList.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black font-black text-xs uppercase animate-pulse">
                                        {pendingList.length} новых
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-white/50 font-medium mt-1">
                                Проверяйте выполнение домашних челленджей, утверждайте награды и давайте обратную связь спортсменам
                            </p>
                        </div>
                    </div>

                    {/* Stats Counter Pills */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                                <Clock size={16} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-wider text-white/40 block">Ожидают</span>
                                <span className="text-base font-russo text-white">{pendingList.length}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-black tracking-wider text-white/40 block">Принято</span>
                                <span className="text-base font-russo text-white">{completedList.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CONTROLS: TABS, SEARCH & GROUP FILTER */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Subtabs Segmented Control */}
                    <div className="flex items-center p-1 bg-black/50 border border-white/10 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-xl text-xs font-russo uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'pending'
                                    ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/20'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Clock size={14} />
                            <span>На проверке ({pendingList.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('completed')}
                            className={`px-4 py-2 rounded-xl text-xs font-russo uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'completed'
                                    ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/20'
                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <CheckCircle2 size={14} />
                            <span>Проверенные ({completedList.length})</span>
                        </button>
                    </div>

                    {/* Search & Group Filter */}
                    <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск по ученику или упражнению..."
                                className="w-full pl-9 pr-4 py-2 bg-black/50 border border-white/10 focus:border-sparta-gold rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition-all"
                            />
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        </div>

                        {myGroups.length > 0 && (
                            <select
                                value={selectedGroupFilter}
                                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                                className="px-3 py-2 bg-black/50 border border-white/10 focus:border-sparta-gold rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
                            >
                                <option value="all" className="bg-[#18181b] text-white">
                                    Все группы {pendingList.length > 0 ? `(${pendingList.length} на проверке)` : ''}
                                </option>
                                {myGroups.map(g => (
                                    <option key={g.id} value={g.id} className="bg-[#18181b] text-white">
                                        {g.name || g.title}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. SUBMISSIONS LIST */}
            {isLoading ? (
                <div className="py-20 text-center space-y-3">
                    <Loader2 size={32} className="animate-spin text-sparta-gold mx-auto" />
                    <p className="text-xs font-russo uppercase tracking-wider text-white/40">
                        Загрузка заданий на проверку...
                    </p>
                </div>
            ) : displayedSubmissions.length === 0 ? (
                activeTab === 'pending' && pendingList.length > 0 && selectedGroupFilter !== 'all' ? (
                    <div className="py-14 px-6 text-center border border-dashed border-amber-500/30 rounded-3xl bg-amber-500/5 space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-russo text-base text-white uppercase tracking-wide">
                                В выбранной группе нет заданий на проверке
                            </h4>
                            <p className="text-xs text-white/60 max-w-md mx-auto">
                                У вас есть <strong className="text-amber-400 font-bold">{pendingList.length} заданий на проверку</strong> в других группах или от персональных учеников.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedGroupFilter('all')}
                            className="px-5 py-2.5 bg-sparta-gold hover:bg-yellow-400 text-black font-russo uppercase text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-sparta-gold/20 font-bold"
                        >
                            Показать все задания ({pendingList.length})
                        </button>
                    </div>
                ) : (
                    <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-[#121214]/50 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 text-white/30 mx-auto flex items-center justify-center">
                            {activeTab === 'pending' ? <CheckCircle2 size={24} /> : <Calendar size={24} />}
                        </div>
                        <h4 className="font-russo text-base text-white uppercase tracking-wide">
                            {activeTab === 'pending' ? 'Все задания проверены!' : 'Нет проверенных заданий'}
                        </h4>
                        <p className="text-xs text-white/40 max-w-sm mx-auto">
                            {activeTab === 'pending'
                                ? 'Отличная работа! Когда ученики выполнят упражнения, они сразу появятся здесь на проверку.'
                                : 'Здесь будет отображаться история ранее принятых и проверенных заданий.'}
                        </p>
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {displayedSubmissions.map((sub, index) => {
                        const isProcessing = processingId === sub.id;
                        const formattedDate = format(new Date(sub.submittedAt), 'd MMMM, HH:mm', { locale: ru });

                        return (
                            <motion.div
                                key={`${sub.id}_${sub.studentId}_${index}`}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-5 sm:p-6 bg-[#121214] border border-white/10 hover:border-sparta-gold/30 rounded-3xl transition-all shadow-xl space-y-4"
                            >
                                {/* Top Row: Student info & Submission date */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-2xl bg-sparta-gold/15 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center font-russo text-sm font-bold shrink-0">
                                            {sub.studentName.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm sm:text-base text-white hover:text-sparta-gold transition-colors cursor-pointer"
                                                    onClick={() => onViewStudentProfile?.(sub.studentId)}
                                                >
                                                    {sub.studentName}
                                                </h4>
                                                {sub.groupName && (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold">
                                                        {sub.groupName}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-white/40 flex items-center gap-1.5 mt-0.5">
                                                <Clock size={11} />
                                                <span>Сдано: {formattedDate}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reward badges */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                            <SpartaCoinIcon size={13} />
                                            <span>+{sub.rewardCoins} монет</span>
                                        </span>
                                        <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                                            +{sub.rewardXp} XP
                                        </span>
                                    </div>
                                </div>

                                {/* Middle Row: Exercise title and details */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-sparta-gold/10 text-sparta-gold shrink-0">
                                            <Zap size={14} />
                                        </div>
                                        <h5 className="font-russo text-sm text-white uppercase tracking-wide">
                                            {sub.title}
                                        </h5>
                                    </div>

                                    {sub.description && (
                                        <p className="text-xs text-white/60 leading-relaxed pl-7">
                                            {sub.description}
                                        </p>
                                    )}

                                    {sub.studentComment && (
                                        <div className="ml-7 p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-white/80 space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-sparta-gold block">
                                                💬 Комментарий ученика:
                                            </span>
                                            <p className="italic">«{sub.studentComment}»</p>
                                        </div>
                                    )}

                                    {sub.coachComment && sub.status === 'completed' && (
                                        <div className="ml-7 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider block">
                                                ✅ Отзыв тренера:
                                            </span>
                                            <p>{sub.coachComment}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Row: Actions (Accept / Reject) */}
                                {sub.status === 'pending_review' && (
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-white/5">
                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => {
                                                setRejectingItem(sub);
                                                setRejectComment('');
                                            }}
                                            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-2xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                        >
                                            <XCircle size={15} />
                                            <span>Отклонить / Переделать</span>
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => handleApprove(sub)}
                                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 size={15} className="animate-spin" />
                                                    <span>Начисление...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={15} />
                                                    <span>Принять (+{sub.rewardCoins} монет)</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* REJECT FEEDBACK MODAL */}
            <AnimatePresence>
                {rejectingItem && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-[#141416] border border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-left relative overflow-hidden"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="p-3 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-2xl shrink-0">
                                    <AlertTriangle size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-russo text-white uppercase tracking-tight">
                                        Отправить на доработку
                                    </h3>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        Ученик <strong className="text-white">«{rejectingItem.studentName}»</strong> получит ваш комментарий и сможет сдать задание повторно.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-white/60 uppercase tracking-wider block">
                                    Совет тренера / Что исправить:
                                </label>
                                <textarea
                                    rows={3}
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    placeholder="Например: Держи равновесие при приземлении, повтори еще 10 раз..."
                                    className="w-full px-4 py-3 bg-black/50 border border-white/15 focus:border-sparta-gold rounded-2xl text-xs text-white placeholder-zinc-500 outline-none resize-none transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectingItem(null)}
                                    disabled={processingId !== null}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmReject}
                                    disabled={processingId !== null}
                                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer font-bold shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {processingId ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            <span>Отправка...</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={15} />
                                            <span>Отправить</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CoachReviewDashboard;
