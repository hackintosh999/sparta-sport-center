import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, PlayCircle } from 'lucide-react';
import { Broadcast } from '../types/broadcast';
import BroadcastChat from './BroadcastChat';

interface BroadcastArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    broadcast: Broadcast | null;
}

const BroadcastArchiveModal: React.FC<BroadcastArchiveModalProps> = ({ isOpen, onClose, broadcast }) => {
    // Prevent scroll on body when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!broadcast) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 font-manrope">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-[1600px] max-h-full bg-[#0F0F0F] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-[#141414]">
                            <div className="flex items-center gap-3">
                                <Clock className="text-sparta-gold" size={24} />
                                <h2 className="text-xl md:text-2xl font-russo text-white uppercase tracking-wider line-clamp-1">{broadcast.title}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 h-full">
                                {/* Video Column */}
                                <div className="lg:col-span-2 flex flex-col gap-6">
                                    <div className="w-full relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/5">
                                        <iframe
                                            src={broadcast.videoUrl}
                                            className="absolute top-0 left-0 w-full h-full"
                                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                            allowFullScreen
                                            frameBorder="0"
                                            title={broadcast.title}
                                        />
                                    </div>
                                    <div className="text-white/80 text-base md:text-lg leading-relaxed bg-[#141414] p-6 rounded-xl border border-white/5">
                                        <h3 className="text-xl font-bold text-white mb-2">Описание видео</h3>
                                        <p>{broadcast.description || 'Описание отсутствует.'}</p>
                                    </div>
                                </div>

                                {/* Comments/Chat Column */}
                                <div className="lg:col-span-1 h-[500px] lg:h-auto min-h-[500px]">
                                    <BroadcastChat broadcastId={broadcast.id} isLive={false} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BroadcastArchiveModal;
