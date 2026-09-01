import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Download,
    Copy,
    Check,
    User,
    Sparkles,
    Shield,
    Dumbbell,
    Code,
    BadgeCheck,
    CornerUpLeft,
    Share2,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SpartaPreviewPlayer } from './SpartaPreviewPlayer';

const VerificationBadge = ({ role, verification }: { role?: string, verification?: any }) => {
    if (!verification?.isVerified && !['admin', 'trainer', 'coach', 'developer'].includes(role?.toLowerCase() || '')) return null;

    const getBadgeConfig = () => {
        const r = role?.toLowerCase();
        if (r === 'system') return { icon: Sparkles, color: 'text-sparta-gold', label: 'Система' };
        if (r === 'admin') return { icon: Shield, color: 'text-blue-400', label: 'Администратор' };
        if (r === 'trainer' || r === 'coach') return { icon: Dumbbell, color: 'text-green-400', label: 'Тренер' };
        if (r === 'developer') return { icon: Code, color: 'text-cyan-400', label: 'Разработчик' };
        if (verification?.isVerified) return { icon: BadgeCheck, color: 'text-blue-400', label: verification.title || 'Верифицирован' };
        return null;
    };

    const config = getBadgeConfig();
    if (!config) return null;
    const Icon = config.icon;

    return (
        <span className="inline-flex items-center ml-1 text-xs" title={config.label}>
            <Icon size={12} className={config.color} />
        </span>
    );
};

export interface GalleryMediaItem {
    id: string;
    mediaUrl: string;
    mediaType?: 'image' | 'video' | 'file';
    senderId?: string;
    senderName?: string;
    senderRole?: string;
    senderVerification?: any;
    senderAvatar?: string;
    timestamp?: any;
    text?: string;
    category?: string;
    fileName?: string;
}

