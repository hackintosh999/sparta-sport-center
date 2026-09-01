import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    CheckCircle2,
    Clock,
    Search,
    ChevronRight,
    Trophy,
    Calendar,
    UserCheck,
    MessageSquareQuote
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDoc, doc, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

export interface TaskHistoryItem {
    id: string;
    taskId?: string;
    title: string;
    description?: string;
    coachName?: string;
    coachComment?: string;
    status: 'completed' | 'pending_review' | 'assigned' | 'active';
    rewardCoins?: number;
    rewardXp?: number;
    approvedAt?: string | number;
    completedAt?: string | number;
    submittedAt?: string | number;
    assignedAt?: string | number;
    dueDate?: string;
    type?: 'homework' | 'challenge' | 'personal';
}

interface TaskHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId?: string;
    groupId?: string;
    userName?: string;
    userProfile?: any;
    onOpenShop?: () => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
    isOpen,
    onClose,
    studentId,
    groupId,
    userName = 'Чемпион',
    userProfile,
    onOpenShop
}) => {
    const [firestoreTasks, setFirestoreTasks] = useState<TaskHistoryItem[]>([]);
    const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

    // Collect all candidate student IDs
    const candidateStudentIds = useMemo(() => {
        const set = new Set<string>();
        if (studentId) set.add(String(studentId).trim());
        if (userProfile?.id) set.add(String(userProfile.id).trim());
        if (userProfile?.uid) set.add(String(userProfile.uid).trim());
        if (userProfile?.studentId) set.add(String(userProfile.studentId).trim());
        if (userProfile?.childId) set.add(String(userProfile.childId).trim());
        if (userProfile?.assignedUid) set.add(String(userProfile.assignedUid).trim());
        if (Array.isArray(userProfile?.childrenIds)) {
            userProfile.childrenIds.forEach((c: any) => c && set.add(String(c).trim()));
        }
        return Array.from(set).filter(Boolean);
    }, [studentId, userProfile]);

    // Collect all candidate group IDs
    const candidateGroupIds = useMemo(() => {
        const set = new Set<string>();
        if (groupId) set.add(String(groupId).trim());
        if (userProfile?.groupId) set.add(String(userProfile.groupId).trim());
        if (userProfile?.group) set.add(String(userProfile.group).trim());
        if (userProfile?.groupName) set.add(String(userProfile.groupName).trim());
        if (Array.isArray(userProfile?.groups)) {
            userProfile.groups.forEach((g: any) => {
                if (typeof g === 'string') set.add(g.trim());
                else if (g?.id) set.add(String(g.id).trim());
                else if (g?.name) set.add(String(g.name).trim());
            });
        }
        return Array.from(set).filter(Boolean);
    }, [groupId, userProfile]);

    // Name & Group search tokens for fuzzy matching
    const studentNameTokens = useMemo(() => {
        const rawNames = [
            userName,
            userProfile?.childName,
            userProfile?.displayName,
            userProfile?.name,
            userProfile?.athleteName
        ].filter(Boolean);

        const tokens = new Set<string>();
        rawNames.forEach(n => {
            const parts = String(n).toLowerCase().trim().split(/[\s,._-]+/);
            parts.forEach(p => {
                if (p.length >= 2) tokens.add(p);
            });
        });
        return Array.from(tokens);
    }, [userName, userProfile]);

    const groupNameTokens = useMemo(() => {
        const rawGroups = [
            groupId,
            userProfile?.groupId,
            userProfile?.group,
            userProfile?.groupName
        ].filter(Boolean);

        const tokens = new Set<string>();
        rawGroups.forEach(g => {
            const parts = String(g).toLowerCase().trim().split(/[\s,._-]+/);
            parts.forEach(p => {
                if (p.length >= 3 && p !== 'группа' && p !== 'гр') tokens.add(p);
            });
        });
        return Array.from(tokens);
    }, [groupId, userProfile]);

    // 1. Realtime Firestore Multi-source Listener
    useEffect(() => {
        if (!isOpen) return;

        const tasksMap = new Map<string, TaskHistoryItem>();
        const unsubs: Array<() => void> = [];

        const syncToState = () => {
            const rawTasks = Array.from(tasksMap.values());
            const dedupMap = new Map<string, TaskHistoryItem>();

            rawTasks.forEach(task => {
                const normalizedTitle = (task.title || '').trim().toLowerCase();
                const semanticKey = `sem_hist_${normalizedTitle}`;

                const existing = dedupMap.get(task.id) || (task.taskId ? dedupMap.get(task.taskId) : undefined) || dedupMap.get(semanticKey);

                if (!existing) {
                    dedupMap.set(task.id, task);
                    if (task.taskId) dedupMap.set(task.taskId, task);
                    dedupMap.set(semanticKey, task);
                } else {
                    const merged: TaskHistoryItem = {
                        ...existing,
                        ...task,
                        status: (existing.status === 'completed' || task.status === 'completed') ? 'completed' : 'pending_review',
                        description: task.description || existing.description,
                        coachComment: task.coachComment || existing.coachComment,
                        submittedAt: task.submittedAt || existing.submittedAt,
                        approvedAt: task.approvedAt || existing.approvedAt,
                        completedAt: task.completedAt || existing.completedAt
                    };
                    dedupMap.set(existing.id, merged);
                    dedupMap.set(task.id, merged);
                    if (task.taskId) dedupMap.set(task.taskId, merged);
                    dedupMap.set(semanticKey, merged);
                }
            });

            const uniqueTasks = Array.from(
                new Map(Array.from(dedupMap.values()).map(t => [t.id, t])).values()
            );

            setFirestoreTasks(uniqueTasks);
            setHasLoadedOnce(true);
        };

        const parseTimestamp = (val: any): number | undefined => {
            if (!val) return undefined;
            if (typeof val === 'number') return val;
            if (val.seconds) return val.seconds * 1000;
            if (typeof val === 'string') {
                const p = Date.parse(val);
                return isNaN(p) ? undefined : p;
            }
            return undefined;
        };

        const isTaskForMe = (d: any): boolean => {
            if (!d) return false;
            const docStudentId = d.studentId ? String(d.studentId).trim() : null;
            const docStudentUid = d.studentUid ? String(d.studentUid).trim() : null;
            const docStudentName = (d.studentName || d.student || '').toLowerCase().trim();
            const docGroupId = d.groupId ? String(d.groupId).trim() : null;
            const docGroupName = (d.groupName || d.group || '').toLowerCase().trim();

            if (docStudentId && candidateStudentIds.includes(docStudentId)) return true;
            if (docStudentUid && candidateStudentIds.includes(docStudentUid)) return true;
            if (docStudentName && studentNameTokens.length > 0 && studentNameTokens.some(t => docStudentName.includes(t))) return true;

            const isGroupScope = Boolean(d.isGroupWide === true || d.targetType === 'group' || (!docStudentId && !docStudentUid));
            if (isGroupScope) {
                if (docGroupId && candidateGroupIds.includes(docGroupId)) return true;
                if (docGroupName && groupNameTokens.length > 0 && groupNameTokens.some(t => docGroupName.includes(t))) return true;
                if (candidateGroupIds.length === 0 && groupNameTokens.length === 0) return true;
            }
            return false;
        };

        // Source 1: Direct completed and submission tasks by student IDs
        candidateStudentIds.forEach(sId => {
            try {
                const qCompleted = query(collection(db, 'completed_tasks'), where('studentId', '==', sId));
                unsubs.push(onSnapshot(qCompleted, async (snap) => {
                    for (const docSnap of snap.docs) {
                        const d = docSnap.data();
                        let title = d.title || d.taskTitle;
                        let description = d.description || d.taskDescription;
                        let rewardCoins = Number(d.rewardCoins) || 30;
                        let rewardXp = Number(d.rewardXp) || 50;
                        let coachName = d.coachName || 'Тренер';

                        if (!title && d.taskId) {
                            try {
                                const assignedSnap = await getDoc(doc(db, 'assigned_tasks', d.taskId));
                                if (assignedSnap.exists()) {
                                    const ad = assignedSnap.data();
                                    title = ad.title || ad.taskTitle;
                                    description = ad.description || ad.taskDescription;
                                    rewardCoins = Number(ad.rewardCoins) || rewardCoins;
                                    rewardXp = Number(ad.rewardXp) || rewardXp;
                                    coachName = ad.coachName || coachName;
                                }
                            } catch (e) {
                                console.warn('Error fetching assigned_tasks doc for title:', e);
                            }
                        }

                        tasksMap.set(docSnap.id, {
                            id: docSnap.id,
                            taskId: d.taskId,
                            title: title || 'Выполненное задание',
                            description: description,
                            coachName: coachName,
                            coachComment: d.coachComment || d.reviewComment || d.feedback,
                            status: d.status === 'completed' ? 'completed' : 'pending_review',
                            rewardCoins: rewardCoins,
                            rewardXp: rewardXp,
                            submittedAt: parseTimestamp(d.submittedAt) || parseTimestamp(d.createdAt) || Date.now(),
                            approvedAt: parseTimestamp(d.approvedAt) || parseTimestamp(d.completedAt),
                            completedAt: parseTimestamp(d.completedAt) || parseTimestamp(d.approvedAt),
                            assignedAt: parseTimestamp(d.assignedAt) || parseTimestamp(d.createdAt),
                            dueDate: d.dueDate
                        });
                    }
                    syncToState();
                }));
            } catch (e) {
                console.warn('completed_tasks error:', e);
            }

            try {
                const qSubmissions = query(collection(db, 'homework_submissions'), where('studentId', '==', sId));
                unsubs.push(onSnapshot(qSubmissions, (snap) => {
                    snap.docs.forEach(docSnap => {
                        const d = docSnap.data();
                        const key = d.homeworkId || docSnap.id;
                        const existing = tasksMap.get(key);
                        tasksMap.set(key, {
                            id: key,
                            title: d.title || existing?.title || 'Сданное задание',
                            description: d.description || existing?.description,
                            coachName: d.coachName || existing?.coachName || 'Тренер',
                            coachComment: d.coachComment || d.reviewComment || existing?.coachComment,
                            status: d.status || 'completed',
                            rewardCoins: Number(d.rewardCoins || existing?.rewardCoins) || 30,
                            rewardXp: Number(d.rewardXp || existing?.rewardXp) || 50,
                            submittedAt: parseTimestamp(d.submittedAt) || parseTimestamp(d.createdAt) || Date.now(),
                            approvedAt: parseTimestamp(d.approvedAt) || parseTimestamp(d.completedAt),
                            completedAt: parseTimestamp(d.completedAt) || parseTimestamp(d.submittedAt),
                            assignedAt: existing?.assignedAt || parseTimestamp(d.createdAt) || Date.now(),
                            dueDate: d.dueDate || existing?.dueDate
                        });
                    });
                    syncToState();
                }));
            } catch (e) {
                console.warn('homework_submissions error:', e);
            }
        });

        // Source 2: Broad collection inspection
        try {
            unsubs.push(onSnapshot(query(collection(db, 'homework'), limit(50)), snap => {
                snap.docs.forEach(docSnap => {
                    const d = docSnap.data();
                    if (isTaskForMe(d) && !tasksMap.has(docSnap.id)) {
                        tasksMap.set(docSnap.id, {
                            id: docSnap.id,
                            title: d.title || 'Домашнее задание',
                            description: d.description,
                            coachName: d.coachName || 'Тренер',
                            coachComment: d.coachComment || d.reviewComment || d.feedback,
                            status: d.status || 'assigned',
                            rewardCoins: Number(d.rewardCoins) || 30,
                            rewardXp: Number(d.rewardXp) || 50,
                            assignedAt: parseTimestamp(d.createdAt) || parseTimestamp(d.assignedAt) || Date.now(),
                            submittedAt: parseTimestamp(d.submittedAt),
                            approvedAt: parseTimestamp(d.approvedAt) || parseTimestamp(d.completedAt),
                            completedAt: parseTimestamp(d.completedAt) || parseTimestamp(d.submittedAt),
                            dueDate: d.dueDate
                        });
                    }
                });
                syncToState();
            }));
        } catch (e) {
            console.warn('homework broad error:', e);
        }

        const timer = setTimeout(() => {
            setHasLoadedOnce(true);
        }, 500);

        return () => {
            unsubs.forEach(u => u());
            clearTimeout(timer);
        };
    }, [isOpen, candidateStudentIds, candidateGroupIds, studentNameTokens, groupNameTokens]);

    // Merge tasks & sort in realtime by submittedAt / approvedAt desc
    const allTasks: TaskHistoryItem[] = useMemo(() => {
        return [...firestoreTasks].sort((a, b) => {
            const timeA = Number(a.approvedAt || a.submittedAt || a.completedAt || a.assignedAt || 0);
            const timeB = Number(b.approvedAt || b.submittedAt || b.completedAt || b.assignedAt || 0);
            return timeB - timeA;
        });
    }, [firestoreTasks]);

    // Dynamic Summary Metrics
    const completedTasksList = useMemo(() => {
        return allTasks.filter(t => t.status === 'completed');
    }, [allTasks]);

    const completedCount = completedTasksList.length;

    const totalEarnedCoins = useMemo(() => {
        return completedTasksList.reduce((sum, t) => sum + (t.rewardCoins || 0), 0);
    }, [completedTasksList]);

    const pendingCount = useMemo(() => {
        return allTasks.filter(t => t.status === 'pending_review').length;
    }, [allTasks]);

    // Filtered tasks list based on selected chip & search query
    const filteredTasks = useMemo(() => {
        return allTasks.filter(task => {
            if (activeFilter === 'completed' && task.status !== 'completed') return false;
            if (activeFilter === 'pending' && task.status !== 'pending_review') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = task.title.toLowerCase().includes(q);
                const descMatch = task.description?.toLowerCase().includes(q) || false;
                const coachMatch = task.coachName?.toLowerCase().includes(q) || false;
                return titleMatch || descMatch || coachMatch;
            }
            return true;
        });
    }, [allTasks, activeFilter, searchQuery]);

    const formatDate = (timestamp?: string | number) => {
        if (!timestamp) return 'Недавно';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Недавно';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month}.${date.getFullYear()}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Background glow */}
                    <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* 1. HEADER WITH SUMMARY STATS */}
                    <div className="p-5 sm:p-6 border-b border-white/10 relative z-10 bg-zinc-900/50 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                        <span>🏆 Мои выполненные задания</span>
                                    </h2>
                                </div>
                                <p className="text-xs sm:text-sm text-zinc-400">
                                    История тренировочных челленджей, похвалы тренера и наград {userName}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
                                title="Закрыть"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Badges: Clean stats */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            {/* Card A: Completed Tasks */}
                            <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                                        Всего выполнено
                                    </span>
                                    <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-1">
                                        <span>{completedCount}</span>
                                        <span className="text-xs font-bold text-emerald-400">заданий</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                    <CheckCircle2 size={20} />
                                </div>
                            </div>

                            {/* Card B: Earned Coins */}
                            <div className="bg-gradient-to-br from-amber-500/15 to-amber-950/30 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                                        Заработано монет
                                    </span>
                                    <div className="text-xl sm:text-2xl font-black text-amber-300 flex items-baseline gap-1.5">
                                        <span>+{totalEarnedCoins}</span>
                                        <SpartaCoinIcon size={16} animate />
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                                    <Trophy size={20} />
                                </div>
                            </div>
                        </div>

                        {/* Search Bar & Filters */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                            {/* Filter Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                        activeFilter === 'all'
                                            ? 'bg-white text-black shadow-md'
                                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    Все ({allTasks.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('completed')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                        activeFilter === 'completed'
                                            ? 'bg-emerald-500 text-black shadow-md font-black'
                                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    <span>✅ Выполненные ({completedCount})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilter('pending')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                                        activeFilter === 'pending'
                                            ? 'bg-amber-500 text-black shadow-md font-black'
                                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    <span>⏳ На проверке ({pendingCount})</span>
                                </button>
                            </div>

                            {/* Search Input */}
                            <div className="relative min-w-[180px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Поиск по названию..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-white/30 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. TASK LIST BODY */}
                    <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 relative z-10">
                        {filteredTasks.length === 0 ? (
                            <div className="py-16 text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-3xl">
                                    📜
                                </div>
                                <div className="space-y-1 max-w-sm mx-auto">
                                    <h4 className="text-sm font-bold text-white">
                                        {searchQuery ? 'Ничего не найдено' : 'Заданий пока нет'}
                                    </h4>
                                    <p className="text-xs text-zinc-400">
                                        {searchQuery
                                            ? 'Попробуйте изменить поисковый запрос.'
                                            : 'Выполняйте упражнения от тренера, чтобы получать монеты и прокачивать уровень!'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredTasks.map((task) => {
                                const isCompleted = task.status === 'completed';
                                const isPending = task.status === 'pending_review';

                                return (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden ${
                                            isCompleted
                                                ? 'bg-white/[0.02] border-emerald-500/20 hover:border-emerald-500/40'
                                                : isPending
                                                ? 'bg-amber-500/[0.03] border-amber-500/30 hover:border-amber-500/50'
                                                : 'bg-white/[0.02] border-white/10'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-3">
                                            {/* Row 1: Header + Badges */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-bold text-sm sm:text-base text-white">
                                                            {task.title}
                                                        </h3>

                                                        {/* Status Badge */}
                                                        {isCompleted ? (
                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                                                <CheckCircle2 size={12} />
                                                                <span>Выполнено</span>
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                                                <Clock size={12} />
                                                                <span>На проверке</span>
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold flex items-center gap-1">
                                                                <span>⚡ В процессе</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Task Description */}
                                                    {task.description && (
                                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Coin Reward Badge */}
                                                <div className="shrink-0 flex flex-col items-end">
                                                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-bold shadow-sm">
                                                        <SpartaCoinIcon size={14} animate={false} />
                                                        <span>+{task.rewardCoins || 30}</span>
                                                    </span>
                                                    {task.rewardXp ? (
                                                        <span className="text-[10px] text-zinc-400 font-semibold mt-1">
                                                            +{task.rewardXp} XP
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* Row 2: Coach Comment / Feedback Card */}
                                            {task.coachComment && (
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2.5">
                                                    <MessageSquareQuote size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                                    <div className="space-y-0.5 leading-relaxed">
                                                        <p className="font-semibold text-emerald-200">
                                                            Тренер {task.coachName || 'Тренер'}:
                                                        </p>
                                                        <p className="italic text-emerald-300/90">
                                                            «{task.coachComment}»
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 3: Metadata Footer (Date & Coach Name) */}
                                            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/5 gap-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        <span>{formatDate(task.approvedAt || task.submittedAt || task.assignedAt)}</span>
                                                    </span>
                                                    {task.coachName && (
                                                        <span className="flex items-center gap-1 text-zinc-400">
                                                            <UserCheck size={12} />
                                                            <span>Тренер: {task.coachName}</span>
                                                        </span>
                                                    )}
                                                </div>

                                                {isCompleted && (
                                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                        <span>Награда начислена</span>
                                                        <span>✓</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* 3. FOOTER ACTION */}
                    <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between gap-3 relative z-10">
                        <p className="text-xs text-zinc-400">
                            Всего выполнено: <strong className="text-white">{completedCount}</strong> челленджей
                        </p>

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer active:scale-95"
                        >
                            Закрыть
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TaskHistoryModal;
