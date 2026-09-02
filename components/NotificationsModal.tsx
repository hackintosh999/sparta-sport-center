import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Bell, Info, Filter, Trash2,
    CheckSquare, MessageSquare, Zap, CreditCard,
    Shield, ChevronRight
} from 'lucide-react';
import { db } from '../firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: any[];
    onMarkAsRead: (id: string) => Promise<void>;
}

type NotificationCategory = 'all' | 'chat' | 'training' | 'payment' | 'system';

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, notifications, onMarkAsRead }) => {
    const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'unread'>('newest');
    const navigate = useNavigate();

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteDoc(doc(db, "notifications", id));
        } catch (err) {
            console.error(err);
        }
    };

    const clearAll = async () => {
        if (notifications.length === 0) return;
        if (!window.confirm("Удалить все уведомления?")) return;

        const batch = writeBatch(db);
        notifications.forEach(n => {
            batch.delete(doc(db, "notifications", n.id));
        });
        await batch.commit();
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        if (unread.length === 0) return;

        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, "notifications", n.id), { isRead: true });
        });
        await batch.commit();
    };

    const handleNotificationClick = async (note: any) => {
        if (!note.isRead) {
            onMarkAsRead(note.id);
        }
        onClose();

        const isChatNote = note.type === 'chat' ||
            note.type === 'chat_message' ||
            note.type === 'coach_message' ||
            (note.type === 'request' && note.relatedId);

        if (isChatNote) {
            const chatId = note.data?.chatId || note.chatId;
            const targetUid = note.data?.senderId || note.senderId || note.relatedId;
            const targetName = note.data?.senderName || note.senderName;

            let url = '/dashboard?tab=messages_unified';
            if (chatId) url += `&chatId=${chatId}`;
            if (targetUid) url += `&targetUid=${targetUid}`;
            if (targetName) url += `&targetName=${encodeURIComponent(targetName)}`;

            navigate(url);
        } else if (note.type === 'training') {
            navigate('/dashboard?tab=activity');
        } else if (note.type === 'payment') {
            navigate('/dashboard?tab=subscriptions');
        } else if (note.type === 'news' && note.relatedId) {
            navigate(`/?newsId=${note.relatedId}#news`);
        }
    };

    const getNoteIcon = (type: string) => {
        switch (type) {
            case 'chat': return <MessageSquare size={18} className="text-blue-400" />;
            case 'training': return <Zap size={18} className="text-sparta-gold" />;
            case 'payment': return <CreditCard size={18} className="text-green-400" />;
            case 'request': return <Info size={18} className="text-cyan-400" />;
            default: return <Bell size={18} className="text-white/40" />;
        }
    };

    const getNoteStyles = (type: string, isRead: boolean) => {
        if (isRead) return 'bg-white/[0.02] border-white/5 opacity-60';
        switch (type) {
            case 'chat': return 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]';
            case 'training': return 'bg-sparta-gold/10 border-sparta-gold/20 shadow-[0_0_20px_rgba(212,175,55,0.1)]';
            case 'payment': return 'bg-green-500/10 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]';
            default: return 'bg-white/5 border-white/10';
        }
    };

    const formatTimestamp = (seconds: number) => {
        const date = new Date(seconds * 1000);
        if (isToday(date)) return `Сегодня в ${format(date, 'HH:mm')}`;
        if (isYesterday(date)) return `Вчера в ${format(date, 'HH:mm')}`;
        return format(date, 'd MMM HH:mm', { locale: ru });
    };

    const filtered = notifications.filter(n => {
        if (activeTab === 'all') return true;
        if (activeTab === 'system') return n.type === 'announcement' || n.type === 'request' || n.type === 'news';
        return n.type === activeTab;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (sortOrder === 'unread') {
            if (a.isRead === b.isRead) return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            return a.isRead ? 1 : -1;
        }
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    const tabs: { id: NotificationCategory, label: string, icon: any }[] = [
        { id: 'all', label: 'Все', icon: <Bell size={14} /> },
        { id: 'chat', label: 'Чаты', icon: <MessageSquare size={14} /> },
        { id: 'training', label: 'Обучение', icon: <Zap size={14} /> },
        { id: 'payment', label: 'Оплаты', icon: <CreditCard size={14} /> },
        { id: 'system', label: 'Сервис', icon: <Shield size={14} /> },
    ];

    const unreadByCategory = (cat: NotificationCategory) => {
        return notifications.filter(n => !n.isRead && (cat === 'all' || (cat === 'system' ? (n.type === 'announcement' || n.type === 'request' || n.type === 'news') : n.type === cat))).length;
    };

    if (typeof document === 'undefined') return null;

    const drawerContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120]"
                    />
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-[130] w-full max-w-md bg-[#080808] border-l border-white/10 shadow-3xl flex flex-col font-manrope overflow-hidden text-left"
                    >
                        {/* Header */}
                        <div className="p-8 pb-6 bg-[#0a0a0a] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold/5 blur-[60px] rounded-full -mr-16 -mt-16" />

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-2xl font-russo text-white uppercase tracking-widest">Уведомления</h2>
                                    <p className="text-white/40 text-xs mt-1 font-medium">Ваш пульс событий в Спарте</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    aria-label="Закрыть"
                                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Custom Tabs */}
                            <div className="flex gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5 relative z-10 overflow-x-auto scrollbar-hide">
                                {tabs.map((tab) => {
                                    const count = unreadByCategory(tab.id);
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative cursor-pointer ${activeTab === tab.id ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                            {count > 0 && (
                                                <span className={`ml-1 w-2 h-2 rounded-full ${activeTab === tab.id ? 'bg-black' : 'bg-red-500 animate-pulse'}`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Controls */}
                        <div className="px-6 py-4 flex items-center justify-between bg-[#0a0a0a] border-b border-white/5 relative z-10">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSortOrder('newest')}
                                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors cursor-pointer ${sortOrder === 'newest' ? 'text-sparta-gold' : 'text-white/20 hover:text-white/40'}`}
                                >
                                    Последние
                                </button>
                                <button
                                    onClick={() => setSortOrder('unread')}
                                    className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors cursor-pointer ${sortOrder === 'unread' ? 'text-sparta-gold' : 'text-white/20 hover:text-white/40'}`}
                                >
                                    Непрочитанные
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={markAllAsRead}
                                    className="p-2 text-white/20 hover:text-sparta-gold transition-colors cursor-pointer"
                                    title="Прочитать все"
                                >
                                    <CheckSquare size={16} />
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="p-2 text-white/20 hover:text-red-500 transition-colors cursor-pointer"
                                    title="Очистить всё"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                            <AnimatePresence mode="popLayout">
                                {sorted.length > 0 ? (
                                    (() => {
                                        const groups: { [key: string]: any[] } = {};
                                        sorted.forEach(note => {
                                            const date = note.createdAt?.seconds ? new Date(note.createdAt.seconds * 1000) : new Date();
                                            let groupKey = 'Ранее';
                                            if (isToday(date)) groupKey = 'Сегодня';
                                            else if (isYesterday(date)) groupKey = 'Вчера';
                                            else groupKey = format(date, 'd MMMM', { locale: ru });

                                            if (!groups[groupKey]) groups[groupKey] = [];
                                            groups[groupKey].push(note);
                                        });

                                        return Object.entries(groups).map(([groupName, groupNotes]) => (
                                            <div key={groupName} className="space-y-4">
                                                <div className="flex items-center gap-4 my-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 whitespace-nowrap">{groupName}</span>
                                                    <div className="h-[1px] w-full bg-white/5" />
                                                </div>
                                                {groupNotes.map((note) => (
                                                    <motion.div
                                                        key={note.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className={`group p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${getNoteStyles(note.type, note.isRead)}`}
                                                        onClick={() => handleNotificationClick(note)}
                                                    >
                                                        {/* Glow effect for unread */}
                                                        {!note.isRead && (
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-sparta-gold" />
                                                        )}

                                                        <div className="flex gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 bg-white/5`}>
                                                                {getNoteIcon(note.type)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <h4 className="text-white font-russo text-sm truncate pr-4">{note.title}</h4>
                                                                    <span className="text-[10px] text-white/30 whitespace-nowrap font-medium italic">
                                                                        {note.createdAt?.seconds ? format(new Date(note.createdAt.seconds * 1000), 'HH:mm') : 'Только что'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-white/60 text-xs leading-relaxed mb-3 line-clamp-2 pr-2">
                                                                    {note.message}
                                                                </p>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${note.type === 'chat' ? 'bg-blue-500/20 text-blue-400' :
                                                                                note.type === 'training' ? 'bg-sparta-gold/20 text-sparta-gold' :
                                                                                    note.type === 'payment' ? 'bg-green-500/20 text-green-400' :
                                                                                        'bg-white/10 text-white/40'
                                                                            }`}>
                                                                            {note.type === 'chat' ? 'Чат' :
                                                                                note.type === 'training' ? 'Обучение' :
                                                                                    note.type === 'payment' ? 'Оплата' :
                                                                                        'Системное'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] text-sparta-gold/60 group-hover:text-sparta-gold font-bold opacity-60 group-hover:opacity-100 transition-all">
                                                                        Детали <ChevronRight size={10} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons overlay */}
                                                        <div className="absolute top-2 right-2 flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => deleteNotification(note.id, e)}
                                                                className="p-1.5 bg-white/5 hover:bg-red-500/80 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer"
                                                                title="Удалить уведомление"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ));
                                    })()
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-white/20 py-20"
                                    >
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                            <Bell size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-sm font-russo uppercase tracking-widest">Тишина и покой</p>
                                        <p className="text-xs mt-2">Новых уведомлений пока нет</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Info */}
                        <div className="p-6 bg-[#0a0a0a] border-t border-white/5 text-center">
                            <p className="text-[10px] text-white/10 font-bold uppercase tracking-[0.3em]">Sparta Sports Center • Ecosystem</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(drawerContent, document.body);
};

export default NotificationsModal;
