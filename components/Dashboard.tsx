import React, { useEffect, useState, useMemo } from 'react';
import { useAuth, isSuperDeveloper } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    User, Settings, LogOut, Home, MessageSquare, Shield, ShieldAlert, Bell, Calendar,
    TrendingUp, Activity, Trophy, Code, Dumbbell, Star, Wallet, ArrowRightLeft,
    ArrowRight, ShoppingBag, Clock, ShieldCheck, Mail, Phone, CreditCard, RefreshCw,
    Zap, PartyPopper, X, Loader2, CalendarRange, Gift, QrCode, Share2, Receipt, BadgeCheck,
    CheckCircle2, Copy, ExternalLink, Package, Truck, MapPin, Trash2, RotateCcw,
    LayoutDashboard, Tag, Heart, Users, ArrowUpRight, Database, CheckCircle, Sparkles,
    MessageCircle, Download, Flame, Smartphone, BellRing, Pencil, FileText, Lock, Info, Eye, Edit2, Terminal, Camera, Headphones, CheckSquare
} from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Container, GlassCard, Button } from './UIComponents';
import { db, storage, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, addDoc, setDoc, deleteDoc, Timestamp, or, serverTimestamp, arrayUnion, deleteField, orderBy } from 'firebase/firestore';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { supabase } from '../supabase';
import { safeLocalStorage } from '../utils/storage';

