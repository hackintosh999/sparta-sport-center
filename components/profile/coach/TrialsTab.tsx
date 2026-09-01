import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Calendar,
    UserPlus,
    Star,
    Activity,
    Trophy,
    Zap,
    ChevronRight,
    Award as TrophyIcon,
    Trash2,
    Eye,
    ChevronUp,
    ChevronDown,
    MoreHorizontal,
    CheckCircle
} from 'lucide-react';
import { Button } from '../../UIComponents';

interface TrialRequest {
    id: string;
    name?: string;
    childSurname: string;
    childName: string;
    childAge?: number;
    age?: number;
    level?: string;
    otherSports?: string;
    footballExp?: string;
    motivation?: 'win' | 'friends' | 'skills' | 'fun';
    evaluation?: any;
}

interface TrialsTabProps {
    trialRequests: TrialRequest[];
    myTrialRequests: TrialRequest[];
    trialEvaluations: Record<string, any>;
    calculateGroupFit: (trial: TrialRequest, group: any) => number;
    handleStartComparison: (trial: TrialRequest) => void;
    handleContactParent: (person: TrialRequest) => void;
    setSelectedTrialForEval: (trial: TrialRequest) => void;
    setIsEvaluationModalOpen: (open: boolean) => void;
    setCurrentEvalSkills: (skills: any) => void;
    myGroups: any[];
    onDeleteRequest?: (id: string) => void;
    onViewDetails?: (trial: TrialRequest) => void;
    setSelectedEvalTags: (tags: string[]) => void;
    setCoachEvalComment: (comment: string) => void;
}

