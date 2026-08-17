import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SpartaStreamBroadcaster } from '../utils/webrtcStream';
import { Camera, CameraOff, Mic, MicOff, RefreshCw, Radio, Play, Square, Shield, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/UIComponents';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const CameraStreamer = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const roomId = searchParams.get('room') || 'sparta_main_arena';
    const cameraId = searchParams.get('cam') || `cam_${Date.now().toString().slice(-4)}`;
    const [cameraLabel, setCameraLabel] = useState(searchParams.get('label') || 'Камера 2 (Бровка/Ворота)');

    const videoRef = useRef<HTMLVideoElement>(null);
    const broadcasterRef = useRef<SpartaStreamBroadcaster | null>(null);

    const [isStreaming, setIsStreaming] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isOnAir, setIsOnAir] = useState(false);

    useEffect(() => {
        broadcasterRef.current = new SpartaStreamBroadcaster(roomId, cameraId, cameraLabel);
        return () => {
            if (broadcasterRef.current) {
                broadcasterRef.current.stopCamera();
            }
        };
    }, [roomId, cameraId, cameraLabel]);

    // Listen for whether the director switched to this camera
    useEffect(() => {
        const roomRef = doc(db, 'sparta_live_rooms', roomId);
        const unsub = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIsOnAir(data.activeCameraId === cameraId);
            }
        });
        return () => unsub();
    }, [roomId, cameraId]);

    useEffect(() => {
        let interval: any;
        if (isStreaming) {
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isStreaming]);

    const handleStart = async () => {
        if (!videoRef.current || !broadcasterRef.current) return;
        setErrorMessage(null);
        try {
            await broadcasterRef.current.startCamera(videoRef.current, facingMode);
            setIsStreaming(true);
        } catch (e: any) {
            setErrorMessage(e.message || 'Ошибка подключения камеры');
        }
    };

    const handleStop = async () => {
        if (broadcasterRef.current) {
            await broadcasterRef.current.stopCamera();
        }
        setIsStreaming(false);
    };

    const handleFlip = async () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        if (isStreaming && videoRef.current && broadcasterRef.current) {
            try {
                await broadcasterRef.current.startCamera(videoRef.current, nextMode);
            } catch (e: any) {
                setErrorMessage(e.message || 'Не удалось переключить камеру');
            }
        }
    };

    const formatTimer = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col font-manrope select-none z-50">
            {/* Top Bar */}
            <div className="p-4 bg-black/80 backdrop-blur border-b border-white/10 flex items-center justify-between z-20">
                <button
                    onClick={() => navigate('/broadcasts')}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="text-center">
                    <span className="text-[10px] text-sparta-gold font-bold uppercase tracking-widest block">SPARTA CAMERA NODE</span>
                    <h3 className="font-russo text-sm text-white">{cameraLabel}</h3>
                </div>
                <div className="w-8" />
            </div>

            {/* Video Viewport */}
            <div className="relative flex-1 bg-neutral-950 flex items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                />

                {isStreaming && isVideoOff && (
                    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-6">
                        <Shield size={40} className="text-sparta-gold mb-2 animate-pulse" />
                        <h4 className="font-russo text-lg">КАМЕРА ПРИОСТАНОВЛЕНА</h4>
                    </div>
                )}

                {!isStreaming && (
                    <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold">
                            <Camera size={32} />
                        </div>
                        <h2 className="font-russo text-xl text-white">ДОПОЛНИТЕЛЬНАЯ ТОЧКА СЪЁМКИ</h2>
                        <p className="text-xs text-white/60 max-w-xs">
                            Нажмите кнопку ниже, чтобы транслировать этот ракурс в общий прямой эфир матча.
                        </p>
                        <Button
                            onClick={handleStart}
                            className="bg-sparta-gold hover:bg-amber-300 text-black font-bold px-8 py-3.5 rounded-2xl text-sm shadow-[0_0_30px_rgba(255,191,0,0.3)]"
                        >
                            Подключить камеру к матчу
                        </Button>
                    </div>
                )}

                {isStreaming && (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            isOnAir
                                ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)]'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                            {isOnAir ? '● ВЫ В ЭФИРЕ' : '🟡 В РЕЗЕРВЕ (ПРЕВЬЮ)'}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur text-white text-xs font-mono">
                            {formatTimer(elapsedSeconds)}
                        </span>
                    </div>
                )}

                {errorMessage && (
                    <div className="absolute bottom-4 inset-x-4 p-3 bg-red-500 text-white text-xs rounded-xl z-30">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            {isStreaming && (
                <div className="p-4 bg-black/90 border-t border-white/10 flex items-center justify-around gap-2 z-20">
                    <button
                        onClick={() => {
                            const newOff = !isVideoOff;
                            broadcasterRef.current?.toggleVideo(!newOff);
                            setIsVideoOff(newOff);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all ${
                            isVideoOff ? 'bg-amber-400/20 border-amber-400 text-amber-400' : 'bg-white/10 border-white/10 text-white'
                        }`}
                    >
                        {isVideoOff ? <CameraOff size={20} /> : <Camera size={20} />}
                    </button>

                    <button
                        onClick={() => {
                            const newMute = !isAudioMuted;
                            broadcasterRef.current?.toggleAudio(!newMute);
                            setIsAudioMuted(newMute);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all ${
                            isAudioMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/10 border-white/10 text-white'
                        }`}
                    >
                        {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                        onClick={handleFlip}
                        className="p-3.5 rounded-2xl bg-white/10 border border-white/10 text-white"
                    >
                        <RefreshCw size={20} />
                    </button>

                    <Button
                        onClick={handleStop}
                        className="bg-red-600 text-white font-bold px-4 py-3 rounded-2xl text-xs"
                    >
                        <Square size={14} /> Отключить
                    </Button>
                </div>
            )}
        </div>
    );
};

export default CameraStreamer;
