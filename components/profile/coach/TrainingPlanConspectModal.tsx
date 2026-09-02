import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Clock, Users, Dumbbell, Calendar, Edit2, Play, Pause,
    RotateCcw, Sparkles, Target, ChevronRight, Layers,
    CheckCircle2, Image as ImageIcon
} from 'lucide-react';
import { TrainingStages, TrainingStageExercise } from './CreateTrainingPlanModal';
import ExerciseMediaGrid from './ExerciseMediaGrid';

export interface TrainingPlanConspectModalProps {
    plan: any | null;
    isOpen: boolean;
    onClose: () => void;
    onAssignToSchedule?: (plan: any) => void;
    onEdit?: (plan: any) => void;
    allExercises?: any[];
}

const STAGE_HEADERS = [
    { key: 'warmup' as const, label: 'Разминка и активация', icon: '⚡', color: 'from-amber-500/20 to-transparent text-amber-400 border-amber-500/30' },
    { key: 'main' as const, label: 'Основной блок (Техника и тактика)', icon: '⚽', color: 'from-emerald-500/20 to-transparent text-emerald-400 border-emerald-500/30' },
    { key: 'cooldown' as const, label: 'Двусторонняя игра и заминка', icon: '🥅', color: 'from-blue-500/20 to-transparent text-blue-400 border-blue-500/30' }
];

