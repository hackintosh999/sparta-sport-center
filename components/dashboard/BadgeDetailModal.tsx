import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, Gift, Calendar, Star, ShieldCheck, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SpartanBadge } from './BadgeCard';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

interface BadgeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    badge: SpartanBadge | null;
    onOpenStore?: () => void;
    onTogglePin?: (badgeId: string) => void;
    isPinned?: boolean;
}

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
    isOpen,
    onClose,
    badge,
    onOpenStore,
    onTogglePin,
    isPinned = false
}) => {
    if (!isOpen || !badge) return null;

    const isUnlocked = badge.unlocked;

    const formattedDate = badge.unlockedAt
        ? (() => {
            try {
                const ts = typeof badge.unlockedAt === 'number'
                    ? badge.unlockedAt
                    : Date.parse(badge.unlockedAt as string);
                if (isNaN(ts)) return 'В этом сезоне';
                return format(new Date(ts), 'd MMMM yyyy', { locale: ru });
            } catch {
                return 'В этом сезоне';
            }
        })()
        : null;

    const coachName = badge.confirmedByCoach || 'Тренерский штаб SPARTA';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                {/* Backdrop Click */}
                <div className="absolute inset-0" onClick={onClose} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="bg-gradient-to-b from-[#18181c]/95 via-[#121215]/95 to-[#09090b]/95 border border-white/15 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_80px_rgba(0,0,0,0.8)] relative text-center space-y-5 overflow-hidden z-10"
                >
                    {/* Golden Ambience Glow */}
                    <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
                        isUnlocked ? 'bg-amber-500/25' : 'bg-white/5'
                    }`} />

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer z-20"
                    >
                        <X size={18} />
                    </button>

                    {/* 1. Анимированный трофей */}
                    <div className="relative pt-2 flex flex-col items-center justify-center">
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            className="relative w-24 h-24 flex items-center justify-center"
                        >
                            {/* Golden Neon Ring */}
                            <div className={`absolute inset-0 rounded-full border-2 ${
                                isUnlocked
                                    ? 'border-amber-400 bg-gradient-to-b from-amber-500/25 to-transparent shadow-[0_0_35px_rgba(245,158,11,0.5)]'
                                    : 'border-white/10 bg-white/5'
                            }`} />

                            <span className={`text-5xl filter ${
                                isUnlocked
                                    ? 'drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                                    : 'grayscale opacity-50 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]'
                            }`}>
                                {badge.icon}
                            </span>
                        </motion.div>

                        {/* 2. Статус: «✅ Достижение разблокировано!» или «🔒 В процессе выполнения» */}
                        <div className="mt-3.5">
                            {isUnlocked ? (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-russo uppercase text-[11px] font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                    <CheckCircle2 size={14} />
                                    <span>✅ Достижение разблокировано!</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 font-russo uppercase text-[11px] font-bold">
                                    <Lock size={13} className="text-amber-400" />
                                    <span>🔒 В процессе выполнения</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Название & Краткое описание */}
                    <div className="space-y-1">
                        <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wide">
                            {badge.title}
                        </h3>
                        {badge.subtitle && (
                            <p className="text-xs text-amber-300 font-medium">
                                {badge.subtitle}
                            </p>
                        )}
                    </div>

                    {/* 3. Карточка спортивного сертификата */}
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3.5 text-left text-xs">
                        {/* Полное описание спортивного норматива */}
                        <div>
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                                Спортивный норматив:
                            </span>
                            <p className="text-white/80 leading-relaxed">
                                {badge.description}
                            </p>
                        </div>

                        {/* Тренер, подтвердивший норматив */}
                        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                            <span className="text-white/50 font-medium flex items-center gap-1.5">
                                <UserCheck size={14} className="text-sparta-gold" />
                                <span>Подтвердил норматив:</span>
                            </span>
                            <span className="font-bold text-white/90 truncate max-w-[200px]">
                                {coachName}
                            </span>
                        </div>

                        {/* Дата подтверждения (если разблокирован) */}
                        {formattedDate && (
                            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                <span className="text-white/50 font-medium flex items-center gap-1.5">
                                    <Calendar size={13} className="text-zinc-400" />
                                    <span>Дата фиксации:</span>
                                </span>
                                <span className="font-bold text-zinc-300">
                                    {formattedDate}
                                </span>
                            </div>
                        )}

                        {/* Прогресс (если еще не открыт) */}
                        {!isUnlocked && badge.progress && badge.progress.max > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-white/50">Текущий результат:</span>
                                    <span className="text-amber-400 font-mono">
                                        {badge.progress.current} / {badge.progress.max} {badge.progress.unit || 'раз'}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                                        style={{ width: `${Math.min(100, (badge.progress.current / badge.progress.max) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Награда за достижение */}
                        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                            <span className="text-white/50 font-medium">Награда за норматив:</span>
                            <div className="flex items-center gap-2 font-russo font-bold text-amber-300">
                                <span className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 rounded-lg">
                                    <SpartaCoinIcon size={12} />
                                    <span>+{badge.rewardCoins || 30} монет</span>
                                </span>
                                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                                    +{badge.rewardXp || 50} XP
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 4. Кнопки действий: «⭐ Закрепить на главной карточке» и переход в магазин */}
                    <div className="space-y-2 pt-1">
                        {isUnlocked && onTogglePin && (
                            <button
                                type="button"
                                onClick={() => onTogglePin(badge.id)}
                                className={`w-full py-3 rounded-xl font-russo uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 font-bold ${
                                    isPinned
                                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-amber-400/40'
                                }`}
                            >
                                <Star size={15} className={isPinned ? 'fill-black' : 'text-amber-400'} />
                                <span>{isPinned ? '⭐ Закреплено на главной карточке' : '⭐ Закрепить на главной карточке'}</span>
                            </button>
                        )}

                        <div className="flex items-center gap-2.5">
                            {onOpenStore && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenStore();
                                    }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-sparta-gold hover:text-yellow-300 border border-sparta-gold/30 rounded-xl text-xs font-russo uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 font-bold"
                                >
                                    <Gift size={14} />
                                    <span>В магазин призов</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 bg-gradient-to-r from-sparta-gold to-yellow-400 hover:brightness-110 text-black font-russo uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer active:scale-95 font-black shadow-lg shadow-sparta-gold/20"
                            >
                                Понятно
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BadgeDetailModal;
