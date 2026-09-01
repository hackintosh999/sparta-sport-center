import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SpartaReactionDef {
    key: string;
    label: string;
    emoji: string;
    webp3d: string;
    glowColor: string;
}

export const SPARTA_3D_REACTIONS: SpartaReactionDef[] = [
    {
        key: 'fire',
        label: 'Огонь',
        emoji: '🔥',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp',
        glowColor: 'rgba(249, 115, 22, 0.4)'
    },
    {
        key: 'like',
        label: 'Топ',
        emoji: '👍',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp',
        glowColor: 'rgba(59, 130, 246, 0.4)'
    },
    {
        key: 'trophy',
        label: 'Победа',
        emoji: '🏆',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.webp',
        glowColor: 'rgba(234, 179, 8, 0.4)'
    },
    {
        key: 'soccer',
        label: 'Футбол',
        emoji: '⚽',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26bd/512.webp',
        glowColor: 'rgba(255, 255, 255, 0.35)'
    },
    {
        key: 'love',
        label: 'Сердце',
        emoji: '❤️',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp',
        glowColor: 'rgba(239, 68, 68, 0.45)'
    },
    {
        key: 'zap',
        label: 'Молния',
        emoji: '⚡',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/26a1/512.webp',
        glowColor: 'rgba(250, 204, 21, 0.45)'
    },
    {
        key: 'laugh',
        label: 'Смех',
        emoji: '😂',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
        glowColor: 'rgba(245, 158, 11, 0.4)'
    },
    {
        key: 'rocket',
        label: 'Взлет',
        emoji: '🚀',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp',
        glowColor: 'rgba(168, 85, 247, 0.4)'
    },
    {
        key: 'eye',
        label: 'Просмотры',
        emoji: '👁️',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f441_fe0f/512.webp',
        glowColor: 'rgba(255, 184, 0, 0.45)'
    },
    {
        key: 'chart',
        label: 'Аналитика',
        emoji: '📊',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4ca/512.webp',
        glowColor: 'rgba(16, 185, 129, 0.45)'
    },
    {
        key: 'coin',
        label: 'Спарта Коин',
        emoji: '🪙',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fa99/512.webp',
        glowColor: 'rgba(255, 215, 0, 0.5)'
    },
    {
        key: 'crown',
        label: 'MVP Корона',
        emoji: '👑',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.webp',
        glowColor: 'rgba(255, 184, 0, 0.5)'
    },
    {
        key: 'sparkles',
        label: 'Сияние',
        emoji: '✨',
        webp3d: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp',
        glowColor: 'rgba(244, 114, 182, 0.45)'
    }
];

// Helper to find reaction definition
export const getReactionDef = (key: string): SpartaReactionDef | undefined => {
    // Map legacy keys if any
    const normalizedKey = key === 'heart' ? 'love' :
        key === 'thumbs_up' ? 'like' :
        key === 'joy' ? 'laugh' : key;
    return SPARTA_3D_REACTIONS.find(r => r.key === normalizedKey);
};

// 3D Apple-style Icon renderer
export const Sparta3DReactionIcon: React.FC<{
    emojiKey: string;
    size?: number;
    className?: string;
    animate?: boolean;
}> = ({ emojiKey, size = 24, className = '', animate = false }) => {
    const def = getReactionDef(emojiKey);
    const [imgError, setImgError] = useState(false);

    if (!def) return null;

    if (imgError) {
        return <span style={{ fontSize: `${size * 0.8}px` }} className={`select-none ${className}`}>{def.emoji}</span>;
    }

    return (
        <motion.img
            src={def.webp3d}
            alt={def.label}
            onError={() => setImgError(true)}
            style={{ width: `${size}px`, height: `${size}px` }}
            className={`object-contain select-none pointer-events-none drop-shadow-md shrink-0 ${className}`}
            animate={animate ? {
                scale: [1, 1.25, 0.95, 1.1, 1],
                rotate: [0, -8, 8, -4, 0]
            } : undefined}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            loading="lazy"
        />
    );
};

