import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    Users,
    Calendar,
    MessageSquare,
    UserPlus,
    RefreshCw,
    ArrowRight,
    TrendingUp,
    Sparkles,
    Shield,
    ChevronDown,
    PlusCircle,
    FileText,
    CheckCircle,
    X,
    Info,
    Phone,
    User,
    ArrowRightLeft,
    Settings,
    Trash2 as TrashIcon,
    Zap,
    Clock,
    Heart,
    CreditCard
} from 'lucide-react';
import { Button } from '../../UIComponents';

interface Student {
    id: string;
    name: string;
    type: 'trial' | 'registry' | 'offline' | 'real';
    isRegistered: boolean;
    status?: 'active' | 'at_risk' | 'inactive';
    statusLabel?: string;
    phone?: string;
    source?: string;
    originalUser?: any;
    assignedUid?: string;
    paymentStatus?: 'paid' | 'due' | 'unpaid';
    paymentDate?: string;
}

interface Training {
    id?: string;
    time: string;
    groupName: string;
}

interface DailyHubProps {
    theme: string;
    user: any;
    userProfile: any;
    pendingTrialsCount: number;
    unreadMessagesCount: number;
    orphanStudentsCount: number;
    atRiskStudents: any[];
    isSmartSorted?: boolean;
    sortingStatus: 'idle' | 'scanning' | 'linking' | 'cleaning' | 'done';
    handleSmartSorting: () => Promise<void>;
    upcomingTraining: Training | null;
    activeSubTab: 'roster' | 'journal' | 'homework';
    setActiveSubTab: (tab: 'roster' | 'journal' | 'homework') => void;
    selectedGroupId: string | null;
    setSelectedGroupId: (id: string | null) => void;
    myGroups: any[];
    setIsAssignmentModalOpen: (open: boolean) => void;
    rosterFilter: string;
    setRosterFilter: (filter: any) => void;
    groupStudents: Student[];
    myStudents: any[];
    studentAttendanceStats: Record<string, { rate: number }>;
    onlineStatuses: Record<string, { online: boolean }>;
    attendanceDate: string;
    setAttendanceDate: (date: string) => void;
    homeworkTasks: any[];
    handleViewStudentProfile: (student: any) => void;
    setStudentToTransfer: (student: any) => void;
    setIsTransferModalOpen: (open: boolean) => void;
    handleContactParent: (student: any) => void;
    setMainTab: (tab: any) => void;
    isCompleteProfile: (s: any) => boolean;
    handleTogglePayment?: (studentId: string, currentStatus: string) => Promise<void>;
}

