import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Trash2, ArrowUp, ArrowDown, Clock, Users,
    Search, Dumbbell, Sparkles, Check, ChevronDown, Layers,
    Zap, Target, Shield, HelpCircle
} from 'lucide-react';
import { db } from '../../../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export interface TrainingStageExercise {
    id: string; // unique key in plan
    exerciseId?: string;
    title: string;
    durationMinutes: number;
    category?: string;
    mediaUrl?: string;
    mediaType?: 'photo' | 'video' | 'url';
    mediaItems?: any[];
    equipment?: string[];
    description?: string;
}

export interface TrainingStages {
    warmup: TrainingStageExercise[];
    main: TrainingStageExercise[];
    cooldown: TrainingStageExercise[];
}

export interface CreateTrainingPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (planData: any) => Promise<void>;
    editingPlan?: any | null;
    coachId?: string;
    coachName?: string;
    allExercises?: any[];
}

const STAGE_CONFIGS = [
    {
        key: 'warmup' as const,
        label: 'Разминка и активация',
        icon: '⚡',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        defaultMinutes: 15,
        description: 'Разогрев мышц, суставная гимнастика, координация и базовая подвижность'
    },
    {
        key: 'main' as const,
        label: 'Основной блок (Техника и тактика)',
        icon: '⚽',
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        defaultMinutes: 35,
        description: 'Ключевые футбольные упражнения: дриблинг, передачи, удары, тактические взаимодействия'
    },
    {
        key: 'cooldown' as const,
        label: 'Двусторонняя игра и заминка',
        icon: '🥅',
        badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        defaultMinutes: 20,
        description: 'Свободная игра с заданием, дыхательные упражнения и растяжка'
    }
];

const AGE_CHIPS = ['6–8 лет', '9–11 лет', '12–15 лет', '16+ лет', 'Все возрасты'];