// Apple Dock Magnification Reactions Bar for Context Menu
export const SpartaReactionsBar: React.FC<{
    onReaction: (key: string) => void;
    isMobile?: boolean;
    currentUserId?: string;
    existingReactions?: Record<string, string[]>;
}> = ({ onReaction, isMobile = false, currentUserId, existingReactions }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div
            className="flex items-center justify-between gap-1 p-1 mb-2 bg-[#202026] rounded-2xl border border-white/15 overflow-x-auto no-scrollbar shadow-inner"
            onMouseLeave={() => setHoveredIndex(null)}
        >
            {SPARTA_3D_REACTIONS.map((item, idx) => {
                let scale = 1;
                let translateY = 0;

                if (hoveredIndex !== null && !isMobile) {
                    const distance = Math.abs(hoveredIndex - idx);
                    if (distance === 0) {
                        scale = 1.45;
                        translateY = -6;
                    } else if (distance === 1) {
                        scale = 1.2;
                        translateY = -3;
                    }
                }

                // Check if current user has already reacted with this emoji
                const voters = existingReactions ? (existingReactions[item.key] || existingReactions[item.key === 'love' ? 'heart' : item.key === 'like' ? 'thumbs_up' : item.key === 'laugh' ? 'joy' : item.key] || []) : [];
                const isSelected = Boolean(currentUserId && voters.includes(currentUserId));

                return (
                    <motion.button
                        key={item.key}
                        type="button"
                        onClick={() => onReaction(item.key)}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        animate={{ scale: isSelected ? (scale * 1.12) : scale, y: translateY }}
                        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                        className={`relative p-1.5 rounded-xl transition-all shrink-0 flex items-center justify-center group ${
                            isSelected
                                ? 'bg-sparta-gold/30 border border-sparta-gold ring-1 ring-sparta-gold/50 shadow-[0_0_12px_rgba(255,184,0,0.35)]'
                                : 'hover:bg-white/10 active:scale-95'
                        }`}
                        title={isSelected ? `${item.label} (Нажмите, чтобы убрать реакцию)` : item.label}
                    >
                        <Sparta3DReactionIcon
                            emojiKey={item.key}
                            size={isMobile ? 26 : 28}
                            className="transition-transform"
                            animate={isSelected}
                        />
                        {/* Apple-style floating label on hover */}
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/90 text-white text-[9px] font-black uppercase tracking-wider rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl border border-white/10 z-50">
                            {isSelected ? `${item.label} (убрать)` : item.label}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
};

// Message Reaction Badges rendered below messages
export const SpartaMessageReactionBadges: React.FC<{
    reactions?: Record<string, string[]>;
    currentUserId?: string;
    onToggleReaction: (key: string) => void;
    alignRight?: boolean;
}> = ({ reactions, currentUserId, onToggleReaction, alignRight = false }) => {
    if (!reactions) return null;

    const entries = Object.entries(reactions).filter(([_, voters]) => Array.isArray(voters) && voters.length > 0);
    if (entries.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-1.5 mt-1.5 z-10 ${alignRight ? 'justify-end' : 'justify-start'}`}>
            <AnimatePresence>
                {entries.map(([rawKey, voters]) => {
                    const normalizedKey = rawKey === 'heart' ? 'love' :
                        rawKey === 'thumbs_up' ? 'like' :
                        rawKey === 'joy' ? 'laugh' : rawKey;

                    const def = getReactionDef(normalizedKey);
                    if (!def) return null;

                    const isMine = currentUserId ? voters.includes(currentUserId) : false;

                    return (
                        <motion.button
                            key={rawKey}
                            type="button"
                            layout
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleReaction(rawKey);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md border ${
                                isMine
                                    ? 'bg-sparta-gold/25 border-sparta-gold text-sparta-gold shadow-[0_0_12px_rgba(255,184,0,0.3)] ring-1 ring-sparta-gold/40 scale-105'
                                    : 'bg-[#18181c]/90 border-white/15 text-white/90 hover:bg-white/15 hover:border-white/30'
                            }`}
                            title={`${def.label}: ${voters.length}`}
                        >
                            <Sparta3DReactionIcon emojiKey={normalizedKey} size={16} animate={isMine} />
                            <span className="text-[11px] font-black">{voters.length}</span>
                        </motion.button>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
