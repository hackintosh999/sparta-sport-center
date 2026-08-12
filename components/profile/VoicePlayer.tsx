import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FileText, Loader2 } from 'lucide-react';

export interface VoicePlayerProps {
    msgId: string;
    audioUrl: string;
    duration?: number;
    isMe?: boolean;
    playbackSpeed?: number;
    onSpeedChange?: () => void;
    onTranscribe?: (msgId: string, url: string) => Promise<void>;
    transcriptionText?: string;
    isTranscribing?: boolean;
    onPlayStart?: () => void;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
    msgId,
    audioUrl,
    duration = 0,
    isMe = false,
    playbackSpeed = 1,
    onSpeedChange,
    onTranscribe,
    transcriptionText,
    isTranscribing = false,
    onPlayStart
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Format seconds as M:SS
    const formatDuration = (secs: number) => {
        if (!secs || isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Clean up audio element on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                try {
                    audioRef.current.pause();
                } catch (e) {}
                audioRef.current = null;
            }
        };
    }, []);

    // Sync playback speed
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed]);

    const handleTogglePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!audioUrl) return;

        if (isPlaying) {
            if (audioRef.current) {
                try {
                    audioRef.current.pause();
                } catch (err) {}
            }
            setIsPlaying(false);
        } else {
            // Signal parent to stop other playback or mic recording
            if (onPlayStart) onPlayStart();

            if (!audioRef.current) {
                const audio = new Audio(audioUrl);
                audio.playbackRate = playbackSpeed;

                audio.ontimeupdate = () => {
                    setCurrentTime(audio.currentTime);
                };

                audio.onloadedmetadata = () => {
                    if (audio.duration && !isNaN(audio.duration)) {
                        setTotalDuration(Math.round(audio.duration));
                    }
                };

                audio.onended = () => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                };

                audio.onerror = (err) => {
                    console.warn('Voice player audio error:', err);
                    setIsPlaying(false);
                };

                audioRef.current = audio;
            }

            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.warn('Voice player play promise rejected:', err);
                        setIsPlaying(false);
                    });
            } else {
                setIsPlaying(true);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        setCurrentTime(val);
        if (audioRef.current) {
            audioRef.current.currentTime = val;
        }
    };

    const handleTranscribeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onTranscribe) {
            onTranscribe(msgId, audioUrl);
        }
    };

    const handleSpeedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSpeedChange) {
            onSpeedChange();
        }
    };

    const progressPercent =
        totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

    return (
        <div className={`flex flex-col gap-2 p-1 min-w-[220px] ${isMe ? 'text-black' : 'text-white'}`}>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleTogglePlay}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isMe
                            ? 'bg-black text-sparta-gold hover:bg-black/80'
                            : 'bg-sparta-gold text-black hover:bg-sparta-gold/80'
                    }`}
                >
                    {isPlaying ? (
                        <Pause size={18} fill="currentColor" />
                    ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                </button>

                <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                    <div className="relative w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-100 ${
                                isMe ? 'bg-black' : 'bg-sparta-gold'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-[9px] opacity-60 font-mono">
                        <span>{formatDuration(currentTime)}</span>
                        <span>{formatDuration(totalDuration)}</span>
                    </div>
                </div>

                {onSpeedChange && (
                    <button
                        type="button"
                        onClick={handleSpeedClick}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded border transition-all ${
                            isMe
                                ? 'border-black/20 text-black hover:bg-black/10'
                                : 'border-white/20 text-white hover:bg-white/10'
                        }`}
                    >
                        {playbackSpeed}x
                    </button>
                )}

                {onTranscribe && (
                    <button
                        type="button"
                        onClick={handleTranscribeClick}
                        disabled={isTranscribing}
                        className={`p-1.5 rounded transition-all ${
                            isMe
                                ? 'text-black/60 hover:text-black hover:bg-black/10'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                        title="Расшифровать текст"
                    >
                        {isTranscribing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <FileText size={14} />
                        )}
                    </button>
                )}
            </div>

            {transcriptionText && (
                <div
                    className={`mt-1 p-2 rounded-xl text-[10px] leading-relaxed italic border ${
                        isMe
                            ? 'bg-black/5 border-black/10 text-black/80'
                            : 'bg-white/5 border-white/10 text-white/80'
                    }`}
                >
                    💬 «{transcriptionText}»
                </div>
            )}
        </div>
    );
};
