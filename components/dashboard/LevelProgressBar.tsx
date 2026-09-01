import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Gift, Sparkles, Check, Star, X, HelpCircle, Dumbbell, Zap, Coins } from 'lucide-react';
import { safeLocalStorage } from '../../utils/storage';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

export interface LevelInfo {
    level: number;
    title: string;
    badge: string;
    minXp: number;
    maxXp: number;
    giftName: string;
    giftIcon: string;
    color: string;
    glowColor: string;
}

export const LEVELS_CONFIG: LevelInfo[] = [
    {
        level: 1,
        title: 'Новичок',
        badge: '🥉',
        minXp: 0,
        maxXp: 150,
        giftName: 'Стикерпак Спарты',
        giftIcon: '🏷️',
        color: 'from-emerald-400 to-teal-500',
        glowColor: 'rgba(52, 211, 153, 0.4)'
    },
    {
        level: 2,
        title: 'Юниор',
        badge: '🥈',
        minXp: 150,
        maxXp: 350,
        giftName: 'Бутылка Спарта',
        giftIcon: '🍾',
        color: 'from-blue-400 to-indigo-500',
        glowColor: 'rgba(96, 165, 250, 0.4)'
    },
    {
        level: 3,
        title: 'Спартанец',
        badge: '🥇',
        minXp: 350,
        maxXp: 600,
        giftName: 'Клубный браслет Спарта',
        giftIcon: '🎗️',
        color: 'from-amber-400 via-yellow-500 to-amber-600',
        glowColor: 'rgba(245, 158, 11, 0.5)'
    },
    {
        level: 4,
        title: 'Мастер',
        badge: '🏆',
        minXp: 600,
        maxXp: 950,
        giftName: 'Спортивный рюкзак Спарта',
        giftIcon: '🎒',
        color: 'from-purple-400 to-pink-500',
        glowColor: 'rgba(192, 132, 252, 0.5)'
    },
    {
        level: 5,
        title: 'Легенда Спарты',
        badge: '👑',
        minXp: 950,
        maxXp: 1400,
        giftName: 'Именная форма Чемпиона',
        giftIcon: '👕',
        color: 'from-amber-300 via-yellow-400 to-yellow-600',
        glowColor: 'rgba(251, 191, 36, 0.6)'
    }
];

