import React, { useState, useEffect, useRef } from 'react';
import { SpartaStreamBroadcaster, SpartaStreamViewer } from '../utils/webrtcStream';
import { Camera, CameraOff, Mic, MicOff, RefreshCw, Square, Play, AlertCircle, Radio, Layers, Camera as CameraIcon, Volume2, Plus, Minus, QrCode, Check, Copy, Video, LayoutGrid, Monitor, Sparkles } from 'lucide-react';
import { Sparta3DShield, Ball3D, Trophy3D } from './Sparta3DIcons';
import { Button } from './UIComponents';
import { PostStreamModal } from './PostStreamModal';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';

interface DirectStreamBroadcasterProps {
    roomId: string;
    broadcastId?: string | null;
    broadcastTitle?: string;
    scoreSparta?: number;
    scoreOpponent?: number;
    opponentName?: string;
    ageCategory?: string;
    onStreamEnded?: () => void;
}

// Dedicated Remote Camera Stream Component for Secondary Smartphones
const RemoteCameraStreamItem: React.FC<{
    roomId: string;
    cameraId: string;
    label: string;
    isOnAir: boolean;
    isGrid: boolean;
    onMakeLive: () => void;
}> = ({ roomId, cameraId, label, isOnAir, isGrid, onMakeLive }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const viewerRef = useRef<SpartaStreamViewer | null>(null);
    const [connStatus, setConnStatus] = useState<string>('connecting');

    useEffect(() => {
        const viewer = new SpartaStreamViewer(roomId, cameraId);
        viewerRef.current = viewer;

        if (videoRef.current) {
            viewer.startWatching(videoRef.current, (st) => {
                setConnStatus(st);
            });
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.stopWatching();
            }
        };
    }, [roomId, cameraId]);

    const handleReconnect = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewerRef.current && videoRef.current) {
            setConnStatus('connecting');
            viewerRef.current.startWatching(videoRef.current, (st) => {
                setConnStatus(st);
            });
        }
    };

    if (!isGrid && !isOnAir) {
        return (
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
            />
        );
    }

    return (
        <div
            onClick={onMakeLive}
            className={`relative w-full h-full bg-neutral-900 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                isOnAir
                    ? 'ring-2 ring-sparta-gold shadow-[0_0_30px_rgba(255,191,0,0.35)]'
                    : 'border border-white/15 opacity-85 hover:opacity-100 hover:border-sparta-gold/60'
            }`}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />

            {connStatus !== 'connected' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center z-10">
                    <Video size={24} className="text-sparta-gold animate-bounce mb-1" />
                    <span className="text-[11px] text-white font-bold mb-2">Подключение к {label}...</span>
                    <button
                        onClick={handleReconnect}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sparta-gold text-[10px] font-bold border border-sparta-gold/40 flex items-center gap-1 transition-all"
                    >
                        <RefreshCw size={11} /> Переподключить
                    </button>
                </div>
            )}

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    isOnAir ? 'bg-red-600 text-white animate-pulse' : 'bg-black/70 backdrop-blur text-white/70 border border-white/10'
                }`}>
                    {isOnAir ? '🔴 В ЭФИРЕ' : '🟡 ПРЕВЬЮ'}
                </span>
            </div>

            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-white text-[11px] font-bold border border-white/10">
                    {label}
                </span>

                {!isOnAir && (
                    <span className="px-2 py-0.5 rounded-md bg-sparta-gold text-black text-[9px] font-black uppercase tracking-wider shadow">
                        Вывести в эфир
                    </span>
                )}
            </div>
        </div>
    );
};

export const DirectStreamBroadcaster: React.FC<DirectStreamBroadcasterProps> = ({
    roomId,
    broadcastId = null,
    broadcastTitle = 'Матч Академии Спарта',
    scoreSparta = 0,
    scoreOpponent = 0,
    opponentName = 'Соперник',
    ageCategory = '2017-2018',
    onStreamEnded
}) => {
    const mainVideoRef = useRef<HTMLVideoElement>(null);
    const broadcasterRef = useRef<SpartaStreamBroadcaster | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const pipWindowRef = useRef<any>(null);
    const pipViewersRef = useRef<Map<string, SpartaStreamViewer>>(new Map());

    const [isStreaming, setIsStreaming] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPiPActive, setIsPiPActive] = useState(false);
    const [audioVolumeLevel, setAudioVolumeLevel] = useState(0);
    const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid');

    // Stable mutable refs to prevent closure capture in PiP
    const isVideoOffRef = useRef(false);
    const isAudioMutedRef = useRef(false);
    const localScoreSpartaRef = useRef(scoreSparta);
    const localScoreOpponentRef = useRef(scoreOpponent);
    const activeDirectorCameraIdRef = useRef<string>('cam_main');
    const connectedCamerasRef = useRef<any[]>([]);

    // Live score state
    const [localScoreSparta, setLocalScoreSparta] = useState(scoreSparta);
    const [localScoreOpponent, setLocalScoreOpponent] = useState(scoreOpponent);

    useEffect(() => {
        localScoreSpartaRef.current = scoreSparta;
        localScoreOpponentRef.current = scoreOpponent;
        setLocalScoreSparta(scoreSparta);
        setLocalScoreOpponent(scoreOpponent);
    }, [scoreSparta, scoreOpponent]);

    // Multi-camera states
    const [connectedCameras, setConnectedCameras] = useState<any[]>([]);
    const [activeDirectorCameraId, setActiveDirectorCameraId] = useState<string>('cam_main');
    const [showAddCameraModal, setShowAddCameraModal] = useState(false);
    const [copiedCameraLink, setCopiedCameraLink] = useState(false);

    // Post-stream Modal State
    const [showPostStreamModal, setShowPostStreamModal] = useState(false);
    const [finalRecordedBlob, setFinalRecordedBlob] = useState<Blob | null>(null);
    const [finalDuration, setFinalDuration] = useState(0);

    useEffect(() => {
        broadcasterRef.current = new SpartaStreamBroadcaster(roomId, 'cam_main', 'Основная камера (Тренер)');
        return () => {
            if (broadcasterRef.current) {
                broadcasterRef.current.stopCamera();
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }
            if (pipWindowRef.current) {
                pipWindowRef.current.close();
            }
            pipViewersRef.current.forEach(v => v.stopWatching());
            pipViewersRef.current.clear();
        };
    }, [roomId]);

    // Listen for all connected cameras in this room
    useEffect(() => {
        const camerasCol = collection(db, 'sparta_live_rooms', roomId, 'cameras');
        const unsub = onSnapshot(camerasCol, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            setConnectedCameras(list);
            connectedCamerasRef.current = list;
            updatePiPDoc();
        });

        // Listen for room active camera
        const roomDocRef = doc(db, 'sparta_live_rooms', roomId);
        const unsubRoom = onSnapshot(roomDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.activeCameraId) {
                    setActiveDirectorCameraId(data.activeCameraId);
                    activeDirectorCameraIdRef.current = data.activeCameraId;
                    updatePiPDoc();
                }
            }
        });

        return () => {
            unsub();
            unsubRoom();
        };
    }, [roomId]);

    // Timer
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

    // Audio level meter visualizer
    const setupAudioVisualizer = (stream: MediaStream) => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateMeter = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((average / 128) * 100));
                setAudioVolumeLevel(normalized);
                animFrameRef.current = requestAnimationFrame(updateMeter);
            };

            updateMeter();
        } catch (e) {
            console.error('Audio meter initialization error:', e);
        }
    };

    const handleStartStream = async () => {
        if (!mainVideoRef.current || !broadcasterRef.current) return;
        setErrorMessage(null);
        recordedChunksRef.current = [];

        try {
            const stream = await broadcasterRef.current.startCamera(mainVideoRef.current, facingMode);
            setIsStreaming(true);
            isVideoOffRef.current = false;
            setIsVideoOff(false);
            isAudioMutedRef.current = false;
            setIsAudioMuted(false);

            setupAudioVisualizer(stream);

            try {
                let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9,opus' };
                if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                    options = { mimeType: 'video/webm' };
                }

                const recorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                recorder.start(1000);
            } catch (recErr) {
                console.warn('MediaRecorder error or not supported:', recErr);
            }
        } catch (e: any) {
            setErrorMessage(e.message || 'Ошибка подключения камеры');
        }
    };

    const handleStopStream = async () => {
        const recordedSeconds = elapsedSeconds;
        setFinalDuration(recordedSeconds);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (broadcasterRef.current) {
            await broadcasterRef.current.stopCamera();
        }

        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }

        if (pipWindowRef.current) {
            pipWindowRef.current.close();
            pipWindowRef.current = null;
        }

        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        }

        setIsPiPActive(false);
        setIsStreaming(false);

        setTimeout(() => {
            if (recordedChunksRef.current.length > 0) {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                setFinalRecordedBlob(blob);
                setShowPostStreamModal(true);
            }
        }, 300);

        if (onStreamEnded) onStreamEnded();
    };

    const handleToggleAudio = () => {
        if (!broadcasterRef.current) return;
        const newMuted = !isAudioMutedRef.current;
        isAudioMutedRef.current = newMuted;
        broadcasterRef.current.toggleAudio(!newMuted);
        setIsAudioMuted(newMuted);
        updatePiPDoc();
    };

    const handleToggleVideo = () => {
        if (!broadcasterRef.current) return;
        const newVideoOff = !isVideoOffRef.current;
        isVideoOffRef.current = newVideoOff;
        broadcasterRef.current.toggleVideo(!newVideoOff);
        setIsVideoOff(newVideoOff);
        updatePiPDoc();
    };

    const handleFlipCamera = async () => {
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        if (isStreaming && mainVideoRef.current && broadcasterRef.current) {
            try {
                const stream = await broadcasterRef.current.startCamera(mainVideoRef.current, nextMode);
                setupAudioVisualizer(stream);
                if (pipWindowRef.current) {
                    const pipVideo = pipWindowRef.current.document.getElementById('sparta-pip-video-main');
                    if (pipVideo) {
                        pipVideo.srcObject = stream;
                        pipVideo.play().catch(() => {});
                    }
                }
            } catch (e: any) {
                setErrorMessage(e.message || 'Не удалось переключить камеру');
            }
        }
    };

    const handleQuickScoreChange = async (deltaSparta: number, deltaOpponent: number) => {
        const newSparta = Math.max(0, localScoreSpartaRef.current + deltaSparta);
        const newOpponent = Math.max(0, localScoreOpponentRef.current + deltaOpponent);
        localScoreSpartaRef.current = newSparta;
        localScoreOpponentRef.current = newOpponent;
        setLocalScoreSparta(newSparta);
        setLocalScoreOpponent(newOpponent);

        if (broadcastId) {
            updateDoc(doc(db, 'broadcasts', broadcastId), {
                scoreSparta: newSparta,
                scoreOpponent: newOpponent
            }).catch(() => {});
        }
        updatePiPDoc();
    };

    const handleTakeSnapshot = () => {
        if (!mainVideoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = mainVideoRef.current.videoWidth || 1280;
        canvas.height = mainVideoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(mainVideoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sparta-snapshot-${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            });
        }
    };

    const handleSwitchDirectorCamera = async (camId: string) => {
        setActiveDirectorCameraId(camId);
        activeDirectorCameraIdRef.current = camId;
        await updateDoc(doc(db, 'sparta_live_rooms', roomId), {
            activeCameraId: camId
        }).catch(() => {});
        updatePiPDoc();
    };

    const cameraConnectLink = `${window.location.origin}/camera-streamer?room=${roomId}&cam=cam_${connectedCameras.length + 1}`;

    const handleCopyCameraLink = () => {
        navigator.clipboard.writeText(cameraConnectLink).then(() => {
            setCopiedCameraLink(true);
            setTimeout(() => setCopiedCameraLink(false), 2500);
        });
    };

    const formatTimer = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Rebuild the video grid inside PiP window dynamically
    const rebuildPiPGrid = (doc: Document, cams: any[]) => {
        const grid = doc.getElementById('pip-cctv-grid');
        const switcher = doc.getElementById('pip-cam-switcher-bar');
        if (!grid) return;

        // Clean existing secondary viewers
        pipViewersRef.current.forEach(v => v.stopWatching());
        pipViewersRef.current.clear();

        const extraCams = cams.filter(c => c.id !== 'cam_main');
        grid.style.gridTemplateColumns = extraCams.length > 0 ? '1fr 1fr' : '1fr';

        // Rebuild Grid HTML
        grid.innerHTML = `
            <!-- Cam 1 (Main) -->
            <div id="pip-cam-tile-cam_main" style="position: relative; width: 100%; height: 100%; min-height: 120px; background: #141414; border-radius: 8px; overflow: hidden; border: 1.5px solid ${activeDirectorCameraIdRef.current === 'cam_main' ? '#fbbf24' : 'rgba(255,255,255,0.12)'}; cursor: pointer;">
                <video id="sparta-pip-video-main" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div style="position: absolute; top: 3px; left: 3px;">
                    <span id="pip-cam-badge-cam_main" style="background: ${activeDirectorCameraIdRef.current === 'cam_main' ? '#dc2626' : 'rgba(0,0,0,0.6)'}; color: #fff; font-size: 7px; font-weight: 900; padding: 1px 4px; border-radius: 3px;">${activeDirectorCameraIdRef.current === 'cam_main' ? '🔴 В ЭФИРЕ' : '🟡 ПРЕВЬЮ'}</span>
                </div>
                <div style="position: absolute; bottom: 3px; left: 3px; background: rgba(0,0,0,0.75); color: #fbbf24; font-size: 7.5px; font-weight: 800; padding: 1px 4px; border-radius: 3px;">
                    Камера 1
                </div>
            </div>

            <!-- Secondary Cams Grid -->
            ${extraCams.map(cam => `
                <div id="pip-cam-tile-${cam.id}" style="position: relative; width: 100%; height: 100%; min-height: 120px; background: #141414; border-radius: 8px; overflow: hidden; border: 1.5px solid ${activeDirectorCameraIdRef.current === cam.id ? '#fbbf24' : 'rgba(255,255,255,0.12)'}; cursor: pointer;">
                    <video id="sparta-pip-video-${cam.id}" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
                    <div style="position: absolute; top: 3px; left: 3px;">
                        <span id="pip-cam-badge-${cam.id}" style="background: ${activeDirectorCameraIdRef.current === cam.id ? '#dc2626' : 'rgba(0,0,0,0.6)'}; color: #fff; font-size: 7px; font-weight: 900; padding: 1px 4px; border-radius: 3px;">${activeDirectorCameraIdRef.current === cam.id ? '🔴 В ЭФИРЕ' : '🟡 ПРЕВЬЮ'}</span>
                    </div>
                    <div style="position: absolute; bottom: 3px; left: 3px; background: rgba(0,0,0,0.75); color: #fff; font-size: 7.5px; font-weight: 800; padding: 1px 4px; border-radius: 3px;">
                        ${cam.label ? cam.label.split('(')[0] : 'Камера 2'}
                    </div>
                </div>
            `).join('')}
        `;

        // Rebuild Switcher Bar HTML
        if (switcher) {
            switcher.innerHTML = `
                <span style="font-size: 9px; font-weight: 800; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 3px;">
                    В эфире:
                </span>
                <button id="pip-switch-btn-cam_main" style="padding: 2px 7px; font-size: 9px; font-weight: 800; background: ${activeDirectorCameraIdRef.current === 'cam_main' ? '#fbbf24' : '#222'}; color: ${activeDirectorCameraIdRef.current === 'cam_main' ? '#000' : '#fff'}; border-radius: 5px;">Камера 1</button>
                ${extraCams.map((cam, i) => `
                    <button id="pip-switch-btn-${cam.id}" style="padding: 2px 7px; font-size: 9px; font-weight: 800; background: ${activeDirectorCameraIdRef.current === cam.id ? '#fbbf24' : '#222'}; color: ${activeDirectorCameraIdRef.current === cam.id ? '#000' : '#fff'}; border-radius: 5px;">Камера ${i + 2}</button>
                `).join('')}
            `;

            doc.getElementById('pip-switch-btn-cam_main')?.addEventListener('click', () => handleSwitchDirectorCamera('cam_main'));
            extraCams.forEach(cam => {
                doc.getElementById(`pip-switch-btn-${cam.id}`)?.addEventListener('click', () => handleSwitchDirectorCamera(cam.id));
            });
        }

        // Attach streams and click listeners
        const pipVideoMain = doc.getElementById('sparta-pip-video-main') as HTMLVideoElement;
        if (pipVideoMain && mainVideoRef.current && mainVideoRef.current.srcObject) {
            pipVideoMain.srcObject = mainVideoRef.current.srcObject;
            pipVideoMain.play().catch(() => {});
        }

        doc.getElementById('pip-cam-tile-cam_main')?.addEventListener('click', () => {
            handleSwitchDirectorCamera('cam_main');
        });

        extraCams.forEach(cam => {
            const secVideo = doc.getElementById(`sparta-pip-video-${cam.id}`) as HTMLVideoElement;
            if (secVideo) {
                const v = new SpartaStreamViewer(roomId, cam.id);
                pipViewersRef.current.set(cam.id, v);
                v.startWatching(secVideo);
            }

            doc.getElementById(`pip-cam-tile-${cam.id}`)?.addEventListener('click', () => {
                handleSwitchDirectorCamera(cam.id);
            });
        });
    };

    // Update HTML inside the Document Picture-in-Picture window
    const updatePiPDoc = () => {
        if (!pipWindowRef.current) return;
        const doc = pipWindowRef.current.document;

        const timerEl = doc.getElementById('pip-timer');
        if (timerEl) timerEl.textContent = formatTimer(elapsedSeconds);

        const scoreSpartaEl = doc.getElementById('pip-score-sparta');
        if (scoreSpartaEl) scoreSpartaEl.textContent = String(localScoreSpartaRef.current);

        const scoreOpponentEl = doc.getElementById('pip-score-opponent');
        if (scoreOpponentEl) scoreOpponentEl.textContent = String(localScoreOpponentRef.current);

        const micBtn = doc.getElementById('pip-btn-mic');
        if (micBtn) {
            micBtn.innerHTML = isAudioMutedRef.current ? '🔇 <span>Микр Выкл</span>' : '🎤 <span>Звук Вкл</span>';
            micBtn.style.backgroundColor = isAudioMutedRef.current ? '#ef4444' : '#1f1f23';
            micBtn.style.borderColor = isAudioMutedRef.current ? '#dc2626' : '#3f3f46';
        }

        const camBtn = doc.getElementById('pip-btn-cam');
        if (camBtn) {
            camBtn.innerHTML = isVideoOffRef.current ? '📷 <span>Видео Выкл</span>' : '📹 <span>Камера Вкл</span>';
            camBtn.style.backgroundColor = isVideoOffRef.current ? '#d97706' : '#1f1f23';
            camBtn.style.borderColor = isVideoOffRef.current ? '#f59e0b' : '#3f3f46';
        }

        const pipVideoMain = doc.getElementById('sparta-pip-video-main');
        if (pipVideoMain) {
            pipVideoMain.style.opacity = isVideoOffRef.current ? '0.15' : '1';
        }

        const cams = connectedCamerasRef.current;
        const grid = doc.getElementById('pip-cctv-grid');
        if (grid) {
            const currentTiles = grid.querySelectorAll('[id^="pip-cam-tile-"]').length;
            if (currentTiles !== Math.max(1, cams.length)) {
                rebuildPiPGrid(doc, cams);
                return;
            }
        }

        cams.forEach(cam => {
            const badge = doc.getElementById(`pip-cam-badge-${cam.id}`);
            const tile = doc.getElementById(`pip-cam-tile-${cam.id}`);
            const switchBtn = doc.getElementById(`pip-switch-btn-${cam.id}`);
            const isLive = activeDirectorCameraIdRef.current === cam.id;
            if (badge) {
                badge.textContent = isLive ? '🔴 В ЭФИРЕ' : '🟡 ПРЕВЬЮ';
                badge.style.backgroundColor = isLive ? '#dc2626' : 'rgba(0,0,0,0.65)';
            }
            if (tile) {
                tile.style.borderColor = isLive ? '#fbbf24' : 'rgba(255,255,255,0.12)';
                tile.style.boxShadow = isLive ? '0 0 12px rgba(251,191,36,0.35)' : 'none';
            }
            if (switchBtn) {
                switchBtn.style.backgroundColor = isLive ? '#fbbf24' : '#222';
                switchBtn.style.color = isLive ? '#000' : '#fff';
            }
        });
    };

    // Open Interactive Document Picture-in-Picture window with Sleek Pro UI
    const handleTogglePiP = async () => {
        if (!mainVideoRef.current) return;

        if (pipWindowRef.current) {
            pipWindowRef.current.close();
            pipWindowRef.current = null;
            setIsPiPActive(false);
            return;
        }

        if ('documentPictureInPicture' in window) {
            try {
                const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
                    width: 440,
                    height: 500
                });
                pipWindowRef.current = pipWindow;
                setIsPiPActive(true);

                const pipDoc = pipWindow.document;
                pipDoc.title = `SPARTA STUDIO • ${broadcastTitle}`;
                pipDoc.body.style.margin = '0';
                pipDoc.body.style.backgroundColor = '#0a0a0a';
                pipDoc.body.style.color = '#ffffff';
                pipDoc.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                pipDoc.body.style.display = 'flex';
                pipDoc.body.style.flexDirection = 'column';
                pipDoc.body.style.overflow = 'hidden';
                pipDoc.body.style.height = '100vh';

                pipDoc.body.innerHTML = `
                    <style>
                        button { cursor: pointer; border: 1px solid rgba(255,255,255,0.14); transition: all 0.12s; font-family: inherit; font-size: 10px; font-weight: 700; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
                        button:hover { filter: brightness(1.2); }
                        button:active { transform: scale(0.96); }
                    </style>

                    <!-- Top Bar Header -->
                    <div style="padding: 5px 8px; background: #121214; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
                        <div style="font-size: 10px; font-weight: 900; color: #fbbf24; display: flex; align-items: center; gap: 4px;">
                            🛡️ SPARTA CCTV MATRIX
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <span style="background: #dc2626; color: #fff; font-size: 8px; font-weight: 900; padding: 1px 5px; border-radius: 3px;">● LIVE</span>
                            <span id="pip-timer" style="background: rgba(0,0,0,0.6); color: #fff; font-size: 8px; font-family: monospace; padding: 1px 5px; border-radius: 3px;">${formatTimer(elapsedSeconds)}</span>
                        </div>
                    </div>

                    <!-- Multi-Camera Video Grid (Flex: 1 to maximize stream size) -->
                    <div id="pip-cctv-grid" style="flex: 1; padding: 5px; display: grid; gap: 5px; background: #000; overflow: hidden;">
                    </div>

                    <!-- Quick Camera Switcher Bar -->
                    <div id="pip-cam-switcher-bar" style="padding: 4px 6px; background: #111113; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 4px; flex-shrink: 0; overflow-x: auto;">
                    </div>

                    <!-- Compact Scoreboard Bar -->
                    <div style="padding: 4px 8px; background: #111113; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; gap: 2px;">
                            <button id="pip-btn-score-sparta-minus" style="background: #222; color: #fff; padding: 2px 5px; font-size: 10px;">-1</button>
                            <button id="pip-btn-score-sparta-plus" style="background: linear-gradient(135deg, #fbbf24, #d97706); color: #000; padding: 3px 6px; font-weight: 900; font-size: 10px;">+1 Спарта</button>
                            <span id="pip-score-sparta" style="font-size: 15px; font-weight: 900; color: #fbbf24; margin: 0 4px;">${localScoreSpartaRef.current}</span>
                        </div>

                        <span style="color: rgba(255,255,255,0.3); font-size: 12px; font-weight: 900;">:</span>

                        <div style="display: flex; align-items: center; gap: 2px;">
                            <span id="pip-score-opponent" style="font-size: 15px; font-weight: 900; color: #fff; margin: 0 4px;">${localScoreOpponentRef.current}</span>
                            <button id="pip-btn-score-opp-plus" style="background: #333; color: #fff; padding: 3px 6px; font-weight: 900; font-size: 10px;">+1 ${opponentName.slice(0, 5)}</button>
                            <button id="pip-btn-score-opp-minus" style="background: #222; color: #fff; padding: 2px 5px; font-size: 10px;">-1</button>
                        </div>
                    </div>

                    <!-- Sleek Compact Action Toolbar -->
                    <div style="padding: 4px 6px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; background: #0c0c0e; flex-shrink: 0;">
                        <button id="pip-btn-cam" style="background: #1f1f23; color: #fff; padding: 5px 3px;">📹 <span>Камера</span></button>
                        <button id="pip-btn-mic" style="background: #1f1f23; color: #fff; padding: 5px 3px;">🎤 <span>Звук</span></button>
                        <button id="pip-btn-flip" style="background: #1f1f23; color: #fff; padding: 5px 3px;">🔄 <span>Сменить</span></button>
                        <button id="pip-btn-snap" style="background: #1f1f23; color: #fbbf24; padding: 5px 3px;">📸 <span>Фото</span></button>
                    </div>

                    <!-- Bottom Bar: Add Camera & Finish (Compact 1 row) -->
                    <div style="padding: 4px 6px 6px 6px; background: #0c0c0e; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; flex-shrink: 0;">
                        <button id="pip-btn-add-cam" style="background: #1c1917; border-color: rgba(251,191,36,0.3); color: #fbbf24; padding: 5px; font-size: 9.5px; font-weight: 800;">➕ Ссылка Камеры 2</button>
                        <button id="pip-btn-stop" style="background: #b91c1c; border-color: #991b1b; color: #fff; padding: 5px; font-size: 9.5px; font-weight: 800;">🛑 Завершить эфир</button>
                    </div>
                `;

                rebuildPiPGrid(pipDoc, connectedCamerasRef.current);

                pipDoc.getElementById('pip-btn-score-sparta-plus')?.addEventListener('click', () => handleQuickScoreChange(1, 0));
                pipDoc.getElementById('pip-btn-score-sparta-minus')?.addEventListener('click', () => handleQuickScoreChange(-1, 0));
                pipDoc.getElementById('pip-btn-score-opp-plus')?.addEventListener('click', () => handleQuickScoreChange(0, 1));
                pipDoc.getElementById('pip-btn-score-opp-minus')?.addEventListener('click', () => handleQuickScoreChange(0, -1));

                pipDoc.getElementById('pip-btn-mic')?.addEventListener('click', handleToggleAudio);
                pipDoc.getElementById('pip-btn-cam')?.addEventListener('click', handleToggleVideo);
                pipDoc.getElementById('pip-btn-flip')?.addEventListener('click', handleFlipCamera);
                pipDoc.getElementById('pip-btn-snap')?.addEventListener('click', handleTakeSnapshot);
                pipDoc.getElementById('pip-btn-add-cam')?.addEventListener('click', () => {
                    handleCopyCameraLink();
                    const btn = pipDoc.getElementById('pip-btn-add-cam');
                    if (btn) {
                        btn.textContent = '✅ Скопировано!';
                        setTimeout(() => {
                            if (btn) btn.textContent = '➕ Ссылка Камеры 2';
                        }, 2500);
                    }
                });
                pipDoc.getElementById('pip-btn-stop')?.addEventListener('click', handleStopStream);

                pipWindow.addEventListener('pagehide', () => {
                    setIsPiPActive(false);
                    pipWindowRef.current = null;
                });

                updatePiPDoc();
                return;
            } catch (dErr) {
                console.warn('Document Picture-in-Picture error, falling back to Video PiP:', dErr);
            }
        }

        // Fallback
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiPActive(false);
            } else {
                await mainVideoRef.current.requestPictureInPicture();
                setIsPiPActive(true);
            }
        } catch (e: any) {
            console.error('Picture-in-picture error:', e);
            alert('Режим «Картинка в картинке» не поддерживается этим браузером.');
        }
    };

    const secondaryCameras = connectedCameras.filter(c => c.id !== 'cam_main');
    const isMultiCamActive = secondaryCameras.length > 0;

    return (
        <div className="w-full rounded-[28px] bg-gradient-to-b from-[#181818]/90 via-[#101010]/95 to-[#080808] backdrop-blur-2xl border border-sparta-gold/30 overflow-hidden flex flex-col items-center font-manrope shadow-[0_12px_40px_rgba(255,191,0,0.18)]">
            {/* Viewport Box (Multi-view Matrix / Single View) */}
            <div className="relative w-full aspect-video bg-neutral-950 flex items-center justify-center overflow-hidden">
                {/* Layout Container */}
                <div className={`w-full h-full p-2 transition-all ${
                    viewMode === 'grid' && isMultiCamActive
                        ? 'grid grid-cols-2 gap-2'
                        : 'block p-0'
                }`}>
                    {/* Main Camera Video Node */}
                    <div
                        onClick={() => handleSwitchDirectorCamera('cam_main')}
                        className={`relative w-full h-full bg-neutral-900 rounded-2xl overflow-hidden cursor-pointer transition-all ${
                            viewMode === 'grid' && isMultiCamActive
                                ? activeDirectorCameraId === 'cam_main'
                                    ? 'ring-2 ring-sparta-gold shadow-[0_0_30px_rgba(255,191,0,0.35)]'
                                    : 'border border-white/15 opacity-85 hover:opacity-100 hover:border-sparta-gold/60'
                                : activeDirectorCameraId !== 'cam_main'
                                    ? 'hidden'
                                    : 'rounded-none border-0'
                        }`}
                    >
                        <video
                            ref={mainVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                        />

                        {/* Privacy Standby Screen */}
                        {isStreaming && isVideoOff && (
                            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-10">
                                <Sparta3DShield size={48} className="mb-2" />
                                <span className="font-russo text-xs text-white">КАМЕРА ПРИОСТАНОВЛЕНА</span>
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                activeDirectorCameraId === 'cam_main' ? 'bg-red-600 text-white animate-pulse' : 'bg-black/70 backdrop-blur text-white/70 border border-white/10'
                            }`}>
                                {activeDirectorCameraId === 'cam_main' ? '🔴 В ЭФИРЕ' : '🟡 ПРЕВЬЮ'}
                            </span>
                        </div>

                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                            <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-white text-[11px] font-bold border border-white/10">
                                Камера 1 (Основная)
                            </span>

                            {activeDirectorCameraId !== 'cam_main' && (
                                <span className="px-2 py-0.5 rounded-md bg-sparta-gold text-black text-[9px] font-black uppercase tracking-wider shadow">
                                    Вывести в эфир
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Secondary Remote Cameras Nodes */}
                    {secondaryCameras.map((cam) => (
                        <RemoteCameraStreamItem
                            key={cam.id}
                            roomId={roomId}
                            cameraId={cam.id}
                            label={cam.label || 'Камера 2'}
                            isOnAir={activeDirectorCameraId === cam.id}
                            isGrid={viewMode === 'grid'}
                            onMakeLive={() => handleSwitchDirectorCamera(cam.id)}
                        />
                    ))}
                </div>

                {!isStreaming && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                        <div className="mb-4">
                            <Sparta3DShield size={68} />
                        </div>
                        <h3 className="font-russo text-xl sm:text-2xl text-white mb-2 uppercase tracking-wide">
                            SPARTA LIVE STUDIO
                        </h3>
                        <p className="text-white/60 text-xs max-w-sm mb-6">
                            Мультикамерный стрим со смартфонов с матрицей ракурсов (CCTV), автозаписью и компактным пультом PiP.
                        </p>
                        <Button onClick={handleStartStream} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2.5 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                            <Play size={18} /> Начать трансляцию
                        </Button>
                    </div>
                )}

                {/* Live Overlays in Top Bar */}
                {isStreaming && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                        {/* Sound VU-Meter */}
                        <div className="flex items-center gap-2 bg-black/75 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
                            <Volume2 size={12} className={isAudioMuted ? 'text-red-400' : 'text-emerald-400'} />
                            <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden flex items-center">
                                <div
                                    className={`h-full transition-all duration-75 rounded-full ${
                                        isAudioMuted ? 'bg-red-500' : audioVolumeLevel > 70 ? 'bg-red-500' : audioVolumeLevel > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                                    }`}
                                    style={{ width: `${isAudioMuted ? 0 : audioVolumeLevel}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="absolute bottom-4 inset-x-4 p-3 bg-red-500/90 text-white text-xs rounded-xl flex items-center gap-2 z-30">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>

            {/* Director Switcher Bar (Multiple Cameras Matrix) */}
            {isStreaming && (
                <div className="w-full px-3 py-2 bg-[#141414]/90 border-t border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Layers size={11} className="text-sparta-gold" /> В эфире:
                        </span>

                        {/* Main Cam Button */}
                        <button
                            onClick={() => handleSwitchDirectorCamera('cam_main')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                activeDirectorCameraId === 'cam_main'
                                    ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(255,191,0,0.3)]'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            Камера 1 (Основная)
                        </button>

                        {/* Extra Connected Cams */}
                        {secondaryCameras.map((c, i) => (
                            <button
                                key={c.id}
                                onClick={() => handleSwitchDirectorCamera(c.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                    activeDirectorCameraId === c.id
                                        ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(255,191,0,0.3)]'
                                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                                }`}
                            >
                                <Video size={12} />
                                <span>{c.label ? c.label.split('(')[0] : `Камера ${i + 2}`}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Toggle Grid / Single View */}
                        {isMultiCamActive && (
                            <button
                                onClick={() => setViewMode(prev => prev === 'grid' ? 'single' : 'grid')}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white transition-all flex items-center gap-1"
                            >
                                {viewMode === 'grid' ? <Monitor size={12} /> : <LayoutGrid size={12} />}
                                <span>{viewMode === 'grid' ? 'Одиночный' : 'Сетка'}</span>
                            </button>
                        )}

                        {/* Button to Add 2nd / 3rd phone */}
                        <button
                            onClick={() => setShowAddCameraModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-sparta-gold hover:from-amber-300 hover:to-amber-400 text-black text-[11px] font-bold transition-all flex items-center gap-1 shadow"
                        >
                            <Plus size={13} /> Подключить камеру
                        </button>
                    </div>
                </div>
            )}

            {/* Compact Sleek Controls Toolbar */}
            {isStreaming && (
                <div className="w-full px-3 py-2.5 bg-[#0d0d0d] border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Interactive Multi-PiP Button */}
                        <button
                            onClick={handleTogglePiP}
                            title="Открыть компактный плавающий пульт с мульти-сеткой"
                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[11px] font-bold ${
                                isPiPActive
                                    ? 'bg-amber-400/20 border-amber-400 text-amber-400 shadow-[0_0_12px_rgba(255,191,0,0.25)]'
                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                        >
                            <Layers size={14} />
                            <span>{isPiPActive ? 'PiP Пульт ВКЛ' : 'PiP Пульт'}</span>
                        </button>

                        {/* Video Toggle */}
                        <button
                            onClick={handleToggleVideo}
                            title={isVideoOff ? 'Включить камеру' : 'Выключить видео (Пауза)'}
                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[11px] font-bold ${
                                isVideoOff
                                    ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                        >
                            {isVideoOff ? <CameraOff size={14} /> : <Camera size={14} />}
                            <span>{isVideoOff ? 'Камера выкл' : 'Камера вкл'}</span>
                        </button>

                        {/* Audio Toggle */}
                        <button
                            onClick={handleToggleAudio}
                            title={isAudioMuted ? 'Включить звук' : 'Выключить звук'}
                            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-[11px] font-bold ${
                                isAudioMuted
                                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                            }`}
                        >
                            {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
                            <span>{isAudioMuted ? 'Звук выкл' : 'Звук вкл'}</span>
                        </button>

                        {/* Flip Camera */}
                        <button
                            onClick={handleFlipCamera}
                            title="Сменить камеру"
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-[11px] font-bold"
                        >
                            <RefreshCw size={14} />
                            <span>Сменить камеру</span>
                        </button>

                        {/* Snapshot */}
                        <button
                            onClick={handleTakeSnapshot}
                            title="Сделать снимок момента"
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center gap-1.5 text-[11px] font-bold"
                        >
                            <CameraIcon size={14} />
                            <span>Фото кадра</span>
                        </button>
                    </div>

                    {/* Finish Stream Button */}
                    <button
                        onClick={handleStopStream}
                        className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow"
                    >
                        <Square size={12} /> Завершить эфир
                    </button>
                </div>
            )}

            {/* Modal: Connect Additional Camera */}
            {showAddCameraModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#161616] rounded-3xl border border-sparta-gold/30 p-6 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <QrCode className="text-sparta-gold" size={22} />
                                <h3 className="font-russo text-lg text-white uppercase">ПОДКЛЮЧЕНИЕ КАМЕРЫ 2</h3>
                            </div>
                            <button onClick={() => setShowAddCameraModal(false)} className="text-white/40 hover:text-white p-1">✕</button>
                        </div>

                        <p className="text-xs text-white/60 leading-relaxed">
                            Откройте эту ссылку на втором смартфоне (помощника тренера или за воротами). Камера подключится к эфиру автоматически!
                        </p>

                        <div className="p-4 rounded-2xl bg-black border border-white/10 space-y-3">
                            <div className="text-[11px] font-mono text-sparta-gold break-all select-all">
                                {cameraConnectLink}
                            </div>
                            <Button
                                onClick={handleCopyCameraLink}
                                className="w-full bg-sparta-gold hover:bg-amber-300 text-black font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
                            >
                                {copiedCameraLink ? <Check size={16} /> : <Copy size={16} />}
                                <span>{copiedCameraLink ? 'Ссылка скопирована!' : 'Скопировать ссылку для 2-го телефона'}</span>
                            </Button>
                        </div>

                        <div className="text-[11px] text-white/40 text-center">
                            💡 Можно подключить неограниченное количество смартфонов и переключать ракурсы в 1 клик на панели сверху.
                        </div>
                    </div>
                </div>
            )}

            {/* Post-Stream Modal Dialog */}
            <PostStreamModal
                isOpen={showPostStreamModal}
                onClose={() => setShowPostStreamModal(false)}
                recordedBlob={finalRecordedBlob}
                broadcastId={broadcastId}
                broadcastTitle={broadcastTitle}
                durationSeconds={finalDuration}
                scoreSparta={localScoreSparta}
                scoreOpponent={localScoreOpponent}
                opponentName={opponentName}
                ageCategory={ageCategory}
            />
        </div>
    );
};
