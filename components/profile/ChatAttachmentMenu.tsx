import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Image as ImageIcon,
    FileText,
    Camera,
    BarChart2,
    Megaphone,
    Calendar,
    X,
    UploadCloud
} from 'lucide-react';

export interface ChatAttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGallery: () => void;
    onSelectDoc: () => void;
    onSelectCamera: () => void;
    onSelectPoll?: () => void;
    onSelectAnnouncement?: () => void;
    onSelectSchedule?: () => void;
    isTrainerOrAdmin?: boolean;
}

export const ChatAttachmentMenu: React.FC<ChatAttachmentMenuProps> = ({
    isOpen,
    onClose,
    onSelectGallery,
    onSelectDoc,
    onSelectCamera,
    onSelectPoll,
    onSelectAnnouncement,
    onSelectSchedule,
    isTrainerOrAdmin = false
}) => {
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleAction = (callback: () => void) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(30);
            } catch (err) {}
        }
        callback();
        onClose();
    };

    return (
        <AnimatePresence>
            {/* ========================================================================= */}
            {/* 💻 DESKTOP POPOVER (Positioned directly above the chat attachment button) */}
            {/* ========================================================================= */}
            {!isMobile && (
                <>
                    {/* Transparent Click-catcher (NO dark screen on Desktop) */}
                    <div
                        className="fixed inset-0 z-[140] bg-transparent cursor-default"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute bottom-full left-2 sm:left-6 mb-3 z-[150] w-72 bg-[#151518]/98 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/80"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-white/5">
                            <span className="text-[11px] font-black font-russo uppercase tracking-wider text-white/70">
                                Вложения
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Action List */}
                        <div className="space-y-1">
                            {/* 1. Media */}
                            <button
                                type="button"
                                onClick={() => handleAction(onSelectGallery)}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 text-white transition-all group text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                    <ImageIcon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                        Фото или Видео
                                    </p>
                                    <p className="text-[10px] text-white/40 truncate">
                                        Медиафайлы и галерея
                                    </p>
                                </div>
                            </button>

                            {/* 2. Document */}
                            <button
                                type="button"
                                onClick={() => handleAction(onSelectDoc)}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 text-white transition-all group text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                        Файл или Документ
                                    </p>
                                    <p className="text-[10px] text-white/40 truncate">
                                        PDF, DOCX, таблицы
                                    </p>
                                </div>
                            </button>

                            {/* 3. Poll */}
                            {onSelectPoll && (
                                <button
                                    type="button"
                                    onClick={() => handleAction(onSelectPoll)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 text-white transition-all group text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                        <BarChart2 size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors truncate">
                                            Опрос команды
                                        </p>
                                        <p className="text-[10px] text-white/40 truncate">
                                            Голосование участников
                                        </p>
                                    </div>
                                </button>
                            )}

                            {/* 4. Coach Announcement */}
                            {isTrainerOrAdmin && onSelectAnnouncement && (
                                <button
                                    type="button"
                                    onClick={() => handleAction(onSelectAnnouncement)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-sparta-gold/10 hover:bg-sparta-gold/20 border border-sparta-gold/30 text-white transition-all group text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-sparta-gold text-black font-bold flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                        <Megaphone size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="text-xs font-black text-sparta-gold truncate">
                                                Объявление тренера
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-white/50 truncate">
                                            Закрепленное сообщение
                                        </p>
                                    </div>
                                </button>
                            )}

                            {/* 5. Schedule Training */}
                            {isTrainerOrAdmin && onSelectSchedule && (
                                <button
                                    type="button"
                                    onClick={() => handleAction(onSelectSchedule)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/10 text-white transition-all group text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                                            Запланировать тренировку
                                        </p>
                                        <p className="text-[10px] text-white/40 truncate">
                                            Карточка в расписание
                                        </p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}

            {/* ========================================================================= */}
            {/* 📱 MOBILE BOTTOM SHEET (Modal sheet on phones and tablets)                */}
            {/* ========================================================================= */}
            {isMobile && (
                <div className="fixed inset-0 z-[250] flex items-end justify-center">
                    {/* Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Sliding Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative z-[260] w-full max-w-lg bg-[#141418] border-t border-white/15 rounded-t-[32px] p-5 pb-8 shadow-2xl space-y-4"
                    >
                        {/* Drag Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

                        <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <UploadCloud size={18} className="text-sparta-gold" />
                                <h4 className="text-sm font-black font-russo text-white uppercase tracking-wider">
                                    Прикрепить файл
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 text-white/40 hover:text-white rounded-full bg-white/5"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                            {/* 1. Camera */}
                            <button
                                type="button"
                                onClick={() => handleAction(onSelectCamera)}
                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 active:scale-95 active:bg-white/10 transition-all text-center"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-1.5">
                                    <Camera size={22} />
                                </div>
                                <span className="text-xs font-bold text-white">Камера</span>
                                <span className="text-[9px] text-white/40">Снимок</span>
                            </button>

                            {/* 2. Gallery */}
                            <button
                                type="button"
                                onClick={() => handleAction(onSelectGallery)}
                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 active:scale-95 active:bg-white/10 transition-all text-center"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center mb-1.5">
                                    <ImageIcon size={22} />
                                </div>
                                <span className="text-xs font-bold text-white">Галерея</span>
                                <span className="text-[9px] text-white/40">Фото/видео</span>
                            </button>

                            {/* 3. Document */}
                            <button
                                type="button"
                                onClick={() => handleAction(onSelectDoc)}
                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 active:scale-95 active:bg-white/10 transition-all text-center"
                            >
                                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-1.5">
                                    <FileText size={22} />
                                </div>
                                <span className="text-xs font-bold text-white">Документ</span>
                                <span className="text-[9px] text-white/40">PDF, DOC</span>
                            </button>

                            {/* 4. Poll */}
                            {onSelectPoll && (
                                <button
                                    type="button"
                                    onClick={() => handleAction(onSelectPoll)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 active:scale-95 active:bg-white/10 transition-all text-center"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-1.5">
                                        <BarChart2 size={22} />
                                    </div>
                                    <span className="text-xs font-bold text-white">Опрос</span>
                                    <span className="text-[9px] text-white/40">Голосование</span>
                                </button>
                            )}

                            {/* 5. Coach Announcement */}
                            {isTrainerOrAdmin && onSelectAnnouncement && (
                                <button
                                    type="button"
                                    onClick={() => handleAction(onSelectAnnouncement)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sparta-gold/15 border border-sparta-gold/40 active:scale-95 active:bg-sparta-gold/25 transition-all text-center"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-sparta-gold text-black font-bold flex items-center justify-center mb-1.5">
                                        <Megaphone size={22} />
                                    </div>
                                    <span className="text-xs font-black text-sparta-gold">Объявление</span>
                                    <span className="text-[9px] text-sparta-gold/80">Закреп</span>
                                </button>
                            )}

                            {/* 6. Schedule Training */}
                            {isTrainerOrAdmin && onSelectSchedule && (
                                <button
                                    type="button"
                                    onClick={() => handleAction(onSelectSchedule)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/5 active:scale-95 active:bg-white/10 transition-all text-center"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-1.5">
                                        <Calendar size={22} />
                                    </div>
                                    <span className="text-xs font-bold text-white">Тренировка</span>
                                    <span className="text-[9px] text-white/40">Запись</span>
                                </button>
                            )}
                        </div>

                        {/* Cancel Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-white/5 active:bg-white/10 text-white/60 font-bold uppercase tracking-wider text-xs border border-white/5 transition-all mt-2"
                        >
                            Отмена
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ChatAttachmentMenu;
