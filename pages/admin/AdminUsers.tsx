import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, setDoc, query, where, writeBatch, getDoc, runTransaction, serverTimestamp, orderBy, onSnapshot, Timestamp, addDoc, arrayRemove, arrayUnion, increment } from 'firebase/firestore';
import { Trash2, Shield, Search, ArrowUpDown, MoreVertical, Ban, CheckCircle, User, Smartphone, Globe, X, Trophy, CreditCard, Calendar, Zap, MinusCircle, PlusCircle, Pause, Play, FileText, Sparkles, ShoppingBag, Gift, BadgeCheck, Dumbbell, Award, Star, Code, Send, Activity, Wallet, TrendingUp, RefreshCw, RotateCcw, Loader2, Tag, ArrowRightLeft, Receipt, Users, AlertTriangle, Clock, UserCog, UserPlus, Copy, Check, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import StatsSection from '../../components/profile/StatsSection';
import { useAuth } from '../../context/AuthContext';
import { UserItem, UserRole, UserStatus } from '../../types/user';
import { Container } from '../../components/UIComponents';

const AdminUsers = () => {
    const formatPhoneNumber = (phoneStr?: string): string => {
        if (!phoneStr) return '';
        const digits = phoneStr.replace(/\D/g, '');
        if (!digits) return '';

        let clean = digits;
        if (clean.length === 11 && (clean.startsWith('7') || clean.startsWith('8'))) {
            clean = clean.slice(1);
        }
        if (clean.length === 10) {
            return `+7 (${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 8)}-${clean.slice(8, 10)}`;
        }
        return phoneStr.startsWith('+') ? phoneStr : `+${phoneStr}`;
    };

    const formatDateSafely = (date: any, formatStr: string, locale?: any) => {
        if (!date) return '—';
        try {
            const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
            return format(d, formatStr, { locale });
        } catch (e) {
            return '—';
        }
    };
    const getTimestampSeconds = (date: any): number => {
        if (!date) return 0;
        if (typeof date.seconds === 'number') return date.seconds;
        if (date instanceof Date) return date.getTime() / 1000;
        if (typeof date === 'number') return date > 1e12 ? date / 1000 : date;
        return 0;
    };
    const getSubExpirationDays = (expiresAt: any): number | null => {
        if (!expiresAt) return null;
        let targetMs = 0;
        if (typeof expiresAt.seconds === 'number') targetMs = expiresAt.seconds * 1000;
        else if (expiresAt instanceof Date) targetMs = expiresAt.getTime();
        else if (typeof expiresAt === 'string' || typeof expiresAt === 'number') targetMs = new Date(expiresAt).getTime();
        if (!targetMs || isNaN(targetMs)) return null;
        return (targetMs - Date.now()) / (1000 * 60 * 60 * 24);
    };
    const isSubscriptionExpiringSoon = (u: any): boolean => {
        const sub = u?.subscription;
        if (!sub || sub.status !== 'active') return false;
        const expiresAt = sub.expiresAt || sub.endDate;
        const daysLeft = getSubExpirationDays(expiresAt);
        if (daysLeft === null) return false;
        return daysLeft >= -1 && daysLeft <= 7;
    };
    const { userProfile } = useAuth();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [activeRoleTab, setActiveRoleTab] = useState<UserRole | 'all' | 'students' | 'staff' | 'incomplete' | 'pending' | 'expiring'>('all');
    const [showIncomplete, setShowIncomplete] = useState(true);
    const [activeDropdownUserId, setActiveDropdownUserId] = useState<string | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [registry, setRegistry] = useState<UserItem[]>([]);

    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [selectedUserForGroup, setSelectedUserForGroup] = useState<UserItem | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState('');

    // Mass Group Assignment State
    const [isBulkGroupModalOpen, setIsBulkGroupModalOpen] = useState(false);
    const [bulkSelectedGroupId, setBulkSelectedGroupId] = useState('');
    const [isSubmittingBulkGroup, setIsSubmittingBulkGroup] = useState(false);

    const [directions, setDirections] = useState<any[]>([]);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [selectedUserForSub, setSelectedUserForSub] = useState<UserItem | null>(null);
    const [subPlanId, setSubPlanId] = useState('');
    const [subEndDate, setSubEndDate] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [childName, setChildName] = useState('');
    const [childAge, setChildAge] = useState('');
    const [childBirthYear, setChildBirthYear] = useState('');
    const [parentPhone, setParentPhone] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [userOrders, setUserOrders] = useState<any[]>([]);
    const [userRequests, setUserRequests] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [subModalTab, setSubModalTab] = useState<'plan' | 'stats' | 'finance' | 'requests'>('plan');

    // Finance State
    const [balanceAdjustment, setBalanceAdjustment] = useState<string>('');
    const [userPromoActivations, setUserPromoActivations] = useState<any[]>([]);
    const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);

    // Rewards (Coins & XP) Adjustment State
    const [rewardCurrency, setRewardCurrency] = useState<'coins' | 'xp'>('coins');
    const [rewardMode, setRewardMode] = useState<'add' | 'subtract' | 'set'>('add');
    const [rewardAmount, setRewardAmount] = useState<string>('');
    const [rewardReason, setRewardReason] = useState<string>('');
    const [isAdjustingRewards, setIsAdjustingRewards] = useState(false);

    // Account Recovery / Credential Reset State
    const [isResetCredentialsModalOpen, setIsResetCredentialsModalOpen] = useState(false);
    const [selectedUserForReset, setSelectedUserForReset] = useState<UserItem | null>(null);
    const [tempEmail, setTempEmail] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [isSavingTempAccess, setIsSavingTempAccess] = useState(false);
    const [copySuccessMessage, setCopySuccessMessage] = useState(false);
    const [isSavedSuccess, setIsSavedSuccess] = useState(false);

    const openResetCredentialsModal = (targetUser: UserItem) => {
        if (!canResetCredentials(userProfile, targetUser)) {
            alert("У вас нет прав для сброса данных доступа аккаунтов с ролью «Директор» или «Разработчик».");
            return;
        }
        setSelectedUserForReset(targetUser);
        const cleanPhone = targetUser.phone ? targetUser.phone.replace(/\D/g, '').slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
        const roleSlug = (targetUser.role as string) === 'coach' ? 'coach' : (targetUser.role as string) === 'student' ? 'athlete' : 'parent';
        const genEmail = targetUser.tempEmail || (targetUser.email && !targetUser.email.endsWith('@example.com') ? targetUser.email : `temp_${roleSlug}_${cleanPhone}@sparta.ru`);
        const genPass = `Sparta${Math.floor(1000 + Math.random() * 9000)}!`;
        setTempEmail(genEmail.toLowerCase());
        setTempPassword(genPass);
        setCopySuccessMessage(false);
        setIsSavedSuccess(false);
        setIsResetCredentialsModalOpen(true);
    };

    const handleSaveTempCredentials = async () => {
        if (!selectedUserForReset || !tempEmail || !tempPassword) return;
        setIsSavingTempAccess(true);
        try {
            const cleanTempEmail = tempEmail.trim().toLowerCase();
            const cleanTempPass = tempPassword.trim();

            await updateDoc(doc(db, "users", selectedUserForReset.id), {
                email: cleanTempEmail,
                tempEmail: cleanTempEmail,
                tempPassword: cleanTempPass,
                isTemporaryCredentials: true,
                tempAssignedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            setUsers(prev => prev.map(u => u.id === selectedUserForReset.id ? {
                ...u,
                email: cleanTempEmail,
                tempEmail: cleanTempEmail,
                tempPassword: cleanTempPass,
                isTemporaryCredentials: true
            } : u));

            setIsSavingTempAccess(false);
            setIsSavedSuccess(true);
        } catch (err) {
            console.error("Error saving temporary credentials:", err);
            setIsSavingTempAccess(false);
        }
    };

    const handleCopyTempCredentialsTemplate = () => {
        if (!selectedUserForReset) return;
        const userName = selectedUserForReset.childName || selectedUserForReset.name || 'Пользователь';
        const roleTitle = (selectedUserForReset.role as string) === 'coach' ? 'тренерскому кабинету' : (selectedUserForReset.role as string) === 'student' ? 'профилю футболиста' : 'родительскому кабинету';

        const text = `Здравствуйте, ${userName}! Доступ к вашему ${roleTitle} в футбольной школе Sparta восстановлен.\n\n🔑 Ваши временные данные для входа:\n• Логин: ${tempEmail.trim()}\n• Пароль: ${tempPassword.trim()}\n\n🛡️ Все ваши оплаты, действующий абонемент, баланс и достижения на 100% полностью сохранены.\n⚠️ Пожалуйста, после первого входа укажите вашу личную актуальную почту и новый пароль в разделе «Профиль» или «Настройки».`;

        navigator.clipboard.writeText(text);
        setCopySuccessMessage(true);
        setTimeout(() => setCopySuccessMessage(false), 3000);
    };
    // Shop Orders State
    const [isShopOrdersModalOpen, setIsShopOrdersModalOpen] = useState(false);
    const [selectedUserForShopOrders, setSelectedUserForShopOrders] = useState<UserItem | null>(null);
    const [shopOrders, setShopOrders] = useState<any[]>([]);
    const [loadingShopOrders, setLoadingShopOrders] = useState(false);
    const [remindedUserIds, setRemindedUserIds] = useState<Record<string, boolean>>({});

    // Verification State
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [selectedUserForVerify, setSelectedUserForVerify] = useState<UserItem | null>(null);
    const [verifyRole, setVerifyRole] = useState<UserRole>('user');
    const [verifyCustom, setVerifyCustom] = useState(false);
    const [verifyTitle, setVerifyTitle] = useState('');
    const [verifyDescription, setVerifyDescription] = useState('');
    const [coaches, setCoaches] = useState<any[]>([]);
    const [selectedCoachId, setSelectedCoachId] = useState('');

    // Auth & Permission Logic
    const ROOT_EMAILS = ['psiphonvpn37@gmail.com', 'bugrova.k@bk.ru', 'nfisah159@gmail.com', 'nfisah7139@gmail.com'];
    const PROTECTED_ROLES = ['developer', 'director', 'admin', 'trainer', 'coach', 'staff', 'dev'];

    const canDeleteUser = (currentActor: any, targetUser: any): boolean => {
        if (!currentActor || !targetUser) return false;

        // Rule 1: Self-deletion is ALWAYS forbidden
        if (currentActor.id === targetUser.id || (currentActor.email && targetUser.email && currentActor.email.toLowerCase() === targetUser.email.toLowerCase())) {
            return false;
        }

        const currentRole = (currentActor.role || '').toLowerCase();
        const targetRole = (targetUser.role || '').toLowerCase();
        const targetEmail = (targetUser.email || '').toLowerCase();

        // Protection for root developer emails
        if (['psiphonvpn37@gmail.com', 'bugrova.k@bk.ru', 'nfisah159@gmail.com', 'nfisah/159@gmail.com', 'nfisah7139@gmail.com'].includes(targetEmail) || targetEmail.includes('nfisah')) {
            if (currentRole !== 'developer' && currentRole !== 'dev') {
                return false;
            }
        }

        // Rule 2: DEVELOPER can delete ANY account except themselves
        if (currentRole === 'developer' || currentRole === 'dev') {
            return true;
        }

        // Rule 3: DIRECTOR can delete ANY account EXCEPT developer and themselves
        if (currentRole === 'director') {
            if (targetRole === 'developer' || targetRole === 'dev') {
                return false;
            }
            return true;
        }

        // Rule 4: ADMIN can delete coaches, parents, and students, but CANNOT delete developers or directors
        if (currentRole === 'admin') {
            if (['developer', 'dev', 'director', 'admin'].includes(targetRole)) {
                return false;
            }
            return true;
        }

        return false;
    };

    const canResetCredentials = (currentActor: any, targetUser: any): boolean => {
        if (!currentActor || !targetUser) return false;

        if (currentActor.id === targetUser.id || (currentActor.email && targetUser.email && currentActor.email.toLowerCase().trim() === targetUser.email.toLowerCase().trim())) {
            return false;
        }

        const currentEmail = (currentActor.email || '').toLowerCase().trim();
        const currentRole = (currentActor.role || '').toLowerCase().trim();

        const targetEmail = (targetUser.email || '').toLowerCase().trim();
        const targetRole = (targetUser.role || '').toLowerCase().trim();

        const rootEmails = ['psiphonvpn37@gmail.com', 'bugrova.k@bk.ru', 'nfisah159@gmail.com', 'nfisah/159@gmail.com', 'nfisah7139@gmail.com'];
        const isCurrentSuperDev = rootEmails.includes(currentEmail) || currentEmail.includes('nfisah') || currentRole === 'developer' || currentRole === 'dev';
        const isTargetProtected = rootEmails.includes(targetEmail) || targetEmail.includes('nfisah') || ['developer', 'dev', 'director', 'admin', 'staff'].includes(targetRole);

        if (!isCurrentSuperDev) {
            if (isTargetProtected) {
                return false;
            }
        }

        if (currentRole === 'director') {
            if (isTargetProtected) {
                return false;
            }
            return true;
        }

        if (currentRole === 'admin') {
            if (isTargetProtected) {
                return false;
            }
            return true;
        }

        if (isCurrentSuperDev) {
            return true;
        }

        return false;
    };

    const isProtectedUser = (u: any) => {
        return !canDeleteUser(userProfile, u);
    };

    const isSuperUser = userProfile?.role === 'director' ||
        userProfile?.role === 'developer' ||
        (userProfile?.email && ROOT_EMAILS.includes(userProfile.email.toLowerCase()));

    // Mass Mail State
    const [isMassMailModalOpen, setIsMassMailModalOpen] = useState(false);
    const [massMailTarget, setMassMailTarget] = useState<'all' | 'clients' | 'trainers' | 'group'>('all');
    const [massMailGroupId, setMassMailGroupId] = useState('');
    const [massMailTitle, setMassMailTitle] = useState('');
    const [massMailMessage, setMassMailMessage] = useState('');
    const [massMailSending, setMassMailSending] = useState(false);

    // Staff Creation State
    const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffEmail, setNewStaffEmail] = useState('');
    const [newStaffPhone, setNewStaffPhone] = useState('');
    const [newStaffRole, setNewStaffRole] = useState<'director' | 'admin' | 'coach' | 'developer'>('admin');
    const [newStaffPassword, setNewStaffPassword] = useState('');
    const [isCreatingStaff, setIsCreatingStaff] = useState(false);

    // Staff Creation Success Summary Modal State
    const [staffSuccessData, setStaffSuccessData] = useState<{
        name: string;
        email: string;
        role: string;
        password: string;
    } | null>(null);
    const [isCopiedStaffData, setIsCopiedStaffData] = useState(false);

    const generateTempPassword = () => {
        const rand = Math.floor(1000 + Math.random() * 9000);
        return `Sparta-${rand}`;
    };

    const handleOpenCreateStaffModal = () => {
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPhone('');
        const actorRole = (userProfile?.role || '').toLowerCase();
        const canAssignHigh = ['director', 'developer', 'dev'].includes(actorRole);
        setNewStaffRole(canAssignHigh ? 'admin' : 'coach');
        setNewStaffPassword(generateTempPassword());
        setIsCreateStaffModalOpen(true);
    };

    const handleCreateStaff = async () => {
        if (!newStaffName.trim() || !newStaffEmail.trim()) {
            alert("Пожалуйста, заполните ФИО и Email сотрудника");
            return;
        }

        setIsCreatingStaff(true);
        const cleanEmail = newStaffEmail.trim().toLowerCase();
        const activePassword = newStaffPassword.trim() || generateTempPassword();

        try {
            // Safe Upsert: Match existing user doc by email or generate a new staff ID
            const existingUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
            const staffId = existingUser ? existingUser.id : `staff_${Date.now()}`;

            const nameParts = newStaffName.trim().split(' ');
            const firstName = nameParts[0] || newStaffName;
            const lastName = nameParts.slice(1).join(' ') || '';

            const newStaffDoc: any = {
                id: staffId,
                email: cleanEmail,
                firstName,
                lastName,
                childName: newStaffName.trim(),
                displayName: newStaffName.trim(),
                parentPhone: newStaffPhone.trim(),
                role: newStaffRole,
                isStaff: true,
                isAdmin: ['admin', 'director', 'developer'].includes(newStaffRole),
                status: 'active',
                tempPassword: activePassword,
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, "users", staffId), newStaffDoc, { merge: true });

            // Optimistically update local users state
            setUsers(prev => {
                const exists = prev.some(u => u.id === staffId || u.email?.toLowerCase() === cleanEmail);
                if (exists) {
                    return prev.map(u => (u.id === staffId || u.email?.toLowerCase() === cleanEmail) ? { ...u, ...newStaffDoc } : u);
                }
                return [newStaffDoc, ...prev];
            });

            const roleLabels: Record<string, string> = {
                admin: 'Администратор',
                director: 'Директор',
                coach: 'Тренер',
                developer: 'Разработчик'
            };

            // Reset form & close creation modal, show success card modal
            setNewStaffName('');
            setNewStaffEmail('');
            setNewStaffPhone('');
            setNewStaffRole('admin');
            setNewStaffPassword('');
            setIsCreateStaffModalOpen(false);
            setActiveRoleTab('staff');

            setStaffSuccessData({
                name: newStaffName.trim(),
                email: cleanEmail,
                role: roleLabels[newStaffRole] || newStaffRole,
                password: activePassword
            });
        } catch (error: any) {
            console.error("Staff Creation Error:", error);
            alert("Ошибка при создании сотрудника: " + (error?.message || "неизвестная ошибка"));
        } finally {
            setIsCreatingStaff(false);
        }
    };

    const handleCopyStaffCredentials = () => {
        if (!staffSuccessData) return;
        const textToCopy = `Привет! Тебе создан доступ в CRM SPARTA.\nЛогин: ${staffSuccessData.email}\nПароль: ${staffSuccessData.password}\nСсылка для входа: http://localhost:3000/login`;
        navigator.clipboard.writeText(textToCopy);
        setIsCopiedStaffData(true);
        setTimeout(() => setIsCopiedStaffData(false), 3000);
    };

    const fetchDirections = () => {
        return onSnapshot(collection(db, "directions"), (snapshot) => {
            setDirections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Error fetching directions:", error);
        });
    };

    const fetchCoaches = () => {
        return onSnapshot(collection(db, "coaches"), (snapshot) => {
            let loadedCoaches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            loadedCoaches = loadedCoaches.filter((c: any) => !c.hideFromSelection && !/Лариса|Ксения|Аксинья/i.test(c.name || ''));
            loadedCoaches.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
            setCoaches(loadedCoaches);
        });
    };

    const fetchUsers = () => {
        setLoading(true);
        // CRITICAL FIX: Removed orderBy("createdAt") to ensure 100% visibility of all documents.
        // documents missing the field would be hidden otherwise.
        const q = query(collection(db, "users"));
        return onSnapshot(q, (snapshot) => {
            const loadedUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as UserItem));
            setUsers(loadedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setLoading(false);
        });
    };

    const fetchRegistry = () => {
        return onSnapshot(collection(db, "pending_students"), (snapshot) => {
            const pendingList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(p => p.status === 'pending');
            setRegistry(pendingList);
        }, (error) => {
            console.error("Error fetching pending_students:", error);
        });
    };

    const { id: urlUserId } = useParams();

    useEffect(() => {
        const unsubUsers = fetchUsers();
        const unsubGroups = fetchGroups();
        const unsubDirections = fetchDirections();
        const unsubCoaches = fetchCoaches();
        const unsubRegistry = fetchRegistry();
        return () => {
            unsubUsers();
            unsubGroups();
            unsubDirections();
            unsubCoaches();
            unsubRegistry();
        };
    }, []);

    // Effect to handle URL-based user selection
    useEffect(() => {
        if (urlUserId && users.length > 0 && !isSubModalOpen) {
            const user = users.find(u => u.id === urlUserId);
            if (user) {
                openSubModal(user);
            }
        }
    }, [urlUserId, users.length]);

    // Real-time listener for modal data
    useEffect(() => {
        if (!isSubModalOpen || !selectedUserForSub?.id) {
            setUserRequests([]);
            setUserOrders([]);
            setUserPromoActivations([]);
            return;
        }

        // 1. Listen for profile changes
        const unsubProfile = onSnapshot(doc(db, "users", selectedUserForSub.id), (snap) => {
            if (snap.exists()) {
                setSelectedUserForSub({ id: snap.id, ...snap.data() } as UserItem);
            }
        }, (error) => {
            console.error("AdminUsers Profile Error:", error);
        });

        const qReq = query(collection(db, "requests"), where("userId", "==", selectedUserForSub.id));
        const unsubReq = onSnapshot(qReq, (snap) => {
            console.log(`AdminUsers: Fetched ${snap.size} requests for user.`);
            setUserRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("AdminUsers Requests Error:", error);
        });

        // 3. Listen for orders (by email, which is how orders are stored)
        const userEmail = selectedUserForSub.email;
        let unsubOrd = () => { };
        if (userEmail) {
            const qOrd = query(collection(db, "orders"), where("email", "==", userEmail));
            unsubOrd = onSnapshot(qOrd, (snap) => {
                setUserOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, (error) => {
                console.error("AdminUsers Orders Error:", error);
            });
        }

        // 4. Listen for promo activations
        const qPromo = query(collection(db, "promo_activations"), where("userId", "==", selectedUserForSub.id));
        const unsubPromo = onSnapshot(qPromo, (snap) => {
            setUserPromoActivations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("AdminUsers Promo Error:", error);
        });

        return () => {
            unsubProfile();
            unsubReq();
            unsubOrd();
            unsubPromo();
        };
    }, [isSubModalOpen, selectedUserForSub?.id]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleAdminRole = async (userId: string, currentRole: string) => {
        try {
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            await setDoc(doc(db, "users", userId), { role: newRole }, { merge: true });
        } catch (error) {
            console.error("Save user error (toggleAdminRole):", error);
            alert("Не удалось изменить роль");
        }
    };

    const toggleSoftDelete = async (userId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'deleted' ? 'active' : 'deleted';
            await setDoc(doc(db, "users", userId), { status: newStatus }, { merge: true });
        } catch (error) {
            console.error("Save user error (toggleSoftDelete):", error);
            alert("Не удалось изменить статус");
        }
    };

    // Helper to check if user is online (active in last 5 mins)
    const isOnline = (lastActive: any) => {
        if (!lastActive) return false;
        const lastActiveMillis = lastActive.seconds ? lastActive.seconds * 1000 : lastActive;
        const fiveMinutes = 5 * 60 * 1000;
        return (Date.now() - lastActiveMillis) < fiveMinutes;
    };

    const handleDeleteUser = async (targetUser: any) => {
        const actor = userProfile;
        if (!canDeleteUser(actor, targetUser)) {
            alert(`Недостаточно прав для удаления пользователя ${targetUser.childName || targetUser.displayName || targetUser.email}!`);
            return;
        }

        if (!confirm(`ВНИМАНИЕ: Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ пользователя ${targetUser.childName || targetUser.email || targetUser.childFullName || targetUser.id}? Это действие необратимо и удалит все данные из базы.`)) return;

        try {
            await deleteDoc(doc(db, "users", targetUser.id)).catch(() => {});
            await deleteDoc(doc(db, "pending_students", targetUser.id)).catch(() => {});
            await deleteDoc(doc(db, "student_registry", targetUser.id)).catch(() => {});

            // Query & purge matching pending_students documents by childFullName or parentPhone
            const targetName = (targetUser.childFullName || targetUser.childName || targetUser.name || '').trim();
            const targetPhone = targetUser.parentPhone ? targetUser.parentPhone.replace(/\D/g, '') : (targetUser.phone ? targetUser.phone.replace(/\D/g, '') : '');

            if (targetName || targetPhone) {
                const pendingRef = collection(db, 'pending_students');
                const pSnap = await getDocs(pendingRef);
                for (const d of pSnap.docs) {
                    const pData = d.data();
                    const pName = (pData.childFullName || pData.childName || '').trim();
                    const pPhone = pData.parentPhone ? pData.parentPhone.replace(/\D/g, '') : '';
                    if ((targetName && pName.toLowerCase() === targetName.toLowerCase()) || (targetPhone && pPhone === targetPhone)) {
                        await deleteDoc(doc(db, 'pending_students', d.id)).catch(() => {});
                    }
                }
            }

            // Clear local state arrays immediately
            setUsers(prev => prev.filter(u => u.id !== targetUser.id));
            setRegistry(prev => prev.filter(r => r.id !== targetUser.id && (targetName ? (r.childFullName || '').trim().toLowerCase() !== targetName.toLowerCase() : true)));

            // Purge local storage / session storage caches
            try {
                localStorage.removeItem('sparta_excel_import_queue');
                localStorage.removeItem('pending_import_students');
                sessionStorage.removeItem('sparta_excel_import_queue');
            } catch (e) {}

            alert("Пользователь полностью удален из системы");
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Ошибка при удалении пользователя");
        }
    };

    const handleClearAllPendingRegistry = async () => {
        if (!confirm("ВНИМАНИЕ: Вы уверены, что хотите ПОЛНОСТЬЮ ОЧИСТИТЬ ВЕСЬ РЕЕСТР ОЖИДАНИЯ? Это удалит абсолютно все записи из pending_students и сбросит счетчик в 0. Это действие необратимо!")) {
            return;
        }

        setLoading(true);
        try {
            const pendingSnap = await getDocs(collection(db, "pending_students"));
            const batchSize = 400;
            let currentBatch = writeBatch(db);
            let count = 0;

            for (const d of pendingSnap.docs) {
                currentBatch.delete(doc(db, "pending_students", d.id));
                count++;
                if (count % batchSize === 0) {
                    await currentBatch.commit();
                    currentBatch = writeBatch(db);
                }
            }
            if (count % batchSize !== 0) {
                await currentBatch.commit();
            }

            // Also clear legacy student_registry
            const regSnap = await getDocs(collection(db, "student_registry"));
            let regBatch = writeBatch(db);
            let regCount = 0;
            for (const r of regSnap.docs) {
                regBatch.delete(doc(db, "student_registry", r.id));
                regCount++;
                if (regCount % batchSize === 0) {
                    await regBatch.commit();
                    regBatch = writeBatch(db);
                }
            }
            if (regCount % batchSize !== 0) {
                await regBatch.commit();
            }

            // Purge local storage and session storage caches
            try {
                localStorage.removeItem('sparta_excel_import_queue');
                localStorage.removeItem('pending_import_students');
                sessionStorage.removeItem('sparta_excel_import_queue');
            } catch (e) {}

            setRegistry([]);
            alert(`Реестр полностью очищен! Удалено записей: ${count}`);
        } catch (error: any) {
            console.error("Clear pending error:", error);
            alert("Ошибка при очистке реестра: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCleanupUnnamedUsers = async () => {
        const unnamed = users.filter(u => !(u.childName?.trim()) && !(u.displayName?.trim()) && u.role === 'user' && !isProtectedUser(u));
        if (unnamed.length === 0) {
            alert("Все пользователи имеют имена. Чистка не требуется.");
            return;
        }

        if (!confirm(`Вы собираетесь УДАЛИТЬ ${unnamed.length} аккаунтов без имен. Это пользователи, которые не завершили регистрацию. Продолжить?`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            unnamed.forEach(u => {
                batch.delete(doc(db, "users", u.id));
            });
            await batch.commit();
            alert(`Успешно удалено ${unnamed.length} пустых аккаунтов`);
        } catch (error) {
            console.error("Cleanup error:", error);
            alert("Ошибка при очистке");
        } finally {
            setLoading(false);
        }
    };

    // Helper to identify "Real" registered students (strictly requiring email)
    const isCompleteProfile = (u: any) => {
        const hasName = (u.childName && u.childName.trim().length > 0) ||
            (u.displayName && u.displayName.trim().length > 0) ||
            (u.parentName && u.parentName.trim().length > 0) ||
            (u.firstName && u.firstName.trim().length > 0) ||
            (u.childFirstName && u.childFirstName.trim().length > 0);
        return hasName;
    };

    // Build set of registered student names & phones from active users array
    const activeStudentNames = new Set(
        users
            .map(u => (u.childName || u.displayName || u.name || `${u.childFirstName || ''} ${u.childLastName || ''}`).trim().toLowerCase())
            .filter(Boolean)
    );
    const activeParentPhones = new Set(
        users
            .map(u => (u.parentPhone || u.phone || '').replace(/\D/g, ''))
            .filter(p => p.length >= 7)
    );

    // Merge users and strictly UNCLAIMED/UNREGISTERED pending entries
    const unclaimedRegistry = registry.filter(r => {
        if (r.status === 'linked' || r.claimed || r.isClaimed || r.assignedUid || r.linkedParentId || r.linkedChildId) {
            return false;
        }
        const rName = (r.childFullName || `${r.childFirstName || ''} ${r.childLastName || ''}` || r.childName || r.originalName || '').trim().toLowerCase();
        const rPhone = (r.parentPhone || '').replace(/\D/g, '');

        const isNameMatched = Boolean(rName && activeStudentNames.has(rName));
        const isPhoneMatched = Boolean(rPhone && rPhone.length >= 7 && (activeParentPhones.has(rPhone) || (rPhone.length >= 10 && activeParentPhones.has(rPhone.slice(-10)))));

        // Exclude pending entry if active user account already exists
        return !isNameMatched && !isPhoneMatched;
    });

    // Merge users and unregistered pending entries for a unified "Users" view
    const allEntities = [
        ...users.map(u => ({ ...u, entityType: 'user' })),
        ...unclaimedRegistry.map(r => ({
            ...r,
            id: r.id,
            email: r.parentEmail || r.email || r.parentPhone || `pending_${r.id}`,
            displayName: r.childFullName || `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() || r.childName || r.originalName || 'Ученик',
            name: r.childFullName || `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() || r.childName || r.originalName || 'Ученик',
            childName: r.childFullName || `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() || r.childName || r.originalName || 'Ученик',
            childFullName: r.childFullName || `${r.childFirstName || ''} ${r.childLastName || ''}`.trim() || r.childName || r.originalName,
            childFirstName: r.childFirstName || '',
            childLastName: r.childLastName || '',
            parentName: r.parentName || '',
            parentPhone: r.parentPhone || r.phone || '',
            phone: r.parentPhone || r.phone || '',
            role: 'user' as UserRole,
            isPendingRegistration: true,
            entityType: 'registry' as const,
            groupId: r.groupId || r.targetGroupId,
            groupName: (r as any).groupName,
            status: 'pending' as any,
            createdAt: r.createdAt || r.importedAt,
            ban: null,
            verification: null,
            achievements: [],
            subscription: null
        } as UserItem))
    ];

    const isUserInGroup = (user: any, filterGroupId: string) => {
        if (!filterGroupId || filterGroupId === 'ALL') return true;
        if (filterGroupId === 'UNASSIGNED') {
            const gid = user.groupId || user.targetGroupId || user.group;
            return !gid || gid === '' || gid === 'none' || gid === 'Без группы';
        }
        const targetGroup = groups.find(g => g.id === filterGroupId);
        const targetGroupName = (targetGroup?.name || '').trim().toLowerCase();

        const uGroupId = (user.groupId || user.targetGroupId || user.group || '').trim();
        const uGroupName = (user.groupName || '').trim().toLowerCase();

        if (uGroupId === filterGroupId) return true;
        if (targetGroup && uGroupId === targetGroup.id) return true;
        if (targetGroupName) {
            if (uGroupId.toLowerCase() === targetGroupName) return true;
            if (uGroupName && uGroupName === targetGroupName) return true;
            if (uGroupName && targetGroupName.includes(uGroupName)) return true;
            if (uGroupId && targetGroupName.includes(uGroupId.toLowerCase())) return true;
        }
        return false;
    };

    // Filter & Sort
    const filteredUsers = allEntities
        .filter(user => {
            const searchLower = searchTerm.trim().toLowerCase();
            const matchesSearch = !searchLower || (
                (user.childName && user.childName.toLowerCase().includes(searchLower)) ||
                (user.childFullName && user.childFullName.toLowerCase().includes(searchLower)) ||
                (user.childFirstName && user.childFirstName.toLowerCase().includes(searchLower)) ||
                (user.childLastName && user.childLastName.toLowerCase().includes(searchLower)) ||
                (user.displayName && user.displayName.toLowerCase().includes(searchLower)) ||
                (user.name && user.name.toLowerCase().includes(searchLower)) ||
                (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
                (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
                (user.parentName && user.parentName.toLowerCase().includes(searchLower)) ||
                (user.email && user.email.toLowerCase().includes(searchLower)) ||
                (user.childBirthYear && user.childBirthYear.toString().includes(searchLower)) ||
                (user.parentPhone && user.parentPhone.includes(searchLower)) ||
                (user.phone && user.phone.includes(searchLower))
            );

            if (!matchesSearch) return false;

            // Group Filter logic
            if (!isUserInGroup(user, selectedGroupFilter)) return false;

            const roleLower = user.role?.toLowerCase() || 'user';
            const isStaffRole = ['admin', 'director', 'developer', 'trainer', 'coach', 'staff', 'dev'].includes(roleLower);
            const isStaff = isStaffRole || user.isStaff === true || user.isAdmin === true;
            const isComplete = isCompleteProfile(user);
            const isPendingUser = user.isPendingRegistration === true || (user as any).isPending === true || user.status === 'pending';

            if (activeRoleTab === 'all') return !isStaff;

            // Smart Categories logic
            if (activeRoleTab === 'students') return !isStaff && isComplete && !isPendingUser;
            if (activeRoleTab === 'incomplete') return !isStaff && !isComplete && !isPendingUser;
            if (activeRoleTab === 'staff') return isStaff;
            if (activeRoleTab === 'pending') return isPendingUser;
            if (activeRoleTab === 'expiring') return isSubscriptionExpiringSoon(user) && !isStaff && !isPendingUser;

            return true;
        })
        .sort((a, b) => {
            if (!sortConfig) {
                // Default sort: new first (handle missing createdAt)
                const timeA = getTimestampSeconds(a.createdAt);
                const timeB = getTimestampSeconds(b.createdAt);
                return timeB - timeA;
            }

            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Custom sorting for specific keys
            if (sortConfig.key === 'isOnline') {
                aValue = isOnline(a.lastActive) ? 1 : 0;
                bValue = isOnline(b.lastActive) ? 1 : 0;
            } else if (sortConfig.key === 'createdAt') {
                aValue = getTimestampSeconds(a.createdAt);
                bValue = getTimestampSeconds(b.createdAt);
            } else if (sortConfig.key === 'plan' || sortConfig.key === 'subscription') {
                const subA = a.subscription?.expiresAt || a.subscription?.endDate;
                const subB = b.subscription?.expiresAt || b.subscription?.endDate;
                aValue = getTimestampSeconds(subA);
                bValue = getTimestampSeconds(subB);
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const handleBulkDelete = async () => {
        const actor = userProfile;
        const allowedToDeleteIds = selectedUserIds.filter(id => {
            const targetUser = allEntities.find(u => u.id === id);
            return targetUser && canDeleteUser(actor, targetUser);
        });

        if (allowedToDeleteIds.length === 0) {
            alert("Ни один из выбранных аккаунтов не доступен для удаления с вашим уровнем прав.");
            return;
        }

        if (!confirm(`Вы уверены, что хотите ПОЛНОСТЬЮ УДАЛИТЬ ${allowedToDeleteIds.length} выбранных аккаунтов? Действие необратимо.`)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            allowedToDeleteIds.forEach(id => {
                batch.delete(doc(db, "users", id));
                batch.delete(doc(db, "student_registry", id));
            });
            await batch.commit();

            setUsers(prev => prev.filter(u => !allowedToDeleteIds.includes(u.id)));
            setRegistry(prev => prev.filter(r => !allowedToDeleteIds.includes(r.id)));
            setSelectedUserIds([]);
            alert(`Успешно удалено ${allowedToDeleteIds.length} пользователей из базы данных.`);
        } catch (error) {
            console.error("Error in bulk delete:", error);
            alert("Ошибка при массовом удалении из базы данных");
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = () => {
        return onSnapshot(collection(db, "groups"), (snapshot) => {
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Error fetching groups:", error);
        });
    };

    const handleQuickRenew = async (targetUser: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!targetUser || !targetUser.id) return;
        const currentExp = targetUser.subscription?.expiresAt || targetUser.subscription?.endDate;
        let baseMs = Date.now();
        if (currentExp) {
            const sec = getTimestampSeconds(currentExp);
            if (sec > 0 && sec * 1000 > Date.now()) {
                baseMs = sec * 1000;
            }
        }
        const newExpDate = new Date(baseMs + 30 * 24 * 60 * 60 * 1000);
        try {
            const updatedSub = {
                ...(targetUser.subscription || { title: 'Стандартный', status: 'active' }),
                status: 'active',
                expiresAt: Timestamp.fromDate(newExpDate),
                endDate: format(newExpDate, 'yyyy-MM-dd')
            };
            await updateDoc(doc(db, "users", targetUser.id), { subscription: updatedSub });
            setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, subscription: updatedSub } : u));
        } catch (err) {
            console.error("Quick renew error:", err);
            alert("Ошибка продления абонемента");
        }
    };

    const handleQuickRemind = async (targetUser: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!targetUser || !targetUser.id) return;
        try {
            await addDoc(collection(db, "notifications"), {
                userId: targetUser.id,
                email: targetUser.email || '',
                title: '⚠️ Напоминание об оплате',
                message: `Здравствуйте, ${targetUser.displayName || targetUser.childName || targetUser.firstName || 'клиент'}! Ваш абонемент (${targetUser.subscription?.title || targetUser.subscription?.planTitle || 'абонемент'}) истекает. Продлите его в личном кабинете, чтобы продолжить занятия!`,
                type: 'alert',
                isRead: false,
                createdAt: serverTimestamp()
            });
            setRemindedUserIds(prev => ({ ...prev, [targetUser.id]: true }));
            setTimeout(() => {
                setRemindedUserIds(prev => ({ ...prev, [targetUser.id]: false }));
            }, 3000);
        } catch (err) {
            console.error("Quick remind error:", err);
            alert("Ошибка при отправке напоминания");
        }
    };

    const handleBulkAssignGroup = async () => {
        if (selectedUserIds.length === 0 || !bulkSelectedGroupId) return;
        setIsSubmittingBulkGroup(true);
        try {
            const batch = writeBatch(db);
            const targetGroup = groups.find(g => g.id === bulkSelectedGroupId);

            selectedUserIds.forEach(id => {
                const isPending = registry.some(r => r.id === id);
                if (isPending) {
                    batch.update(doc(db, "pending_students", id), {
                        groupId: bulkSelectedGroupId,
                        groupName: targetGroup?.name || '',
                        updatedAt: serverTimestamp()
                    });
                } else {
                    batch.update(doc(db, "users", id), { groupId: bulkSelectedGroupId });
                }
            });
            await batch.commit();

            setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, groupId: bulkSelectedGroupId } : u));
            setRegistry(prev => prev.map(r => selectedUserIds.includes(r.id) ? { ...r, groupId: bulkSelectedGroupId, groupName: targetGroup?.name || '' } : r));
            setIsBulkGroupModalOpen(false);
            setBulkSelectedGroupId('');
            setSelectedUserIds([]);
            alert(`Группа успешно назначена для ${selectedUserIds.length} пользователей!`);
        } catch (error) {
            console.error("Error bulk assigning group:", error);
            alert("Ошибка при массовом назначении группы");
        } finally {
            setIsSubmittingBulkGroup(false);
        }
    };

    const handleAssignGroup = async () => {
        if (!selectedUserForGroup || !selectedGroupId) return;
        try {
            const isPending = selectedUserForGroup.isPendingRegistration || (selectedUserForGroup as any).entityType === 'registry';
            const targetGroup = groups.find(g => g.id === selectedGroupId);

            if (isPending) {
                await updateDoc(doc(db, "pending_students", selectedUserForGroup.id), {
                    groupId: selectedGroupId,
                    groupName: targetGroup?.name || '',
                    updatedAt: serverTimestamp()
                });
                setRegistry(prev => prev.map(r => r.id === selectedUserForGroup.id ? { ...r, groupId: selectedGroupId, groupName: targetGroup?.name || '' } : r));
            } else {
                await updateDoc(doc(db, "users", selectedUserForGroup.id), {
                    groupId: selectedGroupId,
                    groupName: targetGroup?.name || '',
                    updatedAt: serverTimestamp()
                });
                setUsers(users.map(u => u.id === selectedUserForGroup.id ? { ...u, groupId: selectedGroupId, groupName: targetGroup?.name || '' } : u));
            }

            setIsGroupModalOpen(false);
            setSelectedUserForGroup(null);
            setSelectedGroupId('');
        } catch (error) {
            console.error("Error assigning group:", error);
            alert("Ошибка при назначении группы");
        }
    };

    const handleSyncDatabase = async () => {
        setIsSyncing(true);
        try {
            const pendingSnap = await getDocs(collection(db, "pending_students"));
            const usersSnap = await getDocs(collection(db, "users"));

            const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            const allPending = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            let linkedCount = 0;
            let batch = writeBatch(db);
            let opCount = 0;

            const safeBatchCommit = async () => {
                if (opCount > 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            };

            for (const pending of allPending) {
                if (pending.status === 'linked' && pending.assignedUid) continue;

                const pendingPhone = (pending.parentPhone || '').replace(/\D/g, '');
                const pendingName = (pending.childFullName || pending.childName || '').trim().toLowerCase();

                const matchedUser = allUsers.find(u => {
                    const uPhone = (u.parentPhone || u.phone || '').replace(/\D/g, '');
                    const uName = (u.childName || u.displayName || `${u.childFirstName || ''} ${u.childLastName || ''}`).trim().toLowerCase();

                    const isPhoneMatch = pendingPhone.length >= 10 && uPhone.length >= 10 && (pendingPhone.endsWith(uPhone.slice(-10)) || uPhone.endsWith(pendingPhone.slice(-10)));
                    const isNameMatch = Boolean(pendingName && uName && pendingName === uName);

                    return isPhoneMatch || isNameMatch;
                });

                if (matchedUser) {
                    const targetGroupId = pending.groupId || pending.targetGroupId;
                    const updateUserData: any = {};
                    if (targetGroupId && (!matchedUser.groupId || matchedUser.groupId === 'none')) {
                        updateUserData.groupId = targetGroupId;
                        const targetGrp = groups.find(g => g.id === targetGroupId);
                        if (targetGrp) updateUserData.groupName = targetGrp.name;
                    }
                    if (!matchedUser.childName && pending.childFullName) {
                        updateUserData.childName = pending.childFullName;
                    }
                    if ((!matchedUser.childAge || matchedUser.childAge === 0) && pending.childAge) {
                        updateUserData.childAge = pending.childAge;
                    }

                    if (Object.keys(updateUserData).length > 0) {
                        updateUserData.updatedAt = serverTimestamp();
                        batch.update(doc(db, "users", matchedUser.id), updateUserData);
                        opCount++;
                    }

                    batch.update(doc(db, "pending_students", pending.id), {
                        status: 'linked',
                        linkedUserId: matchedUser.id,
                        assignedUid: matchedUser.id,
                        linkedAt: serverTimestamp()
                    });
                    opCount++;
                    linkedCount++;

                    if (opCount >= 350) {
                        await safeBatchCommit();
                    }
                }
            }

            await safeBatchCommit();
            alert(`✅ Синхронизация завершена!\n\nАвтоматически связано учеников: ${linkedCount}\nБаза групп и пользователей актуализирована.`);
        } catch (err: any) {
            console.error("Sync error in AdminUsers:", err);
            alert("Ошибка синхронизации: " + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const openGroupModal = (user: any) => {
        setSelectedUserForGroup(user);
        setSelectedGroupId(user.groupId || '');
        setIsGroupModalOpen(true);
    };

    // ... (rest of search/sort logic)

    // Helper to get group name
    const getGroupName = (groupId: string) => {
        return groups.find(g => g.id === groupId)?.name || 'Неизвестная группа';
    };

    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [selectedUserForBan, setSelectedUserForBan] = useState<any>(null);
    const [banType, setBanType] = useState<'account' | 'device' | 'ip'>('account');
    const [banDuration, setBanDuration] = useState<number | null>(3 * 24 * 60 * 60 * 1000); // Default 3 days
    const [banReason, setBanReason] = useState('');

    const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
    const [selectedUserForAchievements, setSelectedUserForAchievements] = useState<any>(null);
    const [availableAchievements, setAvailableAchievements] = useState<any[]>([]);
    const [selectedAchievementId, setSelectedAchievementId] = useState<string>('');
    const [grantingAchievement, setGrantingAchievement] = useState(false);

    // Fetch master achievements list in real-time
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'achievements'), (snap) => {
            setAvailableAchievements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error("Error fetching achievements list:", error);
        });
        return () => unsubscribe();
    }, []);

    // ... existing sort/filter logic ...

    const handleBanUser = async () => {
        if (!selectedUserForBan) return;

        const now = Date.now();
        const expiresAt = banDuration ? now + banDuration : null;

        const banDetails = {
            isBanned: true,
            type: banType,
            reason: banReason,
            expiresAt: expiresAt,
            bannedAt: now,
            bannedBy: 'admin',
        };

        try {
            // 1. Update the user document (Account Ban always applies)
            await updateDoc(doc(db, "users", selectedUserForBan.id), { ban: banDetails });

            // 2. Handle Device Ban
            if (banType === 'device') {
                if (selectedUserForBan.lastDeviceId) {
                    await setDoc(doc(db, "banned_devices", selectedUserForBan.lastDeviceId), banDetails);
                } else {
                    alert("Внимание: У этого пользователя нет сохраненного ID устройства. Бан будет действовать только на аккаунт.");
                }
            }

            // 3. Handle IP Ban
            if (banType === 'ip') {
                if (selectedUserForBan.lastIp) {
                    await setDoc(doc(db, "banned_ips", selectedUserForBan.lastIp.replace(/\./g, '_')), banDetails);
                } else {
                    alert("Внимание: У этого пользователя нет сохраненного IP. Бан будет действовать только на аккаунт.");
                }
            }

            setUsers(users.map(u => u.id === selectedUserForBan.id ? { ...u, ban: banDetails } : u));
            setIsBanModalOpen(false);
            setBanReason('');
            setBanDuration(3 * 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error("Error banning user:", error);
            alert("Ошибка при бане пользователя");
        }
    };

    const handleUnbanUser = async (user: any) => {
        if (!confirm(`Разблокировать пользователя ${user.childName}? Это также удалит связанные баны по IP и устройству.`)) return;

        try {
            const batch = writeBatch(db);

            // 1. Unban User Account
            const userRef = doc(db, "users", user.id);
            batch.update(userRef, { ban: null });

            // 2. Find and Delete associated IP Bans (Chain Banned)
            const ipBansQuery = query(collection(db, "banned_ips"), where("originalUser", "==", user.id));
            const ipBansSnap = await getDocs(ipBansQuery);
            ipBansSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 3. Find and Delete associated Device Bans (Chain Banned)
            const deviceBansQuery = query(collection(db, "banned_devices"), where("originalUser", "==", user.id));
            const deviceBansSnap = await getDocs(deviceBansQuery);
            deviceBansSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 4. Also try to delete by current known IP/Device (Legacy/Direct bans)
            if (user.lastIp) {
                const legacyIpRef = doc(db, "banned_ips", user.lastIp.replace(/\./g, '_'));
                batch.delete(legacyIpRef);
            }
            if (user.lastDeviceId) {
                const legacyDeviceRef = doc(db, "banned_devices", user.lastDeviceId);
                batch.delete(legacyDeviceRef);
            }

            await batch.commit();

            setUsers(users.map(u => u.id === user.id ? { ...u, ban: null } : u));
            alert(`Пользователь ${user.childName} разблокирован.Связанные ограничения(IP / Устройство) сняты.`);
        } catch (error) {
            console.error("Error unbanning user:", error);
            alert("Ошибка при разблокировке");
        }
    };

    // --- SHOP ORDERS LOGIC ---
    const openShopOrdersModal = async (user: any) => {
        setSelectedUserForShopOrders(user);
        setIsShopOrdersModalOpen(true);
        setLoadingShopOrders(true);
        try {
            // Check both userId and email just in case
            const q = query(collection(db, "shop_orders"), where("buyerEmail", "==", user.email), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setShopOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching shop orders:", e);
            // Fallback try without orderBy if index is missing
            try {
                const q2 = query(collection(db, "shop_orders"), where("buyerEmail", "==", user.email));
                const snap2 = await getDocs(q2);
                setShopOrders(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e2) {
                console.error("Fallback failed:", e2);
            }
        }
        setLoadingShopOrders(false);
    };

    // --- ACHIEVEMENTS LOGIC EXTENDED ---
    const handleGrantAchievement = async () => {
        if (!selectedUserForAchievements || !selectedAchievementId) return;
        setGrantingAchievement(true);
        try {
            const achToGrant = availableAchievements.find(a => a.id === selectedAchievementId);
            if (!achToGrant) throw new Error("Achievement not found");

            const newAchievement = {
                id: achToGrant.id,
                title: achToGrant.title,
                description: achToGrant.description || '',
                date: new Date().toISOString()
            };

            const userRef = doc(db, "users", selectedUserForAchievements.id);
            const currentAchievements = selectedUserForAchievements.achievements || [];

            // Check if already has it
            if (currentAchievements.some((a: any) => a.id === newAchievement.id)) {
                alert("У пользователя уже есть эта награда!");
                setGrantingAchievement(false);
                return;
            }

            const updatedAchievements = [...currentAchievements, newAchievement];

            await updateDoc(userRef, { achievements: updatedAchievements });

            // Send notification
            if (selectedUserForAchievements.email) {
                await addDoc(collection(db, "notifications"), {
                    userId: selectedUserForAchievements.id,
                    email: selectedUserForAchievements.email,
                    title: "Новая награда! 🏆",
                    message: `Поздравляем! Администратор выдал вам новую награду: ${newAchievement.title} `,
                    isRead: false,
                    type: 'system',
                    createdAt: serverTimestamp()
                });
            }

            const updatedUser = { ...selectedUserForAchievements, achievements: updatedAchievements };
            setSelectedUserForAchievements(updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            setSelectedAchievementId('');
            alert('Награда успешно выдана!');

        } catch (error) {
            console.error("Error granting:", error);
            alert("Ошибка при выдаче награды");
        }
        setGrantingAchievement(false);
    };

    // Revocation Logic
    const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);
    const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
    const [revokeReason, setRevokeReason] = useState('');

    const confirmRevoke = (achievementId: string) => {
        setRevokeTargetId(achievementId);
        setRevokeReason('');
        setIsRevokeConfirmOpen(true);
    };

    const handleRevokeAchievement = async () => {
        if (!selectedUserForAchievements || !revokeTargetId) return;

        try {
            const batch = writeBatch(db);
            const userRef = doc(db, "users", selectedUserForAchievements.id);

            const currentAchievements = selectedUserForAchievements.achievements || [];
            const updatedAchievements = currentAchievements.filter((a: any) => a.id !== revokeTargetId);

            batch.update(userRef, { achievements: updatedAchievements });

            // Notification
            if (revokeReason.trim() && selectedUserForAchievements.email) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: selectedUserForAchievements.id,
                    email: selectedUserForAchievements.email,
                    title: "Награда отозвана 😔",
                    message: `Ваша награда была отозвана администратором.Причина: ${revokeReason} `,
                    isRead: false,
                    type: 'alert',
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();

            // Update UI
            const updatedUser = { ...selectedUserForAchievements, achievements: updatedAchievements };
            setSelectedUserForAchievements(updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));

            setIsRevokeConfirmOpen(false);
            setRevokeTargetId(null);
            setRevokeReason('');

        } catch (error) {
            console.error("Error revoking:", error);
            alert("Ошибка при отзыве награды");
        }
    };

    const openBanModal = (user: any) => {
        setSelectedUserForBan(user);
        setIsBanModalOpen(true);
    };

    const openAchievementsModal = (user: any) => {
        setSelectedUserForAchievements(user);
        setIsAchievementsModalOpen(true);
    };


    const openSubModal = (user: any, initialTab: 'plan' | 'stats' = 'plan') => {
        setSelectedUserForSub(user);
        setSubPlanId(user.subscription?.planId || '');
        setSubEndDate(user.subscription?.expiresAt ? format(new Date(user.subscription.expiresAt.seconds * 1000), 'yyyy-MM-dd') : '');
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setChildName(user.childName || '');
        setChildAge(user.childAge || '');
        setChildBirthYear(user.childBirthYear || '');
        setParentPhone(user.parentPhone || '');
        setAdminNotes(user.adminNotes || '');
        setSubModalTab(initialTab);
        setIsSubModalOpen(true);
    };

    const handleUpdateSubscription = async () => {
        if (!selectedUserForSub) return;
        if (subPlanId && !subEndDate) {
            alert("Пожалуйста, выберите дату окончания подписки");
            return;
        }

        try {
            const plan = directions.find(d => d.id === subPlanId);
            const userRef = doc(db, "users", selectedUserForSub.id);

            const expiresAt = subEndDate ? Timestamp.fromDate(new Date(subEndDate)) : null;

            const subscription = subPlanId ? {
                planId: subPlanId,
                title: plan?.title || 'Индивидуальный план',
                expiresAt: expiresAt,
                status: 'active' as UserStatus
            } : null;

            await setDoc(userRef, {
                subscription,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                childName: childName.trim(),
                childAge,
                childBirthYear,
                parentPhone: parentPhone.trim(),
                adminNotes
            }, { merge: true });

            setUsers(prevUsers => prevUsers.map(u => u.id === selectedUserForSub.id ? {
                ...u,
                subscription,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                childName: childName.trim(),
                childAge,
                childBirthYear,
                parentPhone: parentPhone.trim(),
                adminNotes
            } : u));

            setIsSubModalOpen(false);
            alert("Данные пользователя успешно сохранены");
        } catch (error) {
            console.error("Save user error (handleUpdateSubscription):", error);
            alert("Ошибка при сохранении данных");
        }
    };


    const openVerifyModal = (user: any) => {
        setSelectedUserForVerify(user);
        setVerifyRole(user.role || 'user');
        setVerifyCustom(!!user.verification?.isVerified);
        setVerifyTitle(user.verification?.title || '');
        setVerifyDescription(user.verification?.description || '');
        setSelectedCoachId(user.coachId || '');
        setIsVerifyModalOpen(true);
    };

    const handleUpdateVerification = async () => {
        if (!selectedUserForVerify) return;

        try {
            const userRef = doc(db, "users", selectedUserForVerify.id);
            const verificationData = verifyCustom ? {
                isVerified: true,
                title: verifyTitle.trim(),
                description: verifyDescription.trim()
            } : null;

            // Safety Check: Only Directors/Developers can assign Director/Developer roles
            const isTargetingHighRole = ['director', 'developer'].includes(verifyRole);
            if (isTargetingHighRole && !isSuperUser) {
                alert("У вас недостаточно прав для назначения этой роли");
                return;
            }

            await setDoc(userRef, {
                role: verifyRole,
                verification: verificationData,
                coachId: verifyRole === 'trainer' ? selectedCoachId : null,
                // Synchronize Staff Flag
                isStaff: ['admin', 'director', 'developer', 'trainer'].includes(verifyRole)
            }, { merge: true });

            setIsVerifyModalOpen(false);
            alert("Статус аккаунта и верификация сохранены");
        } catch (error) {
            console.error("Save user error (handleUpdateVerification):", error);
            alert("Ошибка при сохранении статуса");
        }
    };

    const handleRevokeSubscription = async () => {
        if (!selectedUserForSub) return;
        if (!confirm('Аннулировать план пользователя?')) return;

        try {
            const userRef = doc(db, "users", selectedUserForSub.id);
            await updateDoc(userRef, {
                subscription: null
            });

            // selectedUserForSub is still needed for modal UI consistency if not closing
            setSelectedUserForSub({ ...selectedUserForSub, subscription: null });
            setSubPlanId('');
            setSubEndDate('');
            alert("Подписка отозвана");
        } catch (error) {
            console.error("Error revoking sub:", error);
            alert("Ошибка при отзыве подписки");
        }
    };

    const handleToggleFreeze = async () => {
        if (!selectedUserForSub || !selectedUserForSub.subscription) return;

        try {
            const userRef = doc(db, "users", selectedUserForSub.id);
            const newStatus = selectedUserForSub.subscription.status === 'frozen' ? 'active' : 'frozen';

            // Read freeze duration from system settings
            let freezeDays = 7;
            try {
                const sysSnap = await getDoc(doc(db, 'settings', 'system'));
                if (sysSnap.exists() && sysSnap.data().freezeDays) {
                    freezeDays = sysSnap.data().freezeDays;
                }
            } catch (_) { /* fallback to 7 */ }

            const updateData: any = { "subscription.status": newStatus };
            if (newStatus === 'frozen') {
                const frozenUntil = new Date();
                frozenUntil.setDate(frozenUntil.getDate() + freezeDays);
                updateData["subscription.frozenUntil"] = Timestamp.fromDate(frozenUntil);
            } else {
                updateData["subscription.frozenUntil"] = null;
            }

            await updateDoc(userRef, updateData);

            const updatedSub = {
                ...selectedUserForSub.subscription,
                status: newStatus as UserStatus,
                frozenUntil: newStatus === 'frozen' ? updateData["subscription.frozenUntil"] : null
            };

            setUsers(users.map(u => u.id === selectedUserForSub.id ? { ...u, subscription: updatedSub } : u));
            setSelectedUserForSub({ ...selectedUserForSub, subscription: updatedSub });
            alert(newStatus === 'frozen' ? `Абонемент заморожен на ${freezeDays} дней` : "Абонемент разморожен");
        } catch (error) {
            console.error("Error toggling freeze:", error);
        }
    };

    const fetchUserOrders = async (user: any) => {
        setSelectedUserForSub(user);
        setLoadingOrders(true);
        setIsHistoryModalOpen(true);
        try {
            const q = query(collection(db, "orders"), where("email", "==", user.email), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            setUserOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const fetchUserFinanceData = async (user: any) => {
        if (!user) return;
        setLoadingOrders(true);
        try {
            // 1. Fetch Orders & Top-ups
            const qOrders = query(collection(db, "orders"), where("email", "==", user.email), orderBy("date", "desc"));
            const orderSnap = await getDocs(qOrders);
            const orders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserOrders(orders);

            // 2. Fetch Promo Activations
            const qPromos = query(collection(db, "promo_activations"), where("userId", "==", user.id), orderBy("timestamp", "desc"));
            const promoSnap = await getDocs(qPromos);
            setUserPromoActivations(promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error("Error fetching finance data:", error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleUpdateBalance = async (type: 'set' | 'add' | 'subtract') => {
        if (!selectedUserForSub || !balanceAdjustment) return;
        const amount = parseFloat(balanceAdjustment);
        if (isNaN(amount) || amount < 0) {
            alert("Введите корректную сумму");
            return;
        }

        setIsAdjustingBalance(true);
        try {
            const userRef = doc(db, "users", selectedUserForSub.id);
            const currentBalance = selectedUserForSub.walletBalance || 0;

            let newBalance = currentBalance;
            if (type === 'set') newBalance = amount;
            if (type === 'add') newBalance = currentBalance + amount;
            if (type === 'subtract') newBalance = Math.max(0, currentBalance - amount);

            await updateDoc(userRef, {
                walletBalance: newBalance
            });

            // Update local state for immediate feedback
            const updatedUser = { ...selectedUserForSub, walletBalance: newBalance };
            setSelectedUserForSub(updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            setBalanceAdjustment('');
            alert("Баланс обновлен");
        } catch (error) {
            console.error("Error updating balance:", error);
            alert("Ошибка при обновлении баланса");
        } finally {
            setIsAdjustingBalance(false);
        }
    };

    const handleUpdateRewards = async () => {
        if (!selectedUserForSub || !rewardAmount) return;
        const val = parseInt(rewardAmount, 10);
        if (isNaN(val) || val < 0) {
            alert("Введите корректное число");
            return;
        }

        setIsAdjustingRewards(true);
        try {
            const userRef = doc(db, "users", selectedUserForSub.id);
            const currentCoins = Number((selectedUserForSub as any).coins ?? (selectedUserForSub as any).stats?.coins ?? 0);
            const currentXp = Number((selectedUserForSub as any).xp ?? (selectedUserForSub as any).stats?.xp ?? 0);

            let newCoins = currentCoins;
            let newXp = currentXp;
            let delta = 0;

            if (rewardCurrency === 'coins') {
                if (rewardMode === 'set') {
                    newCoins = val;
                    delta = newCoins - currentCoins;
                } else if (rewardMode === 'add') {
                    newCoins = currentCoins + val;
                    delta = val;
                } else if (rewardMode === 'subtract') {
                    newCoins = Math.max(0, currentCoins - val);
                    delta = -(currentCoins - newCoins);
                }

                await updateDoc(userRef, {
                    coins: newCoins,
                    "stats.coins": newCoins
                });

                try {
                    await updateDoc(doc(db, "students", selectedUserForSub.id), {
                        coins: newCoins,
                        "stats.coins": newCoins
                    });
                } catch {}

            } else {
                if (rewardMode === 'set') {
                    newXp = val;
                    delta = newXp - currentXp;
                } else if (rewardMode === 'add') {
                    newXp = currentXp + val;
                    delta = val;
                } else if (rewardMode === 'subtract') {
                    newXp = Math.max(0, currentXp - val);
                    delta = -(currentXp - newXp);
                }

                await updateDoc(userRef, {
                    xp: newXp,
                    "stats.xp": newXp
                });

                try {
                    await updateDoc(doc(db, "students", selectedUserForSub.id), {
                        xp: newXp,
                        "stats.xp": newXp
                    });
                } catch {}
            }

            // Write transaction log to users/{userId}/coin_history
            await addDoc(collection(db, "users", selectedUserForSub.id, "coin_history"), {
                currency: rewardCurrency,
                mode: rewardMode,
                amount: val,
                delta: delta,
                previousBalance: rewardCurrency === 'coins' ? currentCoins : currentXp,
                newBalance: rewardCurrency === 'coins' ? newCoins : newXp,
                reason: rewardReason.trim() || 'Ручная корректировка администратором',
                adminId: userProfile?.id || (userProfile as any)?.uid || 'admin',
                adminName: userProfile?.displayName || userProfile?.name || 'Администратор',
                type: 'manual_adjust',
                createdAt: serverTimestamp()
            });

            // Update local state for immediate feedback
            const updatedUser: any = {
                ...selectedUserForSub,
                coins: newCoins,
                xp: newXp,
                stats: {
                    ...(selectedUserForSub as any).stats,
                    coins: newCoins,
                    xp: newXp
                }
            };
            setSelectedUserForSub(updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            setRewardAmount('');
            setRewardReason('');
            alert(`Успешно обновлено: ${rewardCurrency === 'coins' ? `${newCoins} 🟡 монет` : `${newXp} XP опыта`}`);
        } catch (error) {
            console.error("Error updating rewards:", error);
            alert("Ошибка при обновлении наградного баланса");
        } finally {
            setIsAdjustingRewards(false);
        }
    };

    const handleSendMassMail = async () => {
        if (!massMailTitle.trim() || !massMailMessage.trim()) {
            alert("Заполните тему и текст уведомления");
            return;
        }
        if (massMailTarget === 'group' && !massMailGroupId) {
            alert("Выберите группу для рассылки");
            return;
        }

        setMassMailSending(true);
        try {
            const batch = writeBatch(db);
            const notificationsRef = collection(db, "notifications");

            let targetUsers = users;
            if (massMailTarget === 'clients') {
                targetUsers = users.filter(u => u.role === 'user');
            } else if (massMailTarget === 'trainers') {
                targetUsers = users.filter(u => u.role === 'trainer');
            } else if (massMailTarget === 'group') {
                targetUsers = users.filter(u => u.groupId === massMailGroupId);
            }

            if (targetUsers.length === 0) {
                alert("Не найдено пользователей по заданным критериям");
                setMassMailSending(false);
                return;
            }

            let count = 0;
            targetUsers.forEach(user => {
                if (count >= 490) return; // limit for batch array
                const notifRef = doc(notificationsRef);
                batch.set(notifRef, {
                    userId: user.id,
                    email: user.email,
                    title: massMailTitle.trim(),
                    message: massMailMessage.trim(),
                    isRead: false,
                    type: 'announcement',
                    createdAt: serverTimestamp(),
                    sender: 'Admin'
                });
                count++;
            });

            await batch.commit();

            setIsMassMailModalOpen(false);
            setMassMailTitle('');
            setMassMailMessage('');
            alert(`Уведомление успешно отправлено ${count} пользователям!`);
        } catch (error) {
            console.error("Error sending mass mail:", error);
            alert("Ошибка при отправке рассылки");
        } finally {
            setMassMailSending(false);
        }
    };

    const handleApproveRequest = async (request: any) => {
        if (!selectedUserForSub) return;
        try {
            await updateDoc(doc(db, "requests", request.id), { status: 'completed' });

            if (selectedUserForSub.email) {
                await addDoc(collection(db, "notifications"), {
                    userId: selectedUserForSub.id,
                    email: selectedUserForSub.email,
                    title: "Заявка одобрена! ✅",
                    message: `Ваша заявка на пробную тренировку (${request.sports?.join(', ') || 'Общая'}) одобрена. Ждем вас!`,
                    isRead: false,
                    type: 'success',
                    createdAt: serverTimestamp()
                });
            }
            alert("Заявка одобрена");
        } catch (error) {
            console.error("Error approving request:", error);
            alert("Ошибка при одобрении заявки");
        }
    };

    return (
        <div>
            {/* ... Header ... */}
            <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-8">
                    <h1 className="text-3xl font-russo text-white">Пользователи ({filteredUsers.length})</h1>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-sparta-gold/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sparta-gold transition-colors" />
                        <input
                            type="text"
                            placeholder="Поиск по имени, почте или телефону..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-[400px] bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-sm text-white focus:border-sparta-gold/50 focus:bg-white/10 outline-none transition-all placeholder:text-white/10"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2.5 min-h-[38px]">
                    <button
                        onClick={handleSyncDatabase}
                        disabled={isSyncing}
                        className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                        title="Связать ожидающих учеников из импортированных списков с зарегистрированными аккаунтами"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Синхронизация...' : 'Синхронизировать'}</span>
                    </button>

                    <button
                        onClick={handleOpenCreateStaffModal}
                        className="bg-[#E2A012] hover:bg-[#F3B123] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Создать сотрудника</span>
                    </button>

                    <button
                        onClick={() => setIsMassMailModalOpen(true)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                        <span>Рассылка</span>
                    </button>

                    <button
                        onClick={() => setShowIncomplete(!showIncomplete)}
                        className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span>{showIncomplete ? 'Показать всех' : 'Скрыть пустые'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
                {(() => {
                    const totalActiveStudents = allEntities.filter(u => {
                        const roleLower = u.role?.toLowerCase() || 'user';
                        const isStaffRole = ['admin', 'director', 'developer', 'trainer', 'coach', 'staff', 'dev'].includes(roleLower);
                        const isStaff = isStaffRole || u.isStaff === true || u.isAdmin === true;
                        const isPendingUser = u.isPendingRegistration === true || (u as any).isPending === true || u.status === 'pending';
                        return !isStaff && isCompleteProfile(u) && !isPendingUser;
                    }).length;

                    const activeSubscriptionsCount = allEntities.filter(u => {
                        const roleLower = u.role?.toLowerCase() || 'user';
                        const isStaffRole = ['admin', 'director', 'developer', 'trainer', 'coach', 'staff', 'dev'].includes(roleLower);
                        const isStaff = isStaffRole || u.isStaff === true || u.isAdmin === true;
                        const isPendingUser = u.isPendingRegistration === true || (u as any).isPending === true || u.status === 'pending';
                        if (!u.subscription || isStaff || isPendingUser) return false;
                        const sub = u.subscription;
                        if (sub.status !== 'active') return false;
                        const expDate = sub.expiresAt || sub.endDate;
                        const days = getSubExpirationDays(expDate);
                        return days === null || days > 0;
                    }).length;

                    const expiringSoonCount = allEntities.filter(u => {
                        const roleLower = u.role?.toLowerCase() || 'user';
                        const isStaffRole = ['admin', 'director', 'developer', 'trainer', 'coach', 'staff', 'dev'].includes(roleLower);
                        const isStaff = isStaffRole || u.isStaff === true || u.isAdmin === true;
                        const isPendingUser = u.isPendingRegistration === true || (u as any).isPending === true || u.status === 'pending';
                        return !isStaff && !isPendingUser && isSubscriptionExpiringSoon(u);
                    }).length;

                    const staffCount = allEntities.filter(u => {
                        const roleLower = u.role?.toLowerCase() || 'user';
                        const isStaffRole = ['admin', 'director', 'developer', 'trainer', 'coach', 'staff', 'dev'].includes(roleLower);
                        const isStaff = isStaffRole || u.isStaff === true || u.isAdmin === true;
                        const isPendingUser = u.isPendingRegistration === true || (u as any).isPending === true || u.status === 'pending';
                        return isStaff && !isPendingUser;
                    }).length;

                    return (
                        <>
                            <div className="bg-[#141416] border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-start gap-3 transition-all shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                    <Users size={16} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-russo text-white leading-none">{totalActiveStudents}</span>
                                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide truncate">Всего учеников</span>
                                </div>
                            </div>

                            <div className="bg-[#141416] border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-start gap-3 transition-all shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                    <CreditCard size={16} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-russo text-white leading-none">{activeSubscriptionsCount}</span>
                                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide truncate">Активные абонементы</span>
                                </div>
                            </div>

                            <div className={`rounded-xl px-3.5 py-2.5 flex items-center justify-start gap-3 transition-all shadow-sm ${
                                expiringSoonCount > 0
                                    ? 'bg-amber-500/5 border border-amber-500/20'
                                    : 'bg-[#141416] border border-white/5 hover:border-white/10'
                            }`}>
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={16} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-xl font-russo leading-none ${expiringSoonCount > 0 ? 'text-amber-400' : 'text-white'}`}>{expiringSoonCount}</span>
                                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide truncate">Истекают (≤ 7 дн.)</span>
                                </div>
                            </div>

                            <div className="bg-[#141416] border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-start gap-3 transition-all shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                                    <Shield size={16} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xl font-russo text-white leading-none">{staffCount}</span>
                                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide truncate">Персонал</span>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Roles Filtering & Group Filtering Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { id: 'all', label: 'Все', icon: Globe, color: 'text-white/60' },
                        { id: 'students', label: 'Ученики', icon: User, color: 'text-blue-400' },
                        { id: 'expiring', label: 'Заканчиваются', icon: AlertTriangle, color: 'text-amber-400' },
                        { id: 'staff', label: 'Персонал', icon: Shield, color: 'text-sparta-gold' },
                        { id: 'pending', label: 'Ждут регистрации', icon: Clock, color: 'text-purple-400' },
                    ].map((tab) => {
                        const count = allEntities.filter(u => {
                            const roleLower = u.role?.toLowerCase() || 'user';
                            const isStaffRole = ['admin', 'director', 'developer', 'trainer', 'coach', 'staff', 'dev'].includes(roleLower);
                            const isStaff = isStaffRole || u.isStaff === true || u.isAdmin === true;
                            const isComplete = isCompleteProfile(u);

                            const isPendingUser = u.isPendingRegistration === true || (u as any).isPending === true || u.status === 'pending';

                            if (tab.id === 'all') return !isStaff && !isPendingUser;
                            if (tab.id === 'students') return !isStaff && isComplete && !isPendingUser;
                            if (tab.id === 'incomplete') return !isStaff && !isComplete && !isPendingUser;
                            if (tab.id === 'staff') return isStaff && !isPendingUser;
                            if (tab.id === 'pending') return isPendingUser;
                            if (tab.id === 'expiring') return isSubscriptionExpiringSoon(u) && !isStaff && !isPendingUser;
                            return false;
                        }).length;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveRoleTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer ${activeRoleTab === tab.id
                                        ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-black/20 font-bold'
                                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/8'
                                    }`}
                            >
                                <tab.icon size={16} className={activeRoleTab === tab.id ? tab.color : 'text-current'} />
                                <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeRoleTab === tab.id ? 'bg-white/10 text-white' : 'bg-black/20 text-white/20 font-medium'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    {/* Group Filter Dropdown */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-sparta-gold/50 shadow-sm">
                        <Users size={14} className="text-sparta-gold shrink-0" />
                        <select
                            value={selectedGroupFilter}
                            onChange={(e) => setSelectedGroupFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[200px] truncate [&>option]:bg-zinc-900"
                        >
                            <option value="ALL" className="bg-zinc-900 text-white">Все группы</option>
                            <option value="UNASSIGNED" className="bg-zinc-900 text-amber-400">⚠️ Без группы ({allEntities.filter(u => isUserInGroup(u, 'UNASSIGNED')).length})</option>
                            {groups.map(g => {
                                const count = allEntities.filter(u => isUserInGroup(u, g.id)).length;
                                return (
                                    <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                                        {g.name} ({count})
                                    </option>
                                );
                            })}
                        </select>
                        {selectedGroupFilter !== 'ALL' && (
                            <button
                                onClick={() => setSelectedGroupFilter('ALL')}
                                className="text-white/40 hover:text-white text-[11px] px-1 hover:bg-white/10 rounded cursor-pointer"
                                title="Сбросить фильтр группы"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {activeRoleTab === 'pending' && (
                        <button
                            type="button"
                            onClick={handleClearAllPendingRegistry}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                            title="Удалить абсолютно все записи из pending_students и сбросить счетчик в 0"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Очистить весь реестр</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl">
                <div className="overflow-x-auto pb-28">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 w-10 text-center">
                                    {(() => {
                                        const selectableUsers = filteredUsers.filter(u => !isProtectedUser(u));
                                        const isAllChecked = selectableUsers.length > 0 && selectableUsers.every(u => selectedUserIds.includes(u.id));
                                        return (
                                            <input
                                                type="checkbox"
                                                checked={isAllChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedUserIds(selectableUsers.map(u => u.id));
                                                    } else {
                                                        setSelectedUserIds([]);
                                                    }
                                                }}
                                                className="rounded border-white/20 text-sparta-gold focus:ring-0 cursor-pointer"
                                                title="Выбрать всех"
                                            />
                                        );
                                    })()}
                                </th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('childName')}>
                                    <div className="flex items-center gap-2">Имя / Ребенок <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('isOnline')}>
                                    <div className="flex items-center gap-2">Статус <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('email')}>
                                    <div className="flex items-center gap-2">Контакт <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="p-4">Группа</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-2">Регистрация <ArrowUpDown size={12} /></div>
                                </th>
                                 <th className="p-4 text-left cursor-pointer hover:text-white" onClick={() => handleSort('subscription')}>
                                    <div className="flex items-center gap-2">Абонемент <ArrowUpDown size={12} /></div>
                                 </th>
                                 <th className="p-4 text-center">Инфо</th>
                                 <th className="p-4 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={`hover:bg-white/5 transition-colors group/row ${activeDropdownUserId === user.id ? 'relative z-30' : ''} ${user.status === 'deleted' ? 'opacity-50' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            disabled={isProtectedUser(user)}
                                            checked={selectedUserIds.includes(user.id)}
                                            onChange={(e) => {
                                                if (isProtectedUser(user)) return;
                                                if (e.target.checked) {
                                                    setSelectedUserIds(prev => [...prev, user.id]);
                                                } else {
                                                    setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                                                }
                                            }}
                                            className={`rounded border-white/20 text-sparta-gold focus:ring-0 ${isProtectedUser(user) ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                            title={isProtectedUser(user) ? 'Сотрудник защищен от удаления' : 'Выбрать пользователя'}
                                        />
                                    </td>
                                    <td className="p-4 relative">
                                        {!user.isPendingRegistration && user.role?.toLowerCase() === 'admin' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r shadow-[2px_0_8px_rgba(59,130,246,0.5)]" />}
                                        {!user.isPendingRegistration && user.role?.toLowerCase() === 'director' && <div className="absolute left-0 top-2 bottom-2 w-1 bg-purple-500 rounded-r shadow-[2px_0_8px_rgba(168,85,247,0.5)]" />}
                                        {!user.isPendingRegistration && (user.role?.toLowerCase() === 'trainer' || user.role?.toLowerCase() === 'coach') && <div className="absolute left-0 top-2 bottom-2 w-1 bg-green-500 rounded-r shadow-[2px_0_8px_rgba(34,197,94,0.5)]" />}
                                        {!user.isPendingRegistration && (user.role?.toLowerCase() === 'developer' || user.role?.toLowerCase() === 'dev') && <div className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-500 rounded-r shadow-[2px_0_8px_rgba(34,211,238,0.5)]" />}
                                        {user.isPendingRegistration && <div className="absolute left-0 top-2 bottom-2 w-1 bg-purple-500 rounded-r animate-pulse" />}

                                        <div className="flex items-center gap-3">
                                            <div className="relative group/avatar">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ring-1 transition-all
                                                    ${user.isPendingRegistration ? 'bg-purple-500/10 text-purple-400 ring-purple-500/20' :
                                                        user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 ring-blue-500/20' :
                                                            user.role === 'director' ? 'bg-purple-500/10 text-purple-500 ring-purple-500/20' :
                                                                user.role === 'trainer' || user.role === 'coach' ? 'bg-green-500/10 text-green-500 ring-green-500/20' :
                                                                    user.role === 'developer' || user.role === 'dev' ? 'bg-cyan-500/10 text-cyan-500 ring-cyan-500/20' :
                                                                        'bg-white/5 text-white/30 ring-white/10'} 
                                                    group-hover:ring-sparta-gold/30`}>
                                                    {(user.firstName?.[0] || user.childName?.[0] || user.childFirstName?.[0] || '?').toUpperCase()}
                                                </div>
                                                {!user.isPendingRegistration && isOnline(user.lastActive) && (
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a1a1a] shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" title="В сети" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    {user.firstName ? `${user.firstName} ${user.lastName || ''} ` : user.displayName || user.childName || user.parentName || 'Без имени'}

                                                    {user.isPendingRegistration ? (
                                                        <span className="bg-purple-500/10 text-purple-400 text-[8px] px-1.5 py-0.5 rounded border border-purple-500/20 uppercase font-bold tracking-widest flex items-center gap-1">
                                                            <Clock size={8} /> Ждет регистрации
                                                        </span>
                                                    ) : !isCompleteProfile(user) && (
                                                        <span className="bg-orange-500/10 text-orange-500 text-[8px] px-1.5 py-0.5 rounded border border-orange-500/20 uppercase font-black tracking-widest">
                                                            Не заполнен
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-white/30 flex items-center gap-1.5 mt-0.5 font-mono">
                                                    <span>ID: {user.id.slice(0, 8)}</span>
                                                    {user.childAge && <span className="font-sans text-white/20">• {user.childAge} л</span>}
                                                    {user.childBirthYear && <span className="font-sans text-white/20">• {user.childBirthYear} г.р.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {isOnline(user.lastActive) ? (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    В СЕТИ
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-white/30 text-[10px] font-bold border border-white/5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                    {user.lastActive ? formatDateSafely(user.lastActive, 'dd.MM HH:mm') : 'ОФФЛАЙН'}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="p-4">
                                        {(() => {
                                            const extractedParentName = (
                                                user.parentName ||
                                                user.parent_name ||
                                                user.parentFullName ||
                                                user.guardianName ||
                                                user.parentInfo?.name ||
                                                ''
                                            ).trim();

                                            const hasRealEmail = user.email && !user.email.includes('pending_') && !user.email.includes('registry_') && user.email.includes('@');
                                            const parentEmail = user.parentEmail?.includes('@') ? user.parentEmail : null;

                                            const line1Text = extractedParentName || (hasRealEmail ? user.email : (parentEmail || null));

                                            const phoneRaw = user.parentPhone || user.phone || user.childPhone || (user.email && (user.email.startsWith('+') || /^\d+$/.test(user.email.replace(/\D/g, ''))) ? user.email : '');
                                            const formattedPhone = formatPhoneNumber(phoneRaw);
                                            const phoneDigits = (phoneRaw || '').replace(/\D/g, '');

                                            if (line1Text) {
                                                return (
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                                                            <span className="text-white/90 text-xs font-semibold truncate" title={line1Text}>{line1Text}</span>
                                                            {extractedParentName && (
                                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                                                    Род.
                                                                </span>
                                                            )}
                                                        </div>
                                                        {formattedPhone ? (
                                                            <a
                                                                href={`tel:+${phoneDigits.startsWith('8') ? '7' + phoneDigits.slice(1) : phoneDigits}`}
                                                                className="text-white/60 hover:text-sparta-gold text-[11px] flex items-center gap-1 transition-colors font-mono"
                                                            >
                                                                <Smartphone size={10} className="shrink-0 text-sparta-gold/70" />
                                                                <span>{formattedPhone}</span>
                                                            </a>
                                                        ) : (
                                                            <span className="text-white/20 text-[11px]">—</span>
                                                        )}
                                                    </div>
                                                );
                                            } else if (formattedPhone) {
                                                return (
                                                    <a
                                                        href={`tel:+${phoneDigits.startsWith('8') ? '7' + phoneDigits.slice(1) : phoneDigits}`}
                                                        className="text-white/80 hover:text-sparta-gold text-xs font-semibold flex items-center gap-1.5 transition-colors font-mono"
                                                    >
                                                        <Smartphone size={12} className="shrink-0 text-sparta-gold" />
                                                        <span>{formattedPhone}</span>
                                                    </a>
                                                );
                                            } else {
                                                return <span className="text-white/20 text-xs font-mono">—</span>;
                                            }
                                        })()}
                                    </td>

                                    <td className="p-4">
                                        {user.groupId ? (
                                            <button onClick={() => openGroupModal(user)} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold hover:bg-blue-500/20">
                                                {getGroupName(user.groupId)}
                                            </button>
                                        ) : (
                                            <button onClick={() => openGroupModal(user)} className="px-3 py-1 rounded-full bg-white/5 text-white/30 text-xs font-bold hover:bg-sparta-gold/10 hover:text-sparta-gold border border-white/5">
                                                Назначить
                                            </button>
                                        )}
                                    </td>

                                    <td className="p-4 text-white/50 text-sm">
                                        {formatDateSafely(user.createdAt, 'dd.MM.yyyy')}
                                    </td>

                                    <td className="p-4 text-left">
                                        <div className="flex flex-col items-start justify-center gap-1 text-left group/sub relative">
                                            {(() => {
                                                const sub = user.subscription;
                                                if (!sub || sub.status === 'none') {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-white/30 border border-white/5">
                                                            НЕТ ПЛАНА
                                                        </span>
                                                    );
                                                }
                                                if (sub.status === 'frozen') {
                                                    return (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                ЗАМОРОЖЕН
                                                            </span>
                                                            {sub.title && (
                                                                <span className="text-xs font-bold text-white tracking-wide truncate max-w-[120px]" title={sub.title}>
                                                                    {sub.title}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                const expDate = sub.expiresAt || sub.endDate;
                                                const daysLeft = getSubExpirationDays(expDate);
                                                const isExpired = daysLeft !== null && daysLeft < 0;
                                                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

                                                if (isExpired) {
                                                    return (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                                                ИСТЕК
                                                            </span>
                                                            {sub.title && (
                                                                <span className="text-xs font-bold text-white/60 line-through tracking-wide truncate max-w-[120px]" title={sub.title}>
                                                                    {sub.title}
                                                                </span>
                                                            )}
                                                            <div className="opacity-60 group-hover/sub:opacity-100 transition-opacity flex items-center gap-1.5 mt-1">
                                                                {remindedUserIds[user.id] ? (
                                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                                                        ✓ Отправлено
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => handleQuickRemind(user, e)}
                                                                        className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1 border border-amber-500/20 cursor-pointer transition-all"
                                                                        title="Отправить напоминание"
                                                                    >
                                                                        <Send size={10} /> Напомнить
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => handleQuickRenew(user, e)}
                                                                    className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/20 cursor-pointer transition-all"
                                                                    title="Продлить на 30 дней"
                                                                >
                                                                    +30 дн.
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        {/* Line 1: Plan Title Direct */}
                                                        {sub.title && (
                                                            <span className="text-xs font-bold text-white tracking-wide truncate max-w-[130px]" title={sub.title}>
                                                                {sub.title}
                                                            </span>
                                                        )}

                                                        {/* Line 2: Expiry Date & Remaining Days */}
                                                        {expDate && daysLeft !== null && (
                                                            <div className={isExpiringSoon
                                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1'
                                                                : 'text-white/40 text-[10px] font-medium flex items-center gap-1'
                                                            }>
                                                                <Clock size={10} />
                                                                <span>
                                                                    до {formatDateSafely(expDate, 'dd.MM')} • осталось {Math.ceil(daysLeft)} дн.
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Hover Actions Bar */}
                                                        <div className="opacity-60 group-hover/sub:opacity-100 transition-opacity flex items-center gap-1.5 mt-1">
                                                            {remindedUserIds[user.id] ? (
                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                                                    ✓ Отправлено
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => handleQuickRemind(user, e)}
                                                                    className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1 border border-amber-500/20 cursor-pointer transition-all"
                                                                    title="Отправить напоминание"
                                                                >
                                                                    <Send size={10} /> Напомнить
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleQuickRenew(user, e)}
                                                                className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/20 cursor-pointer transition-all"
                                                                title="Продлить на 30 дней"
                                                            >
                                                                +30 дн.
                                                            </button>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {user.role === 'admin' && (
                                                <span title="Администратор" className="text-blue-500"><BadgeCheck size={14} /></span>
                                            )}
                                            {user.role === 'trainer' && (
                                                <span title="Тренер" className="text-green-500"><Dumbbell size={14} /></span>
                                            )}
                                            {user.role === 'director' && (
                                                <span title="Директор" className="text-purple-500"><Star size={14} /></span>
                                            )}
                                            {user.role === 'developer' && (
                                                <span title="Разработчик" className="text-cyan-500"><Code size={14} /></span>
                                            )}
                                            {user.verification?.isVerified && (
                                                <span title={user.verification.title || "Верифицирован"} className="text-blue-500"><BadgeCheck size={14} /></span>
                                            )}
                                            {user.achievements?.length > 0 && (
                                                <span title={`Наград: ${user.achievements.length}`} className="text-yellow-500 flex items-center gap-1 text-xs font-semibold">
                                                    <Trophy size={14} /> {user.achievements.length}
                                                </span>
                                            )}
                                            {user.adminNotes && (
                                                <span title={`Заметка: ${user.adminNotes}`} className="text-blue-400"><FileText size={14} /></span>
                                            )}
                                            {!user.role && !user.verification?.isVerified && (!user.achievements || user.achievements.length === 0) && !user.adminNotes && (
                                                <span className="text-white/20 text-xs">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right relative">
                                        <div className="flex items-center justify-end gap-2 pr-3 whitespace-nowrap">
                                            {/* Primary Action */}
                                            <button
                                                onClick={() => openSubModal(user)}
                                                title="Управление аккаунтом"
                                                className="px-2.5 py-1.5 rounded-lg text-sparta-gold bg-sparta-gold/10 hover:bg-sparta-gold/20 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
                                            >
                                                <UserCog size={14} />
                                                <span>Управление</span>
                                            </button>

                                            {/* Kebab Menu Dropdown */}
                                            <div className="relative inline-block shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdownUserId(activeDropdownUserId === user.id ? null : user.id);
                                                    }}
                                                    className={`p-1.5 rounded-lg transition-colors ${activeDropdownUserId === user.id ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                                                    title="Дополнительные действия"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {activeDropdownUserId === user.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownUserId(null)} />
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 py-2 text-left overflow-hidden text-xs">
                                                            <button
                                                                onClick={() => { setActiveDropdownUserId(null); openAchievementsModal(user); }}
                                                                className="w-full px-3 py-2 text-white/80 hover:text-yellow-400 hover:bg-yellow-400/10 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Trophy size={14} className="text-yellow-500" />
                                                                Выдать награду
                                                            </button>
                                                            <button
                                                                onClick={() => { setActiveDropdownUserId(null); openVerifyModal(user); }}
                                                                className="w-full px-3 py-2 text-white/80 hover:text-blue-400 hover:bg-blue-400/10 flex items-center gap-2 transition-colors"
                                                            >
                                                                <BadgeCheck size={14} className="text-blue-400" />
                                                                Роль / Статус
                                                            </button>
                                                            {canResetCredentials(userProfile, user) && (
                                                                <button
                                                                    onClick={() => { setActiveDropdownUserId(null); openResetCredentialsModal(user); }}
                                                                    className="w-full px-3 py-2 text-white/80 hover:text-sparta-gold hover:bg-sparta-gold/10 flex items-center gap-2 transition-colors font-bold"
                                                                >
                                                                    <Shield size={14} className="text-sparta-gold" />
                                                                    <div className="text-left">
                                                                        <div className="text-sparta-gold">Восстановить доступ</div>
                                                                        <div className="text-[9px] text-white/40 font-normal">При утере пароля и email</div>
                                                                    </div>
                                                                </button>
                                                            )}
                                                            <div className="my-1 border-t border-white/10" />
                                                            {user.ban?.isBanned ? (
                                                                <button
                                                                    onClick={() => { setActiveDropdownUserId(null); handleUnbanUser(user); }}
                                                                    className="w-full px-3 py-2 text-green-400 hover:bg-green-500/10 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Ban size={14} />
                                                                    Разблокировать
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => { setActiveDropdownUserId(null); openBanModal(user); }}
                                                                    className="w-full px-3 py-2 text-white/80 hover:text-orange-400 hover:bg-orange-500/10 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Ban size={14} className="text-orange-400" />
                                                                    Заблокировать
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => { setActiveDropdownUserId(null); toggleSoftDelete(user.id, user.status); }}
                                                                className="w-full px-3 py-2 text-white/80 hover:text-orange-400 hover:bg-orange-500/10 flex items-center gap-2 transition-colors"
                                                            >
                                                                {user.status === 'deleted' ? (
                                                                    <>
                                                                        <CheckCircle size={14} className="text-green-500" />
                                                                        Восстановить
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Trash2 size={14} className="text-orange-400" />
                                                                        Скрыть
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => { setActiveDropdownUserId(null); handleDeleteUser(user); }}
                                                                className="w-full px-3 py-2 text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                            >
                                                                <Trash2 size={14} className="text-red-500" />
                                                                Удалить полностью
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Bulk Action Toolbar */}
            {selectedUserIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#18181b] border border-sparta-gold/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] px-6 py-3.5 rounded-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 duration-200">
                    <span className="text-sm text-white font-medium">
                        Выбрано пользователей: <span className="text-sparta-gold font-bold">{selectedUserIds.length}</span>
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsBulkGroupModalOpen(true)}
                            className="px-4 py-2 bg-sparta-gold hover:bg-yellow-500 text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-sparta-gold/20 cursor-pointer"
                        >
                            👥 Назначить группу
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/20"
                        >
                            <Trash2 size={15} /> 🗑️ Удалить выбранных ({selectedUserIds.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedUserIds([])}
                            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl text-xs font-bold transition-all"
                        >
                            Снять выбор
                        </button>
                    </div>
                </div>
            )}

            {/* Mass Group Assignment Modal */}
            {isBulkGroupModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsBulkGroupModalOpen(false); }}
                >
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-white/10 p-6 flex flex-col gap-5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="text-sparta-gold" size={20} />
                                Назначить группу выбранным
                            </h3>
                            <button
                                onClick={() => setIsBulkGroupModalOpen(false)}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-white/60">
                            Выберите группу из списка. Выбранная группа будет назначена сразу <span className="text-sparta-gold font-bold">{selectedUserIds.length}</span> пользователям.
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase mb-2">Группа</label>
                            <select
                                value={bulkSelectedGroupId}
                                onChange={(e) => setBulkSelectedGroupId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none"
                            >
                                <option value="" className="bg-[#1a1a1a] text-white">-- Выберите группу --</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id} className="bg-[#1a1a1a] text-white">
                                        {g.name} ({g.direction || 'Без направления'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setIsBulkGroupModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                disabled={!bulkSelectedGroupId || isSubmittingBulkGroup}
                                onClick={handleBulkAssignGroup}
                                className="px-5 py-2.5 rounded-xl bg-sparta-gold hover:bg-yellow-500 text-black text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmittingBulkGroup && <Loader2 size={14} className="animate-spin" />}
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievement Managment Modal */}
            {isAchievementsModalOpen && selectedUserForAchievements && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsAchievementsModalOpen(false); }}
                >
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-white/10 p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white font-russo">Награды пользователя</h3>
                                <p className="text-white/50 text-xs">{selectedUserForAchievements.childName}</p>
                            </div>
                            <button onClick={() => setIsAchievementsModalOpen(false)} className="text-white/30 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Grant New Achievement Section */}
                        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
                            <label className="text-xs font-bold text-white/40 uppercase">Выдать награду вручную</label>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                                    value={selectedAchievementId}
                                    onChange={(e) => setSelectedAchievementId(e.target.value)}
                                >
                                    <option value="">-- Выберите награду --</option>
                                    {availableAchievements.map(ach => (
                                        <option key={ach.id} value={ach.id}>{ach.title}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleGrantAchievement}
                                    disabled={!selectedAchievementId || grantingAchievement}
                                    className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                >
                                    {grantingAchievement ? 'Выдача...' : 'Выдать'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {!selectedUserForAchievements.achievements?.length ? (
                                <div className="text-center text-white/30 py-8">Нет наград</div>
                            ) : (
                                selectedUserForAchievements.achievements.map((ach: any) => (
                                    <div key={ach.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-yellow-500">
                                                <Trophy size={18} />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Награда</div>
                                                <div className="text-white/40 text-xs">{new Date(ach.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => confirmRevoke(ach.id)}
                                            className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Забрать награду"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {isBanModalOpen && selectedUserForBan && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsBanModalOpen(false); }}
                >
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-red-500 font-russo mb-2">Блокировка доступа</h3>
                        <p className="text-white/60 mb-6 text-sm">
                            Пользователь: <span className="text-white">{selectedUserForBan.childName}</span>
                        </p>

                        <div className="space-y-6">
                            {/* Ban Type */}
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-3">Тип блокировки (Способ)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <div
                                        onClick={() => setBanType('account')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${banType === 'account' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg"><User size={16} /></div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Бан Аккаунта (Обычный)</div>
                                                <div className="text-white/40 text-xs">Пользователь не сможет войти в этот аккаунт.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setBanType('device')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${banType === 'device' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg"><Smartphone size={16} /></div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Бан Устройства (По железу)</div>
                                                <div className="text-white/40 text-xs">Блокировка браузера. Создание нового аккаунта не поможет.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setBanType('ip')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${banType === 'ip' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg"><Globe size={16} /></div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Бан по IP (Вся сеть)</div>
                                                <div className="text-white/40 text-xs">Блокирует всех пользователей с этого Wi-Fi/Интернета.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Срок действия</label>
                                <select
                                    value={banDuration === null ? 'null' : banDuration}
                                    onChange={(e) => setBanDuration(e.target.value === 'null' ? null : Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                >
                                    <option value={1 * 24 * 60 * 60 * 1000}>24 часа (1 день)</option>
                                    <option value={3 * 24 * 60 * 60 * 1000}>3 дня</option>
                                    <option value={7 * 24 * 60 * 60 * 1000}>7 дней (Неделя)</option>
                                    <option value={30 * 24 * 60 * 60 * 1000}>30 дней (Месяц)</option>
                                    <option value="null">Навсегда (Бессрочно)</option>
                                </select>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Причина (Будет видна пользователю)</label>
                                <textarea
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="Например: Нарушение правил общения..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsBanModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={!banReason}
                                className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ЗАБАНИТЬ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Assignment Modal (Existing) */}
            {isGroupModalOpen && selectedUserForGroup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsGroupModalOpen(false); }}
                >
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white font-russo mb-4">Назначение группы</h3>
                        <p className="text-white/60 mb-6 text-sm">
                            Ученик: <span className="text-white">{selectedUserForGroup.childName}</span>
                        </p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Выберите группу</label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold"
                                >
                                    <option value="">-- Без группы --</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name} ({group.ageRange.min}-{group.ageRange.max} лет)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsGroupModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAssignGroup}
                                className="px-6 py-2 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 transition-colors"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Subscription Management Modal */}
            {isSubModalOpen && selectedUserForSub && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsSubModalOpen(false); }}
                >
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-4xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-8 py-6 bg-gradient-to-r from-sparta-gold/20 to-transparent border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-white font-russo">Управление аккаунтом</h3>
                                <p className="text-white/40 text-xs mt-1">{selectedUserForSub.firstName} {selectedUserForSub.lastName} • {selectedUserForSub.email}</p>
                            </div>
                            <button onClick={() => setIsSubModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-white/5 bg-white/5 px-8">
                            <button
                                onClick={() => setSubModalTab('plan')}
                                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all relative ${subModalTab === 'plan' ? 'text-sparta-gold' : 'text-white/30 hover:text-white'}`}
                            >
                                Управление
                                {subModalTab === 'plan' && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sparta-gold" />}
                            </button>
                            <button
                                onClick={() => setSubModalTab('stats')}
                                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all relative ${subModalTab === 'stats' ? 'text-sparta-gold' : 'text-white/30 hover:text-white'}`}
                            >
                                Статистика
                                {subModalTab === 'stats' && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sparta-gold" />}
                            </button>
                            <button
                                onClick={() => setSubModalTab('finance')}
                                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all relative ${subModalTab === 'finance' ? 'text-sparta-gold' : 'text-white/30 hover:text-white'}`}
                            >
                                Финансы
                                {subModalTab === 'finance' && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sparta-gold" />}
                            </button>
                            <button
                                onClick={() => setSubModalTab('requests')}
                                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all relative ${subModalTab === 'requests' ? 'text-sparta-gold' : 'text-white/30 hover:text-white'}`}
                            >
                                Заявки
                                {userRequests.filter(r => r.status === 'new').length > 0 && (
                                    <span className="absolute top-3 right-2 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                                {subModalTab === 'requests' && <motion.div layoutId="subTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sparta-gold" />}
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col">
                            {subModalTab === 'plan' ? (
                                <div className="p-8 space-y-8">
                                    {/* Personal Data Selection */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">
                                                {selectedUserForSub.role && selectedUserForSub.role !== 'user' ? 'Имя' : 'Имя представителя'}
                                            </label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                placeholder="Имя"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">
                                                {selectedUserForSub.role && selectedUserForSub.role !== 'user' ? 'Фамилия' : 'Фамилия представителя'}
                                            </label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                placeholder="Фамилия"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">
                                                {selectedUserForSub.role && selectedUserForSub.role !== 'user' ? 'ФИО сотрудника' : 'ФИО Спортсмена'}
                                            </label>
                                            <input
                                                type="text"
                                                value={childName}
                                                onChange={(e) => setChildName(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                placeholder={selectedUserForSub.role && selectedUserForSub.role !== 'user' ? 'ФИО сотрудника' : 'ФИО Спортсмена'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">
                                                {selectedUserForSub.role && selectedUserForSub.role !== 'user' ? 'Контактный телефон' : 'Телефон родителя'}
                                            </label>
                                            <input
                                                type="text"
                                                value={parentPhone}
                                                onChange={(e) => setParentPhone(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                placeholder="+7 (___) ___-__-__"
                                            />
                                        </div>
                                    </div>

                                    {selectedUserForSub.role && selectedUserForSub.role === 'user' && (
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Возраст</label>
                                                <input
                                                    type="number"
                                                    value={childAge}
                                                    onChange={(e) => setChildAge(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                    placeholder="Лет"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Год рождения</label>
                                                <input
                                                    type="number"
                                                    value={childBirthYear}
                                                    onChange={(e) => setChildBirthYear(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                    placeholder="ГГГГ"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Quick Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                            <div className="text-[10px] text-white/30 font-bold uppercase mb-1">Статус</div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${selectedUserForSub.subscription?.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                                <span className="text-white font-bold">
                                                    {selectedUserForSub.subscription ? (
                                                        selectedUserForSub.subscription.status === 'active' ? 'Активен' :
                                                            selectedUserForSub.subscription.status === 'frozen' ? 'Заморожен' : 'Истек'
                                                    ) : 'Нет плана'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => fetchUserOrders(selectedUserForSub)}>
                                            <div className="text-[10px] text-white/30 font-bold uppercase mb-1">История заказов</div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-bold flex items-center gap-2"><CreditCard size={14} className="text-sparta-gold" /> Посмотреть</span>
                                                <ArrowUpDown size={12} className="text-white/20" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Plan Selection */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Назначить план</label>
                                            <div className="relative">
                                                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-sparta-gold" size={16} />
                                                <select
                                                    value={subPlanId}
                                                    onChange={(e) => setSubPlanId(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-sparta-gold transition-colors"
                                                >
                                                    <option value="">-- Удалить план --</option>
                                                    {directions.map(dir => (
                                                        <option key={dir.id} value={dir.id}>{dir.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Expiry Date */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Действует до</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                                <input
                                                    type="date"
                                                    value={subEndDate}
                                                    onChange={(e) => setSubEndDate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admin Notes */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Заметки администратора (Для внутреннего пользования)</label>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Особенности клиента, история оплат и т.д."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold min-h-[100px] text-sm"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                                        {selectedUserForSub.subscription && (
                                            <>
                                                <button
                                                    onClick={handleToggleFreeze}
                                                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedUserForSub.subscription.status === 'frozen'
                                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20'
                                                        : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20'
                                                        }`}
                                                >
                                                    {selectedUserForSub.subscription.status === 'frozen' ? <Play size={18} /> : <Pause size={18} />}
                                                    {selectedUserForSub.subscription.status === 'frozen' ? 'Разморозить' : 'Заморозить'}
                                                </button>
                                                <button
                                                    onClick={handleRevokeSubscription}
                                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-bold transition-all"
                                                >
                                                    <MinusCircle size={18} /> Отозвать план
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : subModalTab === 'stats' ? (
                                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                    <StatsSection
                                        userProfile={selectedUserForSub}
                                        requests={userRequests}
                                        orders={userOrders}
                                        isAdmin={true}
                                        onUpdateActivity={async (date, minutes) => {
                                            const dailyRef = doc(db, "users", selectedUserForSub.id, "dailyActivity", date);
                                            await setDoc(dailyRef, {
                                                minutes,
                                                lastUpdated: serverTimestamp(),
                                                date
                                            }, { merge: true });
                                        }}
                                        onUpdateManualStats={async (updates) => {
                                            const userRef = doc(db, "users", selectedUserForSub.id);
                                            await updateDoc(userRef, updates);
                                        }}
                                    />
                                </div>
                            ) : subModalTab === 'finance' ? (
                                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                    {/* Finance Header Cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                                            <Wallet className="absolute -right-2 -bottom-2 w-16 h-16 text-white/5 -rotate-12 group-hover:text-sparta-gold/10 transition-colors" />
                                            <div className="text-[10px] text-white/30 font-bold uppercase mb-1">Лицевой счёт</div>
                                            <div className="text-xl sm:text-2xl font-russo text-sparta-gold">{(selectedUserForSub.walletBalance || 0).toLocaleString()} ₽</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 relative overflow-hidden group">
                                            <Coins className="absolute -right-2 -bottom-2 w-16 h-16 text-amber-500/10 -rotate-12 group-hover:text-amber-500/20 transition-colors" />
                                            <div className="text-[10px] text-amber-300/70 font-bold uppercase mb-1">SpartCoins (Монеты)</div>
                                            <div className="text-xl sm:text-2xl font-russo text-amber-400">{Number((selectedUserForSub as any).coins ?? (selectedUserForSub as any).stats?.coins ?? 0).toLocaleString()} 🟡</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 relative overflow-hidden group">
                                            <Zap className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-500/10 -rotate-12 group-hover:text-blue-500/20 transition-colors" />
                                            <div className="text-[10px] text-blue-300/70 font-bold uppercase mb-1">Опыт (XP)</div>
                                            <div className="text-xl sm:text-2xl font-russo text-blue-400">{Number((selectedUserForSub as any).xp ?? (selectedUserForSub as any).stats?.xp ?? 0).toLocaleString()} XP</div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                                            <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-white/5 -rotate-12 group-hover:text-emerald-500/10 transition-colors" />
                                            <div className="text-[10px] text-white/30 font-bold uppercase mb-1">CLV (Доход)</div>
                                            <div className="text-xl sm:text-2xl font-russo text-emerald-400">{(selectedUserForSub.totalSpent || 0).toLocaleString()} ₽</div>
                                        </div>
                                    </div>

                                    {/* Reward (Coins & XP) Management */}
                                    <div className="p-6 rounded-2xl bg-zinc-900/90 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] space-y-4">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                <Coins size={16} className="text-amber-400" /> Наградной баланс (SpartCoins & XP)
                                            </h4>
                                            <div className="text-xs text-zinc-400">
                                                Баланс: <strong className="text-amber-300">{Number((selectedUserForSub as any).coins ?? (selectedUserForSub as any).stats?.coins ?? 0)} 🟡</strong> • <strong className="text-blue-300">{Number((selectedUserForSub as any).xp ?? (selectedUserForSub as any).stats?.xp ?? 0)} XP</strong>
                                            </div>
                                        </div>

                                        {/* Currencies & Modes Switcher */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                            {/* Currency Toggle */}
                                            <div className="flex bg-black/60 p-1 rounded-xl border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardCurrency('coins')}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                        rewardCurrency === 'coins'
                                                            ? 'bg-amber-400 text-black shadow-md'
                                                            : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    <span>🟡</span> Монеты (Coins)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardCurrency('xp')}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                        rewardCurrency === 'xp'
                                                            ? 'bg-blue-500 text-white shadow-md'
                                                            : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    <span>⚡</span> Опыт (XP)
                                                </button>
                                            </div>

                                            {/* Operation Mode */}
                                            <div className="flex bg-black/60 p-1 rounded-xl border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardMode('add')}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        rewardMode === 'add'
                                                            ? 'bg-emerald-500 text-black shadow-md'
                                                            : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    + Начислить
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardMode('subtract')}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        rewardMode === 'subtract'
                                                            ? 'bg-red-500 text-white shadow-md'
                                                            : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    - Списать
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRewardMode('set')}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        rewardMode === 'set'
                                                            ? 'bg-sparta-gold text-black shadow-md'
                                                            : 'text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    = Установить
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inputs & Apply Button */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                                            <div className="sm:col-span-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={rewardAmount}
                                                    onChange={(e) => setRewardAmount(e.target.value)}
                                                    placeholder={rewardMode === 'set' ? 'Новое точное число...' : 'Количество...'}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
                                                />
                                            </div>
                                            <div className="sm:col-span-5">
                                                <input
                                                    type="text"
                                                    value={rewardReason}
                                                    onChange={(e) => setRewardReason(e.target.value)}
                                                    placeholder="Причина (напр., Награда за турнир, Тест магазина)..."
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <button
                                                    type="button"
                                                    onClick={handleUpdateRewards}
                                                    disabled={isAdjustingRewards || !rewardAmount}
                                                    className={`w-full h-full py-2.5 px-4 rounded-xl font-russo text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 ${
                                                        rewardCurrency === 'coins'
                                                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                            : 'bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                                    }`}
                                                >
                                                    {isAdjustingRewards ? <Loader2 size={16} className="animate-spin" /> : 'Применить'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance Management (Рубли) */}
                                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                <Wallet size={16} className="text-sparta-gold" /> Управление Лицевым Счетом (₽)
                                            </h4>
                                            <div className="flex bg-black/40 rounded-lg p-1">
                                                <button onClick={() => setBalanceAdjustment('')} className="p-1 text-white/30 hover:text-white transition-colors">
                                                    <RefreshCw size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="number"
                                                    value={balanceAdjustment}
                                                    onChange={(e) => setBalanceAdjustment(e.target.value)}
                                                    placeholder="Введите сумму в рублях..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors font-russo"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdateBalance('add')}
                                                    disabled={isAdjustingBalance || !balanceAdjustment}
                                                    className="px-4 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all disabled:opacity-30 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <PlusCircle size={18} /> ДОБАВИТЬ
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateBalance('subtract')}
                                                    disabled={isAdjustingBalance || !balanceAdjustment}
                                                    className="px-4 py-3 rounded-xl bg-red-500/20 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/30 transition-all disabled:opacity-30 flex items-center gap-2 cursor-pointer"
                                                >
                                                    <MinusCircle size={18} /> ВЫЧЕСТЬ
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateBalance('set')}
                                                    disabled={isAdjustingBalance || !balanceAdjustment}
                                                    className="px-4 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all disabled:opacity-30 cursor-pointer"
                                                >
                                                    УСТАНОВИТЬ
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Unified History */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <Receipt size={16} className="text-sparta-gold" /> История операций
                                        </h4>

                                        <div className="space-y-2">
                                            {loadingOrders ? (
                                                <div className="flex py-10 justify-center">
                                                    <Loader2 className="animate-spin text-sparta-gold" size={32} />
                                                </div>
                                            ) : [
                                                ...userOrders.map(o => ({ ...o, type: 'order', sortDate: getTimestampSeconds(o.date) })),
                                                ...userPromoActivations.map(p => ({ ...p, type: 'promo', sortDate: getTimestampSeconds(p.timestamp) }))
                                            ].sort((a, b) => b.sortDate - a.sortDate).length === 0 ? (
                                                <div className="py-10 text-center text-white/20 italic text-sm">История операций пуста</div>
                                            ) : (
                                                [
                                                    ...userOrders.map(o => ({ ...o, type: 'order', sortDate: (o.date as any)?.seconds || 0 })),
                                                    ...userPromoActivations.map(p => ({ ...p, type: 'promo', sortDate: (p.timestamp as any)?.seconds || 0 }))
                                                ].sort((a, b) => b.sortDate - a.sortDate).map((item: any, idx) => (
                                                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'order' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                                {item.type === 'order' ? <Receipt size={18} /> : <Tag size={18} />}
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-bold text-sm">
                                                                    {item.type === 'order' ? (item.planTitle || `Заказ #${item.id.slice(-6)}`) : `Промокод: ${item.code || item.promoId}`}
                                                                </div>
                                                                <div className="text-white/30 text-[10px] font-medium">
                                                                    {item.sortDate ? format(new Date(item.sortDate * 1000), 'd MMM yyyy, HH:mm', { locale: ru }) : '—'} • {item.type === 'order' ? 'Платеж' : 'Активация'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`text-right font-russo ${item.type === 'order' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {item.type === 'order' ? '-' : '+'}{(item.totalAmount || item.discountAmount || item.amount || 0).toLocaleString()} ₽
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : subModalTab === 'requests' ? (
                                <div className="p-8 space-y-6 bg-black/20 overflow-y-auto custom-scrollbar flex-1">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={16} className="text-sparta-gold" /> Активные заявки
                                    </h4>

                                    <div className="space-y-4">
                                        {userRequests.length === 0 ? (
                                            <div className="py-20 text-center">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/10">
                                                    <FileText size={32} />
                                                </div>
                                                <p className="text-white/20 italic">Заявок от пользователя не найдено</p>
                                            </div>
                                        ) : (
                                            userRequests.sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt)).map((req) => (
                                                <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${req.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-sparta-gold/10 text-sparta-gold'}`}>
                                                                <Zap size={20} />
                                                            </div>
                                                            <div>
                                                                <div className="text-white font-bold text-lg">{req.programType || 'Пробная тренировка'}</div>
                                                                <div className="text-white/40 text-xs flex items-center gap-2">
                                                                    <Calendar size={12} />
                                                                    {formatDateSafely(req.createdAt, 'd MMMM yyyy, HH:mm', ru)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${req.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                            req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                            {req.status === 'new' ? 'Новая' :
                                                                req.status === 'contacted' ? 'В работе' :
                                                                    req.status === 'completed' ? 'Завершена' :
                                                                        req.status === 'rejected' ? 'Отклонена' : req.status}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                            <div className="text-[10px] text-white/30 font-bold uppercase mb-1">Ребенок</div>
                                                            <div className="text-white text-sm font-medium">{req.childSurname} {req.childName}</div>
                                                            <div className="text-white/50 text-xs">{req.childAge} лет</div>
                                                        </div>
                                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                            <div className="text-[10px] font-bold text-white/30 uppercase mb-1">Контакты</div>
                                                            <div className="text-white text-sm font-medium">{req.parentPhone}</div>
                                                            <div className="text-white/50 text-xs">{req.email || req.parentName}</div>
                                                        </div>
                                                    </div>

                                                    {req.sports && req.sports.length > 0 && (
                                                        <div className="mb-4">
                                                            <div className="text-[10px] text-white/30 font-bold uppercase mb-2">Интересующие виды спорта</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {req.sports.map((sport: string, i: number) => (
                                                                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white/70 text-xs">
                                                                        {sport}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {req.comment && (
                                                        <div className="mb-4 bg-white/5 p-3 rounded-xl border border-white/5 italic text-white/60 text-xs">
                                                            "{req.comment}"
                                                        </div>
                                                    )}

                                                    {req.status === 'new' && (
                                                        <button
                                                            onClick={() => handleApproveRequest(req)}
                                                            className="w-full py-3 bg-sparta-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20"
                                                        >
                                                            <CheckCircle size={18} /> ОДОБРИТЬ ЗАЯВКУ
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer - Only show for Plan tab */}
                        {subModalTab === 'plan' && (
                            <div className="p-8 bg-white/5 flex gap-4">
                                <button
                                    onClick={() => setIsSubModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-xl text-white/50 font-bold hover:bg-white/5 transition-all"
                                >
                                    Закрыть
                                </button>
                                <button
                                    onClick={handleUpdateSubscription}
                                    className="flex-1 px-6 py-4 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 shadow-lg shadow-sparta-gold/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} /> СОХРАНИТЬ ИЗМЕНЕНИЯ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Order History Modal */}
            {
                isHistoryModalOpen && selectedUserForSub && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setIsHistoryModalOpen(false); }}
                    >
                        <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-russo">История платежей</h3>
                                    <p className="text-white/40 text-xs">{selectedUserForSub.email}</p>
                                </div>
                                <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white/30 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                {loadingOrders ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <div className="w-10 h-10 border-4 border-sparta-gold/30 border-t-sparta-gold rounded-full animate-spin" />
                                        <p className="text-white/20 text-sm font-bold animate-pulse">Загружаем чеки...</p>
                                    </div>
                                ) : userOrders.length === 0 ? (
                                    <div className="text-center py-20 text-white/20">
                                        <CreditCard size={48} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-russo">История платежей пуста</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {userOrders.map((order) => (
                                            <div key={order.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-sparta-gold/30 hover:bg-white/10 transition-all group">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                                                            <CreditCard size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="text-white font-bold group-hover:text-sparta-gold transition-colors">{order.planTitle}</div>
                                                            <div className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">
                                                                {formatDateSafely(order.date, 'dd MMM yyyy, HH:mm')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white font-russo text-lg">{(order.price || order.amount || 0).toLocaleString()} ₽</div>
                                                        <div className="text-[10px] text-white/40 uppercase font-bold">{order.paymentMethod === 'tbank' ? 'Т-Банк' : 'Сбер'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View Shop Orders Modal */}
            {
                isShopOrdersModalOpen && selectedUserForShopOrders && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setIsShopOrdersModalOpen(false); }}
                    >
                        <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                        <ShoppingBag size={20} className="text-emerald-400" /> Заказы в Магазине
                                    </h3>
                                    <p className="text-white/40 text-xs mt-1">{selectedUserForShopOrders.childName} ({selectedUserForShopOrders.email})</p>
                                </div>
                                <button onClick={() => setIsShopOrdersModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white/30 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                {loadingShopOrders ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                        <p className="text-white/20 text-sm font-bold animate-pulse">Загружаем заказы...</p>
                                    </div>
                                ) : shopOrders.length === 0 ? (
                                    <div className="text-center py-20 text-white/20">
                                        <ShoppingBag size={48} className="mx-auto mb-4 opacity-10" />
                                        <p className="font-russo">Пользователь ничего не покупал</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {shopOrders.map((order) => (
                                            <div key={order.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col gap-4">
                                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                    <div className="text-xs text-white/40 uppercase tracking-widest font-bold">
                                                        Заказ #{order.id.slice(0, 6)}
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <div className="text-xs text-white/30">
                                                            {formatDateSafely(order.createdAt, 'dd MMM yyyy, HH:mm')}
                                                        </div>
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                                                'bg-yellow-500/20 text-yellow-500'
                                                            }`}>
                                                            {order.status === 'completed' ? 'ВЫДАН' : order.status === 'cancelled' ? 'ОТМЕНЕН' : 'ОЖИДАЕТ'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {order.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                {item.image && <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover border border-white/10" />}
                                                                <div>
                                                                    <div className="text-sm font-bold text-white">{item.name}</div>
                                                                    <div className="text-xs text-white/40 uppercase">
                                                                        {item.color && <span className="mr-2">Цвет: {item.color}</span>}
                                                                        {item.size && <span>Размер: {item.size}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-white">{item.price} ₽ x {item.quantity}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center pt-2">
                                                    <div className="text-xs text-white/40">Итоговая сумма:</div>
                                                    <div className="text-lg font-russo text-emerald-400">{order.totalAmount} ₽</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Verification & Role Settings Modal */}
            {
                isVerifyModalOpen && selectedUserForVerify && (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setIsVerifyModalOpen(false); }}
                    >
                        <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-lg border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 bg-gradient-to-r from-blue-500/20 to-transparent border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                        <BadgeCheck className="text-blue-400" /> Статус и Верификация
                                    </h3>
                                    <p className="text-white/40 text-xs mt-1">{selectedUserForVerify.childName} ({selectedUserForVerify.email})</p>
                                </div>
                                <button onClick={() => setIsVerifyModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/30 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-3">Системная Роль</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setVerifyRole('user')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${verifyRole === 'user' ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'}`}
                                        >
                                            <User size={20} />
                                            <span className="text-xs font-bold">Клиент</span>
                                        </button>
                                        <button
                                            onClick={() => setVerifyRole('trainer')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${verifyRole === 'trainer' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'}`}
                                        >
                                            <Dumbbell size={20} />
                                            <span className="text-xs font-bold">Тренер</span>
                                        </button>
                                        <button
                                            onClick={() => setVerifyRole('admin')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${verifyRole === 'admin' ? 'bg-sparta-gold/10 border-sparta-gold text-sparta-gold' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'}`}
                                        >
                                            <Shield size={20} />
                                            <span className="text-xs font-bold">Админ</span>
                                        </button>
                                        <button
                                            onClick={() => isSuperUser && setVerifyRole('director')}
                                            disabled={!isSuperUser}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${!isSuperUser ? 'opacity-20 grayscale cursor-not-allowed border-white/5' : verifyRole === 'director' ? 'bg-purple-500/10 border-purple-500 text-purple-500' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'}`}
                                            title={!isSuperUser ? "Только для Директоров" : ""}
                                        >
                                            <Star size={20} />
                                            <span className="text-xs font-bold">Директор</span>
                                        </button>
                                        <button
                                            onClick={() => isSuperUser && setVerifyRole('developer')}
                                            disabled={!isSuperUser}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${!isSuperUser ? 'opacity-20 grayscale cursor-not-allowed border-white/5' : verifyRole === 'developer' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500' : 'bg-transparent border-white/10 text-white/40 hover:bg-white/5'}`}
                                            title={!isSuperUser ? "Только для Разработчиков" : ""}
                                        >
                                            <Code size={20} />
                                            <span className="text-xs font-bold">Разраб</span>
                                        </button>
                                    </div>

                                    <div className="text-[8px] text-white/20 mb-4 font-mono">DEBUG: role={verifyRole} coaches={coaches.length}</div>

                                    {verifyRole === 'trainer' && (
                                        <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                                            <label className="block text-[10px] font-bold text-green-500/60 uppercase mb-2 flex items-center gap-2">
                                                <Users size={12} /> Привязать к профилю тренера
                                            </label>

                                            {coaches.length > 0 ? (
                                                <>
                                                    <select
                                                        value={selectedCoachId}
                                                        onChange={(e) => setSelectedCoachId(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors text-sm"
                                                    >
                                                        <option value="">-- Выберите тренера --</option>
                                                        {coaches.map((c: any) => (
                                                            <option key={c.id} value={c.id}>{c.name} ({c.role || 'Тренер'})</option>
                                                        ))}
                                                    </select>
                                                    <p className="mt-2 text-[10px] text-white/30 italic">
                                                        * Это активирует личный кабинет тренера для данного пользователя
                                                    </p>
                                                </>
                                            ) : (
                                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase text-center">
                                                    Нет доступных тренеров! <br />
                                                    Сначала добавьте тренера в разделе "Команда".
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <hr className="border-white/10" />

                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={verifyCustom}
                                                onChange={(e) => setVerifyCustom(e.target.checked)}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${verifyCustom ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${verifyCustom ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                            <BadgeCheck size={16} className={verifyCustom ? 'text-blue-500' : 'text-white/20'} />
                                            Выдать кастомную галочку
                                        </span>
                                    </label>
                                </div>

                                {verifyCustom && (
                                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Название значка (Коротко)</label>
                                            <input
                                                type="text"
                                                value={verifyTitle}
                                                onChange={(e) => setVerifyTitle(e.target.value)}
                                                placeholder="Например: VIP Партнер"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Описание статуса</label>
                                            <textarea
                                                value={verifyDescription}
                                                onChange={(e) => setVerifyDescription(e.target.value)}
                                                placeholder="Будет видно при наведении на галочку в чате"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[80px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-white/5 flex gap-4">
                                <button
                                    onClick={() => setIsVerifyModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-white/50 font-bold hover:bg-white/10 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleUpdateVerification}
                                    className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors"
                                >
                                    СОХРАНИТЬ
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Mass Mail Modal */}
            {
                isMassMailModalOpen && (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setIsMassMailModalOpen(false); }}
                    >
                        <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 bg-gradient-to-r from-blue-600/20 to-transparent border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                        <Send className="text-blue-500" /> Массовая Рассылка
                                    </h3>
                                    <p className="text-white/40 text-xs mt-1">Отправка Push-уведомлений пользователям</p>
                                </div>
                                <button onClick={() => setIsMassMailModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/30 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-3">Кому отправить</label>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                        <button
                                            onClick={() => setMassMailTarget('all')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${massMailTarget === 'all' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-transparent border-white/10 text-white/60 hover:bg-white/5'}`}
                                        >
                                            <Globe size={18} />
                                            <span className="text-[10px] font-bold">Всем ({users.length})</span>
                                        </button>
                                        <button
                                            onClick={() => setMassMailTarget('clients')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${massMailTarget === 'clients' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-transparent border-white/10 text-white/60 hover:bg-white/5'}`}
                                        >
                                            <User size={18} />
                                            <span className="text-[10px] font-bold">Клиентам</span>
                                        </button>
                                        <button
                                            onClick={() => setMassMailTarget('trainers')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${massMailTarget === 'trainers' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-transparent border-white/10 text-white/60 hover:bg-white/5'}`}
                                        >
                                            <Dumbbell size={18} />
                                            <span className="text-[10px] font-bold">Тренерам</span>
                                        </button>
                                        <button
                                            onClick={() => setMassMailTarget('group')}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${massMailTarget === 'group' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-transparent border-white/10 text-white/60 hover:bg-white/5'}`}
                                        >
                                            <User size={18} />
                                            <span className="text-[10px] font-bold">Группе</span>
                                        </button>
                                    </div>
                                </div>

                                {massMailTarget === 'group' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Выберите группу</label>
                                        <select
                                            value={massMailGroupId}
                                            onChange={(e) => setMassMailGroupId(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            <option value="" className="bg-[#1a1a1a] text-white/50">-- Выберите группу --</option>
                                            {groups.map(g => (
                                                <option key={g.id} value={g.id} className="bg-[#1a1a1a]">{g.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Тема уведомления</label>
                                    <input
                                        type="text"
                                        value={massMailTitle}
                                        onChange={(e) => setMassMailTitle(e.target.value)}
                                        placeholder="Например: Отмена тренировок!"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Текст</label>
                                    <textarea
                                        value={massMailMessage}
                                        onChange={(e) => setMassMailMessage(e.target.value)}
                                        placeholder="Введите текст сообщения. Он придет в колокольчик пользователям."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[120px]"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-white/5 flex gap-4">
                                <button
                                    onClick={() => setIsMassMailModalOpen(false)}
                                    disabled={massMailSending}
                                    className="flex-1 px-4 py-3 rounded-xl text-white/50 font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSendMassMail}
                                    disabled={massMailSending}
                                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {massMailSending ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ОТПРАВКА...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} /> ОТПРАВИТЬ УВЕДОМЛЕНИЕ
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Staff Modal */}
            {isCreateStaffModalOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsCreateStaffModalOpen(false); }}
                >
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-md border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white font-russo flex items-center gap-2">
                                    <UserPlus className="text-sparta-gold" size={24} /> Новый сотрудник
                                </h3>
                                <p className="text-white/40 text-xs mt-1">Добавление профиля сотрудника в систему</p>
                            </div>
                            <button onClick={() => setIsCreateStaffModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">ФИО сотрудника *</label>
                                <input
                                    type="text"
                                    value={newStaffName}
                                    onChange={(e) => setNewStaffName(e.target.value)}
                                    placeholder="Иванов Сергей Петрович"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Email (Логин) *</label>
                                <input
                                    type="email"
                                    value={newStaffEmail}
                                    onChange={(e) => setNewStaffEmail(e.target.value)}
                                    placeholder="staff@sparta.ru"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Временный пароль *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newStaffPassword}
                                        onChange={(e) => setNewStaffPassword(e.target.value)}
                                        placeholder="Sparta-7429"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors text-sm font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewStaffPassword(generateTempPassword())}
                                        className="px-3 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                                        title="Сгенерировать случайный пароль"
                                    >
                                        🎲 Сгенерировать
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Контактный телефон</label>
                                <input
                                    type="text"
                                    value={newStaffPhone}
                                    onChange={(e) => setNewStaffPhone(e.target.value)}
                                    placeholder="+7 (999) 000-00-00"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Роль и уровень доступа</label>
                                <select
                                    value={newStaffRole}
                                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors text-sm"
                                >
                                    {['director', 'developer', 'dev'].includes((userProfile?.role || '').toLowerCase()) ? (
                                        <>
                                            <option value="admin">🛡️ Администратор</option>
                                            <option value="director">👑 Директор</option>
                                            <option value="coach">⚽ Тренер</option>
                                            <option value="developer">🛠️ Разработчик</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="coach">⚽ Тренер</option>
                                            <option value="admin">🛡️ Администратор</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsCreateStaffModalOpen(false)}
                                className="px-4 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleCreateStaff}
                                disabled={isCreatingStaff || !newStaffName.trim() || !newStaffEmail.trim()}
                                className="px-6 py-2.5 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                            >
                                {isCreatingStaff ? 'Создание...' : 'Создать сотрудника'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Success Credentials Card Modal */}
            {staffSuccessData && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setStaffSuccessData(null); }}
                >
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-md border border-sparta-gold/30 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                🎉 Данные для входа созданы
                            </h3>
                            <button onClick={() => setStaffSuccessData(null)} className="p-2 rounded-full hover:bg-white/5 text-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-white/60 text-xs mb-6">
                            Учетная запись сотрудника успешно сохранена. Скопируйте данные доступа для передачи сотруднику.
                        </p>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 mb-6">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-white/40 block">Сотрудник</span>
                                <span className="text-sm font-bold text-white">{staffSuccessData.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-white/40 block">Роль</span>
                                    <span className="text-xs font-bold text-sparta-gold">{staffSuccessData.role}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-white/40 block">Ссылка</span>
                                    <span className="text-xs font-mono text-blue-400">http://localhost:3000/login</span>
                                </div>
                            </div>
                            <hr className="border-white/10" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-white/40 block">Логин (Email)</span>
                                <span className="text-sm font-mono text-white font-semibold">{staffSuccessData.email}</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-white/40 block">Временный пароль</span>
                                <span className="text-base font-mono text-sparta-gold font-bold">{staffSuccessData.password}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleCopyStaffCredentials}
                                className="w-full py-3 px-4 bg-sparta-gold hover:bg-yellow-500 text-black font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20"
                            >
                                <Copy size={18} />
                                {isCopiedStaffData ? '✓ Скопировано в буфер!' : '📋 Скопировать данные для сотрудника'}
                            </button>
                            <button
                                onClick={() => setStaffSuccessData(null)}
                                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium rounded-xl text-xs transition-colors"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Account Recovery / Reset Credentials Modal */}
            {isResetCredentialsModalOpen && selectedUserForReset && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsResetCredentialsModalOpen(false); }}
                >
                    <div className="bg-[#18181b] rounded-3xl w-full max-w-lg border border-sparta-gold/30 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6 text-left max-h-[90vh] overflow-y-auto font-manrope">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-russo text-white uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={20} className="text-sparta-gold" />
                                    Восстановление доступа
                                </h3>
                                <p className="text-xs text-white/50 mt-1">
                                    Выдача новых данных для входа при утере email и пароля
                                </p>
                            </div>
                            <button
                                onClick={() => setIsResetCredentialsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Admin Help Card */}
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2">
                            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                                <Sparkles size={16} />
                                💡 Справка для Администратора:
                            </div>
                            <p className="text-[11px] text-white/70 leading-relaxed">
                                Используйте эту функцию, когда пользователь <strong>потерял доступ и к почте, и к паролю</strong>.
                            </p>
                            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-[11px] text-emerald-400 font-semibold flex items-center gap-2">
                                <CheckCircle size={14} className="shrink-0" />
                                Все оплаты, абонементы, баланс и история на 100% сохраняются!
                            </div>
                        </div>

                        {/* User Summary Info */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-white/40 block tracking-wider">Аккаунт</span>
                                <span className="text-sm font-bold text-white">
                                    {selectedUserForReset.childName || selectedUserForReset.name || 'Без имени'}
                                </span>
                                <span className="text-xs text-white/40 block mt-0.5">
                                    {selectedUserForReset.phone || 'Телефон не указан'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-white/40 block tracking-wider">Роль</span>
                                <span className="text-xs font-bold text-sparta-gold uppercase">
                                    {(selectedUserForReset.role as string) === 'coach' ? 'Тренер' : (selectedUserForReset.role as string) === 'student' ? 'Спортсмен' : 'Родитель'}
                                </span>
                            </div>
                        </div>

                        {/* Credentials Form */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-white/60 mb-1.5">
                                    Временный Email (Логин)
                                </label>
                                <input
                                    type="email"
                                    value={tempEmail}
                                    onChange={(e) => setTempEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-sparta-gold transition-colors"
                                    placeholder="temp_user@sparta.ru"
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase font-bold text-white/60 mb-1.5">
                                    Временный Пароль
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={tempPassword}
                                        onChange={(e) => setTempPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sparta-gold font-mono text-base font-bold focus:outline-none focus:border-sparta-gold transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setTempPassword(`Sparta${Math.floor(1000 + Math.random() * 9000)}!`)}
                                        className="px-3 py-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl border border-white/10 text-xs font-bold shrink-0 transition-colors"
                                        title="Сгенерировать новый пароль"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-2">
                            <button
                                onClick={handleSaveTempCredentials}
                                disabled={isSavingTempAccess || !tempEmail || !tempPassword}
                                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isSavedSuccess ? 'bg-emerald-500 text-white' : 'bg-sparta-gold hover:bg-yellow-500 text-black shadow-lg shadow-sparta-gold/20'}`}
                            >
                                {isSavingTempAccess ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Сохранение...
                                    </>
                                ) : isSavedSuccess ? (
                                    <>
                                        <CheckCircle size={18} />
                                        ✓ Временные данные успешно сохранены в базе!
                                    </>
                                ) : (
                                    <>
                                        <Shield size={18} />
                                        Сохранить и Выдать Временный Доступ
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleCopyTempCredentialsTemplate}
                                className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-white/10"
                            >
                                <Copy size={16} className="text-sparta-gold" />
                                {copySuccessMessage ? '✓ Скопировано в буфер обмена!' : '📋 Скопировать текст для WhatsApp / Telegram'}
                            </button>

                            <button
                                onClick={() => setIsResetCredentialsModalOpen(false)}
                                className="w-full py-2.5 px-4 bg-transparent hover:bg-white/5 text-white/40 hover:text-white text-xs font-medium rounded-xl transition-colors"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminUsers;