// Rich Multi-Layer Gradient SVG Rank Badges
const RankBadgeSVG: React.FC<{ level: number; className?: string }> = ({ level, className = 'w-6 h-6' }) => {
    if (level >= 5) {
        return (
            <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="legendGoldGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFFBEB" />
                        <stop offset="30%" stopColor="#FDE047" />
                        <stop offset="70%" stopColor="#EAB308" />
                        <stop offset="100%" stopColor="#854D0E" />
                    </linearGradient>
                </defs>
                <path d="M16 2L4 6V14C4 21.5 9.1 28.5 16 30C22.9 28.5 28 21.5 28 14V6L16 2Z" fill="#18181B" stroke="url(#legendGoldGrad)" strokeWidth="1.5" />
                <path d="M9 19L11 11L16 15L21 11L23 19H9Z" fill="url(#legendGoldGrad)" />
                <circle cx="16" cy="9" r="1.5" fill="#FEF08A" />
            </svg>
        );
    }
    if (level === 4) {
        return (
            <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="masterGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#F3E8FF" />
                        <stop offset="30%" stopColor="#C084FC" />
                        <stop offset="70%" stopColor="#9333EA" />
                        <stop offset="100%" stopColor="#581C87" />
                    </linearGradient>
                </defs>
                <path d="M16 2L4 6V14C4 21.5 9.1 28.5 16 30C22.9 28.5 28 21.5 28 14V6L16 2Z" fill="#18181B" stroke="url(#masterGrad)" strokeWidth="1.5" />
                <path d="M16 7L18.5 12.5L24 13.5L20 17.5L21 23L16 20L11 23L12 17.5L8 13.5L13.5 12.5L16 7Z" fill="url(#masterGrad)" />
            </svg>
        );
    }
    if (level === 3) {
        return (
            <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="spartanGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FEF08A" />
                        <stop offset="35%" stopColor="#F59E0B" />
                        <stop offset="70%" stopColor="#D97706" />
                        <stop offset="100%" stopColor="#78350F" />
                    </linearGradient>
                </defs>
                <path d="M16 2L4 6V14C4 21.5 9.1 28.5 16 30C22.9 28.5 28 21.5 28 14V6L16 2Z" fill="#18181B" stroke="url(#spartanGrad)" strokeWidth="1.5" />
                <path d="M16 9L21 22H18L16 16L14 22H11L16 9Z" fill="url(#spartanGrad)" />
            </svg>
        );
    }
    if (level === 2) {
        return (
            <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="juniorGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#E0F2FE" />
                        <stop offset="40%" stopColor="#38BDF8" />
                        <stop offset="80%" stopColor="#0284C7" />
                        <stop offset="100%" stopColor="#0369A1" />
                    </linearGradient>
                </defs>
                <path d="M16 2L4 6V14C4 21.5 9.1 28.5 16 30C22.9 28.5 28 21.5 28 14V6L16 2Z" fill="#18181B" stroke="url(#juniorGrad)" strokeWidth="1.5" />
                <path d="M16 8L20 15L16 22L12 15L16 8Z" fill="url(#juniorGrad)" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="noviceGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#D1FAE5" />
                    <stop offset="40%" stopColor="#34D399" />
                    <stop offset="80%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#064E3B" />
                </linearGradient>
            </defs>
            <path d="M16 2L4 6V14C4 21.5 9.1 28.5 16 30C22.9 28.5 28 21.5 28 14V6L16 2Z" fill="#18181B" stroke="url(#noviceGrad)" strokeWidth="1.5" />
            <circle cx="16" cy="15" r="4.5" fill="url(#noviceGrad)" />
        </svg>
    );
};

export interface LevelProgressBarProps {
    xp?: number;
    userId?: string;
    userName?: string;
    onOpenShop?: () => void;
    className?: string;
}

export const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
    xp = 180,
    userId = 'guest',
    userName = 'Чемпион',
    onOpenShop,
    className = ''
}) => {
    const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);
    const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
    const [levelUpData, setLevelUpData] = useState<LevelInfo | null>(null);
    const prevLevelRef = useRef<number | null>(null);

    // Compute active level & next level
    const currentLevelInfo = useMemo(() => {
        for (let i = LEVELS_CONFIG.length - 1; i >= 0; i--) {
            if (xp >= LEVELS_CONFIG[i].minXp) {
                return LEVELS_CONFIG[i];
            }
        }
        return LEVELS_CONFIG[0];
    }, [xp]);

    const nextLevelInfo = useMemo(() => {
        const nextIdx = LEVELS_CONFIG.findIndex(l => l.level === currentLevelInfo.level + 1);
        if (nextIdx !== -1) {
            return LEVELS_CONFIG[nextIdx];
        }
        return null; // Max level reached
    }, [currentLevelInfo]);

    // Progress math
    const xpInCurrentLevel = xp - currentLevelInfo.minXp;
    const totalXpNeededForLevel = nextLevelInfo
        ? (nextLevelInfo.minXp - currentLevelInfo.minXp)
        : 100;
    const progressPercent = nextLevelInfo
        ? Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / totalXpNeededForLevel) * 100)))
        : 100;
    const remainingXp = nextLevelInfo
        ? Math.max(0, nextLevelInfo.minXp - xp)
        : 0;

    // Trigger fireworks and modal
    const fireLevelUpCelebration = (info: LevelInfo) => {
        setLevelUpData(info);
        setShowLevelUpModal(true);

        try {
            const count = 200;
            const defaults = {
                origin: { y: 0.6 },
                zIndex: 9999
            };

            const fire = (particleRatio: number, opts: confetti.Options) => {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            };

            fire(0.25, { spread: 26, startVelocity: 55, colors: ['#FFD700', '#F59E0B', '#10B981'] });
            fire(0.2, { spread: 60, colors: ['#3B82F6', '#6366F1', '#EC4899'] });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#FFD700', '#FFFFFF', '#10B981'] });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#F59E0B', '#EF4444'] });
            fire(0.1, { spread: 120, startVelocity: 45, colors: ['#10B981', '#FFD700'] });
        } catch (e) {
            console.error('Confetti error:', e);
        }
    };

    // Detect Level Up
    useEffect(() => {
        const storedLevelKey = `sparta_last_level_${userId}`;
        const storedLevelStr = safeLocalStorage.getItem(storedLevelKey);
        const storedLevel = storedLevelStr ? parseInt(storedLevelStr, 10) : null;

        if (prevLevelRef.current === null) {
            prevLevelRef.current = currentLevelInfo.level;
            if (storedLevel === null) {
                safeLocalStorage.setItem(storedLevelKey, String(currentLevelInfo.level));
            } else if (currentLevelInfo.level > storedLevel) {
                safeLocalStorage.setItem(storedLevelKey, String(currentLevelInfo.level));
                fireLevelUpCelebration(currentLevelInfo);
            }
            return;
        }

        if (currentLevelInfo.level > prevLevelRef.current) {
            prevLevelRef.current = currentLevelInfo.level;
            safeLocalStorage.setItem(storedLevelKey, String(currentLevelInfo.level));
            fireLevelUpCelebration(currentLevelInfo);
        }
    }, [currentLevelInfo, userId]);

    return (
        <div className={`w-full ${className}`}>
            {/* Liquid Black Glass Level Card */}
            <div className="bg-zinc-950/75 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden space-y-3">
                {/* Ambient Top Glow */}
                <div className="absolute top-0 right-1/4 w-48 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* 1. TOP ROW: Current Level Shield & Next Goal Target */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Shield & Level Title */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 shadow-inner flex items-center justify-center shrink-0">
                            <RankBadgeSVG level={currentLevelInfo.level} className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-russo text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span>УРОВЕНЬ {currentLevelInfo.level}: {currentLevelInfo.title}</span>
                            </h4>
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mt-0.5">
                                Текущий клубный статус
                            </p>
                        </div>
                    </div>

                    {/* Right: Next Level Goal & Gift Preview */}
                    <div className="flex items-center gap-2">
                        {nextLevelInfo ? (
                            <div
                                onClick={() => fireLevelUpCelebration(nextLevelInfo)}
                                className="flex flex-col items-start sm:items-end px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 border border-amber-500/30 text-xs font-medium cursor-pointer transition-all active:scale-95 group shrink-0 shadow-sm"
                                title="Нажми, чтобы посмотреть подарок следующего уровня"
                            >
                                <span className="text-[10px] text-white/60 font-black uppercase tracking-wider">
                                    Следующая награда:
                                </span>
                                <span className="text-xs sm:text-sm font-russo text-amber-300 group-hover:text-yellow-300 transition-colors flex items-center gap-1.5">
                                    <span>🎁 {nextLevelInfo.giftName}</span>
                                </span>
                            </div>
                        ) : (
                            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-russo">
                                Максимальный ранг 👑
                            </div>
                        )}

                        {/* Rules / FAQ Button */}
                        <button
                            type="button"
                            onClick={() => setShowRulesModal(true)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer shrink-0 flex items-center gap-1"
                            title="Как устроена система опыта (XP) и монет Спарта?"
                        >
                            <HelpCircle size={16} className="text-sparta-gold" />
                            <span className="text-[11px] font-bold hidden md:inline">Как это работает</span>
                        </button>
                    </div>
                </div>

                {/* 2. PROGRESS INDICATOR BAR & PERCENTAGE CHIP */}
                <div className="relative z-10 flex items-center gap-3">
                    {/* Animated Progress Bar Track */}
                    <div className="flex-1 h-2.5 bg-zinc-800/80 rounded-full overflow-hidden relative border border-white/5 shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="relative h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] overflow-hidden"
                        >
                            {/* Running Shimmer Highlight (Бегущий блик) */}
                            <motion.div
                                animate={{ x: ['-100%', '250%'] }}
                                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-25deg]"
                            />
                        </motion.div>
                    </div>

                    {/* Percentage Chip */}
                    <div className="px-2 py-0.5 rounded-md bg-zinc-900/90 border border-white/15 text-xs font-mono font-bold text-emerald-400 shadow-sm shrink-0">
                        {progressPercent}%
                    </div>
                </div>

                {/* 3. BOTTOM HELPFUL HINT */}
                <div className="relative z-10 text-[11px] text-zinc-300 font-medium flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5">
                        {nextLevelInfo ? (
                            <>
                                <span className="text-amber-400 font-bold">⚡ {xp} / {nextLevelInfo.minXp} XP</span>
                                <span className="text-white/30">•</span>
                                <span className="text-zinc-400">Посещай тренировки, чтобы открыть подарок! (Осталось <strong className="text-white font-mono">{remainingXp} XP</strong>)</span>
                            </>
                        ) : (
                            <>
                                <span className="text-emerald-400 font-bold">⚡ {xp} XP</span>
                                <span className="text-white/30">•</span>
                                <span className="text-zinc-400">Все клубные подарки получены! Ты настоящий чемпион! 🔥</span>
                            </>
                        )}
                    </span>

                    <button
                        type="button"
                        onClick={() => setShowRulesModal(true)}
                        className="text-[11px] text-sparta-gold hover:underline font-bold md:hidden cursor-pointer"
                    >
                        ❓ Правила начисления
                    </button>
                </div>
            </div>

            {/* Modal 1: How It Works / Rules for XP & Coins */}
            <AnimatePresence>
                {showRulesModal && (
                    <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#121215] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-left space-y-6 shadow-2xl relative overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() => setShowRulesModal(false)}
                                className="absolute top-5 right-5 text-white/40 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                <div className="p-3 bg-sparta-gold/20 text-sparta-gold rounded-2xl border border-sparta-gold/40 shrink-0">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-tight">
                                        Как устроены XP и монеты Спарта
                                    </h3>
                                    <p className="text-xs text-white/60">
                                        Простая система мотивации и реальных подарков для детей
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 text-xs">
                                {/* XP Explanation */}
                                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-400 font-russo uppercase text-sm">
                                        <Zap size={16} />
                                        <span>Опыт (XP) и Уровни</span>
                                    </div>
                                    <p className="text-white/70 leading-relaxed">
                                        Опыт накапливается за каждое посещение тренировки (+10 XP) и выполнение нормативов. Чем выше уровень, тем выше спортивный ранг!
                                    </p>
                                    <div className="pt-1 text-[11px] text-sparta-gold font-bold flex items-center gap-1.5">
                                        <Gift size={14} />
                                        <span>🎁 При каждом повышении уровня ребенок получает реальный подарок бесплатно!</span>
                                    </div>
                                </div>

                                {/* Coins Explanation */}
                                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-300 font-russo uppercase text-sm">
                                        <SpartaCoinIcon size={16} animate />
                                        <span>Монеты Спарта (Sparta Coins)</span>
                                    </div>
                                    <p className="text-white/70 leading-relaxed">
                                        Монеты начисляются за домашние задания тренера (+20..+50 монет), запись побед в архив (+20 монет ежедневно) и спортивные челленджи.
                                    </p>
                                    <div className="pt-1 text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                                        <span>🛒 Накопленные монеты можно потратить в Магазине на фирменный клубный мерч и экипировку.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRulesModal(false)}
                                    className="w-full py-3.5 bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:bg-yellow-400 transition-all font-black cursor-pointer"
                                >
                                    Понятно, вперед к победам! ⚽
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal 2: Level Up Celebration Modal */}
            <AnimatePresence>
                {showLevelUpModal && levelUpData && (
                    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-gradient-to-b from-[#1c1a14] via-[#141310] to-[#0c0c0e] border-2 border-sparta-gold rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-[0_0_80px_rgba(245,158,11,0.35)] relative overflow-hidden"
                        >
                            {/* Ambient Top Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-sparta-gold/20 rounded-full blur-3xl pointer-events-none" />

                            <button
                                type="button"
                                onClick={() => setShowLevelUpModal(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>

                            {/* Badge Icon Explosion */}
                            <div className="relative inline-block mt-2">
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 2.5 }}
                                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 p-1 mx-auto shadow-2xl shadow-amber-500/40 flex items-center justify-center"
                                >
                                    <RankBadgeSVG level={levelUpData.level} className="w-14 h-14" />
                                </motion.div>
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-black border border-sparta-gold text-sparta-gold font-russo text-[11px] uppercase tracking-wider shadow-lg">
                                    УРОВЕНЬ {levelUpData.level}
                                </span>
                            </div>

                            {/* Congratulatory Typography */}
                            <div className="space-y-1.5 pt-2">
                                <span className="text-xs font-black uppercase tracking-widest text-sparta-gold flex items-center justify-center gap-1.5">
                                    <Star size={14} fill="currentColor" />
                                    Новое достижение
                                    <Star size={14} fill="currentColor" />
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-russo text-white uppercase">
                                    Поздравляем, {userName}!
                                </h2>
                                <p className="text-xs sm:text-sm text-white/70">
                                    Ты достиг статуса <strong className="text-sparta-gold font-bold">«{levelUpData.title}»</strong> и открыл клубную награду:
                                </p>
                            </div>

                            {/* Gift Card */}
                            <div className="p-4 rounded-2xl bg-white/[0.04] border border-sparta-gold/30 flex items-center justify-between gap-3 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-sparta-gold/20 flex items-center justify-center text-2xl shrink-0">
                                        {levelUpData.giftIcon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-white/50">Твой приз</p>
                                        <h4 className="text-sm sm:text-base font-russo text-white">
                                            {levelUpData.giftName}
                                        </h4>
                                    </div>
                                </div>
                                <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold shrink-0 flex items-center gap-1">
                                    <Check size={14} />
                                    <span>Открыто</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2">
                                {onOpenShop && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowLevelUpModal(false);
                                            onOpenShop();
                                        }}
                                        className="w-full py-3.5 bg-gradient-to-r from-sparta-gold via-yellow-400 to-sparta-gold text-black font-russo text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer font-black"
                                    >
                                        <Gift size={16} />
                                        <span>Забрать подарок в магазине 🎁</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowLevelUpModal(false)}
                                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Продолжить тренировки 🚀
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LevelProgressBar;
