import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, Phone, Hash, Mail, Trophy, Edit2, Save, Upload, Shirt, Activity, Tag, Loader2, Shield, Dumbbell, Star, BadgeCheck, Code, Users, UserMinus, CheckCircle2, MessageSquare, Trash2, Zap, Award, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, runTransaction, writeBatch, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

interface ProfileViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: any;
}

const ProfileViewModal: React.FC<ProfileViewModalProps> = ({ isOpen, onClose, userData }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'outgoing'>('none');
    const [requestId, setRequestId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        childFirstName: '',
        childLastName: '',
        childAge: '',
        childBirthYear: '',
        parentPhone: '',
        jerseyNumber: '',
        position: 'Нападающий',
        footballPosition: 'Нападающий',
        strongFoot: 'Правша',
        photoURL: ''
    });

    React.useEffect(() => {
        if (userData) {
            setFormData({
                childFirstName: userData.childFirstName || '',
                childLastName: userData.childLastName || '',
                childAge: userData.childAge || '',
                childBirthYear: userData.childBirthYear || '',
                parentPhone: userData.parentPhone || '',
                jerseyNumber: userData.jerseyNumber || '',
                position: userData.footballPosition || userData.position || 'Нападающий',
                footballPosition: userData.footballPosition || userData.position || 'Нападающий',
                strongFoot: userData.strongFoot || 'Правша',
                photoURL: userData.photoURL || ''
            });

            // Check Friend Status
            if (user && userData.id && userData.id !== user.uid) {
                const checkStatus = async () => {
                    if (!user?.uid || !userData?.id) return;
                    try {
                        // Check Relationships
                        const friendshipQuery = query(
                            collection(db, 'friendships'),
                            where('users', 'array-contains', user.uid)
                        );
                        const friendSnap = await getDocs(friendshipQuery);
                        const isFriend = friendSnap.docs.some(d => d.data().users.includes(userData.id));

                        if (isFriend) {
                            setFriendStatus('accepted');
                        } else {
                            // Check Requests
                            const outQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('toId', '==', userData.id), where('status', '==', 'pending'));
                            const inQuery = query(collection(db, 'friend_requests'), where('fromId', '==', userData.id), where('toId', '==', user.uid), where('status', '==', 'pending'));

                            const [outSnap, inSnap] = await Promise.all([getDocs(outQuery), getDocs(inQuery)]);

                            if (!outSnap.empty) {
                                setFriendStatus('outgoing');
                                setRequestId(outSnap.docs[0].id);
                            } else if (!inSnap.empty) {
                                setFriendStatus('pending');
                                setRequestId(inSnap.docs[0].id);
                            } else {
                                setFriendStatus('none');
                            }
                        }
                    } catch (err) {
                        console.error("Profile status error:", err);
                    }
                };
                checkStatus().catch(err => console.error("Friend status error:", err));
            }
        }
    }, [userData, user]);

    // Helper to resize image and convert to Base64
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 0.7 quality
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            const file = e.target.files[0];

            if (file.size > 8 * 1024 * 1024) {
                console.warn("File is too large (max 8 MB)");
                return;
            }

            setUploading(true);
            try {
                // 1. Resize image client-side first (crucial for Base64 fallback)
                const optimizedBase64 = await resizeImage(file);

                try {
                    // 2. Try Firebase Storage Upload
                    const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
                    const uploadPromise = uploadBytes(storageRef, file);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), 3000)
                    );

                    await Promise.race([uploadPromise, timeoutPromise]);
                    const url = await getDownloadURL(storageRef);
                    setFormData(prev => ({ ...prev, photoURL: url }));
                } catch (uploadError) {
                    console.warn("Storage upload failed, falling back to Base64:", uploadError);
                    // 3. Fallback: Use Base64 directly if Storage failed (CORS/Network issues)
                    setFormData(prev => ({ ...prev, photoURL: optimizedBase64 }));
                }
            } catch (error) {
                console.error("Error processing avatar:", error);
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleSave = async () => {
        if (!user) return;

        if (formData.childAge && parseInt(formData.childAge) > 14) {
            console.warn("Our programs are designed for children up to 14 years old.");
            return;
        }

        setLoading(true);
        try {
            const fullName = `${formData.childFirstName} ${formData.childLastName}`.trim();
            const posVal = formData.footballPosition || formData.position || 'Нападающий';
            await updateDoc(doc(db, "users", user.uid), {
                ...formData,
                position: posVal,
                footballPosition: posVal,
                childName: fullName, // Update full name for backward compatibility
                updatedAt: new Date()
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setLoading(false);
        }
    };

    // Promo Code Logic
    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    const handleActivatePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !promoCode.trim()) return;
        setPromoLoading(true);

        try {
            const code = promoCode.toUpperCase().trim();
            const q = query(collection(db, 'promo_codes'), where('code', '==', code));
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("Промокод не найден");
                setPromoLoading(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoRef = doc(db, 'promo_codes', promoDoc.id);

            await runTransaction(db, async (transaction) => {
                // 1. READ all necessary docs first
                const pDoc = await transaction.get(promoRef);
                if (!pDoc.exists()) throw "Code error";
                const pData = pDoc.data();

                // Validation
                if (pData.expiresAt && pData.expiresAt.toDate() < new Date()) throw "Срок действия истек";
                if (pData.maxUses !== -1 && pData.currentUses >= pData.maxUses) throw "Лимит активаций исчерпан";
                if (pData.usersUsed?.includes(user.uid)) throw "Вы уже использовали этот код";

                let userBonusRef: any = null;
                let userRef: any = null;
                let currentUserData: any = null;

                if (pData.type === 'discount') {
                    userBonusRef = doc(db, 'users', user.uid, 'private', 'bonus_state');
                    const uDoc = await transaction.get(userBonusRef);
                    if (uDoc.exists()) {
                        currentUserData = uDoc.data();
                    }
                } else if (pData.type === 'balance') {
                    userRef = doc(db, 'users', user.uid);
                    const uDoc = await transaction.get(userRef);
                    if (uDoc.exists()) {
                        currentUserData = uDoc.data();
                    }
                }

                // 2. WRITE updates
                transaction.update(promoRef, {
                    currentUses: (pData.currentUses || 0) + 1,
                    usersUsed: [...(pData.usersUsed || []), user.uid]
                });

                if (pData.type === 'discount' && userBonusRef) {
                    const newDiscount = {
                        id: `promo_${Date.now()}`,
                        type: 'promo_discount',
                        value: pData.value,
                        code: code,
                        grantedAt: new Date().toISOString()
                    };
                    const existingBonuses = currentUserData?.bonuses || [];
                    transaction.set(userBonusRef, {
                        bonuses: [...existingBonuses, newDiscount]
                    }, { merge: true });
                } else if (pData.type === 'balance' && userRef) {
                    const currentBalance = currentUserData?.walletBalance || 0;
                    transaction.set(userRef, {
                        walletBalance: currentBalance + (pData.value || 0)
                    }, { merge: true });
                }
            });

            // 3. Log Activation for Admin History
            await addDoc(collection(db, 'promo_activations'), {
                userId: user.uid,
                promoId: promoDoc.id,
                code: code,
                type: promoDoc.data().type,
                value: promoDoc.data().value,
                timestamp: serverTimestamp()
            });

            if (promoDoc.data().type === 'discount') {
                alert(`Скидка ${promoDoc.data().value}% получена! Проверьте ваши бонусы.`);
            } else if (promoDoc.data().type === 'balance') {
                alert(`Ваш баланс пополнен на ${promoDoc.data().value}₽!`);
            } else {
                alert(`Промокод активирован!`);
            }
            setPromoCode('');
        } catch (error: any) {
            console.error("Promo Activation Error:", error);
            const msg = typeof error === 'string' ? error : (error?.message || "Неизвестная ошибка активации");
            alert(`Ошибка: ${msg}`);
        }
        setPromoLoading(false);
    };

    // Revoke Achievement Logic
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [revokeId, setRevokeId] = useState<string | null>(null);
    const [revokeReason, setRevokeReason] = useState('');

    const handleRevokeAchievement = async () => {
        if (!revokeId || !userData) return;
        setLoading(true);

        try {
            const batch = writeBatch(db);
            const userRef = doc(db, "users", userData.id);

            // 1. Remove Achievement from array
            const updatedAchievements = userData.achievements.filter((a: any) => a.id !== revokeId);
            batch.update(userRef, { achievements: updatedAchievements });

            // 2. Notification (Optional)
            if (revokeReason.trim() && userData.email) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: userData.id,
                    email: userData.email,
                    title: "Награда отозвана 😔",
                    message: `Ваша награда была отозвана администратором. Причина: ${revokeReason}`,
                    isRead: false,
                    type: 'alert',
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();
            // alert("Награда отозвана"); // Silent success is better for UX here, or use toast if available
            setIsRevokeModalOpen(false);
            setRevokeId(null);
            setRevokeReason('');
            onClose(); // Close main modal to refresh data
        } catch (error) {
            console.error(error);
            alert("Ошибка при отзыве");
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async () => {
        if (!user || !userData) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'friend_requests'), {
                fromId: user.uid,
                toId: userData.id || userData.uid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setFriendStatus('outgoing');
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleAcceptFriend = async () => {
        if (!user || !userData || !requestId) return;
        setLoading(true);
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'friend_requests', requestId), { status: 'accepted' });
            batch.set(doc(collection(db, 'friendships')), {
                users: [user.uid, userData.id || userData.uid],
                createdAt: serverTimestamp()
            });
            await batch.commit();
            setFriendStatus('accepted');
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleUnfriend = async () => {
        const targetId = userData.id || userData.uid;
        if (!user || !targetId || !window.confirm("Удалить из друзей?")) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
            const snap = await getDocs(q);
            const docToDelete = snap.docs.find(d => d.data().users.includes(targetId));
            if (docToDelete) await deleteDoc(docToDelete.ref);
            setFriendStatus('none');
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleCancelRequest = async () => {
        if (!requestId) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'friend_requests', requestId));
            setFriendStatus('none');
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#15171C] rounded-3xl w-full max-w-lg overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] pointer-events-auto relative max-h-[90vh] flex flex-col">
                            {/* Top Header Actions */}
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                                {(!isEditing && userData?.id === user?.uid) && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 text-white/40 hover:text-sparta-gold transition-colors rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10">
                                    <X size={20} />
                                </button>
                            </div>

                            {userData ? (() => {
                                const displayName = `${userData.childFirstName || ''} ${userData.childLastName || ''}`.trim() || userData.childName || userData.full_name || userData.displayName || userData.name || 'Атлет Спарта';
                                const roleBadge = (() => {
                                    switch (userData.role) {
                                        case 'admin': return { text: '🛡️ Админ', emoji: '🛡️', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
                                        case 'trainer':
                                        case 'coach': return { text: '👨‍🏫 Тренер', emoji: '👨‍🏫', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
                                        case 'developer': return { text: '💻 Разработчик', emoji: '💻', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
                                        case 'director': return { text: '👑 Директор', emoji: '👑', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
                                        default: return { text: '⚽ Атлет', emoji: '⚽', bg: 'bg-sparta-gold/10 text-sparta-gold border-sparta-gold/30' };
                                    }
                                })();
                                const getInitials = (n?: string) => {
                                    if (!n || typeof n !== 'string') return roleBadge.emoji;
                                    const clean = n.trim().replace(/^undefined\s*|undefined$/i, '');
                                    if (!clean || clean.toUpperCase().includes('UNDEFINED')) return roleBadge.emoji;
                                    const parts = clean.split(/\s+/).filter(Boolean);
                                    if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
                                        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                                    }
                                    if (parts.length === 1 && parts[0].length > 0) {
                                        return parts[0].slice(0, 2).toUpperCase();
                                    }
                                    return roleBadge.emoji;
                                };
                                const getPosBadge = (pos?: string) => {
                                    if (!pos) return null;
                                    const p = pos.toLowerCase();
                                    if (p.includes('вратар')) return { text: 'Вратарь', emoji: '🧤', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
                                    if (p.includes('защитн')) return { text: 'Защитник', emoji: '🛡️', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
                                    if (p.includes('полузащитн')) return { text: 'Полузащитник', emoji: '🏃', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
                                    if (p.includes('нападающ')) return { text: 'Нападающий', emoji: '⚽', bg: 'bg-red-500/10 text-red-400 border-red-500/30' };
                                    return { text: pos, emoji: '⚽', bg: 'bg-white/10 text-white/80 border-white/20' };
                                };
                                const isAthlete = !userData?.role || ['athlete', 'user', 'student'].includes(userData.role);
                                const posBadge = (isAthlete && (userData.footballPosition || userData.position)) ? getPosBadge(userData.footballPosition || userData.position) : null;
                                const avatarSrc = formData.photoURL || userData.photoURL || userData.avatarUrl;

                                return (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {/* HERO HEADER SECTION */}
                                        <div className="relative bg-gradient-to-b from-sparta-gold/25 via-[#15171C]/90 to-[#15171C] pt-10 pb-6 px-6 border-b border-white/10 text-center flex flex-col items-center">
                                            {/* Avatar Container with Overlapped Online Badge */}
                                            <div className="relative group mb-3">
                                                <div className="w-24 h-24 rounded-full bg-black/50 border-2 border-sparta-gold/50 shadow-[0_0_30px_rgba(255,184,0,0.2)] overflow-hidden flex items-center justify-center">
                                                    {avatarSrc ? (
                                                        <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-russo text-2xl text-sparta-gold uppercase">
                                                            {getInitials(displayName)}
                                                        </span>
                                                    )}
                                                </div>
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Upload size={20} className="text-white" />
                                                    </button>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    accept="image/*"
                                                />
                                                {userData.isOnline && (
                                                    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#15171C] shadow-[0_0_10px_#22c55e] animate-pulse" title="В сети" />
                                                )}
                                                {userData.verification?.isVerified && (
                                                    <span className="absolute top-0 right-0 bg-sparta-gold text-black rounded-full p-1 border border-black shadow" title="Подтвержденный профиль">
                                                        <BadgeCheck size={12} />
                                                    </span>
                                                )}
                                            </div>

                                            {/* Full Name */}
                                            <h3 className="text-2xl font-russo text-white uppercase tracking-tight flex items-center gap-2 justify-center">
                                                {displayName}
                                            </h3>

                                            {/* Role & Position Badges */}
                                            <div className="mt-2.5 flex items-center gap-2 flex-wrap justify-center">
                                                <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-sm ${roleBadge.bg}`}>
                                                    {roleBadge.text}
                                                </span>
                                                {posBadge && (
                                                    <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-sm ${posBadge.bg}`}>
                                                        <span>{posBadge.emoji}</span>
                                                        <span>{posBadge.text}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ROLE-ADAPTIVE BODY CONTENT */}
                                        <div className="p-6 space-y-4 font-manrope">

                                            {/* ATHLETE BODY CONTENT */}
                                            {!['admin', 'trainer', 'coach', 'director', 'developer'].includes(userData?.role) && (
                                                <>
                                                    {/* Football Data Grid */}
                                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
                                                        <div className="flex items-center gap-2 text-sparta-gold pb-2 border-b border-white/5">
                                                            <Activity size={16} />
                                                            <h4 className="text-xs font-russo uppercase tracking-wider text-white">Футбольные данные</h4>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            {/* Jersey Number */}
                                                            {userData.jerseyNumber && (
                                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5 relative overflow-hidden">
                                                                    <Shirt className="absolute -right-2 -bottom-2 text-white/5 w-12 h-12 rotate-12" />
                                                                    <p className="text-[10px] text-white/40 uppercase mb-0.5 font-bold">Игровой номер</p>
                                                                    <p className="text-sparta-gold font-russo text-xl tracking-wider">#{userData.jerseyNumber}</p>
                                                                </div>
                                                            )}

                                                            {/* Position */}
                                                            {posBadge && (
                                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[10px] text-white/40 uppercase mb-0.5 font-bold">Позиция</p>
                                                                    <p className="text-white font-bold text-sm flex items-center gap-1">
                                                                        <span>{posBadge.emoji}</span> <span>{posBadge.text}</span>
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Age / Birth Year (Hide cleanly if missing) */}
                                                            {(userData.childAge || userData.childBirthYear) && (
                                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[10px] text-white/40 uppercase mb-0.5 font-bold">Возраст</p>
                                                                    <p className="text-white font-bold text-sm">
                                                                        {userData.childAge ? `${userData.childAge} лет` : ''} {userData.childBirthYear ? `(${userData.childBirthYear} г.р.)` : ''}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Group Tag (Hide cleanly if missing) */}
                                                            {(userData.groupName || userData.group || userData.groupId) && (
                                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[10px] text-white/40 uppercase mb-0.5 font-bold">Группа</p>
                                                                    <p className="text-sparta-gold font-bold text-xs truncate">
                                                                        {userData.groupName || userData.group || 'Группа Спарта'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Gamification Level & XP Progress */}
                                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-russo uppercase text-sparta-gold flex items-center gap-1.5">
                                                                <Zap size={14} className="animate-pulse" />
                                                                Уровень {userData.level || Math.floor((userData.xp || 120) / 100) + 1}
                                                            </span>
                                                            <span className="text-white/60 font-mono text-[11px] font-bold">
                                                                {userData.xp || 120} / {((Math.floor((userData.xp || 120) / 100) + 1) * 100)} XP
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                                            <div
                                                                className="bg-gradient-to-r from-yellow-500 to-sparta-gold h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,184,0,0.5)]"
                                                                style={{ width: `${Math.min(100, Math.max(10, ((userData.xp || 120) % 100)))}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Achievements Showcase (Only if present) */}
                                                    {userData.achievements && Array.isArray(userData.achievements) && userData.achievements.length > 0 && (
                                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
                                                            <h4 className="text-xs font-russo uppercase tracking-wider text-white flex items-center gap-2">
                                                                <Trophy className="text-sparta-gold" size={16} /> Награды ({userData.achievements.length})
                                                            </h4>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {userData.achievements.slice(0, 4).map((ach: any, idx: number) => (
                                                                    <div key={ach.id || idx} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
                                                                        <div className="w-8 h-8 rounded-lg bg-sparta-gold/10 flex items-center justify-center text-sparta-gold shrink-0">
                                                                            <Trophy size={14} />
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-white text-xs font-bold truncate">{ach.title || 'Награда'}</p>
                                                                            <p className="text-white/40 text-[10px] truncate">{ach.reason || 'За спортивные заслуги'}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* COACH BODY CONTENT */}
                                            {['trainer', 'coach'].includes(userData?.role) && (
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
                                                    <div className="flex items-center gap-2 text-sparta-gold pb-2 border-b border-white/5">
                                                        <Dumbbell size={16} />
                                                        <h4 className="text-xs font-russo uppercase tracking-wider text-white">Тренерская информация</h4>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">Тренируемые группы</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(userData.coachedGroups || userData.groups || [userData.groupName || userData.group || 'Тренер основной группы']).map((g: string, idx: number) => (
                                                                <span key={idx} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5">
                                                                    <Users size={12} /> {g}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1 font-bold">Специализация</p>
                                                        <p className="text-white font-bold text-xs">Главный тренер академии Спарта</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* DIRECTOR BODY CONTENT */}
                                            {userData?.role === 'director' && (
                                                <div className="bg-black/40 p-4 rounded-2xl border border-amber-500/20 space-y-3">
                                                    <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-white/5">
                                                        <Building size={16} />
                                                        <h4 className="text-xs font-russo uppercase tracking-wider text-white">Организационные данные</h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                            <p className="text-[10px] text-white/40 uppercase mb-0.5 font-bold">Должность</p>
                                                            <p className="text-amber-400 font-bold text-xs">Директор Спарты</p>
                                                        </div>
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                            <p className="text-[10px] text-white/40 uppercase mb-0.5 font-bold">Сектор</p>
                                                            <p className="text-white font-bold text-xs">Руководство клуба</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                                                        <p className="text-[10px] text-amber-400/80 uppercase font-bold tracking-wider mb-1">Официальные обращения</p>
                                                        <p className="text-white/80 text-xs font-medium">Официальные запросы, партнёрство и вопросы руководства клуба</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ADMIN / DEVELOPER BODY CONTENT */}
                                            {['admin', 'developer'].includes(userData?.role) && (
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-3">
                                                    <div className="flex items-center gap-2 text-cyan-400 pb-2 border-b border-white/5">
                                                        <Shield size={16} />
                                                        <h4 className="text-xs font-russo uppercase tracking-wider text-white">Системные права</h4>
                                                    </div>
                                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                                                        <span className="text-xs text-white/60">Уровень доступа</span>
                                                        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                                                            <Zap size={12} /> {userData.role === 'developer' ? 'Developer Root' : 'Administrator'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Contact Info (Hide phone cleanly if missing) */}
                                            {(userData.parentPhone || userData.email) && (
                                                <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2.5">
                                                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Контакты</p>
                                                    {userData.parentPhone && (
                                                        <a
                                                            href={`tel:${userData.parentPhone.replace(/[^+\d]/g, '')}`}
                                                            className="text-white font-bold text-xs flex items-center gap-2 hover:text-sparta-gold transition-colors group/tel cursor-pointer"
                                                            title="Позвонить"
                                                        >
                                                            <Phone size={14} className="text-sparta-gold group-hover/tel:scale-110 transition-transform" />
                                                            <span>{userData.parentPhone}</span>
                                                        </a>
                                                    )}
                                                    {userData.email && (
                                                        <a
                                                            href={`mailto:${userData.email}`}
                                                            className="text-white/70 font-mono text-xs flex items-center gap-2 hover:text-sparta-gold transition-colors group/mail cursor-pointer"
                                                            title="Написать на email"
                                                        >
                                                            <Mail size={14} className="text-sparta-gold group-hover/mail:scale-110 transition-transform" />
                                                            <span>{userData.email}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* ACTION FOOTER */}
                                            {user && userData.id !== user.uid && !isEditing && (
                                                <div className="flex gap-3 pt-2">
                                                    {friendStatus === 'none' && (
                                                        <button
                                                            onClick={handleAddFriend}
                                                            disabled={loading}
                                                            className="flex-1 py-3 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase font-black"
                                                        >
                                                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Users size={16} />}
                                                            В друзья
                                                        </button>
                                                    )}
                                                    {friendStatus === 'outgoing' && (
                                                        <button
                                                            onClick={handleCancelRequest}
                                                            disabled={loading}
                                                            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-xs"
                                                        >
                                                            {loading ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
                                                            Отменить заявку
                                                        </button>
                                                    )}
                                                    {friendStatus === 'pending' && (
                                                        <button
                                                            onClick={handleAcceptFriend}
                                                            disabled={loading}
                                                            className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                                                        >
                                                            {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                                            Принять заявку
                                                        </button>
                                                    )}
                                                    {friendStatus === 'accepted' && (
                                                        <button
                                                            onClick={handleUnfriend}
                                                            disabled={loading}
                                                            className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-red-400 font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-xs"
                                                            title="Удалить из друзей"
                                                        >
                                                            {loading ? <Loader2 className="animate-spin" size={16} /> : <UserMinus size={16} />}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            const targetId = userData.id || userData.uid;
                                                            const targetName = displayName;
                                                            const newUrl = `/dashboard?tab=messages_unified&targetUid=${targetId}&targetName=${encodeURIComponent(targetName)}`;
                                                            window.history.pushState({}, '', newUrl);
                                                            window.dispatchEvent(new CustomEvent('sparta_navigate_tab', { detail: { tab: 'messages_unified', targetUid: targetId, targetName } }));
                                                            navigate(newUrl);
                                                        }}
                                                        className="flex-1 py-3 px-4 rounded-xl bg-sparta-gold text-black font-black uppercase text-xs hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(255,184,0,0.3)] flex items-center justify-center gap-2"
                                                    >
                                                        <MessageSquare size={16} />
                                                        Написать сообщение
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="text-center py-8 text-white/30">
                                    <p>Данные профиля не найдены</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Revoke Confirmation Modal */}
                    {
                        isRevokeModalOpen && (
                            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                    <h3 className="text-xl font-bold text-white font-russo mb-4">Отозвать награду?</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-white/40 text-xs font-bold mb-1">Причина (опционально)</label>
                                            <textarea
                                                value={revokeReason}
                                                onChange={(e) => setRevokeReason(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none h-20 resize-none"
                                                placeholder="Если пусто — уведомления не будет."
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setIsRevokeModalOpen(false)}
                                                className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                                            >
                                                Отмена
                                            </button>
                                            <button
                                                onClick={handleRevokeAchievement}
                                                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={18} />
                                                Забрать
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </>
            )}
        </AnimatePresence >
    );
};

export default ProfileViewModal;
