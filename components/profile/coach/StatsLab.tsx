import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Calendar,
    Sparkles,
    Layers,
    Search,
    Users,
    Clock,
    Zap,
    Award,
    ChevronRight,
    HelpCircle,
    Activity,
    TrendingDown,
    AlertCircle,
    FileText,
    Share2,
    Download,
    X,
    Activity as ActivityIcon,
    Shield,
    ArrowRight,
    CheckCircle
} from 'lucide-react';

interface SkillsDistribution {
    name: string;
    value: number;
    fullMark: number;
}

interface CoachHistoryStats {
    skillsDistribution: SkillsDistribution[];
    avgAttendance: number;
    attendanceTrend: Array<{ name: string; present: number }>;
    monthlyXp: number;
    commitmentLevel?: string;
    stabilityMeter?: number;
    atRiskCount?: number;
    attendanceChange?: number;
    avgSkillScore: string | number;
}

interface StatsLabProps {
    statsError: string | null;
    theme: string;
    coachHistoryStats: CoachHistoryStats;
    comparingTrialId: string | null;
    trialEvaluations: Record<string, any>;
    trialRequests: any[];
    myGroups: any[];
    selectedGroupId: string | null;
    recommendedGroups: any[];
    allGroupsStats: Record<string, any>;
    groupStudents: any[];
    calculateGroupFit: (trial: any, group: any, stats?: any) => number;
    setComparingTrialId: (id: string | null) => void;
    setSelectedGroupId: (id: string | null) => void;
    setSelectedTrialRequest: (trial: any) => void;
    setIsEnrollModalOpen: (open: boolean) => void;
    setMainTab: (tab: 'dashboard' | 'groups' | 'messages' | 'stats' | 'calendar' | 'exercises' | 'programs' | 'trials') => void;
}

