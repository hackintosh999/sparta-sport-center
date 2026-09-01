import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, CheckCircle2, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface SpartanBadge {
    id: string;
    icon: string;
    title: string;
    description: string;
    subtitle?: string; // Что сделал ребенок: «Первая тренировка в клубе»
    remainingRequirement?: string; // Понятное условие: «Осталось набить 3 раза»
    category?: string;
    unlocked: boolean;
    unlockedAt?: string | number | null;
    progress?: { current: number; max: number; unit?: string };
    rewardCoins?: number;
    rewardXp?: number;
    confirmedByCoach?: string; // Тренер, подтвердивший норматив
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
    isNew?: boolean;
    isPinned?: boolean;
}

interface BadgeCardProps {
    badge: SpartanBadge;
    onClick: (badge: SpartanBadge) => void;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, onClick }) => {
    const isUnlocked = badge.unlocked;
    const isNew = Boolean(isUnlocked && badge.isNew);
    const isPinned = Boolean(badge.isPinned);

    const formattedDate = badge.unlockedAt
        ? (() => {
            try {
                const ts = typeof badge.unlockedAt === 'number'
                    ? badge.unlockedAt
                    : Date.parse(badge.unlockedAt as string);
                if (isNaN(ts)) return 'В этом сезоне';
                return format(new Date(ts), 'd MMM', { locale: ru });
            } catch {
                return 'В этом сезоне';
            }
        })()
        : 'В этом сезоне';

    // 1. ОТКРЫТАЯ НАГРАДА (status === 'unlocked')
    if (isUnlocked) {
        return (
            <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onClick(badge)}
                className={`bg-zinc-900/90 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.12)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:border-amber-500/60 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group relative overflow-hidden text-left ${
                    isNew ? 'animate-pulse ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : ''
                }`}
            >
                {/* Glow highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Top status chips: New badge or Pinned star */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                    {isPinned && (
                        <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-sm" title="Закреплено на главной">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                        </div>
                    )}
                    {isNew && (
                        <div className="px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400/50 text-[9px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Sparkles size={9} className="text-amber-300" />
                            <span>✨ Новое</span>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="space-y-3 z-10">
                    {/* Icon with golden glow */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-amber-500/30 flex items-center justify-center relative shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            <span className="text-2xl filter drop-shadow-[0_0_10px_rgba(245,158,11,0.6)] group-hover:scale-110 transition-transform">
                                {badge.icon}
                            </span>
                            <div className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 text-black rounded-full shadow-sm">
                                <CheckCircle2 size={10} className="stroke-[3]" />
                            </div>
                        </div>

                        <div className="min-w-0 pr-8">
                            {/* Название достижения (font-bold text-sm text-white) */}
                            <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                                {badge.title}
                            </h4>
                            {/* Короткая подпись: что сделал ребенок */}
                            <p className="text-xs text-white/60 line-clamp-1 mt-0.5">
                                {badge.subtitle || badge.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Футер карточки: дата получения и компактный бейдж награды 🟡 +{coins} */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs z-10">
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Calendar size={11} className="text-zinc-500" />
                        <span>{formattedDate}</span>
                    </span>

                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/25 flex items-center gap-1 font-russo">
                        <span>🟡 +{badge.rewardCoins || 30}</span>
                    </span>
                </div>
            </motion.div>
        );
    }

    // 2. ЗАКРЫТАЯ НАГРАДА С ПРОГРЕССОМ (status === 'in_progress')
    const hasProgress = badge.progress && badge.progress.max > 0;
    const current = badge.progress?.current || 0;
    const max = badge.progress?.max || 1;
    const progressPercent = Math.min(100, Math.round((current / max) * 100));

    const remainingCount = Math.max(0, max - current);
    const remainingText = badge.remainingRequirement || (
        remainingCount > 0
            ? `Осталось ${remainingCount} ${badge.progress?.unit || 'раз'}`
            : 'В процессе выполнения'
    );

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(badge)}
            className="bg-zinc-950/60 border border-white/5 opacity-70 hover:opacity-95 hover:border-white/15 rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group text-left relative overflow-hidden"
        >
            {/* Main Content */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    {/* Иконка с замочком */}
                    <div className="w-12 h-12 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center relative shrink-0">
                        <span className="text-2xl filter grayscale opacity-40 group-hover:opacity-60 transition-opacity">
                            {badge.icon}
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 group-hover:border-amber-500/30 transition-colors shadow-md">
                                <Lock size={12} />
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0">
                        {/* Название */}
                        <h4 className="font-bold text-sm text-white/80 group-hover:text-white transition-colors truncate">
                            {badge.title}
                        </h4>
                        {/* Понятное условие: «Осталось набить 3 раза» */}
                        <p className="text-xs text-amber-400/90 font-medium line-clamp-1 mt-0.5">
                            {remainingText}
                        </p>
                    </div>
                </div>

                {/* Наглядный прогресс-бар: полоса h-1.5 bg-zinc-800 rounded-full с ярким заполнением bg-amber-400 и текстом 12 / 15 */}
                {hasProgress ? (
                    <div className="space-y-1.5 pt-1">
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                            <span>Прогресс:</span>
                            <span className="text-amber-300 font-mono">{current} / {max}</span>
                        </div>
                    </div>
                ) : (
                    <div className="pt-1">
                        <span className="text-[10px] text-zinc-500 font-medium block line-clamp-1">
                            {badge.description}
                        </span>
                    </div>
                )}
            </div>

            {/* Футер: статус и будущая награда */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    В витрине
                </span>

                <span className="text-[11px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 flex items-center gap-1 font-russo opacity-80">
                    <span>🟡 +{badge.rewardCoins || 30}</span>
                </span>
            </div>
        </motion.div>
    );
};

export default BadgeCard;
