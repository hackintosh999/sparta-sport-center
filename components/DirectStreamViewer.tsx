import React, { useState, useEffect, useRef } from 'react';
import { SpartaStreamViewer } from '../utils/webrtcStream';
import { Loader2, Radio, Volume2, VolumeX, Maximize2, Video, Layers, Sparkles } from 'lucide-react';
import { Sparta3DShield, Ball3D } from './Sparta3DIcons';
import { db } from '../firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';

interface DirectStreamViewerProps {
    roomId: string;
    scoreSparta?: number;
    scoreOpponent?: number;
    opponentName?: string;
    matchTime?: string;
}

export const DirectStreamViewer: React.FC<DirectStreamViewerProps> = ({
    roomId,
    scoreSparta = 0,
    scoreOpponent = 0,
    opponentName = 'Соперник',
    matchTime
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const viewerRef = useRef<SpartaStreamViewer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
    const [isMuted, setIsMuted] = useState(true);

    // Multi-camera states
    const [cameras, setCameras] = useState<any[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('cam_main');
    const [isDirectorAuto, setIsDirectorAuto] = useState(true);
    const [isCurrentCamVideoOff, setIsCurrentCamVideoOff] = useState(false);

    // Listen for available cameras in the room
    useEffect(() => {
        const camerasCol = collection(db, 'sparta_live_rooms', roomId, 'cameras');
        const unsub = onSnapshot(camerasCol, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            setCameras(list);

            const curr = list.find(c => c.id === selectedCameraId) as any;
            if (curr) {
                setIsCurrentCamVideoOff(!!curr.isVideoOff);
            }
        });

        // Listen for Director's active camera
        const roomRef = doc(db, 'sparta_live_rooms', roomId);
        const unsubRoom = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.activeCameraId && isDirectorAuto) {
                    setSelectedCameraId(data.activeCameraId);
                }
            }
        });

        return () => {
            unsub();
            unsubRoom();
        };
    }, [roomId, selectedCameraId, isDirectorAuto]);

    // Initialize or switch WebRTC viewer
    useEffect(() => {
        if (!viewerRef.current) {
            viewerRef.current = new SpartaStreamViewer(roomId, selectedCameraId);
        } else {
            viewerRef.current.stopWatching();
            viewerRef.current = new SpartaStreamViewer(roomId, selectedCameraId);
        }

        if (videoRef.current) {
            viewerRef.current.startWatching(videoRef.current, (status) => {
                setConnectionStatus(status);
            });
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.stopWatching();
            }
        };
    }, [roomId, selectedCameraId]);

    const handleSelectCamera = (camId: string, isAuto: boolean = false) => {
        setIsDirectorAuto(isAuto);
        setSelectedCameraId(camId);
    };

    const handleToggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            } else {
                containerRef.current.requestFullscreen().catch(() => {});
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video rounded-[36px] overflow-hidden bg-black/60 backdrop-blur-2xl border border-sparta-gold/30 shadow-[0_16px_50px_rgba(255,191,0,0.22)] group font-manrope select-none ring-1 ring-white/10"
        >
            {/* Ambient Glass Glows */}
            <div className="absolute top-0 left-1/3 w-80 h-80 bg-sparta-gold/10 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-red-600/10 rounded-full blur-[90px] pointer-events-none" />

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isCurrentCamVideoOff ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Video Pause / Privacy Standby Overlay with 3D Sparta Shield */}
            {isCurrentCamVideoOff && connectionStatus === 'connected' && (
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-[#0c0c0c]/95 to-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="mb-4 transform hover:scale-105 transition-transform animate-pulse">
                        <Sparta3DShield size={64} />
                    </div>
                    <h4 className="font-russo text-xl md:text-2xl text-white uppercase tracking-wider mb-1">
                        ПЕРЕРЫВ В ЭФИРЕ
                    </h4>
                    <p className="text-white/60 text-xs max-w-xs leading-relaxed">
                        Трансляция скоро продолжится. Звук матча активен.
                    </p>
                </div>
            )}

            {/* Connecting State Overlay */}
            {connectionStatus !== 'connected' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                    <div className="mb-4">
                        <Sparta3DShield size={56} className="animate-bounce" />
                    </div>
                    <h4 className="font-russo text-lg text-white mb-1 uppercase tracking-wide">
                        ПОДКЛЮЧЕНИЕ К ЭФИРУ СПАРТЫ
                    </h4>
                    <p className="text-white/50 text-xs">Инициализация прямого потока...</p>
                </div>
            )}

            {/* Top Overlay: Live Tag & Glass Scoreboard */}
            <div className="absolute top-2 sm:top-4 inset-x-2 sm:inset-x-4 flex items-center justify-between pointer-events-none z-20">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-red-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black tracking-wider uppercase shadow-xl border border-red-400/30 animate-pulse">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-ping" /> LIVE
                    </span>
                    {matchTime && (
                        <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-sparta-gold text-[10px] sm:text-xs font-mono font-bold shadow-lg">
                            {matchTime}
                        </span>
                    )}
                </div>

                {/* 3D Glass Scoreboard Pill */}
                <div className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-black/75 backdrop-blur-xl border border-sparta-gold/40 flex items-center gap-1.5 sm:gap-3 shadow-[0_8px_25px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <Sparta3DShield size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider hidden sm:inline">Спарта</span>
                    </div>

                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md sm:rounded-lg bg-gradient-to-r from-amber-400 to-sparta-gold text-black font-russo text-xs sm:text-base font-black shadow-md">
                        {scoreSparta} : {scoreOpponent}
                    </div>

                    <span className="text-[11px] sm:text-xs font-bold text-white/80 uppercase tracking-wider max-w-[70px] sm:max-w-none truncate">
                        {opponentName}
                    </span>
                </div>
            </div>

            {/* Multi-Camera Angle Selector for Parents / Viewers */}
            {cameras.length > 1 && (
                <div className="absolute bottom-16 inset-x-4 z-20 pointer-events-auto flex items-center justify-center gap-2">
                    <div className="p-1.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-sparta-gold/30 flex items-center gap-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
                        <span className="text-[10px] font-bold text-white/60 px-2 flex items-center gap-1">
                            <Layers size={12} className="text-sparta-gold" /> Ракурс:
                        </span>
                        <button
                            onClick={() => handleSelectCamera(cameras[0]?.id || 'cam_main', true)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isDirectorAuto
                                    ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(255,191,0,0.3)]'
                                    : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                            }`}
                        >
                            <Sparkles size={13} />
                            <span>Авто (Эфир)</span>
                        </button>
                        {cameras.map((c, i) => (
                            <button
                                key={c.id}
                                onClick={() => handleSelectCamera(c.id, false)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    !isDirectorAuto && selectedCameraId === c.id
                                        ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(255,191,0,0.3)]'
                                        : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
                                }`}
                            >
                                <Video size={13} />
                                <span>{c.label || `Камера ${i + 1}`}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Overlay: Controls */}
            <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button
                    onClick={handleToggleMute}
                    className="p-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white hover:text-sparta-gold transition-all shadow-lg"
                >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <button
                    onClick={handleFullscreen}
                    className="p-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white hover:text-sparta-gold transition-all shadow-lg"
                >
                    <Maximize2 size={18} />
                </button>
            </div>
        </div>
    );
};