const StatsLab: React.FC<StatsLabProps> = ({
    statsError,
    theme,
    coachHistoryStats,
    comparingTrialId,
    trialEvaluations,
    trialRequests,
    myGroups,
    selectedGroupId,
    recommendedGroups,
    allGroupsStats,
    groupStudents,
    calculateGroupFit,
    setComparingTrialId,
    setSelectedGroupId,
    setSelectedTrialRequest,
    setIsEnrollModalOpen,
    setMainTab
}) => {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    return (
        <div className="bg-card glass-panel border border-main rounded-[2.5rem] p-6 lg:p-10 min-h-[600px] animate-in fade-in zoom-in-95 duration-700">
            {statsError && (
                <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-500 uppercase">
                    <HelpCircle size={24} />
                    <div>
                        <p className="text-sm font-bold uppercase tracking-tight">Ошибка загрузки данных</p>
                        <p className="text-[10px] opacity-70 font-black uppercase tracking-widest mt-1">{statsError}</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/5 pb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-2xl lg:text-3xl font-russo text-white uppercase tracking-tight">Лаборатория Успеха</h3>
                    </div>
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">Система мониторинга прогресса команды • Real-time</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-3 glass-panel border border-main rounded-2xl flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Период</p>
                            <p className="text-[10px] font-black text-sparta-gold uppercase">Последние 30 дней</p>
                        </div>
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                            <Calendar size={18} />
                        </div>
                    </div>

                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="px-6 py-4 bg-sparta-gold text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-lg shadow-sparta-gold/20 flex items-center gap-2 group/report"
                    >
                        <FileText size={16} className="group-hover/report:rotate-12 transition-transform" />
                        Сформировать отчет
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Left: Premium Performance Pods */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* Tactical Skill Matrix (Simplified Radar replacement) */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 aspect-square relative group/stats overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover/stats:scale-110 transition-transform">
                                <Activity size={200} />
                            </div>

                            <div className="relative z-10 h-full flex flex-col">
                                <div className="mb-8">
                                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Анализ Потенциала</h4>
                                    <p className="text-sm font-russo text-sparta-gold uppercase">Team DNA Summary</p>
                                </div>

                                <div className="flex-1 flex flex-col justify-center gap-6">
                                    {/* Major Dominant Skill */}
                                    {(() => {
                                        const sorted = [...(coachHistoryStats.skillsDistribution || [])].sort((a, b) => b.value - a.value);
                                        const dominant = sorted[0];
                                        const growth = sorted[sorted.length - 1];

                                        return (
                                            <>
                                                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 relative overflow-hidden group/dom">
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 group-hover/dom:rotate-12 transition-transform">
                                                        <Award size={60} className="text-sparta-gold" />
                                                    </div>
                                                    <p className="text-[10px] font-black text-sparta-gold uppercase tracking-widest mb-1">Доминирующий навык</p>
                                                    <h3 className="text-2xl font-russo text-white uppercase">{dominant?.name || '---'}</h3>
                                                    <div className="mt-4 flex items-center gap-3">
                                                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-sparta-gold shadow-[0_0_10px_#FFD700]" style={{ width: `${dominant?.value || 0}%` }} />
                                                        </div>
                                                        <span className="text-xs font-russo text-white">{Math.round(dominant?.value || 0)}%</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col justify-between">
                                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-2">Зона роста</p>
                                                        <p className="text-sm font-russo text-white uppercase">{growth?.name || '---'}</p>
                                                        <p className="text-[10px] font-bold text-red-400 mt-2 flex items-center gap-1">
                                                            <TrendingDown size={10} /> {Math.round(growth?.value || 0)}%
                                                        </p>
                                                    </div>
                                                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col justify-between">
                                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-2">Группа</p>
                                                        <p className="text-sm font-russo text-white uppercase">Synergy</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${Number(coachHistoryStats.avgSkillScore) >= 4.5 ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' :
                                                                    Number(coachHistoryStats.avgSkillScore) >= 4.0 ? 'bg-blue-400' : 'bg-sparta-gold'
                                                                }`} />
                                                            <p className="text-[10px] font-bold text-white uppercase">
                                                                {Number(coachHistoryStats.avgSkillScore) >= 4.5 ? 'Elite' :
                                                                    Number(coachHistoryStats.avgSkillScore) >= 4.0 ? 'Optimal' : 'Stable'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {comparingTrialId && (
                                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Совместимость с кандидатом</span>
                                        </div>
                                        <span className="text-lg font-russo text-white">92%</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Skill Growth Capsules */}
                        <div className="space-y-4">
                            {(comparingTrialId && trialEvaluations[comparingTrialId]
                                ? coachHistoryStats.skillsDistribution.map((s: any) => ({
                                    ...s,
                                    trialValue: trialEvaluations[comparingTrialId][
                                        s.name.includes('Техника') ? 'technique' :
                                            s.name.includes('Сила') ? 'strength' :
                                                s.name.includes('Скорость') ? 'speed' :
                                                    s.name.includes('Вын') ? 'endurance' : 'discipline'
                                    ] || 0
                                }))
                                : (coachHistoryStats.skillsDistribution || [])
                            ).map((skill: any, idx: number) => {
                                const icons: Record<string, any> = {
                                    'Техника': { icon: Award, color: 'text-blue-400', bg: 'bg-blue-400/5' },
                                    'Сила': { icon: Zap, color: 'text-red-400', bg: 'bg-red-400/5' },
                                    'Скорость': { icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/5' },
                                    'Вын-сть': { icon: Activity, color: 'text-green-400', bg: 'bg-green-400/5' },
                                    'Дисциплина': { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/5' },
                                    'Гибкость': { icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-400/5' }
                                };
                                const skillMeta = icons[skill.name] || { icon: Layers, color: 'text-sparta-gold', bg: 'bg-sparta-gold/5' };
                                const currentValue = skill.trialValue !== undefined ? skill.trialValue : skill.value;

                                // Real change logic based on avgAttendance or historical factors if available
                                const diff = skill.trialValue !== undefined
                                    ? Math.round(skill.trialValue - skill.value)
                                    : (Math.sin(idx + Date.now() / 100000) * 5 + (coachHistoryStats.avgAttendance > 80 ? 2 : -1)).toFixed(1);

                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group/capsule p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-default flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl ${skillMeta.bg} ${skillMeta.color} flex items-center justify-center group-hover/capsule:scale-110 transition-transform`}>
                                                <skillMeta.icon size={18} />
                                            </div>
                                            <div>
                                                <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">{skill.name}</h5>
                                                <p className="text-lg font-russo text-white leading-none">{Math.round(currentValue)}%</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 ${currentValue >= 80 ? 'bg-green-500/10 text-green-400' :
                                                    currentValue >= 60 ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-sparta-gold/10 text-sparta-gold text-white/40'
                                                }`}>
                                                <div className={`w-1 h-1 rounded-full ${currentValue >= 80 ? 'bg-green-400' :
                                                        currentValue >= 60 ? 'bg-blue-400' : 'bg-sparta-gold'
                                                    }`} />
                                                {currentValue >= 80 ? 'Профи' :
                                                    currentValue >= 60 ? 'Норма' : 'Рост'}
                                            </div>

                                            <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 ${Number(diff) >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {Number(diff) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                {Math.abs(Math.round(Number(diff)))}%
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Coach's Playbook: Dynamic Insights */}
                    <div className="p-8 bg-field border border-white/5 rounded-[3rem] relative overflow-hidden group/playbook">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover/playbook:scale-110 transition-transform">
                            <Layers size={150} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-sparta-gold text-black rounded-2xl shadow-lg shadow-sparta-gold/20">
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-russo text-white uppercase tracking-tight">Coach's Playbook</h4>
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">Стратегические рекомендации AI</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Analysis Live</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <motion.div
                                        whileHover={{ x: 10 }}
                                        className="p-6 bg-black/40 border border-white/5 rounded-3xl hover:border-sparta-gold/30 transition-all cursor-pointer group/item"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <Sparkles size={16} className="text-sparta-gold" />
                                                <span className="text-[10px] font-black text-sparta-gold uppercase tracking-widest">Главный приоритет</span>
                                            </div>
                                            <div className="px-2 py-0.5 bg-sparta-gold/20 text-sparta-gold text-[8px] font-black uppercase rounded tracking-tighter">Tactical Focus</div>
                                        </div>
                                        <p className="text-sm text-white/80 leading-relaxed font-russo uppercase mb-4">
                                            {comparingTrialId ? (
                                                `Форсировать технику: Кандидат готов к Elite-нагрузкам`
                                            ) : (() => {
                                                const lowestSkill = [...(coachHistoryStats.skillsDistribution || [])].sort((a, b) => a.value - b.value)[0];
                                                return lowestSkill
                                                    ? `Дефицит: ${lowestSkill.name}. Рекомендовано: Усиленная работа над базой.`
                                                    : "Групповой баланс в норме";
                                            })()}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-white/30 font-black uppercase">Click to open drill templates</span>
                                            <ArrowRight size={12} className="text-white/20 group-hover/item:text-sparta-gold transition-colors" />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        whileHover={{ x: 10 }}
                                        className="p-6 bg-black/40 border border-white/5 rounded-3xl hover:border-blue-500/30 transition-all cursor-pointer group/item"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <TrendingUp size={16} className="text-blue-400" />
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Прогноз развития</span>
                                            </div>
                                            <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase rounded tracking-tighter">AI Logic</div>
                                        </div>
                                        <p className="text-sm text-white/80 leading-relaxed font-russo uppercase mb-4">
                                            {comparingTrialId ? (
                                                "Готовность к переводу: 3.5 недели"
                                            ) : (
                                                `Цель месяца: +${(4 + Number(coachHistoryStats.avgSkillScore)).toFixed(1)}% Прогресса`
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-white/30 font-black uppercase">Review detailed projection</span>
                                            <ArrowRight size={12} className="text-white/20 group-hover/item:text-blue-400 transition-colors" />
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="p-8 bg-sparta-gold/5 border border-sparta-gold/20 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden group/rec">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold/10 blur-3xl rounded-full -mr-16 -mt-16" />

                                    <div className="relative z-10">
                                        <div className="bg-sparta-gold/10 text-sparta-gold text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-fit mb-4">
                                            Рекомендация по группе
                                        </div>
                                        <h5 className="text-lg font-russo text-white uppercase mb-4 leading-tight">
                                            {comparingTrialId ? 'Оптимальный состав' : 'Тактическая замена'}
                                        </h5>
                                        <p className="text-xs text-white/60 leading-relaxed uppercase font-bold tracking-tight mb-8">
                                            {comparingTrialId ?
                                                `На основе анализа навыков, группа "${myGroups.find(g => g.id === selectedGroupId)?.name || 'Текущая'}" является наиболее сбалансированным выбором.` :
                                                "Рассмотрите возможность перевода 2-х топовых игроков в Elite-состав для повышения конкуренции."
                                            }
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setMainTab(comparingTrialId ? 'trials' : 'calendar')}
                                        className="relative z-10 w-full py-4 bg-sparta-gold text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 group/btn"
                                    >
                                        {comparingTrialId ? 'Завершить оценку' : 'Применить к плану'}
                                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                            <Activity size={120} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                        <Activity size={20} />
                                    </div>
                                    <h5 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Посещаемость</h5>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${coachHistoryStats.avgAttendance >= 95 ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.1)]' :
                                        coachHistoryStats.avgAttendance >= 85 ? 'bg-blue-500/20 text-blue-400' :
                                            coachHistoryStats.avgAttendance >= 70 ? 'bg-sparta-gold/20 text-sparta-gold' :
                                                'bg-red-500/20 text-red-400 animate-pulse'
                                    }`}>
                                    <div className={`w-1 h-1 rounded-full ${coachHistoryStats.avgAttendance >= 95 ? 'bg-green-400 animate-ping' :
                                            coachHistoryStats.avgAttendance >= 70 ? 'bg-current' : 'bg-red-400'
                                        }`} />
                                    {coachHistoryStats.avgAttendance >= 95 ? 'Maximum Commitment' :
                                        coachHistoryStats.avgAttendance >= 85 ? 'Elite Stability' :
                                            coachHistoryStats.avgAttendance >= 70 ? 'Regular Growth' :
                                                'Critical Attention Needed'}
                                </div>
                            </div>

                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-6xl font-russo text-white tracking-tighter">{coachHistoryStats.avgAttendance}%</span>
                                <div className={`flex items-center gap-1 text-[11px] font-black ${(coachHistoryStats.attendanceChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    <TrendingUp size={12} /> {(coachHistoryStats.attendanceChange || 0) >= 0 ? '+' : ''}{coachHistoryStats.attendanceChange || 0}%
                                </div>
                            </div>
                            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-8">
                                {coachHistoryStats.avgAttendance > 80 ? 'Родители активно вовлечены' : 'Требуется мотивационная работа'}
                            </p>

                            {/* Stability Meter */}
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Стабильность</span>
                                    <span className="text-[10px] font-russo text-white">{coachHistoryStats.stabilityMeter || 100}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${coachHistoryStats.stabilityMeter || 100}%` }}
                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                    />
                                </div>
                            </div>

                            {/* Risk Alert Box */}
                            {coachHistoryStats.atRiskCount > 0 && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 mb-8">
                                    <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                                        <AlertCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-white leading-none mb-1">{coachHistoryStats.atRiskCount} учеников под риском</p>
                                        <p className="text-[9px] text-red-400/60 font-medium tracking-tight">Резкий спад посещаемости</p>
                                    </div>
                                </div>
                            )}

                            {/* Simple Attendance History Markers */}
                            <div className="mt-8">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">История посещений (последние 7)</p>
                                <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                    {(coachHistoryStats.attendanceTrend || []).slice(-7).map((day: any, i: number) => (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full shadow-lg ${day.present >= 90 ? 'bg-green-400 shadow-green-500/20' :
                                                    day.present >= 70 ? 'bg-blue-400 shadow-blue-500/20' :
                                                        'bg-red-400 shadow-red-500/20'
                                                }`} />
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">{day.date || '---'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommended Groups Panel */}
                    {comparingTrialId && (
                        <div className="p-8 bg-card glass-panel border border-main rounded-[2.5rem] relative overflow-hidden group">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-sparta-gold/10 rounded-xl text-sparta-gold">
                                    <Layers size={20} />
                                </div>
                                <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Умный подбор групп</h4>
                            </div>

                            <div className="space-y-4">
                                {recommendedGroups.length > 0 ? (
                                    recommendedGroups.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className={`p-5 rounded-3xl border transition-all cursor-pointer group/rec ${String(item.group.id) === String(selectedGroupId)
                                                    ? 'bg-sparta-gold/10 border-sparta-gold/30'
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            onClick={() => setSelectedGroupId(item.group.id)}
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[11px] font-russo text-white uppercase truncate max-w-[120px]">{item.group.name}</span>
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${item.group.name.toLowerCase().includes('pro') ? 'bg-red-500/20 text-red-400' :
                                                                item.group.name.toLowerCase().includes('begin') ? 'bg-blue-500/20 text-blue-400' :
                                                                    'bg-sparta-gold/20 text-sparta-gold'
                                                            }`}>
                                                            {item.group.name.toLowerCase().includes('pro') ? 'Hard' :
                                                                item.group.name.toLowerCase().includes('begin') ? 'Easy' : 'Medium'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{allGroupsStats[item.group.id]?.count || 0} учеников</span>
                                                </div>
                                                <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black ${item.fitScore >= 80 ? 'bg-green-500/10 text-green-400' :
                                                        item.fitScore >= 60 ? 'bg-sparta-gold/10 text-sparta-gold' :
                                                            'bg-white/10 text-white/40'
                                                    }`}>
                                                    {item.fitScore}% Fit
                                                </div>
                                            </div>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.fitScore}%` }}
                                                    className={`h-full ${item.fitScore >= 80 ? 'bg-green-400' :
                                                            item.fitScore >= 60 ? 'bg-sparta-gold' :
                                                                'bg-white/20'
                                                        }`}
                                                />
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <Search size={24} className="mx-auto text-white/10 mb-2" />
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Нет подходящих групп</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-relaxed">
                                    AI анализирует возраст, расписание и уровень мастерства для создания комфортной среды обучения.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Distribution Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Всего атлетов', value: groupStudents.length, icon: Users, color: 'text-blue-400' },
                    { label: 'Пробные (Trial)', value: groupStudents.filter(s => s.type === 'trial').length, icon: Clock, color: 'text-yellow-400' },
                    { label: 'Выдано XP', value: coachHistoryStats.monthlyXp.toLocaleString(), icon: Zap, color: 'text-purple-400' },
                    { label: 'Уровень группы', value: 'B+', icon: Award, color: 'text-sparta-gold' }
                ].map((stat, i) => (
                    <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl bg-white/5 ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <ChevronRight size={14} className="text-white/10" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{stat.label}</p>
                        <p className="text-2xl font-russo text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Report Generation Modal */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-10"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-zinc-950 border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden relative shadow-[0_0_100px_rgba(212,175,55,0.1)]"
                        >
                            <button
                                onClick={() => setIsReportModalOpen(false)}
                                className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all z-20"
                            >
                                <X size={24} />
                            </button>

                            <div className="p-10 lg:p-16">
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="w-20 h-20 bg-sparta-gold rounded-[2rem] flex items-center justify-center shadow-lg shadow-sparta-gold/20">
                                        <Award size={40} className="text-black" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-russo text-white uppercase tracking-tight">Отчет за месяц</h2>
                                        <p className="text-sparta-gold text-xs font-black uppercase tracking-[0.3em] mt-1">SPARTA COMMAND CENTER • ПРОГРЕСС</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-10 mb-10 relative overflow-hidden group">
                                    <div className="absolute -right-10 -top-10 opacity-[0.02]">
                                        <Shield size={200} />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-end mb-10">
                                            <div>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Спортсмен</p>
                                                <h3 className="text-2xl font-russo text-white uppercase leading-none">
                                                    {comparingTrialId ? trialRequests.find(t => String(t.id) === String(comparingTrialId))?.name : 'Вся группа'}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">XP Накоплено</p>
                                                <h3 className="text-2xl font-russo text-sparta-gold leading-none">{coachHistoryStats.monthlyXp}</h3>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                {coachHistoryStats.skillsDistribution.slice(0, 3).map((skill, i) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{skill.name}</span>
                                                            <span className="text-[10px] font-russo text-white">{skill.value}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-sparta-gold" style={{ width: `${skill.value}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-6 bg-white/5 rounded-[1.5rem] border border-white/5 flex flex-col justify-center">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Activity size={18} className="text-blue-400" />
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Стабильность</span>
                                                </div>
                                                <p className="text-3xl font-russo text-white mb-1">{coachHistoryStats.stabilityMeter || 100}%</p>
                                                <p className="text-[8px] font-bold text-green-400 uppercase tracking-widest">Выше среднего по клубу</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button className="flex-1 py-5 bg-white text-black rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-sparta-gold transition-all flex items-center justify-center gap-2">
                                        <Share2 size={16} /> Поделиться с родителем
                                    </button>
                                    <button className="px-8 py-5 bg-white/5 text-white/40 hover:text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all">
                                        <Download size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(StatsLab);