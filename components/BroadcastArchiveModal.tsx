import React from 'react';
import { X, Clock } from 'lucide-react';
import { Broadcast } from '../types/broadcast';
import BroadcastChat from './BroadcastChat';
import { BaseModal } from './ui/BaseModal';

interface BroadcastArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    broadcast: Broadcast | null;
}

const BroadcastArchiveModal: React.FC<BroadcastArchiveModalProps> = ({ isOpen, onClose, broadcast }) => {
    if (!broadcast) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-6xl"
            showCloseButton={false}
            noPadding
            glowColor="amber"
            zIndex="z-[100]"
        >
            <div className="relative w-full bg-[#0F0F0F] rounded-3xl overflow-hidden flex flex-col font-manrope max-h-[88vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-[#141414] shrink-0">
                    <div className="flex items-center gap-3">
                        <Clock className="text-sparta-gold" size={24} />
                        <h2 className="text-xl md:text-2xl font-russo text-white uppercase tracking-wider line-clamp-1">{broadcast.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {/* Video Column */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="w-full relative pt-[56.25%] bg-black rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.7)] border border-white/10">
                                {broadcast.videoUrl?.startsWith('blob:') || broadcast.videoUrl?.endsWith('.mp4') || broadcast.videoUrl?.endsWith('.webm') ? (
                                    <video
                                        src={broadcast.videoUrl}
                                        controls
                                        autoPlay
                                        className="absolute top-0 left-0 w-full h-full object-contain"
                                    />
                                ) : (
                                    <iframe
                                        src={broadcast.videoUrl}
                                        className="absolute top-0 left-0 w-full h-full border-0"
                                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                        allowFullScreen
                                        title={broadcast.title}
                                    />
                                )}
                            </div>
                            <div className="text-white/80 text-base md:text-lg leading-relaxed bg-[#141414] p-6 rounded-xl border border-white/5">
                                <h3 className="text-xl font-bold text-white mb-2">Описание видео</h3>
                                <p>{broadcast.description || 'Описание отсутствует.'}</p>
                            </div>
                        </div>

                        {/* Comments/Chat Column */}
                        <div className="lg:col-span-1 h-[450px] lg:h-auto min-h-[450px]">
                            <BroadcastChat broadcastId={broadcast.id} isLive={false} />
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default BroadcastArchiveModal;
