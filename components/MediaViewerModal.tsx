import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Maximize2, ZoomIn, ZoomOut, Minimize2 } from 'lucide-react';

interface MediaViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: { url: string; type: 'image' | 'video' | 'file'; name: string }[];
    initialIndex: number;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ isOpen, onClose, items, initialIndex }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Filter only images and videos for the gallery
    const galleryItems = items.filter(item => item.type === 'image' || item.type === 'video');
    const realIndex = galleryItems.findIndex(item => item.url === items[currentIndex]?.url);
    const activeIndex = realIndex !== -1 ? realIndex : 0;

    const handleNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        setScale(1); // Reset zoom on change
        setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
    }, [galleryItems.length]);

    const handlePrev = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        setScale(1); // Reset zoom on change
        setCurrentIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
    }, [galleryItems.length]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext(e);
            if (e.key === 'ArrowLeft') handlePrev(e);
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNext, handlePrev, onClose]);

    const toggleZoom = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => prev === 1 ? 2.5 : 1);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const currentItem = galleryItems[activeIndex];

    return (
        <AnimatePresence>
            {isOpen && currentItem && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
                    />

                    {/* UI Controls - Top Header */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
                    >
                        <div className="pointer-events-auto flex items-center gap-4">
                            <h3 className="text-white font-russo text-sm uppercase tracking-widest opacity-80 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                {activeIndex + 1} <span className="text-sparta-gold mx-1">/</span> {galleryItems.length}
                            </h3>
                            <span className="text-white/40 text-xs hidden md:block font-medium bg-black/20 px-3 py-2 rounded-full border border-white/5">
                                {currentItem.name}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 pointer-events-auto">
                            {currentItem.type === 'image' && (
                                <button
                                    onClick={toggleZoom}
                                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-sparta-gold hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md"
                                    title="Масштаб"
                                >
                                    {scale > 1 ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                                </button>
                            )}
                            <button
                                onClick={toggleFullscreen}
                                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-sparta-gold hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md"
                                title="Полный экран"
                            >
                                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                            </button>
                            <a
                                href={currentItem.url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md"
                                title="Скачать"
                            >
                                <Download size={20} />
                            </a>
                            <button
                                onClick={onClose}
                                className="w-12 h-12 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sparta-gold hover:bg-sparta-gold hover:text-black transition-all border border-sparta-gold/30 shadow-[0_0_20px_rgba(255,184,0,0.2)] backdrop-blur-md ml-2"
                                title="Закрыть (Esc)"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </motion.div>

                    {/* Main Content Area */}
                    <div className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none">
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={currentItem.url}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="relative w-full h-full flex items-center justify-center p-4 md:p-12 pointer-events-auto"
                            >
                                {currentItem.type === 'image' ? (
                                    <motion.img
                                        src={currentItem.url}
                                        alt={currentItem.name}
                                        className="max-w-full max-h-full object-contain shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-lg cursor-grab active:cursor-grabbing"
                                        animate={{ scale }}
                                        drag={scale > 1}
                                        dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                                        dragElastic={0.1}
                                        onDoubleClick={toggleZoom}
                                    />
                                ) : (
                                    <video
                                        src={currentItem.url}
                                        controls
                                        autoPlay
                                        className="max-w-full max-h-full rounded-lg shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation Buttons (Desktop Only) */}
                    {galleryItems.length > 1 && (
                        <div className="hidden md:block">
                            <button
                                onClick={handlePrev}
                                className="absolute left-8 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black/20 hover:bg-sparta-gold flex items-center justify-center text-white/40 hover:text-black transition-all z-50 border border-white/5 hover:border-sparta-gold shadow-2xl backdrop-blur-md group"
                            >
                                <ChevronLeft size={40} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-8 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black/20 hover:bg-sparta-gold flex items-center justify-center text-white/40 hover:text-black transition-all z-50 border border-white/5 hover:border-sparta-gold shadow-2xl backdrop-blur-md group"
                            >
                                <ChevronRight size={40} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* Navigation Strip - Thumbnails */}
                    {galleryItems.length > 1 && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 max-w-[90vw] overflow-x-auto scrollbar-hide z-50 shadow-2xl"
                        >
                            {galleryItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setScale(1); setCurrentIndex(idx); }}
                                    className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all shrink-0 relative group ${activeIndex === idx ? 'border-sparta-gold scale-110 shadow-[0_0_15px_rgba(255,184,0,0.4)]' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'
                                        }`}
                                >
                                    {item.type === 'image' ? (
                                        <img src={item.url} className="w-full h-full object-cover" alt="thumb" />
                                    ) : (
                                        <div className="w-full h-full bg-[#111] flex items-center justify-center">
                                            <Maximize2 size={16} className="text-sparta-gold" />
                                        </div>
                                    )}
                                    <div className={`absolute inset-0 bg-sparta-gold/20 transition-opacity ${activeIndex === idx ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                            ))}
                        </motion.div>
                    )}
                </div>
            )}
        </AnimatePresence>
    );
};

export default MediaViewerModal;