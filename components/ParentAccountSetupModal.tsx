import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Bell, Smartphone, AlertCircle, TrendingUp, CreditCard } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { safeLocalStorage } from '../utils/storage';
import { BaseModal } from './ui/BaseModal';

interface ParentAccountSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentUid: string;
    parentName?: string;
    parentPhone?: string;
    childName?: string;
    onSuccess?: (email: string) => void;
}

export const ParentAccountSetupModal: React.FC<ParentAccountSetupModalProps> = ({
    isOpen,
    onClose,
    parentUid,
    parentName = 'Родитель',
    parentPhone = '',
    childName = 'Юный спортсмен',
    onSuccess
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
            setError('Пожалуйста, введите корректный адрес электронной почты');
            return;
        }

        if (password.length < 6) {
            setError('Пароль должен содержать минимум 6 символов');
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setLoading(true);

        try {
            // 0. Pre-fetch existing parent data and linked children
            let existingParentData: any = {};
            if (parentUid) {
                try {
                    const existingSnap = await getDoc(doc(db, 'users', parentUid));
                    if (existingSnap.exists()) {
                        existingParentData = existingSnap.data();
                    }
                } catch (e) {
                    console.warn('Could not read existing parent doc:', e);
                }
            }

            const cachedSession = safeLocalStorage.getItem('sparta_auth_user');
            if (cachedSession) {
                try {
                    const parsed = JSON.parse(cachedSession);
                    existingParentData = { ...parsed, ...existingParentData };
                } catch (e) {}
            }

            // 1. Create Firebase Auth user
            let authUid = parentUid;
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                if (userCredential.user) {
                    authUid = userCredential.user.uid;
                    await updateProfile(userCredential.user, {
                        displayName: parentName || existingParentData.displayName || 'Родитель'
                    });
                }
            } catch (authErr: any) {
                if (authErr.code === 'auth/email-already-in-use') {
                    setError('Этот email уже зарегистрирован в Sparta. Пожалуйста, укажите другой адрес или войдите под ним.');
                    setLoading(false);
                    return;
                }
                console.warn('Auth user creation notice:', authErr);
            }

            const effectiveDisplayName = parentName || existingParentData.displayName || existingParentData.parentName || 'Родитель';
            const effectivePhone = parentPhone || existingParentData.phone || '';

            // 2. Set/Update target Firestore user document with ROLE: 'parent'
            const parentDocRef = doc(db, 'users', authUid);
            const parentPayload = {
                ...existingParentData,
                uid: authUid,
                id: authUid,
                email: cleanEmail,
                role: 'parent',
                displayName: effectiveDisplayName,
                parentName: effectiveDisplayName,
                name: effectiveDisplayName,
                phone: effectivePhone,
                hasPassword: true,
                needsPasswordSetup: false,
                status: 'active',
                updatedAt: serverTimestamp()
            };
            await setDoc(parentDocRef, parentPayload, { merge: true });

            // 3. Migrate linked child cards and trials to new authUid if different
            if (parentUid && parentUid !== authUid) {
                try {
                    const qChildren = query(collection(db, 'users'), where('parentId', '==', parentUid));
                    const childSnap = await getDocs(qChildren);
                    for (const cDoc of childSnap.docs) {
                        await updateDoc(doc(db, 'users', cDoc.id), {
                            parentId: authUid,
                            parentEmail: cleanEmail,
                            parentPhone: effectivePhone,
                            updatedAt: serverTimestamp()
                        }).catch(() => {});
                    }

                    // Update trials
                    const qTrials = query(collection(db, 'trials'), where('parentId', '==', parentUid));
                    const trialsSnap = await getDocs(qTrials);
                    for (const tDoc of trialsSnap.docs) {
                        await updateDoc(doc(db, 'trials', tDoc.id), {
                            parentId: authUid,
                            parentEmail: cleanEmail,
                            parentPhone: effectivePhone,
                            updatedAt: serverTimestamp()
                        }).catch(() => {});
                    }
                } catch (migrationErr) {
                    console.warn('Child migration warning:', migrationErr);
                }
            }

            // 4. Update localStorage session
            safeLocalStorage.setItem('sparta_auth_user', JSON.stringify({
                ...existingParentData,
                uid: authUid,
                id: authUid,
                email: cleanEmail,
                role: 'parent',
                displayName: effectiveDisplayName,
                parentName: effectiveDisplayName,
                phone: effectivePhone,
                hasPassword: true,
                needsPasswordSetup: false
            }));

            // Mark setup modal as completed in sessionStorage
            sessionStorage.setItem('dismissed_parent_setup', 'true');

            setIsSuccess(true);
            if (onSuccess) {
                onSuccess(cleanEmail);
            }

            setTimeout(() => {
                onClose();
            }, 1600);
        } catch (err: any) {
            console.error('Error securing parent account:', err);
            setError(err.message || 'Произошла ошибка при сохранении. Попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="text-left font-manrope">
                {/* Header */}
                <div className="pb-4 border-b border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-sparta-gold text-black flex items-center justify-center font-bold shadow-md shrink-0">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sparta-gold bg-sparta-gold/10 px-2 py-0.5 rounded border border-sparta-gold/25">
                            Защита кабинета родителя
                        </span>
                        <h3 className="font-russo text-sm sm:text-base text-white mt-0.5">
                            Установите Email и Пароль
                        </h3>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-4 space-y-4">
                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 text-center space-y-3"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                                    <CheckCircle2 size={28} />
                                </div>
                                <h4 className="font-russo text-base sm:text-lg text-white">
                                    Кабинет надежно защищен!
                                </h4>
                                <p className="text-xs text-white/70 max-w-sm mx-auto">
                                    Данные {childName} сохранены. Теперь вы можете входить в кабинет Sparta с любого телефона или компьютера по почте <strong className="text-sparta-gold">{email}</strong>.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                onSubmit={handleSubmit}
                                className="space-y-4"
                            >
                                {/* Psychological Reassurance Grid */}
                                <div className="space-y-2">
                                    <p className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                                        Зачем привязать почту и пароль:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2">
                                            <TrendingUp size={15} className="text-sparta-gold shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-white block text-[11px]">Статистика и успеваемость</strong>
                                                <span className="text-[10px] text-white/60 leading-tight block">
                                                    Оценки тренера, дневник развития и рост навыков {childName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2">
                                            <CreditCard size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-white block text-[11px]">Управление абонементом</strong>
                                                <span className="text-[10px] text-white/60 leading-tight block">
                                                    Заморозка занятий при болезни, продление и баланс тренировок
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2">
                                            <Smartphone size={15} className="text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-white block text-[11px]">Вход с любого устройства</strong>
                                                <span className="text-[10px] text-white/60 leading-tight block">
                                                    С домашнего ПК, планшета или нового телефона
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2">
                                            <Bell size={15} className="text-sparta-gold shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-white block text-[11px]">Уведомления от тренера</strong>
                                                <span className="text-[10px] text-white/60 leading-tight block">
                                                    О расписании, переносах и отчетах наставника
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Inputs */}
                                <div className="space-y-2.5 pt-1">
                                    {/* Email */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-white/80 mb-1">
                                            Ваш Email *
                                        </label>
                                        <div className="relative">
                                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="primer@mail.ru"
                                                className="w-full bg-black/50 border border-white/15 focus:border-sparta-gold rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Password + Confirm Password */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-white/80 mb-1">
                                                Придумайте пароль *
                                            </label>
                                            <div className="relative">
                                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    placeholder="Минимум 6 знаков"
                                                    className="w-full bg-black/50 border border-white/15 focus:border-sparta-gold rounded-xl py-2 pl-9 pr-8 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-white/80 mb-1">
                                                Повторите пароль *
                                            </label>
                                            <div className="relative">
                                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder="Повтор пароля"
                                                    className="w-full bg-black/50 border border-white/15 focus:border-sparta-gold rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="pt-2 space-y-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-manrope font-extrabold text-xs sm:text-sm hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                    >
                                        {loading ? (
                                            <span>Защищаем кабинет...</span>
                                        ) : (
                                            <>
                                                <span>Защитить кабинет и сохранить доступ</span>
                                                <ArrowRight size={15} />
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full py-2 text-[11px] text-white/40 hover:text-white/70 transition-colors text-center cursor-pointer"
                                    >
                                        Настроить позже в профиле
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </BaseModal>
    );
};

export default ParentAccountSetupModal;
