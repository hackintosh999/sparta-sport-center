import React, { memo, useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    FileText,
    Zap,
    PlusCircle,
    ChevronDown,
    CheckCircle,
    CreditCard,
    Clock,
    Phone,
    TrendingUp,
    Heart,
    User,
    ArrowRightLeft,
    MessageSquare,
    X,
    Settings,
    Search,
    MoreVertical,
    CheckCircle2,
    Calendar,
    Sparkles,
    AlertTriangle,
    PauseCircle,
    Edit3,
    Trash2,
    Loader2,
    Trash2 as TrashIcon
} from 'lucide-react';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getSmartSubscriptionStatus, checkProfileCompleteness } from '../../../utils/subscriptionStatusEngine';
import CoachReviewDashboard from './CoachReviewDashboard';

interface Student {
    id: string;
    name: string;
    childName?: string;
    displayName?: string;
    type: 'trial' | 'registry' | 'offline' | 'real' | string;
    isRegistered: boolean;
    status?: 'active' | 'at_risk' | 'inactive' | 'trial' | 'frozen';
    statusLabel?: string;
    phone?: string;
    parentPhone?: string;
    position?: string;
    sport?: string;
    birthYear?: number;
    birthDate?: any;
    childBirthYear?: number | string;
    age?: number;
    source?: string;
    originalUser?: any;
    assignedUid?: string;
    subscription?: any;
    paymentStatus?: 'paid' | 'due' | 'unpaid';
    paymentDate?: string;
    debtAmount?: number;
    isOverdue?: boolean;
    isFrozen?: boolean;
    medCertificate?: any;
    medicalCertificate?: any;
    medicalNoteUrl?: string;
    medicalClearance?: any;
}

interface RosterJournalTabProps {
    theme?: string;
    myGroups: any[];
    selectedGroupId: string | null;
    setSelectedGroupId: (id: string | null) => void;
    groupStudents: Student[];
    myStudents: any[];
    rosterFilter: string;
    setRosterFilter: (filter: any) => void;
    studentAttendanceStats: Record<string, { rate: number; present?: number; total?: number }>;
    onlineStatuses: Record<string, { online: boolean }>;
    attendanceDate: string;
    setAttendanceDate: (date: string) => void;
    homeworkTasks: any[];
    handleViewStudentProfile: (student: any) => void;
    setStudentToTransfer: (student: any) => void;
    setIsTransferModalOpen: (open: boolean) => void;
    handleContactParent: (student: any) => void;
    isCompleteProfile: (s: any) => boolean;
    handleTogglePayment?: (studentId: string, currentStatus: string) => Promise<void>;
    setIsAssignmentModalOpen: (open: boolean) => void;
    handleAssignPersonalTask?: (student: any) => void;
    handleEditAssignment?: (task: any) => void;
    handleDeleteAssignment?: (task: any) => Promise<void>;
}

