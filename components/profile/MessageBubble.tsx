import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Pin, CornerUpLeft, ShieldAlert, Sparkles, Pencil } from 'lucide-react';

export interface MessageBubbleProps {
    message: any;
    currentUserId: string;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, msgId: string) => void;
    onScrollToMessage?: (msgId: string) => void;
    onReactionClick?: (msgId: string, reactionKey: string) => void;
    isSelected?: boolean;
    isActiveMessage?: boolean;
    onToggleSelect?: (msgId: string) => void;
    isSelectMode?: boolean;
    children?: React.ReactNode;
}

const REACTION_EMOJIS: Record<string, string> = {
    love: '❤️',
    heart: '❤️',
    fire: '🔥',
    like: '👍',
    thumbs_up: '👍',
    laugh: '😂',
    joy: '😂',
    wow: '😮',
    open_mouth: '😮',
    party: '🎉',
    trophy: '🏆',
    zap: '⚡',
    cry: '😢',
    soccer: '⚽',
    muscle: '💪'
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    currentUserId,
    onContextMenu,
    onScrollToMessage,
    onReactionClick,
    isSelected,
    isActiveMessage,
    onToggleSelect,
    isSelectMode,
    children
}) => {
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const isOwn = message.senderId === currentUserId;
    const isAnnouncement = message.isAnnouncement;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            touchStartPos.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
        if (longPressTimer.current) clearTimeout(longPressTimer.current);

        // 300ms long press timeout with haptic feedback
        longPressTimer.current = setTimeout(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch (err) {}
            }
            onContextMenu(e, message.id);
        }, 300);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        touchStartPos.current = null;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartPos.current && e.touches.length > 0) {
            const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
            if (dx > 10 || dy > 10) {
                if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                }
            }
        }
    };

    const reactions = message.reactions || {};
    const hasReactions = Object.keys(reactions).some(k => Array.isArray(reactions[k]) && reactions[k].length > 0);

    return (
        <motion.div
            id={`msg-${message.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex items-end gap-2 my-1.5 px-2 select-none ${
                isOwn ? 'justify-end' : 'justify-start'
            } ${isActiveMessage ? 'z-50 relative' : ''}`}
            onContextMenu={(e) => onContextMenu(e, message.id)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onClick={() => {
                if (isSelectMode && onToggleSelect) {
                    onToggleSelect(message.id);
                }
            }}
        >
            {/* Message Card Container */}
            <div
                className={`relative max-w-[85%] md:max-w-[72%] rounded-2xl p-3.5 shadow-md transition-all ${
                    isActiveMessage
                        ? 'ring-2 ring-amber-400 scale-[1.01]'
                        : isSelected
                        ? 'ring-2 ring-sparta-gold scale-[0.98]'
                        : ''
                } ${
                    isAnnouncement
                        ? message.priority === 'urgent'
                            ? 'bg-red-950/40 border-2 border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.25)] text-white w-full max-w-full'
                            : 'bg-gradient-to-br from-sparta-gold/20 via-amber-950/30 to-black/60 border-2 border-sparta-gold/50 shadow-[0_0_25px_rgba(212,175,55,0.2)] text-white w-full max-w-full'
                        : isOwn
                        ? 'bg-sparta-gold/20 border border-sparta-gold/30 text-white rounded-br-none'
                        : 'bg-[#18181b] border border-white/10 text-white/90 rounded-bl-none'
                }`}
            >
                {/* Announcement Banner */}
                {isAnnouncement && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/15">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${message.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : 'bg-sparta-gold/20 text-sparta-gold'}`}>
                                <ShieldAlert size={16} />
                            </div>
                            <span className="font-black text-xs uppercase tracking-wider text-sparta-gold">
                                {message.title || 'Официальное объявление тренера'}
                            </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                            Важно
                        </span>
                    </div>
                )}

                {/* Pinned Indicator */}
                {message.isPinned && !isAnnouncement && (
                    <div className="flex items-center gap-1 text-[10px] text-sparta-gold font-bold mb-1.5 bg-sparta-gold/10 px-2 py-0.5 rounded-md w-fit">
                        <Pin size={11} className="rotate-45" />
                        <span>Закрепленное сообщение</span>
                    </div>
                )}

                {/* Sender Name in group chats */}
                {!isOwn && message.senderName && (
                    <div className="text-xs font-bold text-sparta-gold mb-1 flex items-center gap-1.5">
                        <span>{message.senderName}</span>
                        {message.senderRole && ['trainer', 'coach', 'admin'].includes(message.senderRole) && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                                {message.senderRole === 'admin' ? 'Админ' : 'Тренер'}
                            </span>
                        )}
                    </div>
                )}

                {/* Reply Container */}
                {message.replyTo && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onScrollToMessage && message.replyTo.id) {
                                onScrollToMessage(message.replyTo.id);
                            }
                        }}
                        className="flex items-center gap-2 p-2 mb-2 bg-black/40 rounded-xl border-l-2 border-sparta-gold cursor-pointer hover:bg-black/60 transition-colors"
                    >
                        <CornerUpLeft size={14} className="text-sparta-gold shrink-0" />
                        <div className="overflow-hidden text-xs">
                            <span className="font-bold text-sparta-gold block truncate">
                                {message.replyTo.senderName || 'Пользователь'}
                            </span>
                            <span className="text-white/60 truncate block text-[11px]">
                                {message.replyTo.text || 'Медиа'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Custom Body / Children or Text */}
                {children ? (
                    children
                ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                    </p>
                )}

                {/* Footer Info: Timestamp, Edited status & Read Status */}
                <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-white/40">
                    {message.isEdited && (
                        <span className="text-[9px] text-white/40 italic flex items-center gap-0.5">
                            <Pencil size={9} />
                            изм.
                        </span>
                    )}
                    <span>
                        {message.timestamp
                            ? typeof message.timestamp === 'string'
                                ? message.timestamp
                                : new Date(message.timestamp?.seconds * 1000 || Date.now()).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                  })
                            : ''}
                    </span>
                    {isOwn && (
                        <span>
                            {message.read ? (
                                <CheckCheck size={14} className="text-sparta-gold" />
                            ) : (
                                <Check size={14} />
                            )}
                        </span>
                    )}
                </div>

                {/* Reactions Pill Display */}
                {hasReactions && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-white/5">
                        {Object.entries(reactions).map(([key, voters]: [string, any]) => {
                            if (!Array.isArray(voters) || voters.length === 0) return null;
                            const hasVoted = voters.includes(currentUserId);
                            const emoji = REACTION_EMOJIS[key] || '👍';
                            return (
                                <button
                                    key={key}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReactionClick?.(message.id, key);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                                        hasVoted
                                            ? 'bg-sparta-gold/25 border border-sparta-gold/60 text-sparta-gold scale-105'
                                            : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                                    }`}
                                >
                                    <span>{emoji}</span>
                                    <span className="text-[10px] font-mono">{voters.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default MessageBubble;
