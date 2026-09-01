import React from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle2, Lock, Download, Eye, Sparkles, Star } from 'lucide-react';
import { SpartanUnifiedAchievement, getAward3DDefaultIcon } from '../../hooks/useStudentAchievements';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

interface CertificateCardProps {
    certificate: SpartanUnifiedAchievement;
    onClick: (certificate: SpartanUnifiedAchievement) => void;
    onTogglePin?: (badgeId: string, buttonEl?: HTMLElement) => void;
    isPinnedInProfile?: boolean;
    pinnedCount?: number;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
    certificate,
    onClick,
    onTogglePin,
    isPinnedInProfile,
    pinnedCount = 0
}) => {
    const isUnlocked = certificate.unlocked;
    const isPinned = Boolean(isPinnedInProfile || certificate.isPinnedInProfile || certificate.isPinned);

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(certificate)}
            className={`min-h-[280px] rounded-3xl p-5 flex flex-col justify-between transition-all cursor-pointer group relative overflow-hidden text-center border-2 ${
                isUnlocked
                    ? 'bg-gradient-to-b from-[#1c1a14] via-[#121215] to-[#0a0a0c] border-sparta-gold/60 shadow-[0_0_25px_rgba(212,175,55,0.15)] hover:border-sparta-gold hover:shadow-[0_0_35px_rgba(212,175,55,0.3)]'
                    : 'bg-zinc-950/70 border-white/10 opacity-70 hover:opacity-90'
            }`}
        >
            {/* Inner Decorative Golden Line */}
            <div className={`absolute inset-2 border rounded-2xl pointer-events-none transition-colors ${
                isUnlocked ? 'border-sparta-gold/30 group-hover:border-sparta-gold/50' : 'border-white/5'
            }`} />

            {/* Top Bar: Certificate Tag & Status */}
            <div className="flex items-center justify-between z-10 gap-1.5 flex-wrap">
                <span className="text-[10px] font-russo uppercase tracking-wider text-sparta-gold flex items-center gap-1">
                    <span>📜</span>
                    <span>Клубная грамота</span>
                </span>

                <div className="flex items-center gap-1.5">
                    {/* Кнопка [ ⭐ В витрину (X/4) ] */}
                    {isUnlocked && onTogglePin && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTogglePin(certificate.id, e.currentTarget);
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                isPinned
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                                    : 'bg-white/5 hover:bg-amber-500/10 text-white/70 hover:text-amber-300 border-white/10'
                            }`}
                            title={isPinned ? 'Убрать из витрины профиля' : 'Показать в витрине профиля'}
                        >
                            <Star size={10} className={isPinned ? 'fill-amber-400 text-amber-400' : 'text-white/60'} />
                            <span>{isPinned ? '✅ В витрине' : `В витрину (${pinnedCount}/4)`}</span>
                        </button>
                    )}

                    {isUnlocked ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} className="stroke-[3]" />
                            <span>Вручено</span>
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-zinc-400 bg-black/60 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock size={10} className="text-amber-400" />
                            <span>Закрыто</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Center: Gold Crest & Diploma Title */}
            <div className="my-auto py-3 space-y-3 z-10 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center transition-all overflow-hidden p-1 ${
                    isUnlocked
                        ? 'border-sparta-gold/50 bg-black/60 shadow-[0_0_20px_rgba(212,175,55,0.25)] group-hover:scale-105'
                        : 'border-white/10 bg-black/40 grayscale opacity-50'
                }`}>
                    <img
                        src={certificate.iconUrl || getAward3DDefaultIcon(certificate.category, certificate.type, certificate.title)}
                        alt={certificate.title}
                        className="w-full h-full object-contain"
                    />
                </div>

                <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold block">
                        ФА СПАРТА
                    </span>
                    <h4 className="font-russo text-base text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        {certificate.title}
                    </h4>
                    <p className="text-xs text-white/70 line-clamp-2 px-2">
                        {certificate.subtitle || certificate.description}
                    </p>
                </div>
            </div>

            {/* Bottom: Coach Verification & Open Action */}
            <div className="z-10 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <div className="text-left">
                    <span className="text-[9px] text-white/40 block">Подтвердил:</span>
                    <span className="text-[11px] font-bold text-amber-300 truncate max-w-[140px] block">
                        {certificate.confirmedByCoach}
                    </span>
                </div>

                {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sparta-gold/20 text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black font-russo text-[10px] uppercase tracking-wider transition-all font-bold">
                        <Eye size={12} />
                        <span>Открыть</span>
                    </span>
                ) : (
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/25 flex items-center gap-1 font-russo">
                        <SpartaCoinIcon size={11} />
                        <span>+{certificate.rewardCoins}</span>
                    </span>
                )}
            </div>
        </motion.div>
    );
};

export default CertificateCard;
