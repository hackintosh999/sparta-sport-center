import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, CheckCircle2, Lock, Sparkles, Trophy, Award, Scroll, Calendar, UserCheck } from 'lucide-react';
import { SpartanUnifiedAchievement, useStudentAchievements, MAX_PINNED_SLOTS, getAward3DDefaultIcon } from '../../hooks/useStudentAchievements';
import { SpartaCoinIcon } from '../SpartaCoinIcon';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface AwardDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    award: SpartanUnifiedAchievement | null;
    studentId?: string;
    onOpenAwards?: () => void;
}

export const AwardDetailModal: React.FC<AwardDetailModalProps> = ({
    isOpen,
    onClose,
    award,
    studentId,
    onOpenAwards
}) => {
    const {
        pinnedAwards,
        pinnedAwardItems,
        togglePinAward
    } = useStudentAchievements(studentId);

    const [isReplacing, setIsReplacing] = useState(false);

    if (!isOpen || !award) return null;

    const isUnlocked = award.unlocked;
    const isPinned = pinnedAwards.includes(award.id);
    const isPinnable = award.canPinToProfile !== false;
    const isSlotsFull = !isPinned && pinnedAwards.length >= MAX_PINNED_SLOTS;

    const formattedDate = award.unlockedAt
        ? (() => {
            try {
                const ts = typeof award.unlockedAt === 'number'
                    ? award.unlockedAt
                    : Date.parse(award.unlockedAt as string);
                if (isNaN(ts)) return 'В этом сезоне';
                return format(new Date(ts), 'd MMMM yyyy', { locale: ru });
            } catch {
                return 'В этом сезоне';
            }
        })()
        : 'В этом сезоне';

    // Handle Pin / Unpin Action
    const handleTogglePin = async () => {
        if (!award || !isPinnable) return;

        if (isPinned) {
            await togglePinAward(award.id);
            onClose();
        } else {
            if (pinnedAwards.length >= MAX_PINNED_SLOTS) {
                setIsReplacing(true);
            } else {
                await togglePinAward(award.id);
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.6 }
                });
                onClose();
            }
        }
    };

    // Replace existing pinned award with this one
    const handleReplaceSlot = async (oldAwardId: string) => {
        if (!studentId || !award) return;

        const nextPinned = pinnedAwards.map(id => id === oldAwardId ? award.id : id);

        try {
            await updateDoc(doc(db, 'users', studentId), {
                pinnedAwards: nextPinned,
                pinnedBadgeId: nextPinned[0] || null
            });

            confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 }
            });
            setIsReplacing(false);
            onClose();
        } catch (e) {
            console.error('Failed to replace pinned award:', e);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[350] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
                <div className="absolute inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative max-w-md w-full my-auto z-10 rounded-3xl bg-gradient-to-b from-[#1c1b18] via-[#141416] to-[#0c0c0e] border-2 border-sparta-gold/50 p-6 sm:p-8 text-center space-y-5 shadow-[0_0_50px_rgba(212,175,55,0.25)] overflow-hidden"
                >
                    {/* Background Golden Glow */}
                    <div className="absolute top-0 right-1/4 w-48 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all cursor-pointer z-20"
                    >
                        <X size={18} />
                    </button>

                    {/* 1. КРУПНАЯ 2.5D ИКОНКА С ПАРИРУЮЩЕЙ АНИМАЦИЕЙ */}
                    <div className="relative py-2 flex flex-col items-center justify-center">
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-36 h-36 flex items-center justify-center"
                        >
                            {/* Фоновое золотое неоновое свечение */}
                            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

                            {(() => {
                                const iconSrc = award.iconUrl || getAward3DDefaultIcon(award.category, award.type, award.title);
                                return (
                                    <img
                                        src={iconSrc}
                                        alt={award.title}
                                        className={`w-full h-full object-contain filter drop-shadow-[0_15px_25px_rgba(251,191,36,0.5)] ${
                                            !isUnlocked ? 'grayscale opacity-50' : ''
                                        }`}
                                    />
                                );
                            })()}
                        </motion.div>

                        {/* Постамент со светом */}
                        <div className="w-36 h-3 rounded-full bg-gradient-to-r from-amber-500/40 via-yellow-400/60 to-amber-600/40 blur-[1px] mt-2 shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
                    </div>

                    {/* 2. НАЗВАНИЕ, ПОДЗАГОЛОВОК И СТАТУС */}
                    <div className="space-y-2 relative z-10">
                        <div className="flex items-center justify-center gap-2">
                            {isUnlocked ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-russo">
                                    <CheckCircle2 size={13} className="stroke-[3]" />
                                    <span>Получена • {formattedDate}</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold font-russo">
                                    <Lock size={13} />
                                    <span>В процессе {award.progress ? `(${award.progress.current}/${award.progress.max})` : ''}</span>
                                </span>
                            )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wide">
                            {award.title}
                        </h2>

                        <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-sm mx-auto">
                            {award.description}
                        </p>
                    </div>

                    {/* ДЕТАЛИ И ПОДТВЕРЖДЕНИЕ */}
                    <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 text-left space-y-2 text-xs relative z-10">
                        <div className="flex items-center justify-between text-white/60">
                            <span className="flex items-center gap-1.5">
                                <UserCheck size={13} className="text-amber-400" />
                                <span>Подтверждено:</span>
                            </span>
                            <span className="font-bold text-white/90 truncate max-w-[200px]">
                                {award.confirmedByCoach}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-white/60 pt-1 border-t border-white/5">
                            <span>Награда за норматив:</span>
                            <span className="flex items-center gap-1 font-bold text-amber-300 font-russo text-[11px]">
                                <SpartaCoinIcon size={12} />
                                <span>+{award.rewardCoins} монет</span>
                                <span className="text-indigo-300 ml-1.5">+{award.rewardXp} XP</span>
                            </span>
                        </div>
                    </div>

                    {/* 3. ПОЯСНЯЮЩИЙ ТЕКСТ / БЕЙДЖ ДЛЯ ДОСТИЖЕНИЙ */}
                    {isPinnable ? (
                        <div className="p-3 rounded-2xl bg-black/40 border border-sparta-gold/20 text-xs text-white/70 relative z-10">
                            💡 Закрепи этот трофей в витрину, чтобы его видели другие игроки (до 4 слотов)
                        </div>
                    ) : (
                        <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200/90 relative z-10 flex items-center justify-center gap-2">
                            <span>⚡</span>
                            <span>Спортивное достижение: прогресс-бар, дает монеты и XP в общий баланс.</span>
                        </div>
                    )}

                    {/* 4. КНОПКИ ДЕЙСТВИЯ */}
                    <div className="space-y-3 relative z-10">
                        {isPinnable ? (
                            isReplacing ? (
                                /* ВЫБОР НАГРАДЫ ДЛЯ ЗАМЕНЫ ПРИ 4/4 СЛОТАХ */
                                <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/40 text-left">
                                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                                        Слоты заполнены (4/4). Выбери, какую награду заменить:
                                    </span>

                                    <div className="grid grid-cols-4 gap-2">
                                        {pinnedAwardItems.map((oldAward) => (
                                            <button
                                                key={oldAward.id}
                                                type="button"
                                                onClick={() => handleReplaceSlot(oldAward.id)}
                                                className="p-1.5 sm:p-2 rounded-xl bg-black/60 border border-white/10 hover:border-amber-400 hover:bg-amber-500/10 flex flex-col items-center justify-center text-center space-y-1 transition-all cursor-pointer group active:scale-95"
                                                title={`Заменить «${oldAward.title}»`}
                                            >
                                                <span className="text-xl group-hover:scale-110 transition-transform">
                                                    {oldAward.icon || '🏅'}
                                                </span>
                                                <span className="text-[8px] sm:text-[9px] text-white/70 font-bold line-clamp-1 leading-tight group-hover:text-amber-300">
                                                    {oldAward.title}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsReplacing(false)}
                                        className="w-full text-center text-xs text-white/50 hover:text-white pt-1 cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            ) : isPinned ? (
                                /* ЕСЛИ УЖЕ ЗАКРЕПЛЕНА: КНОПКА УБРАТЬ ИЗ ПРОФИЛЯ */
                                <button
                                    type="button"
                                    onClick={handleTogglePin}
                                    className="w-full py-3 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white/90 hover:text-white font-russo text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer shadow-md"
                                >
                                    <span>❌ Убрать из витрины</span>
                                </button>
                            ) : isUnlocked ? (
                                /* ЕСЛИ НЕ ЗАКРЕПЛЕНА: КНОПКА ПОКАЗАТЬ В ПРОФИЛЕ */
                                <button
                                    type="button"
                                    onClick={handleTogglePin}
                                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 text-black font-russo text-xs uppercase tracking-wider font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer"
                                >
                                    <Star size={15} className="fill-black" />
                                    <span>⭐ В витрину ({pinnedAwards.length}/4)</span>
                                </button>
                            ) : (
                                /* ЗАКРЫТАЯ НАГРАДА */
                                <div className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 font-medium">
                                    Трофей пока не открыт
                                </div>
                            )
                        ) : (
                            /* ДЛЯ ДОСТИЖЕНИЙ (НЕЛЬЗЯ ЗАКРЕПИТЬ В ВИТРИНУ) */
                            isUnlocked ? (
                                <div className="py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold font-russo">
                                    ✅ Выполнено (+{award.rewardXp} XP • +{award.rewardCoins} монет)
                                </div>
                            ) : (
                                <div className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 font-medium">
                                    Норматив в процессе выполнения
                                </div>
                            )
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AwardDetailModal;