export const CreateTrainingPlanModal: React.FC<CreateTrainingPlanModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingPlan,
    coachId,
    coachName,
    allExercises = []
}) => {
    const [title, setTitle] = useState('');
    const [ageRange, setAgeRange] = useState('9–11 лет');
    const [description, setDescription] = useState('');
    const [stages, setStages] = useState<TrainingStages>({
        warmup: [],
        main: [],
        cooldown: []
    });

    const [isSaving, setIsSaving] = useState(false);
    const [pickingForStage, setPickingForStage] = useState<'warmup' | 'main' | 'cooldown' | null>(null);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState('all');

    // Populate data when editing
    useEffect(() => {
        if (!isOpen) return;

        if (editingPlan) {
            setTitle(editingPlan.title || '');
            setAgeRange(editingPlan.ageRange || editingPlan.age || '9–11 лет');
            setDescription(editingPlan.description || '');

            const loadedStages: TrainingStages = {
                warmup: [],
                main: [],
                cooldown: []
            };

            // Support both new stage format and legacy stage / exercises arrays
            if (editingPlan.stages) {
                loadedStages.warmup = (editingPlan.stages.warmup || []).map(mapToStageExercise);
                loadedStages.main = (editingPlan.stages.main || []).map(mapToStageExercise);
                loadedStages.cooldown = (editingPlan.stages.cooldown || editingPlan.stages.skills || []).map(mapToStageExercise);
            } else if (Array.isArray(editingPlan.exercises)) {
                // If legacy flat exercises array
                loadedStages.main = editingPlan.exercises.map(mapToStageExercise);
            }

            setStages(loadedStages);
        } else {
            setTitle('');
            setAgeRange('9–11 лет');
            setDescription('');
            setStages({
                warmup: [],
                main: [],
                cooldown: []
            });
        }
    }, [isOpen, editingPlan]);

    // Helper to map exercise object/ID to stage exercise
    function mapToStageExercise(item: any, idx = 0): TrainingStageExercise {
        if (typeof item === 'string') {
            const found = allExercises.find(e => e.id === item);
            return {
                id: `stg-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
                exerciseId: item,
                title: found?.title || 'Упражнение',
                durationMinutes: found?.durationMinutes || 15,
                category: found?.categoryLabel || found?.category || 'Футбол',
                mediaUrl: found?.mediaUrl || '',
                mediaType: found?.mediaType || 'photo',
                mediaItems: found?.mediaItems || [],
                equipment: found?.equipment || [],
                description: found?.description || ''
            };
        }
        return {
            id: item.id || `stg-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
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
    }

    if (!isOpen) return null;

    // Total calculations
    const totalExercises = stages.warmup.length + stages.main.length + stages.cooldown.length;
    const totalMinutes =
        stages.warmup.reduce((acc, i) => acc + (Number(i.durationMinutes) || 0), 0) +
        stages.main.reduce((acc, i) => acc + (Number(i.durationMinutes) || 0), 0) +
        stages.cooldown.reduce((acc, i) => acc + (Number(i.durationMinutes) || 0), 0);

    // Collect all unique equipment
    const allEquipment = Array.from(new Set([
        ...stages.warmup.flatMap(i => i.equipment || []),
        ...stages.main.flatMap(i => i.equipment || []),
        ...stages.cooldown.flatMap(i => i.equipment || [])
    ])).filter(Boolean);

    // Exercise Management in Stages
    const handleAddExerciseToStage = (exercise: any) => {
        if (!pickingForStage) return;

        const newStageEx: TrainingStageExercise = {
            id: `stg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            exerciseId: exercise.id,
            title: exercise.title || 'Новое упражнение',
            durationMinutes: Number(exercise.durationMinutes) || 15,
            category: exercise.categoryLabel || exercise.category || 'Футбол',
            mediaUrl: exercise.mediaUrl || '',
            mediaType: exercise.mediaType || 'photo',
            mediaItems: exercise.mediaItems || [],
            equipment: exercise.equipment || [],
            description: exercise.description || ''
        };

        setStages(prev => ({
            ...prev,
            [pickingForStage]: [...prev[pickingForStage], newStageEx]
        }));
    };

    const handleRemoveFromStage = (stageKey: keyof TrainingStages, exId: string) => {
        setStages(prev => ({
            ...prev,
            [stageKey]: prev[stageKey].filter(item => item.id !== exId)
        }));
    };

    const handleUpdateDuration = (stageKey: keyof TrainingStages, exId: string, durationMinutes: number) => {
        setStages(prev => ({
            ...prev,
            [stageKey]: prev[stageKey].map(item => item.id === exId ? { ...item, durationMinutes: Math.max(1, durationMinutes) } : item)
        }));
    };

    const handleMoveExercise = (stageKey: keyof TrainingStages, index: number, direction: 'up' | 'down') => {
        const list = [...stages[stageKey]];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;

        setStages(prev => ({
            ...prev,
            [stageKey]: list
        }));
    };

    // Filter exercises in picker modal
    const filteredExercisesForPicker = allExercises.filter(ex => {
        const matchesSearch = !exerciseSearch.trim() ||
            ex.title?.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
            ex.description?.toLowerCase().includes(exerciseSearch.toLowerCase());
        const matchesCategory = exerciseCategoryFilter === 'all' || ex.category === exerciseCategoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Пожалуйста, введите название плана тренировки');
            return;
        }

        if (totalExercises === 0) {
            alert('Добавьте хотя бы одно упражнение в план тренировки');
            return;
        }

        setIsSaving(true);
        try {
            // Flatten all exercise IDs for backward compatibility
            const allExerciseIds = [
                ...stages.warmup.map(e => e.exerciseId || e.id),
                ...stages.main.map(e => e.exerciseId || e.id),
                ...stages.cooldown.map(e => e.exerciseId || e.id)
            ];

            const planPayload = {
                title: title.trim(),
                ageRange: ageRange.trim(),
                description: description.trim(),
                totalMinutes,
                totalExercises,
                equipment: allEquipment,
                stages: {
                    warmup: stages.warmup,
                    main: stages.main,
                    cooldown: stages.cooldown
                },
                exercises: allExerciseIds,
                coachId: coachId || 'coach',
                coachName: coachName || 'Тренер',
                updatedAt: serverTimestamp()
            };

            if (onSave) {
                await onSave(planPayload);
            } else if (editingPlan?.id) {
                await updateDoc(doc(db, 'training_templates', editingPlan.id), planPayload);
            } else {
                (planPayload as any).createdAt = serverTimestamp();
                await addDoc(collection(db, 'training_templates'), planPayload);
            }

            onClose();
        } catch (err: any) {
            console.error('Error saving training plan:', err);
            alert(`Ошибка при сохранении: ${err.message || 'Попробуйте снова'}`);
        } finally {
            setIsSaving(false);
        }
    };

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
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
                                📋
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-tight">
                                    {editingPlan ? 'Редактирование плана тренировки' : 'Конструктор плана тренировки'}
                                </h3>
                                <p className="text-[11px] text-zinc-400 font-medium">
                                    Соберите пошаговый конспект занятия из базы упражнений
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all border border-white/10 cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Live Status Bar */}
                    <div className="px-6 py-2.5 bg-black/50 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                <Clock size={14} />
                                <span>Итого: {totalMinutes} мин</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                <Target size={14} />
                                <span>{totalExercises} упр.</span>
                            </div>
                            {allEquipment.length > 0 && (
                                <div className="hidden sm:flex items-center gap-1.5 text-zinc-400">
                                    <Dumbbell size={13} />
                                    <span className="truncate max-w-[250px]">{allEquipment.join(', ')}</span>
                                </div>
                            )}
                        </div>

                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                            3 блока занятия
                        </span>
                    </div>

                    {/* Main Form Content */}
                    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        {/* Section 1: Main Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Title (2 cols) */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
                                    Название плана тренировки <span className="text-amber-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Например: Развитие ловкости и удары в одно касание"
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all font-bold placeholder:text-zinc-600"
                                />
                            </div>

                            {/* Age Selector (1 col) */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                                    <Users size={13} className="text-amber-400" /> Возрастная группа
                                </label>
                                <input
                                    type="text"
                                    value={ageRange}
                                    onChange={(e) => setAgeRange(e.target.value)}
                                    placeholder="Укажите возраст"
                                    className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none transition-all font-medium placeholder:text-zinc-600 mb-1.5"
                                />
                                <div className="flex flex-wrap gap-1">
                                    {AGE_CHIPS.map(chip => (
                                        <button
                                            type="button"
                                            key={chip}
                                            onClick={() => setAgeRange(chip)}
                                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer border ${
                                                ageRange === chip
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Description / Goals */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-zinc-300 uppercase tracking-wider block">
                                Задачи и цели тренировки (необязательно)
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Опишите ключевые акценты (например: плотность опеки, быстрое переключение, точность удара)"
                                className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-2 text-white text-xs outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        {/* Section 2: 3 Stages of Football Training */}
                        <div className="space-y-5 pt-2">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                                    <Layers size={14} className="text-amber-400" /> Этапы занятия и упражнения
                                </h4>
                                <span className="text-[10px] text-zinc-500">
                                    Нажимайте «+ Добавить», чтобы выбрать упражнения из вашей базы
                                </span>
                            </div>

                            {STAGE_CONFIGS.map((stageConfig) => {
                                const stageExercises = stages[stageConfig.key];
                                const stageMinutes = stageExercises.reduce((acc, i) => acc + (Number(i.durationMinutes) || 0), 0);

                                return (
                                    <div
                                        key={stageConfig.key}
                                        className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden"
                                    >
                                        {/* Stage Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-base">{stageConfig.icon}</span>
                                                <div>
                                                    <h5 className="text-xs sm:text-sm font-russo text-white uppercase tracking-tight">
                                                        {stageConfig.label}
                                                    </h5>
                                                    <p className="text-[10px] text-zinc-400 font-medium">
                                                        {stageConfig.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${stageConfig.badgeColor}`}>
                                                    ⏱ {stageMinutes} мин • {stageExercises.length} упр.
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => setPickingForStage(stageConfig.key)}
                                                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                                                >
                                                    <Plus size={14} /> + Добавить упр.
                                                </button>
                                            </div>
                                        </div>

                                        {/* Exercises in Stage List */}
                                        {stageExercises.length === 0 ? (
                                            <div
                                                onClick={() => setPickingForStage(stageConfig.key)}
                                                className="py-6 border border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-400/40 hover:bg-white/5 transition-all group"
                                            >
                                                <p className="text-xs text-zinc-500 group-hover:text-amber-300 font-medium transition-colors">
                                                    + Нажмите для добавления упражнения в этот блок
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 pt-1">
                                                {stageExercises.map((item, idx) => (
                                                    <div
                                                        key={item.id}
                                                        className="bg-[#18181b] border border-white/10 hover:border-white/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 transition-all"
                                                    >
                                                        {/* Left: Index + Title + Category */}
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="w-6 h-6 rounded-lg bg-black/60 border border-white/10 text-[10px] font-black text-amber-400 flex items-center justify-center shrink-0">
                                                                #{idx + 1}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h6 className="text-xs font-bold text-white truncate">
                                                                    {item.title}
                                                                </h6>
                                                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                                                                    <span className="text-amber-400/80 font-semibold">{item.category || 'Футбол'}</span>
                                                                    {item.equipment && item.equipment.length > 0 && (
                                                                        <span>• {item.equipment.join(', ')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Duration input + Move controls + Remove */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1">
                                                                <Clock size={11} className="text-amber-400" />
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="120"
                                                                    value={item.durationMinutes}
                                                                    onChange={(e) => handleUpdateDuration(stageConfig.key, item.id, Number(e.target.value))}
                                                                    className="w-9 bg-transparent text-center text-xs font-bold text-white outline-none"
                                                                />
                                                                <span className="text-[10px] text-zinc-500 font-bold">мин</span>
                                                            </div>

                                                            {/* Reorder Buttons */}
                                                            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === 0}
                                                                    onClick={() => handleMoveExercise(stageConfig.key, idx, 'up')}
                                                                    className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                                                    title="Вверх"
                                                                >
                                                                    <ArrowUp size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={idx === stageExercises.length - 1}
                                                                    onClick={() => handleMoveExercise(stageConfig.key, idx, 'down')}
                                                                    className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer transition-colors"
                                                                    title="Вниз"
                                                                >
                                                                    <ArrowDown size={12} />
                                                                </button>
                                                            </div>

                                                            {/* Delete Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFromStage(stageConfig.key, item.id)}
                                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                                                title="Удалить из плана"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer (Fixed Save / Cancel) */}
                        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                            >
                                Отмена
                            </button>

                            <button
                                type="submit"
                                disabled={isSaving || !title.trim() || totalExercises === 0}
                                className="px-7 py-2.5 rounded-xl bg-sparta-gold hover:bg-amber-300 text-black font-russo text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                            >
                                <span>{isSaving ? 'Сохранение плана...' : (editingPlan ? 'Сохранить изменения' : '💾 Сохранить план')}</span>
                            </button>
                        </div>
                    </form>

                    {/* Nested Exercise Picker Modal */}
                    {pickingForStage && (
                        <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                            <div className="bg-[#18181b] border border-amber-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] space-y-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                                            ⚽
                                        </div>
                                        <div>
                                            <h4 className="text-base font-russo text-white uppercase">
                                                Выберите упражнение из базы
                                            </h4>
                                            <p className="text-[11px] text-zinc-400">
                                                Добавление в: <span className="text-amber-300 font-bold">{STAGE_CONFIGS.find(s => s.key === pickingForStage)?.label}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPickingForStage(null)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={exerciseSearch}
                                        onChange={(e) => setExerciseSearch(e.target.value)}
                                        placeholder="Поиск упражнений по названию или описанию..."
                                        className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
                                    />
                                </div>

                                {/* Exercises List */}
                                <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1 max-h-[50vh]">
                                    {filteredExercisesForPicker.length === 0 ? (
                                        <div className="py-12 text-center text-zinc-500 text-xs">
                                            Упражнения не найдены
                                        </div>
                                    ) : (
                                        filteredExercisesForPicker.map(ex => {
                                            const isAlreadyInStage = stages[pickingForStage]?.some(i => i.exerciseId === ex.id);

                                            return (
                                                <div
                                                    key={ex.id}
                                                    onClick={() => {
                                                        handleAddExerciseToStage(ex);
                                                    }}
                                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                                        isAlreadyInStage
                                                            ? 'bg-amber-500/10 border-amber-500/30'
                                                            : 'bg-black/40 border-white/5 hover:border-amber-400/40 hover:bg-white/5'
                                                    }`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="text-xs font-bold text-white truncate">
                                                                {ex.title}
                                                            </h5>
                                                            {isAlreadyInStage && (
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                                                    В плане
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 mt-1">
                                                            <span>⏱ {ex.durationMinutes || 15} мин</span>
                                                            <span className="text-amber-400/80">{ex.categoryLabel || ex.category || 'Футбол'}</span>
                                                            {ex.ageRange && <span>• {ex.ageRange}</span>}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                                            isAlreadyInStage
                                                                ? 'bg-amber-500 text-black font-black'
                                                                : 'bg-white/10 hover:bg-sparta-gold hover:text-black text-zinc-300'
                                                        }`}
                                                    >
                                                        {isAlreadyInStage ? (
                                                            <>
                                                                <Plus size={12} /> Добавить еще
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={12} /> Выбрать
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="pt-3 border-t border-white/10 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setPickingForStage(null)}
                                        className="px-5 py-2 rounded-xl bg-sparta-gold text-black font-russo text-xs uppercase"
                                    >
                                        Готово
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateTrainingPlanModal;