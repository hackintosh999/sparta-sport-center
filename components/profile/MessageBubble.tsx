import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Pin, CornerUpLeft } from 'lucide-react';

export interface MessageBubbleProps {
    message: any;
    currentUserId: string;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, msgId: string) => void;
    onScrollToMessage?: (msgId: string) => void;
    isSelected?: boolean;
    isActiveMessage?: boolean;
    onToggleSelect?: (msgId: string) => void;
    isSelectMode?: boolean;
    children?: React.ReactNode;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    currentUserId,
    onContextMenu,
    onScrollToMessage,
    isSelected,
    isActiveMessage,
    onToggleSelect,
    isSelectMode,
    children
}) => {
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const isOwn = message.senderId === currentUserId;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            touchStartPos.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
        if (longPressTimer.current) clearTimeout(longPressTimer.current);

        // 300ms long press timeout with haptic feedback (navigator.vibrate(40))
        longPressTimer.current = setTimeout(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch (err) {
                    // Ignore vibration restrictions
                }
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

    return (
        <motion.div
            id={`msg-${message.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex items-end gap-2 my-1 px-2 select-none ${
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
                className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3 shadow-md transition-all ${
                    isActiveMessage
                        ? 'ring-2 ring-amber-400 scale-[1.01]'
                        : isSelected
                        ? 'ring-2 ring-sparta-gold scale-[0.98]'
                        : ''
                } ${
                    isOwn
                        ? 'bg-sparta-gold/20 border border-sparta-gold/30 text-white rounded-br-none'
                        : 'bg-[#18181b] border border-white/10 text-white/90 rounded-bl-none'
                }`}
            >
                {/* Pinned Indicator */}
                {message.isPinned && (
                    <div className="flex items-center gap-1 text-[10px] text-sparta-gold font-bold mb-1">
                        <Pin size={12} className="rotate-45" />
                        <span>Закрепленное сообщение</span>
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
                        className="flex items-center gap-2 p-2 mb-2 bg-black/30 rounded-xl border-l-2 border-sparta-gold cursor-pointer hover:bg-black/50 transition-colors"
                    >
                        <CornerUpLeft size={14} className="text-sparta-gold shrink-0" />
                        <div className="overflow-hidden text-xs">
                            <span className="font-bold text-sparta-gold block truncate">
                                {message.replyTo.senderName || 'Пользователь'}
                            </span>
                            <span className="text-white/60 truncate block">
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

                {/* Footer Info: Timestamp & Read Status */}
                <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] text-white/40">
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
            </div>
        </motion.div>
    );
};

export default MessageBubble;
