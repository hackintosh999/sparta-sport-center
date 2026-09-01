import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, User, Calendar, Shield, Clock, Search,
    Smartphone, QrCode, MapPin, AlertTriangle, Snowflake, Check,
    Flame, Sparkles, RefreshCw, X, FileText
} from 'lucide-react';
import QRScanner from '../../components/admin/QRScanner';
import { format } from 'date-fns';
import { SPARTA_LOCATIONS, CITIES } from '../../constants/cities';

const AdminScanner = () => {
    const [scanResult, setScanResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(true);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('newton');
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

    const handleScanSuccess = async (decodedText: string) => {
        setIsScannerOpen(false);
        setLoading(true);
        setError(null);
        setScanResult(null);
        setActionSuccessMsg(null);

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
                // Regular User / Child Pass (UID)
                const userRef = doc(db, "users", decodedText);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = {
                        type: 'user',
                        id: userSnap.id,
                        ...userSnap.data()
                    };
                    setScanResult(userData);
                } else {
                    setError("Спортсмен не найден в базе данных");
                }
            }
        } catch (err) {
            console.error("Scan Error:", err);
            setError("Ошибка при проверке QR-кода");
        } finally {
            setLoading(false);
        }
    };

    // Mark attendance with exact status (PRESENT, MISSED_BURNT, EXCUSED)
    const handleMarkAttendance = async (status: 'PRESENT' | 'MISSED_BURNT' | 'EXCUSED') => {
        if (!scanResult || scanResult.type !== 'user') return;
        setActionLoading(true);
        setActionSuccessMsg(null);

        try {
            const dateStr = format(new Date(), 'yyyy-MM-dd');
            const groupId = scanResult.groupId || 'group_general';
            const docId = `${groupId}_${dateStr}`;
            const docRef = doc(db, "attendance", docId);

            // 1. Record in attendance collection
            const docSnap = await getDoc(docRef);
            let currentRecords = {};
            if (docSnap.exists()) {
                currentRecords = docSnap.data().records || {};
            }

            const newRecord = {
                status: status.toLowerCase(),
                extendedStatus: status,
                childName: scanResult.childName || scanResult.displayName || 'Спортсмен',
                checkInTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                branchId: selectedBranchId,
                markedBy: 'coach_scanner'
            };

            await setDoc(docRef, {
                groupId: groupId,
                date: dateStr,
                records: {
                    ...currentRecords,
                    [scanResult.id]: newRecord
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 2. Decrement subscription remaining sessions if PRESENT or MISSED_BURNT
            const currentSub = scanResult.subscription;
            let updatedRemaining = currentSub?.remainingSessions;

            if (status === 'PRESENT' || status === 'MISSED_BURNT') {
                if (typeof currentSub?.remainingSessions === 'number') {
                    updatedRemaining = Math.max(0, currentSub.remainingSessions - 1);
                    await updateDoc(doc(db, "users", scanResult.id), {
                        'subscription.remainingSessions': updatedRemaining,
                        'subscription.lastAttendedAt': serverTimestamp()
                    });
                }
            } else if (status === 'EXCUSED') {
                // If excused by medical note, don't decrement sessions, optionally extend subscription by 1 day
                if (currentSub?.expiresAt) {
                    const currentExp = currentSub.expiresAt.toDate
                        ? currentSub.expiresAt.toDate()
                        : new Date((currentSub.expiresAt.seconds || Date.now() / 1000) * 1000);
                    const extendedExp = new Date(currentExp.getTime() + 24 * 60 * 60 * 1000);
                    await updateDoc(doc(db, "users", scanResult.id), {
                        'subscription.expiresAt': Timestamp.fromDate(extendedExp),
                        'subscription.lastExcusedAt': serverTimestamp()
                    });
                }
            }

            // Update local state
            setScanResult((prev: any) => ({
                ...prev,
                subscription: prev.subscription ? {
                    ...prev.subscription,
                    remainingSessions: updatedRemaining
                } : prev.subscription
            }));

            const statusText = status === 'PRESENT' ? '🟢 Посещение зачтено (-1 зан.)'
                : status === 'EXCUSED' ? '🟡 Справка зафиксирована (баланс сохранен)'
                : '🔴 Прогул зафиксирован (занятие списано)';
            setActionSuccessMsg(statusText);
        } catch (err: any) {
            console.error("Attendance mark error:", err);
            alert("Ошибка при сохранении отметки: " + err.message);
        } finally {
            setActionLoading(false);
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

    const selectedBranch = SPARTA_LOCATIONS.find(l => l.id === selectedBranchId);
    const sub = scanResult?.subscription;
    const isFrozen = sub?.isFrozen || sub?.status === 'FROZEN';
    const isBranchMismatch = sub?.branchId && sub.branchId !== 'all' && !sub.isUniversal && sub.branchId !== selectedBranchId;
    const isExpired = sub?.expiresAt && (new Date((sub.expiresAt.seconds || sub.expiresAt._seconds || 0) * 1000) < new Date());
    const isOutOfSessions = sub?.type === 'sessions' && typeof sub?.remainingSessions === 'number' && sub.remainingSessions <= 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 font-manrope text-white pb-16">
            {/* Top Header & Branch Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 rounded-xl bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20">
                            <QrCode size={20} />
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-russo uppercase tracking-wider">
                            QR Сканер Тренера
                        </h2>
                    </div>
                    <p className="text-white/40 text-xs">
                        Чек-ин спортсменов, валидация абонементов по филиалам и списание занятий
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Location selector */}
                    <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-2xl px-3.5 py-2">
                        <MapPin size={16} className="text-sparta-gold shrink-0" />
                        <div className="text-left">
                            <span className="text-[9px] uppercase font-bold text-white/40 block leading-none">Текущий зал</span>
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                            >
                                {SPARTA_LOCATIONS.map(l => (
                                    <option key={l.id} value={l.id} className="bg-zinc-900 text-white">
                                        {l.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!isScannerOpen && (
                        <button
                            onClick={() => {
                                setScanResult(null);
                                setError(null);
                                setActionSuccessMsg(null);
                                setIsScannerOpen(true);
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-sparta-gold to-yellow-500 text-black font-russo uppercase text-xs rounded-2xl hover:brightness-110 shadow-lg shadow-sparta-gold/20 transition-all flex items-center gap-2 cursor-pointer font-black"
                        >
                            <QrCode size={16} />
                            <span>Сканировать</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Scanner Section */}
                <div className="space-y-4">
                    {isScannerOpen ? (
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-sparta-gold to-yellow-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                            <div className="relative bg-zinc-950 border border-white/10 rounded-[2rem] p-4 shadow-2xl">
                                <QRScanner onScanSuccess={handleScanSuccess} />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900/60 border border-white/10 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed aspect-square">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                                <QrCode size={32} />
                            </div>
                            <p className="text-white/40 font-bold uppercase text-[11px] tracking-widest">
                                Сканер в режиме ожидания
                            </p>
                            <button
                                onClick={() => {
                                    setScanResult(null);
                                    setError(null);
                                    setActionSuccessMsg(null);
                                    setIsScannerOpen(true);
                                }}
                                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                                Активировать камеру
                            </button>
                        </div>
                    )}
                </div>

                {/* Result Section */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-zinc-900 border border-white/10 rounded-[2rem] p-12 text-center"
                            >
                                <div className="w-12 h-12 border-4 border-sparta-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-white font-bold uppercase text-xs tracking-widest">Проверка данных спортсмена...</p>
                            </motion.div>
                        )}

                        {error && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="bg-red-500/10 border border-red-500/30 rounded-[2rem] p-8 text-center space-y-4"
                            >
                                <XCircle size={48} className="text-red-400 mx-auto" />
                                <h3 className="text-xl font-russo text-white uppercase">Ошибка сканирования</h3>
                                <p className="text-white/70 text-xs">{error}</p>
                            </motion.div>
                        )}

                        {scanResult && !loading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="bg-zinc-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative"
                            >
                                {/* Header Status Ribbon */}
                                <div className={`p-5 text-center transition-all ${
                                    isFrozen
                                        ? 'bg-cyan-500/20 text-cyan-300 border-b border-cyan-500/30'
                                        : isExpired || isOutOfSessions
                                        ? 'bg-amber-500/20 text-amber-300 border-b border-amber-500/30'
                                        : isBranchMismatch
                                        ? 'bg-orange-500/20 text-orange-300 border-b border-orange-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                                }`}>
                                    <div className="flex flex-col items-center gap-1">
                                        {isFrozen ? (
                                            <div className="flex items-center gap-2">
                                                <Snowflake size={20} className="animate-pulse text-cyan-300" />
                                                <span className="font-russo uppercase text-xs tracking-wider">
                                                    Абонемент Заморожен
                                                </span>
                                            </div>
                                        ) : isExpired ? (
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={20} className="text-amber-300" />
                                                <span className="font-russo uppercase text-xs tracking-wider">
                                                    Срок Абонемента Истёк
                                                </span>
                                            </div>
                                        ) : isOutOfSessions ? (
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={20} className="text-amber-300" />
                                                <span className="font-russo uppercase text-xs tracking-wider">
                                                    Занятия Исчерпаны (0 шт.)
                                                </span>
                                            </div>
                                        ) : isBranchMismatch ? (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={20} className="text-orange-300" />
                                                <span className="font-russo uppercase text-xs tracking-wider">
                                                    Филиал Не Совпадает ({sub?.branchName})
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={20} className="text-emerald-400" />
                                                <span className="font-russo uppercase text-xs tracking-wider">
                                                    Абонемент Действителен
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 sm:p-7 space-y-6">
                                    {/* Athlete Card */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {scanResult.photoURL || scanResult.avatarUrl ? (
                                                <img src={scanResult.photoURL || scanResult.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={30} className="text-white/30" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-russo text-white uppercase">
                                                {scanResult.type === 'guest' ? 'Гостевой визит' : (scanResult.childName || scanResult.firstName || 'Юный спортсмен')}
                                            </h3>
                                            <p className="text-sparta-gold font-bold text-xs uppercase tracking-widest mt-0.5">
                                                {scanResult.type === 'guest' ? scanResult.id : (sub?.title || 'Без абонемента')}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                        {/* Remaining sessions */}
                                        <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 col-span-2 sm:col-span-1">
                                            <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                                <Flame size={13} className="text-sparta-gold" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Остаток</span>
                                            </div>
                                            <p className="text-white font-russo text-base">
                                                {sub?.totalSessions ? (
                                                    <span className="text-sparta-gold">
                                                        {sub.remainingSessions ?? sub.totalSessions} / {sub.totalSessions}
                                                    </span>
                                                ) : 'Безлимит'}
                                            </p>
                                        </div>

                                        {/* Branch */}
                                        <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
                                            <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                                <MapPin size={13} className="text-sparta-gold" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Зал абонемента</span>
                                            </div>
                                            <p className="text-white text-xs font-bold truncate">
                                                {sub?.branchName || (sub?.isUniversal ? 'Все залы' : 'Не указан')}
                                            </p>
                                        </div>

                                        {/* Expiry */}
                                        <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5">
                                            <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                                <Calendar size={13} className="text-sparta-gold" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Срок действия</span>
                                            </div>
                                            <p className="text-white text-xs font-bold">
                                                {sub?.expiresAt ? new Date((sub.expiresAt.seconds || sub.expiresAt._seconds || Date.now() / 1000) * 1000).toLocaleDateString('ru-RU') : 'Бессрочно'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action success alert */}
                                    {actionSuccessMsg && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs text-center"
                                        >
                                            {actionSuccessMsg}
                                        </motion.div>
                                    )}

                                    {/* Attendance Decision Buttons for Coach */}
                                    {scanResult.type === 'user' && (
                                        <div className="space-y-2 pt-2 border-t border-white/10">
                                            <div className="text-[10px] uppercase font-bold text-white/40 mb-2 tracking-wider">
                                                Отметка посещения на занятии ({format(new Date(), 'dd.MM.yyyy')}):
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => handleMarkAttendance('PRESENT')}
                                                    disabled={actionLoading}
                                                    className="py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-russo uppercase text-[11px] flex items-center justify-center gap-1.5 transition-all font-bold shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                                                >
                                                    <Check size={15} />
                                                    <span>Был (-1 зан.)</span>
                                                </button>

                                                <button
                                                    onClick={() => handleMarkAttendance('EXCUSED')}
                                                    disabled={actionLoading}
                                                    className="py-3 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-russo uppercase text-[11px] flex items-center justify-center gap-1.5 transition-all font-bold cursor-pointer disabled:opacity-50"
                                                    title="Уважительная причина (болезнь/справка). Занятие НЕ списывается"
                                                >
                                                    <FileText size={15} />
                                                    <span>Справка (0 зан.)</span>
                                                </button>

                                                <button
                                                    onClick={() => handleMarkAttendance('MISSED_BURNT')}
                                                    disabled={actionLoading}
                                                    className="py-3 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-russo uppercase text-[11px] flex items-center justify-center gap-1.5 transition-all font-bold cursor-pointer disabled:opacity-50"
                                                    title="Прогул без предупреждения. Занятие сгорает (-1 зан.)"
                                                >
                                                    <X size={15} />
                                                    <span>Прогул (-1 зан.)</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button for Guest Pass */}
                                    {scanResult.type === 'guest' && scanResult.status === 'active' && (
                                        <button
                                            onClick={handleConsumePass}
                                            disabled={loading}
                                            className="w-full py-4 bg-sparta-gold text-black font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-yellow-500 shadow-lg shadow-sparta-gold/20 transition-all transform active:scale-95 cursor-pointer"
                                        >
                                            Списать гостевой билет
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {!scanResult && !loading && !error && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 border border-white/10 rounded-[2rem] bg-zinc-900/60">
                                <Search size={48} className="text-white/10 mb-4" />
                                <p className="text-white/40 text-xs font-medium">
                                    Наведите камеру на QR-код спортсмена или гостя для проверки
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AdminScanner;