export interface SpartaMediaGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialItem: GalleryMediaItem | null;
    allMediaItems?: GalleryMediaItem[];
    onReply?: (item: GalleryMediaItem) => void;
    onForward?: (item: GalleryMediaItem) => void;
    onDelete?: (itemId: string) => void;
    canDelete?: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string, color: string }> = {
    match: { label: '⚽ Матч', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    training: { label: '🏋️ Тренировка', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    tournament: { label: '🏆 Турнир', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    doc: { label: '📄 Документ', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    general: { label: '💬 Медиа', color: 'bg-white/10 text-white/70 border-white/20' }
};

export const SpartaMediaGalleryModal: React.FC<SpartaMediaGalleryModalProps> = ({
    isOpen,
    onClose,
    initialItem,
    allMediaItems = [],
    onReply,
    onForward,
    onDelete,
    canDelete = false
}) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [zoom, setZoom] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [showControls, setShowControls] = useState<boolean>(true);
    const [mounted, setMounted] = useState<boolean>(false);

    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prepare list of active media items
    const mediaList = allMediaItems.length > 0 ? allMediaItems : (initialItem ? [initialItem] : []);

    useEffect(() => {
        if (initialItem && mediaList.length > 0) {
            const idx = mediaList.findIndex(m => m.id === initialItem.id || m.mediaUrl === initialItem.mediaUrl);
            setCurrentIndex(idx >= 0 ? idx : 0);
        }
        setZoom(1);
        setRotation(0);
        setShowControls(true);
    }, [initialItem, isOpen]);

    // Auto-hide controls after inactivity
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isOpen && showControls) {
            timer = setTimeout(() => {
                setShowControls(false);
            }, 3600);
        }
        return () => clearTimeout(timer);
    }, [isOpen, showControls, currentIndex]);

    const currentMedia = mediaList[currentIndex] || initialItem;

    const handleNext = useCallback(() => {
        if (currentIndex < mediaList.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setZoom(1);
            setRotation(0);
            setShowControls(true);
        }
    }, [currentIndex, mediaList.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setZoom(1);
            setRotation(0);
            setShowControls(true);
        }
    }, [currentIndex]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === '+' || e.key === '=') {
                setZoom(z => Math.min(z + 0.5, 3));
            } else if (e.key === '-') {
                setZoom(z => Math.max(z - 0.5, 1));
            } else if (e.key === '0') {
                setZoom(1);
                setRotation(0);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNext, handlePrev, onClose]);

    if (!isOpen || !currentMedia || !mounted) return null;

    // Helper: Formatted timestamp
    const getFormattedDate = (timestamp: any) => {
        if (!timestamp) return 'Недавно';
        try {
            if (typeof timestamp.toDate === 'function') {
                return format(timestamp.toDate(), 'd MMMM, HH:mm', { locale: ru });
            }
            if (timestamp.seconds) {
                return format(new Date(timestamp.seconds * 1000), 'd MMMM, HH:mm', { locale: ru });
            }
            if (timestamp instanceof Date) {
                return format(timestamp, 'd MMMM, HH:mm', { locale: ru });
            }
            if (typeof timestamp === 'number') {
                return format(new Date(timestamp), 'd MMMM, HH:mm', { locale: ru });
            }
        } catch (e) {
            return 'Недавно';
        }
        return 'Недавно';
    };

    // Download action
    const handleDownload = async () => {
        if (!currentMedia.mediaUrl || isDownloading) return;
        setIsDownloading(true);
        try {
            const res = await fetch(currentMedia.mediaUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = currentMedia.fileName || `sparta_media_${Date.now()}.${currentMedia.mediaType === 'video' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            window.open(currentMedia.mediaUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    // Copy action: copies real image binary (PNG) to clipboard
    const handleCopy = async () => {
        if (!currentMedia.mediaUrl) return;

        if (currentMedia.mediaType === 'video') {
            // For video, copy URL
            try {
                await navigator.clipboard.writeText(currentMedia.mediaUrl);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy video url:", err);
            }
            return;
        }

        // For images: convert to PNG binary blob for full clipboard support (Telegram, Discord, Photoshop, etc.)
        try {
            // Method 1: Fetch -> ImageBitmap -> Canvas -> PNG Blob
            let pngBlob: Blob | null = null;
            try {
                const response = await fetch(currentMedia.mediaUrl, { mode: 'cors' });
                if (response.ok) {
                    const originalBlob = await response.blob();
                    if (originalBlob.type === 'image/png') {
                        pngBlob = originalBlob;
                    } else if (typeof createImageBitmap === 'function') {
                        const imgBitmap = await createImageBitmap(originalBlob);
                        const canvas = document.createElement('canvas');
                        canvas.width = imgBitmap.width;
                        canvas.height = imgBitmap.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(imgBitmap, 0, 0);
                            pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                        }
                    }
                }
            } catch (fetchErr) {
                console.warn("Direct fetch blob conversion failed, falling back to Image element:", fetchErr);
            }

            // Method 2: HTML Image element fallback
            if (!pngBlob) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = currentMedia.mediaUrl;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    pngBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                }
            }

            if (pngBlob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': pngBlob })
                ]);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
                return;
            }

            // Method 3: Ultimate fallback to URL string if clipboard item binary write is blocked by browser policy
            await navigator.clipboard.writeText(currentMedia.mediaUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Binary image copy failed, copying URL fallback:", err);
            try {
                await navigator.clipboard.writeText(currentMedia.mediaUrl);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (fallbackErr) {
                console.error("All copy attempts failed:", fallbackErr);
            }
        }
    };

    // Touch gesture handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

        // Swipe down to dismiss
        if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5 && zoom === 1) {
            onClose();
        } else if (dx < -60 && Math.abs(dx) > Math.abs(dy) && zoom === 1) {
            handleNext();
        } else if (dx > 60 && Math.abs(dx) > Math.abs(dy) && zoom === 1) {
            handlePrev();
        }
        touchStartRef.current = null;
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (currentMedia.mediaType === 'video') return;
        e.stopPropagation();
        if (e.deltaY < 0) {
            setZoom(z => Math.min(z + 0.2, 3));
        } else {
            setZoom(z => Math.max(z - 0.2, 1));
        }
    };

    const categoryBadge = currentMedia.category ? (CATEGORY_LABELS[currentMedia.category] || CATEGORY_LABELS.general) : null;

    const modalContent = (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[350] flex flex-col bg-black/95 sm:backdrop-blur-3xl select-none overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseMove={() => setShowControls(true)}
                onClick={() => setShowControls(prev => !prev)}
            >
                {/* Ergonomic Centered Top Bar (Right Above the Media) */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-3 sm:top-4 inset-x-0 mx-auto max-w-xl px-3 sm:px-4 z-40 pointer-events-none"
                        >
                            {/* Single Unified Floating Island Bar */}
                            <div
                                className="pointer-events-auto bg-[#121218]/90 backdrop-blur-2xl border border-white/15 rounded-2xl px-3 py-1.5 sm:py-2 flex items-center justify-between gap-3 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Left: Author & Counter */}
                                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center">
                                        {currentMedia.senderAvatar ? (
                                            <img src={currentMedia.senderAvatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={13} className="text-white/60" />
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                            <p className="text-[11px] sm:text-xs font-black font-russo uppercase text-white truncate max-w-[110px] sm:max-w-[150px]">
                                                {currentMedia.senderName || 'Спарта'}
                                            </p>
                                            <VerificationBadge
                                                role={currentMedia.senderRole}
                                                verification={currentMedia.senderVerification}
                                            />
                                        </div>
                                        <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider flex items-center gap-1">
                                            <span>{getFormattedDate(currentMedia.timestamp)}</span>
                                            {mediaList.length > 1 && (
                                                <span className="text-sparta-gold font-mono font-bold">
                                                    • {currentIndex + 1}/{mediaList.length}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Contextual Toolbar */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {categoryBadge && (
                                        <span className={`hidden md:inline-flex px-2 py-0.5 rounded-lg text-[9px] font-bold border ${categoryBadge.color} mr-0.5`}>
                                            {categoryBadge.label}
                                        </span>
                                    )}

                                    {/* Image Zoom Controls */}
                                    {currentMedia.mediaType !== 'video' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setZoom(z => (z > 1 ? 1 : 2))}
                                                className={`p-1.5 rounded-xl transition-all ${
                                                    zoom > 1
                                                        ? 'bg-sparta-gold text-black font-bold'
                                                        : 'hover:bg-white/10 text-white/70 hover:text-white'
                                                }`}
                                                title={zoom > 1 ? 'Сбросить зум' : 'Приблизить 2x'}
                                            >
                                                {zoom > 1 ? <ZoomOut size={15} /> : <ZoomIn size={15} />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setRotation(r => (r + 90) % 360)}
                                                className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                                                title="Повернуть на 90°"
                                            >
                                                <RotateCw size={15} />
                                            </button>
                                        </>
                                    )}

                                    {/* Copy Link / Image */}
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                                        title="Скопировать"
                                    >
                                        {isCopied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                                    </button>

                                    {/* Download Button */}
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        disabled={isDownloading}
                                        className="p-1.5 rounded-xl hover:bg-sparta-gold hover:text-black text-white/80 transition-all active:scale-95"
                                        title="Скачать оригинал"
                                    >
                                        <Download size={15} />
                                    </button>

                                    <div className="w-[1px] h-3.5 bg-white/15 mx-0.5" />

                                    {/* Close Button */}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-1.5 rounded-xl hover:bg-red-500 text-white/80 hover:text-white transition-all active:scale-90"
                                        title="Закрыть (Esc)"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Media Canvas (Ergonomic Centered Container) */}
                <div
                    className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-6"
                    onWheel={handleWheel}
                >
                    {/* Media Item & Close-proximity Navigation */}
                    <div
                        className="relative w-full h-full max-h-[80vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Floating Prev Button (Closer to the Media) */}
                        {currentIndex > 0 && showControls && (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrev();
                                }}
                                className="absolute left-2 sm:left-4 lg:left-8 z-30 p-2.5 sm:p-3 rounded-full bg-[#121218]/85 hover:bg-sparta-gold text-white hover:text-black transition-all border border-white/15 backdrop-blur-2xl shadow-2xl active:scale-95"
                                title="Предыдущее (←)"
                            >
                                <ChevronLeft size={20} />
                            </motion.button>
                        )}

                        {currentMedia.mediaType === 'video' ? (
                            <SpartaPreviewPlayer
                                key={currentMedia.mediaUrl}
                                src={currentMedia.mediaUrl}
                                autoPlay={true}
                                className="max-w-full max-h-[80vh]"
                            />
                        ) : (
                            <motion.img
                                key={currentMedia.mediaUrl}
                                src={currentMedia.mediaUrl}
                                alt=""
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{
                                    opacity: 1,
                                    scale: zoom,
                                    rotate: rotation
                                }}
                                transition={{ duration: 0.2 }}
                                drag={zoom > 1}
                                dragConstraints={{ top: -300, bottom: 300, left: -400, right: 400 }}
                                onDoubleClick={() => setZoom(z => (z > 1 ? 1 : 2))}
                                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl transition-transform cursor-grab active:cursor-grabbing"
                            />
                        )}

                        {/* Floating Next Button (Closer to the Media) */}
                        {currentIndex < mediaList.length - 1 && showControls && (
                            <motion.button
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                                className="absolute right-2 sm:right-4 lg:right-8 z-30 p-2.5 sm:p-3 rounded-full bg-[#121218]/85 hover:bg-sparta-gold text-white hover:text-black transition-all border border-white/15 backdrop-blur-2xl shadow-2xl active:scale-95"
                                title="Следующее (→)"
                            >
                                <ChevronRight size={20} />
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Ergonomic Centered Bottom Action Island (Right Below the Media) */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-3 sm:bottom-4 inset-x-0 mx-auto max-w-xl px-3 sm:px-4 z-40 pointer-events-none"
                        >
                            <div
                                className="pointer-events-auto bg-[#121218]/90 backdrop-blur-2xl border border-white/15 rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Caption text if exists */}
                                {currentMedia.text ? (
                                    <p className="text-xs text-white/90 font-medium px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 flex-1 truncate">
                                        {currentMedia.text}
                                    </p>
                                ) : (
                                    <span className="text-[10px] text-white/40 font-mono font-bold uppercase tracking-wider px-2">
                                        Медиафайл Sparta
                                    </span>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {onReply && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onReply(currentMedia);
                                                onClose();
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-sparta-gold hover:text-black text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                        >
                                            <CornerUpLeft size={13} />
                                            <span>Ответить</span>
                                        </button>
                                    )}

                                    {onForward && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onForward(currentMedia);
                                                onClose();
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                        >
                                            <Share2 size={13} />
                                            <span className="hidden sm:inline">Переслать</span>
                                        </button>
                                    )}

                                    {canDelete && onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onDelete(currentMedia.id);
                                                onClose();
                                            }}
                                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all active:scale-95"
                                            title="Удалить медиа"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default SpartaMediaGalleryModal;

