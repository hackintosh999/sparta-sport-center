import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, AlertCircle, Volume2, FileText, Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { formatAudioDuration } from '../../hooks/useAudioRecorder';

export interface SpartaAudioPlayerProps {
    url: string;
    duration?: number;
    name?: string;
    isUser?: boolean;
    variant?: 'dark' | 'gold';
    className?: string;
    transcription?: string;
    onTranscribe?: () => Promise<string | null>;
    onSaveTranscription?: (text: string) => Promise<void>;
}

// Global audio singleton: ensures only one audio plays at any time
let globalActiveAudio: HTMLAudioElement | null = null;

// Simulated waveform heights for realistic messenger look (28 bars)
const WAVEFORM_BARS = [
    28, 45, 70, 52, 35, 80, 95, 60, 42, 88,
    75, 50, 65, 90, 40, 30, 70, 85, 55, 38,
    72, 90, 60, 45, 80, 50, 35, 60
];

export const SpartaAudioPlayer: React.FC<SpartaAudioPlayerProps> = ({
    url,
    duration: propDuration,
    name,
    isUser = false,
    variant,
    className = '',
    transcription: propTranscription,
    onTranscribe,
    onSaveTranscription
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const waveformRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(propDuration || 0);
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isError, setIsError] = useState(false);

    // Transcription states
    const [currentTranscription, setCurrentTranscription] = useState<string>(propTranscription || '');
    const [showTranscription, setShowTranscription] = useState<boolean>(false);
    const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Synchronize transcription from props
    useEffect(() => {
        if (propTranscription) {
            setCurrentTranscription(propTranscription);
        }
    }, [propTranscription]);

    // Determine color theme: 'dark' (graphite bubble) vs 'gold' (gold bubble)
    const effectiveVariant: 'dark' | 'gold' = variant || (isUser ? 'dark' : 'gold');

    // Update duration if prop changes
    useEffect(() => {
        if (propDuration && propDuration > 0) {
            setDuration(propDuration);
        }
    }, [propDuration]);

    // Handle audio time updates
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    // Handle loaded metadata
    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const d = audioRef.current.duration;
            if (isFinite(d) && d > 0) {
                setDuration(Math.round(d));
            }
        }
    };

    // Handle playback end
    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
        if (globalActiveAudio === audioRef.current) {
            globalActiveAudio = null;
        }
    };

    // Toggle Play/Pause
    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            // Stop previously playing audio
            if (globalActiveAudio && globalActiveAudio !== audio) {
                globalActiveAudio.pause();
            }
            globalActiveAudio = audio;
            audio.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.error('Audio play error:', err);
                setIsError(true);
            });
        }
    };

    // Toggle Speed: 1x -> 1.5x -> 2x -> 1x
    const toggleSpeed = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
        setPlaybackRate(nextRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
    };

    // Seek by clicking on waveform
    const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!waveformRef.current || !audioRef.current || duration <= 0) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const fraction = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = fraction * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    // Toggle show / request transcription
    const handleToggleOrRequestTranscribe = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentTranscription) {
            setShowTranscription(prev => !prev);
            return;
        }

        if (isTranscribing) return;
        setIsTranscribing(true);

        try {
            let resultText: string | null = null;
            if (onTranscribe) {
                resultText = await onTranscribe();
            } else {
                const response = await fetch('/api/transcribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioUrl: url })
                });
                if (response.ok) {
                    const data = await response.json();
                    resultText = data.text || null;
                }
            }

            if (resultText && resultText.trim()) {
                const cleaned = resultText.trim();
                setCurrentTranscription(cleaned);
                setShowTranscription(true);
                if (onSaveTranscription) {
                    await onSaveTranscription(cleaned);
                }
            } else {
                alert('Не удалось расшифровать запись. Возможно, речь неразборчива.');
            }
        } catch (err) {
            console.error('Transcription error:', err);
            alert('Ошибка при расшифровке голосового сообщения.');
        } finally {
            setIsTranscribing(false);
        }
    };

    // Copy transcript to clipboard
    const handleCopyTranscription = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentTranscription) return;
        navigator.clipboard.writeText(currentTranscription);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Cleanup on unmount
    useEffect(() => {
        const audio = audioRef.current;
        return () => {
            if (audio) {
                audio.pause();
                if (globalActiveAudio === audio) {
                    globalActiveAudio = null;
                }
            }
        };
    }, []);

    const progressFraction = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const isDark = effectiveVariant === 'dark';

    return (
        <div
            className={`w-full max-w-[340px] min-w-[240px] rounded-xl p-2.5 flex flex-col select-none transition-all ${
                isDark
                    ? 'bg-black/25 border border-white/10 text-white'
                    : 'bg-black/10 border border-black/10 text-black'
            } ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Hidden native audio element */}
            <audio
                ref={audioRef}
                src={url}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={() => setIsError(true)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
            />

            {/* Top row: Play/Pause Button + Waveform + Info */}
            <div className="w-full flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    disabled={isError}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
                        isDark
                            ? 'bg-sparta-gold text-black hover:bg-yellow-400 shadow-sparta-gold/20'
                            : 'bg-black text-sparta-gold hover:bg-black/90 shadow-black/30'
                    }`}
                    title={isPlaying ? 'Пауза' : 'Слушать голосовое сообщение'}
                >
                    {isError ? (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                    ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                </button>

                {/* Waveform and Progress */}
                <div className="flex-1 min-w-0">
                    {/* Simulated Waveform Bars */}
                    <div
                        ref={waveformRef}
                        onClick={handleWaveformClick}
                        className="h-6 flex items-center gap-[2.5px] cursor-pointer group py-1"
                        title="Перемотка"
                    >
                        {WAVEFORM_BARS.map((heightPercent, i) => {
                            const barFraction = i / WAVEFORM_BARS.length;
                            const isPlayed = barFraction <= progressFraction;

                            return (
                                <div
                                    key={i}
                                    style={{ height: `${heightPercent}%` }}
                                    className={`w-1 rounded-full transition-colors ${
                                        isPlayed
                                            ? isDark
                                                ? 'bg-sparta-gold'
                                                : 'bg-black'
                                            : isDark
                                                ? 'bg-white/20 group-hover:bg-white/35'
                                                : 'bg-black/25 group-hover:bg-black/40'
                                    }`}
                                />
                            );
                        })}
                    </div>

                    {/* Bottom row: Time, Transcribe button, Speed button */}
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono leading-none">
                        <span className={isDark ? 'text-gray-300' : 'text-black/80 font-semibold'}>
                            {isPlaying || currentTime > 0
                                ? formatAudioDuration(currentTime)
                                : duration > 0
                                    ? formatAudioDuration(duration)
                                    : '0:00'}
                        </span>

                        <div className="flex items-center gap-1.5">
                            {/* Transcribe / Voice-to-Text Button */}
                            <button
                                type="button"
                                onClick={handleToggleOrRequestTranscribe}
                                disabled={isTranscribing}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${
                                    isDark
                                        ? showTranscription && currentTranscription
                                            ? 'bg-sparta-gold text-black font-bold'
                                            : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
                                        : showTranscription && currentTranscription
                                            ? 'bg-black text-sparta-gold font-bold'
                                            : 'bg-black/15 hover:bg-black/25 text-black'
                                }`}
                                title={currentTranscription ? (showTranscription ? 'Скрыть текст' : 'Показать текст') : 'Перевести голосовое в текст'}
                            >
                                {isTranscribing ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-sparta-gold" />
                                ) : (
                                    <FileText className="w-3 h-3" />
                                )}
                                <span>{isTranscribing ? 'Расшифровка...' : currentTranscription ? 'Текст' : 'В текст'}</span>
                            </button>

                            {/* Speed button */}
                            <button
                                type="button"
                                onClick={toggleSpeed}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                    isDark
                                        ? 'bg-white/10 hover:bg-white/20 text-sparta-gold'
                                        : 'bg-black/15 hover:bg-black/25 text-black'
                                }`}
                                title="Скорость воспроизведения"
                            >
                                {playbackRate}x
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collapsible Transcription Box */}
            {showTranscription && currentTranscription && (
                <div
                    className={`w-full mt-2.5 pt-2 border-t text-xs leading-relaxed rounded-lg p-2.5 transition-all ${
                        isDark
                            ? 'bg-black/40 border-white/10 text-gray-200'
                            : 'bg-black/10 border-black/10 text-black/90 font-normal'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-[10px] font-semibold uppercase tracking-wider select-none">
                        <span className="flex items-center gap-1 text-sparta-gold">
                            <Sparkles className="w-3 h-3" />
                            Текст сообщения
                        </span>
                        <button
                            type="button"
                            onClick={handleCopyTranscription}
                            className="hover:opacity-100 flex items-center gap-1 transition-opacity text-current"
                            title="Скопировать текст"
                        >
                            {isCopied ? (
                                <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400 font-bold">Скопировано</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" />
                                    <span>Копировать</span>
                                </>
                            )}
                        </button>
                    </div>
                    <p className="whitespace-pre-wrap select-text italic text-[12px] leading-relaxed">
                        «{currentTranscription}»
                    </p>
                </div>
            )}
        </div>
    );
};

export default SpartaAudioPlayer;
