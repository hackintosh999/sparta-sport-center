import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Zap,
    QrCode,
    Camera,
    ArrowRightLeft,
    ChevronRight,
    Wallet,
    Calendar,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Loader2,
    SwitchCamera,
    Flashlight,
    FlashlightOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    collection,
    addDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import { performEmergencyCleanup, performHardReset } from '../../utils/storage';

interface MagicTransferProps {
    isOpen: boolean;
    onClose: () => void;
}

type TransferMode = 'selection' | 'send_balance' | 'send_subscription' | 'qr_display' | 'receive_scan';

export const MagicTransfer: React.FC<MagicTransferProps> = ({ isOpen, onClose }) => {
    const { user, userProfile } = useAuth();
    const [mode, setMode] = useState<TransferMode>('selection');
    const [amount, setAmount] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transferId, setTransferId] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<any>(null);
    const [isAbsorbing, setIsAbsorbing] = useState(false); // For suction animation

    // Scanner states
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameras, setCameras] = useState<any[]>([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [isScannerInitializing, setIsScannerInitializing] = useState(false);

    // Real-time synchronization for Sender
    useEffect(() => {
        if (mode === 'qr_display' && transferId) {
            const transferDocRef = doc(db, 'magic_transfers', transferId);
            const unsubscribe = onSnapshot(transferDocRef, (snap) => {
                const data = snap.data();
                if (data && data.status === 'claimed') {
                    console.log("Sender detected: Transfer claimed!");
                    setSuccessData(data);

                    if (navigator.vibrate) navigator.vibrate([10, 30, 100]);
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#D4AF37', '#FFFFFF', '#3b82f6'],
                        gravity: 0.8
                    });
                }
            });
            return () => unsubscribe();
        }
    }, [mode, transferId]);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            setMode('selection');
            setAmount('');
            setError(null);
            setTransferId(null);
            setSuccessData(null);
            setIsAbsorbing(false);
        }
    }, [isOpen]);

    const stopScanner = async () => {
        if (scannerRef.current) {
            if (scannerRef.current.isScanning) {
                try {
                    await scannerRef.current.stop();
                } catch (err) {
                    console.warn("Error stopping scanner", err);
                }
            }
            try {
                scannerRef.current.clear();
            } catch (err) {
                // ignore clear errors
            }
            scannerRef.current = null;
        }
        setIsTorchOn(false);
        setIsScannerInitializing(false);
    };

    const handleSendBalance = async () => {
        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            setError('Введите корректную сумму');
            return;
        }

        if (numAmount > (userProfile?.walletBalance || 0)) {
            setError('Недостаточно средств на балансе');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const transferRef = await addDoc(collection(db, 'magic_transfers'), {
                senderId: user?.uid,
                senderName: userProfile?.childName || userProfile?.parentName || 'Спартанец',
                type: 'balance',
                amount: numAmount,
                status: 'pending',
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
            });

            setTransferId(transferRef.id);
            setMode('qr_display');
        } catch (err) {
            console.error('Transfer creation error:', err);
            setError('Ошибка при создании перевода');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendSubscription = async () => {
        if (!userProfile?.subscription || userProfile.subscription.status !== 'active') {
            setError('У вас нет активной подписки для передачи');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const transferRef = await addDoc(collection(db, 'magic_transfers'), {
                senderId: user?.uid,
                senderName: userProfile?.childName || userProfile?.parentName || 'Спартанец',
                type: 'subscription',
                subscription: userProfile.subscription,
                status: 'pending',
                createdAt: serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
            });

            setTransferId(transferRef.id);
            setMode('qr_display');
        } catch (err) {
            console.error('Subscription transfer error:', err);
            setError('Ошибка при создании перевода');
        } finally {
            setIsProcessing(false);
        }
    };

    const initScanner = async () => {
        setMode('receive_scan');
        setError(null);
        setIsScannerInitializing(true);

        try {
            // First stop any existing scanner
            await stopScanner();

            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                setCameras(devices);
                const backCameraIndex = devices.findIndex(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                const initialIndex = backCameraIndex !== -1 ? backCameraIndex : 0;
                setCurrentCameraIndex(initialIndex);
                await startScanning(devices[initialIndex].id);
            } else {
                setError('Камеры не найдены');
                setIsScannerInitializing(false);
            }
        } catch (err) {
            console.error('Camera access error:', err);
            setError('Нет доступа к камере');
            setIsScannerInitializing(false);
        }
    };

    const startScanning = async (cameraId: string) => {
        try {
            // Re-create scanner instance only if needed
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("reader");
            }

            await scannerRef.current.start(
                cameraId,
                {
                    fps: 30, // Increased for "magnetic" fast detection
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const size = Math.floor(minEdge * 0.85); // Slightly larger scan area
                        return { width: size, height: size };
                    },
                    aspectRatio: 1.0
                },
                onScanSuccess,
                (errorMessage) => { /* ignore constant scan fails */ }
            );

            setIsScannerInitializing(false);

            // Check for torch capability
            const track = (scannerRef.current as any).getRunningTrack ? (scannerRef.current as any).getRunningTrack() : null;
            if (track) {
                const capabilities = (track as any).getCapabilities?.() || {};
                setHasTorch(!!capabilities.torch);
            }
        } catch (err) {
            console.error("Scanner start error", err);
            setError("Не удалось запустить камеру");
        }
    };

    const toggleCamera = () => {
        if (cameras.length < 2) return;
        const nextIndex = (currentCameraIndex + 1) % cameras.length;
        setCurrentCameraIndex(nextIndex);
        startScanning(cameras[nextIndex].id);
    };

    const toggleTorch = async () => {
        if (!scannerRef.current || !hasTorch) return;
        const newState = !isTorchOn;
        try {
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: newState }] as any
            });
            setIsTorchOn(newState);
        } catch (err) {
            console.error("Torch error", err);
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        if (isProcessing || isAbsorbing) return;

        console.log("QR Scanned:", decodedText);

        if (!decodedText.startsWith('sparta_transfer:')) {
            console.warn("Invalid QR prefix:", decodedText);
            return;
        }

        const scannedId = decodedText.split(':')[1];
        console.log("Scanned ID:", scannedId);

        // Start intense magnetic animation
        setIsAbsorbing(true);
        if (navigator.vibrate) {
            // Strong double pulse for "impact" feel
            navigator.vibrate([100, 50, 100]);
        }

        // Extremely fast delay for "magnetic" touch feel
        setTimeout(async () => {
            console.log("Magnetic Trigger: Processing...");
            await stopScanner();
            setIsProcessing(true);
            processClaim(scannedId);
        }, 150); // Reduced from 600ms to 150ms
    };

    const processClaim = async (id: string) => {
        console.log("Starting processClaim for ID:", id);
        try {
            await runTransaction(db, async (transaction) => {
                const transferDocRef = doc(db, 'magic_transfers', id);
                const transferSnap = await transaction.get(transferDocRef);

                if (!transferSnap.exists()) {
                    throw new Error('Перевод не найден. Возможно, он был удален или отозван.');
                }

                const data = transferSnap.data() as any;
                console.log("Transfer data found:", data);

                if (data.status !== 'pending') {
                    throw new Error('Этот перевод уже получен или отменен');
                }

                if (data.expiresAt.toDate() < new Date()) {
                    throw new Error('Срок действия перевода истек');
                }

                if (data.senderId === user?.uid) {
                    throw new Error('Вы не можете отправить перевод самому себе');
                }

                const senderRef = doc(db, 'users', data.senderId);
                const receiverRef = doc(db, 'users', user?.uid || '');

                const [senderSnap, receiverSnap] = await Promise.all([
                    transaction.get(senderRef),
                    transaction.get(receiverRef)
                ]);

                if (!senderSnap.exists()) throw new Error('Отправитель не найден в базе');
                if (!receiverSnap.exists()) throw new Error('Ваш профиль не найден');

                const senderData = senderSnap.data() as any;
                const receiverData = receiverSnap.data() as any;

                if (data.type === 'balance') {
                    const senderBalance = senderData?.walletBalance || 0;
                    if (senderBalance < data.amount) {
                        throw new Error(`У отправителя недостаточно средств (${senderBalance} ₽)`);
                    }

                    transaction.update(senderRef, {
                        walletBalance: senderBalance - data.amount
                    });

                    transaction.update(receiverRef, {
                        walletBalance: (receiverData?.walletBalance || 0) + data.amount
                    });
                } else if (data.type === 'subscription') {
                    if (!senderData?.subscription) {
                        throw new Error('У отправителя больше нет подписки');
                    }

                    transaction.update(senderRef, {
                        subscription: null
                    });

                    transaction.update(receiverRef, {
                        subscription: data.subscription
                    });
                }

                transaction.update(transferDocRef, {
                    status: 'claimed',
                    receiverId: user?.uid,
                    receiverName: userProfile?.childName || userProfile?.parentName || 'Спартанец',
                    claimedAt: serverTimestamp()
                });

                setSuccessData(data);
            });

            console.log("Transaction successful!");
            if (navigator.vibrate) navigator.vibrate([100, 30, 100, 30, 200]);
            confetti({
                particleCount: 200,
                spread: 90,
                origin: { y: 0.6 },
                colors: ['#D4AF37', '#FFFFFF', '#000000', '#3b82f6'],
                scalar: 1.2
            });

        } catch (err: any) {
            console.error('ProcessClaim error:', err);

            // Check for common permission/domain errors
            let msg = err.message || 'Ошибка транзакции';
            if (msg.toLowerCase().includes('permission-denied')) {
                msg = 'ОШИБКА ДОСТУПА: Убедитесь, что ваш аккаунт имеет права на эту операцию.';
            } else if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('storage')) {
                // PROACTIVE TRIGGER: Try to clear space immediately
                performEmergencyCleanup();
                msg = 'ПАМЯТЬ БРАУЗЕРА ПЕРЕПОЛНЕНА: Мы попытались автоматически очистить место. Пожалуйста, ПОПРОБУЙТЕ СНОВА. Если ошибка повторится, удалите историю браузера.';
            } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
                msg = 'ОШИБКА СЕТИ: Проверьте интернет-соединение и попробуйте снова.';
            }

            setError(msg);
        } finally {
            setIsAbsorbing(false);
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 40, rotateX: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.2)]"
            >
                {/* Background Magic Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                y: [0, -100, 0],
                                opacity: [0, 0.3, 0],
                                scale: [1, 1.5, 1],
                            }}
                            transition={{
                                duration: 3 + i,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.5
                            }}
                            className="absolute bg-sparta-gold/20 blur-2xl rounded-full"
                            style={{
                                width: Math.random() * 100 + 50,
                                height: Math.random() * 100 + 50,
                                left: `${Math.random() * 100}%`,
                                bottom: '-20%',
                            }}
                        />
                    ))}
                </div>

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-white/5 relative z-10 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="w-10 h-10 rounded-xl bg-sparta-gold/20 flex items-center justify-center text-sparta-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                        >
                            <Sparkles size={20} />
                        </motion.div>
                        <h2 className="text-xl font-russo text-white uppercase tracking-widest bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent text-center">Передача ресурсов</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute right-6 p-2 text-white/30 hover:text-white transition-colors group"
                    >
                        <X size={24} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                <div className="p-8 relative z-10">
                    <AnimatePresence mode="wait">
                        {successData ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8 relative"
                            >
                                {/* Energy Core Animation */}
                                <div className="relative w-32 h-32 mx-auto mb-10">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            rotate: 360,
                                            opacity: [0.5, 0.8, 0.5]
                                        }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-x-[-20px] inset-y-[-20px] bg-sparta-gold/20 blur-2xl rounded-full"
                                    />
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1, rotate: [0, 720] }}
                                        transition={{ type: "spring", damping: 15 }}
                                        className="w-full h-full rounded-2xl bg-gradient-to-br from-sparta-gold via-yellow-400 to-sparta-gold flex items-center justify-center text-black shadow-[0_0_50px_rgba(212,175,55,0.6)] relative z-10"
                                    >
                                        <Zap size={64} className="animate-pulse" />
                                    </motion.div>

                                    {/* Magic Particles */}
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                y: [0, -150],
                                                x: [0, (i - 6) * 15],
                                                opacity: [0, 1, 0],
                                                scale: [1, 0]
                                            }}
                                            transition={{
                                                duration: 1.5 + Math.random(),
                                                repeat: Infinity,
                                                delay: i * 0.1
                                            }}
                                            className="absolute top-1/2 left-1/2 w-2 h-2 bg-sparta-gold rounded-full"
                                        />
                                    ))}
                                </div>

                                <h3 className="text-3xl font-russo text-white mb-3 tracking-[0.2em] uppercase">УСПЕШНО!</h3>
                                <p className="text-white/60 mb-10 max-w-[280px] mx-auto font-manrope">
                                    {successData.senderId === user?.uid
                                        ? "Ресурсы успешно отправлены вашему соратнику!"
                                        : (successData.type === 'balance'
                                            ? `Вы получили ${successData.amount} ₽ от ${successData.senderName}`
                                            : `Абонемент от ${successData.senderName} теперь ваш!`)}
                                </p>

                                <button
                                    onClick={onClose}
                                    className="w-full py-5 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all uppercase tracking-[0.4em] text-xs border border-white/10"
                                >
                                    ЗАКРЫТЬ
                                </button>
                            </motion.div>
                        ) : mode === 'selection' ? (
                            <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                <div className="grid gap-4">
                                    <button
                                        onClick={() => setMode('send_balance')}
                                        className="group relative flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-sparta-gold/30 transition-all overflow-hidden"
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sparta-gold/20 to-sparta-gold/5 flex items-center justify-center text-sparta-gold group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                                <Wallet size={28} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-bold text-lg">Передать баланс</div>
                                                <div className="text-white/30 text-xs">Поделиться монетами с другом</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/20 group-hover:translate-x-1 group-hover:text-sparta-gold transition-all" />
                                    </button>

                                    <button
                                        onClick={() => setMode('send_subscription')}
                                        className="group relative flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-blue-500/30 transition-all overflow-hidden"
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                                <Calendar size={28} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-bold text-lg">Передать абонемент</div>
                                                <div className="text-white/30 text-xs">Перенести план на другой аккаунт</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-white/20 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
                                    </button>

                                    <div className="flex items-center gap-4 my-4">
                                        <div className="h-px bg-white/5 flex-1" />
                                        <div className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">ИЛИ</div>
                                        <div className="h-px bg-white/5 flex-1" />
                                    </div>

                                    <button
                                        onClick={initScanner}
                                        className="group relative flex items-center justify-between p-7 bg-gradient-to-br from-sparta-gold/10 to-transparent border border-sparta-gold/20 rounded-3xl hover:from-sparta-gold/20 transition-all shadow-[0_0_20px_rgba(212,175,55,0.05)]"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-2xl bg-sparta-gold flex items-center justify-center text-black group-hover:rotate-6 transition-transform shadow-[0_10px_30px_rgba(212,175,55,0.3)]">
                                                <Camera size={32} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-black text-xl tracking-wide">СКАНИРОВАТЬ QR-КОД</div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        ) : mode === 'send_balance' ? (
                            <motion.div key="send_balance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <div className="mb-8">
                                    <div className="text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 text-center">Сумма перевода</div>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0 ₽"
                                            className="w-full bg-white/5 border border-white/10 rounded-[32px] p-8 text-4xl font-russo text-sparta-gold focus:outline-none focus:border-sparta-gold/50 transition-all text-center tracking-tighter shadow-inner"
                                        />
                                        <div className="absolute inset-0 rounded-[32px] bg-sparta-gold/5 blur opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                                    </div>
                                    <div className="mt-6 flex justify-center gap-3">
                                        {[100, 500, 1000].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setAmount(val.toString())}
                                                className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white/50 hover:text-sparta-gold hover:bg-white/10 hover:border-sparta-gold/30 transition-all"
                                            >
                                                +{val} ₽
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {error && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                                        <AlertCircle size={18} />
                                        {error}
                                    </motion.div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setMode('selection')}
                                        className="flex-1 py-5 bg-white/5 text-white/40 font-bold rounded-2xl hover:text-white transition-all uppercase tracking-widest text-xs"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleSendBalance}
                                        disabled={isProcessing}
                                        className="flex-[2] py-5 bg-sparta-gold text-black font-black rounded-2xl hover:bg-yellow-500 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-[0_20px_40px_rgba(212,175,55,0.2)] disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                        ПОДТВЕРДИТЬ
                                    </button>
                                </div>
                            </motion.div>
                        ) : mode === 'send_subscription' ? (
                            <motion.div key="send_sub" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                {userProfile?.subscription ? (
                                    <div className="mb-8 p-8 bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/20 rounded-[40px] relative overflow-hidden group">
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                                            transition={{ duration: 4, repeat: Infinity }}
                                            className="absolute inset-0 bg-blue-500/10 blur-3xl"
                                        />
                                        <div className="relative z-10 text-center">
                                            <div className="text-blue-400 font-russo text-2xl mb-2 tracking-wide uppercase">{userProfile.subscription.title}</div>
                                            <div className="text-white/40 text-xs mb-6 font-bold uppercase tracking-widest">Передача абонемента</div>
                                            <div className="h-px bg-white/10 w-12 mx-auto mb-6" />
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                                                <span className="text-green-500 font-bold text-[10px] uppercase tracking-[0.3em]">АКТИВЕН</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-white/20 italic font-russo tracking-widest uppercase">НЕТ АБОНЕМЕНТА</div>
                                )}

                                {error && (
                                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setMode('selection')}
                                        className="flex-1 py-5 bg-white/5 text-white/40 font-bold rounded-2xl hover:text-white transition-all uppercase tracking-widest text-xs"
                                    >
                                        Назад
                                    </button>
                                    <button
                                        onClick={handleSendSubscription}
                                        disabled={isProcessing || !userProfile?.subscription}
                                        className="flex-[2] py-5 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-400 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-[0_20px_40px_rgba(59,130,246,0.2)] disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                        ПОДТВЕРДИТЬ
                                    </button>
                                </div>
                            </motion.div>
                        ) : mode === 'qr_display' ? (
                            <motion.div
                                key="qr"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                                transition={{ duration: 0.6 }}
                                className="text-center"
                            >
                                <div className="p-8 bg-white rounded-[48px] inline-block shadow-[0_40px_80px_rgba(0,0,0,0.5)] mb-8 relative">
                                    <motion.div
                                        animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -inset-1 bg-sparta-gold rounded-[56px] -z-10 blur-2xl"
                                    />
                                    <QRCodeSVG
                                        value={`sparta_transfer:${transferId}`}
                                        size={220}
                                        level="H"
                                        includeMargin
                                    />
                                </div>

                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 mb-8 max-w-[280px] mx-auto">
                                    <p className="text-sparta-gold font-russo mb-2 uppercase tracking-[0.2em]">ОЖИДАНИЕ ПРИЕМА</p>
                                    <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest leading-relaxed">
                                        Поднесите телефон получателя к этому экрану
                                    </p>
                                </div>

                                <div className="flex justify-center gap-2 mb-8">
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ opacity: [0.2, 1, 0.2] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                                            className="w-2 h-2 rounded-full bg-sparta-gold shadow-[0_0_10px_#D4AF37]"
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={() => setMode('selection')}
                                    className="w-full py-4 text-white/20 font-bold hover:text-white transition-colors uppercase tracking-[0.3em] text-[10px]"
                                >
                                    ОТМЕНИТЬ ПЕРЕДАЧУ
                                </button>
                            </motion.div>
                        ) : mode === 'receive_scan' && (
                            <motion.div key="receive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                                {/* Scanner Container */}
                                <div className="aspect-square bg-[#050505] rounded-[40px] border border-white/20 overflow-hidden relative mb-8 shadow-2xl">
                                    <div id="reader" className="w-full h-full [&_video]:object-cover" />

                                    {/* Initialization state overlay */}
                                    {isScannerInitializing && (
                                        <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 rounded-full border-2 border-sparta-gold/20 border-t-sparta-gold animate-spin" />
                                                <p className="text-white/40 text-[10px] uppercase font-russo tracking-[0.2em]">ЗАПУСК КАМЕРЫ</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Scan Overlay Overlay (Minimalist) */}
                                    <AnimatePresence>
                                        {isAbsorbing && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl"
                                            >
                                                <div className="relative">
                                                    <motion.div
                                                        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                                                        transition={{ duration: 0.5, repeat: Infinity }}
                                                    >
                                                        <Sparkles className="text-sparta-gold w-16 h-16" />
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Traditional Scan UI */}
                                    {!isAbsorbing && (
                                        <>
                                            {/* Camera Controls Overlay */}
                                            <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-30">
                                                <button
                                                    onClick={toggleCamera}
                                                    className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all hover:bg-black/80"
                                                >
                                                    <SwitchCamera size={20} />
                                                </button>
                                                {hasTorch && (
                                                    <button
                                                        onClick={toggleTorch}
                                                        className={`w-12 h-12 rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-95 transition-all ${isTorchOn ? 'bg-sparta-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.5)]' : 'bg-black/60 text-white'}`}
                                                    >
                                                        {isTorchOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                                                {/* Darkened edges */}
                                                <div className="absolute inset-0 bg-black/40" />

                                                {/* Central Scanning Box */}
                                                <div className="w-[75%] aspect-square border border-white/20 rounded-3xl relative bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                                                    {/* Corner Accents - Solid and Professional */}
                                                    {[0, 90, 180, 270].map(rot => (
                                                        <div
                                                            key={rot}
                                                            className="absolute w-12 h-12 border-t-[4px] border-l-[4px] border-sparta-gold"
                                                            style={{
                                                                top: rot < 180 ? -2 : 'auto',
                                                                bottom: rot >= 180 ? -2 : 'auto',
                                                                left: (rot === 0 || rot === 270) ? -2 : 'auto',
                                                                right: (rot === 90 || rot === 180) ? -2 : 'auto',
                                                                borderRadius: rot === 0 ? '12px 0 0 0' : rot === 90 ? '0 12px 0 0' : rot === 180 ? '0 0 12px 0' : '0 0 0 12px',
                                                                transform: `rotate(${rot === 90 ? 90 : rot === 180 ? 180 : rot === 270 ? 270 : 0}deg)`
                                                            }}
                                                        />
                                                    ))}

                                                    {/* Central Indicator */}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-sparta-gold/40" />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {isProcessing && !isAbsorbing && (
                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-40 backdrop-blur-sm">
                                            <div className="w-16 h-16 rounded-full border-4 border-sparta-gold/20 border-t-sparta-gold animate-spin mb-2" />
                                            <p className="text-white font-russo uppercase tracking-[0.3em] animate-pulse">ТРАНЗАКЦИЯ...</p>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center">
                                    {error ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col gap-2 text-red-500 text-xs mb-6 mx-auto max-w-[300px]"
                                        >
                                            <div className="flex items-center justify-center gap-2 font-bold">
                                                <AlertCircle size={16} />
                                                <span>ОШИБКА ПЕРЕДАЧИ</span>
                                            </div>
                                            <p className="text-white/60 leading-relaxed font-manrope">{error}</p>
                                        </motion.div>
                                    ) : (
                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.2em] mb-8">
                                            Поднесите телефон вплотную к QR-коду
                                        </p>
                                    )}
                                    <button
                                        onClick={() => {
                                            stopScanner();
                                            setMode('selection');
                                        }}
                                        className="w-full py-5 bg-white/5 text-white/60 font-bold rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                                    >
                                        Назад к выбору
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Magic Bar */}
                <div className="px-8 py-5 bg-gradient-to-t from-white/10 to-transparent border-t border-white/5 relative overflow-hidden">
                    <motion.div
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sparta-gold to-transparent opacity-50"
                    />
                    <div className="flex items-center justify-center gap-3 text-[10px] text-white/30 uppercase font-black tracking-[0.4em]">
                        <div className="w-1 h-1 rounded-full bg-sparta-gold shadow-[0_0_5px_#D4AF37]" />
                        SPARTA TRANSFER
                        <div className="w-1 h-1 rounded-full bg-sparta-gold shadow-[0_0_5px_#D4AF37]" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
