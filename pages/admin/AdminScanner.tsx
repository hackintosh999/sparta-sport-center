import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, User, Calendar, Shield, Clock, Search, Smartphone, QrCode } from 'lucide-react';
import QRScanner from '../../components/admin/QRScanner';
import { format } from 'date-fns';

const AdminScanner = () => {
    const [scanResult, setScanResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(true);

    const markUserAsPresent = async (user: any) => {
        if (!user.groupId) return;

        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const docId = `${user.groupId}_${dateStr}`;
        const docRef = doc(db, "attendance", docId);

        try {
            const docSnap = await getDoc(docRef);
            let currentRecords = {};
            if (docSnap.exists()) {
                currentRecords = docSnap.data().records || {};
            }

            const currentRecord = currentRecords[user.id];
            const currentStatus = typeof currentRecord === 'string' ? currentRecord : currentRecord?.status;

            if (currentStatus !== 'present') {
                const newRecords = {
                    ...currentRecords,
                    [user.id]: {
                        status: 'present',
                        note: 'QR-сканер',
                        checkInTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                    }
                };

                await setDoc(docRef, {
                    groupId: user.groupId,
                    date: dateStr,
                    records: newRecords,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                console.log(`Attendance marked for ${user.id} in group ${user.groupId}`);
            }
        } catch (err) {
            console.error("Auto-attendance error:", err);
        }
    };

    const handleScanSuccess = async (decodedText: string) => {
        setIsScannerOpen(false);
        setLoading(true);
        setError(null);
        setScanResult(null);

        try {
            if (decodedText.startsWith('GUEST-')) {
                // Format: GUEST-USERUID_SHORT-INDEX
                const passRef = doc(db, "guest_passes", decodedText);
                const passSnap = await getDoc(passRef);

                if (passSnap.exists()) {
                    setScanResult({
                        type: 'guest',
                        id: decodedText,
                        ...passSnap.data()
                    });
                } else {
                    // Lazy create if it doesn't exist yet but valid format
                    const parts = decodedText.split('-');
                    if (parts.length === 3) {
                        const newPass = {
                            id: decodedText,
                            status: 'active',
                            createdAt: serverTimestamp()
                        };
                        await setDoc(passRef, newPass);
                        setScanResult({
                            type: 'guest',
                            ...newPass
                        });
                    } else {
                        setError("Неверный формат гостевого билета");
                    }
                }
            } else {
                // Regular User Pass (UID)
                const userRef = doc(db, "users", decodedText);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = {
                        type: 'user',
                        id: userSnap.id,
                        ...userSnap.data()
                    };
                    setScanResult(userData);

                    // AUTO ATTENDANCE MARKING
                    await markUserAsPresent(userData);
                } else {
                    setError("Пользователь не найден");
                }
            }
        } catch (err) {
            console.error("Scan Error:", err);
            setError("Ошибка при проверке кода");
        } finally {
            setLoading(false);
        }
    };

    const handleConsumePass = async () => {
        if (!scanResult || scanResult.type !== 'guest' || scanResult.status !== 'active') return;

        setLoading(true);
        try {
            await updateDoc(doc(db, "guest_passes", scanResult.id), {
                status: 'used',
                usedAt: serverTimestamp()
            });
            setScanResult({ ...scanResult, status: 'used', usedAt: new Date() });
            alert("Гостевой билет успешно списан!");
        } catch (err) {
            console.error("Consume Error:", err);
            alert("Ошибка при списании билета");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-russo text-white uppercase tracking-wider">QR Сканер</h2>
                    <p className="text-white/40 text-sm">Проверка гостевых билетов и пропусков</p>
                </div>
                {!isScannerOpen && (
                    <button
                        onClick={() => { setScanResult(null); setError(null); setIsScannerOpen(true); }}
                        className="px-6 py-3 bg-sparta-gold text-black font-black uppercase text-xs rounded-2xl hover:bg-yellow-500 transition-all flex items-center gap-2"
                    >
                        <QrCode size={18} />
                        Сканировать снова
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Scanner Section */}
                <div className="space-y-4">
                    {isScannerOpen ? (
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-sparta-gold to-yellow-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                            <QRScanner onScanSuccess={handleScanSuccess} />
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed aspect-square">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                                <QrCode size={32} />
                            </div>
                            <p className="text-white/20 font-bold uppercase text-[10px] tracking-widest">Сканер готов</p>
                        </div>
                    )}
                </div>

                {/* Result Section */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-white/5 border border-white/10 rounded-[2rem] p-12 text-center"
                            >
                                <div className="w-12 h-12 border-4 border-sparta-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-white font-bold uppercase text-xs tracking-widest">Проверка...</p>
                            </motion.div>
                        )}

                        {error && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 text-center space-y-4"
                            >
                                <XCircle size={48} className="text-red-500 mx-auto" />
                                <h3 className="text-xl font-russo text-white uppercase">Ошибка</h3>
                                <p className="text-white/60 text-sm">{error}</p>
                            </motion.div>
                        )}

                        {scanResult && !loading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative"
                            >
                                {/* Header Status */}
                                <div className={`p-6 text-center ${scanResult.status === 'used' ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    {scanResult.status === 'used' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <XCircle size={32} className="text-red-500" />
                                            <span className="text-red-500 font-black uppercase text-xs tracking-widest">Билет Использован</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle size={32} className="text-green-500" />
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-green-500 font-black uppercase text-xs tracking-widest">Проход Разрешен</span>
                                                {scanResult.type === 'user' && scanResult.groupId && (
                                                    <span className="text-emerald-400/60 font-bold text-[9px] uppercase tracking-tighter bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">Посещение отмечено</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 space-y-6">
                                    {/* User Details */}
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                            {scanResult.photoURL || scanResult.avatarUrl ? (
                                                <img src={scanResult.photoURL || scanResult.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-white/20" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-russo text-white uppercase">
                                                {scanResult.type === 'guest' ? 'Гостевой визит' : (scanResult.childName || scanResult.firstName || 'Клиент')}
                                            </h3>
                                            <p className="text-sparta-gold font-bold text-xs uppercase tracking-widest mt-1">
                                                {scanResult.type === 'guest' ? scanResult.id : (scanResult.subscription?.title || 'Нет подписки')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 text-white/30 mb-1">
                                                <Shield size={14} />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Роль</span>
                                            </div>
                                            <p className="text-white text-sm font-bold capitalize">{scanResult.role || 'user'}</p>
                                        </div>
                                        <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                            <div className="flex items-center gap-2 text-white/30 mb-1">
                                                <Calendar size={14} />
                                                <span className="text-[10px] uppercase font-bold tracking-widest">Срок</span>
                                            </div>
                                            <p className="text-white text-sm font-bold">
                                                {scanResult.subscription?.expiresAt ? new Date(scanResult.subscription.expiresAt.seconds * 1000).toLocaleDateString() : '∞'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button for Guest Pass */}
                                    {scanResult.type === 'guest' && scanResult.status === 'active' && (
                                        <button
                                            onClick={handleConsumePass}
                                            className="w-full py-4 bg-sparta-gold text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-yellow-500 shadow-lg shadow-sparta-gold/20 transition-all transform active:scale-95"
                                        >
                                            Списать билет
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {!scanResult && !loading && !error && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-white/10 rounded-[2rem] bg-white/5">
                                <Search size={48} className="text-white/10 mb-4" />
                                <p className="text-white/30 text-sm font-medium">Ожидание данных...</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AdminScanner;