export const TrainingPlanConspectModal: React.FC<TrainingPlanConspectModalProps> = ({
    plan,
    isOpen,
    onClose,
    onAssignToSchedule,
    onEdit,
    allExercises = []
}) => {
    const [activeTimerExerciseId, setActiveTimerExerciseId] = useState<string | null>(null);
    const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);

    // Normalize plan stages from plan object
    const stages: TrainingStages = React.useMemo(() => {
        if (!plan) return { warmup: [], main: [], cooldown: [] };

        const mapItem = (item: any, idx: number): TrainingStageExercise => {
            if (typeof item === 'string') {
                const found = allExercises.find(e => e.id === item);
                return {
                    id: `ex-${idx}`,
                    exerciseId: item,
                    title: found?.title || 'Упражнение',
                    durationMinutes: Number(found?.durationMinutes) || 15,
                    category: found?.categoryLabel || found?.category || 'Футбол',
                    mediaUrl: found?.mediaUrl || '',
                    mediaType: found?.mediaType || 'photo',
                    mediaItems: found?.mediaItems || [],
                    equipment: found?.equipment || [],
                    description: found?.description || ''
                };
            }
            return {
                id: item.id || `ex-${idx}`,
                exerciseId: item.exerciseId || item.id,
                title: item.title || 'Упражнение',
                durationMinutes: Number(item.durationMinutes) || 15,
                category: item.category || item.categoryLabel || 'Футбол',
                mediaUrl: item.mediaUrl || '',
                mediaType: item.mediaType || 'photo',
                mediaItems: item.mediaItems || [],
                equipment: item.equipment || [],
                description: item.description || ''
            };
        };

        if (plan.stages) {
            return {
                warmup: (plan.stages.warmup || []).map(mapItem),
                main: (plan.stages.main || []).map(mapItem),
                cooldown: (plan.stages.cooldown || plan.stages.skills || []).map(mapItem)
            };
        }

        if (Array.isArray(plan.exercises)) {
            return {
                warmup: [],
                main: plan.exercises.map(mapItem),
                cooldown: []
            };
        }

        return { warmup: [], main: [], cooldown: [] };
    }, [plan, allExercises]);

    // Timer effect
    React.useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && timerSecondsLeft > 0) {
            interval = setInterval(() => {
                setTimerSecondsLeft(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSecondsLeft]);

    if (!isOpen || !plan) return null;

    const totalMinutes =
        stages.warmup.reduce((a, b) => a + (Number(b.durationMinutes) || 0), 0) +
        stages.main.reduce((a, b) => a + (Number(b.durationMinutes) || 0), 0) +
        stages.cooldown.reduce((a, b) => a + (Number(b.durationMinutes) || 0), 0);

    const totalExercises = stages.warmup.length + stages.main.length + stages.cooldown.length;

    // Unique equipment
    const allEquipment = Array.from(new Set([
        ...stages.warmup.flatMap(i => i.equipment || []),
        ...stages.main.flatMap(i => i.equipment || []),
        ...stages.cooldown.flatMap(i => i.equipment || [])
    ])).filter(Boolean);

    const handleStartTimer = (ex: TrainingStageExercise) => {
        setActiveTimerExerciseId(ex.id);
        setTimerSecondsLeft(ex.durationMinutes * 60);
        setIsTimerRunning(true);
    };

    const handleToggleComplete = (exId: string) => {
        setCompletedExerciseIds(prev =>
            prev.includes(exId) ? prev.filter(id => id !== exId) : [...prev, exId]
        );
    };

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    let globalExerciseCounter = 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto custom-scrollbar">
                {/* Backdrop */}
                <div className="fixed inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    className="relative w-full max-w-4xl bg-[#121214] border border-amber-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.1)] overflow-hidden flex flex-col my-auto z-10 max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="p-6 sm:p-8 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent relative">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                        📋 Конспект занятия
                                    </span>
                                    <span className="px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1">
                                        <Users size={12} /> {plan.ageRange || plan.age || 'Все возрасты'}
                                    </span>
                                    <span className="px-3 py-1 bg-white/5 border border-white/10 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1">
                                        <Clock size={12} /> {totalMinutes || plan.totalMinutes || 60} мин
                                    </span>
                                    <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
                                        <Target size={12} /> {totalExercises || plan.totalExercises || 4} упр.
                                    </span>
                                </div>

                                <h2 className="text-xl sm:text-3xl font-russo text-white uppercase tracking-tight">
                                    {plan.title}
                                </h2>

                                {plan.description && (
                                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
                                        {plan.description}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all border border-white/10 cursor-pointer shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Equipment Summary Banner */}
                        {allEquipment.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
                                    <Dumbbell size={13} /> Необходимый инвентарь:
                                </span>
                                {allEquipment.map((eq) => (
                                    <span
                                        key={eq}
                                        className="px-2.5 py-0.5 rounded-lg bg-black/60 border border-white/10 text-white text-[11px] font-medium"
                                    >
                                        {eq}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Timer Sticky Widget (if running) */}
                    {activeTimerExerciseId && (
                        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between gap-3 text-amber-300">
                            <div className="flex items-center gap-3">
                                <span className="font-russo text-xl text-amber-400 tracking-wider">
                                    ⏱ {formatTimer(timerSecondsLeft)}
                                </span>
                                <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-md">
                                    {stages.warmup.concat(stages.main, stages.cooldown).find(e => e.id === activeTimerExerciseId)?.title}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    className="px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                                    {isTimerRunning ? 'Пауза' : 'Старт'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const found = stages.warmup.concat(stages.main, stages.cooldown).find(e => e.id === activeTimerExerciseId);
                                        if (found) setTimerSecondsLeft(found.durationMinutes * 60);
                                    }}
                                    className="p-1 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                                    title="Сброс таймера"
                                >
                                    <RotateCcw size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTimerExerciseId(null)}
                                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Conspect Body: 3 Stages */}
                    <div className="p-5 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                        {STAGE_HEADERS.map((stageHeader) => {
                            const stageExercises = stages[stageHeader.key];
                            if (stageExercises.length === 0) return null;

                            const stageMinutes = stageExercises.reduce((a, b) => a + (Number(b.durationMinutes) || 0), 0);

                            return (
                                <div key={stageHeader.key} className="space-y-4">
                                    {/* Stage Title */}
                                    <div className={`px-4 py-2.5 rounded-2xl bg-gradient-to-r border flex items-center justify-between ${stageHeader.color}`}>
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg">{stageHeader.icon}</span>
                                            <h3 className="text-sm sm:text-base font-russo uppercase tracking-wider text-white">
                                                {stageHeader.label}
                                            </h3>
                                        </div>
                                        <span className="text-xs font-bold">
                                            {stageMinutes} мин • {stageExercises.length} упр.
                                        </span>
                                    </div>

                                    {/* Exercise Cards in Stage */}
                                    <div className="space-y-4">
                                        {stageExercises.map((ex) => {
                                            globalExerciseCounter++;
                                            const isCompleted = completedExerciseIds.includes(ex.id);
                                            const isTimerActiveForThis = activeTimerExerciseId === ex.id;

                                            return (
                                                <div
                                                    key={ex.id}
                                                    className={`rounded-3xl border p-5 sm:p-6 transition-all ${
                                                        isCompleted
                                                            ? 'bg-zinc-900/40 border-white/5 opacity-70'
                                                            : 'bg-[#18181b] border-white/10 hover:border-amber-500/30 shadow-lg'
                                                    }`}
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                        {/* Left: Index & Exercise Details */}
                                                        <div className="space-y-3 flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleComplete(ex.id)}
                                                                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-russo text-xs transition-all cursor-pointer ${
                                                                        isCompleted
                                                                            ? 'bg-emerald-500 text-black'
                                                                            : 'bg-black/60 border border-white/15 text-amber-400 hover:border-amber-400'
                                                                    }`}
                                                                    title={isCompleted ? 'Отметить невыполненным' : 'Отметить выполненным'}
                                                                >
                                                                    {isCompleted ? <CheckCircle2 size={16} /> : `#${globalExerciseCounter}`}
                                                                </button>

                                                                <div>
                                                                    <h4 className={`text-base sm:text-lg font-bold text-white ${isCompleted ? 'line-through text-zinc-400' : ''}`}>
                                                                        {ex.title}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                                                        <span className="text-amber-400/90 font-bold">{ex.category || 'Футбол'}</span>
                                                                        <span>•</span>
                                                                        <span className="text-zinc-300 font-semibold">⏱ {ex.durationMinutes} мин</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Exercise Equipment Chips */}
                                                            {ex.equipment && ex.equipment.length > 0 && (
                                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                    {ex.equipment.map((eq) => (
                                                                        <span
                                                                            key={eq}
                                                                            className="px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-[10px] font-medium text-zinc-300"
                                                                        >
                                                                            {eq}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Description / Rules */}
                                                            {ex.description && (
                                                                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-black/40 p-3.5 rounded-2xl border border-white/5">
                                                                    {ex.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Right: Media Thumbnail + Timer action */}
                                                        <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                                                            {/* Media preview thumbnail */}
                                                            {(ex.mediaUrl || (ex.mediaItems && ex.mediaItems.length > 0)) ? (
                                                                <div className="w-28 sm:w-36 h-20 sm:h-24 rounded-2xl overflow-hidden border border-white/10 bg-black relative shadow-md">
                                                                    <ExerciseMediaGrid
                                                                        mediaItems={ex.mediaItems}
                                                                        mediaUrl={ex.mediaUrl}
                                                                        mediaType={ex.mediaType}
                                                                        title={ex.title}
                                                                        onOpenLightbox={() => {}}
                                                                        className="h-full"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="w-28 sm:w-36 h-20 sm:h-24 rounded-2xl border border-dashed border-white/10 bg-black/30 flex flex-col items-center justify-center text-zinc-600 gap-1 text-[10px]">
                                                                    <ImageIcon size={18} className="opacity-30" />
                                                                    <span>Без схемы</span>
                                                                </div>
                                                            )}

                                                            {/* Timer Action Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartTimer(ex)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                                    isTimerActiveForThis
                                                                        ? 'bg-amber-500 text-black font-black shadow-md'
                                                                        : 'bg-white/5 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-white/10'
                                                                }`}
                                                            >
                                                                <Play size={12} />
                                                                <span>Таймер ({ex.durationMinutes}м)</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-white/10 bg-[#121214] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onEdit(plan);
                                        onClose();
                                    }}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2 cursor-pointer"
                                >
                                    <Edit2 size={14} /> Редактировать план
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Закрыть
                            </button>

                            {onAssignToSchedule && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onAssignToSchedule(plan);
                                        onClose();
                                    }}
                                    className="px-6 py-2.5 rounded-xl bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2 cursor-pointer active:scale-95"
                                >
                                    <Calendar size={15} />
                                    <span>📅 Назначить в расписание</span>
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TrainingPlanConspectModal;
