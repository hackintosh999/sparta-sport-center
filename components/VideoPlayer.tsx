import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, AlertCircle, Loader2 } from 'lucide-react';
import { getMediaFromLocalDB } from '../utils/mediaStorage';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    autoPlay?: boolean;
    className?: string;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, autoPlay = false, className = '' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [resolvedSrc, setResolvedSrc] = useState<string>('');
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Resolve IndexedDB or regular URL
    useEffect(() => {
        let isMounted = true;
        setHasError(false);
        setIsLoading(true);

        if (!src) {
            setResolvedSrc('');
            setIsLoading(false);
            return;
        }

        if (src.startsWith('idb:')) {
            getMediaFromLocalDB(src).then((blob) => {
                if (!isMounted) return;
                if (blob) {
                    const objectUrl = URL.createObjectURL(blob);
                    setResolvedSrc(objectUrl);
                } else {
                    setHasError(true);
                    setIsLoading(false);
                }
            });
        } else {
            setResolvedSrc(src);
        }

        return () => {
            isMounted = false;
        };
    }, [src]);

    // Initial AutoPlay
    useEffect(() => {
        if (autoPlay && videoRef.current && resolvedSrc) {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
                setIsLoading(false);
            }).catch(() => {
                // Autoplay prevented by browser
                setIsPlaying(false);
                setIsLoading(false);
            });
        }
    }, [resolvedSrc, autoPlay]);

    // Handle Time Update
    const onTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const dur = videoRef.current.duration;
            setCurrentTime(current);
            if (dur && !isNaN(dur)) {
                setDuration(dur);
                setProgress((current / dur) * 100);
            }
        }
    };

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().then(() => {
                setIsPlaying(true);
                setHasError(false);
            }).catch((err) => {
                if (err.name !== 'AbortError') {
                    console.warn('Video play error:', err);
                }
                setIsPlaying(false);
            });
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Sync fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-hide timer logic
    const resetControlsTimeout = () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    useEffect(() => {
        if (!isPlaying) {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
            resetControlsTimeout();
        }
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying]);

    // Show/Hide Controls on Mouse Move
    const handleMouseMove = () => {
        setShowControls(true);
        resetControlsTimeout();
    };

    // Single Tap on Video: toggle controls if playing, or togglePlay if paused
    const handleVideoTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isPlaying) {
            togglePlay();
            return;
        }
        setShowControls(prev => {
            const nextState = !prev;
            if (nextState) {
                resetControlsTimeout();
            } else if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            return nextState;
        });
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
        const rutubeMatch = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/);
        if (rutubeMatch) return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
        if (url.includes('vk.com/video_ext.php')) return url;
        return null;
    };

    const embedUrl = getEmbedUrl(src);
    const isShorts = src && (src.includes('shorts') || src.includes('tiktok') || src.includes('reels'));

    if (embedUrl) {
        return (
            <div className={`relative rounded-2xl overflow-hidden bg-black flex items-center justify-center ${isShorts ? 'aspect-[9/16] max-h-[75vh]' : 'aspect-video w-full'} ${className}`}>
                <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative group rounded-2xl overflow-hidden bg-black select-none flex items-center justify-center w-full h-full max-h-full ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                if (isPlaying) {
                    setShowControls(false);
                    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                }
            }}
            onClick={handleVideoTap}
        >
            {/* 3D Border Effects */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/10 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] z-20" />
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-yellow-500/20 opacity-50 z-20 mix-blend-overlay" />

            <video
                ref={videoRef}
                src={resolvedSrc || undefined}
                poster={poster}
                className="w-full h-full max-h-full max-w-full object-contain cursor-pointer"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v) {
                        setDuration(v.duration || 0);
                        setIsLoading(false);
                        setHasError(false);
                    }
                }}
                onCanPlay={() => {
                    setIsLoading(false);
                    setHasError(false);
                }}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => {
                    setIsLoading(false);
                    setIsPlaying(true);
                    setHasError(false);
                }}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                    console.warn("Video failed to load source:", src);
                    setHasError(true);
                    setIsLoading(false);
                    setIsPlaying(false);
                }}
                playsInline
                preload="metadata"
            />

            {/* Error Fallback */}
            {hasError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#0d0d0d]/95 backdrop-blur-md rounded-2xl border border-yellow-500/20">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-3 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                        <AlertCircle size={28} />
                    </div>
                    <p className="text-white text-sm font-bold mb-1">Видеофайл недоступен</p>
                    <p className="text-gray-400 text-xs max-w-xs mb-3 font-normal">
                        Ссылка на видео устарела или формат не поддерживается браузером.
                    </p>
                    {src && src.startsWith('http') && (
                        <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-bold transition-all shadow-md"
                        >
                            Открыть ссылку напрямую
                        </a>
                    )}
                </div>
            )}

            {/* Loading Spinner */}
            {isLoading && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 pointer-events-none">
                    <Loader2 size={36} className="text-yellow-400 animate-spin" />
                </div>
            )}

            {/* Big Play Button Overlay */}
            <AnimatePresence>
                {!isPlaying && !isLoading && !hasError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-[2px]"
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 text-black flex items-center justify-center shadow-[0_0_35px_rgba(234,179,8,0.5)] cursor-pointer"
                        >
                            <Play fill="currentColor" size={28} className="ml-1" />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls Bar */}
            <AnimatePresence>
                {showControls && !hasError && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Progress Bar */}
                        <div
                            className="relative h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group/progress overflow-hidden"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pos = (e.clientX - rect.left) / rect.width;
                                if (videoRef.current && videoRef.current.duration) {
                                    videoRef.current.currentTime = pos * videoRef.current.duration;
                                }
                            }}
                        >
                            <div
                                className="absolute top-0 left-0 bottom-0 bg-yellow-400 rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                                style={{ width: `${progress}%` }}
                            />
                            <div className="absolute top-0 left-0 bottom-0 w-full hover:bg-white/10 transition-colors" />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                                <button
                                    onClick={togglePlay}
                                    className="text-white hover:text-yellow-400 transition-colors cursor-pointer"
                                >
                                    {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                                </button>

                                <div className="text-[11px] font-mono text-gray-300">
                                    <span>{formatTime(currentTime)}</span>
                                    <span className="text-gray-500 mx-1">/</span>
                                    <span>{formatTime(duration)}</span>
                                </div>

                                <div className="flex items-center gap-2 group/vol">
                                    <button
                                        onClick={toggleMute}
                                        className="text-white/70 hover:text-white transition-colors cursor-pointer"
                                    >
                                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setVolume(val);
                                            if (videoRef.current) videoRef.current.volume = val;
                                            setIsMuted(val === 0);
                                        }}
                                        className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300 accent-yellow-400 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={toggleFullscreen}
                                className="text-white/70 hover:text-white transition-colors cursor-pointer"
                            >
                                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VideoPlayer;