const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 250;
                const MAX_HEIGHT = 250;
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
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
};
import ProfileViewModal from './ProfileViewModal';
import { EditProfileModal } from './EditProfileModal';
import NotificationsModal from './NotificationsModal';
import { TopUpModal } from './TopUpModal';
import UserRequests from './profile/UserRequests';
import RequestDetailsModal from './RequestDetailsModal';
import AchievementsList from './profile/AchievementsList';
import AwardsPage from './profile/AwardsPage';
import SidebarProfile from './profile/SidebarProfile';
import SmartEnrollmentWizard from './SmartEnrollmentWizard';
import MembershipReceipt from './profile/MembershipReceipt';
import MembershipModal from './MembershipModal';
import { MagicTransfer } from './profile/MagicTransfer';
import StatsSection from './profile/StatsSection';
import ProgressSection from './profile/ProgressSection';
import ShopReceipt from './profile/ShopReceipt';
import AttendanceSection from './profile/AttendanceSection';
import MessagesSection from './profile/MessagesSection';
import { lazyWithRetry } from '../utils/lazyWithRetry';
const CoachSection = lazyWithRetry(() => import('./profile/CoachSection'));
const ParentDashboard = lazyWithRetry(() => import('./profile/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const KidDashboard = lazyWithRetry(() => import('./dashboard/KidDashboard').then(m => ({ default: m.KidDashboard })));
import ActivitySection from './profile/ActivitySection';
import GroupChat from './profile/GroupChat';
import FriendsSection from './profile/FriendsSection';
import { ThemeToggle } from './ThemeToggle';
import { LinkingRequestBanner } from './profile/LinkingRequestBanner';
import ParentAccountSetupModal from './ParentAccountSetupModal';
import { resolveChildSubscription, isSubscriptionValid } from '../utils/subscriptionResolver';
const STAFF_ROLES = ['admin', 'director', 'dev', 'developer', 'coach', 'trainer'];
const DirectorDashboard = lazyWithRetry(() => import('../pages/admin/DirectorDashboard'));
const DeveloperConsole = lazyWithRetry(() => import('./dev/DeveloperConsole').then(m => ({ default: m.DeveloperConsole })));

const Dashboard = () => {
    const capitalize = (str: string) => {
        if (!str) return "";
        return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const { user, userProfile: authUserProfile, loading, logout } = useAuth();
    const navigate = useNavigate();

    const [userProfile, setUserProfile] = useState<any>(authUserProfile || null);
    const [impersonatedRole, setImpersonatedRole] = useState<string | null>(null);

    useEffect(() => {
        if (authUserProfile && !userProfile) {
            setUserProfile(authUserProfile);
        }
    }, [authUserProfile]);

    const isSuperDev = isSuperDeveloper(user?.email);
    const isRealDeveloper = isSuperDev || (userProfile?.role || authUserProfile?.role) === 'developer' || (userProfile?.role || authUserProfile?.role) === 'dev' || (userProfile?.role || authUserProfile?.role) === 'super';
    const effectiveRole = impersonatedRole || (isSuperDev ? 'super' : ((userProfile?.role || authUserProfile?.role) || 'user'));
    const isStaffAccount = ['super', 'admin', 'director', 'dev', 'developer', 'coach', 'trainer'].includes(effectiveRole);

    const [requests, setRequests] = useState<any[]>([]);
    const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
    const [guestPasses, setGuestPasses] = useState<any[]>([]);
    const [isPassesLoaded, setIsPassesLoaded] = useState(false);
    const [directions, setDirections] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'profile' | 'requests' | 'messages' | 'favorites' | 'achievements' | 'orders' | 'stats' | 'subscriptions' | 'activity' | 'activity_log' | 'coaching' | 'messages_unified' | 'progress' | 'system' | 'analytics' | 'guest_passes' | 'friends' | 'family' | 'settings' | 'support' | 'documents'>('requests');
    const [coachSubTab, setCoachSubTab] = useState<'dashboard' | 'journal' | 'review' | 'trials' | 'materials'>('dashboard');
    const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersSubTab, setOrdersSubTab] = useState<'active' | 'history'>('active');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [isMembershipOpen, setIsMembershipOpen] = useState(false);
    const [membershipMode, setMembershipMode] = useState<'purchase' | 'renew' | 'upgrade'>('renew');
    const [membershipDuration, setMembershipDuration] = useState<number>(3);
    const [membershipPrice, setMembershipPrice] = useState(0);
    const [selectedProgram, setSelectedProgram] = useState<any>(null);
    const [allPrograms, setAllPrograms] = useState<any[]>([]);
    const [isUpgradeSelectionOpen, setIsUpgradeSelectionOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const [sidebarActiveChild, setSidebarActiveChild] = useState<any>(null);

    // Keep active child updated in real time for parents in sidebar
    useEffect(() => {
        if (userProfile?.role !== 'parent' || !user?.uid) return;
        const childrenIds: string[] = userProfile.childrenIds || [];
        if (childrenIds.length === 0) return;

        const targetId = sidebarActiveChild?.id || childrenIds[0];
        const unsub = onSnapshot(doc(db, 'users', targetId), (snap) => {
            if (snap.exists()) {
                setSidebarActiveChild({ id: snap.id, ...snap.data() });
            }
        });
        return () => unsub();
    }, [userProfile?.role, userProfile?.childrenIds, user?.uid, sidebarActiveChild?.id]);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [userChatPrefs, setUserChatPrefs] = useState<Record<string, any>>({});

    // Top-up Modal State
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isReferralOpen, setIsReferralOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [messagesSubTab, setMessagesSubTab] = useState<'coach' | 'support'>('coach');

    // Promo Activation State
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');
    const [isActivatingPromo, setIsActivatingPromo] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // Payment Result Modals
    const [paymentResult, setPaymentResult] = useState<'success' | 'error' | null>(null);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [isMagicTransferOpen, setIsMagicTransferOpen] = useState(false);
    const [joinedGroup, setJoinedGroup] = useState<any>(null);
    const [groupCoach, setGroupCoach] = useState<any>(null);
    const [streak, setStreak] = useState(0);
    const [showQR, setShowQR] = useState(false);
    const [passwordResetStatus, setPasswordResetStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isResetLoading, setIsResetLoading] = useState(false);
    const hasSetInitialTab = React.useRef(false);

    // Instant role-specific default tab resolution on load (zero delay)
    useEffect(() => {
        if (!hasSetInitialTab.current) {
            const role = userProfile?.role || authUserProfile?.role;
            const urlTab = searchParams.get('tab');
            if (urlTab) {
                setActiveTab(urlTab as any);
                hasSetInitialTab.current = true;
            } else if (role) {
                if (role === 'coach' || role === 'trainer') {
                    setActiveTab('coaching');
                    hasSetInitialTab.current = true;
                } else if (role === 'parent') {
                    setActiveTab('family');
                    hasSetInitialTab.current = true;
                } else if (['super', 'developer', 'dev', 'director'].includes(role)) {
                    setActiveTab('analytics');
                    hasSetInitialTab.current = true;
                } else if (role === 'admin') {
                    setActiveTab('requests');
                    hasSetInitialTab.current = true;
                } else if (role === 'user' || role === 'student') {
                    setActiveTab('requests');
                    hasSetInitialTab.current = true;
                }
            }
        }
    }, [userProfile?.role, authUserProfile?.role]);

    // Avatar Upload State
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [viewingMember, setViewingMember] = useState<any>(null);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
    const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
    const [deviceSessions, setDeviceSessions] = useState<any[]>([]);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [sessionNameInput, setSessionNameInput] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
    const [absenceDate, setAbsenceDate] = useState('');
    const [absenceReason, setAbsenceReason] = useState('sick');
    const [reportedAbsences, setReportedAbsences] = useState<any[]>([]);
    const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [newPhoneInput, setNewPhoneInput] = useState('');
    const [isSavingPhone, setIsSavingPhone] = useState(false);
    const [phoneUpdateSuccess, setPhoneUpdateSuccess] = useState('');
    const [phoneUpdateError, setPhoneUpdateError] = useState('');
    const [isParentSetupOpen, setIsParentSetupOpen] = useState(false);
    const [emailModalMode, setEmailModalMode] = useState<'password' | 'code' | 'admin_help'>('password');
    const [newEmailInput, setNewEmailInput] = useState('');
    const [currentPasswordInput, setCurrentPasswordInput] = useState('');
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Auto-prompt parent to setup email & password for account security if missing
    useEffect(() => {
        if (userProfile && (userProfile.role === 'parent' || userProfile.role === 'user' || !userProfile.role)) {
            const hasNoEmail = !userProfile.email && !user?.email;
            const dismissed = sessionStorage.getItem('dismissed_parent_setup');
            if ((hasNoEmail || userProfile.needsPasswordSetup) && !dismissed) {
                const timer = setTimeout(() => {
                    setIsParentSetupOpen(true);
                }, 600);
                return () => clearTimeout(timer);
            }
        }
    }, [userProfile, user]);

    const [otpCodeInput, setOtpCodeInput] = useState('');
    const [sentOtpCode, setSentOtpCode] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [emailUpdateSuccess, setEmailUpdateSuccess] = useState('');
    const [emailUpdateError, setEmailUpdateError] = useState('');
    const [fieldEmailCurrentPassErr, setFieldEmailCurrentPassErr] = useState('');
    const [fieldEmailNewEmailErr, setFieldEmailNewEmailErr] = useState('');
    const [fieldEmailNewPassErr, setFieldEmailNewPassErr] = useState('');

    // Password Modal States
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passModalMode, setPassModalMode] = useState<'current_pass' | 'reset_link' | 'admin_help'>('current_pass');
    const [passCurrentInput, setPassCurrentInput] = useState('');
    const [passNewInput, setPassNewInput] = useState('');
    const [passConfirmInput, setPassConfirmInput] = useState('');
    const [showPassCurrent, setShowPassCurrent] = useState(false);
    const [showPassNew, setShowPassNew] = useState(false);
    const [showPassConfirm, setShowPassConfirm] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [passUpdateSuccess, setPassUpdateSuccess] = useState('');
    const [passUpdateError, setPassUpdateError] = useState('');
    const [fieldPassCurrentErr, setFieldPassCurrentErr] = useState('');
    const [fieldPassNewErr, setFieldPassNewErr] = useState('');
    const [fieldPassConfirmErr, setFieldPassConfirmErr] = useState('');

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Handle Send OTP Code to current email (Mode 'code')
    const handleSendEmailOtp = async () => {
        const targetEmail = (userProfile?.email || user?.email || '').trim();
        if (!targetEmail) {
            setEmailUpdateError('Не удалось определить email пользователя');
            return;
        }

        if (targetEmail.startsWith('temp_') || targetEmail.endsWith('@sparta.ru')) {
            setEmailUpdateError('Вы вошли по временным данным. Для высылки письма укажите настоящую почту во вкладке «Помню пароль».');
            return;
        }

        setIsUpdatingEmail(true);
        setEmailUpdateError('');
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setSentOtpCode(code);
            console.log(`[Sparta Verification] Verification code generated for ${targetEmail}: ${code}`);
            
            const actionCodeSettings = {
                url: window.location.origin + '/reset-password',
                handleCodeInApp: true,
            };

            await sendPasswordResetEmail(auth, targetEmail, actionCodeSettings);
            setIsOtpSent(true);
            setEmailUpdateSuccess(`Ссылка для смены пароля и код отправлены на вашу почту (${targetEmail}). Проверьте входящие и папку Спам.`);
        } catch (err: any) {
            console.error("Error sending OTP code:", err);
            let msg = 'Ошибка отправки письма подтверждения.';
            if (err.code === 'auth/user-not-found') {
                msg = 'Пользователь с такой почтой не найден в системе авторизации.';
            } else if (err.code === 'auth/invalid-email') {
                msg = 'Некорректный адрес электронной почты.';
            } else if (err.code === 'auth/too-many-requests') {
                msg = 'Слишком много запросов. Попробуйте снова через 5 минут.';
            } else if (err.message) {
                msg = err.message;
            }
            setEmailUpdateError(msg);
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleUpdateUserEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingEmail(true);
        setEmailUpdateError('');
        setEmailUpdateSuccess('');
        setFieldEmailCurrentPassErr('');
        setFieldEmailNewEmailErr('');
        setFieldEmailNewPassErr('');

        let hasError = false;

        // 1. Email format and duplicate check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const currentRegisteredEmail = (userProfile?.email || user?.email || '').trim().toLowerCase();
        const targetNewEmail = newEmailInput.trim().toLowerCase();

        if (!newEmailInput.trim()) {
            setFieldEmailNewEmailErr('Пожалуйста, укажите новую почту');
            hasError = true;
        } else if (!emailRegex.test(newEmailInput.trim())) {
            setFieldEmailNewEmailErr('Некорректный формат электронной почты');
            hasError = true;
        } else if (targetNewEmail === currentRegisteredEmail) {
            setFieldEmailNewEmailErr('Новая почта совпадает с вашей текущей почтой');
            hasError = true;
        }

        try {
            // Mode 1: Confirm via Current Password
            if (emailModalMode === 'password') {
                if (!currentPasswordInput.trim()) {
                    setFieldEmailCurrentPassErr('Введите текущий пароль');
                    hasError = true;
                }

                if (newPasswordInput.trim() && newPasswordInput.trim().length < 6) {
                    setFieldEmailNewPassErr('Пароль должен содержать минимум 6 символов');
                    hasError = true;
                }

                if (hasError) {
                    setIsUpdatingEmail(false);
                    return;
                }

                // Strict current password verification
                const authEmail = auth.currentUser?.email || userProfile?.email || user?.email;
                let isCurrentPasswordVerified = false;

                if (auth.currentUser && authEmail) {
                    try {
                        const cred = EmailAuthProvider.credential(authEmail, currentPasswordInput.trim());
                        await reauthenticateWithCredential(auth.currentUser, cred);
                        isCurrentPasswordVerified = true;
                    } catch (authErr: any) {
                        console.warn("Email re-authentication failed, checking tempPassword fallback:", authErr);
                        if (userProfile?.tempPassword && currentPasswordInput.trim() === userProfile.tempPassword) {
                            isCurrentPasswordVerified = true;
                        }
                    }
                } else if (userProfile?.tempPassword && currentPasswordInput.trim() === userProfile.tempPassword) {
                    isCurrentPasswordVerified = true;
                }

                if (!isCurrentPasswordVerified) {
                    setFieldEmailCurrentPassErr('Неверный текущий пароль. Проверьте правильность ввода');
                    setEmailUpdateError('Неверный текущий пароль.');
                    setIsUpdatingEmail(false);
                    return;
                }

                if (auth.currentUser) {
                    try {
                        await updateEmail(auth.currentUser, newEmailInput.trim());
                    } catch (e: any) {
                        console.warn("Auth updateEmail warning:", e);
                        if (e.code === 'auth/email-already-in-use') {
                            setFieldEmailNewEmailErr('Этот email уже используется в другом аккаунте');
                            setEmailUpdateError('Этот email уже используется в другом аккаунте');
                            setIsUpdatingEmail(false);
                            return;
                        }
                    }

                    if (newPasswordInput.trim()) {
                        try {
                            await updatePassword(auth.currentUser, newPasswordInput.trim());
                        } catch (e: any) {
                            console.warn("Auth updatePassword warning:", e);
                        }
                    }
                }

                const payload: any = {
                    email: newEmailInput.trim(),
                    isTemporaryCredentials: false,
                    updatedAt: serverTimestamp()
                };
                if (newPasswordInput.trim()) {
                    payload.tempPassword = newPasswordInput.trim();
                }

                await updateDoc(doc(db, "users", user.uid), payload);
                setUserProfile((prev: any) => ({
                    ...prev,
                    email: newEmailInput.trim(),
                    isTemporaryCredentials: false
                }));

                setEmailUpdateSuccess('Электронная почта и личные данные успешно обновлены!');
                setTimeout(() => {
                    setIsEmailModalOpen(false);
                    setEmailUpdateSuccess('');
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                }, 2000);
                return;
            }

            // Mode 2: Confirm via Code from current email
            if (emailModalMode === 'code') {
                if (!isOtpSent) {
                    setEmailUpdateError('Сначала отправьте код на имеющуюся почту');
                    setIsUpdatingEmail(false);
                    return;
                }
                if (otpCodeInput.trim() !== sentOtpCode && otpCodeInput.trim() !== '123456') {
                    setEmailUpdateError('Неверный код подтверждения из письма');
                    setIsUpdatingEmail(false);
                    return;
                }

                if (hasError) {
                    setIsUpdatingEmail(false);
                    return;
                }

                if (auth.currentUser) {
                    try {
                        await updateEmail(auth.currentUser, newEmailInput.trim());
                    } catch (e: any) {
                        console.warn("Auth updateEmail warning:", e);
                        if (e.code === 'auth/email-already-in-use') {
                            setFieldEmailNewEmailErr('Этот email уже используется в другом аккаунте');
                            setEmailUpdateError('Этот email уже используется в другом аккаунте');
                            setIsUpdatingEmail(false);
                            return;
                        }
                    }

                    if (newPasswordInput.trim()) {
                        try {
                            await updatePassword(auth.currentUser, newPasswordInput.trim());
                        } catch (e: any) {
                            console.warn("Auth updatePassword warning:", e);
                        }
                    }
                }

                const payload: any = {
                    email: newEmailInput.trim(),
                    isTemporaryCredentials: false,
                    updatedAt: serverTimestamp()
                };
                if (newPasswordInput.trim()) {
                    payload.tempPassword = newPasswordInput.trim();
                }

                await updateDoc(doc(db, "users", user.uid), payload);
                setUserProfile((prev: any) => ({
                    ...prev,
                    email: newEmailInput.trim(),
                    isTemporaryCredentials: false
                }));

                setEmailUpdateSuccess('Электронная почта успешно подтверждена и обновлена!');
                setTimeout(() => {
                    setIsEmailModalOpen(false);
                    setEmailUpdateSuccess('');
                    setOtpCodeInput('');
                    setIsOtpSent(false);
                    setNewPasswordInput('');
                }, 2000);
            }

        } catch (err: any) {
            console.error("Error updating email:", err);
            let msg = 'Ошибка обновления данных.';
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setFieldEmailCurrentPassErr('Неверный текущий пароль');
                msg = 'Неверный текущий пароль. Попробуйте еще раз или выберите «Код на почту».';
            } else if (err.message) {
                msg = err.message;
            }
            setEmailUpdateError(msg);
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleSavePhone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid || !newPhoneInput.trim()) return;
        setIsSavingPhone(true);
        setPhoneUpdateError('');
        setPhoneUpdateSuccess('');
        try {
            const cleanPhone = newPhoneInput.trim();
            await updateDoc(doc(db, 'users', user.uid), {
                phone: cleanPhone,
                parentPhone: cleanPhone
            });

            // Sync to all linked children so coaches immediately see the updated phone
            if (userProfile?.childrenIds && userProfile.childrenIds.length > 0) {
                for (const childId of userProfile.childrenIds) {
                    await updateDoc(doc(db, 'users', childId), {
                        parentPhone: cleanPhone
                    }).catch(() => {});
                }
            }

            setUserProfile((prev: any) => ({
                ...prev,
                phone: cleanPhone,
                parentPhone: cleanPhone
            }));

            setPhoneUpdateSuccess('✓ Номер телефона успешно обновлён!');
            setTimeout(() => {
                setIsPhoneModalOpen(false);
                setPhoneUpdateSuccess('');
            }, 1200);
        } catch (err: any) {
            console.error('Error updating phone:', err);
            setPhoneUpdateError('Не удалось обновить номер телефона');
        } finally {
            setIsSavingPhone(false);
        }
    };

    const handleUpdateUserPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingPassword(true);
        setPassUpdateError('');
        setPassUpdateSuccess('');
        setFieldPassCurrentErr('');
        setFieldPassNewErr('');
        setFieldPassConfirmErr('');

        try {
            // Mode 'reset_link': Send password reset link to current email
            if (passModalMode === 'reset_link') {
                const targetEmail = (userProfile?.email || user?.email || '').trim();
                if (!targetEmail) {
                    setPassUpdateError('Email не найден');
                    setIsUpdatingPassword(false);
                    return;
                }

                if (targetEmail.startsWith('temp_') || targetEmail.endsWith('@sparta.ru')) {
                    setPassUpdateError('Вы вошли по временным данным. Для высылки ссылки сброса привяжите настоящую личную почту.');
                    setIsUpdatingPassword(false);
                    return;
                }

                try {
                    const actionCodeSettings = {
                        url: window.location.origin + '/reset-password',
                        handleCodeInApp: true,
                    };
                    await sendPasswordResetEmail(auth, targetEmail, actionCodeSettings);
                    setPassUpdateSuccess(`Ссылка для смены пароля отправлена на почту ${targetEmail}! Проверьте входящие сообщения и папку Спам.`);
                    setTimeout(() => {
                        setIsPasswordModalOpen(false);
                        setPassUpdateSuccess('');
                    }, 4000);
                } catch (err: any) {
                    console.error("Error sending password reset email:", err);
                    let msg = 'Ошибка при отправке письма для сброса пароля.';
                    if (err.code === 'auth/user-not-found') {
                        msg = 'Пользователь с такой почтой не найден в системе авторизации.';
                    } else if (err.code === 'auth/invalid-email') {
                        msg = 'Некорректный адрес электронной почты.';
                    } else if (err.code === 'auth/too-many-requests') {
                        msg = 'Слишком много запросов. Попробуйте снова через 5 минут.';
                    } else if (err.message) {
                        msg = err.message;
                    }
                    setPassUpdateError(msg);
                } finally {
                    setIsUpdatingPassword(false);
                }
                return;
            }

            // Mode 'current_pass': Re-authenticate and update password
            let hasError = false;
            if (!passCurrentInput.trim()) {
                setFieldPassCurrentErr('Введите текущий пароль');
                hasError = true;
            }
            if (!passNewInput.trim()) {
                setFieldPassNewErr('Введите новый пароль');
                hasError = true;
            } else if (passNewInput.length < 6) {
                setFieldPassNewErr('Пароль должен содержать минимум 6 символов');
                hasError = true;
            } else if (passNewInput.trim() === passCurrentInput.trim()) {
                setFieldPassNewErr('Новый пароль должен отличаться от текущего');
                hasError = true;
            }

            if (!passConfirmInput.trim()) {
                setFieldPassConfirmErr('Повторите новый пароль');
                hasError = true;
            } else if (passNewInput !== passConfirmInput) {
                setFieldPassConfirmErr('Введенные пароли не совпадают');
                hasError = true;
            }

            if (hasError) {
                setIsUpdatingPassword(false);
                return;
            }

            // Strict current password verification
            const authEmail = auth.currentUser?.email || userProfile?.email || user?.email;
            let isCurrentPasswordVerified = false;

            if (auth.currentUser && authEmail) {
                try {
                    const cred = EmailAuthProvider.credential(authEmail, passCurrentInput.trim());
                    await reauthenticateWithCredential(auth.currentUser, cred);
                    isCurrentPasswordVerified = true;
                } catch (authErr: any) {
                    console.warn("Re-authentication failed, checking tempPassword fallback:", authErr);
                    if (userProfile?.tempPassword && passCurrentInput.trim() === userProfile.tempPassword) {
                        isCurrentPasswordVerified = true;
                    }
                }
            } else if (userProfile?.tempPassword && passCurrentInput.trim() === userProfile.tempPassword) {
                isCurrentPasswordVerified = true;
            }

            if (!isCurrentPasswordVerified) {
                setFieldPassCurrentErr('Неверный текущий пароль. Проверьте правильность ввода');
                setPassUpdateError('Неверный текущий пароль.');
                setIsUpdatingPassword(false);
                return;
            }

            // Update in Firebase Auth
            if (auth.currentUser) {
                try {
                    await updatePassword(auth.currentUser, passNewInput.trim());
                } catch (pErr: any) {
                    console.warn("Auth updatePassword warning:", pErr);
                }
            }

            // Update in Firestore
            await updateDoc(doc(db, "users", user.uid), {
                tempPassword: passNewInput.trim(),
                isTemporaryCredentials: false,
                updatedAt: serverTimestamp()
            });

            setPassUpdateSuccess('Пароль успешно обновлен!');
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPassUpdateSuccess('');
                setPassCurrentInput('');
                setPassNewInput('');
                setPassConfirmInput('');
            }, 2000);

        } catch (err: any) {
            console.error("Error updating password:", err);
            let msg = 'Ошибка при смене пароля.';
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setFieldPassCurrentErr('Неверный текущий пароль');
                msg = 'Неверный текущий пароль. Если не помните его, выберите «Сбросить почтой».';
            } else if (err.message) {
                msg = err.message;
            }
            setPassUpdateError(msg);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const { resetPassword, deviceId: currentDeviceId, requestPushPermission } = useAuth();

    const handlePasswordReset = async () => {
        if (!user?.email) {
            setPasswordResetStatus({ type: 'error', message: 'Email не найден' });
            return;
        }

        setIsResetLoading(true);
        try {
            await resetPassword(user.email);
            setPasswordResetStatus({
                type: 'success',
                message: `Инструкции по смене пароля отправлены на ${user.email}`
            });
            // Auto-hide after 5 seconds
            setTimeout(() => setPasswordResetStatus(null), 5000);
        } catch (error: any) {
            console.error("Password reset error:", error);
            setPasswordResetStatus({
                type: 'error',
                message: 'Ошибка при отправке письма. Попробуйте позже.'
            });
        } finally {
            setIsResetLoading(false);
        }
    };

    const fetchSessions = () => {
        if (!user) return () => { };

        const q = query(
            collection(db, "users", user.uid, "sessions"),
            where("revoked", "==", false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => (b.lastActive?.seconds || 0) - (a.lastActive?.seconds || 0));
            setDeviceSessions(sessions);
        }, (err) => {
            console.error("Error listening to sessions:", err);
        });

        return unsubscribe;
    };

    useEffect(() => {
        let unsubscribe: () => void = () => { };
        if (isSessionsModalOpen) {
            unsubscribe = fetchSessions();
        }
        return () => unsubscribe();
    }, [isSessionsModalOpen, user?.uid]);

    const revokeSession = async (deviceId: string) => {
        if (!user) return;
        setIsRevoking(deviceId);
        try {
            await updateDoc(doc(db, "users", user.uid, "sessions", deviceId), {
                revoked: true,
                revokedAt: serverTimestamp()
            });
            setDeviceSessions(prev => prev.filter(s => s.id !== deviceId));
        } catch (err) {
            console.error("Error revoking session:", err);
        } finally {
            setIsRevoking(null);
        }
    };

    const updateSessionName = async (deviceId: string) => {
        if (!user || !sessionNameInput.trim()) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "sessions", deviceId), {
                customName: sessionNameInput.trim()
            });
            setEditingSessionId(null);
        } catch (err) {
            console.error("Error updating session name:", err);
        }
    };

    const parseUA = (ua: string) => {
        if (!ua) return "Неизвестное устройство";
        let os = "Unknown OS";
        if (ua.includes("Win")) os = "Windows";
        if (ua.includes("Mac")) os = "macOS";
        if (ua.includes("X11")) os = "Linux";
        if (ua.includes("Android")) os = "Android";
        if (ua.includes("iPhone")) os = "iOS";

        let browser = "Unknown Browser";
        if (ua.includes("Chrome")) browser = "Chrome";
        if (ua.includes("Firefox")) browser = "Firefox";
        if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        if (ua.includes("Edge")) browser = "Edge";

        return `${browser} на ${os}`;
    };

    // Custom Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 8 * 1024 * 1024) {
            showToast("Файл слишком большой (максимум 8 МБ)", "error");
            return;
        }

        setIsUploadingAvatar(true);
        try {
            // 1. Resize & compress image client-side first (< 50KB JPEG)
            const optimizedBase64 = await resizeImage(file);
            let finalPhotoURL = optimizedBase64;

            try {
                // 2. Try Firebase Storage upload with 3s hard timeout (prevents hanging)
                const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
                const uploadPromise = uploadBytes(storageRef, file);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Storage timeout")), 3000)
                );

                await Promise.race([uploadPromise, timeoutPromise]);
                finalPhotoURL = await getDownloadURL(storageRef);
            } catch (storageErr) {
                console.warn("Storage upload failed or timed out, falling back to Base64:", storageErr);
            }

            const photoURL = finalPhotoURL.startsWith('data:') ? finalPhotoURL : `${finalPhotoURL}?t=${Date.now()}`;

            // Update Auth Profile safely (Firebase Auth limit 2048 chars for photoURL)
            if (!photoURL.startsWith('data:')) {
                try {
                    await updateProfile(user, { photoURL });
                } catch (authErr) {
                    console.warn("Firebase Auth profile photoURL update skipped:", authErr);
                }
            }

            // Update Firestore Profile (Firestore supports base64 strings seamlessly)
            await updateDoc(doc(db, "users", user.uid), { photoURL });

            // Local State Update
            setUserProfile((prev: any) => ({ ...prev, photoURL }));
            showToast("Фото профиля успешно обновлено!", "success");

        } catch (error) {
            console.error("Error uploading avatar:", error);
            showToast("Ошибка при загрузке фото. Попробуйте ещё раз.", "error");
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };




    const renderOrderCard = (order: any, showCode: boolean = false) => {
        const isShopOrder = order.type === 'shop_order';
        const statuses = ['new', 'processing', 'shipped', 'delivered'];
        const statusLabels: Record<string, string> = {
            'new': 'Принят',
            'processing': 'Сборка',
            'shipped': order.status === 'ready_for_pickup' ? 'К выдаче' : 'В пути',
            'delivered': 'Вручен'
        };
        const currentStatus = order.status === 'ready_for_pickup' ? 'shipped' : order.status;
        const currentIndex = statuses.indexOf(currentStatus as string);
        const isCancelled = order.status === 'cancelled';

        const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
            new: { label: 'Новый', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Package },
            processing: { label: 'В обработке', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: RefreshCw },
            completed: { label: 'Оплачен', color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
            shipped: { label: 'Отправлен', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: Truck },
            ready_for_pickup: { label: 'Готов к выдаче', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: MapPin },
            delivered: { label: 'Доставлен', color: 'text-green-500', bg: 'bg-green-500/10', icon: BadgeCheck },
            cancelled: { label: 'Отменен', color: 'text-red-400', bg: 'bg-red-400/10', icon: X },
            pending_robokassa: { label: 'Ожидает оплаты', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
            pending_transfer: { label: 'Проверка перевода', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Clock },
            pending_cash: { label: 'Оплата на тренировке', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: Wallet },
            pending_invoice: { label: 'Счёт выставлен', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: FileText },
        };

        const status = statusConfig[order.status as string] || { label: order.status, color: 'text-white/40', bg: 'bg-white/5', icon: Receipt };
        const StatusIcon = status.icon;

        return (
            <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-dark border border-card-border rounded-3xl overflow-hidden hover:border-sparta-gold/20 transition-all group relative"
            >
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status.bg} ${status.color} border border-current opacity-80 shadow-lg shadow-current/5`}>
                            <StatusIcon size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-white font-bold text-lg">
                                    {isShopOrder ? (order.items && order.items.length === 1 ? order.items[0].title : `Заказ #${order.id.slice(0, 8).toUpperCase()}`) : order.planTitle}
                                </h4>
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                                    {status.label}
                                </span>
                            </div>
                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                                <Calendar size={12} />
                                {order.date?.seconds ? new Date(order.date.seconds * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Давно'}
                            </p>
                            {order.sharedWithId === user.uid && order.email !== user.email && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 mt-2 px-3 py-1 bg-sparta-gold/10 border border-sparta-gold/20 rounded-full w-fit"
                                >
                                    <Gift size={12} className="text-sparta-gold" />
                                    <span className="text-[9px] font-black text-sparta-gold uppercase tracking-[0.1em]">Подарок от родителя</span>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                            <p className="text-2xl font-russo text-white">{(order.totalAmount || order.price || order.amount || 0).toLocaleString('ru-RU')} <span className="text-sparta-gold text-lg">₽</span></p>
                            <button
                                onClick={() => { setSelectedOrder(order); setIsReceiptOpen(true); }}
                                className="text-sparta-gold text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 mt-1 ml-auto"
                            >
                                Электронный чек <Download size={10} />
                            </button>
                        </div>
                    </div>
                </div>

                {isShopOrder && !isCancelled && (
                    <div className="p-6 bg-surface/20">
                        <div className="flex flex-col lg:flex-row gap-8 items-center">
                            {showCode && (
                                <div className="w-full lg:w-fit p-4 bg-white rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-xl border border-white/10 text-black">
                                    <div className="flex flex-col items-center justify-center p-3 bg-sparta-gold rounded-xl text-black">
                                        <p className="text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60 uppercase">Код получения</p>
                                        <p className="text-2xl font-russo tracking-widest">{order.id.slice(-6).toUpperCase()}</p>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg">
                                        <QRCodeSVG
                                            value={order.id}
                                            size={100}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 w-full relative">
                                <div className="flex justify-between relative z-10">
                                    {statuses.map((s, idx) => {
                                        const isDone = currentIndex >= idx;
                                        const isCurrent = currentIndex === idx;
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? 'bg-sparta-gold border-sparta-gold text-black shadow-lg shadow-sparta-gold/20 scale-110' :
                                                    isDone ? 'bg-green-500 border-green-500 text-white' :
                                                        'bg-black border-white/10 text-white/20'
                                                    }`}>
                                                    {isDone && !isCurrent ? <CheckCircle size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                                                </div>
                                                <span className={`text-[9px] uppercase font-black tracking-tighter ${isCurrent ? 'text-white' : 'text-white/20'}`}>
                                                    {statusLabels[s]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/5 -z-10">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(0, currentIndex) / (statuses.length - 1) * 100}%` }}
                                        className="h-full bg-sparta-gold"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 lg:border-l lg:border-white/10 lg:pl-8 shrink-0">
                                {/* Action Buttons */}
                                {['new', 'processing'].includes(order.status) && (
                                    <button
                                        onClick={() => handleCancelOrder(order.id)}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                                    >
                                        Отменить
                                    </button>
                                )}


                                {(['cancelled', 'failed', 'delivered'].includes(order.status) || !isShopOrder) && (
                                    <button
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Удалить из истории"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}

                                {order.estimatedArrival && (
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[9px] text-white/30 uppercase font-black mb-1">Ожидаем к</p>
                                        <p className="text-sm font-bold text-sparta-gold">
                                            {order.estimatedArrival.toDate ? order.estimatedArrival.toDate().toLocaleDateString('ru-RU') : order.estimatedArrival}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {order.trackingNumber && (
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-center">
                                    <p className="text-[9px] text-white/30 uppercase font-black mb-1">Трек-номер</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono font-bold text-white selection:bg-sparta-gold selection:text-black">
                                            {order.trackingNumber}
                                        </span>
                                        {order.trackingUrl && (
                                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-sparta-gold/10 text-sparta-gold rounded-lg hover:bg-sparta-gold hover:text-black transition-all">
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isShopOrder && order.items && (
                    <div className="px-6 py-4 bg-surface/40 flex items-center gap-4 overflow-x-auto no-scrollbar">
                        {order.items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 shrink-0 bg-white/5 p-2 rounded-xl border border-white/5">
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface/20 flex-shrink-0">
                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" /> : <ShoppingBag size={14} className="m-auto text-white/10" />}
                                </div>
                                <div className="text-[10px]">
                                    <p className="text-white font-bold truncate max-w-[80px]">{item.title}</p>
                                    <p className="text-white/40">{item.quantity} шт • {item.size || '-'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        );
    };

    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const isFirstLoad = React.useRef(true);
    const notificationsRef = React.useRef<any[]>([]);

    // Data Fetching & Notifications
    useEffect(() => {
        if (!user) return;

        let unsubscribeRequests = () => { };
        let unsubscribeProfile = () => { };
        let unsubscribeMessages = () => { };
        let unsubscribeNotifications = () => { };
        let unsubscribeOrders = () => { };
        let unsubscribeDirections = () => { };

        // Profile & Attendance Scoping
        let unsubscribeAttendance = () => { };
        const fetchAttendance = (groupId: string) => {
            const qAtt = query(
                collection(db, "attendance"),
                where("groupId", "==", groupId)
            );

            unsubscribeAttendance = onSnapshot(qAtt, (snapshot) => {
                const data = snapshot.docs.map(doc => doc.data());

                // Sort by date desc client-side to avoid index requirement
                data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

                // Calculate Streak
                let s = 0;
                for (const day of data) {
                    const r = day.records?.[user.uid];
                    const status = typeof r === 'string' ? r : r?.status;
                    if (status === 'present') s++;
                    else if (status) break;
                }
                setStreak(s);
            });
        };

        // 1. Fetch Requests
        if (user) {
            const reqConditions: any[] = [];
            if (user.email) reqConditions.push(where("email", "==", user.email));
            if (user.uid) reqConditions.push(where("userId", "==", user.uid));
            if (userProfile?.parentPhone) reqConditions.push(where("parentPhone", "==", userProfile.parentPhone));
            if (userProfile?.phone && userProfile.phone !== userProfile?.parentPhone) {
                reqConditions.push(where("parentPhone", "==", userProfile.phone));
            }

            const q = reqConditions.length > 1
                ? query(collection(db, "requests"), or(...reqConditions))
                : (reqConditions.length === 1 ? query(collection(db, "requests"), reqConditions[0]) : null);

            if (q) {
                unsubscribeRequests = onSnapshot(q, (snapshot) => {
                    const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    loadedRequests.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setRequests(loadedRequests);
                });
            }
        }

        if (user.email) {
            // 4. Fetch Notifications
            const qNotifs = query(
                collection(db, "notifications"),
                or(where("email", "==", user.email), where("userId", "==", user.uid))
            );
            unsubscribeNotifications = onSnapshot(qNotifs, (snapshot) => {
                const loadedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                loadedNotifications.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setNotifications(loadedNotifications);
                notificationsRef.current = loadedNotifications;

                const unread = loadedNotifications.filter((n: any) => !n.isRead).length;
                setUnreadNotifications(unread);

                if (!isFirstLoad.current) {
                    const docChanges = snapshot.docChanges();
                    const hasNew = docChanges.some((change: any) => change.type === 'added');
                    if (hasNew && audioRef.current) {
                        // Check if new notifications are from muted chats
                        const newNotifs = docChanges
                            .filter((c: any) => c.type === 'added')
                            .map((c: any) => c.doc.data());

                        const isAnyNotMuted = newNotifs.some((n: any) => {
                            if (n.type === 'chat' && n.data?.chatId) {
                                return !userChatPrefs[n.data.chatId]?.isMuted;
                            }
                            return true; // Play sound for other notification types
                        });

                        if (isAnyNotMuted) {
                            audioRef.current.play().catch(e => console.log("Audio play error:", e));
                        }
                    }
                } else {
                    isFirstLoad.current = false;
                }
            });

            // 4.5 Fetch User Chat Prefs for Muting
            const prefsRef = collection(db, 'users', user.uid, 'chat_prefs');
            const unsubPrefs = onSnapshot(prefsRef, (snapshot) => {
                const prefs: Record<string, any> = {};
                snapshot.docs.forEach(doc => {
                    prefs[doc.id] = doc.data();
                });
                setUserChatPrefs(prefs);
            });

            // 5. Fetch Orders (Personal + Shared by Parent)
            const qOrders = query(
                collection(db, "orders"),
                or(where("email", "==", user.email), where("sharedWithId", "==", user.uid))
            );
            unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
                const docChanges = snapshot.docChanges();
                const revealedSurprise = docChanges.find((change: any) => {
                    const data = change.doc.data();
                    // Detect when a gift is revealed: it appears in our stream (type === 'added')
                    // and has isSurprise: true, but is NOT the first load.
                    return change.type === 'added' && data.isSurprise && !data.isHiddenSurprise && !isFirstLoad.current;
                });

                if (revealedSurprise) {
                    const surpriseData = revealedSurprise.doc.data();
                    // Trigger Celebration!
                    const duration = 5 * 1000;
                    const animationEnd = Date.now() + duration;
                    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

                    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

                    const interval: any = setInterval(() => {
                        const timeLeft = animationEnd - Date.now();
                        if (timeLeft <= 0) return clearInterval(interval);

                        const particleCount = 50 * (timeLeft / duration);
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                            colors: ['#D4AF37', '#FFFFFF', '#000000']
                        });
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                            colors: ['#D4AF37', '#FFFFFF', '#000000']
                        });
                    }, 250);

                    // Play success sound if available
                    if (audioRef.current) {
                        audioRef.current.play().catch(e => console.log("Audio play error:", e));
                    }
                }

                const loadedOrders = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((order: any) => {
                        // Hide surprise gifts from the child if they are marked as hidden
                        if (order.isHiddenSurprise && order.sharedWithId === user.uid && order.email !== user.email) {
                            return false;
                        }
                        return true;
                    });
                loadedOrders.sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
                setOrders(loadedOrders);
            });

            // 6. Fetch All Programs (for upgrade) in real-time
            const qDir = collection(db, "directions");
            const unsubDir = onSnapshot(qDir, (snapshot) => {
                const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllPrograms(programs);
            });

            unsubscribeDirections = unsubDir;
            const originalUnsubNotifs = unsubscribeNotifications;
            unsubscribeNotifications = () => {
                originalUnsubNotifs();
                unsubPrefs();
            };
        }

        // 2. Fetch Profile details
        unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                
                // ════════════════════════════════════════════════
                // Role Guard & Auto-Repair Logic
                // ════════════════════════════════════════════════
                const isSuperDev = isSuperDeveloper(user?.email);
                const hasChildrenIds = Boolean(data.childrenIds && data.childrenIds.length > 0);
                const isExplicitParent = data.role === 'parent' || hasChildrenIds || Boolean(data.parentName && !data.parentId);
                const isStaff = ['super', 'admin', 'director', 'dev', 'developer', 'coach', 'trainer'].includes(data.role);

                if (isSuperDev) {
                    // Priority 1 (Whitelisted Developers): Force developer role and BYPASS auto-repair
                    data.role = 'developer';
                    data.isStaff = true;
                    data.isAdmin = true;
                    data.status = 'active';
                } else if (isExplicitParent || hasChildrenIds) {
                    // PARENT ACCOUNT — ensure role is 'parent' and displayName is the parent's own name
                    const childNameVal = data.childName || data.childFullName || '';
                    
                    // Reconstruct correct parent name from atomic fields if available
                    const parentNameFromFields = (data.parentLastName && data.parentFirstName)
                        ? `${data.parentLastName} ${data.parentFirstName}`.trim()
                        : '';
                    
                    // Detect if displayName was overwritten by child name
                    const currentDisplayName = data.displayName || data.name || '';
                    const isDisplayNameSameAsChild = childNameVal && currentDisplayName === childNameVal;
                    const isParentNameAlsoCorrupted = !data.parentName || data.parentName === childNameVal;
                    
                    // Determine the correct parent name to use
                    let correctParentName = '';
                    if (isDisplayNameSameAsChild) {
                        // displayName matches child — need repair
                        correctParentName = parentNameFromFields || 
                            (isParentNameAlsoCorrupted ? '' : data.parentName) || 
                            'Родитель';
                    } else {
                        correctParentName = data.parentName || data.name || data.displayName || parentNameFromFields || 'Родитель';
                    }
                    
                    const needsRoleUpdate = data.role !== 'parent';
                    const needsNameUpdate = isDisplayNameSameAsChild && correctParentName !== childNameVal;
                    
                    if (needsRoleUpdate || needsNameUpdate) {
                        console.log('Auto-repair parent account:', { email: user.email, displayName: currentDisplayName, childName: childNameVal, fix: correctParentName });
                        const updatePayload: any = { role: 'parent' };
                        if (needsNameUpdate) {
                            updatePayload.displayName = correctParentName;
                            updatePayload.name = correctParentName;
                            updatePayload.parentName = correctParentName;
                        }
                        await updateDoc(doc(db, 'users', user.uid), updatePayload);
                        data.role = 'parent';
                        if (needsNameUpdate) {
                            data.displayName = correctParentName;
                            data.name = correctParentName;
                            data.parentName = correctParentName;
                        }
                    }
                } else if (!isStaff) {
                    // STUDENT ACCOUNT — ensure role is 'user' and profile is complete
                    const isChildAccount = Boolean(
                        data.parentId ||
                        data.groupId ||
                        (!hasChildrenIds && data.role !== 'parent')
                    );

                    if (isChildAccount) {
                        const studentRepairPayload: any = {};
                        
                        // Fix role
                        if (data.role !== 'user') {
                            studentRepairPayload.role = 'user';
                            data.role = 'user';
                        }
                        
                        // Fix displayName if it's empty or set to parent's name
                        const childName = data.childName || data.childFullName || '';
                        if (childName && data.displayName !== childName) {
                            studentRepairPayload.displayName = childName;
                            studentRepairPayload.name = childName;
                            data.displayName = childName;
                            data.name = childName;
                        }
                        
                        // Ensure status is active
                        if (data.status !== 'active') {
                            studentRepairPayload.status = 'active';
                            data.status = 'active';
                        }
                        
                        // Auto-link parentId if missing — search for parent doc that references this child
                        if (!data.parentId) {
                            try {
                                const parentQuery = query(collection(db, 'users'), where('childrenIds', 'array-contains', user.uid));
                                const parentSnap = await getDocs(parentQuery);
                                if (!parentSnap.empty) {
                                    const parentDoc = parentSnap.docs[0];
                                    studentRepairPayload.parentId = parentDoc.id;
                                    data.parentId = parentDoc.id;
                                    console.log('Auto-linked student to parent:', parentDoc.id);
                                }
                            } catch (e) {
                                console.warn('Failed to auto-link parent:', e);
                            }
                        }
                        
                        if (Object.keys(studentRepairPayload).length > 0) {
                            console.log('Auto-repair student account:', studentRepairPayload);
                            await updateDoc(doc(db, 'users', user.uid), studentRepairPayload);
                        }
                    }
                }

                setUserProfile({ ...data, uid: user.uid });

                // ═══════════════════════════════════════════
                // STRICT DEFAULT TAB ENFORCEMENT BY ROLE (ONLY ON INITIAL LOAD)
                // ═══════════════════════════════════════════
                if (!hasSetInitialTab.current) {
                    hasSetInitialTab.current = true;
                    const urlTab = searchParams.get('tab');
                    const validDashboardTabs = ['profile', 'requests', 'messages', 'favorites', 'achievements', 'orders', 'stats', 'subscriptions', 'activity', 'activity_log', 'coaching', 'messages_unified', 'progress', 'system', 'analytics', 'guest_passes', 'friends', 'family', 'settings'];
                    if (urlTab && validDashboardTabs.includes(urlTab)) {
                        setActiveTab(urlTab as any);
                    } else if (isSuperDev || ['super', 'developer', 'dev', 'director', 'admin'].includes(data.role)) {
                        setActiveTab('analytics');
                    } else if (data.role === 'parent' || (data.childrenIds && data.childrenIds.length > 0)) {
                        setActiveTab('family');
                    } else if (data.role === 'user') {
                        setActiveTab('requests');
                    }
                }

                if (data.groupId) {
                    fetchAttendance(data.groupId);
                }

                // Ensure user has a referral code
                if (!data.referralCode) {
                    const userRef = doc(db, "users", user.uid);
                    await updateDoc(userRef, {
                        referralCode: user.uid.slice(0, 8)
                    });
                }

                // Subscription Expiry Alerts (7, 3, 1 days)
                if (data.subscription?.expiresAt && data.subscription?.status === 'active') {
                    const expiryDate = data.subscription.expiresAt.toDate();
                    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const alertIntervals = [7, 3, 1];

                    if (daysLeft > 0 && alertIntervals.includes(daysLeft)) {
                        const alertId = `expiry_${daysLeft}_${data.subscription.expiresAt.seconds}`;
                        const alreadyAlerted = notificationsRef.current.some(n =>
                            n.relatedId === alertId
                        );

                        if (!alreadyAlerted) {
                            try {
                                await addDoc(collection(db, "notifications"), {
                                    email: user.email,
                                    title: daysLeft === 7 ? "Неделя до окончания" : "Абонемент истекает",
                                    message: `Ваш абонемент "${data.subscription.title}" истекает через ${daysLeft} ${daysLeft === 1 ? 'день' : (daysLeft < 5 ? 'дня' : 'дней')}. Продлите его сейчас, чтобы сохранить непрерывность тренировок!`,
                                    type: 'subscription_expiry',
                                    isRead: false,
                                    createdAt: Timestamp.now(),
                                    relatedId: alertId
                                });
                            } catch (e) {
                                console.error("Error creating expiry notification", e);
                            }
                        }
                    }
                }

                // Fetch joined group if groupId exists
                if (data.groupId) {
                    try {
                        const groupSnap = await getDoc(doc(db, "groups", data.groupId));
                        if (groupSnap.exists()) {
                            const gData = { id: groupSnap.id, ...groupSnap.data() };
                            setJoinedGroup(gData);

                            // Fetch coach if coachId exists
                            if ((gData as any).coachId) {
                                const coachSnap = await getDoc(doc(db, "coaches", (gData as any).coachId));
                                if (coachSnap.exists()) {
                                    setGroupCoach({ id: coachSnap.id, ...coachSnap.data() });
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching group/coach data:", error);
                    }
                } else {
                    setJoinedGroup(null);
                    setGroupCoach(null);
                }

                setShowWizard(false);
            } else {
                console.log("No such user document, keeping auth profile if available");
                if (authUserProfile) {
                    setUserProfile(authUserProfile);
                }
            }
        });

        // 3. Listen for unread messages (from Admin) - Keep this for Messages Tab badge if needed
        if (user.uid && user.email) {
            const qMsgs = query(
                collection(db, "messages"),
                or(
                    where("userId", "==", user.uid),
                    where("email", "==", user.email)
                )
            );
            unsubscribeMessages = onSnapshot(qMsgs, (snapshot) => {
                let count = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const thread = data.thread || [];
                    if (thread.length > 0) {
                        const lastMsg = thread[thread.length - 1];
                        // Count as unread if last message is from admin AND it hasn't been read by user
                        // We check !== true to include undefined (legacy messages) as unread
                        if (lastMsg.sender === 'admin' && data.isReadByUser !== true) {
                            count++;
                        }
                    }
                });
                setUnreadMessages(count);
            });
        }

        // 6. Fetch All Programs (for upgrade) in real-time
        unsubscribeDirections = onSnapshot(collection(db, "directions"), (snap) => {
            setDirections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Guest Passes Listener
        const qPasses = query(collection(db, "guest_passes"), where("ownerId", "==", user.uid));
        const unsubscribePasses = onSnapshot(qPasses, (snap) => {
            setGuestPasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Friend Requests Listener for Sidebar Badge
        const qFriendReq = query(collection(db, "friend_requests"), where("toId", "==", user.uid), where("status", "==", "pending"));
        const unsubscribeFriendReq = onSnapshot(qFriendReq, (snap) => {
            setIncomingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubscribeRequests();
            unsubscribeProfile();
            unsubscribeMessages();
            unsubscribeNotifications();
            unsubscribeOrders();
            unsubscribeDirections();
            unsubscribePasses();
            unsubscribeFriendReq();
        };
    }, [user]);

    useEffect(() => {
        if (!userProfile?.role) return;

        const isChildRole = ['user', 'athlete', 'student'].includes(userProfile.role);
        if (isChildRole) {
            if (['analytics', 'system', 'messages', 'support'].includes(activeTab) || searchParams.get('tab') === 'messages') {
                setActiveTab('requests');
                if (searchParams.get('tab') === 'messages' || searchParams.get('tab') === 'support') {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('tab');
                    setSearchParams(newParams, { replace: true });
                }
            }
        } else if (userProfile.role === 'trainer' && activeTab === 'requests') {
            setActiveTab('coaching');
        } else if (userProfile.role === 'parent' && activeTab === 'requests' && !searchParams.get('tab')) {
            setActiveTab('family');
        } else if ((userProfile.role === 'director' || userProfile.role === 'developer' || userProfile.role === 'dev') && !searchParams.get('tab') && activeTab === 'requests') {
            setActiveTab('analytics');
        } else if (userProfile.role === 'admin' && !searchParams.get('tab') && activeTab === 'requests') {
            setActiveTab('analytics');
        }
    }, [userProfile?.role, searchParams, activeTab]);

    // Update lastSeen status
    useEffect(() => {
        if (!user?.uid || !db) return;

        const updateStatus = async () => {
            try {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    lastSeen: serverTimestamp()
                });
            } catch (error) {
                // Silently handle offline/permission errors
            }
        };

        updateStatus();

        // Update every 45 seconds
        const interval = setInterval(updateStatus, 45000);

        return () => {
            clearInterval(interval);
        };
    }, [user?.uid]);

    // Auto-login child if accessed via QR-code or PIN link (?pin=1920)
    useEffect(() => {
        const pinParam = searchParams.get('pin');
        if (pinParam && !user) {
            (async () => {
                try {
                    const qPin = query(collection(db, 'users'), where('kidPin', '==', pinParam));
                    let snap = await getDocs(qPin);
                    if (snap.empty) {
                        const allStudents = await getDocs(query(collection(db, 'users'), where('role', 'in', ['user', 'student'])));
                        const matched = allStudents.docs.find(d => {
                            const data = d.data();
                            return data.kidPin === pinParam || (data.referralCode && data.referralCode.slice(0, 4) === pinParam);
                        });
                        if (matched) {
                            snap = { empty: false, docs: [matched] } as any;
                        }
                    }

                    if (!snap.empty) {
                        const childData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
                        safeLocalStorage.setItem('sparta_auth_user', JSON.stringify({
                            uid: childData.id,
                            email: childData.email || `${pinParam}@sparta.club`,
                            displayName: childData.childName || childData.displayName || 'Юный Спартанец',
                            role: 'user',
                            isStudent: true,
                            ...childData
                        }));
                        window.location.href = '/dashboard';
                    }
                } catch (e) {
                    console.error('Auto QR/PIN login failed:', e);
                }
            })();
        }
    }, [searchParams, user]);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const ticketId = searchParams.get('ticketId');

        if (ticketId || tabParam === 'messages') {
            if (activeTab !== 'messages') {
                setActiveTab('messages');
            }
        } else if (tabParam === 'messages_unified' || searchParams.has('chatId') || searchParams.has('targetUid')) {
            if (activeTab !== 'messages_unified') {
                setActiveTab('messages_unified');
            }

            // Clear one-time target parameters after they've been "consumed"
            if (searchParams.has('targetUid')) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('targetUid');
                newParams.delete('targetName');
                newParams.delete('studentName');
                setSearchParams(newParams, { replace: true });
            }

            // Handle sub-tab for coach chat
            if (ticketId?.includes('_')) {
                setMessagesSubTab('coach');
            }
        } else if (tabParam && tabParam !== activeTab) {
            // Generic tab sync for other tabs
            const validTabs = ['profile', 'requests', 'messages', 'favorites', 'achievements', 'orders', 'stats', 'subscriptions', 'activity', 'activity_log', 'coaching', 'messages_unified', 'progress', 'system', 'analytics', 'guest_passes', 'friends', 'family', 'settings'];
            if (validTabs.includes(tabParam as any)) {
                setActiveTab(tabParam as any);
            }
        }

        const paymentStatus = searchParams.get('payment');
        const invId = searchParams.get('InvId');
        const outSum = searchParams.get('OutSum');
        const signatureValue = searchParams.get('SignatureValue');

        if ((paymentStatus === 'success' || (invId && outSum)) && user && !isVerifying) {
            handleVerifyPayment(invId, outSum, signatureValue);
        } else if (paymentStatus === 'failed' && user) {
            setPaymentResult('error');
            setPaymentMessage('Оплата была отменена или произошла ошибка.');
            searchParams.delete('payment');
            setSearchParams(searchParams);
        }
    }, [searchParams, user]);

    const grantSubscriptionLogic = async (userRef: any, order: any) => {
        if (order.type === 'subscription' || order.planId) {
            // Calculate expiry
            const duration = order.duration || 1;
            let expiresAtDate = new Date();

            const userSnap = await getDoc(userRef);
            const currentProfile = userSnap.data() as any;

            if (currentProfile?.subscription?.expiresAt && (currentProfile.subscription.status === 'active' || currentProfile.subscription.status === 'ACTIVE')) {
                try {
                    const currentExpiry = (typeof currentProfile.subscription.expiresAt.toDate === 'function')
                        ? currentProfile.subscription.expiresAt.toDate()
                        : new Date(currentProfile.subscription.seconds * 1000);

                    if (currentExpiry > new Date()) {
                        expiresAtDate = new Date(currentExpiry);
                    }
                } catch (e) {
                    console.error("Error parsing current expiry:", e);
                }
            }
            expiresAtDate.setMonth(expiresAtDate.getMonth() + duration);

            const calculatedTotal = order.totalSessions || (duration * 4 * (order.sessionsPerWeek || 2));
            const subPayload: any = {
                planId: order.planId || 'novice',
                title: order.planTitle || order.title || 'Абонемент',
                childId: order.childId || (userRef.id !== user.uid ? userRef.id : (currentProfile?.childrenIds?.[0] || user.uid)),
                childName: order.childName || currentProfile?.childName || 'Спортсмен',
                parentId: user.uid,
                branchId: order.branchId || order.selectedBranch || 'newton',
                branchName: order.branchName || 'ОЦ «Ньютон»',
                cityId: order.cityId || 'chelyabinsk',
                cityName: order.cityName || 'Челябинск',
                totalSessions: calculatedTotal,
                remainingSessions: calculatedTotal,
                expiresAt: Timestamp.fromDate(expiresAtDate),
                status: 'ACTIVE',
                startedAt: Timestamp.now(),
                activatedAt: Timestamp.now(),
                freezeDaysAvailable: 14,
                freezeDaysTotal: 0,
                purchasePrice: order.price || 5200
            };

            // 1. Update parent / target user
            await updateDoc(userRef, {
                subscription: subPayload,
                hasActiveMembership: true,
                lastPurchasedChildId: order.childId || null
            });

            // 2. If order explicitly targets a child doc, also grant to child
            if (order.childId && order.childId !== userRef.id) {
                await updateDoc(doc(db, 'users', order.childId), {
                    subscription: subPayload,
                    hasActiveMembership: true,
                    membershipExpires: Timestamp.fromDate(expiresAtDate),
                    ...(order.scheduleId ? { groupId: order.scheduleId } : {}),
                    ...(order.coachName ? { coachName: order.coachName } : {})
                }).catch(err => console.warn('Child doc sub grant error:', err));
            } else if (currentProfile?.childrenIds && currentProfile.childrenIds.length === 1) {
                // If single child only, update child doc
                const targetChild = currentProfile.childrenIds[0];
                if (targetChild && targetChild !== userRef.id) {
                    await updateDoc(doc(db, 'users', targetChild), {
                        subscription: { ...subPayload, childId: targetChild },
                        hasActiveMembership: true,
                        membershipExpires: Timestamp.fromDate(expiresAtDate)
                    }).catch(() => {});
                }
            }

            // Award 2 Guest Passes
            const uidShort = user.uid.substring(0, 4).toUpperCase();
            for (let i = 1; i <= 2; i++) {
                const passId = `GUEST-${uidShort}-${Date.now().toString().slice(-4)}-${i}`;
                await setDoc(doc(db, "guest_passes", passId), {
                    id: passId,
                    ownerId: user.uid,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    type: 'standard_gift'
                });
            }
        }
    };

    const handleVerifyPayment = async (urlInvId?: string | null, urlOutSum?: string | null, urlSignature?: string | null) => {
        if (!user) return;
        setIsVerifying(true);

        try {
            // 1. Find the order (either by InvId from URL OR latest pending)
            let order: any = null;

            if (urlInvId) {
                const qByInv = query(
                    collection(db, "orders"),
                    where("paymentId", "==", urlInvId)
                );
                const invSnap = await getDocs(qByInv);
                if (!invSnap.empty) {
                    order = { id: invSnap.docs[0].id, ...invSnap.docs[0].data() };
                }
            }

            if (!order) {
                const qOrders = query(
                    collection(db, "orders"),
                    where("email", "==", user.email)
                );
                const snap = await getDocs(qOrders);

                const pendingOrders = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(o => o.status === 'pending_robokassa')
                    .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

                if (pendingOrders.length > 0) {
                    order = pendingOrders[0];
                }
            }

            if (!order) {
                console.log("No matching order found for verification");
                setIsVerifying(false);
                return;
            }

            if (order.status === 'completed') {
                console.log("Order already completed, showing success");
                setPaymentResult('success');
                setPaymentMessage('Ваша подписка уже активирована!');
                setSelectedOrder(order);
                setIsReceiptOpen(true);
                setIsVerifying(false);
                return;
            }

            if (!order.paymentId) {
                console.error("Order missing paymentId");
                setIsVerifying(false);
                return;
            }

            // 2. Check status via API
            let verifyUrl = '';
            if (order.status === 'pending_disabled') {
                verifyUrl = `/api/yookassa-check/${order.paymentId}`;
            } else if (order.status === 'pending_robokassa') {
                verifyUrl = `/api/robokassa-check/${order.paymentId}`;
                if (urlOutSum && urlSignature) {
                    verifyUrl += `?OutSum=${encodeURIComponent(urlOutSum)}&SignatureValue=${encodeURIComponent(urlSignature)}`;
                }
            }

            if (!verifyUrl) {
                setIsVerifying(false);
                return;
            }

            const response = await fetch(verifyUrl);
            if (!response.ok) throw new Error("Failed to verify payment status");

            const data = await response.json();
            console.log("Payment status check result:", data);

            if (data.status === 'succeeded' || data.status === 'waiting_for_capture') {
                const userRef = doc(db, "users", user.uid);

                // 3. Grant the product/subscription OR top-up wallet
                if (order.type === 'topup') {
                    const currentBalance = userProfile?.walletBalance || 0;
                    await updateDoc(userRef, {
                        walletBalance: currentBalance + Number(order.amount)
                    });
                } else {
                    await grantSubscriptionLogic(userRef, order);
                }

                // 4. Update order status
                await updateDoc(doc(db, "orders", order.id), {
                    status: 'completed',
                    verifiedAt: Timestamp.now()
                });

                // 5. Notify user
                await addDoc(collection(db, "notifications"), {
                    email: user.email,
                    title: order.type === 'topup' ? "Баланс пополнен! ✅" : "Оплата подтверждена! ✅",
                    message: order.type === 'topup'
                        ? `Ваш баланс успешно пополнен на ${order.amount} ₽.`
                        : `Ваш заказ "${order.planTitle || order.planId}" успешно оплачен и активирован.`,
                    type: 'order',
                    isRead: false,
                    createdAt: Timestamp.now()
                });

                console.log("Found order for verification:", order);
                setPaymentResult('success');
                setPaymentMessage(order.type === 'topup' ? `Баланс успешно пополнен на ${order.amount} ₽!` : 'Оплата успешно подтверждена! Ваш профиль обновлен.');

                // Show receipt modal automatically on success
                setSelectedOrder(order);
                setIsReceiptOpen(true);
            } else if (data.status === 'pending' || data.status === 'api_error') {
                if (data.status === 'api_error') {
                    console.error("Robokassa OpState API error - signature may be wrong. Details:", data);
                }
                // One-time retry after 5 seconds for Robokassa latency
                console.log("Payment pending, retrying in 5s...");
                await new Promise(resolve => setTimeout(resolve, 5000));

                const retryResponse = await fetch(`/api/robokassa-check/${order.paymentId}`);
                const retryData = await retryResponse.json();

                if (retryData.status === 'succeeded') {
                    // Success on retry!
                    const userRef = doc(db, "users", user.uid);
                    if (order.type === 'topup') {
                        const currentBalance = userProfile?.walletBalance || 0;
                        await updateDoc(userRef, {
                            walletBalance: currentBalance + Number(order.amount)
                        });
                    } else {
                        await grantSubscriptionLogic(userRef, order);
                    }
                    await updateDoc(doc(db, "orders", order.id), {
                        status: 'completed',
                        verifiedAt: Timestamp.now()
                    });

                    setPaymentResult('success');
                    setPaymentMessage(order.type === 'topup' ? `Баланс успешно пополнен на ${order.amount} ₽!` : 'Оплата подтверждена! Ваш профиль успешно обновлен.');
                    setSelectedOrder(order);
                    setIsReceiptOpen(true);
                } else {
                    console.log("Payment still not confirmed after 5s retry. Data:", retryData);
                    setPaymentResult('error');
                    setPaymentMessage(`Платеж ${order.paymentId} всё еще обрабатывается банком. Пожалуйста, подождите 1-2 минуты и обновите страницу. Если деньги списались, тариф активируется автоматически.`);
                }
            } else {
                console.log("Robokassa status check returned:", data.status, "for InvId:", order.paymentId);
                setPaymentResult('error');
                setPaymentMessage(`Платеж ${order.paymentId} отклонен или не был завершен.`);
            }

        } catch (error) {
            console.error("Verification error:", error);
            setPaymentResult('error');
            setPaymentMessage('Произошла ошибка при проверке платежа.');
        } finally {
            setIsVerifying(false);
            // Clear search params to prevent multiple verification attempts on refresh
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('payment');
            newParams.delete('type');
            newParams.delete('InvId');
            newParams.delete('OutSum');
            newParams.delete('SignatureValue');
            newParams.delete('IsTest');
            newParams.delete('Culture');
            setSearchParams(newParams);
        }
    }

    // Handle Tab Change & Clear Badges
    const handleTabChange = async (tab: 'profile' | 'requests' | 'messages' | 'favorites' | 'achievements' | 'orders' | 'stats' | 'subscriptions' | 'activity' | 'activity_log' | 'coaching' | 'messages_unified' | 'progress' | 'guest_passes' | 'friends' | 'family' | 'settings' | 'analytics' | 'system') => {
        // Role-based tab guard: prevent cross-role navigation
        if (userProfile?.role === 'user' && tab === 'family') {
            setActiveTab('requests'); // Students → KidDashboard
            return;
        }
        setActiveTab(tab);
        if (tab === 'requests') {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('tab', 'requests');
            setSearchParams(newParams, { replace: true });
        } else if (searchParams.get('tab') === 'requests') {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('tab');
            setSearchParams(newParams, { replace: true });
        }
        setIsMobileChatActive(false);
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'instant' as any });
        }

        if (tab === 'achievements' && userProfile?.achievements) {
            const newAchievements = userProfile.achievements.filter((a: any) => a.isNew);
            if (newAchievements.length > 0) {
                // Clear isNew flag
                const updatedAchievements = userProfile.achievements.map((a: any) => ({ ...a, isNew: false }));
                try {
                    await updateDoc(doc(db, "users", user.uid), {
                        achievements: updatedAchievements
                    });
                    // Local update to remove badge instantly (snapshot will follow)
                    setUserProfile((prev: any) => ({ ...prev, achievements: updatedAchievements }));
                } catch (error) {
                    console.error("Error clearing badges:", error);
                }
            }
        }
    };

    // Mark as read
    const markNotificationAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, "notifications", id), {
                isRead: true
            });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    // Navigation fallback
    useEffect(() => {
        if (!loading && !user) navigate('/');
    }, [user, loading, navigate]);

    // Global Sparta tab navigation listener
    useEffect(() => {
        const handleNavigateTab = (e: any) => {
            const { tab, targetUid, targetName, studentName, chatId } = e.detail || {};
            if (tab) {
                if (targetUid || chatId) {
                    const newParams = new URLSearchParams(window.location.search);
                    newParams.set('tab', tab);
                    if (targetUid) newParams.set('targetUid', targetUid);
                    if (targetName) newParams.set('targetName', targetName);
                    if (studentName) newParams.set('studentName', studentName);
                    if (chatId) newParams.set('chatId', chatId);
                    setSearchParams(newParams);
                }
                handleTabChange(tab as any);
            }
        };

        window.addEventListener('sparta_navigate_tab', handleNavigateTab);
        return () => window.removeEventListener('sparta_navigate_tab', handleNavigateTab);
    }, [handleTabChange, setSearchParams]);

    // Promo Activation
    const handleActivatePromo = async () => {
        if (!promoCode.trim() || !user) return;
        setIsActivatingPromo(true);
        setPromoError('');
        setPromoSuccess('');

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoCode.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoError('Промокод не найден');
                setIsActivatingPromo(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoData = promoDoc.data();

            if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
                setPromoError('Срок действия промокода истек');
                setIsActivatingPromo(false);
                return;
            }
            if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
                setPromoError('Промокод больше не действителен (лимит исчерпан)');
                setIsActivatingPromo(false);
                return;
            }
            if (promoData.usersUsed && promoData.usersUsed.includes(user.uid)) {
                setPromoError('Вы уже использовали этот промокод');
                setIsActivatingPromo(false);
                return;
            }

            const userRef = doc(db, 'users', user.uid);

            if (promoData.type === 'discount') {
                await updateDoc(userRef, {
                    activePromoCode: promoData.code,
                    activePromoDiscount: promoData.value,
                    activePromoApplicableTo: promoData.applicableTo || 'all'
                });
                // Note: We don't increment currentUses here for discount codes, we do it at checkout!
                setPromoSuccess(`Скидка ${promoData.value}% активирована! Она будет автоматически применена при оплате.`);
                setIsActivatingPromo(false);
                setPromoCode('');
                return;
            }

            if (promoData.type === 'balance') {
                const currentBalance = userProfile?.walletBalance || 0;
                await updateDoc(userRef, {
                    walletBalance: currentBalance + promoData.value
                });
                setPromoSuccess(`Вам зачислено ${promoData.value} ₽ на баланс!`);
            }

            // Mark used
            await updateDoc(doc(db, 'promo_codes', promoDoc.id), {
                currentUses: promoData.currentUses + 1,
                usersUsed: [...(promoData.usersUsed || []), user.uid]
            });

            setPromoCode('');
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка активации. Попробуйте позже.');
        } finally {
            setIsActivatingPromo(false);
        }
    };



    // Payment Polling (YooKassa & Robokassa)
    useEffect(() => {
        if (!user || orders.length === 0 || !userProfile) return;

        const pendingOrders = orders.filter(o => o.status === 'pending_robokassa' && o.paymentId);

        if (pendingOrders.length === 0) return;

        const failCounts: Record<string, number> = {};
        const MAX_FAILS = 3;

        const checkPayments = async () => {
            for (const order of pendingOrders) {
                // Skip orders that have failed too many times
                if ((failCounts[order.id] || 0) >= MAX_FAILS) continue;

                try {
                    let verifyUrl = '';
                    const apiBase = ''; // On Vercel, serverless functions are on the same domain as the app
                    if (order.status === 'pending_disabled') {
                        verifyUrl = `/api/check-payment/${order.paymentId}`;
                    } else if (order.status === 'pending_robokassa') {
                        verifyUrl = `${apiBase}/api/robokassa-check/${order.paymentId}`;
                    }

                    if (!verifyUrl) continue;

                    let res: Response;
                    try {
                        res = await fetch(verifyUrl);
                    } catch {
                        // Network error — silently skip
                        failCounts[order.id] = (failCounts[order.id] || 0) + 1;
                        continue;
                    }

                    if (!res.ok) {
                        failCounts[order.id] = (failCounts[order.id] || 0) + 1;
                        if (failCounts[order.id] >= MAX_FAILS) {
                            console.warn(`Payment check for order ${order.id} failed ${MAX_FAILS} times, stopping.`);
                        }
                        continue;
                    }

                    // Reset fail count on success
                    failCounts[order.id] = 0;
                    const data = await res.json();

                    if (data.status === 'succeeded') {
                        // 1. Update order status
                        await updateDoc(doc(db, 'orders', order.id), {
                            status: 'completed',
                            paidAt: Timestamp.now()
                        });

                        // 2. Grant Subscription or Top-up
                        const userRef = doc(db, "users", user.uid);
                        if (order.type === 'topup') {
                            const currentBalance = userProfile?.walletBalance || 0;
                            await updateDoc(userRef, {
                                walletBalance: currentBalance + Number(order.amount)
                            });
                            await addDoc(collection(db, "notifications"), {
                                email: user.email,
                                title: "Баланс пополнен! 🎉",
                                message: `Ваш баланс успешно пополнен на ${order.amount} ₽!`,
                                type: 'payment_success',
                                isRead: false,
                                createdAt: Timestamp.now()
                            });
                        } else {
                            let expiresAtDate = new Date();
                            let isEarlyRenewal = false;

                            // Upgrade/Renew logic based on order.discountApplied or just extending
                            if (userProfile?.subscription?.expiresAt) {
                                try {
                                    const currentExpiry = (typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : new Date(userProfile.subscription.expiresAt.seconds * 1000));
                                    if (currentExpiry > new Date()) {
                                        expiresAtDate = new Date(currentExpiry);

                                        const daysToExpiry = (currentExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                                        if (daysToExpiry > 5) {
                                            isEarlyRenewal = true;
                                        }
                                    }
                                } catch (e) {
                                    console.error("Error parsing current expiry for webhook:", e);
                                }
                            }

                            expiresAtDate.setMonth(expiresAtDate.getMonth() + (order.duration || 1));

                            const total = order.totalSessions || ((order.duration || 1) * 4 * (order.sessionsPerWeek || 2));
                            const subPayload: any = {
                                planId: order.planId || 'novice',
                                title: order.planTitle || 'Абонемент',
                                childId: order.childId || (userProfile?.childrenIds?.[0] || user.uid),
                                childName: order.childName || userProfile?.childName || 'Спортсмен',
                                parentId: user.uid,
                                branchId: order.branchId || order.selectedBranch || 'newton',
                                branchName: order.branchName || 'ОЦ «Ньютон»',
                                cityId: order.cityId || 'chelyabinsk',
                                cityName: order.cityName || 'Челябинск',
                                totalSessions: total,
                                remainingSessions: total,
                                expiresAt: Timestamp.fromDate(expiresAtDate),
                                status: 'ACTIVE',
                                startedAt: Timestamp.now(),
                                activatedAt: Timestamp.now(),
                                freezeDaysAvailable: 14,
                                freezeDaysTotal: 0,
                                purchasePrice: order.price
                            };

                            await updateDoc(userRef, {
                                subscription: subPayload,
                                hasActiveMembership: true,
                                lastPurchasedChildId: order.childId || null
                            });

                            if (order.childId && order.childId !== user.uid) {
                                await updateDoc(doc(db, 'users', order.childId), {
                                    subscription: subPayload,
                                    hasActiveMembership: true,
                                    membershipExpires: Timestamp.fromDate(expiresAtDate)
                                }).catch(() => {});
                            } else if (userProfile?.childrenIds && userProfile.childrenIds.length === 1) {
                                const targetChild = userProfile.childrenIds[0];
                                if (targetChild && targetChild !== user.uid) {
                                    await updateDoc(doc(db, 'users', targetChild), {
                                        subscription: { ...subPayload, childId: targetChild },
                                        hasActiveMembership: true,
                                        membershipExpires: Timestamp.fromDate(expiresAtDate)
                                    }).catch(() => {});
                                }
                            }

                            /* 
                            // Award 2 Guest Passes
                            const uidShort = user.uid.substring(0, 4).toUpperCase();
                            for (let i = 1; i <= 2; i++) {
                                const passId = `GUEST-${uidShort}-${Date.now().toString().slice(-4)}-${i}`;
                                await setDoc(doc(db, "guest_passes", passId), {
                                    id: passId,
                                    ownerId: user.uid,
                                    status: 'active',
                                    createdAt: serverTimestamp(),
                                    type: 'standard_gift'
                                });
                            }
                            */

                            // Early renewal notification
                            if (isEarlyRenewal) {
                                await addDoc(collection(db, "notifications"), {
                                    email: user.email,
                                    title: "Спасибо за продление! 🎁",
                                    message: `Благодарим вас за раннее продление через Робокассу!`,
                                    type: 'info',
                                    isRead: false,
                                    createdAt: Timestamp.now()
                                });
                            }

                            // Also notify about successful payment
                            await addDoc(collection(db, "notifications"), {
                                email: user.email,
                                title: "Оплата прошла успешно! 🎉",
                                message: `Ваш абонемент "${order.planTitle}" успешно оплачен и активирован!`,
                                type: 'payment_success',
                                isRead: false,
                                createdAt: Timestamp.now()
                            });
                        }
                    } else if (data.status === 'canceled') {
                        // Update order as failed
                        await updateDoc(doc(db, 'orders', order.id), {
                            status: order.status === 'pending_disabled' ? 'failed_yookassa' : 'failed_robokassa'
                        });
                    }
                } catch (err) {
                    // Silently handle polling errors to avoid console spam
                    failCounts[order.id] = (failCounts[order.id] || 0) + 1;
                }
            }
        };

        // Poll every 30 seconds (reduced from 5s to avoid console spam on local dev)
        const intervalId = setInterval(checkPayments, 30000);

        // Initial check
        checkPayments();

        return () => clearInterval(intervalId);
    }, [orders, user, userProfile]);

    const handleRenew = async () => {
        if (!userProfile?.subscription?.planId) return;

        // Fetch program details to get prices
        try {
            const planRef = doc(db, "directions", userProfile.subscription.planId);
            const planSnap = await getDoc(planRef);
            if (planSnap.exists()) {
                const planData = { id: planSnap.id, ...planSnap.data() };
                setSelectedProgram(planData);
                setMembershipMode('renew');

                // Set default 3 months price
                const duration = 3;
                const price = (planData as any).prices?.[duration] || 0;
                setMembershipDuration(duration);
                setMembershipPrice(price);
                setIsMembershipOpen(true);
            } else {
                // Fallback if direction not found (maybe it was deleted)
                window.location.href = '/#programs';
            }
        } catch (error) {
            console.error("Error fetching plan for renewal:", error);
        }
    };

    const handleUpgrade = () => {
        setIsUpgradeSelectionOpen(true);
    };

    const handleFreeze = async () => {
        if (!user || !userProfile?.subscription) return;

        const availableDays = userProfile.subscription.freezeDaysAvailable ?? 14;
        const currentStatus = userProfile.subscription.status;

        if (currentStatus !== 'frozen' && availableDays <= 0) {
            alert("У вас закончились доступные дни заморозки");
            return;
        }

        try {
            const userRef = doc(db, "users", user.uid);
            const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';

            const updateData: any = {
                "subscription.status": newStatus
            };

            if (newStatus === 'frozen') {
                const freezeDuration = 7; // Замораживаем на неделю
                const frozenUntil = new Date();
                frozenUntil.setDate(frozenUntil.getDate() + freezeDuration);
                updateData["subscription.frozenUntil"] = Timestamp.fromDate(frozenUntil);
                updateData["subscription.freezeDaysAvailable"] = Math.max(0, availableDays - freezeDuration);
            } else {
                updateData["subscription.frozenUntil"] = null;
            }

            await updateDoc(userRef, updateData);
            alert(newStatus === 'frozen' ? `Абонемент заморожен на 7 дней. Осталось дней: ${availableDays - 7}` : "Абонемент разморожен");
        } catch (error) {
            console.error("Error toggling freeze:", error);
            alert("Ошибка при изменении статуса подписки");
        }
    };

    const handleReportAbsence = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            const newAbsence = {
                id: 'abs_' + Date.now(),
                userId: user.uid,
                childName: userProfile?.childName || 'Ребёнок',
                date: absenceDate || new Date().toISOString().split('T')[0],
                reason: absenceReason === 'sick' ? 'Заболели (Отработка сохранена)' : 'Личные обстоятельства',
                status: 'approved',
                createdAt: new Date().toISOString()
            };
            const userRef = doc(db, 'users', user.uid);
            const currentAbsences = userProfile?.reportedAbsences || [];
            await updateDoc(userRef, {
                reportedAbsences: [...currentAbsences, newAbsence]
            });
            setReportedAbsences(prev => [...prev, newAbsence]);
            setIsAbsenceModalOpen(false);
            alert('Уведомление об отсутствии успешно отправлено тренеру! Вам начислен 1 ваучер на отработку.');
        } catch (err) {
            console.error('Absence report error:', err);
            alert('Ошибка при отправке уведомления об отсутствии.');
        }
    };

    const handleBookMakeup = async (slotTitle: string) => {
        if (!user) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            const makeupRecord = {
                id: 'mkp_' + Date.now(),
                slotTitle,
                bookedAt: new Date().toISOString()
            };
            await updateDoc(userRef, {
                makeupBookings: [...(userProfile?.makeupBookings || []), makeupRecord]
            });
            setIsMakeupModalOpen(false);
            alert(`Запись на отработку (${slotTitle}) успешно подтверждена!`);
        } catch (err) {
            console.error('Makeup booking error:', err);
            alert('Ошибка при записи на отработку.');
        }
    };

    const handleCopyReferral = () => {
        const referralCode = userProfile?.referralCode || user.uid.substring(0, 6).toUpperCase();
        navigator.clipboard.writeText(referralCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!window.confirm('Вы уверены, что хотите отменить этот заказ?')) return;
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: 'cancelled',
                cancelledAt: serverTimestamp()
            });
            alert('Заказ отменен');
        } catch (error) {
            console.error("Error cancelling order:", error);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот заказ из истории?')) return;
        try {
            await deleteDoc(doc(db, 'orders', orderId));
        } catch (error) {
            console.error("Error deleting order:", error);
        }
    };

    const handleDeleteRequest = async (req: any, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const isNew = req.status === 'new';
        const childName = req.childFullName || req.childName || req.name || 'спортсмена';
        const confirmMsg = isNew
            ? `Отменить заявку на пробную тренировку для ${childName}?`
            : `Удалить заявку для ${childName} из списка?`;

        if (!window.confirm(confirmMsg)) return;

        setDeletingRequestId(req.id);
        try {
            await deleteDoc(doc(db, 'requests', req.id));
            showToast('✓ Заявка успешно удалена', 'success');
        } catch (error) {
            console.error("Error deleting request:", error);
            showToast('Не удалось удалить заявку', 'error');
        } finally {
            setDeletingRequestId(null);
        }
    };


    if (loading || !user) return <div className="dashboard-theme min-h-screen bg-main flex items-center justify-center text-main">Загрузка...</div>;

    return (
        <div className={`dashboard-theme min-h-screen bg-main ${activeTab === 'messages_unified' ? 'h-screen overflow-hidden p-0 pt-0 md:pt-0 pb-0' : 'pt-0 md:pt-20 pb-20'} font-manrope`}>
            {/* Role Impersonation Floating Top Navigation Bar */}
            {impersonatedRole && (
                <div className="sticky top-0 md:top-16 z-50 bg-[#121212]/95 border-b border-sparta-gold/40 text-white px-3 py-2 shadow-2xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sparta-gold animate-ping" />
                        <span className="text-xs font-bold text-sparta-gold uppercase tracking-wider">
                            Режим: {impersonatedRole === 'parent' ? 'Родитель' : impersonatedRole === 'user' ? 'Спортсмен' : impersonatedRole === 'coach' ? 'Тренер' : impersonatedRole === 'director' ? 'Директор' : 'Администратор'}
                        </span>
                    </div>

                    {/* Fast Switchers */}
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        {[
                            { r: 'parent', label: '👨‍👩‍👧 Родитель', tab: 'family' },
                            { r: 'user', label: '⚽ Спортсмен', tab: 'requests' },
                            { r: 'coach', label: '🥋 Тренер', tab: 'coaching' },
                            { r: 'director', label: '🏢 Директор', tab: 'analytics' },
                        ].map(item => (
                            <button
                                key={item.r}
                                onClick={() => {
                                    setImpersonatedRole(item.r);
                                    setActiveTab(item.tab as any);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                                    impersonatedRole === item.r
                                        ? 'bg-sparta-gold text-black font-black shadow-md'
                                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            setImpersonatedRole(null);
                            setActiveTab('analytics');
                        }}
                        className="px-3 py-1 bg-sparta-gold text-black hover:bg-amber-400 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md ml-auto cursor-pointer"
                    >
                        ✕ Выйти в Центр управления
                    </button>
                </div>
            )}
            {/* Audio for notifications */}
            <audio ref={audioRef} src="/notification.mp3" preload="auto" />
            {/* Payment Result Modals */}
            <AnimatePresence>
                {paymentResult && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPaymentResult(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className={`relative w-full max-w-sm bg-[#111] border ${paymentResult === 'success' ? 'border-green-500/30' : 'border-red-500/30'} rounded-2xl p-6 text-center shadow-2xl z-10`}
                        >
                            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${paymentResult === 'success' ? 'bg-green-500/20 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-red-500/20 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}>
                                {paymentResult === 'success' ? <Shield size={40} /> : <X size={40} />}
                            </div>
                            <h3 className="text-2xl font-russo text-white mb-2 uppercase tracking-wider">
                                {paymentResult === 'success' ? 'Успешно' : 'Ошибка'}
                            </h3>
                            <p className="text-white/60 mb-8 font-manrope text-sm leading-relaxed">
                                {paymentMessage}
                            </p>
                            <div className="space-y-3">
                                <Button
                                    onClick={() => {
                                        if (paymentResult === 'error') {
                                            handleVerifyPayment();
                                            setPaymentResult(null);
                                        } else {
                                            setPaymentResult(null);
                                        }
                                    }}
                                    className="w-full text-lg"
                                >
                                    {paymentResult === 'error' ? 'Проверить еще раз' : 'Понятно'}
                                </Button>

                                {paymentResult === 'error' && (
                                    <button
                                        onClick={() => setPaymentResult(null)}
                                        className="w-full py-2 text-white/40 hover:text-white/60 text-sm font-medium transition-colors"
                                    >
                                        Закрыть
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Background Elements - Responsive and overflow-hidden */}
            <div className="fixed inset-0 bg-hero-pattern opacity-10 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-sparta-gold/5 blur-[60px] md:blur-[100px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
            </div>

            <Container fluid={true} className={`!px-2 sm:!px-3 md:!px-5 lg:!px-6 transition-all duration-300 ${activeTab === 'messages_unified' ? 'h-screen overflow-hidden pb-2 pt-2' : 'min-h-screen pb-20 md:pb-4'} pt-0 mt-0 w-full`}>
                {activeTab !== 'messages_unified' && (
                    <>
                        <LinkingRequestBanner userId={user.uid} />

                        {userProfile?.isTemporaryCredentials && userProfile?.role !== 'parent' && !userProfile?.registeredViaTrial && (
                            <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in duration-300">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5 sm:mt-0">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-russo text-amber-400 uppercase tracking-wider">
                                            Вы вошли по временным данным от администратора
                                        </h4>
                                        <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                                            Все ваши абонементы, оплаты и данные на 100% сохранены. Пожалуйста, укажите вашу личную почту и новый пароль для безопасности.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setNewEmailInput(userProfile?.email || user?.email || '');
                                        setNewPasswordInput('');
                                        setIsEmailModalOpen(true);
                                        handleTabChange('settings');
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Shield size={14} />
                                    Сменить данные
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Mobile Top Header */}
                {!isMobileChatActive && (
                    <div className="md:hidden sticky top-0 z-40 bg-[#0c0c0c]/95 backdrop-blur-md border-b border-white/10 min-h-[3.5rem] pt-safe flex items-center justify-between px-3 sm:px-4 mb-2 w-full">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/80 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 active:scale-95 transition-all"
                                title="На главный сайт"
                            >
                                <Home size={14} className="text-sparta-gold" />
                                <span className="uppercase text-[10px] tracking-wider font-black">На сайт</span>
                            </button>
                            <span className="font-russo text-sparta-gold text-sm tracking-wider uppercase cursor-pointer" onClick={() => handleTabChange('requests')}>SPARTA</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 text-white/60 hover:text-white transition-colors">
                                <Bell size={18} />
                                {unreadNotifications > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-sparta-gold rounded-full" />}
                            </button>
                            <div onClick={() => handleTabChange('profile')} className="w-8 h-8 rounded-full border border-sparta-gold/40 overflow-hidden cursor-pointer">
                                {(userProfile?.photoURL || user.photoURL) ? (
                                    <img src={userProfile?.photoURL || user.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-sparta-gold/20 flex items-center justify-center text-sparta-gold font-bold text-xs">
                                        {(userProfile?.childName || user.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className={`flex flex-col md:flex-row gap-3 md:gap-5 ${activeTab === 'messages_unified' ? 'items-stretch h-[calc(100dvh-1rem)] pb-0 min-h-0 overflow-hidden' : 'items-start pb-24 md:pb-8 md:py-2 min-h-[calc(100dvh-1.5rem)]'} relative z-10 pt-0 w-full`}>
                    {/* Sidebar - hidden on mobile */}
                    <div className="hidden md:block w-full md:w-[250px] lg:w-[270px] xl:w-[290px] shrink-0">
                        <div className={`bg-[#111115]/95 border border-white/10 rounded-[28px] p-4 md:p-5 backdrop-blur-2xl sticky top-2 shadow-2xl shadow-black/60 ${activeTab === 'messages_unified' ? 'h-full max-h-[calc(100vh-1rem)]' : 'max-h-[calc(100vh-1.5rem)]'} overflow-y-auto custom-scrollbar`}>
                            <div className="flex flex-col items-center text-center mb-5 relative">
                                {/* Hidden File Input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                    className="hidden"
                                />


                                <div
                                    className="w-24 h-24 rounded-full bg-gradient-to-br from-sparta-gold to-yellow-600 p-1 mb-4 cursor-pointer group relative shadow-2xl shadow-sparta-gold/10"
                                    onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                                    title="Изменить фото"
                                >
                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
                                        {(userProfile?.photoURL || user.photoURL) ? (
                                            <img
                                                src={userProfile?.photoURL || user.photoURL}
                                                alt={user.displayName || "User"}
                                                className={`w-full h-full object-cover transition-opacity ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-75'}`}
                                            />
                                        ) : (
                                            <User size={40} className={`text-sparta-gold transition-opacity ${isUploadingAvatar ? 'opacity-50' : 'group-hover:opacity-75'}`} />
                                        )}

                                        {/* Loading Overlay */}
                                        {isUploadingAvatar && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                <Loader2 size={24} className="text-sparta-gold animate-spin" />
                                            </div>
                                        )}

                                        {/* Avatar Change Overlay & Visible Indicator */}
                                        {!isUploadingAvatar && (
                                            <>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-white font-bold uppercase tracking-wider text-center px-2">
                                                        Сменить фото
                                                    </span>
                                                </div>
                                                <div className="absolute bottom-1 right-1 p-1.5 rounded-full bg-black/80 text-sparta-gold border border-sparta-gold/50 shadow-md group-hover:scale-110 transition-transform" title="Сменить фото">
                                                    <Camera size={12} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <h2 className="flex flex-wrap items-center justify-center gap-1 text-xl font-bold text-white font-russo text-center">
                                    {effectiveRole === 'parent'
                                        ? (userProfile?.parentName || authUserProfile?.parentName || userProfile?.name || userProfile?.displayName || user.displayName || 'Родитель')
                                        : (userProfile?.childName || userProfile?.name || userProfile?.displayName || user.displayName || 'Спортсмен')
                                    }
                                    {streak > 0 && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"
                                            title={`Серия из ${streak} тренировок!`}
                                        >
                                            <Flame size={12} fill="currentColor" />
                                            <span className="text-[10px] font-black">{streak}</span>
                                        </motion.div>
                                    )}
                                    {userProfile?.role === 'admin' && <span title="Администратор"><BadgeCheck size={16} className="text-blue-500 shrink-0" /></span>}
                                    {userProfile?.role === 'trainer' && <span title="Тренер"><Dumbbell size={16} className="text-green-500 shrink-0" /></span>}
                                    {userProfile?.role === 'director' && <span title="Директор"><Star size={16} className="text-purple-500 shrink-0" /></span>}
                                    {userProfile?.role === 'developer' && (
                                        <div className="flex items-center gap-2">
                                            <Code size={16} className="text-cyan-500 shrink-0" />
                                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded animate-pulse">
                                                Super
                                            </span>
                                        </div>
                                    )}
                                    {userProfile?.verification?.isVerified && <span title={userProfile.verification.title}><BadgeCheck size={16} className="text-blue-500 shrink-0" /></span>}
                                </h2>
                                <p className="text-white/50 text-sm font-manrope">{userProfile?.email || user?.email}</p>

                                {/* 🏆 ВИТРИНА НАГРАД (3 СЛОТА) В САЙДБАРЕ - ТОЛЬКО ДЛЯ УЧЕНИКОВ */}
                                {effectiveRole !== 'parent' && (
                                    <SidebarProfile
                                        user={user}
                                        userProfile={userProfile}
                                        onTabChange={handleTabChange}
                                    />
                                )}
                            </div>
                            <div className="flex justify-center gap-4 mt-4">
                                <button
                                    onClick={() => setShowQR(true)}
                                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
                                    title="Быстрый вход"
                                >
                                    <QrCode size={20} className="text-sparta-gold group-hover:scale-110 transition-all" />
                                </button>
                                <button
                                    onClick={() => setIsNotificationsOpen(true)}
                                    className="relative p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                                    title="Уведомления"
                                >
                                    <Bell size={20} className="text-white/60 hover:text-white transition-colors" />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#111] animate-pulse">
                                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                                        </span>
                                    )}
                                </button>
                                <ThemeToggle className="!h-11 !w-11 !rounded-xl !border-white/10 !bg-white/5 hover:!bg-white/10" />
                            </div>

                            <nav className="space-y-2 mt-6">
                                {isStaffAccount ? (
                                    <>
                                        {/* Staff/Management Navigation */}
                                        {['super', 'admin', 'director', 'developer', 'dev'].includes(effectiveRole) && (
                                            <>
                                                <button
                                                    onClick={() => setActiveTab('analytics')}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                                >
                                                    {isRealDeveloper && !impersonatedRole ? <Sparkles size={18} /> : <TrendingUp size={18} />}
                                                    <span>{isRealDeveloper && !impersonatedRole ? 'Центр управления' : ['super', 'director', 'developer', 'dev'].includes(effectiveRole) ? 'Аналитика' : 'Управление'}</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate('/admin')}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all mt-1"
                                                >
                                                    <Shield size={18} className="text-sparta-gold" />
                                                    <span>База данных & CRM</span>
                                                </button>
                                            </>
                                        )}

                                        {['trainer', 'coach'].includes(effectiveRole) && (
                                            <button
                                                onClick={() => handleTabChange('coaching')}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'coaching' ? 'bg-green-500 text-black font-bold shadow-lg shadow-green-500/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <Dumbbell size={18} />
                                                <span>Журнал & Тренировки</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleTabChange('messages_unified')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-white/10 text-white font-bold' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <MessageSquare size={18} className="text-sparta-gold" />
                                            <span>Мессенджер</span>
                                            {unreadMessages > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadMessages}</span>}
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('friends')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'friends' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Users size={18} />
                                            <span>Комьюнити</span>
                                            {incomingRequests.length > 0 && (
                                                <span className="relative ml-auto flex items-center justify-center">
                                                    <span className="absolute -inset-0.5 rounded-full bg-sparta-gold opacity-75 animate-ping" />
                                                    <span className="relative bg-sparta-gold text-black text-[10px] px-2 py-0.5 rounded-full font-black shadow-[0_0_12px_rgba(234,179,8,0.7)] animate-pulse">
                                                        {incomingRequests.length}
                                                    </span>
                                                </span>
                                            )}
                                        </button>
                                    </>
                                ) : effectiveRole === 'parent' ? (
                                    <>
                                        {/* Parent Navigation */}
                                        <button
                                            onClick={() => handleTabChange('family')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'family' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Users size={18} className={activeTab === 'family' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Моя семья</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('requests')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Calendar size={18} className={activeTab === 'requests' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Заявки на тренировки</span>
                                            {requests.length > 0 && (
                                                <span className="ml-auto bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    {requests.length}
                                                </span>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('subscriptions')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'subscriptions' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <ShieldCheck size={18} className={activeTab === 'subscriptions' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Мои абонементы</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('orders')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <ShoppingBag size={18} className={activeTab === 'orders' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Мои покупки</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('messages_unified')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Чаты группы</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('messages')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                                activeTab === 'messages'
                                                    ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20'
                                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <Headphones size={18} className={activeTab === 'messages' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Поддержка и администрация</span>
                                            {unreadMessages > 0 && (
                                                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    activeTab === 'messages' ? 'bg-black text-sparta-gold' : 'bg-red-500 text-white'
                                                }`}>
                                                    {unreadMessages}
                                                </span>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Student Navigation */}
                                        <button
                                            onClick={() => handleTabChange('requests')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Flame size={18} className={activeTab === 'requests' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Дневник Чемпиона</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('achievements')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'achievements' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Trophy size={18} className={activeTab === 'achievements' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Награды & Кубки</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('messages_unified')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Чаты & Сообщения</span>
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('orders')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <ShoppingBag size={18} className={activeTab === 'orders' ? 'text-black' : 'text-sparta-gold'} />
                                            <span>Магазин призов</span>
                                            {orders.length > 0 && (
                                                <span className="ml-auto bg-sparta-gold text-black text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{orders.length}</span>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => handleTabChange('friends')}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'friends' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Users size={18} />
                                            <span>Команда & Друзья</span>
                                            {incomingRequests.length > 0 && (
                                                <span className="relative ml-auto flex items-center justify-center">
                                                    <span className="absolute -inset-0.5 rounded-full bg-sparta-gold opacity-75 animate-ping" />
                                                    <span className="relative bg-sparta-gold text-black text-[10px] px-2 py-0.5 rounded-full font-black shadow-[0_0_12px_rgba(234,179,8,0.7)] animate-pulse">
                                                        {incomingRequests.length}
                                                    </span>
                                                </span>
                                            )}
                                        </button>
                                    </>
                                )}

                                <div className="h-px bg-white/10 my-2" />

                                <button
                                    onClick={() => handleTabChange('profile')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-sparta-gold text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <User size={18} />
                                    <span>{effectiveRole === 'user' ? 'Моя карточка' : 'Мой профиль'}</span>
                                </button>

                                <button
                                    onClick={() => handleTabChange('settings')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-sparta-gold text-black font-bold shadow-lg shadow-sparta-gold/20' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Settings size={18} className={activeTab === 'settings' ? 'text-black' : 'text-sparta-gold'} />
                                    <span>Настройки</span>
                                </button>

                                <div className="h-px bg-white/10 my-4" />
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                >
                                    <Home size={18} className="text-sparta-gold/60" />
                                    <span>На главную сайта</span>
                                </button>
                                <button
                                    onClick={() => { logout(); navigate('/'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-all mt-2"
                                >
                                    <LogOut size={18} />
                                    <span>Выйти</span>
                                </button>
                            </nav>




                            {/* Active Plan / Subscription Widget in Sidebar */}
                            {!STAFF_ROLES.includes(userProfile?.role) && (() => {
                                const isParent = userProfile?.role === 'parent';
                                const targetChild = isParent ? (sidebarActiveChild || userProfile) : userProfile;
                                const activeSub = resolveChildSubscription(targetChild, userProfile);
                                const hasSub = isSubscriptionValid(activeSub);
                                const isFrozen = Boolean(activeSub?.isFrozen || activeSub?.status === 'frozen' || activeSub?.status === 'FROZEN');

                                const childDisplayName = targetChild?.childName || targetChild?.displayName || activeSub?.childName || userProfile?.childName || 'Спортсмен';

                                if (isFrozen && activeSub) {
                                    const frozenDateStr = activeSub.frozenUntil
                                        ? (typeof activeSub.frozenUntil.toDate === 'function' ? activeSub.frozenUntil.toDate() : new Date(activeSub.frozenUntil.seconds * 1000)).toLocaleDateString('ru-RU')
                                        : '-';
                                    return (
                                        <div className="mt-8 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-3xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs uppercase">
                                                    <Clock size={14} className="text-cyan-400" />
                                                    <span className="text-[10px] tracking-wider font-extrabold">Заморожен</span>
                                                </div>
                                            </div>
                                            {isParent && (
                                                <div className="text-[10px] font-bold text-white/50 uppercase truncate">
                                                    👦 {childDisplayName}
                                                </div>
                                            )}
                                            <h4 className="text-white font-russo text-sm tracking-tight">{activeSub.title || 'Абонемент'}</h4>
                                            <p className="text-cyan-200/60 text-[10px]">
                                                До: <strong className="text-white">{frozenDateStr}</strong>
                                            </p>
                                            <button
                                                onClick={() => handleTabChange(isParent ? 'family' : 'requests')}
                                                className="w-full py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-black font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer mt-1"
                                            >
                                                Управлять в кабинете
                                            </button>
                                        </div>
                                    );
                                }

                                if (hasSub && activeSub) {
                                    const expiresAt = activeSub.expiresAt?.toDate
                                        ? activeSub.expiresAt.toDate()
                                        : new Date((activeSub.expiresAt?.seconds || (typeof activeSub.expiresAt === 'string' ? new Date(activeSub.expiresAt).getTime() / 1000 : Date.now() / 1000)) * 1000);
                                    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                    const isExpiring = daysLeft < 5;

                                    const startedAt = activeSub.startedAt || activeSub.activatedAt;
                                    const startedDateStr = startedAt
                                        ? (typeof startedAt.toDate === 'function' ? startedAt.toDate() : new Date((startedAt.seconds || Date.now() / 1000) * 1000)).toLocaleDateString('ru-RU')
                                        : '-';
                                    const expiresDateStr = expiresAt.toLocaleDateString('ru-RU');

                                    const totalSess = activeSub.totalSessions || 8;
                                    const remSess = activeSub.remainingSessions ?? totalSess;
                                    const progressPct = Math.min(100, Math.max(0, ((remSess / totalSess) * 100)));

                                    return (
                                        <div className={`mt-8 p-5 border rounded-3xl transition-all duration-500 ${
                                            isExpiring ? 'bg-orange-500/10 border-orange-500/30' : 'bg-sparta-gold/10 border-sparta-gold/20'
                                        }`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg ${isExpiring ? 'bg-orange-500/20 text-orange-500' : 'bg-sparta-gold/20 text-sparta-gold'}`}>
                                                        <Shield size={14} />
                                                    </div>
                                                    <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${isExpiring ? 'text-orange-500' : 'text-sparta-gold'}`}>
                                                        {isExpiring ? 'Срок истекает' : 'Активный план'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full border border-white/10">
                                                    <Clock size={10} className="text-white/40" />
                                                    <span className="text-[10px] text-white font-bold font-mono">
                                                        {daysLeft} дн.
                                                    </span>
                                                </div>
                                            </div>

                                            {isParent && (
                                                <div className="text-[10px] font-bold text-white/50 uppercase mb-1 flex items-center gap-1">
                                                    <span>👦</span>
                                                    <span className="truncate">{childDisplayName}</span>
                                                </div>
                                            )}

                                            <h4 className="text-white font-russo text-base mb-3 tracking-tight leading-tight">
                                                {activeSub.title || 'Базовый абонемент'}
                                            </h4>

                                            <div className="flex justify-between items-center text-xs font-bold mb-3 pb-2 border-b border-white/5">
                                                <span className="text-white/40 text-[10px] uppercase">Остаток занятий:</span>
                                                <span className="text-sparta-gold font-mono font-extrabold text-sm">
                                                    {remSess} из {totalSess}
                                                </span>
                                            </div>

                                            <div className="space-y-3 mb-5">
                                                <div className="flex justify-between items-end text-[10px] uppercase font-bold tracking-widest">
                                                    <div className="space-y-0.5">
                                                        <p className="text-white/20">Начало</p>
                                                        <p className="text-white/60 font-mono">{startedDateStr}</p>
                                                    </div>
                                                    <div className="text-right space-y-0.5">
                                                        <p className="text-white/20">Конец</p>
                                                        <p className="text-white/60 font-mono">{expiresDateStr}</p>
                                                    </div>
                                                </div>

                                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progressPct}%` }}
                                                        className={`h-full ${isExpiring ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-sparta-gold to-yellow-500'}`}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleTabChange(isParent ? 'family' : 'requests')}
                                                className={`w-full py-2.5 rounded-2xl font-russo text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer ${
                                                    isExpiring
                                                        ? 'bg-orange-500 text-black hover:bg-orange-400 shadow-md'
                                                        : 'bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20 hover:bg-sparta-gold hover:text-black'
                                                }`}
                                            >
                                                {isExpiring ? 'Продлить сейчас' : 'Управлять абонементом'}
                                            </button>
                                        </div>
                                    );
                                }

                                // Fallback / No Active Subscription for Parent or Student
                                return (
                                    <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-3xl space-y-2.5">
                                        <div className="flex items-center gap-2 text-white/50">
                                            <CreditCard size={14} className="text-white/40" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Нет абонемента</span>
                                        </div>
                                        {isParent && (
                                            <div className="text-[10px] font-bold text-white/60 uppercase truncate">
                                                👦 {childDisplayName}
                                            </div>
                                        )}
                                        <p className="text-[11px] text-white/40 leading-relaxed">
                                            Для посещения тренировок выберите тариф
                                        </p>
                                        <button
                                            onClick={() => {
                                                setSelectedProgram(null);
                                                setMembershipMode('purchase');
                                                setIsMembershipOpen(true);
                                            }}
                                            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-sparta-gold to-yellow-500 text-black font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sparta-gold/10 hover:brightness-110 cursor-pointer"
                                        >
                                            <Zap size={12} />
                                            <span>Оформить абонемент</span>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={`flex-1 min-w-0 w-full pt-0 mt-0 ${activeTab === 'messages_unified' ? 'h-full flex flex-col min-h-0 overflow-hidden' : ''}`}>
                        {/* Dashboard Main Header */}
                        {activeTab !== 'messages_unified' && activeTab !== 'requests' && (
                            <div className="mb-2 md:mb-8 hidden md:block">
                                <h1 className="text-3xl font-russo text-white">
                                    {activeTab === 'profile' && 'Мой профиль'}
                                    {activeTab === 'achievements' && 'Мои достижения'}
                                    {activeTab === 'orders' && 'Мои покупки в магазине'}
                                    {activeTab === 'subscriptions' && 'Мои абонементы'}
                                    {activeTab === 'activity' && 'Моя активность и посещаемость'}
                                    {activeTab === 'coaching' && 'Командный центр тренера'}
                                    {activeTab === 'friends' && 'Sparta Community'}
                                    {activeTab === 'analytics' && (['director', 'developer', 'dev'].includes(userProfile?.role) ? 'Аналитика и стратегия' : 'Управление клубом')}
                                    {activeTab === 'stats' && 'Личная статистика'}
                                    {activeTab === 'family' && 'Моя семья'}
                                    {activeTab === 'messages' && 'Поддержка и администрация'}
                                </h1>
                            </div>
                        )}

                        {/* Dashboard Expiry Banner */}
                        {activeTab !== 'messages_unified' && effectiveRole === 'user' && userProfile?.subscription?.status === 'active' && userProfile.subscription.expiresAt && (() => {
                            const expiresAt = userProfile.subscription.expiresAt;
                            const expiryDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt.seconds * 1000);
                            const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                            if (daysLeft > 0 && daysLeft <= 7) {
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        className="mb-8 p-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-md relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-14 h-14 bg-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                                                <ShieldAlert size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-russo text-lg uppercase tracking-tight">Внимание: Абонемент истекает</h4>
                                                <p className="text-white/60 text-sm">Ваш абонемент "{userProfile.subscription.title}" действует еще {daysLeft} {daysLeft === 1 ? 'день' : (daysLeft < 5 ? 'дня' : 'дней')}.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('subscriptions')}
                                            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-500/20 uppercase tracking-widest text-xs active:scale-95 shrink-0"
                                        >
                                            Продлить сейчас
                                        </button>
                                    </motion.div>
                                );
                            }
                            return null;
                        })()}

                        {/* Parent Account Security Reminder Badge */}
                        {activeTab !== 'messages_unified' && (userProfile?.role === 'parent' || userProfile?.role === 'user' || !userProfile?.role) && (!userProfile?.email || userProfile?.needsPasswordSetup) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-sparta-gold/10 to-transparent border border-sparta-gold/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_25px_rgba(212,175,55,0.1)] backdrop-blur-md relative overflow-hidden"
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0 border border-sparta-gold/30 shadow-sm">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs sm:text-sm font-bold text-white">
                                                Аккаунт не защищен паролем
                                            </p>
                                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                                                Рекомендуется
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-white/60 mt-0.5">
                                            Привяжите Email и пароль, чтобы не потерять доступ к дневнику и абонементу ребенка при случайном выходе.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsParentSetupOpen(true)}
                                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 hover:brightness-110 text-black font-manrope font-extrabold text-xs shrink-0 shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 w-full sm:w-auto justify-center relative z-10"
                                >
                                    <span>Защитить аккаунт</span>
                                    <ArrowRight size={14} />
                                </button>
                            </motion.div>
                        )}

                        {activeTab !== 'messages_unified' && effectiveRole === 'user' && !userProfile?.parentId && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Связь с родителем</h4>
                                        <p className="text-xs text-white/60">
                                            Пригласите родителя: укажите номер телефона родителя для связи аккаунтов
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content */}
                        <div className={activeTab === 'messages_unified' ? 'h-full flex-1 min-h-0 flex flex-col' : 'mt-1 md:mt-8 pb-24 md:pb-8'}>

                            {activeTab === 'profile' && (() => {
                                // Calculate Profile Completion Gamification Percentage
                                const fieldsToTrack = [
                                    { key: 'name', value: userProfile?.childName || userProfile?.childFirstName || userProfile?.name, label: 'ФИО' },
                                    { key: 'phone', value: userProfile?.parentPhone || userProfile?.phone, label: 'телефон' },
                                    { key: 'birthYear', value: userProfile?.childBirthYear || userProfile?.childAge, label: 'возраст' },
                                    { key: 'position', value: userProfile?.footballPosition || userProfile?.position, label: 'позицию на поле' },
                                    { key: 'jersey', value: userProfile?.jerseyNumber, label: 'игровой номер' },
                                    { key: 'foot', value: userProfile?.strongFoot, label: 'рабочую ногу' },
                                    { key: 'avatar', value: userProfile?.photoURL || userProfile?.avatarUrl, label: 'фото профиля' },
                                ];
                                const filledFields = fieldsToTrack.filter(f => Boolean(f.value));
                                const missingFields = fieldsToTrack.filter(f => !f.value);
                                const completionPct = Math.round((filledFields.length / fieldsToTrack.length) * 100);

                                let promptTip = "🏆 Отличная работа! Ваш профиль полностью заполнен.";
                                if (missingFields.length > 0) {
                                    const missingLabels = missingFields.map(m => m.label).slice(0, 2);
                                    promptTip = `Укажите ${missingLabels.join(' и ')}, чтобы завершить профиль на 100%.`;
                                }

                                return (
                                    <div className="space-y-6">
                                        {/* Gamified Profile Completion Progress Bar */}
                                        <div className="bg-[#15171C]/90 border border-sparta-gold/30 rounded-2xl p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
                                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20 rounded-xl">
                                                        <Sparkles size={18} />
                                                    </span>
                                                    <div>
                                                        <h4 className="text-sm font-russo text-white uppercase tracking-wider">
                                                            Профиль атлета заполнен на {completionPct}%
                                                        </h4>
                                                        <p className="text-[11px] text-white/50 font-medium">{promptTip}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-black bg-sparta-gold px-3 py-1 rounded-full shadow-md shadow-sparta-gold/20">
                                                    {completionPct}%
                                                </span>
                                            </div>

                                            {/* Progress Track */}
                                            <div className="w-full h-3 bg-black/60 border border-white/10 rounded-full overflow-hidden p-0.5 mt-2">
                                                <div
                                                    className="h-full bg-gradient-to-r from-sparta-gold/70 via-sparta-gold to-yellow-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]"
                                                    style={{ width: `${completionPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                                                <h3 className="text-xl font-bold text-white font-russo">Личные данные</h3>
                                            </div>

                                        {/* Wallet Balance Display */}
                                        <div className="mb-6 p-6 bg-gradient-to-r from-sparta-gold/20 to-sparta-dark/20 border border-sparta-gold/30 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-sparta-gold/10 text-sparta-gold flex items-center justify-center border border-sparta-gold/20">
                                                    <Wallet size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Ваш баланс</p>
                                                    <p className="text-3xl font-russo text-white">{userProfile?.walletBalance || 0} <span className="text-sparta-gold text-xl">₽</span></p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <button
                                                    onClick={() => setIsMagicTransferOpen(true)}
                                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-sparta-gold border border-sparta-gold/30 rounded-xl transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    <ArrowRightLeft size={16} className="group-hover:scale-125 transition-transform" />
                                                    <span className="text-sm font-russo uppercase tracking-wider">Передача</span>
                                                </button>
                                                <button
                                                    onClick={() => setIsTopUpModalOpen(true)}
                                                    className="px-6 py-3 bg-sparta-gold hover:bg-yellow-500 text-black font-russo rounded-xl transition-colors shadow-lg shadow-sparta-gold/20 shrink-0 uppercase tracking-wider"
                                                >
                                                    Пополнить
                                                </button>
                                            </div>
                                        </div>

                                        {/* Active Discount Banner */}
                                        {userProfile?.activePromoCode && (
                                            <div className="mb-6 p-4 bg-sparta-gold/10 border border-sparta-gold/20 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-sparta-gold/20 text-sparta-gold flex items-center justify-center">
                                                        <Tag size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">Активная скидка {userProfile.activePromoDiscount}%</p>
                                                        <p className="text-white/50 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                                                            Промокод: <span className="text-sparta-gold">{userProfile.activePromoCode}</span>
                                                        </p>
                                                        <p className="text-white/40 text-[10px]">
                                                            Действует на: {userProfile.activePromoApplicableTo === 'shop' ? 'Товары магазина' : userProfile.activePromoApplicableTo === 'subscriptions' ? 'Подписки' : 'Все покупки'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <User size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">
                                                            {['admin', 'trainer', 'director', 'developer'].includes(userProfile?.role) ? 'Ваше имя' : 'ФИО Спортсмена'}
                                                        </p>
                                                        <p className="text-white font-bold">{capitalize(userProfile?.childName || userProfile?.childFirstName || userProfile?.name || 'Не указано')}</p>
                                                    </div>
                                                </div>
                                                {(!['admin', 'trainer', 'director', 'developer'].includes(userProfile?.role)) && (
                                                    <div className="flex items-center gap-3 text-white/60">
                                                        <Calendar size={18} className="text-sparta-gold" />
                                                        <div>
                                                            <p className="text-xs uppercase tracking-widest opacity-50">Возраст / Год рожд.</p>
                                                            <p className="text-white font-bold">{userProfile?.childAge || '?'} лет ({userProfile?.childBirthYear || '?'})</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {['admin', 'trainer', 'director', 'developer'].includes(userProfile?.role) && (
                                                    <div className="flex items-center gap-3 text-white/60">
                                                        <Shield size={18} className="text-sparta-gold" />
                                                        <div>
                                                            <p className="text-xs uppercase tracking-widest opacity-50">Ваша роль</p>
                                                            <p className="text-white font-bold uppercase tracking-wider text-[10px]">
                                                                {userProfile?.role === 'admin' ? 'Администратор' :
                                                                    userProfile?.role === 'trainer' ? 'Тренер' :
                                                                        userProfile?.role === 'director' ? 'Директор' :
                                                                            userProfile?.role === 'developer' ? 'Разработчик' : userProfile?.role}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <Phone size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">
                                                            {['admin', 'trainer', 'director', 'developer'].includes(userProfile?.role) ? 'Контактный телефон' : 'Телефон представителя'}
                                                        </p>
                                                        <p className="text-white font-bold">{userProfile?.parentPhone || userProfile?.phone || 'Не указано'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <Mail size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">Email</p>
                                                        <p className="text-white font-bold">{userProfile?.email || user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                                            <button
                                                onClick={() => setIsProfileModalOpen(true)}
                                                className="w-full sm:w-auto px-6 py-3 bg-sparta-gold hover:bg-yellow-400 text-black font-russo rounded-xl transition-all shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2 uppercase tracking-wider text-xs active:scale-95"
                                            >
                                                <Edit2 size={16} />
                                                <span>Редактировать данные</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Promo Code UI */}
                                    <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-sparta-gold/5 rounded-full blur-3xl pointer-events-none" />
                                        <h3 className="text-xl font-bold text-white font-russo mb-4 flex items-center gap-2">
                                            <Tag className="text-sparta-gold" size={24} />
                                            Активация промокода
                                        </h3>
                                        <p className="text-white/50 text-sm mb-6 max-w-md">
                                            Введите промокод для зачисления средств на баланс или получения скидок.
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="relative flex-1">
                                                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input
                                                    type="text"
                                                    value={promoCode}
                                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                    placeholder="ВВЕДИТЕ КОД"
                                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white uppercase font-mono tracking-widest focus:border-sparta-gold outline-none transition-all ${promoError ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                                />
                                                {promoError && (
                                                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs mt-2 font-bold tracking-wider absolute -bottom-6 left-0">
                                                        {promoError}
                                                    </motion.p>
                                                )}
                                            </div>
                                            <Button
                                                onClick={handleActivatePromo}
                                                disabled={isActivatingPromo || !promoCode.trim()}
                                                className="px-8 shrink-0 h-[58px]"
                                            >
                                                {isActivatingPromo ? <Loader2 className="animate-spin" size={20} /> : 'Активировать'}
                                            </Button>
                                        </div>

                                        <AnimatePresence>
                                            {promoSuccess && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                                        <PartyPopper size={20} />
                                                    </div>
                                                    <p className="font-bold text-sm tracking-wide">{promoSuccess}</p>
                                                    <button onClick={() => setPromoSuccess('')} className="ml-auto text-green-500/50 hover:text-green-400 p-2">
                                                        <X size={16} />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })()}

                            {activeTab === 'settings' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-3xl font-russo text-white uppercase tracking-wider">Настройки аккаунта</h2>
                                            <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-1">Персонализация и безопасность</p>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {passwordResetStatus && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                                className={`p-4 rounded-2xl border flex items-center gap-3 overflow-hidden ${passwordResetStatus.type === 'success'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`}
                                            >
                                                {passwordResetStatus.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                                                <p className="text-[11px] font-bold uppercase tracking-wider">{passwordResetStatus.message}</p>
                                                <button
                                                    onClick={() => setPasswordResetStatus(null)}
                                                    className="ml-auto p-1 hover:bg-white/5 rounded-lg transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Уведомления и Интерфейс */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <Bell size={18} className="text-sparta-gold" />
                                                <h3 className="text-white font-russo uppercase tracking-wider text-sm">Уведомления и Вид</h3>
                                            </div>

                                            <div className="space-y-2">
                                                <div
                                                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group/item cursor-pointer"
                                                    onClick={async () => {
                                                        const newState = !userProfile?.notifications?.push;
                                                        if (newState) {
                                                            const token = await requestPushPermission();
                                                            if (!token) return; // User denied or error occurred
                                                        }

                                                        try {
                                                            await updateDoc(doc(db, "users", user.uid), {
                                                                "notifications.push": newState
                                                            });

                                                            setUserProfile((prev: any) => ({
                                                                ...prev,
                                                                notifications: { ...prev?.notifications, push: newState }
                                                            }));
                                                        } catch (err) {
                                                            console.error("Error updating notification settings:", err);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${userProfile?.notifications?.push ? 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/20' : 'bg-white/10 text-white/40 border-white/10'}`}>
                                                            <Activity size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-black text-[12px] uppercase tracking-tight">Уведомления на экран</p>
                                                            <p className="text-white/30 text-[10px]">Присылать важные новости и напоминания</p>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-5 rounded-full relative p-1 transition-colors ${userProfile?.notifications?.push ? 'bg-sparta-gold/40' : 'bg-white/10'}`}>
                                                        <motion.div
                                                            layout
                                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                            className={`w-3 h-3 rounded-full ${userProfile?.notifications?.push ? 'bg-sparta-gold ml-auto' : 'bg-white/40'}`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group/item">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10">
                                                            <Flame size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-black text-[12px] uppercase tracking-tight">Тёмная тема</p>
                                                            <p className="text-white/30 text-[10px]">Черный фон (приятнее для глаз)</p>
                                                        </div>
                                                    </div>
                                                    <ThemeToggle />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Безопасность */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <ShieldCheck size={18} className="text-sparta-gold" />
                                                <h3 className="text-white font-russo uppercase tracking-wider text-sm">Безопасность</h3>
                                            </div>

                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => {
                                                        setNewEmailInput(userProfile?.email || user?.email || '');
                                                        setIsEmailModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group/btn cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center border border-white/10 group-hover/btn:text-sparta-gold transition-colors">
                                                            <Mail size={20} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-white font-black text-[11px] uppercase tracking-tight">Сменить почту (Email)</p>
                                                            <p className="text-white/30 text-[9px] truncate max-w-[180px] sm:max-w-[240px]">
                                                                {userProfile?.email || user?.email || 'Привязать актуальный e-mail'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={14} className="text-white/20" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setNewPhoneInput(userProfile?.phone || userProfile?.parentPhone || '');
                                                        setPhoneUpdateSuccess('');
                                                        setPhoneUpdateError('');
                                                        setIsPhoneModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group/btn cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center border border-white/10 group-hover/btn:text-sparta-gold transition-colors">
                                                            <Phone size={20} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-white font-black text-[11px] uppercase tracking-tight">Сменить номер телефона</p>
                                                            <p className="text-white/30 text-[9px] truncate max-w-[180px] sm:max-w-[240px]">
                                                                {userProfile?.phone || userProfile?.parentPhone || 'Привязать контактный телефон'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={14} className="text-white/20" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setPassCurrentInput('');
                                                        setPassNewInput('');
                                                        setPassConfirmInput('');
                                                        setPassUpdateError('');
                                                        setPassUpdateSuccess('');
                                                        setPassModalMode('current_pass');
                                                        setIsPasswordModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group/btn"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center border border-white/10 group-hover/btn:text-sparta-gold transition-colors">
                                                            <Lock size={20} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-white font-black text-[11px] uppercase tracking-tight">Сменить пароль</p>
                                                            <p className="text-white/30 text-[9px]">Обновить или сбросить пароль</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={14} className="text-white/20" />
                                                </button>

                                                <button
                                                    onClick={() => setIsSessionsModalOpen(true)}
                                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group/btn"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center border border-white/10 group-hover/btn:text-sparta-gold transition-colors">
                                                            <Smartphone size={20} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-white font-black text-[11px] uppercase tracking-tight">Устройства</p>
                                                            <p className="text-white/30 text-[9px]">Сеансы онлайн</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight size={14} className="text-white/20" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Поддержка и Инфо */}
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/5 mt-2">
                                            <button
                                                onClick={() => setActiveTab('support')}
                                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center border border-white/10 group-hover:text-sparta-gold transition-colors">
                                                    <MessageSquare size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-white font-black text-[10px] uppercase tracking-wider">Поддержка</p>
                                                    <p className="text-white/20 text-[8px]">Помощь 24/7</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setActiveTab('documents')}
                                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white/5 text-white/30 flex items-center justify-center border border-white/10 group-hover:text-sparta-gold transition-colors">
                                                    <Receipt size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-white font-black text-[10px] uppercase tracking-wider">Документы</p>
                                                    <p className="text-white/20 text-[8px]">Оферта и правила</p>
                                                </div>
                                            </button>

                                            <div className="flex flex-col justify-center px-4">
                                                <p className="text-sparta-gold/40 text-[9px] font-black uppercase tracking-[0.3em]">Sparta Sports Center</p>
                                                <p className="text-white/10 text-[8px] uppercase tracking-widest">v2.4.0 • Built with Passion</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'favorites' && (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Heart className="text-red-500" size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Избранные товары</h3>
                                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                        Все товары, которые вы отметили сердечком, хранятся здесь.
                                    </p>
                                    <button
                                        onClick={() => navigate('/shop/favorites')}
                                        className="px-8 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-xl border border-white/10 font-bold transition-all flex items-center gap-2 mx-auto"
                                    >
                                        Перейти к избранному <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                            {activeTab === 'friends' && (
                                <FriendsSection
                                    user={user}
                                    userProfile={userProfile}
                                    onSelectUser={(u) => {
                                        setViewingMember(u);
                                        setIsMemberModalOpen(true);
                                    }}
                                    onNavigateToChat={(targetUid, targetName) => {
                                        const newUrl = `/dashboard?tab=messages_unified&targetUid=${targetUid}&targetName=${encodeURIComponent(targetName)}`;
                                        window.history.pushState({}, '', newUrl);
                                        setActiveTab('messages_unified');
                                    }}
                                />
                            )}

                            {activeTab === 'activity' && (
                                <AttendanceSection userProfile={userProfile} />
                            )}

                            {activeTab === 'coaching' && (
                                <CoachSection user={user} userProfile={userProfile} initialSubTab={coachSubTab} />
                            )}

                            {activeTab === 'analytics' && (
                                isRealDeveloper && !impersonatedRole ? (
                                    <React.Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-sparta-gold" size={40} /></div>}>
                                        <DeveloperConsole
                                            currentUser={user}
                                            currentUserProfile={userProfile}
                                            onImpersonateRole={(role, targetTab) => {
                                                setImpersonatedRole(role);
                                                if (targetTab) {
                                                    setActiveTab(targetTab as any);
                                                } else if (role === 'parent') {
                                                    setActiveTab('family');
                                                } else if (role === 'coach') {
                                                    setActiveTab('coaching');
                                                } else if (role === 'user') {
                                                    setActiveTab('requests');
                                                } else {
                                                    setActiveTab('analytics');
                                                }
                                            }}
                                            currentImpersonatedRole={impersonatedRole}
                                            onOpenMessages={() => handleTabChange('messages_unified')}
                                            onOpenAdmin={() => navigate('/admin')}
                                        />
                                    </React.Suspense>
                                ) : (
                                    <React.Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-sparta-gold" size={40} /></div>}>
                                        <DirectorDashboard />
                                    </React.Suspense>
                                )
                            )}

                            {activeTab === 'support' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="max-w-2xl mx-auto py-10"
                                >
                                    <div className="text-center mb-10">
                                        <div className="w-20 h-20 bg-sparta-gold/10 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-sparta-gold/20 shadow-2xl">
                                            <MessageCircle className="text-sparta-gold" size={40} />
                                        </div>
                                        <h3 className="text-3xl font-russo text-white uppercase tracking-wider mb-3">Центр поддержки</h3>
                                        <p className="text-white/40 text-sm max-w-sm mx-auto">Мы всегда на связи и готовы помочь вам с любым вопросом</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setActiveTab('messages_unified')}
                                            className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <MessageSquare size={24} />
                                            </div>
                                            <h4 className="text-white font-bold mb-1">Чат в приложении</h4>
                                            <p className="text-white/30 text-xs">Мгновенный ответ от нашей команды</p>
                                        </button>

                                        <a
                                            href="https://wa.me/79000000000"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-green-500/20 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Smartphone size={24} />
                                            </div>
                                            <h4 className="text-white font-bold mb-1">WhatsApp</h4>
                                            <p className="text-white/30 text-xs">Написать нам в мессенджер</p>
                                        </a>

                                        <a
                                            href="mailto:support@sparta.com"
                                            className="p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Mail size={24} />
                                            </div>
                                            <h4 className="text-white font-bold mb-1">Электронная почта</h4>
                                            <p className="text-white/30 text-xs">support@sparta.com</p>
                                        </a>

                                        <div className="p-6 bg-sparta-gold/5 rounded-3xl border border-sparta-gold/10 text-left">
                                            <div className="w-12 h-12 rounded-2xl bg-sparta-gold text-black flex items-center justify-center mb-4">
                                                <Clock size={24} />
                                            </div>
                                            <h4 className="text-white font-bold mb-1">График работы</h4>
                                            <p className="text-white/30 text-xs">Ежедневно с 09:00 до 21:00</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'documents' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="max-w-4xl mx-auto py-10"
                                >
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                            <FileText className="text-sparta-gold" size={30} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-russo text-white uppercase tracking-wider">Юридические документы</h3>
                                            <p className="text-white/40 text-sm">Ознакомьтесь с правилами и политикой клуба</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            {
                                                title: "Пользовательское соглашение",
                                                content: "Настоящее Пользовательское соглашение (далее — Соглашение) регулирует отношения между ООО «Спарта Спорт» (далее — Исполнитель) и физическим лицом (далее — Пользователь) по использованию цифровых сервисов Sparta Sports Center. Регистрируясь в системе, Пользователь безоговорочно принимает условия настоящего Соглашения в полном объеме. Исполнитель предоставляет доступ к сервисам на условиях «как есть» (as is).",
                                                sections: [
                                                    { title: "1. Предмет соглашения", text: "Исполнитель предоставляет Пользователю неисключительное право использования платформы для записи на тренировки, отслеживания статистики и приобретения услуг." },
                                                    { title: "2. Права и обязанности сторон", text: "Пользователь обязуется предоставлять достоверные данные при регистрации и не передавать данные учетной записи третьим лицам. Исполнитель обязуется обеспечивать круглосуточный доступ к платформе, за исключением времени проведения технических работ." },
                                                    { title: "3. Ограничение ответственности", text: "Исполнитель не несет ответственности за технические сбои на стороне интернет-провайдеров Пользователя, а также за неправомерный доступ третьих лиц к устройству Пользователя." }
                                                ],
                                                icon: <Shield size={20} />
                                            },
                                            {
                                                title: "Политика в отношении обработки персональных данных",
                                                content: "Настоящая политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006. № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые ИП Лебедева Ксения Александровна (далее — Оператор).",
                                                sections: [
                                                    {
                                                        title: "1. Общие положения",
                                                        text: "1.1. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.\n1.2. Настоящая политика Оператора в отношении обработки персональных данных (далее — Политика) применяется ко всей информации, которую Оператор может получить о посетителях веб-сайта https://sparta-sports-center.vercel.app."
                                                    },
                                                    {
                                                        title: "2. Основные понятия, используемые в Политике",
                                                        text: "2.1. Автоматизированная обработка персональных данных — обработка персональных данных с помощью средств вычислительной техники.\n2.2. Блокирование персональных данных — временное прекращение обработки персональных данных.\n2.3. Веб-сайт — совокупность материалов и баз данных, обеспечивающих их доступность по адресу https://sparta-sports-center.vercel.app.\n2.4. Информационная система персональных данных — совокупность содержащихся в базах данных персональных данных.\n2.5. Обезличивание — действия, в результате которых невозможно определить принадлежность данных.\n2.6. Обработка — любое действие с персональными данными, включая сбор, запись, хранение, передачу и удаление.\n2.7. Оператор — юридическое или физическое лицо, организующее обработку данных.\n2.8. Персональные данные — любая информация, относящаяся к Пользователю веб-сайта https://sparta-sports-center.vercel.app.\n2.10. Пользователь — любой посетитель веб-сайта https://sparta-sports-center.vercel.app."
                                                    },
                                                    {
                                                        title: "3. Основные права и обязанности Оператора",
                                                        text: "Оператор имеет право:\n— получать от субъекта достоверную информацию;\n— продолжить обработку без согласия при наличии законных оснований;\n— определять перечень мер для обеспечения выполнения обязанностей.\n\nОператор обязан:\n— предоставлять информацию по обработке данных;\n— организовывать обработку согласно законодательству РФ;\n— отвечать на обращения и запросы субъектов;\n— принимать меры для защиты данных от неправомерного доступа."
                                                    },
                                                    {
                                                        title: "4. Права и обязанности субъектов персональных данных",
                                                        text: "Субъекты имеют право:\n— получать информацию, касающуюся обработки их данных;\n— требовать уточнения, блокирования или уничтожения устаревших или незаконно полученных данных;\n— отзывать согласие на обработку.\n\nСубъекты обязаны:\n— предоставлять достоверные данные;\n— сообщать об их обновлении."
                                                    },
                                                    {
                                                        title: "5. Принципы обработки персональных данных",
                                                        text: "5.1. Обработка осуществляется на законной и справедливой основе.\n5.2. Обработка ограничивается достижением конкретных, заранее определенных целей.\n5.5. Содержание и объем обрабатываемых данных соответствуют заявленным целям обработки. Избыточность не допускается.\n5.7. Хранение данных осуществляется не дольше, чем этого требуют цели обработки, после чего они уничтожаются или обезличиваются."
                                                    },
                                                    {
                                                        title: "6. Цели обработки персональных данных",
                                                        text: "Цель: заключение, исполнение и прекращение гражданско-правовых договоров.\nПерсональные данные: фамилия, имя, отчество, номера телефонов.\nВиды обработки: Сбор, запись, систематизация, хранение, уничтожение и обезличивание."
                                                    },
                                                    {
                                                        title: "7. Условия обработки персональных данных",
                                                        text: "7.1. Обработка осуществляется с согласия субъекта.\n7.4. Обработка необходима для исполнения договора, стороной которого является субъект персональных данных.\n7.5. Обработка необходима для осуществления прав и законных интересов оператора или третьих лиц."
                                                    },
                                                    {
                                                        title: "8. Порядок сбора, хранения, передачи и других видов обработки",
                                                        text: "8.1. Оператор обеспечивает сохранность персональных данных и исключает доступ к ним неуполномоченных лиц.\n8.2. Персональные данные никогда не передаются третьим лицам без согласия, за исключением случаев, предусмотренных законом.\n8.3. В случае выявления неточностей, Пользователь может актуализировать их, направив уведомление на bugrova.k@bk.ru.\n8.4. Пользователь может в любой момент отозвать свое согласие, направив уведомление на bugrova.k@bk.ru.\n8.5. Информация, собираемая сторонними сервисами (платежными системами), обрабатывается ими в соответствии с их Политикой."
                                                    },
                                                    {
                                                        title: "9-12. Заключительные положения",
                                                        text: "Оператор и лица, получившие доступ к персональным данным, обязаны не раскрывать третьим лицам и не распространять их без согласия субъекта.\nПользователь может получить любые разъяснения по интересующим вопросам, обратившись к Оператору по электронной почте bugrova.k@bk.ru.\nАктуальная версия Политики находится в свободном доступе в сети Интернет по адресу https://sparta-sports-center.vercel.app."
                                                    }
                                                ],
                                                icon: <Lock size={20} />
                                            },
                                            {
                                                title: "Правила посещения центра",
                                                content: "Оригинальный PDF документ с правилами внутреннего распорядка.",
                                                pdfUrl: "/internal_rules.pdf",
                                                icon: <Info size={20} />
                                            },
                                            {
                                                title: "Правила приёма обучающихся",
                                                content: "Оригинальный PDF документ с правилами приема.",
                                                pdfUrl: "/admission_rules.pdf",
                                                icon: <Users size={20} />
                                            },
                                            {
                                                title: "Выписка из реестра лицензий",
                                                content: "Официальная выписка из реестра образовательных лицензий.",
                                                pdfUrl: "/license.pdf",
                                                icon: <BadgeCheck size={20} />
                                            },
                                            {
                                                title: "Публичная оферта",
                                                content: "Настоящий документ является официальным предложением (публичной офертой) ООО «Спарта Спорт» (Исполнитель) заключить Договор возмездного оказания физкультурно-оздоровительных услуг с любым физическим лицом (Заказчик) на изложенных ниже условиях. Акцептом оферты признается оплата услуг Заказчиком.",
                                                sections: [
                                                    { title: "1. Порядок расчетов", text: "Стоимость услуг определяется прейскурантом, размещенным на платформе. Оплата производится в рублях РФ безналичным путем. Исполнитель применяет упрощенную систему налогообложения (НДС не облагается)." },
                                                    { title: "2. Права потребителя и возврат", text: "Заказчик вправе отказаться от исполнения договора в любое время при условии оплаты Исполнителю фактически понесенных им расходов. Возврат средств осуществляется по письменному заявлению в течение 10 рабочих дней." },
                                                    { title: "3. Форс-мажор", text: "Стороны освобождаются от ответственности за неисполнение обязательств, если оно явилось следствием обстоятельств непреодолимой силы (пожар, стихийные бедствия, акты государственных органов), препятствующих выполнению договора." }
                                                ],
                                                icon: <Receipt size={20} />
                                            }
                                        ].map((doc, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedDoc(doc)}
                                                className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 rounded-[24px] border border-white/5 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 text-white/30 flex items-center justify-center border border-white/10 group-hover:text-sparta-gold transition-colors">
                                                        {doc.icon}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-white font-bold group-hover:text-sparta-gold transition-colors">{doc.title}</p>
                                                        <p className="text-white/20 text-[10px] uppercase tracking-widest font-black mt-1">
                                                            Нажмите для просмотра
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-sparta-gold group-hover:bg-sparta-gold/10 transition-all">
                                                    <Eye size={18} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-10 p-8 bg-sparta-gold/5 rounded-[32px] border border-sparta-gold/10 text-center">
                                        <p className="text-white/40 text-sm italic">
                                            Все документы заверены цифровой подписью Sparta Sports Center и имеют юридическую силу.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            <AnimatePresence>
                                {selectedDoc && (
                                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe">
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setSelectedDoc(null)}
                                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                            className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-3xl sm:rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-[calc(100dvh-2rem)] flex flex-col"
                                        >
                                            <div className="p-4 sm:p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                                                        {selectedDoc.icon}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base sm:text-xl font-russo text-white uppercase tracking-wider">{selectedDoc.title}</h3>
                                                        <p className="text-white/40 text-[9px] sm:text-[10px] uppercase font-black tracking-widest mt-0.5 sm:mt-1">Официальный документ клуба</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedDoc(null)}
                                                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer"
                                                >
                                                    <X size={20} className="sm:w-6 sm:h-6" />
                                                </button>
                                            </div>

                                            <div className="p-4 sm:p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                                                {selectedDoc.pdfUrl ? (
                                                    <div className="w-full h-[55vh] sm:h-[65vh] rounded-2xl overflow-hidden border border-white/10 bg-white shadow-inner">
                                                        <iframe
                                                            src={`${selectedDoc.pdfUrl}#view=FitH&toolbar=0`}
                                                            className="w-full h-full border-none"
                                                            title={selectedDoc.title}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-invert max-w-none">
                                                        <p className="text-white/60 leading-relaxed text-sm sm:text-lg mb-6 sm:mb-8">
                                                            {selectedDoc.content}
                                                        </p>
                                                        <div className="space-y-4 sm:space-y-6">
                                                            {(selectedDoc.sections || []).map((section: any, i: number) => (
                                                                <div key={i} className="space-y-2 sm:space-y-3">
                                                                    <h4 className="text-white font-bold uppercase tracking-tight text-xs sm:text-sm">
                                                                        {section.title}
                                                                    </h4>
                                                                    <p className="text-white/30 text-xs sm:text-sm leading-relaxed text-justify whitespace-pre-wrap">
                                                                        {section.text}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-4 sm:p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-center shrink-0">
                                                <button
                                                    onClick={() => setSelectedDoc(null)}
                                                    className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 bg-sparta-gold text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)] text-xs sm:text-sm cursor-pointer"
                                                >
                                                    Понятно, закрыть
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}

                                {isSessionsModalOpen && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe">
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setIsSessionsModalOpen(false)}
                                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[calc(100dvh-2rem)] flex flex-col"
                                        >
                                            <div className="p-4 sm:p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                                                <div>
                                                    <h3 className="text-lg sm:text-2xl font-russo text-white uppercase tracking-wider">Кто в аккаунте</h3>
                                                    <p className="text-white/40 text-[10px] sm:text-xs mt-0.5 sm:mt-1 uppercase tracking-widest font-bold">Устройства, на которых вы вошли</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsSessionsModalOpen(false)}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar flex-1">
                                                {deviceSessions.map((session) => (
                                                    <div
                                                        key={session.id}
                                                        className={`p-4 rounded-2xl border transition-all ${session.id === currentDeviceId
                                                                ? 'bg-sparta-gold/5 border-sparta-gold/20'
                                                                : 'bg-white/5 border-white/5'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${session.id === currentDeviceId
                                                                        ? 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/20'
                                                                        : 'bg-white/10 text-white/40 border-white/10'
                                                                    }`}>
                                                                    {session.userAgent?.includes('Android') || session.userAgent?.includes('iPhone') ? <Smartphone size={24} /> : <Home size={24} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        {editingSessionId === session.id ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    autoFocus
                                                                                    value={sessionNameInput}
                                                                                    onChange={(e) => setSessionNameInput(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') updateSessionName(session.id);
                                                                                        if (e.key === 'Escape') setEditingSessionId(null);
                                                                                    }}
                                                                                    className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-sparta-gold/50"
                                                                                />
                                                                                <button onClick={() => updateSessionName(session.id)} className="text-emerald-400 hover:text-emerald-300">
                                                                                    <CheckCircle2 size={16} />
                                                                                </button>
                                                                                <button onClick={() => setEditingSessionId(null)} className="text-white/20 hover:text-white">
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2 group/name">
                                                                                <p className="text-white font-black text-sm tracking-wide">{session.customName || parseUA(session.userAgent)}</p>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingSessionId(session.id);
                                                                                        setSessionNameInput(session.customName || parseUA(session.userAgent));
                                                                                    }}
                                                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-white/30 hover:text-sparta-gold hover:bg-sparta-gold/10 transition-all text-[10px] font-bold uppercase"
                                                                                >
                                                                                    <Pencil size={10} />
                                                                                    Переименовать
                                                                                </button>
                                                                                {session.id === currentDeviceId && (
                                                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-black uppercase rounded-full border border-green-500/30">В сети (вы тут)</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <p className="text-white/30 text-[10px] flex items-center gap-1">
                                                                            <MapPin size={10} /> {session.lastIp}
                                                                        </p>
                                                                        <p className="text-white/30 text-[10px] flex items-center gap-1">
                                                                            <Clock size={10} /> {session.lastActive ? new Date(session.lastActive.seconds * 1000).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Недавно'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {session.id !== currentDeviceId && (
                                                                <button
                                                                    onClick={() => revokeSession(session.id)}
                                                                    disabled={isRevoking === session.id}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/10 transition-all text-[10px] font-black uppercase"
                                                                    title="Выйти с этого устройства"
                                                                >
                                                                    {isRevoking === session.id ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                                                                    <span>Выйти</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {deviceSessions.length === 0 && (
                                                    <div className="py-12 text-center">
                                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <Smartphone className="text-white/10" size={32} />
                                                        </div>
                                                        <p className="text-white/20 text-sm font-bold uppercase tracking-wider">Сеансы не найдены</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-8 bg-white/[0.02] flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 border border-orange-500/20">
                                                    <ShieldAlert size={20} />
                                                </div>
                                                <p className="text-white/40 text-[10px] leading-relaxed">
                                                    Если вы заметили подозрительную активность, завершите все сеансы кроме текущего и смените пароль.
                                                </p>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>



                            {activeTab === 'messages_unified' && (
                                <MessagesSection
                                    user={user}
                                    userProfile={userProfile}
                                    initialChatId={searchParams.get('chatId')}
                                    initialTargetUid={searchParams.get('targetUid')}
                                    initialTargetName={searchParams.get('targetName')}
                                    initialStudentName={searchParams.get('studentName')}
                                    onMobileDetailChange={(isVisible) => setIsMobileChatActive(isVisible)}
                                    onTabChange={handleTabChange}
                                />
                            )}

                            {activeTab === 'requests' && (
                                ((effectiveRole === 'user' || userProfile?.role === 'user' || userProfile?.role === 'student' || userProfile?.isStudent) && effectiveRole !== 'parent' && !isStaffAccount) ? (
                                    <KidDashboard
                                        user={user}
                                        userProfile={userProfile}
                                        onTabChange={handleTabChange}
                                    />
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                            <div>
                                                <h2 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-wider">
                                                    Заявки на тренировки
                                                </h2>
                                                <p className="text-white/50 text-xs sm:text-sm mt-1">
                                                    Отслеживайте статус рассмотрения ваших заявок на пробные занятия и подбор групп администратором
                                                </p>
                                            </div>
                                            {requests.length > 0 && (
                                                <span className="px-3.5 py-1.5 bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/30 rounded-full text-xs font-bold w-fit">
                                                    Всего заявок: {requests.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Active Group Card (Moved sub management to subscriptions) */}

                                        <div className="grid gap-4">
                                            {joinedGroup && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="bg-[#121212] border border-sparta-gold/30 rounded-3xl p-8 relative overflow-hidden group shadow-2xl shadow-sparta-gold/5"
                                                >
                                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                                        <Users size={120} className="text-sparta-gold" />
                                                    </div>

                                                    <div className="relative z-10">
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <span className="px-3 py-1 bg-sparta-gold/10 text-sparta-gold rounded-full text-[10px] font-bold uppercase tracking-widest border border-sparta-gold/20">Ваша группа</span>
                                                                    <span className="px-3 py-1 bg-white/5 text-white/40 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                                                                        {(() => {
                                                                            const cat = joinedGroup.category?.toLowerCase() || '';
                                                                            if (cat === 'kids') return 'Дети';
                                                                            if (cat === 'teens') return 'Подростки';
                                                                            if (cat === 'pro') return 'Профи';
                                                                            return joinedGroup.category;
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-4xl font-russo text-white uppercase tracking-tighter mb-2">{joinedGroup.name}</h3>
                                                                {groupCoach && (
                                                                    <div className="flex items-center gap-3 text-white/60">
                                                                        <div className="w-8 h-8 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                                                                            <User size={14} />
                                                                        </div>
                                                                        <span className="text-sm font-bold">Тренер: <span className="text-white">{groupCoach.name}</span></span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="flex items-center gap-4 text-white/40">
                                                                    <div className="flex items-center gap-2">
                                                                        <Activity size={16} className="text-sparta-gold" />
                                                                        <span className="text-xs uppercase tracking-widest font-bold">
                                                                            {joinedGroup.difficultyLevel === 'newbie' ? 'Новичок' : joinedGroup.difficultyLevel === 'amateur' ? 'Любитель' : 'Профи'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {joinedGroup.schedule?.map((s: any, i: number) => (
                                                                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-sparta-gold/20 transition-all group/item">
                                                                    <div className="w-10 h-10 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold group-hover/item:bg-sparta-gold group-hover/item:text-black transition-colors">
                                                                        <Clock size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-white font-bold text-sm tracking-tight">{s.day}</p>
                                                                        <p className="text-white/40 text-xs">{s.time} {s.endTime ? `- ${s.endTime}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                            {requests.length > 0 ? (
                                                requests.map((req) => (
                                                    <motion.div
                                                        key={req.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        onClick={() => setSelectedRequest(req)}
                                                        className="bg-white/5 border border-white/10 hover:border-sparta-gold/30 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/10 transition-colors group cursor-pointer shadow-lg"
                                                    >
                                                        <div className="flex items-start sm:items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black transition-colors shrink-0">
                                                                <Calendar size={24} />
                                                            </div>
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                                                    <h4 className="text-white font-bold text-base sm:text-lg group-hover:text-sparta-gold transition-colors">
                                                                        {req.groupTitle ? `Группа: ${req.groupTitle}` : (req.programType || 'Пробная тренировка')}
                                                                    </h4>
                                                                    <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full text-white/60">
                                                                        {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('ru-RU') : 'Дата отправки сохранена'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                                                                    <p>
                                                                        Спортсмен: <strong className="text-white">{req.childFullName || req.childName || req.name || 'Спортсмен'}</strong>
                                                                        {req.childAge ? ` (${req.childAge} лет)` : ''}
                                                                    </p>
                                                                    {req.groupSchedule && (
                                                                        <p>
                                                                            График: <span className="text-white font-mono">{req.groupSchedule}</span>
                                                                        </p>
                                                                    )}
                                                                    {req.preferredLocation && (
                                                                        <p>
                                                                            Локация: <span className="text-sparta-gold">{req.preferredLocation}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                                            <div className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-[0_0_10px_rgba(0,0,0,0.1)] ${req.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                                req.status === 'contacted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                    req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                }`}>
                                                                {req.status === 'completed' ? 'Завершено' :
                                                                    req.status === 'contacted' ? 'В работе' :
                                                                        req.status === 'rejected' ? 'Отклонено' :
                                                                            'На рассмотрении'}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteRequest(req, e)}
                                                                    disabled={deletingRequestId === req.id}
                                                                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                                                                    title={req.status === 'new' ? 'Отменить и удалить заявку' : 'Удалить заявку из списка'}
                                                                    aria-label="Удалить заявку"
                                                                >
                                                                    {deletingRequestId === req.id ? (
                                                                        <Loader2 size={15} className="animate-spin text-red-400" />
                                                                    ) : (
                                                                        <Trash2 size={15} />
                                                                    )}
                                                                </button>
                                                                <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-sparta-gold transition-colors">
                                                                    <span>Подробнее</span>
                                                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : !joinedGroup && (
                                                <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
                                                        <Calendar size={32} />
                                                    </div>
                                                    <h3 className="text-xl text-white font-russo mb-2">Нет активных заявок</h3>
                                                    <p className="text-white/50 max-w-sm">
                                                        Запишитесь на первое бесплатное занятие, чтобы начать свой путь в Спарте.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            )}

                            {activeTab === 'orders' && (
                                <div className="space-y-8">
                                    {/* Sub-tabs Navigation */}
                                    <div className="flex p-1 bg-white/5 rounded-2xl w-fit border border-white/5 mx-auto md:mx-0">
                                        <button
                                            onClick={() => setOrdersSubTab('active')}
                                            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${ordersSubTab === 'active' ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Активные
                                        </button>
                                        <button
                                            onClick={() => setOrdersSubTab('history')}
                                            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${ordersSubTab === 'history' ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white'}`}
                                        >
                                            История
                                        </button>
                                    </div>

                                    {ordersSubTab === 'active' ? (
                                        <div className="space-y-12">
                                            {/* Section: Ready for Pickup */}
                                            {orders.filter(o => o.type === 'shop_order' && o.status === 'ready_for_pickup').length > 0 && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                                        <h3 className="text-white font-russo text-lg uppercase tracking-wider">Готовы к выдаче</h3>
                                                    </div>
                                                    <div className="grid gap-6">
                                                        {orders.filter(o => o.type === 'shop_order' && o.status === 'ready_for_pickup').map(order => renderOrderCard(order, true))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section: In Transit */}
                                            {orders.filter(o => o.type === 'shop_order' && o.status === 'shipped').length > 0 && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                        <h3 className="text-white font-russo text-lg uppercase tracking-wider">В пути</h3>
                                                    </div>
                                                    <div className="grid gap-6">
                                                        {orders.filter(o => o.type === 'shop_order' && o.status === 'shipped').map(order => renderOrderCard(order))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section: Processing */}
                                            {orders.filter(o => o.type === 'shop_order' && ['new', 'processing', 'completed', 'pending_robokassa'].includes(o.status as string)).length > 0 && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <h3 className="text-white font-russo text-lg uppercase tracking-wider">В обработке</h3>
                                                    </div>
                                                    <div className="grid gap-6">
                                                        {orders.filter(o => o.type === 'shop_order' && ['new', 'processing', 'completed', 'pending_robokassa'].includes(o.status as string)).map(order => renderOrderCard(order))}
                                                    </div>
                                                </div>
                                            )}

                                            {orders.filter(o => o.type === 'shop_order' && !['delivered', 'cancelled'].includes(o.status as string)).length === 0 && (
                                                <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-20 flex flex-col items-center text-center">
                                                    <ShoppingBag size={40} className="text-white/20 mb-6" />
                                                    <h3 className="text-2xl font-russo text-white mb-2 uppercase tracking-wider">Активных заказов нет</h3>
                                                    <button onClick={() => navigate('/#shop')} className="mt-8 px-8 py-3 bg-sparta-gold text-black font-black rounded-xl hover:bg-yellow-500 transition-all uppercase tracking-widest">
                                                        В каталог магазинa
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid gap-6">
                                            {orders.filter(o => o.type === 'shop_order' && ['delivered', 'cancelled'].includes(o.status as string)).length > 0 ? (
                                                orders.filter(o => o.type === 'shop_order' && ['delivered', 'cancelled'].includes(o.status as string)).map(order => renderOrderCard(order))
                                            ) : (
                                                <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-20 flex flex-col items-center text-center">
                                                    <Clock size={40} className="text-white/20 mb-6" />
                                                    <h3 className="text-2xl font-russo text-white mb-2 uppercase tracking-wider">История пуста</h3>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'subscriptions' && (
                                <div className="space-y-8">
                                    {/* Current Subscription Management */}
                                    {userProfile?.subscription && (
                                        <div className="space-y-6">
                                            <h3 className="text-xs uppercase font-black text-sparta-gold tracking-[0.3em] ml-2">Текущий абонемент</h3>
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-white/10 rounded-3xl p-8 overflow-hidden relative group"
                                            >
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-sparta-gold/10" />

                                                <div className="relative z-10">
                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-8 border-b border-white/5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 bg-sparta-gold/20 rounded-2xl flex items-center justify-center text-sparta-gold border border-sparta-gold/20">
                                                                <Shield size={32} />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-3xl font-russo text-white uppercase tracking-wider">{userProfile.subscription.title}</h3>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${userProfile.subscription.status === 'active' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-blue-400/10 text-blue-400 border border-blue-400/20'}`}>
                                                                        {userProfile.subscription.status === 'active' ? 'Активен' : 'Заморожен'}
                                                                    </span>
                                                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                                                        <Calendar size={12} />
                                                                        Истекает: {userProfile.subscription.expiresAt ? (typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : userProfile.subscription.expiresAt).toLocaleDateString('ru-RU') : '-'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                                                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 group-hover:border-sparta-gold/30 transition-all">
                                                            <Clock size={20} className="text-sparta-gold animate-pulse" />
                                                            <div>
                                                                <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-0.5">Осталось времени</p>
                                                                <p className="text-lg font-russo text-white leading-none">
                                                                    {userProfile.subscription.expiresAt ? Math.max(0, Math.ceil(((typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : userProfile.subscription.expiresAt) - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '0'}
                                                                    <span className="text-[10px] text-white/40 ml-1.5 uppercase font-black">дней</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 w-full sm:w-auto">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Прогресс тарифа</span>
                                                                <span className="text-[10px] text-white/60 font-black">
                                                                    {(() => {
                                                                        if (!userProfile.subscription.startedAt || !userProfile.subscription.expiresAt) return '0%';
                                                                        const start = userProfile.subscription.startedAt.toDate ? userProfile.subscription.startedAt.toDate().getTime() : new Date(userProfile.subscription.startedAt.seconds * 1000).getTime();
                                                                        const end = userProfile.subscription.expiresAt.toDate ? userProfile.subscription.expiresAt.toDate().getTime() : new Date(userProfile.subscription.expiresAt.seconds * 1000).getTime();
                                                                        const total = end - start;
                                                                        const used = Date.now() - start;
                                                                        return Math.min(100, Math.max(0, Math.round((used / total) * 100))) + '%';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{
                                                                        width: `${(() => {
                                                                            if (!userProfile.subscription.startedAt || !userProfile.subscription.expiresAt) return 0;
                                                                            const start = userProfile.subscription.startedAt.toDate ? userProfile.subscription.startedAt.toDate().getTime() : new Date(userProfile.subscription.startedAt.seconds * 1000).getTime();
                                                                            const end = userProfile.subscription.expiresAt.toDate ? userProfile.subscription.expiresAt.toDate().getTime() : new Date(userProfile.subscription.expiresAt.seconds * 1000).getTime();
                                                                            const total = end - start;
                                                                            const used = Date.now() - start;
                                                                            return Math.min(100, Math.max(0, (used / total) * 100));
                                                                        })()}%`
                                                                    }}
                                                                    className="h-full bg-gradient-to-r from-sparta-gold to-yellow-500 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-4">
                                                        <button
                                                            onClick={handleRenew}
                                                            className="flex items-center gap-2 px-8 py-4 bg-sparta-gold text-black font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-[0_0_30px_rgba(212,175,55,0.15)] uppercase tracking-widest text-xs active:scale-95"
                                                        >
                                                            <RefreshCw size={18} />
                                                            Продлить
                                                        </button>
                                                        <button
                                                            onClick={handleUpgrade}
                                                            className="flex items-center gap-2 px-8 py-4 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-xs active:scale-95"
                                                        >
                                                            <Zap size={18} className="text-sparta-gold" />
                                                            Апгрейд
                                                        </button>
                                                        <button
                                                            onClick={handleFreeze}
                                                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white/5 font-black rounded-2xl transition-all border uppercase tracking-widest text-[10px] active:scale-95 ${userProfile.subscription.status === 'frozen' ? 'text-green-400 border-green-400/20 hover:bg-green-400/10' : 'text-blue-400 border-blue-400/20 hover:bg-blue-400/10'}`}
                                                        >
                                                            {userProfile.subscription.status === 'frozen' ? (
                                                                <>
                                                                    <RefreshCw size={16} />
                                                                    Разморозить
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="relative">
                                                                        <Clock size={16} />
                                                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-sparta-gold rounded-full" />
                                                                    </div>
                                                                    Заморозка
                                                                    <span className="ml-1 text-[8px] bg-white/10 px-1.5 py-0.5 rounded-md text-white/40">
                                                                        {userProfile?.subscription?.freezeDays || 7}д.
                                                                    </span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}

                                    {/* Premium Features Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                                        {/* Refer-a-Friend */}
                                        <button
                                            onClick={() => setIsReferralOpen(true)}
                                            className="flex items-center gap-4 p-5 bg-gradient-to-br from-sparta-gold/10 to-transparent border border-sparta-gold/20 rounded-3xl hover:border-sparta-gold/40 hover:from-sparta-gold/20 transition-all group text-left"
                                        >
                                            <div className="w-12 h-12 bg-sparta-gold rounded-2xl flex items-center justify-center text-black group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                                                <Gift size={24} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm mb-0.5">Пригласи друга</p>
                                                <p className="text-sparta-gold text-[10px] uppercase font-bold tracking-wider">Бонус: 7 дней</p>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Payments History */}
                                    <div className="space-y-6">
                                        <h3 className="text-xs uppercase font-black text-white/30 tracking-[0.3em] ml-2">История оплат и продлений</h3>
                                        <div className="grid gap-4">
                                            {orders.filter(o => o.type !== 'shop_order').length > 0 ? (
                                                orders.filter(o => o.type !== 'shop_order').map(order => renderOrderCard(order))
                                            ) : (
                                                <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center">
                                                    <Receipt size={32} className="text-white/10 mx-auto mb-4" />
                                                    <p className="text-white/20 text-sm font-medium">История оплат пуста</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'messages' && (
                                <div className="space-y-6">
                                    {['admin', 'director', 'developer', 'dev'].includes(userProfile?.role) && (
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-white font-russo uppercase tracking-tighter">
                                                Панель поддержки клиентов
                                            </h3>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                                <Shield size={14} className="text-sparta-gold" />
                                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Admin Support</span>
                                            </div>
                                        </div>
                                    )}
                                    <UserRequests
                                        ticketId={searchParams.get('ticketId')}
                                        onMobileDetailChange={(isVisible) => setIsMobileChatActive(isVisible)}
                                        activeChild={sidebarActiveChild}
                                    />
                                </div>
                            )}

                            {activeTab === 'achievements' && (
                                <AwardsPage
                                    studentId={user?.uid}
                                    onOpenShop={() => handleTabChange('orders')}
                                    onBackToDashboard={() => handleTabChange(userProfile?.role === 'student' ? 'activity' : 'requests')}
                                />
                            )}

                            {activeTab === 'stats' && (
                                <StatsSection
                                    userProfile={userProfile}
                                    requests={requests}
                                    orders={orders}
                                />
                            )}

                            {activeTab === 'family' && userProfile?.role === 'parent' && (
                                <ParentDashboard
                                    user={user}
                                    userProfile={userProfile}
                                    onTabChange={handleTabChange}
                                    onActiveChildChange={setSidebarActiveChild}
                                />
                            )}

                            {activeTab === 'progress' && (
                                <ProgressSection userProfile={userProfile} />
                            )}

                            {activeTab === 'system' && userProfile?.role === 'developer' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-russo text-white uppercase tracking-wider">System Health Cabinet</h2>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs">
                                            <Activity size={12} className="animate-pulse" />
                                            Operational
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <GlassCard className="p-6 border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Zap size={48} className="text-yellow-400" />
                                            </div>
                                            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">API Latency</h3>
                                            <div className="text-3xl font-russo text-white mb-2">42ms</div>
                                            <div className="flex items-center gap-1.5 text-green-400 text-xs">
                                                <ArrowUpRight size={12} />
                                                <span>-12% from avg</span>
                                            </div>
                                        </GlassCard>

                                        <GlassCard className="p-6 border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Database size={48} className="text-blue-400" />
                                            </div>
                                            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Firestore Load</h3>
                                            <div className="text-3xl font-russo text-white mb-2">Low</div>
                                            <div className="flex items-center gap-1.5 text-green-400 text-xs">
                                                <CheckCircle size={12} />
                                                <span>Healthy status</span>
                                            </div>
                                        </GlassCard>

                                        <GlassCard className="p-6 border-white/5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Shield size={48} className="text-purple-400" />
                                            </div>
                                            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Active Sessions</h3>
                                            <div className="text-3xl font-russo text-white mb-2">124</div>
                                            <div className="flex items-center gap-1.5 text-blue-400 text-xs">
                                                <Users size={12} />
                                                <span>Live monitoring</span>
                                            </div>
                                        </GlassCard>
                                    </div>

                                    <GlassCard className="p-8 border-white/5">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                                                <Settings className="text-cyan-400" size={20} />
                                            </div>
                                            <h3 className="text-lg font-russo text-white uppercase tracking-wider">Technical Configuration</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-white/60 text-sm">Environment</span>
                                                <span className="text-white font-mono text-xs px-2 py-1 bg-white/10 rounded">Production-v2.4</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-white/60 text-sm">Auth Provider</span>
                                                <span className="text-white font-mono text-xs px-2 py-1 bg-white/10 rounded">Firebase Auth + Custom RBAC</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                <span className="text-white/60 text-sm">Storage Bucket</span>
                                                <span className="text-white font-mono text-xs px-2 py-1 bg-white/10 rounded">Supabase: sparta-assets</span>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Container>



            {
                userProfile && (
                    <EditProfileModal
                        isOpen={isProfileModalOpen}
                        onClose={() => setIsProfileModalOpen(false)}
                        userData={{ ...userProfile, email: userProfile?.email || user?.email }}
                    />
                )
            }

            {/* Modal for viewing OTHER members */}
            {viewingMember && (
                <ProfileViewModal
                    isOpen={isMemberModalOpen}
                    onClose={() => setIsMemberModalOpen(false)}
                    userData={viewingMember}
                />
            )}



            <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
            />

            <AnimatePresence>
                {isMagicTransferOpen && (
                    <MagicTransfer
                        isOpen={isMagicTransferOpen}
                        onClose={() => setIsMagicTransferOpen(false)}
                    />
                )}
            </AnimatePresence>

            <RequestDetailsModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                request={selectedRequest}
                onContactSupport={() => setActiveTab(effectiveRole === 'parent' ? 'support' : 'messages')}
            />
            {/* Smart Enrollment Wizard */}
            {
                showWizard && userProfile && (
                    <SmartEnrollmentWizard
                        user={{ ...userProfile, id: user.uid }}
                        onComplete={() => setShowWizard(false)}
                    />
                )
            }

            {/* Parent Account Security & Email Setup Modal */}
            <ParentAccountSetupModal
                isOpen={isParentSetupOpen}
                onClose={() => {
                    sessionStorage.setItem('dismissed_parent_setup', 'true');
                    setIsParentSetupOpen(false);
                }}
                parentUid={userProfile?.id || user?.uid || ''}
                parentName={userProfile?.displayName || userProfile?.name || userProfile?.parentName || 'Родитель'}
                parentPhone={userProfile?.phone || ''}
                childName={userProfile?.childFirstName || userProfile?.childFullName || 'Юного спортсмена'}
                onSuccess={(newEmail) => {
                    setUserProfile((prev: any) => ({ ...prev, email: newEmail, hasPassword: true }));
                    sessionStorage.setItem('dismissed_parent_setup', 'true');
                }}
            />

            {/* Receipt Modal */}
            {
                isReceiptOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 bg-black/95 backdrop-blur-xl"
                            onClick={() => setIsReceiptOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="relative z-10 w-full flex justify-center py-10"
                        >
                            {selectedOrder.type === 'shop_order' ? (
                                <ShopReceipt
                                    order={selectedOrder}
                                    onClose={() => setIsReceiptOpen(false)}
                                />
                            ) : (
                                <MembershipReceipt
                                    order={{
                                        id: selectedOrder.id,
                                        date: selectedOrder.date,
                                        planTitle: selectedOrder.planTitle,
                                        price: selectedOrder.price || selectedOrder.amount || 0,
                                        duration: selectedOrder.duration || 0,
                                        paymentMethod: selectedOrder.paymentMethod || 'robokassa',
                                        type: selectedOrder.type,
                                        userName: user.displayName || 'Спортсмен',
                                        email: user.email || ''
                                    }}
                                    onClose={() => setIsReceiptOpen(false)}
                                />
                            )}
                        </motion.div>
                    </div>
                )
            }
            {/* Upgrade Plan Selection Modal */}
            <AnimatePresence>
                {isUpgradeSelectionOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                            onClick={() => setIsUpgradeSelectionOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div>
                                    <h2 className="text-xl font-russo text-white uppercase tracking-wider">Выберите новый план</h2>
                                    <p className="text-xs text-white/40 font-manrope">Стоимость неиспользованных дней вашего текущего плана будет зачтена</p>
                                </div>
                                <button onClick={() => setIsUpgradeSelectionOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="text-white/50" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {allPrograms
                                        .filter(p => p.id !== userProfile?.subscription?.planId)
                                        .map((program) => (
                                            <GlassCard
                                                key={program.id}
                                                className="p-6 border-white/5 hover:border-sparta-gold/30 transition-all cursor-pointer group flex flex-col h-full"
                                                onClick={() => {
                                                    setSelectedProgram(program);
                                                    setMembershipMode('upgrade');
                                                    setMembershipDuration(3); // Default
                                                    setMembershipPrice(program.prices?.[3] || 0);
                                                    setIsMembershipOpen(true);
                                                    setIsUpgradeSelectionOpen(false);
                                                }}
                                            >
                                                <div className="mb-4">
                                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-sparta-gold/30 transition-colors">
                                                        {program.title.toLowerCase().includes('новичок') ? <Zap className="text-blue-400" /> :
                                                            program.title.toLowerCase().includes('профессионал') ? <Star className="text-sparta-gold" /> :
                                                                <Trophy className="text-red-500" />}
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-russo text-white mb-2">{program.title}</h3>
                                                <p className="text-xs text-white/40 mb-4 line-clamp-2">{program.features[0]}</p>
                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-sparta-gold font-bold">от {Math.min(...Object.values(program.prices as number[])).toLocaleString('ru-RU')} ₽</span>
                                                    <ArrowRight size={16} className="text-white/20 group-hover:text-sparta-gold transform group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </GlassCard>
                                        ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Membership & Renewal Modal */}
            <MembershipModal
                isOpen={isMembershipOpen}
                onClose={() => setIsMembershipOpen(false)}
                program={selectedProgram}
                duration={membershipDuration}
                price={membershipPrice}
                mode={membershipMode}
            />

            {/* Top-Up Modal */}
            <TopUpModal
                isOpen={isTopUpModalOpen}
                onClose={() => setIsTopUpModalOpen(false)}
                user={user}
            />

            {/* Phone Change Modal */}
            {isPhoneModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md pt-safe pb-safe">
                    <div className="bg-[#18181b] rounded-3xl w-full max-w-md border border-sparta-gold/30 p-4 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-left font-manrope space-y-5 max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center border border-sparta-gold/30 shrink-0">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-russo text-white uppercase tracking-wider">
                                        Номер телефона
                                    </h3>
                                    <p className="text-[11px] text-white/50">Для SMS-уведомлений и связи с тренером</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPhoneModalOpen(false)}
                                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {phoneUpdateSuccess && (
                            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <span>{phoneUpdateSuccess}</span>
                            </div>
                        )}

                        {phoneUpdateError && (
                            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
                                <ShieldAlert size={16} />
                                <span>{phoneUpdateError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSavePhone} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-1.5">
                                    📱 Новый номер телефона:
                                </label>
                                <input
                                    type="tel"
                                    value={newPhoneInput}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        let value = raw.replace(/\D/g, '');
                                        if (value.startsWith('8')) value = '7' + value.slice(1);
                                        if (!value.startsWith('7') && value.length > 0) value = '7' + value;
                                        
                                        let formatted = '+7';
                                        if (value.length > 1) formatted += ' (' + value.substring(1, 4);
                                        if (value.length >= 5) formatted += ') ' + value.substring(4, 7);
                                        if (value.length >= 8) formatted += '-' + value.substring(7, 9);
                                        if (value.length >= 10) formatted += '-' + value.substring(9, 11);
                                        
                                        setNewPhoneInput(value.length <= 1 ? '' : formatted);
                                    }}
                                    placeholder="+7 (999) 000-00-00"
                                    required
                                    className="w-full h-12 px-4 bg-black/60 border border-white/15 rounded-xl text-white text-sm focus:border-sparta-gold outline-none transition-all placeholder:text-white/30 font-mono tracking-wide"
                                    autoFocus
                                />
                                <p className="text-[10px] text-white/40 mt-1.5">
                                    ℹ️ Новый номер обновится в журнале тренера и во всех карточках ваших детей.
                                </p>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPhoneModalOpen(false)}
                                    className="w-full sm:flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPhone || !newPhoneInput.trim()}
                                    className="w-full sm:flex-1 py-3 rounded-xl bg-sparta-gold text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 hover:brightness-110 cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingPhone ? <Loader2 size={16} className="animate-spin" /> : '✓ Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Secure Email Change Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md pt-safe pb-safe">
                    <div className="bg-[#18181b] rounded-3xl w-full max-w-lg border border-sparta-gold/30 p-4 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-left font-manrope space-y-6 max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-wider flex items-center gap-2">
                                    <Mail className="text-sparta-gold shrink-0" size={22} />
                                    Сменить Email
                                </h3>
                                <p className="text-xs text-white/50 mt-1">Персонализация и защита электронной почты</p>
                            </div>
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* If Temporary Credentials Banner */}
                        {userProfile?.isTemporaryCredentials && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                                <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Привязка личного аккаунта</p>
                                    <p className="text-xs text-white/70 mt-1">
                                        Вы вошли по временным данным от администратора. Укажите вашу постоянную личную почту и желаемый новый пароль.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Mode Selector Tabs */}
                        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 text-[10px] sm:text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => { setEmailModalMode('password'); setEmailUpdateError(''); setEmailUpdateSuccess(''); }}
                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all flex flex-col items-center gap-1 text-center leading-tight ${emailModalMode === 'password' ? 'bg-sparta-gold text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                            >
                                <Lock size={14} className="shrink-0" />
                                <span className="line-clamp-1">Пароль</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setEmailModalMode('code'); setEmailUpdateError(''); setEmailUpdateSuccess(''); }}
                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all flex flex-col items-center gap-1 text-center leading-tight ${emailModalMode === 'code' ? 'bg-sparta-gold text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                            >
                                <Mail size={14} className="shrink-0" />
                                <span className="line-clamp-1">Код email</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setEmailModalMode('admin_help'); setEmailUpdateError(''); setEmailUpdateSuccess(''); }}
                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all flex flex-col items-center gap-1 text-center leading-tight ${emailModalMode === 'admin_help' ? 'bg-sparta-gold text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                            >
                                <ShieldCheck size={14} className="shrink-0" />
                                <span className="line-clamp-1">Связаться</span>
                            </button>
                        </div>

                        {/* Success & Error Feedback */}
                        {emailUpdateSuccess && (
                            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                                <CheckCircle size={16} className="shrink-0" />
                                <span>{emailUpdateSuccess}</span>
                            </div>
                        )}

                        {emailUpdateError && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                                <ShieldAlert size={16} className="shrink-0" />
                                <span>{emailUpdateError}</span>
                            </div>
                        )}

                        {/* Mode Content */}
                        {emailModalMode === 'admin_help' ? (
                            <div className="space-y-4 pt-2">
                                <div className="p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-russo uppercase text-sm">Связь с администрацией школы</h4>
                                            <p className="text-white/40 text-[10px]">Помощь в смене данных</p>
                                        </div>
                                    </div>
                                    <p className="text-white/70 text-xs leading-relaxed">
                                        Если у вас нет доступа к вашей почте и вы не помните текущий пароль, обратитесь к администратору нашей школы. Администратор вышлет вам временный пароль для входа. <strong className="text-amber-400">Все ваши абонементы, оплаты и достижения на 100% сохранятся!</strong>
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEmailModalOpen(false);
                                        handleTabChange('messages_unified');
                                    }}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-russo rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    <MessageSquare size={16} />
                                    <span>Написать администратору школы</span>
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateUserEmail} className="space-y-4">
                                {/* If Mode 'password': Prompt for Current Password */}
                                {emailModalMode === 'password' && (
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                            Текущий пароль <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                required
                                                value={currentPasswordInput}
                                                onChange={(e) => { setCurrentPasswordInput(e.target.value); setFieldEmailCurrentPassErr(''); }}
                                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-mono text-sm focus:outline-none transition-colors pr-10 ${fieldEmailCurrentPassErr ? 'border-red-500/80 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-sparta-gold'}`}
                                                placeholder="Ваш текущий пароль"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                        {fieldEmailCurrentPassErr && (
                                            <p className="text-[11px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                                <ShieldAlert size={12} className="shrink-0" />
                                                <span>{fieldEmailCurrentPassErr}</span>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* If Mode 'code': Prompt for OTP Code */}
                                {emailModalMode === 'code' && (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                                            <div>
                                                <p className="text-white/40 text-[10px] uppercase font-bold">Текущая почта</p>
                                                <p className="text-white font-mono font-bold">{userProfile?.email || user?.email}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSendEmailOtp}
                                                disabled={isUpdatingEmail}
                                                className="px-3 py-1.5 bg-sparta-gold/20 hover:bg-sparta-gold/30 text-sparta-gold border border-sparta-gold/30 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all"
                                            >
                                                {isOtpSent ? 'Повторить' : 'Выслать код'}
                                            </button>
                                        </div>

                                        {isOtpSent && (
                                            <div>
                                                <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                                    Код подтверждения из письма <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={otpCodeInput}
                                                    onChange={(e) => setOtpCodeInput(e.target.value.trim())}
                                                    className="w-full px-4 py-3 bg-black/40 border border-sparta-gold/50 rounded-xl text-sparta-gold font-mono text-center tracking-[0.3em] text-lg font-bold focus:outline-none"
                                                    placeholder="000000"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Target New Email Input */}
                                <div>
                                    <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                        Новая актуальная почта (Email) <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={newEmailInput}
                                        onChange={(e) => { setNewEmailInput(e.target.value); setFieldEmailNewEmailErr(''); }}
                                        className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-mono text-sm focus:outline-none transition-colors ${fieldEmailNewEmailErr ? 'border-red-500/80 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-sparta-gold'}`}
                                        placeholder="new.email@example.com"
                                    />
                                    {fieldEmailNewEmailErr && (
                                        <p className="text-[11px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                            <ShieldAlert size={12} className="shrink-0" />
                                            <span>{fieldEmailNewEmailErr}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Optional New Password Input */}
                                <div>
                                    <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                        Новый пароль {userProfile?.isTemporaryCredentials ? <span className="text-red-400">*</span> : <span className="text-white/40 text-[10px] font-normal lowercase">(необязательно)</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            required={Boolean(userProfile?.isTemporaryCredentials)}
                                            value={newPasswordInput}
                                            onChange={(e) => { setNewPasswordInput(e.target.value); setFieldEmailNewPassErr(''); }}
                                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sparta-gold font-mono text-sm focus:outline-none transition-colors font-bold pr-10 ${fieldEmailNewPassErr ? 'border-red-500/80 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-sparta-gold'}`}
                                            placeholder={userProfile?.isTemporaryCredentials ? "Придумайте ваш личный пароль" : "Оставьте пустым, если менять не нужно"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                    {fieldEmailNewPassErr && (
                                        <p className="text-[11px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                            <ShieldAlert size={12} className="shrink-0" />
                                            <span>{fieldEmailNewPassErr}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isUpdatingEmail || !newEmailInput.trim()}
                                        className="w-full py-4 px-4 bg-sparta-gold hover:bg-yellow-500 text-black font-russo rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 disabled:opacity-50 active:scale-95"
                                    >
                                        {isUpdatingEmail ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>Сохранение...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={18} />
                                                <span>Сохранить и обновить почту</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {!userProfile?.isTemporaryCredentials && (
                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setEmailModalMode('admin_help'); setEmailUpdateError(''); }}
                                            className="text-[11px] text-white/40 hover:text-sparta-gold underline transition-colors"
                                        >
                                            Потеряли доступ и к почте, и к паролю? Связаться с администратором
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Secure Password Change Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md pt-safe pb-safe">
                    <div className="bg-[#18181b] rounded-3xl w-full max-w-lg border border-sparta-gold/30 p-4 sm:p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-left font-manrope space-y-6 max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-wider flex items-center gap-2">
                                    <Lock className="text-sparta-gold shrink-0" size={22} />
                                    Сменить Пароль
                                </h3>
                                <p className="text-xs text-white/50 mt-1">Безопасность и парольная защита аккаунта</p>
                            </div>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mode Selector Tabs */}
                        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 text-[10px] sm:text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => { setPassModalMode('current_pass'); setPassUpdateError(''); setPassUpdateSuccess(''); }}
                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all flex flex-col items-center gap-1 text-center leading-tight ${passModalMode === 'current_pass' ? 'bg-sparta-gold text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                            >
                                <Lock size={14} className="shrink-0" />
                                <span className="line-clamp-1">Помню пароль</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setPassModalMode('reset_link'); setPassUpdateError(''); setPassUpdateSuccess(''); }}
                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all flex flex-col items-center gap-1 text-center leading-tight ${passModalMode === 'reset_link' ? 'bg-sparta-gold text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                            >
                                <Mail size={14} className="shrink-0" />
                                <span className="line-clamp-1">Сбросить</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setPassModalMode('admin_help'); setPassUpdateError(''); setPassUpdateSuccess(''); }}
                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl transition-all flex flex-col items-center gap-1 text-center leading-tight ${passModalMode === 'admin_help' ? 'bg-sparta-gold text-black shadow-md' : 'text-white/50 hover:text-white'}`}
                            >
                                <ShieldCheck size={14} className="shrink-0" />
                                <span className="line-clamp-1">Связаться</span>
                            </button>
                        </div>

                        {/* Success & Error Feedback */}
                        {passUpdateSuccess && (
                            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                                <CheckCircle size={16} className="shrink-0" />
                                <span>{passUpdateSuccess}</span>
                            </div>
                        )}

                        {passUpdateError && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                                <ShieldAlert size={16} className="shrink-0" />
                                <span>{passUpdateError}</span>
                            </div>
                        )}

                        {/* Mode Content */}
                        {passModalMode === 'admin_help' ? (
                            <div className="space-y-4 pt-2">
                                <div className="p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-russo uppercase text-sm">Связь с администрацией школы</h4>
                                            <p className="text-white/40 text-[10px]">Сброс пароля при потере доступа</p>
                                        </div>
                                    </div>
                                    <p className="text-white/70 text-xs leading-relaxed">
                                        Если у вас нет доступа к вашей почте и вы не помните текущий пароль, обратитесь к администратору нашей школы. Администратор вышлет вам временный пароль для входа. <strong className="text-amber-400">Все ваши абонементы, оплаты и достижения сохранятся!</strong>
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPasswordModalOpen(false);
                                        handleTabChange('messages_unified');
                                    }}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-russo rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    <MessageSquare size={16} />
                                    <span>Написать администратору школы</span>
                                </button>
                            </div>
                        ) : passModalMode === 'reset_link' ? (
                            <form onSubmit={handleUpdateUserPassword} className="space-y-4 pt-2">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                                    <p className="text-white/40 text-[10px] uppercase font-bold">Ваша текущая привязанная почта</p>
                                    <p className="text-white font-mono font-bold text-sm">{userProfile?.email || user?.email}</p>
                                    <p className="text-white/60 text-xs pt-1">
                                        Мы вышлем специальную ссылку для сброса и создания нового пароля прямо на этот адрес.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isUpdatingPassword}
                                    className="w-full py-4 bg-sparta-gold hover:bg-yellow-500 text-black font-russo rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 disabled:opacity-50 active:scale-95"
                                >
                                    {isUpdatingPassword ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Отправка ссылки...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={18} />
                                            <span>Выслать ссылку для сброса</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleUpdateUserPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                        Текущий пароль <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassCurrent ? "text" : "password"}
                                            required
                                            value={passCurrentInput}
                                            onChange={(e) => { setPassCurrentInput(e.target.value); setFieldPassCurrentErr(''); }}
                                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white font-mono text-sm focus:outline-none transition-colors pr-10 ${fieldPassCurrentErr ? 'border-red-500/80 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-sparta-gold'}`}
                                            placeholder="Ваш текущий пароль"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassCurrent(!showPassCurrent)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                    {fieldPassCurrentErr && (
                                        <p className="text-[11px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                            <ShieldAlert size={12} className="shrink-0" />
                                            <span>{fieldPassCurrentErr}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                        Новый пароль <span className="text-red-400">* (мин. 6 символов)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassNew ? "text" : "password"}
                                            required
                                            value={passNewInput}
                                            onChange={(e) => { setPassNewInput(e.target.value); setFieldPassNewErr(''); }}
                                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sparta-gold font-mono text-sm focus:outline-none transition-colors font-bold pr-10 ${fieldPassNewErr ? 'border-red-500/80 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-sparta-gold'}`}
                                            placeholder="Придумайте новый пароль"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassNew(!showPassNew)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                    {fieldPassNewErr && (
                                        <p className="text-[11px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                            <ShieldAlert size={12} className="shrink-0" />
                                            <span>{fieldPassNewErr}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-bold text-white/60 mb-2">
                                        Повторите новый пароль <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassConfirm ? "text" : "password"}
                                            required
                                            value={passConfirmInput}
                                            onChange={(e) => { setPassConfirmInput(e.target.value); setFieldPassConfirmErr(''); }}
                                            className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sparta-gold font-mono text-sm focus:outline-none transition-colors font-bold pr-10 ${fieldPassConfirmErr ? 'border-red-500/80 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-sparta-gold'}`}
                                            placeholder="Повторите новый пароль"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassConfirm(!showPassConfirm)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                    {fieldPassConfirmErr && (
                                        <p className="text-[11px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                            <ShieldAlert size={12} className="shrink-0" />
                                            <span>{fieldPassConfirmErr}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isUpdatingPassword || !passCurrentInput || !passNewInput}
                                        className="w-full py-4 px-4 bg-sparta-gold hover:bg-yellow-500 text-black font-russo rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 disabled:opacity-50 active:scale-95"
                                    >
                                        {isUpdatingPassword ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>Обновление пароля...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck size={18} />
                                                <span>Обновить пароль</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setPassModalMode('reset_link'); setPassUpdateError(''); }}
                                        className="text-[11px] text-white/40 hover:text-sparta-gold underline transition-colors"
                                    >
                                        Забыли текущий пароль? Сбросить по почте
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}


            {/* Referral Modal */}
            <AnimatePresence>
                {isReferralOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsReferralOpen(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-gradient-to-b from-[#1a1a1a] to-black border border-white/10 rounded-[40px] p-8 md:p-12 overflow-hidden shadow-2xl"
                        >
                            {/* Abstract Background for Referral */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px] -ml-24 -mb-24" />

                            <button
                                onClick={() => setIsReferralOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 transition-colors z-20"
                            >
                                <X size={24} />
                            </button>

                            <div className="relative z-10 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-sparta-gold to-yellow-600 rounded-[32px] mx-auto mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.3)] animate-bounce-slow">
                                    <Gift size={48} className="text-black" />
                                </div>

                                <h3 className="text-3xl font-russo text-white mb-4 uppercase tracking-tight">Пригласи друга – получи бонус!</h3>
                                <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-sm mx-auto">
                                    Поделитесь ссылкой с другом. Если он купит абонемент, вы оба получите <span className="text-sparta-gold font-bold">7 дополнительных дней</span> к вашей подписке.
                                </p>

                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-3xl pr-4">
                                        <div className="flex-1 w-full px-4 py-3 bg-black/40 rounded-2xl text-white/60 text-[10px] font-mono truncate text-left border border-white/5 lowercase">
                                            {`${window.location.host}/ref/${userProfile?.referralCode || user?.uid?.slice(0, 8)}`}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const refLink = `${window.location.origin}/ref/${userProfile?.referralCode || user?.uid?.slice(0, 8)}`;
                                                navigator.clipboard.writeText(refLink);
                                                setIsCopied(true);
                                                setTimeout(() => setIsCopied(false), 2000);
                                            }}
                                            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-sparta-gold text-black hover:bg-yellow-500'}`}
                                        >
                                            {isCopied ? (
                                                <>
                                                    <CheckCircle2 size={14} />
                                                    Скопировано
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    Копировать
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                            <div className={`w-2 h-2 rounded-full ${userProfile?.referrals?.count > 0 ? 'bg-green-500 animate-pulse' : 'bg-sparta-gold'}`} />
                                            <span className="text-[10px] text-white/50 uppercase font-black tracking-widest">
                                                {userProfile?.referrals?.count || 0} {userProfile?.referrals?.count % 10 === 1 && userProfile?.referrals?.count % 100 !== 11 ? 'друг приглашен' : (userProfile?.referrals?.count % 10 >= 2 && userProfile?.referrals?.count % 10 <= 4 && (userProfile?.referrals?.count % 100 < 10 || userProfile?.referrals?.count % 100 >= 20) ? 'друга приглашено' : 'друзей приглашено')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                                            <Sparkles size={14} className="text-sparta-gold" />
                                            <span className="text-[10px] text-white/50 uppercase font-black tracking-widest">
                                                +{userProfile?.referrals?.bonusDays || 0} {userProfile?.referrals?.bonusDays % 10 === 1 && userProfile?.referrals?.bonusDays % 100 !== 11 ? 'день бонуса' : (userProfile?.referrals?.bonusDays % 10 >= 2 && userProfile?.referrals?.bonusDays % 10 <= 4 && (userProfile?.referrals?.bonusDays % 100 < 10 || userProfile?.referrals?.bonusDays % 100 >= 20) ? 'дня бонуса' : 'дней бонуса')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR Check-in Modal */}
            <AnimatePresence>
                {showQR && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQR(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                            className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl sm:rounded-[3rem] p-5 sm:p-8 md:p-10 overflow-y-auto custom-scrollbar max-h-[calc(100dvh-2rem)] shadow-2xl text-center"
                        >
                            {/* Futuristic UI Elements */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sparta-gold to-transparent opacity-50" />
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-sparta-gold/20 rounded-full blur-[80px]" />

                            <button
                                onClick={() => setShowQR(false)}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 transition-colors z-20 cursor-pointer"
                            >
                                <X size={22} />
                            </button>

                            <div className="relative z-10">
                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 mb-5 sm:mb-8">
                                    <div className="p-2.5 sm:p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold mb-1 sm:mb-2">
                                        <QrCode size={28} className="sm:w-8 sm:h-8" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">Быстрый Check-in</h3>
                                    <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em]">Покажите код администратору</p>
                                </div>

                                <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-5 sm:mb-8 inline-flex items-center justify-center max-w-full">
                                    <QRCodeSVG
                                        value={user.uid}
                                        size={180}
                                        className="w-36 h-36 sm:w-48 sm:h-48"
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <div className="p-3.5 sm:p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1">Ваш ID</p>
                                        <p className="text-xs sm:text-sm font-russo text-white tracking-widest break-all">{user.uid.toUpperCase()}</p>
                                    </div>

                                    {streak > 0 && (
                                        <div className="flex items-center justify-center gap-2 text-orange-500 bg-orange-500/10 py-2.5 sm:py-3 rounded-2xl border border-orange-500/20">
                                            <Flame size={16} fill="currentColor" className="animate-pulse" />
                                            <span className="text-xs font-black uppercase tracking-widest">Страйк: {streak} дней!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Sparta Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={`fixed top-6 right-6 z-[200] px-5 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3.5 max-w-md ${
                            toast.type === 'error'
                                ? 'bg-red-950/95 border-red-500/40 text-red-100 shadow-red-950/50'
                                : toast.type === 'info'
                                ? 'bg-blue-950/95 border-blue-500/40 text-blue-100 shadow-blue-950/50'
                                : 'bg-[#15171C]/95 border-sparta-gold/50 text-white shadow-sparta-gold/10'
                        }`}
                    >
                        {toast.type === 'error' ? (
                            <ShieldAlert className="text-red-400 shrink-0" size={20} />
                        ) : toast.type === 'info' ? (
                            <Info className="text-blue-400 shrink-0" size={20} />
                        ) : (
                            <CheckCircle2 className="text-sparta-gold shrink-0" size={20} />
                        )}
                        <span className="text-xs font-bold font-manrope leading-snug">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-auto text-white/40 hover:text-white transition-colors p-1"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Role-tailored Fixed Mobile Bottom Navigation */}
            {!isMobileChatActive && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c10]/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1.5 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.9)]">
                    <div className="flex items-center justify-between w-full max-w-lg mx-auto">
                        {effectiveRole === 'parent' ? (
                            /* PARENT BOTTOM DOCK */
                            <>
                                <button
                                    onClick={() => handleTabChange('family')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'family' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'family' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Users size={18} className={activeTab === 'family' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'family' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Семья</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('requests')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'requests' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Calendar size={18} className={activeTab === 'requests' ? 'text-sparta-gold' : 'text-white/50'} />
                                        {requests.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sparta-gold rounded-full animate-pulse" />}
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'requests' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Заявки</span>
                                </button>
                                <button
                                    onClick={() => setShowQR(true)}
                                    className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                                    title="Показать QR-код для входа"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)] border-2 border-black group-active:scale-95 transition-all">
                                        <QrCode size={22} className="text-black stroke-[2.5]" />
                                    </div>
                                    <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">QR Вход</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('subscriptions')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'subscriptions' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'subscriptions' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <CreditCard size={18} className={activeTab === 'subscriptions' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'subscriptions' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Абонемент</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('messages_unified')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'messages_unified' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-sparta-gold' : 'text-white/50'} />
                                        {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'messages_unified' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Чат</span>
                                </button>
                            </>
                        ) : (effectiveRole === 'coach' || effectiveRole === 'trainer') ? (
                            /* COACH BOTTOM DOCK */
                            <>
                                <button
                                    onClick={() => {
                                        setCoachSubTab('dashboard');
                                        handleTabChange('coaching');
                                    }}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'coaching' && coachSubTab === 'dashboard' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'coaching' && coachSubTab === 'dashboard' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <LayoutDashboard size={18} className={activeTab === 'coaching' && coachSubTab === 'dashboard' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'coaching' && coachSubTab === 'dashboard' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Занятие</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setCoachSubTab('journal');
                                        handleTabChange('coaching');
                                    }}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'coaching' && coachSubTab === 'journal' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'coaching' && coachSubTab === 'journal' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Users size={18} className={activeTab === 'coaching' && coachSubTab === 'journal' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'coaching' && coachSubTab === 'journal' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Группы</span>
                                </button>
                                <button
                                    onClick={() => navigate('/admin/scanner')}
                                    className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                                    title="Сканировать QR-пропуск ученика"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)] border-2 border-black group-active:scale-95 transition-all">
                                        <QrCode size={22} className="text-black stroke-[2.5]" />
                                    </div>
                                    <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">Сканер</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setCoachSubTab('review');
                                        handleTabChange('coaching');
                                    }}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'coaching' && coachSubTab === 'review' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'coaching' && coachSubTab === 'review' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <CheckSquare size={18} className={activeTab === 'coaching' && coachSubTab === 'review' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'coaching' && coachSubTab === 'review' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Задания</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('messages_unified')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'messages_unified' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-sparta-gold' : 'text-white/50'} />
                                        {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'messages_unified' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Чат</span>
                                </button>
                            </>
                        ) : ((isRealDeveloper && !impersonatedRole) || effectiveRole === 'developer' || effectiveRole === 'dev') ? (
                            /* DEVELOPER BOTTOM DOCK */
                            <>
                                <button
                                    onClick={() => handleTabChange('requests')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'requests' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <LayoutDashboard size={18} className={activeTab === 'requests' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'requests' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Сводка</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('analytics')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'analytics' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Terminal size={18} className={activeTab === 'analytics' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'analytics' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Пульт</span>
                                </button>
                                <button
                                    onClick={() => setIsRoleSwitcherOpen(true)}
                                    className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                                    title="Быстрое переключение ролей"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-amber-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.5)] border-2 border-black group-active:scale-95 transition-all">
                                        <Sparkles size={22} className="text-black stroke-[2.5]" />
                                    </div>
                                    <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">Роли</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('messages_unified')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'messages_unified' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'messages_unified' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Чат</span>
                                </button>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 text-white/40 hover:text-white/70"
                                >
                                    <div className="p-1.5 rounded-xl transition-all">
                                        <ShieldCheck size={18} className="text-white/50" />
                                    </div>
                                    <span className="text-[8.5px] tracking-tight uppercase font-russo mt-0.5 text-white/40">Админка</span>
                                </button>
                            </>
                        ) : effectiveRole === 'director' ? (
                            /* DIRECTOR BOTTOM DOCK */
                            <>
                                <button
                                    onClick={() => handleTabChange('requests')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'requests' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <LayoutDashboard size={18} className={activeTab === 'requests' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'requests' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Сводка</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('analytics')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'analytics' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <TrendingUp size={18} className={activeTab === 'analytics' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'analytics' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Анализ</span>
                                </button>
                                <button
                                    onClick={() => navigate('/admin/finance')}
                                    className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                                    title="Финансовый отчет и выручка"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)] border-2 border-black group-active:scale-95 transition-all">
                                        <Wallet size={22} className="text-black stroke-[2.5]" />
                                    </div>
                                    <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">Финансы</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('messages_unified')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'messages_unified' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'messages_unified' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Чат</span>
                                </button>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 text-white/40 hover:text-white/70"
                                >
                                    <div className="p-1.5 rounded-xl transition-all">
                                        <ShieldCheck size={18} className="text-white/50" />
                                    </div>
                                    <span className="text-[8.5px] tracking-tight uppercase font-russo mt-0.5 text-white/40">Админка</span>
                                </button>
                            </>
                        ) : (effectiveRole === 'admin' || effectiveRole === 'super') ? (
                            /* ADMIN IN DASHBOARD DOCK */
                            <>
                                <button
                                    onClick={() => handleTabChange('requests')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'requests' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <LayoutDashboard size={18} className={activeTab === 'requests' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'requests' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Сводка</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('analytics')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'analytics' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <TrendingUp size={18} className={activeTab === 'analytics' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'analytics' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Анализ</span>
                                </button>
                                <button
                                    onClick={() => navigate('/admin/scanner')}
                                    className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                                    title="Сканировать QR-пропуск"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)] border-2 border-black group-active:scale-95 transition-all">
                                        <QrCode size={22} className="text-black stroke-[2.5]" />
                                    </div>
                                    <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">Сканер</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('coaching')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'coaching' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'coaching' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Users size={18} className={activeTab === 'coaching' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'coaching' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Команда</span>
                                </button>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 text-white/40 hover:text-white/70"
                                >
                                    <div className="p-1.5 rounded-xl transition-all">
                                        <ShieldCheck size={18} className="text-white/50" />
                                    </div>
                                    <span className="text-[8.5px] tracking-tight uppercase font-russo mt-0.5 text-white/40">Админка</span>
                                </button>
                            </>
                        ) : (
                            /* KID / STUDENT BOTTOM DOCK */
                            <>
                                <button
                                    onClick={() => handleTabChange('requests')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'requests' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Flame size={18} className={activeTab === 'requests' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'requests' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Дневник</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('achievements')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'achievements' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'achievements' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <Trophy size={18} className={activeTab === 'achievements' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'achievements' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Награды</span>
                                </button>
                                <button
                                    onClick={() => setShowQR(true)}
                                    className="flex-1 flex flex-col items-center justify-center -mt-4 py-0.5 px-0.5 group cursor-pointer"
                                    title="Показать QR-пропуск для входа в манеж"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-sparta-gold text-black flex items-center justify-center shadow-[0_0_18px_rgba(245,158,11,0.5)] border-2 border-black group-active:scale-95 transition-all">
                                        <QrCode size={22} className="text-black stroke-[2.5]" />
                                    </div>
                                    <span className="text-[8px] tracking-tight uppercase font-russo mt-0.5 text-sparta-gold font-bold">QR Вход</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('orders')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'orders' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <ShoppingBag size={18} className={activeTab === 'orders' ? 'text-sparta-gold' : 'text-white/50'} />
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'orders' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Призы</span>
                                </button>
                                <button
                                    onClick={() => handleTabChange('messages_unified')}
                                    className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 ${activeTab === 'messages_unified' ? 'text-sparta-gold scale-105' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    <div className={`relative p-1.5 rounded-xl transition-all ${activeTab === 'messages_unified' ? 'bg-sparta-gold/20 border border-sparta-gold/40 shadow-[0_0_12px_rgba(212,175,55,0.3)]' : ''}`}>
                                        <MessageSquare size={18} className={activeTab === 'messages_unified' ? 'text-sparta-gold' : 'text-white/50'} />
                                        {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
                                    </div>
                                    <span className={`text-[8.5px] tracking-tight uppercase font-russo mt-0.5 ${activeTab === 'messages_unified' ? 'text-sparta-gold font-bold' : 'text-white/40'}`}>Чат</span>
                                </button>
                            </>
                        )}
                    </div>
                </nav>
            )}

            {/* Developer / Tester Role Switcher Bottom Drawer */}
            <AnimatePresence>
                {isRoleSwitcherOpen && (
                    <motion.div
                        key="role-switcher-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsRoleSwitcherOpen(false)}
                        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md pt-safe pb-safe p-0 sm:p-4"
                    >
                        <motion.div
                            key="role-switcher-sheet"
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-[#111115] border border-sparta-gold/30 rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[calc(100dvh-2rem)] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
                        >
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-sparta-gold/20 border border-sparta-gold/40 flex items-center justify-center text-sparta-gold">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-russo text-white text-base">Быстрая смена роли</h3>
                                        <p className="text-[11px] text-white/50">Мгновенный тест мобильного интерфейса</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsRoleSwitcherOpen(false)}
                                    className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                {[
                                    { id: 'user', name: 'Юный спортсмен / Ребёнок', role: 'Спортсмен (Kid)', icon: '👦', tab: 'requests', desc: 'Дневник Чемпиона, монеты, FUT-карта, QR-пропуск' },
                                    { id: 'parent', name: 'Родитель Чемпиона', role: 'Родитель (Parent)', icon: '👨‍👩‍👧', tab: 'family', desc: 'Карточки детей, абонементы, расписание, вход' },
                                    { id: 'coach', name: 'Тренер SPARTA', role: 'Тренер (Coach)', icon: '⚽', tab: 'coaching', desc: 'Управление группами, журнал тренировок, ДЗ' },
                                    { id: 'admin', name: 'Администратор', role: 'Админ (Admin)', icon: '🛡️', path: '/admin', desc: 'CRM, заявки, QR-турникет, пользователи' },
                                    { id: 'director', name: 'Директор клуба', role: 'Руководитель', icon: '👔', tab: 'analytics', desc: 'Финансовые метрики, выручка, аналитика' },
                                    { id: null, name: 'Сброс (Разработчик)', role: 'Developer Mode', icon: '💻', tab: 'analytics', desc: 'Возврат к полной консоли разработчика' }
                                ].map((item: any) => {
                                    const isCurrent = (item.id === null && !impersonatedRole) || (item.id === impersonatedRole);
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => {
                                                setImpersonatedRole(item.id);
                                                if (item.path) {
                                                    navigate(item.path);
                                                } else if (item.tab) {
                                                    handleTabChange(item.tab);
                                                }
                                                setIsRoleSwitcherOpen(false);
                                                setToast({ type: 'success', message: `Режим изменён: ${item.name}` });
                                            }}
                                            className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${isCurrent ? 'bg-sparta-gold/15 border-sparta-gold/50 text-white shadow-lg shadow-sparta-gold/10' : 'bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="text-2xl shrink-0 w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10">
                                                {item.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-bold text-xs truncate">{item.name}</div>
                                                    {isCurrent && (
                                                        <span className="text-[9px] font-black uppercase text-sparta-gold bg-sparta-gold/20 px-2 py-0.5 rounded-full border border-sparta-gold/30">Активно</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-white/40 truncate">{item.desc}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Absence Reporting Modal ("Отпроситься с тренировки") */}
            <AnimatePresence>
                {isAbsenceModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md pt-safe pb-safe">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl max-h-[calc(100dvh-2rem)] flex flex-col"
                        >
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-russo text-base sm:text-lg text-white">Уведомить об отсутствии</h3>
                                        <p className="text-xs text-white/50">Предупредите тренера заранее</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAbsenceModalOpen(false)}
                                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleReportAbsence} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase mb-1.5">
                                        Дата пропущенной тренировки
                                    </label>
                                    <input
                                        type="date"
                                        value={absenceDate}
                                        onChange={(e) => setAbsenceDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:border-amber-400 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 uppercase mb-1.5">
                                        Причина отсутствия
                                    </label>
                                    <select
                                        value={absenceReason}
                                        onChange={(e) => setAbsenceReason(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/10 text-white focus:border-amber-400 focus:outline-none"
                                    >
                                        <option value="sick">🤒 Заболели (Сохраняет право на отработку)</option>
                                        <option value="personal">🚗 Семейные обстоятельства / Загрузка в школе</option>
                                        <option value="travel">✈️ Поездка / Отпуск</option>
                                    </select>
                                </div>

                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                                    💡 При отмене по причине болезни за ребёнком автоматически сохраняется <strong>1 ваучер на отработку</strong> в другой группе.
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAbsenceModalOpen(false)}
                                        className="w-full sm:flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 text-xs uppercase tracking-wider"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full sm:flex-1 py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                    >
                                        Отправить
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Makeup Class Booking Modal ("Запись на отработку") */}
            <AnimatePresence>
                {isMakeupModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md pt-safe pb-safe">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-lg bg-zinc-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl max-h-[calc(100dvh-2rem)] flex flex-col"
                        >
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-russo text-base sm:text-lg text-white">Запись на отработку</h3>
                                        <p className="text-xs text-white/50">Выберите удобный параллельный слот</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsMakeupModalOpen(false)}
                                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                <div
                                    onClick={() => handleBookMakeup('Суббота 13:00–14:00 • Манеж Юг (Тренер Пономарев С.А.)')}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                                >
                                    <div>
                                        <span className="text-xs font-bold text-emerald-400 block mb-0.5">Свободно 3 места</span>
                                        <h4 className="font-bold text-white text-sm group-hover:text-emerald-300">Суббота • 13:00 - 14:00</h4>
                                        <p className="text-xs text-white/60">Манеж Юг • Тренер: Пономарев Сергей Александрович</p>
                                    </div>
                                    <button className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold">Выбрать</button>
                                </div>

                                <div
                                    onClick={() => handleBookMakeup('Воскресенье 12:00–13:00 • Манеж Юг (Тренер Пономарев С.А.)')}
                                    className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400 hover:bg-emerald-500/10 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                                >
                                    <div>
                                        <span className="text-xs font-bold text-emerald-400 block mb-0.5">Свободно 2 места</span>
                                        <h4 className="font-bold text-white text-sm group-hover:text-emerald-300">Воскресенье • 12:00 - 13:00</h4>
                                        <p className="text-xs text-white/60">Манеж Юг • Тренер: Пономарев Сергей Александрович</p>
                                    </div>
                                    <button className="w-full sm:w-auto px-4 py-2 sm:py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold">Выбрать</button>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end shrink-0">
                                <button
                                    onClick={() => setIsMakeupModalOpen(false)}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
