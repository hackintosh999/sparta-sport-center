import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, ChevronDown, CheckCheck, Clock, Calendar, Trophy
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { SpartaCoinIcon } from '../SpartaCoinIcon';
import confetti from 'canvas-confetti';

export interface TaskItem {
    id: string;
    taskId?: string;
    title: string;
    description?: string;
    coachName?: string;
    coachComment?: string;
    status: 'active' | 'pending_review' | 'completed';
    rewardCoins: number;
    rewardXp: number;
    assignedAt?: number;
    submittedAt?: number;
    approvedAt?: number;
    dueDate?: string;
    icon?: string;
    studentId?: string;
    studentUid?: string;
    studentName?: string;
    isGroupWide?: boolean;
    isRead?: boolean;
    createdAt?: number;
}

interface CompactTaskListProps {
    studentId?: string;
    groupId?: string;
    studentName?: string;
    userProfile?: any;
    onOpenHistory?: () => void;
    triggerToast?: (msg: string) => void;
}

export const CompactTaskList: React.FC<CompactTaskListProps> = ({
    studentId,
    groupId,
    studentName = 'Чемпион',
    userProfile,
    onOpenHistory,
    triggerToast
}) => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [activeFilter, setActiveFilter] = useState<'active' | 'pending' | 'completed'>('active');
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // 1. Candidate student IDs (Auth UID, doc ID, child ID, student ID)
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

    // 2. Candidate group IDs
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

    // 3. Name & Group search tokens for fuzzy matching
    const studentNameTokens = useMemo(() => {
        const rawNames = [
            studentName,
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
    }, [studentName, userProfile]);

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

    // 4. Realtime Multi-source Listeners with Discovery Engine
    useEffect(() => {
        const tasksMap = new Map<string, TaskItem>();
        const completedMap = new Map<string, { status: 'completed' | 'pending_review'; approvedAt?: number; submittedAt?: number; coachComment?: string }>();
        const unsubs: Array<() => void> = [];

        const syncTasks = () => {
            const rawList: TaskItem[] = [];
            tasksMap.forEach((task, id) => {
                const override = completedMap.get(id) || (task.taskId ? completedMap.get(task.taskId) : undefined);
                if (override) {
                    rawList.push({
                        ...task,
                        status: override.status,
                        approvedAt: override.approvedAt || task.approvedAt,
                        submittedAt: override.submittedAt || task.submittedAt,
                        coachComment: override.coachComment || task.coachComment
                    });
                } else {
                    rawList.push(task);
                }
            });

            // 1. Semantic Deduplication & Property Merging (handles multi-collection cross-references)
            const dedupMap = new Map<string, TaskItem>();

            rawList.forEach(task => {
                const normalizedTitle = (task.title || '').trim().toLowerCase();
                const targetScope = task.studentId || task.studentUid || (task.isGroupWide ? 'group' : 'all');
                const semanticKey = `sem_${normalizedTitle}___${targetScope}`;

                const existing = dedupMap.get(task.id) || (task.taskId ? dedupMap.get(task.taskId) : undefined) || dedupMap.get(semanticKey);

                if (!existing) {
                    dedupMap.set(task.id, task);
                    if (task.taskId) dedupMap.set(task.taskId, task);
                    dedupMap.set(semanticKey, task);
                } else {
                    const mergedTask: TaskItem = {
                        ...existing,
                        ...task,
                        // Priority status: completed > pending_review > active
                        status: (existing.status === 'completed' || task.status === 'completed') ? 'completed'
                              : (existing.status === 'pending_review' || task.status === 'pending_review') ? 'pending_review'
                              : 'active',
                        description: task.description || existing.description,
                        coachComment: task.coachComment || existing.coachComment,
                        dueDate: task.dueDate || existing.dueDate,
                        rewardCoins: task.rewardCoins || existing.rewardCoins,
                        rewardXp: task.rewardXp || existing.rewardXp,
                        submittedAt: task.submittedAt || existing.submittedAt,
                        approvedAt: task.approvedAt || existing.approvedAt
                    };

                    dedupMap.set(existing.id, mergedTask);
                    dedupMap.set(task.id, mergedTask);
                    if (task.taskId) dedupMap.set(task.taskId, mergedTask);
                    dedupMap.set(semanticKey, mergedTask);
                }
            });

            // 2. Strict ID Deduplication as requested
            const uniqueTasks = Array.from(
                new Map(Array.from(dedupMap.values()).map(task => [task.id, task])).values()
            );

            setTasks(uniqueTasks);
            setHasLoaded(true);
        };

        const parseTime = (val: any): number | undefined => {
            if (!val) return undefined;
            if (typeof val === 'number') return val;
            if (val.seconds) return val.seconds * 1000;
            if (typeof val === 'string') {
                const p = Date.parse(val);
                return isNaN(p) ? undefined : p;
            }
            return undefined;
        };

        const detectIcon = (title: string): string => {
            const t = title.toLowerCase();
            if (t.includes('мяч') || t.includes('пас') || t.includes('гол') || t.includes('футбол') || t.includes('набив')) return '⚽';
            if (t.includes('бег') || t.includes('челнок') || t.includes('кросс') || t.includes('спринт')) return '🏃';
            if (t.includes('планк') || t.includes('растяж') || t.includes('баланс') || t.includes('гибкост')) return '🧘';
            if (t.includes('отжим') || t.includes('пресс') || t.includes('присед') || t.includes('сил')) return '💪';
            return '⚡';
        };

        const processTaskDoc = (docId: string, d: any) => {
            if (!d) return;

            const docStudentId = d.studentId ? String(d.studentId).trim() : null;
            const docStudentUid = d.studentUid ? String(d.studentUid).trim() : null;
            const docStudentName = (d.studentName || d.student || '').toLowerCase().trim();
            const docGroupId = d.groupId ? String(d.groupId).trim() : null;
            const docGroupName = (d.groupName || d.group || '').toLowerCase().trim();

            // Personal Matching Logic
            let isPersonal = false;
            if (docStudentId && candidateStudentIds.includes(docStudentId)) {
                isPersonal = true;
            } else if (docStudentUid && candidateStudentIds.includes(docStudentUid)) {
                isPersonal = true;
            } else if (docStudentName && studentNameTokens.length > 0) {
                if (studentNameTokens.some(t => docStudentName.includes(t))) {
                    isPersonal = true;
                }
            }

            // Group Matching Logic
            let isGroup = false;
            const isGroupScope = Boolean(d.isGroupWide === true || d.targetType === 'group' || (!docStudentId && !docStudentUid));
            if (isGroupScope) {
                if (docGroupId && candidateGroupIds.includes(docGroupId)) {
                    isGroup = true;
                } else if (docGroupName && groupNameTokens.length > 0) {
                    if (groupNameTokens.some(t => docGroupName.includes(t))) {
                        isGroup = true;
                    }
                } else if (candidateGroupIds.length === 0 && groupNameTokens.length === 0) {
                    isGroup = true;
                }
            }

            if (!isPersonal && !isGroup) return;

            const rawStatus = (d.status || 'active').toLowerCase();
            const st: 'active' | 'pending_review' | 'completed' =
                rawStatus === 'completed' ? 'completed' :
                (rawStatus === 'pending_review' || rawStatus === 'pending' ? 'pending_review' : 'active');

            const title = d.title || d.taskTitle || 'Задание от тренера';
            tasksMap.set(docId, {
                id: docId,
                taskId: d.taskId || docId,
                title: title,
                description: d.description || d.taskDescription,
                coachName: d.coachName || 'Тренер',
                coachComment: d.coachComment || d.reviewComment || d.feedback,
                status: st,
                rewardCoins: Number(d.rewardCoins || d.coins) || 30,
                rewardXp: Number(d.rewardXp || d.xp) || 50,
                assignedAt: parseTime(d.createdAt) || parseTime(d.assignedAt) || Date.now(),
                submittedAt: parseTime(d.submittedAt),
                approvedAt: parseTime(d.approvedAt) || parseTime(d.completedAt),
                dueDate: d.dueDate || d.deadline,
                icon: detectIcon(title),
                studentId: docStudentId || undefined,
                studentUid: docStudentUid || undefined,
                studentName: d.studentName || undefined,
                isGroupWide: isGroup && !isPersonal,
                isRead: d.isRead ?? true,
                createdAt: parseTime(d.createdAt)
            });
        };

        // Source 1: Broad Listeners (recent 50 tasks from homework, trainingPlan, assigned_tasks)
        try {
            unsubs.push(onSnapshot(query(collection(db, 'homework'), limit(50)), snap => {
                snap.docs.forEach(d => processTaskDoc(d.id, d.data()));
                syncTasks();
            }));
        } catch (e) {
            console.warn('homework collection listener error:', e);
        }

        try {
            unsubs.push(onSnapshot(query(collection(db, 'trainingPlan'), limit(50)), snap => {
                snap.docs.forEach(d => processTaskDoc(d.id, d.data()));
                syncTasks();
            }));
        } catch (e) {
            console.warn('trainingPlan collection listener error:', e);
        }

        try {
            unsubs.push(onSnapshot(query(collection(db, 'assigned_tasks'), limit(50)), snap => {
                snap.docs.forEach(d => processTaskDoc(d.id, d.data()));
                syncTasks();
            }));
        } catch (e) {
            console.warn('assigned_tasks collection listener error:', e);
        }

        // Source 2: Direct listeners by candidate student IDs
        candidateStudentIds.forEach(sId => {
            try {
                unsubs.push(onSnapshot(query(collection(db, 'completed_tasks'), where('studentId', '==', sId)), snap => {
                    snap.docs.forEach(d => {
                        const data = d.data();
                        const key = data.taskId || d.id;
                        completedMap.set(key, {
                            status: data.status === 'completed' ? 'completed' : 'pending_review',
                            approvedAt: parseTime(data.approvedAt) || parseTime(data.completedAt),
                            submittedAt: parseTime(data.submittedAt),
                            coachComment: data.coachComment || data.reviewComment
                        });
                    });
                    syncTasks();
                }));
            } catch (e) {
                console.warn('completed_tasks error:', e);
            }

            try {
                unsubs.push(onSnapshot(query(collection(db, 'homework_submissions'), where('studentId', '==', sId)), snap => {
                    snap.docs.forEach(d => {
                        const data = d.data();
                        const key = data.homeworkId || d.id;
                        completedMap.set(key, {
                            status: data.status === 'completed' ? 'completed' : 'pending_review',
                            approvedAt: parseTime(data.approvedAt) || parseTime(data.completedAt),
                            submittedAt: parseTime(data.submittedAt),
                            coachComment: data.coachComment || data.reviewComment
                        });
                    });
                    syncTasks();
                }));
            } catch (e) {
                console.warn('homework_submissions error:', e);
            }

            try {
                unsubs.push(onSnapshot(doc(db, 'users', sId), snap => {
                    if (snap.exists()) {
                        const uData = snap.data();
                        if (Array.isArray(uData.personalAssignments)) {
                            uData.personalAssignments.forEach((pa: any) => {
                                if (pa?.id && pa?.title) {
                                    processTaskDoc(pa.id, {
                                        ...pa,
                                        studentId: sId,
                                        isGroupWide: false
                                    });
                                }
                            });
                            syncTasks();
                        }
                    }
                }));
            } catch (e) {
                console.warn('user doc error:', e);
            }
        });

        // Source 3: Direct listeners for group documents
        candidateGroupIds.forEach(gId => {
            try {
                unsubs.push(onSnapshot(doc(db, 'groups', gId), snap => {
                    if (snap.exists()) {
                        const gData = snap.data();
                        if (gData.weeklyChallengeTitle) {
                            processTaskDoc(`group_challenge_${gId}`, {
                                id: `group_challenge_${gId}`,
                                title: gData.weeklyChallengeTitle,
                                description: 'Групповой челлендж недели от тренера',
                                rewardCoins: 30,
                                rewardXp: Number(gData.weeklyChallengeReward) || 50,
                                dueDate: gData.weeklyChallengeDeadline,
                                groupId: gId,
                                isGroupWide: true,
                                status: 'active',
                                createdAt: gData.updatedAt ? Date.parse(gData.updatedAt) : Date.now()
                            });
                            syncTasks();
                        }
                    }
                }));
            } catch (e) {
                console.warn('group doc error:', e);
            }
        });

        const timer = setTimeout(() => {
            setHasLoaded(true);
        }, 400);

        return () => {
            unsubs.forEach(u => u());
            clearTimeout(timer);
        };
    }, [candidateStudentIds, candidateGroupIds, studentNameTokens, groupNameTokens]);

    const allTasks: TaskItem[] = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const timeA = Number(a.assignedAt || a.createdAt || 0);
            const timeB = Number(b.assignedAt || b.createdAt || 0);
            return timeB - timeA;
        });
    }, [tasks]);

    // Counters
    const activeTasks = useMemo(() => allTasks.filter(t => t.status === 'active'), [allTasks]);
    const pendingTasks = useMemo(() => allTasks.filter(t => t.status === 'pending_review'), [allTasks]);
    const completedTasks = useMemo(() => allTasks.filter(t => t.status === 'completed'), [allTasks]);

    const activeCount = activeTasks.length;
    const pendingCount = pendingTasks.length;
    const completedCount = completedTasks.length;

    // Filtered tasks
    const displayedTasks = useMemo(() => {
        if (activeFilter === 'active') return activeTasks;
        if (activeFilter === 'pending') return pendingTasks;
        return completedTasks;
    }, [activeFilter, activeTasks, pendingTasks, completedTasks]);

    // Automatically expand the first item in active list if none selected
    useEffect(() => {
        if (displayedTasks.length > 0 && !expandedTaskId) {
            setExpandedTaskId(displayedTasks[0].id);
        }
    }, [displayedTasks, expandedTaskId]);

    // Top active task reward
    const currentTopReward = useMemo(() => {
        if (activeTasks.length > 0) return activeTasks[0].rewardCoins;
        if (allTasks.length > 0) return allTasks[0].rewardCoins;
        return 30;
    }, [activeTasks, allTasks]);

    // Action: Submit task
    const handleCompleteTask = async (task: TaskItem) => {
        if (submittingId) return;
        setSubmittingId(task.id);

        try {
            // Optimistic UI update
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'pending_review', submittedAt: Date.now() } : t));

            const primaryStudentId = candidateStudentIds[0] || studentId || 'student';

            // 1. Write to completed_tasks
            const completedRef = doc(collection(db, 'completed_tasks'), `${primaryStudentId}_${task.id}`);
            await setDoc(completedRef, {
                studentId: primaryStudentId,
                studentName: studentName,
                taskId: task.id,
                title: task.title,
                description: task.description || '',
                rewardCoins: task.rewardCoins,
                rewardXp: task.rewardXp,
                status: 'pending_review',
                submittedAt: serverTimestamp(),
                coachName: task.coachName || 'Тренер'
            }, { merge: true });

            // 2. Write to homework_submissions
            const subRef = doc(collection(db, 'homework_submissions'), `${primaryStudentId}_${task.id}`);
            await setDoc(subRef, {
                id: `${primaryStudentId}_${task.id}`,
                homeworkId: task.id,
                taskId: task.taskId || task.id,
                studentId: primaryStudentId,
                studentName: studentName || 'Ученик',
                title: task.title,
                description: task.description || '',
                rewardCoins: task.rewardCoins || 30,
                rewardXp: task.rewardXp || 50,
                groupId: candidateGroupIds[0] || groupId || '',
                coachName: task.coachName || 'Тренер',
                status: 'pending_review',
                submittedAt: serverTimestamp()
            }, { merge: true });

            // 3. Update homework / trainingPlan / assigned_tasks
            try {
                const hwRef = doc(db, 'homework', task.id);
                await updateDoc(hwRef, {
                    status: 'pending_review',
                    submittedAt: serverTimestamp()
                });
            } catch (e) {}

            try {
                const tpRef = doc(db, 'trainingPlan', task.id);
                await updateDoc(tpRef, {
                    status: 'pending_review',
                    submittedAt: serverTimestamp()
                });
            } catch (e) {}

            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
            });

            setActiveFilter('pending');
            triggerToast?.(`Задание «${task.title}» отправлено тренеру на проверку! ⏳`);
        } catch (err) {
            console.error('Error submitting task:', err);
            triggerToast?.('Не удалось отправить задание. Попробуйте еще раз.');
        } finally {
            setSubmittingId(null);
        }
    };

    const isTaskNew = (task: TaskItem): boolean => {
        if (task.status !== 'active') return false;
        const time = task.assignedAt || task.createdAt;
        if (!time) return false;
        return (Date.now() - time) < 24 * 60 * 60 * 1000;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-[#121c18] via-[#0f1714] to-[#0a100d] border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-3.5"
        >
            {/* 1. HEADER */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                        <Zap size={14} className="fill-emerald-400" />
                        <span>Задания от тренера</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                        {activeCount} активных
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {onOpenHistory && (
                        <button
                            type="button"
                            onClick={onOpenHistory}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                            title="Посмотреть все выполненные задания и полученные награды"
                        >
                            <span>🏆 Выполнено ({completedCount})</span>
                        </button>
                    )}

                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold shadow-sm">
                        <SpartaCoinIcon size={14} animate />
                        <span>+{currentTopReward} монет</span>
                    </span>
                </div>
            </div>

            {/* 2. FILTER CHIPS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                    type="button"
                    onClick={() => {
                        setActiveFilter('active');
                        if (activeTasks.length > 0) setExpandedTaskId(activeTasks[0].id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        activeFilter === 'active'
                            ? 'bg-emerald-500 text-black font-black shadow-emerald-500/20 shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                    }`}
                >
                    <span>⚡ Активные ({activeCount})</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setActiveFilter('pending');
                        if (pendingTasks.length > 0) setExpandedTaskId(pendingTasks[0].id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        activeFilter === 'pending'
                            ? 'bg-amber-500 text-black font-black shadow-amber-500/20 shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                    }`}
                >
                    <span>⏳ На проверке ({pendingCount})</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setActiveFilter('completed');
                        if (completedTasks.length > 0) setExpandedTaskId(completedTasks[0].id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        activeFilter === 'completed'
                            ? 'bg-white text-black font-black shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                    }`}
                >
                    <span>✅ Выполненные ({completedCount})</span>
                </button>
            </div>

            {/* 3. ACCORDION TASK LIST */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {displayedTasks.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-black/30 border border-white/5 text-center space-y-2">
                        <div className="text-2xl">
                            {activeFilter === 'active' ? '🎉' : (activeFilter === 'pending' ? '⏳' : '🏆')}
                        </div>
                        <p className="text-xs text-zinc-300 font-medium">
                            {activeFilter === 'active'
                                ? 'Все задания выполнены! Ты красавчик, жди новых упражнений от тренера ⚽'
                                : (activeFilter === 'pending'
                                    ? 'Нет заданий на проверке. Выполняй активные упражнения!'
                                    : 'Здесь появятся принятые тренером задания.')}
                        </p>
                    </div>
                ) : (
                    displayedTasks.map((task) => {
                        const isExpanded = expandedTaskId === task.id;
                        const isCompleted = task.status === 'completed';
                        const isPending = task.status === 'pending_review';
                        const isPersonal = !task.isGroupWide;
                        const isNew = isTaskNew(task);

                        return (
                            <div
                                key={task.id}
                                className={`rounded-2xl border transition-all overflow-hidden ${
                                    isExpanded
                                        ? 'bg-black/50 border-emerald-500/40 shadow-lg'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                }`}
                            >
                                {/* Compact Row Click to Expand */}
                                <button
                                    type="button"
                                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                                    className="w-full p-3 flex items-center justify-between gap-2.5 text-left cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-base shrink-0">{task.icon || '⚽'}</span>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <h4 className="text-sm font-bold text-white truncate">
                                                    {task.title}
                                                </h4>

                                                {/* Scope Badge */}
                                                {isPersonal ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold shrink-0">
                                                        👤 Персональное
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-zinc-300 text-[10px] font-bold shrink-0">
                                                        👥 Для группы
                                                    </span>
                                                )}

                                                {/* Hot New Badge */}
                                                {isNew && (
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold animate-pulse shrink-0 flex items-center gap-1">
                                                        🔥 Новое
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                                            <SpartaCoinIcon size={12} animate={false} />
                                            <span>+{task.rewardCoins}</span>
                                        </span>
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-white/40"
                                        >
                                            <ChevronDown size={16} />
                                        </motion.div>
                                    </div>
                                </button>

                                {/* Expanded Content (Advice & Action Button) */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-white/5"
                                        >
                                            {/* Description / Tip */}
                                            {task.description && (
                                                <p className="text-xs text-zinc-400 flex items-start gap-1.5 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                                    <span className="text-amber-400 shrink-0">💡</span>
                                                    <span>{task.description}</span>
                                                </p>
                                            )}

                                            {/* Coach Feedback if completed */}
                                            {isCompleted && task.coachComment && (
                                                <p className="text-xs text-emerald-300 flex items-start gap-1.5 leading-relaxed">
                                                    <span className="shrink-0">💬</span>
                                                    <span>
                                                        <strong className="text-emerald-200">Тренер {task.coachName || 'Тренер'}:</strong> «{task.coachComment}»
                                                    </span>
                                                </p>
                                            )}

                                            {/* Action Button or Status Card */}
                                            <div>
                                                {isCompleted ? (
                                                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2">
                                                        <CheckCheck size={16} className="text-emerald-400" />
                                                        <span>🎉 Принято! Получено +{task.rewardCoins} монет • +{task.rewardXp} XP</span>
                                                    </div>
                                                ) : isPending ? (
                                                    <div className="w-full py-2 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2">
                                                        <Clock size={16} className="text-amber-400 animate-spin" />
                                                        <span>⏳ На проверке у тренера</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCompleteTask(task)}
                                                        disabled={submittingId === task.id}
                                                        className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                                                    >
                                                        <span>✅ Сдать задание (+{task.rewardCoins} монет • +{task.rewardXp} XP)</span>
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 4. BOTTOM ARCHIVE LINK */}
            {onOpenHistory && (
                <div className="pt-2 border-t border-white/5">
                    <button
                        type="button"
                        onClick={onOpenHistory}
                        className="w-full text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 py-1 font-medium group"
                        title="Посмотреть все выполненные задания и полученные награды"
                    >
                        <span>🏆 Мои выполненные задания ({completedCount})</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default CompactTaskList;
