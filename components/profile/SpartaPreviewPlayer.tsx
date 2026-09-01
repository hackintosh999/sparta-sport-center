import React, { useRef, useState, useEffect } from 'react';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    RotateCcw,
    RotateCw,
    Repeat,
    Maximize,
    Minimize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpartaPreviewPlayerProps {
    src: string;
    className?: string;
    autoPlay?: boolean;
}

export const SpartaPreviewPlayer: React.FC<SpartaPreviewPlayerProps> = ({
    src,
    className = '',
    autoPlay = false
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressTrackRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [rippleDirection, setRippleDirection] = useState<'left' | 'right' | null>(null);

    // Track document fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-hide controls after delay when playing
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && showControls) {
            timer = setTimeout(() => setShowControls(false), 2600);
        }
        return () => clearTimeout(timer);
    }, [isPlaying, showControls]);

    // Format seconds to mm:ss
    const formatTime = (sec: number) => {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Metadata loaded
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
        }
    };

    // Time update
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const cur = videoRef.current.currentTime;
            const dur = videoRef.current.duration || duration;
            setCurrentTime(cur);
            setProgress(dur > 0 ? (cur / dur) * 100 : 0);
        }
    };

    // Toggle Play
    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
            setShowControls(true);
        } else {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch(console.error);
        }
    };

    // Toggle Mute
    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    // Toggle Loop
    const toggleLoop = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.loop = !isLooping;
        setIsLooping(!isLooping);
    };

    // Toggle Fullscreen Mode
    const toggleFullscreen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(console.error);
        } else {
            document.exitFullscreen?.().catch(console.error);
        }
    };

    // Skip time (+/- 5s)
    const skipTime = (seconds: number, direction: 'left' | 'right') => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
        setRippleDirection(direction);
        setTimeout(() => setRippleDirection(null), 600);
        setShowControls(true);
    };

    // Progress Bar Scrubbing
    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!progressTrackRef.current || !videoRef.current || duration === 0) return;
        const rect = progressTrackRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const fraction = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = fraction * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setProgress(fraction * 100);
    };

    return (
        <div
            ref={containerRef}
            className={`relative group rounded-2xl overflow-hidden bg-black flex items-center justify-center select-none shadow-2xl transition-all ${className}`}
            style={{
                maxHeight: isFullscreen ? '100vh' : '58vh',
                width: '100%',
                height: '100%'
            }}
            onMouseMove={() => setShowControls(true)}
            onTouchStart={() => setShowControls(true)}
            onClick={() => setShowControls(prev => !prev)}
        >
            {/* HTML5 Video Element (Always naturally adapted) */}
            <video
                ref={videoRef}
                src={src}
                playsInline
                loop={isLooping}
                muted={isMuted}
                autoPlay={autoPlay}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className={`w-full h-full ${isFullscreen ? 'max-h-screen object-contain' : 'max-h-[58vh] sm:max-h-[52vh] object-contain'} transition-all duration-200`}
            />

            {/* Tap-to-Rewind Zone (Left Double Click) */}
            <div
                className="absolute inset-y-0 left-0 w-1/3 z-10"
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    skipTime(-5, 'left');
                }}
            />

            {/* Tap-to-FastForward Zone (Right Double Click) */}
            <div
                className="absolute inset-y-0 right-0 w-1/3 z-10"
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    skipTime(5, 'right');
                }}
            />

            {/* Rewind / Fast-Forward Visual Ripple Animation */}
            <AnimatePresence>
                {rippleDirection === 'left' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="absolute left-8 z-30 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/70 border border-sparta-gold/40 text-sparta-gold backdrop-blur-md pointer-events-none"
                    >
                        <RotateCcw size={24} />
                        <span className="text-[10px] font-black mt-1 font-mono">-5 сек</span>
                    </motion.div>
                )}
                {rippleDirection === 'right' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="absolute right-8 z-30 flex flex-col items-center justify-center p-3 rounded-2xl bg-black/70 border border-sparta-gold/40 text-sparta-gold backdrop-blur-md pointer-events-none"
                    >
                        <RotateCw size={24} />
                        <span className="text-[10px] font-black mt-1 font-mono">+5 сек</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Central Play/Pause Watermark Button (shown when paused or hovered) */}
            <AnimatePresence>
                {(!isPlaying || showControls) && (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={togglePlay}
                        className={`absolute z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_rgba(234,179,8,0.4)] ${
                            isPlaying
                                ? 'bg-black/60 text-white/80 hover:bg-sparta-gold hover:text-black border border-white/20'
                                : 'bg-gradient-to-tr from-sparta-gold to-yellow-400 text-black scale-105 hover:scale-110'
                        }`}
                        title={isPlaying ? 'Пауза' : 'Воспроизвести'}
                    >
                        {isPlaying ? (
                            <Pause size={24} className="stroke-[2.5]" />
                        ) : (
                            <Play size={26} className="fill-current ml-1" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom Signature Sparta Controls Bar */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-0 inset-x-0 z-20 p-2.5 sm:p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-sm flex flex-col gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Interactive Scrubber Track */}
                        <div
                            ref={progressTrackRef}
                            onClick={handleScrub}
                            className="relative w-full h-2 rounded-full bg-white/20 hover:h-2.5 transition-all cursor-pointer group/scrub flex items-center"
                        >
                            {/* Loaded/Buffered Bar */}
                            <div
                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sparta-gold via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                                style={{ width: `${progress}%` }}
                            />
                            {/* Scrubber Knob */}
                            <div
                                className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-sparta-gold transition-transform -translate-x-1/2 scale-0 group-hover/scrub:scale-100"
                                style={{ left: `${progress}%` }}
                            />
                        </div>

                        {/* Controls Line */}
                        <div className="flex items-center justify-between text-white text-xs pt-0.5">
                            {/* Left Controls: Play + Skip + Time */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    className="p-1 rounded-lg hover:bg-white/10 text-sparta-gold transition-colors"
                                    title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                                >
                                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        skipTime(-5, 'left');
                                    }}
                                    className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                    title="Назад на 5 сек"
                                >
                                    <RotateCcw size={14} />
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        skipTime(5, 'right');
                                    }}
                                    className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                    title="Вперед на 5 сек"
                                >
                                    <RotateCw size={14} />
                                </button>

                                {/* Time Display */}
                                <div className="text-[11px] font-mono text-white/80 tracking-tight font-bold pl-1">
                                    <span className="text-sparta-gold">{formatTime(currentTime)}</span>
                                    <span className="text-white/40 mx-1">/</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Right Controls: Loop + Mute + Fullscreen */}
                            <div className="flex items-center gap-1.5">
                                {/* Loop Toggle */}
                                <button
                                    type="button"
                                    onClick={toggleLoop}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                        isLooping
                                            ? 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/40'
                                            : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                                    }`}
                                    title={isLooping ? 'Зацикливание включено' : 'Зацикливание выключено'}
                                >
                                    <Repeat size={13} />
                                </button>

                                {/* Mute Button */}
                                <button
                                    type="button"
                                    onClick={toggleMute}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                        isMuted
                                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                            : 'bg-white/5 text-white/80 border-white/10 hover:text-white'
                                    }`}
                                    title={isMuted ? 'Включить звук' : 'Выключить звук'}
                                >
                                    {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                                </button>

                                {/* Fullscreen Toggle */}
                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-sparta-gold hover:text-black text-white/80 border border-white/10 transition-colors"
                                    title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
                                >
                                    {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