const DailyHub: React.FC<DailyHubProps> = ({
    theme,
    userProfile,
    pendingTrialsCount,
    unreadMessagesCount,
    orphanStudentsCount,
    atRiskStudents,
    isSmartSorted,
    handleSmartSorting,
    sortingStatus,
    upcomingTraining,
    activeSubTab,
    setActiveSubTab,
    selectedGroupId,
    setSelectedGroupId,
    myGroups,
    setIsAssignmentModalOpen,
    rosterFilter,
    setRosterFilter,
    groupStudents,
    myStudents,
    studentAttendanceStats,
    onlineStatuses,
    attendanceDate,
    setAttendanceDate,
    homeworkTasks,
    handleViewStudentProfile,
    setStudentToTransfer,
    setIsTransferModalOpen,
    handleContactParent,
    setMainTab,
    isCompleteProfile,
    handleTogglePayment,
    user
}) => {
    return (
        <div className="space-y-8">
            {/* URGENT ACTION BAR - Tactical Priority Layer */}
            {(pendingTrialsCount > 0 || unreadMessagesCount > 0 || atRiskStudents.length > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-4 p-6 bg-sparta-gold/[0.03] border border-sparta-gold/10 rounded-[2.5rem] relative overflow-hidden group/urgent"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/urgent:scale-110 transition-transform">
                        <Zap size={100} className="text-sparta-gold" />
                    </div>

                    <div className="flex items-center gap-3 mr-8">
                        <div className="w-10 h-10 rounded-xl bg-sparta-gold text-black flex items-center justify-center shadow-lg shadow-sparta-gold/20">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-sparta-gold uppercase tracking-[0.2em]">Priorities</h4>
                            <p className="text-xs font-russo text-white uppercase">Urgent Actions Required</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 relative z-10">
                        {pendingTrialsCount > 0 && (
                            <button
                                onClick={() => setMainTab('trials')}
                                className="px-4 py-2.5 bg-sparta-gold/10 border border-sparta-gold/20 rounded-2xl flex items-center gap-3 hover:bg-sparta-gold/20 transition-all group/badge"
                            >
                                <div className="w-6 h-6 rounded-lg bg-sparta-gold text-black flex items-center justify-center text-[10px] font-black">{pendingTrialsCount}</div>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover/badge:text-white transition-colors">Pending Trials</span>
                                <ArrowRight size={14} className="text-sparta-gold/40 group-hover/badge:translate-x-1 transition-transform" />
                            </button>
                        )}

                        {atRiskStudents.length > 0 && (
                            <button
                                onClick={() => { setActiveSubTab('roster'); setRosterFilter('at_risk'); }}
                                className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 hover:bg-red-500/20 transition-all group/badge"
                            >
                                <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center text-[10px] font-black">{atRiskStudents.length}</div>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover/badge:text-white transition-colors">At Risk Athletes</span>
                                <ArrowRight size={14} className="text-red-400/40 group-hover/badge:translate-x-1 transition-transform" />
                            </button>
                        )}

                        {unreadMessagesCount > 0 && (
                            <button
                                onClick={() => setMainTab('messages')}
                                className="px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 hover:bg-blue-500/20 transition-all group/badge"
                            >
                                <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">{unreadMessagesCount}</div>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover/badge:text-white transition-colors">New Messages</span>
                                <ArrowRight size={14} className="text-blue-400/40 group-hover/badge:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
            {/* ACTION CENTER - The "Daily Hub" v4.0 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Tasks & Greeting */}
                <div className="lg:col-span-8 space-y-6">
                    <div className={`relative p-10 backdrop-blur-3xl border rounded-[3rem] overflow-hidden group transition-all duration-700 ${theme === 'light' ? 'bg-white border-black/[0.05]' : 'bg-card border-white/[0.05]'}`}>
                        <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000 ${theme === 'light' ? 'bg-sparta-gold/10' : 'bg-sparta-gold/5 group-hover:bg-sparta-gold/10'}`} />

                        <div className="relative z-10">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-10">
                                <div>
                                    <div className={`flex items-center gap-2 mb-3 ${theme === 'light' ? 'text-black/30' : 'text-white/20'}`}>
                                        <Shield size={14} className="text-sparta-gold" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Центр управления активен</span>
                                    </div>
                                    <h3 className={`text-3xl font-russo uppercase flex items-center gap-4 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                                        <span className="text-2xl">{new Date().getHours() < 12 ? '☀️' : new Date().getHours() < 18 ? '⚡' : '🌙'}</span>
                                        {new Date().getHours() < 6 ? 'Доброй ночи' :
                                            new Date().getHours() < 12 ? 'Доброе утро' :
                                                new Date().getHours() < 18 ? 'Добрый день' : 'Добрый вечер'},
                                        <span className="text-sparta-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">{userProfile.name?.split(' ')[0] || 'Тренер'}</span>
                                    </h3>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.25em] mt-3 flex items-center gap-2 ${theme === 'light' ? 'text-black/40' : 'text-white/30'}`}>
                                        <Calendar size={12} /> {format(new Date(), 'dd MMMM yyyy', { locale: ru })} • Тактический обзор
                                    </p>
                                </div>

                                {/* Tactical Progress Ring v4.0 */}
                                <div className={`flex items-center gap-6 px-6 py-4 rounded-[2rem] border backdrop-blur-xl transition-all ${theme === 'light' ? 'bg-black/[0.03] border-black/[0.05]' : 'bg-white/[0.03] border-white/[0.05]'}`}>
                                    <div className="relative w-14 h-14 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-sparta-gold/10" />
                                            <motion.circle
                                                cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="3"
                                                strokeDasharray={150}
                                                strokeDashoffset={150 - (150 * (
                                                    (pendingTrialsCount === 0 ? 25 : 0) +
                                                    (unreadMessagesCount === 0 ? 25 : 0) +
                                                    (orphanStudentsCount === 0 ? 25 : 0) +
                                                    (atRiskStudents.length === 0 ? 25 : 0)
                                                ) / 100)}
                                                className="text-sparta-gold transition-all duration-[1500ms]"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <span className={`absolute font-russo text-xs ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                                            {((pendingTrialsCount === 0 ? 1 : 0) + (unreadMessagesCount === 0 ? 1 : 0) + (orphanStudentsCount === 0 ? 1 : 0) + (atRiskStudents.length === 0 ? 1 : 0)) * 25}%
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-black/30' : 'text-white/20'}`}>Статус задач</p>
                                        <p className={`text-[11px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-black/70' : 'text-white/80'}`}>Центр Контроля</p>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Cards Grid v4.0 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                                {/* Card: New Athletes */}
                                <motion.button
                                    whileHover={{ y: -6, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setMainTab('trials')}
                                    className={`p-8 rounded-[2.5rem] border transition-all text-left group/card relative overflow-hidden flex flex-col justify-between min-h-[160px] ${pendingTrialsCount > 0
                                            ? 'bg-sparta-gold/5 border-sparta-gold/20 hover:border-sparta-gold shadow-[0_20px_40px_rgba(212,175,55,0.1)]'
                                            : theme === 'light' ? 'bg-black/[0.03] border-black/[0.05] opacity-60' : 'bg-white/[0.03] border-white/[0.05] opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center justify-between relative z-10 w-full mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${pendingTrialsCount > 0
                                                ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/30 group-hover/card:scale-110 group-hover/card:rotate-3'
                                                : 'bg-white/10 text-white/20'
                                            }`}>
                                            <UserPlus size={26} />
                                        </div>
                                        {pendingTrialsCount > 0 && (
                                            <div className="flex flex-col items-end">
                                                <span className="px-3 py-1 bg-sparta-gold text-black text-[9px] font-black uppercase rounded-lg shadow-lg mb-1 animate-bounce">Системный алерт</span>
                                                <span className="text-[10px] font-russo text-sparta-gold">{pendingTrialsCount} Активно</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className={`text-[12px] font-black uppercase tracking-[0.2em] mb-1.5 ${theme === 'light' ? 'text-black/80' : 'text-white/90'}`}>Новые заявки</h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-tight ${theme === 'light' ? 'text-black/40' : 'text-white/30'}`}>
                                            {pendingTrialsCount > 0 ? 'Требуется обработка данных' : 'Реестр синхронизирован'}
                                        </p>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/card:bg-sparta-gold/10 transition-all duration-700" />
                                </motion.button>


                                {/* Card: Intelligence */}
                                <motion.button
                                    whileHover={{ y: -6, scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSmartSorting}
                                    disabled={isSmartSorted}
                                    className={`p-8 rounded-[2.5rem] border transition-all text-left group/card relative overflow-hidden flex flex-col justify-between min-h-[160px] ${isSmartSorted
                                            ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_50px_rgba(59,130,246,0.2)]'
                                            : orphanStudentsCount > 0
                                                ? 'bg-blue-500/5 border-blue-500/20 shadow-[0_20px_40px_rgba(59,130,246,0.1)]'
                                                : theme === 'light' ? 'bg-black/[0.03] border-black/[0.05] hover:border-blue-500/20 hover:bg-blue-500/5' : 'bg-white/[0.03] border-white/[0.05] hover:border-blue-500/20 hover:bg-blue-500/5'
                                        }`}
                                >
                                    <div className="flex items-center justify-between relative z-10 w-full mb-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${isSmartSorted || orphanStudentsCount > 0
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 group-hover/card:rotate-180'
                                                : 'bg-white/10 text-white/20 group-hover/card:text-blue-400'
                                            }`}>
                                            <Sparkles size={26} className={isSmartSorted ? 'animate-pulse' : 'transition-transform duration-700 group-hover/card:rotate-180'} />
                                        </div>

                                        <AnimatePresence mode="wait">
                                            {isSmartSorted ? (
                                                <motion.div
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="flex flex-col items-end"
                                                >
                                                    <span className={`px-3 py-1 text-white text-[8px] font-black uppercase rounded-lg shadow-lg mb-1 ${sortingStatus === 'done' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}>
                                                        {sortingStatus === 'scanning' ? 'АНАЛИЗ ДАННЫХ' :
                                                            sortingStatus === 'linking' ? 'СВЯЗКА ПРОФИЛЕЙ' :
                                                                sortingStatus === 'cleaning' ? 'ПРИОРИТЕТИЗАЦИЯ' :
                                                                    sortingStatus === 'done' ? 'СОРТИРОВКА ЗАВЕРШЕНА' : 'ОБРАБОТКА...'}
                                                    </span>
                                                    {sortingStatus !== 'done' && (
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3].map(i => (
                                                                <motion.div
                                                                    key={i}
                                                                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                                                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                                                    className="w-1 h-1 rounded-full bg-blue-400"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {sortingStatus === 'done' && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-400">
                                                            <CheckCircle size={12} />
                                                        </motion.div>
                                                    )}
                                                </motion.div>
                                            ) : orphanStudentsCount > 0 ? (
                                                <div className="px-5 py-2.5 bg-blue-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg flex items-center gap-2">
                                                    Оптимизировать <ArrowRight size={12} />
                                                </div>
                                            ) : (
                                                <div className="px-5 py-2.5 bg-white/5 text-white/40 text-[9px] font-black uppercase rounded-xl border border-white/5 opacity-0 group-hover/card:opacity-100 transition-all">
                                                    Запустить
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="relative z-10">
                                        <h4 className={`text-[12px] font-black uppercase tracking-[0.2em] mb-1.5 ${theme === 'light' ? 'text-black/80' : 'text-white/90'}`}>Умная сортировка</h4>
                                        <p className={`text-[10px] font-bold uppercase tracking-tight ${theme === 'light' ? 'text-black/40' : 'text-white/30'}`}>
                                            {isSmartSorted ? (
                                                sortingStatus === 'scanning' ? 'Изучение активности учеников' :
                                                    sortingStatus === 'linking' ? 'Поиск критических связей' :
                                                        sortingStatus === 'cleaning' ? 'Ранжирование по приоритету' : 'Перестроение списка'
                                            ) : orphanStudentsCount > 0 ? `Найдено ${orphanStudentsCount} задач для оптимизации` : 'Порядок идеален'}
                                        </p>
                                    </div>
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/card:bg-blue-500/10 transition-all duration-700 ${isSmartSorted ? 'animate-pulse bg-blue-500/20' : ''}`} />
                                </motion.button>

                                {/* Card: At Risk */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => { setActiveSubTab('roster'); setRosterFilter('at_risk'); }}
                                    className={`p-5 rounded-3xl border transition-all text-left group/card relative overflow-hidden ${atRiskStudents.length > 0
                                            ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                            : 'bg-white/5 border-white/5 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${atRiskStudents.length > 0 ? 'bg-red-500 text-white' : 'bg-white/5 text-white/20'
                                            }`}>
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-tight">В зоне риска</h4>
                                            <p className="text-[10px] text-white/40 font-bold mt-0.5">
                                                {atRiskStudents.length > 0 ? `${atRiskStudents.length} учеников` : 'Пропусков нет'}
                                            </p>
                                        </div>
                                        {atRiskStudents.length > 0 && <div className="ml-auto w-2 h-2 rounded-full bg-red-500 rotate-180" />}
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: AI Insight & Next Training */}
                <div className="lg:col-span-4 space-y-6">
                    {/* AI Insight Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-8 bg-gradient-to-br from-sparta-gold/20 via-field to-transparent border border-sparta-gold/30 rounded-[2.5rem] relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Sparkles size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-sparta-gold text-black rounded-lg">
                                    <Zap size={14} />
                                </div>
                                <span className="text-[10px] font-black text-sparta-gold uppercase tracking-[0.2em]">Sparta AI Совет</span>
                            </div>
                            <p className="text-sm text-white/80 font-medium leading-relaxed italic">
                                "Сегодня отличный день для отработки техники. Ваша группа показала рост на 15% в прошлом упражнении. Попробуйте усложнить задание для лидеров."
                            </p>
                            <div className="mt-6 flex items-center justify-between">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">Генерация в реальном времени</span>
                                <button className="text-[9px] font-black text-sparta-gold uppercase hover:text-white transition-colors">Подробнее</button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Next Training Card */}
                    <div className="p-8 bg-card glass-panel border border-main rounded-[2.5rem] relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center mb-6 group-hover:bg-orange-500/10 transition-all">
                                <Calendar size={32} className="text-white/10 group-hover:text-orange-400 transition-colors" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Ближайшее событие</h4>
                            {upcomingTraining ? (
                                <>
                                    <p className="text-3xl font-russo text-white mb-2 tracking-tighter">{upcomingTraining.time}</p>
                                    <div className="px-4 py-1.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                                        <p className="text-[10px] font-russo text-orange-400 uppercase tracking-widest">{upcomingTraining.groupName}</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-xs font-bold text-white/20 uppercase">График свободен</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            <div className="flex items-center justify-between border-t border-white/5 pt-8">
                <div className="flex gap-4">
                    {['roster', 'journal', 'homework'].map(sub => (
                        <button
                            key={sub}
                            onClick={() => setActiveSubTab(sub as any)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${activeSubTab === sub
                                    ? 'bg-white text-black border-white'
                                    : 'text-white/30 hover:text-white border-white/10 hover:border-white/20 bg-white/5'}`}
                        >
                            {sub === 'roster' ? <Users size={14} /> : sub === 'journal' ? <FileText size={14} /> : <Zap size={14} />}
                            {sub === 'roster' ? 'Ученики' : sub === 'journal' ? 'Журнал' : 'Задания'}
                        </button>
                    ))}
                </div>
                <div className="flex gap-4">
                    <div className="relative group">
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:border-sparta-gold/30 transition-all cursor-pointer">
                            <Users size={16} className="text-sparta-gold" />
                            <select
                                value={selectedGroupId || ''}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white focus:outline-none appearance-none cursor-pointer pr-4"
                            >
                                <option value="" className="bg-[#1a1a1a]">Все группы</option>
                                {myGroups.map(group => (
                                    <option key={group.id} value={group.id} className="bg-[#1a1a1a]">{group.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-white/20 absolute right-4 pointer-events-none" />
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAssignmentModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-sparta-gold text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-lg shadow-sparta-gold/20"
                    >
                        <PlusCircle size={16} />
                        Добавить задание
                    </button>
                </div>
            </div>

            {activeSubTab === 'roster' && (
                <div className="bg-[#1a1a1a] border border-white/5 rounded-[2.5rem] overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-white/5 to-transparent">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between w-full">
                            <div>
                                <h3 className="text-xl font-russo text-white uppercase tracking-tight mb-2">Состав группы</h3>
                                <div className="flex items-center gap-4">
                                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Управление учениками и аналитика</p>

                                    <button
                                        onClick={handleSmartSorting}
                                        disabled={isSmartSorted}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest
                                            ${isSmartSorted
                                                ? 'bg-white/5 border-white/10 text-white/20'
                                                : 'bg-sparta-gold/10 border-sparta-gold/20 text-sparta-gold hover:bg-sparta-gold hover:text-black hover:border-transparent'}`}
                                    >
                                        <Sparkles size={10} className={isSmartSorted ? 'animate-pulse' : ''} />
                                        {isSmartSorted ? 'Сортировка...' : 'Умная сортировка'}
                                    </button>

                                    {myStudents.some(s => s.source === 'registry' && s.originalUser && !s.assignedUid) && !isSmartSorted && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse">
                                            <Sparkles size={10} />
                                            Найдено совпадений
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-8 pb-4 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                            {[
                                { id: 'all', label: 'Весь состав', count: groupStudents.filter(s => s.isRegistered || s.type === 'offline').length, hint: 'Все ученики, включая офлайн-базу' },
                                { id: 'registered', label: 'В приложении', count: groupStudents.filter(s => s.isRegistered).length, hint: 'У кого есть личный кабинет' },
                                { id: 'awaiting', label: 'Клубная база', count: groupStudents.filter(s => s.type === 'registry').length, hint: 'Ученики из реестра, не привязанные к ЛК' },
                                { id: 'active', label: 'Активные', count: groupStudents.filter(s => (s.isRegistered || s.type === 'offline') && (s.status === 'active' || !s.status)).length, hint: 'Те, кто ходит сейчас' },
                                { id: 'trial', label: 'Новички', count: groupStudents.filter(s => s.type === 'trial').length, hint: 'Ученики на пробном периоде' },
                                { id: 'offline', label: 'Только офлайн', count: groupStudents.filter(s => s.type === 'offline').length, hint: 'Без личного кабинета' }
                            ].map(f => (
                                <div key={f.id} className="relative group/filter">
                                    <button
                                        onClick={() => setRosterFilter(f.id as any)}
                                        className={`px-4 py-2 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${rosterFilter === f.id
                                                ? 'bg-white text-black border-white'
                                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {f.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${rosterFilter === f.id ? 'bg-black/20' : 'bg-white/10'}`}>
                                            {f.count}
                                        </span>
                                        <Info size={12} className="opacity-20 group-hover/filter:opacity-100 transition-opacity" />
                                    </button>
                                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black border border-white/10 rounded-lg text-[8px] font-bold text-white/60 uppercase tracking-widest leading-relaxed pointer-events-none opacity-0 group-hover/filter:opacity-100 transition-opacity z-50 shadow-2xl">
                                        {f.hint}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                                    <th className="px-8 py-6 text-left">Спортсмен</th>
                                    <th className="px-8 py-6 text-left">Посещаемость</th>
                                    <th className="px-8 py-6 text-left">Прогресс</th>
                                    <th className="px-8 py-6 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {groupStudents.filter(s => {
                                    if (rosterFilter === 'all') return s.isRegistered || s.type === 'offline';
                                    if (rosterFilter === 'active') return (s.isRegistered || s.type === 'offline') && (s.status === 'active' || !s.status);
                                    if (rosterFilter === 'trial') return s.type === 'trial';
                                    if (rosterFilter === 'at_risk') return s.status === 'at_risk';
                                    if (rosterFilter === 'registered') return s.isRegistered;
                                    if (rosterFilter === 'awaiting') return s.type === 'registry';
                                    if (rosterFilter === 'offline') return s.type === 'offline';
                                    if (rosterFilter === 'incomplete') return s.isRegistered && !isCompleteProfile(s);
                                    return true;
                                }).map((student) => {
                                    const stats = studentAttendanceStats[student.id] || { rate: 0 };
                                    return (
                                        <tr key={student.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative group/avatar">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-russo transition-all shadow-inner
                                                            ${student.type === 'registry' ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20' :
                                                                student.isRegistered ? 'bg-sparta-gold/10 text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black' :
                                                                    'bg-white/5 text-white/20'}`}>
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        {student.type === 'registry' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-[#1a1a1a] animate-pulse" />}
                                                        {student.isRegistered && onlineStatuses[student.id]?.online && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a1a]" />}
                                                    </div>
                                                    <div className="relative">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-white group-hover:text-sparta-gold transition-colors">{student.name}</span>

                                                            {student.paymentStatus === 'paid' ? (
                                                                <span className="bg-green-500/20 text-green-400 text-[8px] px-1.5 py-0.5 rounded border border-green-500/20 uppercase font-black tracking-widest flex items-center gap-1">
                                                                    <CheckCircle size={8} /> Оплачено
                                                                </span>
                                                            ) : (
                                                                <span className="bg-red-500/20 text-red-400 text-[8px] px-1.5 py-0.5 rounded border border-red-500/20 uppercase font-black tracking-widest flex items-center gap-1 animate-pulse">
                                                                    <CreditCard size={8} /> Долг
                                                                </span>
                                                            )}

                                                            {student.type === 'registry' ? (
                                                                <span className="bg-purple-500/10 text-purple-400 text-[8px] px-1.5 py-0.5 rounded border border-purple-500/20 uppercase font-bold tracking-widest flex items-center gap-1">
                                                                    <Clock size={8} /> Ждет регистрации
                                                                </span>
                                                            ) : student.isRegistered && !isCompleteProfile(student) && (
                                                                <span className="bg-orange-500/10 text-orange-500 text-[8px] px-1.5 py-0.5 rounded border border-orange-500/20 uppercase font-black tracking-widest">
                                                                    Профиль не заполнен
                                                                </span>
                                                            )}

                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${student.isRegistered ? 'bg-green-500/10 text-green-500' :
                                                                    student.type === 'registry' ? 'bg-purple-500/10 text-purple-400' :
                                                                        student.type === 'trial' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                            'bg-white/5 text-white/40'
                                                                }`}>
                                                                {student.isRegistered ? 'В системе' : student.statusLabel}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${onlineStatuses[student.id]?.online ? 'bg-green-500' : 'bg-white/10'}`} />
                                                                <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">{onlineStatuses[student.id]?.online ? 'В сети' : 'Офлайн'}</span>
                                                            </div>
                                                            {student.phone && (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone size={8} className="text-sparta-gold/30" />
                                                                    <span className="text-[9px] text-sparta-gold/50 font-bold">{student.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${stats.rate}%` }}
                                                            className="h-full bg-sparta-gold"
                                                        />
                                                    </div>
                                                    <span className="text-xs font-russo text-white/60">{stats.rate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-3 py-1 rounded-lg bg-green-500/10 text-green-400 text-[10px] font-black uppercase">+12%</span>
                                                    <TrendingUp size={14} className="text-green-500" />
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    {student.status === 'at_risk' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleContactParent(student)}
                                                            className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 shadow-lg shadow-red-500/0 hover:shadow-red-500/20 animate-pulse"
                                                            title="Проявить заботу (ученик под риском)"
                                                        ><Heart size={18} /></motion.button>
                                                    )}

                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleTogglePayment?.(student.id, student.paymentStatus || 'due')}
                                                        className={`p-3 rounded-2xl transition-all border ${student.paymentStatus === 'paid'
                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500 hover:text-white'
                                                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-sparta-gold hover:text-black hover:border-sparta-gold'
                                                            }`}
                                                        title={student.paymentStatus === 'paid' ? "Отметить как неоплачено" : "Отметить как оплачено"}
                                                    ><CreditCard size={18} /></motion.button>

                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleViewStudentProfile(student)}
                                                        className="p-3 bg-white/5 hover:bg-sparta-gold hover:text-black rounded-2xl transition-all border border-white/5 hover:border-sparta-gold"
                                                        title="Профиль ученика"
                                                    ><User size={18} /></motion.button>

                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => {
                                                            setStudentToTransfer(student);
                                                            setIsTransferModalOpen(true);
                                                        }}
                                                        className="p-3 bg-white/5 hover:bg-blue-500 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-blue-500"
                                                        title="Перевести в другую группу"
                                                    ><ArrowRightLeft size={18} /></motion.button>

                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleContactParent(student)}
                                                        className="p-3 bg-white/5 hover:bg-green-500 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-green-500"
                                                        title="Связаться с родителем"
                                                    ><MessageSquare size={18} /></motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSubTab === 'journal' && (
                <div className="space-y-6">
                    <div className="bg-card glass-panel border border-main rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="text-xl font-russo text-white uppercase">Журнал посещаемости</h4>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Отмечайте присутствующих на тренировке</p>
                            </div>
                            <input
                                type="date"
                                value={attendanceDate}
                                onChange={(e) => setAttendanceDate(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupStudents.map(student => (
                                <div key={student.id} className="p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between group hover:border-sparta-gold/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-russo text-white/20">{student.name.charAt(0)}</div>
                                        <span className="text-sm font-bold">{student.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all"><CheckCircle size={18} /></button>
                                        <button className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><X size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'homework' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card glass-panel border border-main rounded-[2.5rem] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-russo text-white uppercase">Активные задания</h3>
                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Текущие цели для совершенствования навыков</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {homeworkTasks.map(task => (
                                    <div key={task.id} className="p-6 bg-white/5 border border-white/5 rounded-3xl group hover:border-sparta-gold/30 transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-sparta-gold/10 text-sparta-gold flex items-center justify-center shadow-inner"><Zap size={24} /></div>
                                            <div>
                                                <h4 className="font-bold text-lg text-white mb-1">{task.title}</h4>
                                                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Награда: {task.rewardXp} XP</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button className="p-3 bg-white/5 text-white/20 hover:text-white rounded-xl transition-all"><Settings size={18} /></button>
                                            <button className="p-3 bg-white/5 text-white/20 hover:text-red-500 rounded-xl transition-all"><TrashIcon size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                                {homeworkTasks.length === 0 && (
                                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Нет активных заданий</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DailyHubMemo = memo(DailyHub);
export default DailyHubMemo;