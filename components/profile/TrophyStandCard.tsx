import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Scroll, CheckCircle2, Lock, Sparkles, Star } from 'lucide-react';
import { SpartanUnifiedAchievement, getAward3DDefaultIcon } from '../../hooks/useStudentAchievements';

interface TrophyStandCardProps {
    badge: SpartanUnifiedAchievement;
    onClick: (badge: SpartanUnifiedAchievement) => void;
    onTogglePin?: (badgeId: string, buttonEl?: HTMLElement) => void;
    isPinnedInProfile?: boolean;
    isPinning?: boolean;
    pinnedCount?: number;
}

// 🖼️ 2.5D Текстуры высокого разрешения для наград
const TROPHY_STAND_ASSETS = {
    // 🏅 Медали
    medalGold: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    medalSilver: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80',
    // 🏆 Кубки
    cupGold: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80',
    cupGrand: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80',
    // 📜 Грамоты
    certificateFrame: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    // ⚡ Челленджи
    challengeIcon: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80'
};

export const TrophyStandCard: React.FC<TrophyStandCardProps> = ({
    badge,
    onClick,
    onTogglePin,
    isPinnedInProfile,
    isPinning = false,
    pinnedCount = 0
}) => {
    const isUnlocked = badge.unlocked;
    const isNew = Boolean(isUnlocked && badge.isNew);
    const isPinned = Boolean(isPinnedInProfile || badge.isPinnedInProfile || badge.isPinned);
    const isPinnable = badge.canPinToProfile !== false;

    // Определение типа и визуала
    const getVisualProps = () => {
        if (badge.type === 'cup' || badge.category === 'cup') {
            return {
                categoryLabel: 'Кубок команды',
                categoryIcon: '🏆',
                defaultPng: TROPHY_STAND_ASSETS.cupGold,
                accentColor: 'from-amber-400 to-yellow-600',
                glowColor: 'rgba(251, 191, 36, 0.45)',
                pedestalColor: 'from-amber-600/30 to-amber-900/40',
                fallbackIcon: <Trophy size={48} className="text-amber-400" />
            };
        }
        if (badge.type === 'certificate' || badge.category === 'certificate') {
            return {
                categoryLabel: 'Грамота',
                categoryIcon: '📜',
                defaultPng: TROPHY_STAND_ASSETS.certificateFrame,
                accentColor: 'from-amber-300 to-orange-500',
                glowColor: 'rgba(245, 158, 11, 0.35)',
                pedestalColor: 'from-zinc-700/40 to-zinc-900/60',
                fallbackIcon: <Scroll size={48} className="text-amber-300" />
            };
        }
        if (badge.type === 'streak' || badge.type === 'milestone') {
            return {
                categoryLabel: badge.type === 'streak' ? 'Серия' : 'Норматив',
                categoryIcon: badge.type === 'streak' ? '🔥' : '⚡',
                defaultPng: TROPHY_STAND_ASSETS.challengeIcon,
                accentColor: 'from-cyan-400 to-blue-600',
                glowColor: 'rgba(56, 189, 248, 0.35)',
                pedestalColor: 'from-cyan-600/30 to-blue-900/40',
                fallbackIcon: <Award size={48} className="text-cyan-400" />
            };
        }
        return {
            categoryLabel: 'Медаль',
            categoryIcon: '🏅',
            defaultPng: TROPHY_STAND_ASSETS.medalGold,
            accentColor: 'from-yellow-400 to-amber-600',
            glowColor: 'rgba(252, 211, 77, 0.4)',
            pedestalColor: 'from-amber-500/30 to-zinc-900/60',
            fallbackIcon: <Award size={48} className="text-yellow-400" />
        };
    };

    const {
        categoryLabel,
        categoryIcon,
        glowColor,
        pedestalColor,
        fallbackIcon
    } = getVisualProps();

    const currentProgress = badge.progress?.current || 0;
    const maxProgress = badge.progress?.max || 1;
    const progressPercent = Math.min(100, Math.round((currentProgress / maxProgress) * 100));

    return (
        <motion.div
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => onClick(badge)}
            className={`group relative flex flex-col justify-between rounded-3xl p-5 cursor-pointer select-none transition-all duration-300 min-h-[360px] overflow-hidden backdrop-blur-md border ${
                isUnlocked
                    ? 'bg-gradient-to-b from-[#1c1a17]/95 via-[#131215]/95 to-[#0c0b0e]/95 border-amber-500/30 hover:border-amber-400/60 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.25)]'
                    : 'bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border-white/5 opacity-80 hover:opacity-100 hover:border-white/15 shadow-lg'
            }`}
        >
            {/* Фоновое янтарное / неоновое свечение стенда */}
            <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none blur-3xl transition-opacity duration-500"
                style={{
                    backgroundColor: isUnlocked ? glowColor : 'transparent',
                    opacity: isUnlocked ? 0.6 : 0
                }}
            />

            {/* Картинка-подиум (Световой луч сверху) */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 blur-2xl pointer-events-none rounded-full transition-all ${
                isUnlocked ? 'bg-amber-500/15 group-hover:bg-amber-500/25' : 'bg-white/5'
            }`} />

            {/* 1. ВЕРХ: Бейдж категории + Статус + Кнопка [ ⭐ В витрину (X/4) ] */}
            <div className="flex items-center justify-between z-10 gap-2">
                <span className="text-[10px] font-russo uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 flex items-center gap-1.5 shrink-0">
                    <span>{categoryIcon}</span>
                    <span>{categoryLabel}</span>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Кнопка [ ⭐ В витрину (X/4) ] ТОЛЬКО для трофеев (canPinToProfile === true) */}
                    {isUnlocked && isPinnable && onTogglePin && (
                        <button
                            type="button"
                            disabled={isPinning}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isPinning) {
                                    onTogglePin(badge.id, e.currentTarget);
                                }
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isPinning
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse opacity-90 cursor-wait'
                                    : isPinned
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.2)] active:scale-95'
                                        : 'bg-white/5 hover:bg-amber-500/10 text-white/60 hover:text-amber-300 border-white/10 active:scale-95'
                            }`}
                            title={isPinned ? 'Убрать из витрины профиля' : 'Показать в витрине профиля'}
                        >
                            {isPinning ? (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                                    <span>Полет...</span>
                                </>
                            ) : (
                                <>
                                    <Star size={11} className={isPinned ? 'fill-amber-400 text-amber-400' : 'text-white/60'} />
                                    <span>{isPinned ? '✅ В витрине' : `В витрину (${pinnedCount}/4)`}</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Для достижений (canPinToProfile: false): бейдж [ ✅ Выполнено (+XP) ] */}
                    {!isPinnable && isUnlocked && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={11} className="stroke-[3]" />
                            <span>✅ Выполнено (+{badge.rewardXp} XP)</span>
                        </span>
                    )}

                    {isNew && (
                        <span className="text-[9px] font-black text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 flex items-center gap-0.5 shadow-sm">
                            <Sparkles size={8} />
                            <span>Новое</span>
                        </span>
                    )}

                    {isPinnable && (
                        isUnlocked ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={10} className="stroke-[3]" />
                                <span>Получено</span>
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-zinc-400 bg-black/60 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Lock size={10} className="text-amber-400" />
                                <span>Закрыто</span>
                            </span>
                        )
                    )}

                    {!isPinnable && !isUnlocked && (
                        <span className="text-[10px] font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Lock size={10} className="text-amber-400" />
                            <span>В процессе</span>
                        </span>
                    )}
                </div>
            </div>

            {/* 2. ЦЕНТР: ЕДИНСТВЕННАЯ ЧИСТАЯ ФИРМЕННАЯ SVG/PNG ИКОНКА (БЕЗ НАЛОЖЕНИЙ ЭМОДЗИ) */}
            <div className="my-auto py-3 flex flex-col items-center justify-center relative z-10">
                    {(() => {
                        const iconSrc = badge.iconUrl || (badge.canPinToProfile ? getAward3DDefaultIcon(badge.category, badge.type, badge.title) : null);
                        if (iconSrc) {
                            return (
                                <img
                                    src={iconSrc}
                                    alt={badge.title}
                                    className={`w-full h-full object-contain filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105 ${
                                        !isUnlocked ? 'grayscale contrast-125 opacity-40 brightness-75' : ''
                                    }`}
                                />
                            );
                        }
                        return (
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 border ${
                                isUnlocked
                                    ? 'bg-gradient-to-br from-amber-500/20 via-zinc-900/60 to-black/80 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                                    : 'bg-zinc-900/60 border-white/5 opacity-50'
                            }`}>
                                {fallbackIcon}
                            </div>
                        );
                    })()}

                {/* 3D Постамент стенда со светом */}
                <div className="relative mt-2 w-36 flex flex-col items-center">
                    {/* Верхняя площадка подиума */}
                    <div className={`w-32 h-3.5 rounded-full bg-gradient-to-r ${pedestalColor} border border-white/10 shadow-md ${
                        isUnlocked ? 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' : ''
                    }`} />
                    {/* Тень под подиумом */}
                    <div className="w-24 h-1.5 rounded-full bg-black/60 blur-[2px] mt-0.5" />
                </div>
            </div>

            {/* 3. НИЗ: Название, Описание и Прогресс-бар */}
            <div className="space-y-2.5 z-10 pt-2 border-t border-white/5">
                <div className="text-center">
                    <h3 className="text-sm font-russo text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {badge.title}
                    </h3>
                    <p className="text-[11px] text-white/50 line-clamp-2 mt-0.5 leading-snug">
                        {badge.subtitle || badge.description}
                    </p>
                </div>

                {/* Если награда закрыта и есть прогресс: прогресс-бар */}
                {!isUnlocked && badge.progress && badge.progress.max > 0 ? (
                    <div className="space-y-1 bg-black/40 rounded-xl p-2 border border-white/5">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-400 font-medium truncate max-w-[120px]">
                                {badge.remainingRequirement || 'Прогресс'}
                            </span>
                            <span className="text-amber-400 font-bold font-mono shrink-0">
                                {currentProgress} / {maxProgress} {badge.progress.unit || ''}
                            </span>
                        </div>
                        <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-amber-500 to-sparta-gold h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    /* Футер для открытой награды: Награды монет/XP и тренер */
                    <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-[10px] text-white/40 truncate max-w-[130px]" title={badge.confirmedByCoach}>
                            {badge.confirmedByCoach}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {badge.rewardCoins > 0 && (
                                <span className="font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
                                    +{badge.rewardCoins} 🟡
                                </span>
                            )}
                            {badge.rewardXp > 0 && (
                                <span className="font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded text-[10px]">
                                    +{badge.rewardXp} XP
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default TrophyStandCard;
