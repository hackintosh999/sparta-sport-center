import React, { useRef } from 'react';
import { MessageSquare, Pin, BellOff, ChevronRight } from 'lucide-react';

export interface ActiveChatProps {
    chat: any;
    isActive?: boolean;
    onSelectChat: (chat: any) => void;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, chatId: string) => void;
    unreadCount?: number;
    userPrefs?: Record<string, { isPinned?: boolean; isMuted?: boolean }>;
}

export const ActiveChat: React.FC<ActiveChatProps> = ({
    chat,
    isActive,
    onSelectChat,
    onContextMenu,
    unreadCount = 0,
    userPrefs = {}
}) => {
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);

        // 300ms touch timeout with navigator.vibrate(40)
        longPressTimer.current = setTimeout(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch (err) {
                    // Ignore vibration errors
                }
            }
            onContextMenu(e, chat.id);
        }, 300);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const pref = userPrefs[chat.id] || {};

    return (
        <div
            onClick={() => onSelectChat(chat)}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, chat.id);
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all select-none ${
                isActive
                    ? 'bg-sparta-gold/15 border border-sparta-gold/30 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-transparent'
            }`}
        >
            {/* Avatar / Icon */}
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-sparta-gold/30 to-amber-600/30 flex items-center justify-center border border-sparta-gold/40 shrink-0">
                {chat.avatarUrl ? (
                    <img
                        src={chat.avatarUrl}
                        alt={chat.name || 'Chat'}
                        className="w-full h-full rounded-full object-cover"
                    />
                ) : (
                    <MessageSquare size={20} className="text-sparta-gold" />
                )}

                {/* Online / Active badge */}
                {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#121214]" />
                )}
            </div>

            {/* Chat Meta Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                        {chat.name || 'Групповой чат'}
                        {pref.isPinned && <Pin size={12} className="text-sparta-gold rotate-45 shrink-0" />}
                        {pref.isMuted && <BellOff size={12} className="text-white/40 shrink-0" />}
                    </span>
                    <span className="text-[10px] text-white/40 shrink-0">
                        {chat.lastMessageTime || ''}
                    </span>
                </div>

                <p className="text-xs text-white/50 truncate">
                    {chat.lastMessage || 'Нет сообщений'}
                </p>
            </div>

            {/* Unread Badge / Action Arrow */}
            <div className="flex items-center gap-2 shrink-0">
                {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-sparta-gold text-black rounded-full shadow-lg">
                        {unreadCount}
                    </span>
                )}
                <ChevronRight size={16} className="text-white/30" />
            </div>
        </div>
    );
};

export default ActiveChat;
