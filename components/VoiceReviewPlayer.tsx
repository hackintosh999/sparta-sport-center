import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Volume2 } from 'lucide-react';
import { getMediaFromLocalDB } from '../utils/mediaStorage';

interface VoiceReviewPlayerProps {
    src: string;
    authorName?: string;
    className?: string;
}

// Pre-computed visual waveform pattern for consistent aesthetic
const DEFAULT_WAVE_BARS = [
    25, 45, 70, 35, 60, 90, 50, 75, 40, 85,
    65, 95, 45, 80, 55, 30, 70, 90, 60, 40,
    75, 50, 85, 65, 40, 55, 30, 20
];

const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0 || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const VoiceReviewPlayer: React.FC<VoiceReviewPlayerProps> = ({ src, authorName, className = '' }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [resolvedSrc, setResolvedSrc] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);

    // Resolve IndexedDB or regular URL
    useEffect(() => {
        let isMounted = true;
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
                    setResolvedSrc(URL.createObjectURL(blob));
                } else {
                    console.warn("Local IndexedDB audio is not found on this client/browser:", src);
                }
                setIsLoading(false);
            });
        } else {
            setResolvedSrc(src);
            setIsLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [src]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || !resolvedSrc) return;

        if (audioRef.current.paused) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setIsPlaying(true);
                }).catch((err) => {
                    console.warn('Audio playback error:', err);
                    setIsPlaying(false);
                });
            }
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const cyclePlaybackRate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        const rates = [1, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        audioRef.current.playbackRate = nextRate;
        setPlaybackRate(nextRate);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = ratio * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`p-3 bg-gradient-to-r from-[#141414] via-[#171612] to-[#121212] rounded-2xl border border-yellow-500/30 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${className}`}
        >
            <audio
                ref={audioRef}
                src={resolvedSrc || undefined}
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime || 0);
                        const dur = audioRef.current.duration;
                        if (dur && isFinite(dur) && !isNaN(dur)) {
                            setDuration(dur);
                        }
                    }
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        const dur = audioRef.current.duration;
                        if (dur && isFinite(dur) && !isNaN(dur)) {
                            setDuration(dur);
                        }
                    }
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onError={() => {
                    console.warn("Audio element error on src:", resolvedSrc);
                    setIsPlaying(false);
                }}
                preload="metadata"
            />

            {/* Play/Pause Button */}
            <button
                type="button"
                onClick={togglePlay}
                disabled={isLoading || !resolvedSrc}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 text-black flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
                {isPlaying ? (
                    <Pause size={18} fill="currentColor" />
                ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                )}
            </button>

            {/* Waveform & Info */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-gray-300 flex items-center gap-1">
                        <Mic size={12} className="text-yellow-400" />
                        <span>{!resolvedSrc && !isLoading && src.startsWith('idb:') ? 'Голосовой отзыв (старая локальная запись)' : 'Голосовой отзыв'}</span>
                    </span>
                    <span className="font-mono text-yellow-400/90 text-[10px] font-bold">
                        {isPlaying ? formatTime(currentTime) : (duration > 0 ? formatTime(duration) : '0:00')}
                    </span>
                </div>

                {/* Interactive Waveform */}
                <div
                    onClick={handleSeek}
                    className="h-6 flex items-center gap-[3px] cursor-pointer group py-1"
                    title="Нажмите для перемотки"
                >
                    {DEFAULT_WAVE_BARS.map((heightPercent, idx) => {
                        const barRatio = (idx / (DEFAULT_WAVE_BARS.length - 1)) * 100;
                        const isFilled = barRatio <= progressPercent;

                        return (
                            <div
                                key={idx}
                                style={{ height: `${heightPercent}%` }}
                                className={`flex-1 rounded-full transition-all duration-75 ${
                                    isFilled
                                        ? 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.5)]'
                                        : 'bg-white/15 group-hover:bg-white/25'
                                }`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Speed Rate Button */}
            <button
                type="button"
                onClick={cyclePlaybackRate}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                title="Скорость воспроизведения"
            >
                {playbackRate}x
            </button>
        </div>
    );
};

export default VoiceReviewPlayer;
