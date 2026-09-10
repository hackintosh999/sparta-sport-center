import { useState, useRef, useCallback } from 'react';

export interface RecordedAudio {
    blob: Blob;
    duration: number; // in seconds
    file: globalThis.File;
    url: string;
    transcription?: string;
}

export interface UseAudioRecorderReturn {
    isRecording: boolean;
    recordingDuration: number;
    formattedDuration: string;
    startRecording: () => Promise<boolean>;
    stopRecording: () => Promise<RecordedAudio | null>;
    cancelRecording: () => void;
    error: string | null;
}

export const formatAudioDuration = (seconds: number = 0): string => {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef<string>('');

    const startRecording = useCallback(async (): Promise<boolean> => {
        setError(null);
        transcriptRef.current = '';
        if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const err = 'Запись аудио не поддерживается в вашем браузере';
            setError(err);
            alert(err);
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Optional live speech-to-text recognition in Russian
            const SpeechRecognition = (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
            if (SpeechRecognition) {
                try {
                    const rec = new SpeechRecognition();
                    rec.continuous = true;
                    rec.interimResults = true;
                    rec.lang = 'ru-RU';
                    rec.onresult = (e: any) => {
                        let full = '';
                        for (let i = 0; i < e.results.length; i++) {
                            full += e.results[i][0].transcript + ' ';
                        }
                        transcriptRef.current = full.trim();
                    };
                    rec.onerror = (e: any) => {
                        console.warn('SpeechRecognition warning:', e?.error);
                    };
                    rec.start();
                    recognitionRef.current = rec;
                } catch (recErr) {
                    console.warn('SpeechRecognition init error:', recErr);
                }
            }

            let mimeType = 'audio/webm;codecs=opus';
            if (typeof MediaRecorder !== 'undefined') {
                const supportedTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/mp4',
                    'audio/ogg;codecs=opus',
                    'audio/ogg'
                ];
                mimeType = supportedTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
            }

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.start(100);
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setRecordingDuration(0);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 500);

            return true;
        } catch (err: any) {
            console.error('Error starting audio recording:', err);
            const msg = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
                ? 'Доступ к микрофону заблокирован. Разрешите доступ в настройках браузера.'
                : 'Не удалось получить доступ к микрофону. Проверьте подключение микрофона.';
            setError(msg);
            alert(msg);
            return false;
        }
    }, []);

    const stopRecording = useCallback((): Promise<RecordedAudio | null> => {
        return new Promise((resolve) => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {}
                recognitionRef.current = null;
            }

            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state === 'inactive') {
                setIsRecording(false);
                setRecordingDuration(0);
                resolve(null);
                return;
            }

            recorder.onstop = () => {
                const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
                const mime = recorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: mime });
                const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
                const file = new globalThis.File([blob], `voice_${Date.now()}.${ext}`, { type: blob.type });
                const url = URL.createObjectURL(blob);
                const capturedTranscription = transcriptRef.current.trim();

                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                }
                mediaRecorderRef.current = null;
                chunksRef.current = [];
                transcriptRef.current = '';
                setIsRecording(false);
                setRecordingDuration(0);

                resolve({
                    blob,
                    duration: durationSec,
                    file,
                    url,
                    transcription: capturedTranscription || undefined
                });
            };

            recorder.stop();
        });
    }, []);

    const cancelRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch {}
            recognitionRef.current = null;
        }
        transcriptRef.current = '';
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setIsRecording(false);
        setRecordingDuration(0);
    }, []);

    return {
        isRecording,
        recordingDuration,
        formattedDuration: formatAudioDuration(recordingDuration),
        startRecording,
        stopRecording,
        cancelRecording,
        error
    };
};