const RosterJournalTab: React.FC<RosterJournalTabProps> = ({
    myGroups,
    selectedGroupId,
    setSelectedGroupId,
    groupStudents = [],
    rosterFilter,
    setRosterFilter,
    studentAttendanceStats = {},
    onlineStatuses = {},
    attendanceDate,
    setAttendanceDate,
    homeworkTasks = [],
    handleViewStudentProfile,
    setStudentToTransfer,
    setIsTransferModalOpen,
    handleContactParent,
    handleTogglePayment,
    setIsAssignmentModalOpen,
    handleAssignPersonalTask,
    handleEditAssignment,
    handleDeleteAssignment
}) => {
    const [subTab, setSubTab] = useState<'roster' | 'journal' | 'homework' | 'review'>('roster');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenuStudentId, setActiveMenuStudentId] = useState<string | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
    const [isDeletingTask, setIsDeletingTask] = useState(false);
    const [localToast, setLocalToast] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        setIsDeletingTask(true);
        try {
            const taskId = taskToDelete.id;
            const batch = writeBatch(db);

            // 1. Delete from homework
            const hwRef = doc(db, 'homework', taskId);
            batch.delete(hwRef);

            // 2. Delete from trainingPlan if exists
            const planId = taskToDelete.planId || taskId;
            if (planId) {
                const planRef = doc(db, 'trainingPlan', planId);
                batch.delete(planRef);
            }

            // 3. Delete from assigned_tasks if exists
            const assignedRef = doc(db, 'assigned_tasks', taskId);
            batch.delete(assignedRef);

            await batch.commit();

            if (handleDeleteAssignment) {
                await handleDeleteAssignment(taskToDelete);
            }

            setLocalToast(`Задание «${taskToDelete.title}» удалено 🗑️`);
            setTimeout(() => setLocalToast(null), 3000);
            setTaskToDelete(null);
        } catch (err) {
            console.error('Error deleting assignment:', err);
            alert('Не удалось удалить задание. Попробуйте еще раз.');
        } finally {
            setIsDeletingTask(false);
        }
    };

    // Close actions menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuStudentId(null);
            }
        };
        if (activeMenuStudentId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeMenuStudentId]);

    // Active Group name helper
    const currentGroup = myGroups.find(g => g.id === selectedGroupId) || myGroups[0] || null;

    // Handle remove student from active group
    const handleRemoveStudentFromGroup = async (student: any) => {
        if (!student) return;
        const studentName = student.name || student.childName || 'спортсмена';
        const isConfirmed = window.confirm(`Вы уверены, что хотите исключить ${studentName} из состава этой группы?`);
        if (!isConfirmed) return;

        try {
            const studentId = student.id || student.uid || student.studentId;
            if (!studentId) return;

            const batch = writeBatch(db);
            const studentRef = doc(db, 'students', studentId);
            batch.set(studentRef, {
                groupId: '',
                updatedAt: serverTimestamp()
            }, { merge: true });

            const userRef = doc(db, 'users', studentId);
            batch.set(userRef, {
                groupId: '',
                updatedAt: serverTimestamp()
            }, { merge: true });

            await batch.commit();
        } catch (err) {
            console.error('Error removing student from group:', err);
        }
    };

    // Filtered & Searched Students List (Instant live search without hidden status filters)
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return groupStudents;
        const q = searchQuery.trim().toLowerCase();
        return groupStudents.filter(student => {
            const name = (student.name || student.childName || '').toLowerCase();
            const phone = (student.phone || student.parentPhone || '').toLowerCase();
            const pos = (student.position || '').toLowerCase();
            const year = String(student.birthYear || '');
            return name.includes(q) || phone.includes(q) || pos.includes(q) || year.includes(q);
        });
    }, [groupStudents, searchQuery]);

    return (
        <div className="space-y-5">
            {/* TOP BAR: Group Selector (Left) + Search (Right) & Subtabs (Row 2) */}
            <div className="bg-[#121214] border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                {/* LINE 1: Group Selector (Left) + Instant Search (Right) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    {/* Group Selector Dropdown */}
                    <div className="relative flex-1 sm:max-w-xs">
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-black/60 border border-white/10 hover:border-sparta-gold/40 rounded-xl transition-all">
                            <Users size={15} className="text-sparta-gold shrink-0" />
                            <select
                                value={selectedGroupId || ''}
                                onChange={(e) => setSelectedGroupId(e.target.value || null)}
                                className="bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none appearance-none cursor-pointer pr-6 w-full truncate"
                            >
                                {myGroups.map(group => (
                                    <option key={group.id} value={group.id} className="bg-[#141416] text-white">
                                        {group.name || group.title || 'Группа'}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-white/40 absolute right-3 pointer-events-none" />
                        </div>
                    </div>

                    {/* Instant Search Input */}
                    <div className="relative flex-1 sm:max-w-sm">
                        <Search size={14} className="text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск по фамилии или имени..."
                            className="w-full pl-9 pr-8 py-2.5 bg-black/60 border border-white/10 focus:border-sparta-gold rounded-xl text-xs text-white placeholder-white/40 outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer p-1"
                                title="Очистить поиск"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* LINE 2: Clean Subtabs Switcher */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/5 flex-wrap">
                        {[
                            { id: 'roster', label: `👤 Состав группы (${groupStudents.length})` },
                            { id: 'journal', label: '📅 Журнал посещаемости' },
                            { id: 'homework', label: '🏆 Задания' },
                            { id: 'review', label: '📝 Проверка заданий' }
                        ].map(tab => {
                            const isActive = (subTab === tab.id);
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setSubTab(tab.id as any)}
                                    className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-russo uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isActive
                                            ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/20'
                                            : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {searchQuery.trim() && (
                        <div className="text-[11px] font-bold text-white/40">
                            Найдено: <span className="text-sparta-gold font-bold">{filteredStudents.length}</span> из {groupStudents.length}
                        </div>
                    )}
                </div>
            </div>

            {/* SUBTAB 1: ROSTER TABLE */}
            {subTab === 'roster' && (
                <div className="bg-[#121214] border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[280px]">
                    <div className="overflow-x-auto min-h-[280px] pb-16 sm:pb-20">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-black/40 text-[10px] font-black uppercase tracking-wider text-white/40">
                                    <th className="px-5 py-4">Спортсмен</th>
                                    <th className="px-5 py-4">Посещаемость</th>
                                    <th className="px-5 py-4">Статус абонемента</th>
                                    <th className="px-5 py-4">Связь с родителем</th>
                                    <th className="px-5 py-4 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student, studentIndex) => {
                                        const stats = studentAttendanceStats[student.id] || { rate: 0, present: 0, total: 0 };
                                        const attendanceRate = typeof stats.rate === 'number' ? stats.rate : 0;
                                        const presentCount = stats.present || 0;
                                        const totalCount = stats.total || 0;

                                        const phoneStr = student.parentPhone || student.phone || student.originalUser?.parentPhone || student.originalUser?.phone || '';
                                        const phoneClean = phoneStr.replace(/[^+\d]/g, '');

                                        const subInfo = getSmartSubscriptionStatus(student);
                                        const profileCheck = checkProfileCompleteness(student);
                                        const isPaid = subInfo.status === 'ACTIVE';
                                        const isNearBottom = (filteredStudents.length <= 2 && studentIndex > 0) || (filteredStudents.length > 2 && studentIndex >= filteredStudents.length - 2);

                                        // 1. Age and Birth year calculation
                                        const currentYear = new Date().getFullYear();
                                        let age = student.age;
                                        let birthYear = student.birthYear;

                                        if (!birthYear && student.birthDate) {
                                            const parsedYear = new Date(student.birthDate).getFullYear();
                                            if (!isNaN(parsedYear) && parsedYear > 1990 && parsedYear <= currentYear) {
                                                birthYear = parsedYear;
                                            }
                                        }

                                        if (!age && birthYear) {
                                            age = currentYear - Number(birthYear);
                                        }

                                        const formatAgeText = (years: number) => {
                                            const lastDigit = years % 10;
                                            const lastTwoDigits = years % 100;
                                            if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return `${years} лет`;
                                            if (lastDigit === 1) return `${years} год`;
                                            if (lastDigit >= 2 && lastDigit <= 4) return `${years} года`;
                                            return `${years} лет`;
                                        };

                                        let subtitle = 'Возраст не указан';
                                        if (birthYear && age && age > 0) {
                                            subtitle = `${birthYear} г.р. • ${formatAgeText(age)}`;
                                        } else if (birthYear) {
                                            subtitle = `${birthYear} г.р.`;
                                        } else if (age && age > 0) {
                                            subtitle = formatAgeText(age);
                                        }

                                        // 2. Parent Name & Contact details
                                        const rawParentName = (student as any).parentName ||
                                            (student as any).parentDisplayName ||
                                            student.originalUser?.parentName ||
                                            student.originalUser?.displayName ||
                                            'Родитель';
                                        const parentRole = (student as any).parentRelationship || student.originalUser?.parentRelationship || '';
                                        const parentLabel = parentRole ? `${rawParentName} (${parentRole})` : rawParentName;

                                        return (
                                            <tr
                                                key={student.id}
                                                className="group hover:bg-white/[0.02] transition-colors"
                                            >
                                                {/* Column 1: Спортсмен (Avatar + Name + Incomplete Warning + Birth Year / Age) */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 font-russo text-xs font-bold flex items-center justify-center shrink-0 shadow-inner">
                                                            {student.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                                                    {student.name}
                                                                </span>

                                                                {/* Incomplete Profile Warning Icon */}
                                                                {!profileCheck.isComplete && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleViewStudentProfile(student);
                                                                        }}
                                                                        title={profileCheck.tooltipText}
                                                                        className="p-1 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer shrink-0"
                                                                    >
                                                                        <AlertTriangle size={11} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-white/50 font-medium block truncate">
                                                                {subtitle}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Column 2: Посещаемость (Text counter + Slim Progress Bar / Newcomer label) */}
                                                <td className="px-5 py-4">
                                                    <div className="space-y-1.5">
                                                        {totalCount > 0 ? (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-white whitespace-nowrap">
                                                                        {presentCount} из {totalCount} занятий
                                                                    </span>
                                                                    <span className="text-[11px] font-russo text-emerald-400">
                                                                        ({attendanceRate}%)
                                                                    </span>
                                                                </div>
                                                                <div className="w-28 sm:w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-sparta-gold to-emerald-400 rounded-full transition-all duration-500"
                                                                        style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
                                                                    />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-bold text-white/50 block whitespace-nowrap">
                                                                    0 посещений <span className="text-[10px] text-sparta-gold font-normal">(Новый ученик)</span>
                                                                </span>
                                                                <div className="w-28 sm:w-32 h-1 bg-white/5 rounded-full" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Column 3: Статус абонемента (Smart Status Badge + 1-Click Toggle) */}
                                                <td className="px-5 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTogglePayment?.(student.id, student.paymentStatus || 'due')}
                                                        title={`Статус: ${subInfo.description}. Нажмите, чтобы сменить`}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${subInfo.badgeClass}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${subInfo.dotClass}`} />
                                                        <span>{subInfo.label}</span>
                                                    </button>
                                                </td>

                                                {/* Column 4: Связь с родителем (Parent name + clickable Phone) */}
                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-white/50 truncate max-w-[190px]">
                                                            {parentLabel}
                                                        </div>
                                                        {phoneClean ? (
                                                            <a
                                                                href={`tel:${phoneClean}`}
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-sparta-gold transition-colors py-0.5 group/tel"
                                                                title="Позвонить родителю"
                                                            >
                                                                <Phone size={12} className="text-sparta-gold shrink-0 group-hover/tel:scale-110 transition-transform" />
                                                                <span className="underline decoration-white/20 hover:decoration-sparta-gold">{phoneStr}</span>
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-amber-400/70 font-medium flex items-center gap-1">
                                                                <AlertTriangle size={11} />
                                                                <span>Телефон не указан</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Column 5: Действия ([ 👤 Профиль ] [ 💬 Чат ] [ ⋮ ]) */}
                                                <td className="px-5 py-4 text-right">
                                                    <div className="inline-flex items-center justify-end gap-2 relative">
                                                        {/* 1. Player Profile Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewStudentProfile(student)}
                                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-sparta-gold hover:text-black text-white/80 border border-white/10 hover:border-sparta-gold text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                                                            title="Открыть карточку спортсмена"
                                                        >
                                                            <User size={13} />
                                                            <span>Профиль</span>
                                                        </button>

                                                        {/* 2. Chat with Parent Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleContactParent(student)}
                                                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                                                            title="Написать родителю"
                                                        >
                                                            <MessageSquare size={13} />
                                                            <span>Чат</span>
                                                        </button>

                                                        {/* 3. More Dropdown Trigger */}
                                                        <div className="relative">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveMenuStudentId(activeMenuStudentId === student.id ? null : student.id);
                                                                }}
                                                                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                                    activeMenuStudentId === student.id
                                                                        ? 'bg-zinc-700 text-white border-zinc-600'
                                                                        : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 border-zinc-700/50'
                                                                }`}
                                                                title="Дополнительные действия"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>

                                                            {/* Dropdown Menu Popup */}
                                                            <AnimatePresence>
                                                                {activeMenuStudentId === student.id && (
                                                                    <motion.div
                                                                        ref={menuRef}
                                                                        initial={{ opacity: 0, scale: 0.95, y: isNearBottom ? 5 : -5 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: isNearBottom ? 5 : -5 }}
                                                                        className={`absolute right-0 z-50 w-52 bg-[#18181b] border border-white/15 rounded-2xl shadow-2xl p-1 space-y-0.5 text-left backdrop-blur-xl ${
                                                                            isNearBottom ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'
                                                                        }`}
                                                                    >
                                                                        {/* 1. Назначить задание */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveMenuStudentId(null);
                                                                                handleAssignPersonalTask?.(student);
                                                                            }}
                                                                            className="w-full px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                                                        >
                                                                            <Zap size={13} className="text-amber-400 shrink-0" />
                                                                            <span>Назначить задание</span>
                                                                        </button>

                                                                        {/* 2. Перевести в другую группу */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveMenuStudentId(null);
                                                                                setStudentToTransfer(student);
                                                                                setIsTransferModalOpen(true);
                                                                            }}
                                                                            className="w-full px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                                                        >
                                                                            <ArrowRightLeft size={13} className="text-blue-400 shrink-0" />
                                                                            <span>Перевести в группу</span>
                                                                        </button>

                                                                        {/* Separator */}
                                                                        <div className="border-t border-zinc-800 my-0.5" />

                                                                        {/* 3. Исключить из группы */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setActiveMenuStudentId(null);
                                                                                handleRemoveStudentFromGroup(student);
                                                                            }}
                                                                            className="w-full px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                                                        >
                                                                            <TrashIcon size={13} className="text-red-400 shrink-0" />
                                                                            <span>Исключить из группы</span>
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-white/40">
                                            <div className="space-y-2">
                                                <Users size={28} className="mx-auto text-white/20" />
                                                <p className="text-xs font-bold uppercase tracking-wider">
                                                    {searchQuery ? 'Ничего не найдено по вашему запросу' : 'В выбранной группе пока нет учеников'}
                                                </p>
                                                {searchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchQuery('')}
                                                        className="text-[10px] font-black uppercase text-sparta-gold hover:underline cursor-pointer"
                                                    >
                                                        Сбросить поиск
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SUBTAB 2: JOURNAL (Журнал посещаемости по датам) */}
            {subTab === 'journal' && (
                <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <h4 className="text-lg font-russo text-white uppercase">Журнал посещаемости по датам</h4>
                            <p className="text-xs text-white/40 font-medium mt-0.5">
                                Выберите дату для быстрой проверки и отметки присутствия
                            </p>
                        </div>
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:border-sparta-gold outline-none cursor-pointer"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupStudents.map(student => (
                            <div
                                key={student.id}
                                className="p-3.5 bg-white/[0.02] border border-white/5 hover:border-sparta-gold/30 rounded-2xl flex items-center justify-between group transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-sparta-gold/20 text-sparta-gold font-russo text-xs font-bold flex items-center justify-center shrink-0 border border-sparta-gold/30">
                                        {student.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-bold text-white truncate">{student.name}</span>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all cursor-pointer"
                                        title="Присутствовал"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="w-9 h-9 rounded-xl bg-white/5 text-white/40 border border-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer"
                                        title="Пропустил"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SUBTAB 3: HOMEWORK (Задания) */}
            {subTab === 'homework' && (
                <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <h3 className="text-lg font-russo text-white uppercase">Активные задания</h3>
                            <p className="text-xs text-white/40 font-medium mt-0.5">
                                Домашние челленджи для отработки навыков учеников группы
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsAssignmentModalOpen(true)}
                            className="px-4 py-2.5 bg-sparta-gold hover:bg-yellow-400 text-black rounded-xl font-russo uppercase tracking-wider text-xs transition-all cursor-pointer shadow-lg shadow-sparta-gold/20 active:scale-95 flex items-center gap-2 shrink-0 self-start sm:self-auto"
                        >
                            <PlusCircle size={15} />
                            <span>+ Выдать задание всей группе</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {homeworkTasks.map(task => {
                            const isPersonal = Boolean(task.studentId || task.studentUid || task.targetType === 'student');
                            const coins = Number(task.rewardCoins || task.coins) || 30;
                            const xp = Number(task.rewardXp || task.xp) || 50;

                            return (
                                <div
                                    key={task.id}
                                    className="p-4 sm:p-5 bg-white/[0.02] border border-white/10 rounded-2xl group hover:border-sparta-gold/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        <div className="w-11 h-11 rounded-2xl bg-sparta-gold/15 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <Zap size={18} />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-sm sm:text-base text-white truncate">
                                                    {task.title}
                                                </h4>
                                                {isPersonal ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold shrink-0 flex items-center gap-1">
                                                        <User size={10} />
                                                        <span>Лично: {task.studentName || 'Ученику'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-zinc-300 text-[10px] font-bold shrink-0 flex items-center gap-1">
                                                        <Users size={10} />
                                                        <span>Для группы</span>
                                                    </span>
                                                )}
                                                {task.dueDate && (
                                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/50 text-[10px] font-medium shrink-0 flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        <span>До {task.dueDate}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {task.description && (
                                                <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2 pt-0.5">
                                                <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <span>+{coins} монет</span>
                                                </span>
                                                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                                    +{xp} XP
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons: Edit and Delete */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleEditAssignment ? handleEditAssignment(task) : setIsAssignmentModalOpen(true)}
                                            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white hover:text-sparta-gold border border-white/10 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
                                            title="Редактировать параметры задания"
                                        >
                                            <Edit3 size={13} />
                                            <span>Редактировать</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setTaskToDelete(task)}
                                            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
                                            title="Удалить задание"
                                        >
                                            <Trash2 size={13} />
                                            <span>Удалить</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {homeworkTasks.length === 0 && (
                            <div className="py-14 text-center border border-dashed border-white/10 rounded-2xl">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/30">
                                    Нет активных заданий в этой группе
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SUBTAB 4: REVIEW (Проверка заданий) */}
            {subTab === 'review' && (
                <CoachReviewDashboard
                    theme="dark"
                    selectedGroupId={selectedGroupId}
                    myGroups={myGroups}
                    onViewStudentProfile={handleViewStudentProfile}
                />
            )}

            {/* DELETE ASSIGNMENT CONFIRMATION MODAL */}
            <AnimatePresence>
                {taskToDelete && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-[#141416] border border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-left relative overflow-hidden"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="p-3 bg-red-500/15 text-red-400 border border-red-500/30 rounded-2xl shrink-0">
                                    <AlertTriangle size={22} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-russo text-white uppercase tracking-tight">
                                        Удаление задания
                                    </h3>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        Вы уверены, что хотите удалить задание <strong className="text-white">«{taskToDelete.title}»</strong>?
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-[11px] text-red-300/80 leading-relaxed">
                                ⚠️ Задание будет моментально удалено из личных кабинетов учеников и журнала выполнения.
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setTaskToDelete(null)}
                                    disabled={isDeletingTask}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeleteTask}
                                    disabled={isDeletingTask}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer font-bold shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {isDeletingTask ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            <span>Удаление...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={15} />
                                            <span>Удалить</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Local Toast Message */}
            <AnimatePresence>
                {localToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 right-6 z-[300] bg-emerald-500 text-black px-5 py-3.5 rounded-2xl font-bold font-russo uppercase text-xs shadow-2xl flex items-center gap-2.5 border border-emerald-400"
                    >
                        <CheckCircle2 size={16} />
                        <span>{localToast}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(RosterJournalTab);
