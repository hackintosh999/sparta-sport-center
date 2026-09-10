import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, PlusCircle, Edit2, ChevronLeft, ChevronRight, Dumbbell, Clock, Users, Timer, Sparkles, Volume2 } from 'lucide-react';
import { extractYoutubeId, ExerciseMediaItem } from './ExerciseMediaGrid';

interface ExerciseDetailModalProps {
    exercise: any | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToPlan: (exercise: any) => void;
    onEdit?: (exercise: any) => void;
    canEdit?: boolean;
}

const formatEquipmentBadge = (eq: string) => {
    const lower = eq.toLowerCase();
    if (lower.includes('мяч')) return `⚽ ${eq}`;
    if (lower.includes('фишк')) return `🔶 ${eq}`;
    if (lower.includes('манишк')) return `🎽 ${eq}`;
    if (lower.includes('ворот')) return `🥅 ${eq}`;
    if (lower.includes('лесен')) return `🪜 ${eq}`;
    if (lower.includes('конус')) return `🛑 ${eq}`;
    if (lower.includes('барьер')) return `🚧 ${eq}`;
    if (lower.includes('стойк')) return `📍 ${eq}`;
    if (lower.includes('секундомер') || lower.includes('таймер')) return `⏱ ${eq}`;
    if (lower.includes('батут') || lower.includes('мат')) return `🛡️ ${eq}`;
    return `🎯 ${eq}`;
};

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
    exercise,
    isOpen,
    onClose,
    onAddToPlan,
    onEdit,
    canEdit = true
}) => {
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const durationMinutes = Number(exercise?.durationMinutes) || 15;
    const [timerSecondsLeft, setTimerSecondsLeft] = useState(durationMinutes * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [showTimerWidget, setShowTimerWidget] = useState(false);

    useEffect(() => {
        if (exercise) {
            const mins = Number(exercise.durationMinutes) || 15;
            setTimerSecondsLeft(mins * 60);
            setIsTimerRunning(false);
            setShowTimerWidget(false);
            setActiveMediaIndex(0);
        }
    }, [exercise]);

    useEffect(() => {
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

    if (!isOpen || !exercise) return null;

    const normalizeUrl = (raw: any): string => {
        if (!raw) return '';
        if (typeof raw === 'string') return raw;
        return raw.url || raw.photoUrl || raw.src || raw.downloadUrl || '';
    };

    const normalizeType = (raw: any): 'photo' | 'video' | 'url' => {
        if (!raw) return 'photo';
        if (typeof raw === 'object' && raw.type) return raw.type;
        const url = normalizeUrl(raw);
        if (url.includes('youtube') || url.includes('youtu.be') || url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes('video')) {
            return 'video';
        }
        return 'photo';
    };

    // Build media items list
    const mediaItems: ExerciseMediaItem[] = React.useMemo(() => {
        if (Array.isArray(exercise.mediaItems) && exercise.mediaItems.length > 0) {
            return exercise.mediaItems.map((item: any, idx: number) => ({
                id: (typeof item === 'object' && item.id) ? item.id : `item-${idx}`,
                url: normalizeUrl(item),
                type: normalizeType(item),
                name: (typeof item === 'object' && item.name) ? item.name : undefined
            })).filter((i: any) => Boolean(i.url && i.url.trim() !== ''));
        }
        const singleUrl = normalizeUrl(exercise.mediaUrl || exercise.videoUrl);
        if (singleUrl) {
            return [{
                id: 'media-main',
                url: singleUrl,
                type: exercise.mediaType || normalizeType(singleUrl)
            }];
        }
        return [];
    }, [exercise]);

    const activeItem = mediaItems[activeMediaIndex] || mediaItems[0];
    const isVideo = activeItem && (
        activeItem.type === 'video' ||
        activeItem.type === 'url' ||
        (activeItem.url && (activeItem.url.includes('youtube') || activeItem.url.includes('youtu.be') || activeItem.url.endsWith('.mp4') || activeItem.url.includes('rutube') || activeItem.url.includes('vk.com')))
    );

    const ytId = isVideo && activeItem ? extractYoutubeId(activeItem.url) : null;

    const timerMins = Math.floor(timerSecondsLeft / 60);
    const timerSecs = timerSecondsLeft % 60;
    const formattedTimer = `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;
    const totalDurationSeconds = (Number(exercise.durationMinutes) || 15) * 60;
    const timerProgress = totalDurationSeconds > 0 ? ((totalDurationSeconds - timerSecondsLeft) / totalDurationSeconds) * 100 : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-2xl overflow-y-auto custom-scrollbar pt-safe pb-safe">
                {/* Backdrop Click */}
                <div className="fixed inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-4xl bg-[#121214] border border-amber-500/30 rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.1)] overflow-hidden flex flex-col my-auto z-10 max-h-[calc(100dvh-1.5rem)]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-6 md:p-8 border-b border-white/10 flex items-start justify-between gap-3 sm:gap-4 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                        <div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                                <span className="px-2.5 sm:px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-[11px] sm:text-xs font-bold">
                                    {exercise.categoryLabel || exercise.category || 'Упражнение'}
                                </span>
                                {exercise.ageRange && (
                                    <span className="px-2.5 sm:px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1">
                                        <Users size={12} /> {exercise.ageRange}
                                    </span>
                                )}
                                <span className="px-2.5 sm:px-3 py-1 bg-white/5 border border-white/10 text-zinc-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1">
                                    <Clock size={12} /> {exercise.durationMinutes || 15} мин
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-3xl font-russo text-white uppercase tracking-tight">
                                {exercise.title}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTimerWidget(true);
                                    setIsTimerRunning(true);
                                }}
                                className="px-3 sm:px-3.5 py-2 rounded-2xl bg-amber-400/15 border border-amber-400/30 hover:bg-amber-400 text-amber-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Запустить таймер упражнения"
                            >
                                <Timer size={16} />
                                <span className="hidden sm:inline">Таймер {exercise.durationMinutes || 15} мин</span>
                            </button>

                            <button
                                onClick={onClose}
                                className="p-2 sm:p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all border border-white/10 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 overflow-y-auto max-h-[65vh] sm:max-h-[70vh] custom-scrollbar flex-1">
                        {/* Interactive Timer Banner (When triggered) */}
                        {showTimerWidget && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-russo text-2xl font-bold shadow-lg shadow-amber-400/30">
                                        <Timer size={28} className={isTimerRunning ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                                            Таймер тренировки
                                        </div>
                                        <div className="text-3xl font-russo text-white font-mono tracking-wider">
                                            {formattedTimer}
                                            {timerSecondsLeft === 0 && (
                                                <span className="ml-3 text-xs bg-emerald-500 text-black px-2 py-1 rounded-lg uppercase font-bold animate-bounce">
                                                    Время вышло!
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                                        className={`px-5 py-3 rounded-2xl font-russo text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md ${
                                            isTimerRunning
                                                ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'
                                                : 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-400/20'
                                        }`}
                                    >
                                        {isTimerRunning ? <><Pause size={16} /> Пауза</> : <><Play size={16} fill="currentColor" /> Старт</>}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTimerSecondsLeft(durationMinutes * 60);
                                            setIsTimerRunning(false);
                                        }}
                                        className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                                        title="Сбросить таймер"
                                    >
                                        <RotateCcw size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTimerSecondsLeft(prev => prev + 60)}
                                        className="px-3 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                                        title="+1 минута"
                                    >
                                        +1м
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Media Section */}
                        {mediaItems.length > 0 && (
                            <div className="space-y-3">
                                <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center">
                                    {isVideo ? (
                                        ytId ? (
                                            <iframe
                                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                                className="w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={exercise.title}
                                            />
                                        ) : (activeItem.type === 'video' || activeItem.url.match(/\.(mp4|mov|webm|ogg)$/i) || activeItem.url.includes('exercises-media')) ? (
                                            <video
                                                src={activeItem.url}
                                                controls
                                                autoPlay
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <a
                                                href={activeItem.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 text-amber-400 font-bold hover:underline"
                                            >
                                                <Play size={20} /> Открыть видео
                                            </a>
                                        )
                                    ) : (
                                        <img
                                            src={activeItem.url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80'}
                                            alt={exercise.title}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80';
                                            }}
                                            className="w-full h-full object-contain"
                                        />
                                    )}

                                    {/* Navigation arrows for multiple photos */}
                                    {mediaItems.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setActiveMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 border border-white/20 text-white hover:bg-sparta-gold hover:text-black transition-all cursor-pointer"
                                            >
                                                <ChevronLeft size={22} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveMediaIndex((prev) => (prev + 1) % mediaItems.length)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/70 border border-white/20 text-white hover:bg-sparta-gold hover:text-black transition-all cursor-pointer"
                                            >
                                                <ChevronRight size={22} />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Thumbnail Strip if multiple */}
                                {mediaItems.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {mediaItems.map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveMediaIndex(idx)}
                                                className={`w-20 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                                                    activeMediaIndex === idx ? 'border-amber-400 scale-105' : 'border-white/10 opacity-50 hover:opacity-100'
                                                }`}
                                            >
                                                {item.type === 'video' || item.type === 'url' ? (
                                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-amber-400">
                                                        <Play size={16} />
                                                    </div>
                                                ) : (
                                                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Equipment List with Emojis */}
                        {exercise.equipment && exercise.equipment.length > 0 && (
                            <div className="p-5 rounded-3xl bg-zinc-900/60 border border-white/5 space-y-2.5">
                                <div className="text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <Dumbbell size={15} /> Необходимый инвентарь:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {exercise.equipment.map((eq: string, idx: number) => (
                                        <span
                                            key={idx}
                                            className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-100 shadow-sm"
                                        >
                                            {formatEquipmentBadge(eq)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Coach Instructions / Description */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                                Инструкция и методика выполнения:
                            </h4>
                            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-white/5 text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-normal">
                                {exercise.description || 'Описание отсутствует.'}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 sm:p-6 md:p-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-t from-white/5 to-transparent shrink-0">
                        <div className="text-xs text-zinc-500 font-medium">
                            Автор: {exercise.coachName || 'Тренерский штаб Спарты'}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                            {canEdit && onEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onEdit(exercise);
                                    }}
                                    className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
                                >
                                    <Edit2 size={16} /> Редактировать
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onAddToPlan(exercise);
                                }}
                                className="w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-2xl bg-sparta-gold text-black hover:bg-amber-300 font-russo text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer active:scale-95 text-center"
                            >
                                <PlusCircle size={18} /> ➕ В план тренировки
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ExerciseDetailModal;
