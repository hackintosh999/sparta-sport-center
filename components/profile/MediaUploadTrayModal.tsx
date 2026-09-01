import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    Play,
    Plus,
    Send,
    Trash2,
    Sparkles,
    Check,
    ChevronDown,
    ArrowLeft,
    MoreVertical,
    RefreshCw,
    Maximize2
} from 'lucide-react';
import { SpartaPreviewPlayer } from './SpartaPreviewPlayer';

export interface MediaUploadItem {
    file: File;
    url: string;
    type: 'image' | 'video' | 'file';
    sizeFormatted: string;
    category?: string;
}

export interface MediaUploadTrayModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: MediaUploadItem[];
    onAddMore: () => void;
    onRemoveItem: (index: number) => void;
    onReplaceItem: (index: number, newFile: File) => void;
    onSend: (caption: string, category: string) => Promise<void>;
    isUploading: boolean;
    uploadProgress: number;
    isTrainerOrAdmin: boolean;
}

const MEDIA_CATEGORIES = [
    { id: 'match', label: '⚽ Матч' },
    { id: 'training', label: '🏋️ Тренировка' },
    { id: 'tournament', label: '🏆 Турнир' },
    { id: 'doc', label: '📄 Документ' },
    { id: 'general', label: '💬 Общее' }
];