const TrialsTab: React.FC<TrialsTabProps> = ({
    trialRequests,
    myTrialRequests,
    trialEvaluations,
    calculateGroupFit,
    handleStartComparison,
    handleContactParent,
    setSelectedTrialForEval,
    setIsEvaluationModalOpen,
    setCurrentEvalSkills,
    myGroups,
    onDeleteRequest,
    onViewDetails,
    setSelectedEvalTags,
    setCoachEvalComment
}) => {
    const [isSectionCollapsed, setIsSectionCollapsed] = React.useState(false);
    const [visibleCount, setVisibleCount] = React.useState(3);

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Вы уверены, что хотите удалить эту заявку?')) {
            onDeleteRequest?.(id);
        }
    };
    return (
        <div className="bg-card glass-panel border border-main rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-sparta-gold/5 to-transparent">
                <div>
                    <h3 className="text-xl font-russo text-white uppercase flex items-center gap-3">
                        <UserPlus className="text-sparta-gold" /> Приемная : Новые заявки
                    </h3>
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-1">Шаг 1: Распределение учеников после пробных занятий</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-2 h-2 bg-sparta-gold animate-ping rounded-full" />
                        <span className="text-[10px] font-black uppercase text-sparta-gold">{myTrialRequests.length} Ожидают решения</span>
                    </div>
                    <button
                        onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                        {isSectionCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {!isSectionCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {trialRequests.slice(0, visibleCount).map((trial) => {
                                // Demo fit vs first group or selected
                                const fitScore = calculateGroupFit(trial, myGroups[0]);
                                return (
                                    <motion.div
                                        key={trial.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-1 rounded-[2.8rem] bg-gradient-to-br from-sparta-gold/20 via-white/5 to-transparent group"
                                    >
                                        <div className="p-8 bg-[#151515] rounded-[2.5rem] h-full relative overflow-hidden flex flex-col">
                                            {/* Status Header */}
                                            <div className="flex justify-between items-start mb-8 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl bg-field border border-sparta-gold/20 flex items-center justify-center font-russo text-3xl text-sparta-gold shadow-2xl">
                                                        {(trial.childSurname || trial.name || 'Н').charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        {(trial as any).isMembership ? (
                                                            (trial as any).paymentMethod === 'cash' ? (
                                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest mb-2 w-fit">
                                                                    💵 Абонемент (Оплата на поле)
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest mb-2 w-fit">
                                                                    💳 Абонемент (Оплачен)
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest mb-2 w-fit">
                                                                🆓 Пробное занятие
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex -space-x-2">
                                                                {[1, 2, 3].map(i => (
                                                                    <div key={i} className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-white/30">
                                                                        <Star size={8} />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <span className="text-[9px] text-white/20 font-bold">Оценивается</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Fit Circle & Actions */}
                                                <div className="flex flex-col items-end gap-3">
                                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                                        <svg className="w-full h-full -rotate-90">
                                                            <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                                                            <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={126} strokeDashoffset={126 - (126 * fitScore / 100)} className="text-sparta-gold" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            <span className="text-[10px] font-russo text-white">{fitScore}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onViewDetails?.(trial); }}
                                                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-sparta-gold hover:bg-sparta-gold/10 transition-all"
                                                            title="Просмотреть"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(e, trial.id)}
                                                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                            title="Удалить"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6 relative z-10 flex-grow">
                                                <div>
                                                    <h4 className="text-2xl font-bold text-white mb-1 group-hover:text-sparta-gold transition-colors truncate">
                                                        {trial.childSurname} {trial.childName}
                                                    </h4>
                                                    <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                                        <Calendar size={12} className="text-sparta-gold" /> {trial.childAge || trial.age} лет • {trial.level || 'Начальный уровень'}
                                                    </p>
                                                </div>

                                                {/* Sports Bio & Motivation */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            <Activity size={10} className="text-blue-400" /> Спорт.Био
                                                        </p>
                                                        <p className="text-[10px] text-white/50 leading-tight line-clamp-2">
                                                            {trial.otherSports || 'Опыт в других видах не указан'}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                            <Trophy size={10} className="text-sparta-gold" /> Фк.Опыт
                                                        </p>
                                                        <p className="text-[10px] text-white/50 leading-tight line-clamp-2">
                                                            {trial.footballExp || 'Первые шаги в футболе'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Simple Skill Bars */}
                                                <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Техника</span>
                                                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-sparta-gold" style={{ width: '65%' }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Физика</span>
                                                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-400" style={{ width: '80%' }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Дисциплина</span>
                                                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-green-400" style={{ width: '45%' }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 p-4 bg-sparta-gold/5 border border-sparta-gold/20 rounded-2xl">
                                                    <div className="shrink-0 w-8 h-8 rounded-full bg-sparta-gold/10 flex items-center justify-center text-xl">
                                                        {trial.motivation === 'win' ? '🏆' : trial.motivation === 'friends' ? '🤝' : trial.motivation === 'skills' ? '⚽' : '😊'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black text-sparta-gold/60 uppercase tracking-widest">Двигатель (Мотивация)</p>
                                                        <p className="text-[10px] text-white/60 font-medium leading-tight truncate">
                                                            {trial.motivation === 'win' ? 'Стремится к победам и кубкам' :
                                                                trial.motivation === 'friends' ? 'Ищет друзей и командный дух' :
                                                                    trial.motivation === 'skills' ? 'Хочет выучить все финты' :
                                                                        'Просто получает удовольствие от игры'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-8 space-y-3 relative z-10">
                                                {trialEvaluations[trial.id] ? (
                                                    <Button
                                                        onClick={() => {
                                                            const existingEval = trialEvaluations[trial.id];
                                                            setSelectedTrialForEval(trial);
                                                            setIsEvaluationModalOpen(true);
                                                            if (existingEval) {
                                                                setCurrentEvalSkills(existingEval.skills || existingEval);
                                                                setSelectedEvalTags(existingEval.tags || []);
                                                                setCoachEvalComment(existingEval.comment || '');
                                                            }
                                                        }}
                                                        className="w-full py-5 bg-sparta-gold text-black rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] shadow-xl shadow-sparta-gold/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                                    >
                                                        Принять решение <CheckCircle size={16} />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedTrialForEval(trial);
                                                            setIsEvaluationModalOpen(true);
                                                            setCurrentEvalSkills({ technique: 50, strength: 50, speed: 50, endurance: 50, discipline: 50 });
                                                            setSelectedEvalTags([]);
                                                            setCoachEvalComment('');
                                                        }}
                                                        className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                                    >
                                                        Оценить потенциал <Zap size={16} />
                                                    </Button>
                                                )}

                                                <button
                                                    onClick={() => handleContactParent(trial)}
                                                    className="w-full py-3 text-[9px] font-black text-sparta-gold uppercase tracking-widest hover:text-white transition-colors"
                                                >
                                                    Написать родителю
                                                </button>
                                            </div>

                                            {/* Decorative BG Icon */}
                                            <div className="absolute -bottom-10 -right-10 opacity-[0.03] text-white group-hover:scale-110 transition-transform">
                                                <TrophyIcon size={200} />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {myTrialRequests.length === 0 && (
                                <div className="col-span-full py-32 text-center bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                                    <Users size={64} className="text-white/5 mx-auto mb-6" />
                                    <h4 className="text-xl font-russo text-white/20 uppercase">Все заявки обработаны</h4>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/10 mt-2">Когда придут новые спортсмены, они появятся здесь</p>
                                </div>
                            )}
                        </div>

                        {trialRequests.length > visibleCount && (
                            <div className="px-8 pb-8 flex justify-center">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 3)}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center gap-2"
                                >
                                    Показать еще ({trialRequests.length - visibleCount}) <ChevronDown size={14} />
                                </button>
                            </div>
                        )}
                        {visibleCount > 3 && (
                            <div className="px-8 pb-8 flex justify-center">
                                <button
                                    onClick={() => setVisibleCount(3)}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all flex items-center gap-2"
                                >
                                    Свернуть список <ChevronUp size={14} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(TrialsTab);