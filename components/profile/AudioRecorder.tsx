import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Trash2, Send, Play, Pause, Square, RefreshCw } from 'lucide-react';

export interface AudioRecorderProps {
    onSendAudio: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
    onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendAudio, onCancel }) => {
    const [isRecording, setIsRecording] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [volumeLevels, setVolumeLevels] = useState<number[]>(Array(14).fill(15));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const touchStartRef = useRef<number | null>(null);

    // Format seconds into MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const stopMicTracks = () => {
        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach(track => {
                    track.enabled = false;
                    track.stop();
                });
            } catch (e) {}
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (e) {}
            audioContextRef.current = null;
        }
    };

    // Initialize recording on mount
    useEffect(() => {
        const startMic = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                mediaStreamRef.current = stream;

                // Set up Web Audio API Analyser for real-time visualization (without destination loopback)
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    const ctx = new AudioContextClass();
                    audioContextRef.current = ctx;
                    const source = ctx.createMediaStreamSource(stream);
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 32;
                    // Connect ONLY to AnalyserNode, NEVER to ctx.destination to prevent speaker loopback/echo
                    source.connect(analyser);
                    analyserRef.current = analyser;

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const updateVolume = () => {
                        if (analyserRef.current) {
                            analyserRef.current.getByteFrequencyData(dataArray);
                            const levels = Array.from(dataArray.slice(0, 14)).map(val =>
                                Math.max(12, Math.min(100, Math.round((val / 255) * 100)))
                            );
                            setVolumeLevels(levels);
                        }
                        animFrameRef.current = requestAnimationFrame(updateVolume);
                    };
                    updateVolume();
                }

                // MediaRecorder Setup
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        audioChunksRef.current.push(e.data);
                    }
                };

                recorder.onstop = () => {
                    stopMicTracks();
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    setAudioBlob(blob);
                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);
                };

                recorder.start(100);

                // Start Duration Timer
                timerRef.current = setInterval(() => {
                    setRecordingTime(prev => prev + 1);
                }, 1000);
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Не удалось получить доступ к микрофону.');
                onCancel();
            }
        };

        startMic();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            stopMicTracks();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                } catch (e) {}
            }
            if (previewAudioRef.current) {
                try {
                    previewAudioRef.current.pause();
                } catch (e) {}
            }
        };
    }, []);

    // Stop recording and generate preview blob
    const handleStopRecording = () => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        } catch (e) {}
        stopMicTracks();
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setIsRecording(false);
    };

    // Cancel recording with haptic feedback
    const handleCancelRecording = () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(50);
            } catch (err) {
                // Ignore vibration restrictions
            }
        }
        stopMicTracks();
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch (e) {}
        }
        onCancel();
    };

    // Toggle Preview Playback Safely
    const togglePreviewPlay = () => {
        if (!audioUrl) return;
        try {
            if (!previewAudioRef.current) {
                const audio = new Audio(audioUrl);
                audio.onended = () => setIsPlayingPreview(false);
                audio.onerror = () => setIsPlayingPreview(false);
                previewAudioRef.current = audio;
            }

            if (isPlayingPreview) {
                try {
                    previewAudioRef.current.pause();
                } catch (e) {}
                setIsPlayingPreview(false);
            } else {
                const playPromise = previewAudioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => setIsPlayingPreview(true))
                        .catch((err) => {
                            console.warn("Handled preview audio play rejection:", err);
                            setIsPlayingPreview(false);
                        });
                } else {
                    setIsPlayingPreview(true);
                }
            }
        } catch (err) {
            console.warn("Error toggling preview play:", err);
            setIsPlayingPreview(false);
        }
    };

    // Handle Send Voice Message
    const handleSend = async () => {
        if (isSending) return;
        setIsSending(true);

        try {
            if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                // Wait for blob creation
                await new Promise((res) => setTimeout(res, 200));
            }

            if (audioChunksRef.current.length > 0) {
                const finalBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await onSendAudio(finalBlob, recordingTime);
            } else if (audioBlob) {
                await onSendAudio(audioBlob, recordingTime);
            }
        } catch (err) {
            console.error('Error sending audio:', err);
        } finally {
            setIsSending(false);
        }
    };

    // Touch Swipe-to-Cancel logic
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            touchStartRef.current = e.touches[0].clientX;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartRef.current !== null && e.touches.length > 0) {
            const dx = e.touches[0].clientX - touchStartRef.current;
            if (dx < -60) {
                // Swiped left significantly -> Cancel
                handleCancelRecording();
                touchStartRef.current = null;
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="flex items-center gap-3 w-full bg-[#161618] border border-amber-500/30 rounded-2xl px-4 py-2.5 shadow-2xl z-30"
        >
            {/* Recording Indicator & Timer */}
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-red-400">
                    {formatTime(recordingTime)}
                </span>
            </div>

            {/* Audio Waveform Equalizer / Preview */}
            <div className="flex-1 flex items-center justify-center gap-1 h-7 overflow-hidden px-2">
                {isRecording ? (
                    volumeLevels.map((val, idx) => (
                        <div
                            key={idx}
                            style={{ height: `${val}%` }}
                            className="w-1 bg-gradient-to-t from-amber-500 to-sparta-gold rounded-full transition-all duration-75"
                        />
                    ))
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={togglePreviewPlay}
                            className="p-1.5 bg-sparta-gold text-black rounded-xl hover:scale-105 transition-all"
                        >
                            {isPlayingPreview ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                            {isPlayingPreview ? 'Прослушивание...' : 'Запись готова'}
                        </span>
                    </div>
                )}
            </div>

            {/* Swipe / Cancel Hint */}
            {isRecording && (
                <span className="text-[9px] text-white/30 uppercase font-black tracking-widest hidden md:inline shrink-0">
                    Смахните влево для отмены
                </span>
            )}

            {/* Actions: Cancel & Send */}
            <div className="flex items-center gap-1.5 shrink-0">
                {isRecording && (
                    <button
                        type="button"
                        onClick={handleStopRecording}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        title="Остановить и прослушать"
                    >
                        <Square size={16} />
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="p-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Удалить запись"
                >
                    <Trash2 size={16} />
                </button>

                <button
                    type="button"
                    onClick={handleSend}
                    disabled={isSending}
                    className="p-2.5 bg-sparta-gold text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-sparta-gold/20"
                    title="Отправить голосовое сообщение"
                >
                    {isSending ? (
                        <RefreshCw size={16} className="animate-spin" />
                    ) : (
                        <Send size={16} />
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default AudioRecorder;