export const MediaUploadTrayModal: React.FC<MediaUploadTrayModalProps> = ({
    isOpen,
    onClose,
    items,
    onAddMore,
    onRemoveItem,
    onReplaceItem,
    onSend,
    isUploading,
    isTrainerOrAdmin
}) => {
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [caption, setCaption] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('general');
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
    const [activeActionMenuIndex, setActiveActionMenuIndex] = useState<number | null>(null);
    const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset focused index if item is deleted
    useEffect(() => {
        if (focusedIndex !== null && focusedIndex >= items.length) {
            setFocusedIndex(items.length > 0 ? items.length - 1 : null);
        }
    }, [items.length, focusedIndex]);

    if (!isOpen || items.length === 0 || !mounted) return null;

    const totalBytes = items.reduce((acc, item) => acc + item.file.size, 0);
    const totalSizeFormatted = (totalBytes / (1024 * 1024)).toFixed(1) + ' МБ';
    const maxLimitMb = isTrainerOrAdmin ? 100 : 25;
    const isExceedingLimit = totalBytes > maxLimitMb * 1024 * 1024;

    const currentCategoryObj = MEDIA_CATEGORIES.find(c => c.id === selectedCategory) || MEDIA_CATEGORIES[4];

    const handleSendClick = async () => {
        if (isUploading || isExceedingLimit) return;
        await onSend(caption, selectedCategory);
        setCaption('');
        setSelectedCategory('general');
        setFocusedIndex(null);
        setActiveActionMenuIndex(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const triggerReplace = (index: number) => {
        setReplaceTargetIndex(index);
        setActiveActionMenuIndex(null);
        if (replaceInputRef.current) {
            replaceInputRef.current.value = '';
            replaceInputRef.current.click();
        }
    };

    const handleFileReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && replaceTargetIndex !== null) {
            onReplaceItem(replaceTargetIndex, file);
        }
        setReplaceTargetIndex(null);
    };

    const modalContent = (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[350] flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 select-none"
                onClick={() => {
                    setActiveActionMenuIndex(null);
                    setIsCategoryMenuOpen(false);
                }}
            >
                {/* Hidden input for replacing specific photo */}
                <input
                    ref={replaceInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.zip,.xls,.xlsx"
                    onChange={handleFileReplace}
                />

                {/* Dark Blur Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 sm:backdrop-blur-2xl"
                    onClick={onClose}
                />

                {/* Main Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 15 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                    className="relative z-10 w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-[#0e0e12] sm:border sm:border-sparta-gold/30 sm:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Clean Top Header */}
                    <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-3">
                            {focusedIndex !== null && items.length > 1 ? (
                                <button
                                    onClick={() => setFocusedIndex(null)}
                                    className="p-1.5 rounded-xl bg-white/5 hover:bg-sparta-gold hover:text-black text-white/70 transition-all flex items-center gap-1.5 text-xs font-bold"
                                    title="Назад ко всем фото"
                                >
                                    <ArrowLeft size={16} />
                                    <span className="hidden sm:inline">Все фото</span>
                                </button>
                            ) : (
                                <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 flex items-center justify-center shadow-inner">
                                    <Sparkles size={16} />
                                </div>
                            )}

                            <div>
                                <h3 className="text-xs sm:text-sm font-black font-russo uppercase text-white tracking-wider flex items-center gap-2">
                                    {items.length === 1 ? 'Отправка файла' : `Отправка ${items.length} файлов`}
                                    <span className="text-[10px] text-sparta-gold font-mono font-bold">
                                        ({totalSizeFormatted})
                                    </span>
                                </h3>
                                {isExceedingLimit && (
                                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
                                        Лимит превышен ({maxLimitMb} МБ)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2">
                            {/* Add More button */}
                            <button
                                type="button"
                                onClick={onAddMore}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-sparta-gold/40 border border-white/10 text-white/70 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 active:scale-95"
                                title="Добавить еще фото или видео"
                            >
                                <Plus size={14} className="text-sparta-gold" />
                                <span className="hidden sm:inline">Добавить</span>
                            </button>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-all active:scale-90"
                                title="Закрыть"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Adaptive Media Canvas (Auto-adapts to ANY aspect ratio) */}
                    <div className="relative flex-1 bg-[#07070a] overflow-y-auto p-3 sm:p-4 flex flex-col items-center justify-center min-h-[260px]">
                        {focusedIndex !== null ? (
                            /* SINGLE FOCUSED MEDIA VIEW */
                            <div className="relative w-full h-full max-h-[58vh] sm:max-h-[52vh] flex items-center justify-center">
                                {items[focusedIndex]?.type === 'image' ? (
                                    <motion.img
                                        key={items[focusedIndex].url}
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        src={items[focusedIndex].url}
                                        alt=""
                                        className="max-w-full max-h-[58vh] sm:max-h-[52vh] object-contain rounded-2xl shadow-2xl"
                                    />
                                ) : items[focusedIndex]?.type === 'video' ? (
                                    <SpartaPreviewPlayer
                                        key={items[focusedIndex].url}
                                        src={items[focusedIndex].url}
                                        autoPlay={true}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-6 text-center">
                                        <div className="w-20 h-20 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/10">
                                            <FileText size={38} />
                                        </div>
                                        <p className="text-sm font-bold text-white max-w-sm truncate px-2">{items[focusedIndex]?.file.name}</p>
                                        <p className="text-xs text-white/40 mt-1 uppercase font-mono">{items[focusedIndex]?.sizeFormatted}</p>
                                    </div>
                                )}

                                {/* Top Right Actions in Focus View */}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
                                    <button
                                        type="button"
                                        onClick={() => triggerReplace(focusedIndex)}
                                        className="p-2 rounded-xl bg-black/70 hover:bg-sparta-gold hover:text-black text-white/80 transition-all backdrop-blur-md border border-white/10 active:scale-90"
                                        title="Заменить это видео"
                                    >
                                        <RefreshCw size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onRemoveItem(focusedIndex);
                                            setFocusedIndex(null);
                                        }}
                                        className="p-2 rounded-xl bg-black/70 hover:bg-red-500 text-white/80 hover:text-white backdrop-blur-md transition-all border border-white/10 active:scale-90"
                                        title="Удалить этот файл"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ) : items.length === 1 ? (
                            /* SINGLE ITEM VIEW (Full aspect-ratio support) */
                            <div className="relative w-full h-full max-h-[58vh] sm:max-h-[52vh] flex items-center justify-center">
                                {items[0].type === 'image' ? (
                                    <motion.img
                                        key={items[0].url}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        src={items[0].url}
                                        alt=""
                                        className="max-w-full max-h-[58vh] sm:max-h-[52vh] object-contain rounded-2xl shadow-2xl"
                                    />
                                ) : items[0].type === 'video' ? (
                                    <SpartaPreviewPlayer
                                        key={items[0].url}
                                        src={items[0].url}
                                        autoPlay={true}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-6 text-center">
                                        <div className="w-20 h-20 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/10">
                                            <FileText size={38} />
                                        </div>
                                        <p className="text-sm font-bold text-white max-w-sm truncate px-2">{items[0].file.name}</p>
                                        <p className="text-xs text-white/40 mt-1 uppercase font-mono">{items[0].sizeFormatted}</p>
                                    </div>
                                )}

                                {/* Top Right Actions for 1 item */}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
                                    <button
                                        type="button"
                                        onClick={() => triggerReplace(0)}
                                        className="p-2 rounded-xl bg-black/70 hover:bg-sparta-gold hover:text-black text-white/80 transition-all backdrop-blur-md border border-white/10 active:scale-90"
                                        title="Заменить этот файл"
                                    >
                                        <RefreshCw size={15} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* MULTI-ITEM ADAPTIVE GALLERY (No duplication, fits all aspect ratios) */
                            <div className="w-full max-h-[58vh] sm:max-h-[52vh] overflow-y-auto no-scrollbar py-1">
                                <div className={`grid gap-2.5 sm:gap-3 w-full ${
                                    items.length === 2 ? 'grid-cols-2' :
                                    items.length === 3 ? 'grid-cols-3' :
                                    items.length === 4 ? 'grid-cols-2' :
                                    'grid-cols-2 sm:grid-cols-3'
                                }`}>
                                    {items.map((item, idx) => {
                                        const isMenuOpen = activeActionMenuIndex === idx;
                                        return (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                                className="group relative rounded-2xl overflow-hidden bg-[#111116] border border-white/10 hover:border-sparta-gold/60 cursor-pointer transition-all shadow-md flex items-center justify-center aspect-[4/3] sm:aspect-[16/10]"
                                                onClick={() => setFocusedIndex(idx)}
                                            >
                                                {item.type === 'image' ? (
                                                    <img
                                                        src={item.url}
                                                        alt=""
                                                        className="w-full h-full object-contain bg-black/40 group-hover:scale-103 transition-transform duration-300"
                                                    />
                                                ) : item.type === 'video' ? (
                                                    <div className="w-full h-full relative flex items-center justify-center bg-black">
                                                        <video src={item.url} muted playsInline className="w-full h-full object-contain pointer-events-none" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                                                            <div className="w-10 h-10 rounded-full bg-sparta-gold/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                                <Play size={18} className="fill-current ml-0.5" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-sparta-gold text-[9px] font-mono font-bold border border-white/10">
                                                            ▶ ВИДЕО
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-blue-500/10">
                                                        <FileText size={28} className="text-blue-400 mb-1" />
                                                        <span className="text-[10px] text-white font-bold truncate max-w-full">{item.file.name}</span>
                                                    </div>
                                                )}

                                                {/* Top Action Overlay (··· Menu + Quick Delete) */}
                                                <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                                                    {/* Context Menu Button ··· */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveActionMenuIndex(isMenuOpen ? null : idx);
                                                        }}
                                                        className="p-1.5 rounded-xl bg-black/80 hover:bg-sparta-gold hover:text-black text-white/90 backdrop-blur-md transition-all border border-white/10 active:scale-90 shadow-md"
                                                        title="Действия с фото"
                                                    >
                                                        <MoreVertical size={13} />
                                                    </button>

                                                    {/* Quick Delete Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRemoveItem(idx);
                                                        }}
                                                        className="p-1.5 rounded-xl bg-black/80 hover:bg-red-500 text-white backdrop-blur-md transition-all border border-white/10 active:scale-90 shadow-md"
                                                        title="Удалить это фото"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>

                                                {/* Dropdown Action Popover */}
                                                {isMenuOpen && (
                                                    <div
                                                        className="absolute top-10 right-2 z-30 min-w-[150px] p-1.5 rounded-2xl bg-[#16161e] border border-sparta-gold/40 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => triggerReplace(idx)}
                                                            className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-white hover:bg-sparta-gold hover:text-black transition-colors flex items-center gap-2"
                                                        >
                                                            <RefreshCw size={12} />
                                                            <span>Заменить фото</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFocusedIndex(idx);
                                                                setActiveActionMenuIndex(null);
                                                            }}
                                                            className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                                        >
                                                            <Maximize2 size={12} />
                                                            <span>Во весь экран</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onRemoveItem(idx);
                                                                setActiveActionMenuIndex(null);
                                                            }}
                                                            className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                                                        >
                                                            <Trash2 size={12} />
                                                            <span>Удалить</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Minimalist Unified Action Bar (Category + Caption + Send in 1 Clean Row) */}
                    <div className="p-3 sm:p-4 bg-[#121218] border-t border-white/10 shrink-0">
                        {/* Category Dropdown Menu */}
                        {isCategoryMenuOpen && (
                            <div className="mb-2.5 p-2 rounded-2xl bg-[#16161e] border border-sparta-gold/30 shadow-2xl flex flex-wrap gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                                {MEDIA_CATEGORIES.map((cat) => {
                                    const isSelected = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCategory(cat.id);
                                                setIsCategoryMenuOpen(false);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                isSelected
                                                    ? 'bg-sparta-gold text-black font-black shadow-md'
                                                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <span>{cat.label}</span>
                                            {isSelected && <Check size={12} className="stroke-[3]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-[#08080b] border border-white/15 focus-within:border-sparta-gold/80 rounded-2xl p-1.5 sm:p-2 transition-colors shadow-inner">
                            {/* Category Selector Badge inside input bar */}
                            <button
                                type="button"
                                onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-sparta-gold border border-white/10 hover:border-sparta-gold/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 transition-all active:scale-95"
                                title="Выбрать категорию"
                            >
                                <span>{currentCategoryObj.label}</span>
                                <ChevronDown size={12} className={`transition-transform ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Caption Text Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Добавьте подпись к фото..."
                                className="flex-1 bg-transparent px-2 py-1.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none min-w-0"
                            />

                            {/* Gold Send Button */}
                            <button
                                type="button"
                                disabled={isExceedingLimit}
                                onClick={handleSendClick}
                                className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-black font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-lg shadow-sparta-gold/30 hover:scale-102 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                                title="Отправить в чат (Enter)"
                            >
                                <span>Отправить</span>
                                <Send size={14} className="stroke-[2.5]" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};
