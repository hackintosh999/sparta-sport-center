import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    Eye,
    Pencil,
    Bookmark,
    PinOff
} from 'lucide-react';
import { SpartaReactionsBar } from './SpartaReactions';

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
    chatType?: 'saved' | 'group' | 'private' | 'channel' | 'team';
    isSavedChat?: boolean;
    isPrivateChat?: boolean;
    isGroupChat?: boolean;
    isChannel?: boolean;
    isPinned?: boolean;
    onReaction?: (msgId: string, reactionKey: string) => void;
    onReply?: (msg: any) => void;
    onEdit?: (msg: any) => void;
    onDiscuss?: (msgId: string) => void;
    onPin?: (msgId: string) => void;
    onForward?: (msg: any) => void;
    onSaveToFavorites?: (msg: any) => void;
    onCopy?: (msg: any) => void;
    onSelect?: (msgId: string) => void;
    onPrivateChat?: (senderId: string, senderName: string) => void;
    onDelete?: (msgId: string) => void;
    onDownload?: (mediaUrl: string) => void;
    onOpenMedia?: (msg: any) => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    contextMenu,
    onClose,
    userProfile,
    message,
    currentUserId,
    chatType,
    isSavedChat,
    isPrivateChat,
    isGroupChat,
    isChannel,
    isPinned = false,
    onReaction,
    onReply,
    onEdit,
    onDiscuss,
    onPin,
    onForward,
    onSaveToFavorites,
    onCopy,
    onSelect,
    onPrivateChat,
    onDelete,
    onDownload,
    onOpenMedia
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

    if (!contextMenu || typeof document === 'undefined') return null;

    const isSaved = Boolean(isSavedChat || chatType === 'saved');
    const isPrivate = Boolean(isPrivateChat || chatType === 'private');
    const isChan = Boolean(isChannel || chatType === 'channel');

    const role = (userProfile?.role || '').toLowerCase();
    const isStaff = ['admin', 'director', 'developer', 'coach', 'trainer', 'staff'].includes(role);
    const isChild = ['student', 'kid', 'child'].includes(role);
    const isParent = ['parent'].includes(role);

    // In Saved Messages, all items belong to the personal storage owner
    const isOwnMessage = isSaved
        ? true
        : (contextMenu.isOwn ?? (message && currentUserId ? message.senderId === currentUserId : false));

    // Adaptive Permissions Matrix:
    // 1. Pinning: User can pin their notes in Saved; Staff can pin in Groups/Channels
    const canPin = isSaved ? true : isStaff;
    // 2. Thread discussions: Only in Groups for Staff and Parents (hidden in Saved / Private)
    const canDiscuss = !isSaved && !isPrivate && (isStaff || isParent);
    // 3. Forwarding: Available to everyone across all chat types
    const canForward = true;
    // 4. Deleting: User can delete anything in Saved; Staff can moderate; Users can delete their own
    const canDelete = isSaved || isStaff || isOwnMessage;
    // 5. Direct 1-on-1 chat with author: Only in group chats for non-self messages
    const canPrivateChat = !isSaved && !isPrivate && message && currentUserId && message.senderId !== currentUserId;
    // 6. Quick 1-click Save to Favorites: Available in all chats except when already in Saved
    const canSaveToFavorites = !isSaved && Boolean(onSaveToFavorites);

    // Calculate smart cursor-aware & content-aware positioning
    const getLocalizedPosition = () => {
        const menuWidth = 240;
        let itemCount = 5;
        if (message?.mediaUrl) itemCount += 2;
        if (isOwnMessage && message?.text && !message?.mediaUrl) itemCount += 1;
        if (canDiscuss) itemCount += 1;
        if (canPin) itemCount += 1;
        if (canForward) itemCount += 1;
        if (canDelete) itemCount += 1;
        const estimatedHeight = Math.min(itemCount * 38 + 65, 400);

        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

        let left = contextMenu.x;
        let top = contextMenu.y;

        // If triggered via mouse cursor click (Desktop / Mouse right-click)
        if (contextMenu.x > 0 && contextMenu.y > 0) {
            // Horizontal auto-flip: if near right edge, unfold to the left
            if (contextMenu.x + menuWidth > screenWidth - 16) {
                left = Math.max(16, contextMenu.x - menuWidth);
            } else {
                left = contextMenu.x + 4;
            }

            // Vertical auto-flip: if near bottom edge, unfold upwards
            if (contextMenu.y + estimatedHeight > screenHeight - 16) {
                top = Math.max(16, contextMenu.y - estimatedHeight);
            } else {
                top = contextMenu.y + 4;
            }

            return { top, left };
        }

        // Target Bounds Fallback (if opened via anchor button)
        if (contextMenu.targetBounds) {
            const b = contextMenu.targetBounds;
            const spaceBelow = screenHeight - b.bottom;
            const spaceAbove = b.top;

            if (spaceBelow < estimatedHeight + 10 && spaceAbove > estimatedHeight + 10) {
                top = b.top - estimatedHeight - 6;
            } else {
                top = b.bottom + 6;
            }
            top = Math.max(16, Math.min(top, screenHeight - estimatedHeight - 16));

            if (isOwnMessage) {
                left = Math.max(16, b.right - menuWidth);
            } else {
                left = Math.min(screenWidth - menuWidth - 16, b.left);
            }

            return { top, left };
        }

        return {
            top: Math.max(16, Math.min(top, screenHeight - estimatedHeight - 16)),
            left: Math.max(16, Math.min(left, screenWidth - menuWidth - 16))
        };
    };

    const positionStyle = getLocalizedPosition();

    const menuContent = (
        <AnimatePresence>
            {/* Click-catcher Overlay */}
            <div
                key="sparta-context-menu-overlay"
                className={`fixed inset-0 z-[9998] pointer-events-auto ${isMobile ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}`}
                onClick={onClose}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onClose();
                }}
            />

            {/* Context Menu Container: Bottom Sheet on Mobile, Anchored on Desktop */}
            <motion.div
                key="sparta-context-menu-box"
                initial={isMobile ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.95, y: -4 }}
                animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                exit={isMobile ? { opacity: 0, y: 100 } : { opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={`fixed z-[9999] bg-[#16161a] border-2 border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.95)] ring-1 ring-black/90 ${
                    isMobile
                        ? 'bottom-0 left-0 right-0 rounded-t-3xl p-4 max-h-[85vh] overflow-y-auto'
                        : 'rounded-2xl p-1.5 min-w-[240px] max-w-[90vw]'
                }`}
                style={isMobile ? {} : {
                    left: positionStyle.left,
                    top: positionStyle.top
                }}
            >
                {/* Mobile Handle Indicator */}
                {isMobile && (
                    <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-3" />
                )}

                {/* 3D Apple-style Reactions Row (Hidden in Saved Messages) */}
                {!isSaved && (
                    <SpartaReactionsBar
                        onReaction={(key) => {
                            onReaction?.(contextMenu.msgId, key);
                            onClose();
                        }}
                        isMobile={isMobile}
                        currentUserId={currentUserId}
                        existingReactions={message?.reactions}
                    />
                )}

                {/* Action List */}
                <div className="space-y-0.5">
                    {/* 👁️ Открыть во весь экран (для фото/видео) */}
                    {message?.mediaUrl && onOpenMedia && (
                        <button
                            onClick={() => {
                                onOpenMedia(message);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-sparta-gold text-black hover:bg-yellow-400 rounded-xl transition-all text-left font-black shadow-md shadow-sparta-gold/25 group mb-1"
                        >
                            <Eye size={17} className="shrink-0 stroke-[2.5]" />
                            <span className="text-xs uppercase tracking-wider">Открыть во весь экран</span>
                        </button>
                    )}

                    {/* ⭐️ Сохранить в Избранное (в 1 клик для обычных чатов) */}
                    {canSaveToFavorites && onSaveToFavorites && (
                        <button
                            onClick={() => {
                                if (message) onSaveToFavorites(message);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/15 rounded-xl transition-all text-left group font-semibold"
                        >
                            <Bookmark size={16} className="text-sparta-gold fill-sparta-gold/30 group-hover:fill-sparta-gold transition-all shrink-0" />
                            <span className="text-xs tracking-wide">В Избранное</span>
                        </button>
                    )}

                    {/* Ответить */}
                    <button
                        onClick={() => {
                            if (message && onReply) onReply(message);
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                    >
                        <Reply size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                        <span className="text-xs tracking-wide">Ответить</span>
                    </button>

                    {/* Изменить / Редактировать (для своих сообщений или заметок в Избранном) */}
                    {((isSaved && message?.text) || (isOwnMessage && message?.text && !message?.mediaUrl)) && onEdit && (
                        <button
                            onClick={() => {
                                onEdit(message);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                        >
                            <Pencil size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">{isSaved ? 'Редактировать заметку' : 'Изменить'}</span>
                        </button>
                    )}

                    {/* Обсудить в ветке (для персонала и родителей в группах) */}
                    {canDiscuss && onDiscuss && (
                        <button
                            onClick={() => {
                                onDiscuss(contextMenu.msgId);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                        >
                            <MessageSquare size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">Обсудить в ветке</span>
                        </button>
                    )}

                    {/* Закрепить / Открепить */}
                    {canPin && onPin && (
                        <button
                            onClick={() => {
                                onPin(contextMenu.msgId);
                                onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left group font-semibold ${
                                isPinned
                                    ? 'text-amber-300 hover:text-amber-200 bg-amber-500/20 border border-amber-500/30'
                                    : 'text-amber-300 hover:text-amber-200 hover:bg-amber-500/15'
                            }`}
                        >
                            {isPinned ? (
                                <PinOff size={16} className="text-amber-400 shrink-0" />
                            ) : (
                                <Pin size={16} className="rotate-45 text-amber-400 shrink-0" />
                            )}
                            <span className="text-xs tracking-wide">
                                {isPinned
                                    ? (isSaved ? 'Открепить заметку' : 'Открепить объявление')
                                    : (isSaved ? 'Закрепить заметку' : 'Закрепить объявление')}
                            </span>
                        </button>
                    )}

                    {/* Переслать */}
                    {canForward && onForward && (
                        <button
                            onClick={() => {
                                if (message) onForward(message);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                        >
                            <Forward size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">Переслать</span>
                        </button>
                    )}

                    {/* Копировать */}
                    <button
                        onClick={() => {
                            if (message && onCopy) onCopy(message);
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                    >
                        <Copy size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                        <span className="text-xs tracking-wide">
                            {message?.mediaUrl && message?.mediaType === 'image'
                                ? 'Скопировать фото'
                                : message?.mediaUrl
                                ? 'Скопировать ссылку на медиа'
                                : 'Скопировать текст'}
                        </span>
                    </button>

                    {/* Сохранить медиа на устройство */}
                    {message?.mediaUrl && onDownload && (
                        <button
                            onClick={() => {
                                onDownload(message.mediaUrl);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                        >
                            <Download size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">Сохранить на устройство</span>
                        </button>
                    )}

                    {/* Выделить */}
                    {onSelect && (
                        <button
                            onClick={() => {
                                onSelect(contextMenu.msgId);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                        >
                            <CheckSquare size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">Выделить</span>
                        </button>
                    )}

                    {/* Написать автору (только в групповых чатах) */}
                    {canPrivateChat && onPrivateChat && (
                        <button
                            onClick={() => {
                                onPrivateChat(message.senderId, message.senderName);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-white hover:text-sparta-gold hover:bg-white/10 rounded-xl transition-all text-left group font-medium"
                        >
                            <User size={16} className="text-white/70 group-hover:text-sparta-gold transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">Написать автору</span>
                        </button>
                    )}

                    {/* Удалить */}
                    {canDelete && (
                        <button
                            onClick={() => {
                                if (onDelete) onDelete(contextMenu.msgId);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-200 hover:bg-red-500/20 rounded-xl transition-all text-left group font-medium border-t border-white/5 mt-1 pt-2"
                        >
                            <Trash2 size={16} className="text-red-400 group-hover:text-red-200 transition-colors shrink-0" />
                            <span className="text-xs tracking-wide">
                                {isSaved
                                    ? 'Удалить из Избранного'
                                    : isStaff && !isOwnMessage
                                    ? 'Удалить как модератор'
                                    : 'Удалить'}
                            </span>
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(menuContent, document.body);
};

export default MessageContextMenu;
