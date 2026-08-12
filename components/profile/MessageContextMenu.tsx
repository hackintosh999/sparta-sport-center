import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Reply,
    MessageSquare,
    Pin,
    Forward,
    Copy,
    Trash2,
    CheckSquare,
    User,
    Download,
    Heart,
    Flame,
    ThumbsUp,
    Smile,
    Sparkles,
    Frown
} from 'lucide-react';

export interface TargetBounds {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export interface ContextMenuPosition {
    x: number;
    y: number;
    msgId: string;
    isOwn?: boolean;
    targetBounds?: TargetBounds;
}

export interface MessageContextMenuProps {
    contextMenu: ContextMenuPosition | null;
    onClose: () => void;
    userProfile?: any;
    message?: any;
    currentUserId?: string;
    onReaction?: (msgId: string, reactionKey: string) => void;
    onReply?: (msg: any) => void;
    onDiscuss?: (msgId: string) => void;
    onPin?: (msgId: string) => void;
    onForward?: (msg: any) => void;
    onCopy?: (msg: any) => void;
    onSelect?: (msgId: string) => void;
    onPrivateChat?: (senderId: string, senderName: string) => void;
    onDelete?: (msgId: string) => void;
    onDownload?: (mediaUrl: string) => void;
}

// Ghost / semi-transparent SVG reaction icons
export const GHOST_SVG_REACTION_LIST = [
    { key: 'heart', label: 'Heart', icon: Heart },
    { key: 'fire', label: 'Flame', icon: Flame },
    { key: 'thumbs_up', label: 'ThumbsUp', icon: ThumbsUp },
    { key: 'joy', label: 'Smile', icon: Smile },
    { key: 'open_mouth', label: 'Sparkles', icon: Sparkles },
    { key: 'cry', label: 'Frown', icon: Frown }
];

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    contextMenu,
    onClose,
    userProfile,
    message,
    currentUserId,
    onReaction,
    onReply,
    onDiscuss,
    onPin,
    onForward,
    onCopy,
    onSelect,
    onPrivateChat,
    onDelete,
    onDownload
}) => {
    const [isMobile, setIsMobile] = useState<boolean>(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!contextMenu) return null;

    const role = (userProfile?.role || '').toLowerCase();
    const canPin = ['coach', 'trainer', 'admin', 'director', 'developer'].includes(role);

    const isOwnMessage =
        contextMenu.isOwn ??
        (message && currentUserId ? message.senderId === currentUserId : false);

    const canDelete =
        ['admin', 'director', 'developer', 'coach', 'trainer'].includes(role) ||
        isOwnMessage;

    // Calculate relative local anchor positioning based on target bubble bounds & ownership alignment
    const getLocalizedPosition = () => {
        const menuWidth = 240;
        const menuHeight = 320;
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 667;

        if (contextMenu.targetBounds) {
            const b = contextMenu.targetBounds;
            const spaceAbove = b.top;
            const positionAbove = spaceAbove >= menuHeight + 8;

            let top = positionAbove ? b.top - menuHeight - 6 : b.bottom + 6;
            top = Math.max(8, Math.min(top, screenHeight - menuHeight - 8));

            let left: number;
            if (isOwnMessage) {
                left = b.right - menuWidth;
            } else {
                left = b.left;
            }

            left = Math.max(8, Math.min(left, screenWidth - menuWidth - 8));

            return { top, left };
        }

        const left = Math.max(8, Math.min(contextMenu.x, screenWidth - menuWidth - 8));
        const top = Math.max(8, Math.min(contextMenu.y, screenHeight - menuHeight - 8));
        return { top, left };
    };

    const positionStyle = getLocalizedPosition();

    return (
        <AnimatePresence>
            {/* Completely Invisible Overlay to Catch Outside Clicks (Zero Backdrop Dimming/Blur) */}
            <div
                className="fixed inset-0 z-40 bg-transparent pointer-events-auto"
                onClick={onClose}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onClose();
                }}
            />

            {/* Context Menu Container (z-50) anchored locally next to target bubble */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="fixed z-50 bg-[#121214]/95 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[240px] max-w-[90vw]"
                style={{
                    left: positionStyle.left,
                    top: positionStyle.top
                }}
            >
                {/* Semi-transparent Reaction Row Icons */}
                <div className="flex items-center justify-between gap-1 p-1.5 mb-1.5 bg-neutral-800/50 rounded-xl border border-white/5 overflow-x-auto no-scrollbar scrollbar-none">
                    {GHOST_SVG_REACTION_LIST.map((item) => {
                        const IconComp = item.icon;
                        return (
                            <button
                                key={item.key}
                                onClick={() => {
                                    onReaction?.(contextMenu.msgId, item.key);
                                    onClose();
                                }}
                                className="p-2 text-neutral-400/80 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-all hover:scale-110 active:scale-95 shrink-0 flex items-center justify-center"
                                title={item.label}
                            >
                                <IconComp size={17} strokeWidth={1.75} />
                            </button>
                        );
                    })}
                </div>

                {/* Semi-transparent Ghost Action List */}
                <div className="space-y-0.5">
                    {/* Ответить */}
                    <button
                        onClick={() => {
                            if (message && onReply) onReply(message);
                            onClose();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                    >
                        <Reply size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">Ответить</span>
                    </button>

                    {/* Обсудить */}
                    <button
                        onClick={() => {
                            if (onDiscuss) onDiscuss(contextMenu.msgId);
                            onClose();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                    >
                        <MessageSquare size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">Обсудить</span>
                    </button>

                    {/* Закрепить */}
                    {canPin && (
                        <button
                            onClick={() => {
                                if (onPin) onPin(contextMenu.msgId);
                                onClose();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                        >
                            <Pin size={16} className="rotate-45 text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                            <span className="text-xs font-medium tracking-wide">Закрепить объявление</span>
                        </button>
                    )}

                    {/* Переслать */}
                    <button
                        onClick={() => {
                            if (message && onForward) onForward(message);
                            onClose();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                    >
                        <Forward size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">Переслать</span>
                    </button>

                    {/* Копировать */}
                    <button
                        onClick={() => {
                            if (message && onCopy) onCopy(message);
                            onClose();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                    >
                        <Copy size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                        <span className="text-xs font-medium tracking-wide">Копировать</span>
                    </button>

                    {/* Сохранить медиа */}
                    {message?.mediaUrl && onDownload && (
                        <button
                            onClick={() => {
                                onDownload(message.mediaUrl);
                                onClose();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                        >
                            <Download size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                            <span className="text-xs font-medium tracking-wide">Сохранить медиа</span>
                        </button>
                    )}

                    {/* Выделить */}
                    {onSelect && (
                        <button
                            onClick={() => {
                                onSelect(contextMenu.msgId);
                                onClose();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                        >
                            <CheckSquare size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                            <span className="text-xs font-medium tracking-wide">Выделить</span>
                        </button>
                    )}

                    {/* Написать автору */}
                    {message && currentUserId && message.senderId !== currentUserId && onPrivateChat && (
                        <button
                            onClick={() => {
                                onPrivateChat(message.senderId, message.senderName);
                                onClose();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300/80 hover:text-amber-400 hover:bg-neutral-800/40 rounded-xl transition-all text-left group"
                        >
                            <User size={16} className="text-neutral-400/80 group-hover:text-amber-400 transition-colors" />
                            <span className="text-xs font-medium tracking-wide">Написать автору</span>
                        </button>
                    )}

                    {/* Удалить */}
                    {canDelete && (
                        <button
                            onClick={() => {
                                if (onDelete) onDelete(contextMenu.msgId);
                                onClose();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all text-left group"
                        >
                            <Trash2 size={16} className="text-red-400/80 group-hover:text-red-300 transition-colors" />
                            <span className="text-xs font-medium tracking-wide">Удалить</span>
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default MessageContextMenu;
