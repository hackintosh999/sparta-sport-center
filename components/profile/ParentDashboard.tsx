import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, ChevronRight, Calendar,
    TrendingUp, Activity, MessageSquare, User,
    Trash2, AlertTriangle, Loader2, X,
    KeyRound, QrCode, Sparkles, Copy, Check,
    Heart, Shield, RefreshCw, Trophy, CreditCard,
    Snowflake, Edit3, MapPin, ArrowLeftRight,
    Undo2, History, RotateCcw, ArrowRight, Phone, Clock,
    Compass, Footprints
} from 'lucide-react';
import confetti from 'canvas-confetti';
import StatsSection from './StatsSection';
import AttendanceSection from './AttendanceSection';
import { FamilyScheduleSection } from './FamilyScheduleSection';
import { db } from '../../firebase';
import { collection, query, where, or, onSnapshot, updateDoc, doc, serverTimestamp, Timestamp, addDoc, getDocs } from 'firebase/firestore';
import { Button } from '../UIComponents';
import { LinkChildModal } from './LinkChildModal';
import { UpgradeSubscriptionModal } from './UpgradeSubscriptionModal';
import RouteModal from '../RouteModal';
import ParentMemoModal from '../ParentMemoModal';
import { unlinkChildFromParent, resolveSpartaCoachAndGroup } from '../../utils/studentLinking';
import { resolveChildSubscription, isSubscriptionValid } from '../../utils/subscriptionResolver';
import { SubscriptionStatus } from '../../types/subscription';
import { SPARTA_SCHEDULE } from '../../constants/spartaSchedule';

interface ParentDashboardProps {
    user: any;
    userProfile: any;
    onTabChange?: (tab: string) => void;
    onActiveChildChange?: (child: any) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, userProfile, onTabChange, onActiveChildChange }) => {
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
    const [isKidAccessModalOpen, setIsKidAccessModalOpen] = useState(false);
    const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [freezeDays, setFreezeDays] = useState<number>(7);
    const [freezeReason, setFreezeReason] = useState<string>('illness');
    const [isFreezing, setIsFreezing] = useState(false);
    const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
    const [splitModalTab, setSplitModalTab] = useState<'transfer' | 'history'>('transfer');
    const [familyTransfers, setFamilyTransfers] = useState<any[]>([]);
    const [isReturningTransfer, setIsReturningTransfer] = useState<string | null>(null);
    const [splitTargetChildId, setSplitTargetChildId] = useState<string>('');
    const [splitSessionsCount, setSplitSessionsCount] = useState<number>(2);
    const [isSplitting, setIsSplitting] = useState(false);
    const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);
    const [editChildNameInput, setEditChildNameInput] = useState('');
    const [editChildYearInput, setEditChildYearInput] = useState('');
    const [isSavingChildInfo, setIsSavingChildInfo] = useState(false);
    const [isEditingPin, setIsEditingPin] = useState(false);
    const [customPinInput, setCustomPinInput] = useState('');
    const [isSavingPin, setIsSavingPin] = useState(false);
    const [pinSuccessMsg, setPinSuccessMsg] = useState('');
    const [isProudSent, setIsProudSent] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);

    useEffect(() => {
        const pPhone = (userProfile?.phone || userProfile?.parentPhone || '').trim();
        const pEmail = (user?.email || userProfile?.email || '').trim();
        const uId = user?.uid;

        const conds: any[] = [];
        if (pEmail) conds.push(where('email', '==', pEmail));
        if (uId) conds.push(where('userId', '==', uId));
        if (pPhone) conds.push(where('parentPhone', '==', pPhone));

        if (conds.length === 0) return;

        const q = conds.length > 1 ? query(collection(db, 'requests'), or(...conds)) : query(collection(db, 'requests'), conds[0]);
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((r: any) => ['new', 'contacted'].includes(r.status));
            setPendingRequests(list);
        });

        return () => unsub();
    }, [userProfile?.phone, userProfile?.parentPhone, userProfile?.email, user?.uid, user?.email]);

    useEffect(() => {
        let isMounted = true;
        const unsubscribes: (() => void)[] = [];
        const childrenMap: { [id: string]: any } = {};

        const updateState = () => {
            if (!isMounted) return;
            let updatedChildren = Object.values(childrenMap);

            if (updatedChildren.length === 0 && (userProfile?.childName || userProfile?.subscription || userProfile?.groupId || userProfile?.hasActiveMembership || userProfile?.role === 'parent')) {
                const activeUid = user?.uid || userProfile?.uid || userProfile?.id || 'main_child';
                const kidPin = userProfile?.kidPin || '1920';

                const parentName = (userProfile?.displayName || user?.displayName || '').trim().toLowerCase();
                const rawChildName = (userProfile?.childName || '').trim();
                const isChildNameSameAsParent = rawChildName.toLowerCase() === parentName;
                const safeChildName = (rawChildName && !isChildNameSameAsParent) ? rawChildName : 'Юный спортсмен';

                const selfChild = {
                    id: activeUid,
                    childName: safeChildName,
                    childAge: userProfile?.childAge || (userProfile?.birthYear ? (2026 - Number(userProfile.birthYear)) : undefined),
                    birthYear: userProfile?.birthYear,
                    groupId: userProfile?.groupId,
                    groupName: userProfile?.groupName || 'Группа Sparta',
                    coachName: userProfile?.coachName || 'Тренер Sparta',
                    subscription: userProfile?.subscription,
                    hasActiveMembership: userProfile?.hasActiveMembership,
                    kidPin: kidPin,
                    isVirtualFallback: true,
                    ...userProfile
                };
                updatedChildren = [selfChild];
            }

            setChildren(updatedChildren);
            if (updatedChildren.length > 0) {
                setSelectedChildId(prev => (prev && updatedChildren.find(c => c.id === prev)) ? prev : updatedChildren[0].id);
            }
            setLoading(false);
        };

        const loadFamilyData = async () => {
            const explicitChildIds: string[] = Array.from(new Set(userProfile?.childrenIds || []));
            
            explicitChildIds.forEach((childId: string) => {
                const unsub = onSnapshot(doc(db, 'users', childId), (docSnap) => {
                    if (!isMounted) return;
                    if (docSnap.exists()) {
                        const cData = docSnap.data();
                        let kidPin = cData.kidPin;
                        if (!kidPin) {
                            kidPin = Math.floor(1000 + Math.random() * 9000).toString();
                            updateDoc(doc(db, 'users', childId), { kidPin }).catch(() => {});
                        }
                        childrenMap[childId] = { id: docSnap.id, ...cData, kidPin };
                    }
                    updateState();
                });
                unsubscribes.push(unsub);
            });

            const activeUid = user?.uid || userProfile?.uid || userProfile?.id;
            if (activeUid) {
                const qParentId = query(collection(db, 'users'), where('parentId', '==', activeUid));
                const unsubParent = onSnapshot(qParentId, (snap) => {
                    if (!isMounted) return;
                    snap.docs.forEach(d => {
                        const cData = d.data();
                        let kidPin = cData.kidPin;
                        if (!kidPin) {
                            kidPin = Math.floor(1000 + Math.random() * 9000).toString();
                            updateDoc(doc(db, 'users', d.id), { kidPin }).catch(() => {});
                        }
                        childrenMap[d.id] = { id: d.id, ...cData, kidPin };
                    });
                    updateState();
                });
                unsubscribes.push(unsubParent);
            }

            if (activeUid && (!userProfile?.childName || userProfile.childName === 'Юный спортсмен')) {
                const pPhone = (userProfile?.phone || userProfile?.parentPhone || '').trim();
                const pEmail = (user?.email || userProfile?.email || '').trim().toLowerCase();
                const parentName = (userProfile?.displayName || user?.displayName || '').trim().toLowerCase();

                if (pPhone || pEmail) {
                    try {
                        const reqQuery = pPhone 
                            ? query(collection(db, 'requests'), where('phone', '==', pPhone))
                            : query(collection(db, 'requests'), where('email', '==', pEmail));
                        const reqSnap = await getDocs(reqQuery);

                        for (const rDoc of reqSnap.docs) {
                            const r = rDoc.data();
                            const candidateName = (r.childName || '').trim();
                            if (candidateName && candidateName.toLowerCase() !== parentName && candidateName !== 'Юный спортсмен') {
                                await updateDoc(doc(db, 'users', activeUid), {
                                    childName: candidateName,
                                    ...(r.childBirthYear ? { birthYear: r.childBirthYear, childAge: 2026 - r.childBirthYear } : {}),
                                    ...(r.scheduleId ? { groupId: r.scheduleId } : {}),
                                    ...(r.coachName ? { coachName: r.coachName } : {})
                                }).catch(() => {});
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn('Auto discovery error:', e);
                    }
                }
            }

            if (explicitChildIds.length === 0 && !activeUid) {
                setLoading(false);
            }
        };

        loadFamilyData();

        return () => {
            isMounted = false;
            unsubscribes.forEach(unsub => unsub());
        };
    }, [userProfile?.childrenIds, userProfile?.phone, user?.uid]);

    // Listen to family transfers history for undo / refunds
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'family_transfers'),
            where('parentId', '==', user.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            list.sort((a, b) => {
                const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                return tB - tA;
            });
            setFamilyTransfers(list);
        }, (err) => {
            console.warn('Family transfers snapshot error:', err);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const activeChild = children.find(c => c.id === selectedChildId);
    const activeSubscription = resolveChildSubscription(activeChild, userProfile);
    const hasValidSubscription = isSubscriptionValid(activeSubscription);

    useEffect(() => {
        if (activeChild) {
            onActiveChildChange?.(activeChild);
        }
    }, [activeChild, onActiveChildChange]);

    const { coachName: activeCoachName, groupName: activeGroupName } = activeChild 
        ? resolveSpartaCoachAndGroup(activeChild.groupName, activeChild.coachName, activeChild.birthYear, activeChild.childAge)
        : { coachName: 'Якупов Павел Валерьевич', groupName: 'Основная группа' };

    const handleConfirmUnlink = async () => {
        if (!activeChild || !user?.uid) return;
        setIsUnlinking(true);
        try {
            const res = await unlinkChildFromParent(user.uid, activeChild.id);
            if (res.success) {
                setIsUnlinkModalOpen(false);
                const remaining = children.filter(c => c.id !== activeChild.id);
                if (remaining.length > 0) {
                    setSelectedChildId(remaining[0].id);
                } else {
                    setSelectedChildId(null);
                }
            }
        } catch (e) {
            console.error('Error unlinking child:', e);
        } finally {
            setIsUnlinking(false);
        }
    };

    const handleSendProudCheer = () => {
        setIsProudSent(true);
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#FF4B4B', '#FFD700', '#FFFFFF']
        });

        if (activeChild?.id) {
            updateDoc(doc(db, 'users', activeChild.id), {
                lastCheerAt: serverTimestamp(),
                cheersCount: (activeChild.cheersCount || 0) + 1
            }).catch(() => {});
        }

        setTimeout(() => setIsProudSent(false), 4000);
    };

    const handleSaveCustomPin = async (e?: React.FormEvent) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (!activeChild) return;
        const cleanPin = customPinInput.trim();
        if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
            alert("ПИН-код должен состоять ровно из 4 цифр!");
            return;
        }

        setIsSavingPin(true);
        try {
            await updateDoc(doc(db, 'users', activeChild.id), {
                kidPin: cleanPin
            });
            setChildren(prev => prev.map(c => c.id === activeChild.id ? { ...c, kidPin: cleanPin } : c));
            setPinSuccessMsg('✓ ПИН-код успешно сохранен!');
            setIsEditingPin(false);
            setCustomPinInput('');
            setTimeout(() => setPinSuccessMsg(''), 3000);
        } catch (e) {
            console.error("Error saving custom PIN:", e);
        } finally {
            setIsSavingPin(false);
        }
    };

    const handleConfirmFreeze = async () => {
        if (!activeChild?.id) return;
        setIsFreezing(true);
        try {
            const currentExpiry = activeSubscription?.expiresAt?.toDate 
                ? activeSubscription.expiresAt.toDate() 
                : new Date((activeSubscription?.expiresAt?.seconds || Date.now() / 1000) * 1000);
            
            const newExpiry = new Date(currentExpiry.getTime() + freezeDays * 24 * 60 * 60 * 1000);
            const frozenUntil = new Date(Date.now() + freezeDays * 24 * 60 * 60 * 1000);

            const updatedSub = {
                ...(activeSubscription || {}),
                expiresAt: Timestamp.fromDate(newExpiry),
                isFrozen: true,
                status: 'FROZEN',
                frozenUntil: Timestamp.fromDate(frozenUntil),
                freezeReason: freezeReason,
                updatedAt: serverTimestamp()
            };
            
            await updateDoc(doc(db, 'users', activeChild.id), {
                subscription: updatedSub,
                hasActiveMembership: true
            });

            await addDoc(collection(db, 'notifications'), {
                title: `❄️ Заморозка абонемента: ${activeChild.childName || 'Спортсмен'}`,
                message: `Родитель активировал заморозку на ${freezeDays} дней (${freezeReason === 'illness' ? 'по болезни' : 'отпуск'}). Срок абонемента продлён до ${newExpiry.toLocaleDateString('ru-RU')}.`,
                type: 'freeze_notice',
                coachName: activeCoachName || '',
                scheduleId: activeChild.groupId || '',
                createdAt: Timestamp.now(),
                isRead: false
            }).catch(() => {});

            setIsFreezeModalOpen(false);
            alert(`Абонемент успешно заморожен на ${freezeDays} дней! Новый срок действия: ${newExpiry.toLocaleDateString('ru-RU')}`);
        } catch (e) {
            console.error('Freeze error:', e);
            alert('Ошибка при сохранении заморозки');
        } finally {
            setIsFreezing(false);
        }
    };

    const handleUnfreeze = async () => {
        if (!activeChild?.id) return;
        if (!window.confirm(`Разморозить абонемент для ${activeChild.childName || 'спортсмена'} прямо сейчас?`)) return;
        try {
            await updateDoc(doc(db, 'users', activeChild.id), {
                'subscription.isFrozen': false,
                'subscription.status': 'ACTIVE',
                'subscription.unfrozenAt': serverTimestamp(),
                'subscription.updatedAt': serverTimestamp()
            });
            alert('Заморозка успешно снята! Абонемент снова активен.');
        } catch (e: any) {
            console.error('Unfreeze error:', e);
            alert('Ошибка при разморозке: ' + e.message);
        }
    };

    const handleSplitSubscription = async () => {
        if (!activeChild || !splitTargetChildId || splitSessionsCount <= 0) return;
        
        const donorSub = resolveChildSubscription(activeChild, userProfile);
        const currentRemaining = donorSub?.remainingSessions ?? 0;

        if (currentRemaining < splitSessionsCount) {
            alert('Недостаточно тренировок на балансе для переноса');
            return;
        }

        const targetChild = children.find(c => c.id === splitTargetChildId);
        if (!targetChild) return;

        setIsSplitting(true);
        try {
            const newDonorRemaining = Math.max(0, currentRemaining - splitSessionsCount);
            const donorRef = doc(db, 'users', activeChild.id);
            const donorIsActive = newDonorRemaining > 0;
            const updatedDonorSub = {
                ...(donorSub || {}),
                remainingSessions: newDonorRemaining,
                status: (donorIsActive ? 'ACTIVE' : 'EXPIRED') as SubscriptionStatus,
                isActive: donorIsActive,
                updatedAt: serverTimestamp()
            };
            await updateDoc(donorRef, {
                subscription: updatedDonorSub,
                hasActiveMembership: donorIsActive
            });

            if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                    subscription: updatedDonorSub
                }).catch(() => {});
            }

            const targetRef = doc(db, 'users', targetChild.id);
            const targetSub = resolveChildSubscription(targetChild, userProfile);

            if (targetSub && (targetChild.hasActiveMembership || targetChild.subscription)) {
                const newTargetRemaining = (targetSub.remainingSessions || 0) + splitSessionsCount;
                const newTargetTotal = Math.max(newTargetRemaining, (targetSub.totalSessions || 0) + splitSessionsCount);
                const updatedTargetSub = {
                    ...targetSub,
                    totalSessions: newTargetTotal,
                    remainingSessions: newTargetRemaining,
                    status: 'ACTIVE' as SubscriptionStatus,
                    isActive: true,
                    isFrozen: false,
                    updatedAt: serverTimestamp()
                };
                await updateDoc(targetRef, {
                    subscription: updatedTargetSub,
                    hasActiveMembership: true
                });
            } else {
                const expiryDate = donorSub?.expiresAt 
                    ? (typeof donorSub.expiresAt.toDate === 'function' ? donorSub.expiresAt.toDate() : new Date((donorSub.expiresAt.seconds || (typeof donorSub.expiresAt === 'string' ? new Date(donorSub.expiresAt).getTime() / 1000 : Date.now() / 1000)) * 1000))
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                const newTargetSub = {
                    planId: donorSub?.planId || 'family_split',
                    title: donorSub?.title || `Семейный абонемент (от ${activeChild.childName || 'брата/сестры'})`,
                    childId: targetChild.id,
                    childName: targetChild.childName || targetChild.displayName || 'Спортсмен',
                    parentId: user?.uid || userProfile?.uid || '',
                    cityId: donorSub?.cityId || 'chelyabinsk',
                    cityName: donorSub?.cityName || 'Челябинск',
                    branchId: targetChild.branchId || donorSub?.branchId || 'newton',
                    branchName: targetChild.branchName || donorSub?.branchName || 'ОЦ «Ньютон»',
                    totalSessions: splitSessionsCount,
                    remainingSessions: splitSessionsCount,
                    activatedAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiryDate),
                    status: 'ACTIVE' as SubscriptionStatus,
                    isActive: true,
                    isFrozen: false,
                    freezeDaysAvailable: 14,
                    freezeDaysTotal: 0
                };
                await updateDoc(targetRef, {
                    subscription: newTargetSub,
                    hasActiveMembership: true,
                    membershipExpires: Timestamp.fromDate(expiryDate)
                });
            }

            // Record transfer history doc
            await addDoc(collection(db, 'family_transfers'), {
                parentId: user?.uid || userProfile?.uid || '',
                donorChildId: activeChild.id,
                donorChildName: activeChild.childName || activeChild.displayName || 'Спортсмен',
                recipientChildId: targetChild.id,
                recipientChildName: targetChild.childName || targetChild.displayName || 'Спортсмен',
                sessionsCount: splitSessionsCount,
                returnedCount: 0,
                status: 'completed',
                createdAt: serverTimestamp()
            }).catch(err => console.warn('Record transfer error:', err));

            try {
                await addDoc(collection(db, 'notifications'), {
                    userId: user?.uid || '',
                    title: '⇄ Семейный перенос тренировок',
                    message: `Перенесено ${splitSessionsCount} тренировок от ${activeChild.childName || 'спортсмена'} спортсмену ${targetChild.childName || 'ребёнку'}.`,
                    type: 'SUBSCRIPTION_SPLIT',
                    createdAt: serverTimestamp(),
                    read: false
                });
            } catch (e) {
                console.log('Notification split log:', e);
            }

            confetti({
                particleCount: 100,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#D4AF37', '#FFFFFF', '#10B981']
            });

            alert(`Успешно перенесено ${splitSessionsCount} тренировок спортсмену ${targetChild.childName || 'ребёнку'}!`);
            setIsSplitModalOpen(false);
        } catch (err: any) {
            console.error('Split subscription error:', err);
            alert('Ошибка при переносе: ' + err.message);
        } finally {
            setIsSplitting(false);
        }
    };

    const handleReturnTransfer = async (transfer: any) => {
        const donorChild = children.find(c => c.id === transfer.donorChildId);
        const recipientChild = children.find(c => c.id === transfer.recipientChildId);
        if (!donorChild || !recipientChild) {
            alert('Спортсмен не найден в текущем аккаунте');
            return;
        }

        const recipientSub = resolveChildSubscription(recipientChild, userProfile);
        const recipientRemaining = recipientSub?.remainingSessions ?? 0;
        const alreadyReturned = transfer.returnedCount || 0;
        const pendingInTransfer = Math.max(0, (transfer.sessionsCount || 0) - alreadyReturned);
        const returnableCount = Math.min(pendingInTransfer, recipientRemaining);

        if (returnableCount <= 0) {
            alert('Все переданные тренировки уже были использованы на занятиях и недоступны для возврата.');
            return;
        }

        if (!window.confirm(`Вернуть ${returnableCount} тренировок от ${recipientChild.childName || 'спортсмена'} обратно спортсмену ${donorChild.childName || 'спортсмену'}?`)) return;

        setIsReturningTransfer(transfer.id);
        try {
            // 1. Deduct from recipient
            const newRecipientRemaining = Math.max(0, recipientRemaining - returnableCount);
            const newRecipientTotal = Math.max(newRecipientRemaining, (recipientSub?.totalSessions || returnableCount) - returnableCount);
            const recipientRef = doc(db, 'users', recipientChild.id);
            const recipientIsActive = newRecipientRemaining > 0;
            
            const updatedRecipientSub = {
                ...(recipientSub || {}),
                remainingSessions: newRecipientRemaining,
                totalSessions: newRecipientTotal,
                status: (recipientIsActive ? 'ACTIVE' : 'EXPIRED') as SubscriptionStatus,
                isActive: recipientIsActive,
                updatedAt: serverTimestamp()
            };

            await updateDoc(recipientRef, {
                subscription: updatedRecipientSub,
                hasActiveMembership: recipientIsActive
            });

            // 2. Return to donor
            const donorSub = resolveChildSubscription(donorChild, userProfile);
            const newDonorRemaining = (donorSub?.remainingSessions || 0) + returnableCount;
            const newDonorTotal = Math.max(newDonorRemaining, (donorSub?.totalSessions || 0) + returnableCount);
            const donorRef = doc(db, 'users', donorChild.id);

            if (donorSub && (donorChild.subscription || donorChild.hasActiveMembership)) {
                const updatedDonorSub = {
                    ...donorSub,
                    totalSessions: newDonorTotal,
                    remainingSessions: newDonorRemaining,
                    status: 'ACTIVE' as SubscriptionStatus,
                    isActive: true,
                    updatedAt: serverTimestamp()
                };
                await updateDoc(donorRef, {
                    subscription: updatedDonorSub,
                    hasActiveMembership: true
                });
            } else {
                const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                const newDonorSub = {
                    planId: 'family_return',
                    title: `Возврат занятий (от ${recipientChild.childName || 'брата/сестры'})`,
                    childId: donorChild.id,
                    childName: donorChild.childName || donorChild.displayName || 'Спортсмен',
                    parentId: user?.uid || '',
                    cityId: donorChild.cityId || 'chelyabinsk',
                    cityName: donorChild.cityName || 'Челябинск',
                    branchId: donorChild.branchId || 'newton',
                    branchName: donorChild.branchName || 'ОЦ «Ньютон»',
                    totalSessions: newDonorTotal,
                    remainingSessions: newDonorRemaining,
                    activatedAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiryDate),
                    status: 'ACTIVE' as SubscriptionStatus,
                    isActive: true,
                    isFrozen: false,
                    freezeDaysAvailable: 14,
                    freezeDaysTotal: 0
                };
                await updateDoc(donorRef, {
                    subscription: newDonorSub,
                    hasActiveMembership: true,
                    membershipExpires: Timestamp.fromDate(expiryDate)
                });
            }

            // 3. Update family_transfers document
            const newTotalReturned = alreadyReturned + returnableCount;
            const isFullyRefunded = newTotalReturned >= (transfer.sessionsCount || 0);
            await updateDoc(doc(db, 'family_transfers', transfer.id), {
                returnedCount: newTotalReturned,
                status: isFullyRefunded ? 'refunded' : 'partially_refunded',
                returnedAt: serverTimestamp()
            });

            // 4. Mirror on parent doc
            if (user?.uid) {
                const finalDonorSub = resolveChildSubscription(donorChild, userProfile);
                await updateDoc(doc(db, 'users', user.uid), {
                    subscription: { ...(finalDonorSub || {}), remainingSessions: newDonorRemaining }
                }).catch(() => {});
            }

            // 5. Notification & Confetti
            await addDoc(collection(db, 'notifications'), {
                userId: user?.uid || '',
                title: '↩ Возврат переданных тренировок',
                message: `Возвращено ${returnableCount} тренировок от ${recipientChild.childName || 'спортсмена'} спортсмену ${donorChild.childName || 'спортсмену'}.`,
                type: 'SUBSCRIPTION_REFUND',
                createdAt: serverTimestamp(),
                read: false
            }).catch(() => {});

            confetti({
                particleCount: 120,
                spread: 90,
                origin: { y: 0.6 },
                colors: ['#D4AF37', '#10B981', '#FFFFFF']
            });

            alert(`✓ Успешно возвращено ${returnableCount} тренировок спортсмену ${donorChild.childName || 'спортсмену'}!`);
            setIsSplitModalOpen(false);
        } catch (err: any) {
            console.error('Error returning transfer:', err);
            alert('Ошибка при возврате занятий: ' + err.message);
        } finally {
            setIsReturningTransfer(null);
        }
    };

    const handleRegeneratePin = async () => {
        if (!activeChild?.id) return;
        setIsSavingPin(true);
        try {
            const newPin = Math.floor(1000 + Math.random() * 9000).toString();
            await updateDoc(doc(db, 'users', activeChild.id), {
                kidPin: newPin
            });
            setPinSuccessMsg(`✓ Новый PIN для ${activeChild.childName || 'ребенка'}: ${newPin}`);
            setTimeout(() => setPinSuccessMsg(''), 4000);
        } catch (e: any) {
            console.error('Error generating PIN:', e);
            alert('Ошибка при генерации PIN: ' + e.message);
        } finally {
            setIsSavingPin(false);
        }
    };

    const handleOpenEditChild = () => {
        if (!activeChild) return;
        const currentName = (activeChild.childName === 'Юный спортсмен' || activeChild.childName === userProfile?.displayName)
            ? ''
            : (activeChild.childName || '');
        setEditChildNameInput(currentName);
        setEditChildYearInput(activeChild.birthYear ? String(activeChild.birthYear) : '');
        setIsEditChildModalOpen(true);
    };

    const handleSaveChildInfo = async () => {
        if (!activeChild?.id || !editChildNameInput.trim()) return;
        setIsSavingChildInfo(true);
        try {
            const birthYearNum = parseInt(editChildYearInput) || undefined;
            const childAgeNum = birthYearNum && birthYearNum >= 2005 ? (2026 - birthYearNum) : undefined;
            const updatedName = editChildNameInput.trim();

            const childUpdates: any = {
                childName: updatedName,
                displayName: updatedName
            };
            if (birthYearNum) {
                childUpdates.birthYear = birthYearNum;
                if (childAgeNum) childUpdates.childAge = childAgeNum;
                
                // Auto-match Sparta schedule group
                const matchedSlot = SPARTA_SCHEDULE.find(s => s.birthYears.includes(birthYearNum));
                if (matchedSlot) {
                    childUpdates.groupId = matchedSlot.id;
                    childUpdates.groupName = matchedSlot.streamTitle;
                    childUpdates.coachName = matchedSlot.coachName;
                }
            }

            // 1. Update active child doc
            await updateDoc(doc(db, 'users', activeChild.id), childUpdates);

            // 2. Also update parent's own doc childName if this was a virtual fallback
            if (user?.uid && (activeChild.id === user.uid || activeChild.isVirtualFallback)) {
                await updateDoc(doc(db, 'users', user.uid), {
                    childName: updatedName,
                    ...(childUpdates.birthYear ? { birthYear: childUpdates.birthYear, childAge: childUpdates.childAge } : {}),
                    ...(childUpdates.groupId ? { groupId: childUpdates.groupId, groupName: childUpdates.groupName, coachName: childUpdates.coachName } : {})
                }).catch(() => {});
            }

            // 3. Immediately update local state
            setChildren(prev => prev.map(c => c.id === activeChild.id ? { ...c, ...childUpdates } : c));

            setIsEditChildModalOpen(false);
        } catch (e) {
            console.error('Error saving child info:', e);
            alert('Ошибка при сохранении данных ребенка');
        } finally {
            setIsSavingChildInfo(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-white/40 space-y-3">
                <Loader2 size={32} className="animate-spin text-sparta-gold" />
                <span className="text-xs font-bold uppercase tracking-widest">Загрузка данных семьи...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 pb-20 font-manrope">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-wider flex items-center gap-2.5">
                        <Shield className="text-sparta-gold shrink-0" size={26} />
                        <span>Кабинет Родителя</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-white/50 mt-0.5">
                        Управление детьми, расписанием, абонементами и успехами
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-sparta-gold/15 hover:bg-sparta-gold/25 border border-sparta-gold/40 text-sparta-gold text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-sparta-gold/5"
                    >
                        <Plus size={16} />
                        <span>+ Привязать ребенка</span>
                    </button>
                </div>
            </div>

            {/* Active Trial / Group Request Banner */}
            {pendingRequests.length > 0 && (
                <div className="bg-gradient-to-r from-sparta-gold/15 via-[#1a1710] to-transparent border border-sparta-gold/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 flex items-center justify-center text-sparta-gold shrink-0 border border-sparta-gold/30">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-sparta-gold uppercase tracking-wider">
                                    Активная заявка на тренировку
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold border border-yellow-500/30">
                                    {pendingRequests[0].status === 'new' ? 'На рассмотрении' : 'В работе'}
                                </span>
                            </div>
                            <p className="text-white text-sm font-semibold mt-0.5">
                                {pendingRequests[0].groupTitle ? `Группа «${pendingRequests[0].groupTitle}»` : 'Подбор группы и пробное занятие'}
                                {pendingRequests[0].childFullName ? ` для ${pendingRequests[0].childFullName}` : ''}
                            </p>
                            <p className="text-white/50 text-xs mt-0.5">
                                Администратор свяжется с вами по указанному телефону в течение 15 минут.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onTabChange?.('requests')}
                        className="px-4 py-2 bg-sparta-gold text-black rounded-xl font-bold text-xs hover:brightness-110 transition-all shrink-0 cursor-pointer shadow-md shadow-sparta-gold/20 flex items-center gap-1.5 active:scale-95"
                    >
                        <span>Отслеживать статус</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* Multi-Child Selector Tabs */}
            {children.length > 0 && (
                <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap no-scrollbar">
                    {children.map(child => {
                        const isSelected = selectedChildId === child.id;
                        const childSub = resolveChildSubscription(child, userProfile);
                        const hasActiveSub = isSubscriptionValid(childSub);

                        return (
                            <button
                                key={child.id}
                                onClick={() => setSelectedChildId(child.id)}
                                className={`group relative flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border transition-all duration-300 cursor-pointer shrink-0 ${
                                    isSelected
                                        ? 'bg-gradient-to-r from-sparta-gold via-yellow-400 to-sparta-gold text-black border-sparta-gold shadow-lg shadow-sparta-gold/20 scale-[1.02]'
                                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                                    isSelected ? 'bg-black/15 text-black' : 'bg-white/10 text-sparta-gold'
                                }`}>
                                    🦁
                                </div>
                                <div className="text-left">
                                    <p className={`text-[9px] uppercase font-black tracking-wider leading-none ${
                                        isSelected ? 'text-black/60' : 'text-white/40'
                                    }`}>
                                        {resolveSpartaCoachAndGroup(child.groupName, child.coachName, child.birthYear, child.childAge).groupName}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <p className={`text-xs sm:text-sm font-russo uppercase leading-none ${
                                            isSelected ? 'text-black font-extrabold' : 'text-white'
                                        }`}>
                                            {child.childName || child.displayName || child.childFirstName || 'Ребенок'}
                                        </p>
                                        {hasActiveSub ? (
                                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-400 animate-pulse'}`} title="Активный абонемент" />
                                        ) : (
                                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black/30' : 'bg-white/20'}`} title="Нет активного абонемента" />
                                        )}
                                    </div>
                                </div>
                                {isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0 ml-0.5" />
                                )}
                            </button>
                        );
                    })}

                    {/* Quick Add Child Button */}
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border border-dashed border-sparta-gold/40 hover:border-sparta-gold bg-sparta-gold/10 hover:bg-sparta-gold/20 text-sparta-gold transition-all duration-300 cursor-pointer text-xs font-bold uppercase tracking-wider shrink-0"
                    >
                        <Plus size={16} />
                        <span>Добавить ребёнка</span>
                    </button>
                </div>
            )}

            {children.length === 0 ? (
                <div className="bg-gradient-to-b from-white/5 to-transparent border border-dashed border-white/15 rounded-3xl p-8 sm:p-14 text-center space-y-5">
                    <div className="w-20 h-20 bg-sparta-gold/15 text-sparta-gold rounded-3xl flex items-center justify-center mx-auto border border-sparta-gold/30 shadow-inner">
                        <Users size={40} />
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                        <h3 className="text-2xl font-russo text-white uppercase tracking-wider">
                            Добро пожаловать в Семью Спарты!
                        </h3>
                        <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                            Привяжите профиль вашего ребенка, чтобы видеть его тренировки, расписание группы, продлевать абонемент и общаться с тренером напрямую.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="w-full sm:w-auto min-h-[48px] px-8 py-4 text-xs font-black tracking-[0.2em] shadow-xl shadow-sparta-gold/20"
                        >
                            ➕ ПРИВЯЗАТЬ РЕБЕНКА ПРЯМО СЕЙЧАС
                        </Button>
                        <button
                            type="button"
                            onClick={() => setIsRouteModalOpen(true)}
                            className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-russo text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <MapPin size={16} className="text-sparta-gold" />
                            <span>Схема прохода</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsMemoModalOpen(true)}
                            className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-russo text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <Footprints size={16} className="text-amber-400" />
                            <span>Что взять с собой</span>
                        </button>
                    </div>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {activeChild && (
                        <motion.div
                            key={activeChild.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6 sm:space-y-8"
                        >
                            {/* 1. HERO CHILD STATUS CARD */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                {/* Left/Main Hero Card */}
                                <div className="lg:col-span-2 bg-gradient-to-br from-sparta-gold/20 via-[#18181b] to-black border border-sparta-gold/40 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xl shadow-sparta-gold/5">
                                    <div className="absolute top-0 right-0 w-72 h-72 bg-sparta-gold/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                                    <div className="relative z-10 space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sparta-gold to-yellow-500 flex items-center justify-center text-black shadow-lg shadow-sparta-gold/30 shrink-0 text-3xl">
                                                    ⚽
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-russo text-white uppercase tracking-tight">
                                                            {activeChild.childName || 'Юный спортсмен'}
                                                        </h2>
                                                        <button
                                                            onClick={handleOpenEditChild}
                                                            className="p-1.5 rounded-lg bg-white/10 hover:bg-sparta-gold hover:text-black text-white/60 transition-colors cursor-pointer"
                                                            title="Изменить имя / данные ребёнка"
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        {activeChild.childAge && (
                                                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-bold text-[10px] uppercase border border-white/10">
                                                                {activeChild.childAge} лет
                                                            </span>
                                                        )}
                                                        {hasValidSubscription ? (
                                                            activeSubscription?.isFrozen ? (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase border border-cyan-500/30 flex items-center gap-1">
                                                                    <Snowflake size={10} />
                                                                    Заморожен
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase border border-emerald-500/30 flex items-center gap-1">
                                                                    <Activity size={10} />
                                                                    Активен ({activeSubscription?.remainingSessions ?? 8} зан.)
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/50 font-bold text-[10px] uppercase border border-white/10 flex items-center gap-1">
                                                                Нет абонемента
                                                            </span>
                                                        )}
                                                        {activeGroupName && (
                                                            <span className="px-2.5 py-0.5 rounded-full bg-sparta-gold/15 text-sparta-gold font-bold text-[10px] uppercase border border-sparta-gold/30">
                                                                {activeGroupName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* "Горжусь!" Cheer Button */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleSendProudCheer}
                                                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/10 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/10"
                                                    title="Отправить поддержку ребенку в дневник"
                                                >
                                                    <Heart size={16} className={`text-red-400 ${isProudSent ? 'animate-ping' : ''}`} />
                                                    <span>{isProudSent ? '❤️ Отправлено!' : 'Горжусь! ❤️'}</span>
                                                </button>

                                                <button
                                                    onClick={() => setIsUnlinkModalOpen(true)}
                                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                                                    title="Отвязать ребенка"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Group & Coach details banner */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
                                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                                <Trophy size={18} className="text-sparta-gold shrink-0" />
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-white/40 block">Группа</span>
                                                    <span className="font-bold text-white text-xs sm:text-sm">{activeGroupName}</span>
                                                </div>
                                            </div>
                                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                                                <User size={18} className="text-sparta-gold shrink-0" />
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-white/40 block">Тренер группы</span>
                                                    <span className="font-bold text-white text-xs sm:text-sm">{activeCoachName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Venue Address, Walking Route & Parent Memo Card */}
                                        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-sparta-gold/30 space-y-3.5 shadow-md">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="p-2.5 rounded-xl bg-sparta-gold/15 text-sparta-gold shrink-0 mt-0.5 shadow-sm">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-sparta-gold block">
                                                            Площадка и зал занятий:
                                                        </span>
                                                        <p className="text-xs sm:text-sm font-russo text-white tracking-wide">
                                                            {activeSubscription?.branchName || 'ОЦ «Ньютон», ул. Героя России Родионова, 6А'}
                                                        </p>
                                                        <p className="text-[11px] text-white/60 font-manrope mt-0.5">
                                                            Вход через спортивный манеж, 1 этаж • Раздевалки №3 и №4 • Зона ожидания родителей на 2 этаже
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Child Attendance Today Status */}
                                                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-russo uppercase tracking-wider self-start sm:self-auto shrink-0 shadow-sm">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                                    <span>Ждём на поле</span>
                                                </div>
                                            </div>

                                            {/* Big Tactile Action Buttons (Min 48px height) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRouteModalOpen(true)}
                                                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-sparta-gold to-yellow-500 hover:brightness-110 text-black font-russo text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-sparta-gold/20 cursor-pointer active:scale-95 font-black"
                                                >
                                                    <Compass size={16} />
                                                    <span>Схема прохода и маршрут</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setIsMemoModalOpen(true)}
                                                    className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-russo text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                                                >
                                                    <Footprints size={16} className="text-amber-400" />
                                                    <span>Памятка: что взять с собой</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Action Column */}
                                <div className="space-y-4">
                                    {/* Subscription Quick Card */}
                                    <div className="p-5 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 space-y-3.5 shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                                                Абонемент спортсмена
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {hasValidSubscription && activeSubscription?.isFrozen ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black uppercase flex items-center gap-1">
                                                        <Snowflake size={10} /> Заморожен
                                                    </span>
                                                ) : hasValidSubscription ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase flex items-center gap-1">
                                                        <Activity size={10} /> Активен
                                                    </span>
                                                ) : (
                                                    <CreditCard size={16} className="text-white/30" />
                                                )}
                                            </div>
                                        </div>

                                        {hasValidSubscription && activeSubscription ? (
                                            <>
                                                <div>
                                                    <p className="text-base sm:text-lg font-russo text-sparta-gold uppercase">
                                                        {activeSubscription.title || 'Действующий абонемент'}
                                                    </p>
                                                    
                                                    {/* Branch and City info */}
                                                    {activeSubscription.branchName && (
                                                        <div className="flex items-center gap-1 text-[11px] text-white/70 font-medium mt-0.5">
                                                            <MapPin size={11} className="text-sparta-gold shrink-0" />
                                                            <span>{activeSubscription.branchName}</span>
                                                            {activeSubscription.cityName && (
                                                                <span className="text-white/40">({activeSubscription.cityName})</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-white/50 mt-1">
                                                        {activeSubscription.expiresAt
                                                            ? `Действует до ${new Date((activeSubscription.expiresAt.seconds || activeSubscription.expiresAt._seconds || (typeof activeSubscription.expiresAt === 'string' ? new Date(activeSubscription.expiresAt).getTime() / 1000 : (activeSubscription.expiresAt instanceof Date ? activeSubscription.expiresAt.getTime() / 1000 : Date.now() / 1000))) * 1000).toLocaleDateString('ru-RU')}`
                                                            : 'Тренировки по графику группы'}
                                                    </p>
                                                </div>

                                                {/* Remaining sessions progress bar */}
                                                {activeSubscription.totalSessions ? (
                                                    <div className="space-y-1.5 pt-1 border-t border-white/5">
                                                        <div className="flex justify-between text-xs font-bold">
                                                            <span className="text-white/70">Осталось тренировок:</span>
                                                            <span className="text-sparta-gold font-mono font-bold">
                                                                {activeSubscription.remainingSessions ?? activeSubscription.totalSessions} из {activeSubscription.totalSessions}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                                            <div
                                                                className="bg-gradient-to-r from-sparta-gold to-yellow-400 h-full rounded-full transition-all duration-500"
                                                                style={{
                                                                    width: `${Math.min(100, Math.max(0, (((activeSubscription.remainingSessions ?? activeSubscription.totalSessions) / activeSubscription.totalSessions) * 100)))}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {/* Action buttons */}
                                                {activeSubscription.isFrozen ? (
                                                    <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Snowflake size={15} className="text-cyan-400 shrink-0 animate-pulse" />
                                                            <div className="text-[11px] leading-tight">
                                                                <span className="font-bold block">Заморожен</span>
                                                                <span className="text-cyan-200/60 text-[10px]">
                                                                    до {activeSubscription.frozenUntil
                                                                        ? new Date((activeSubscription.frozenUntil.seconds || activeSubscription.frozenUntil._seconds || Date.now() / 1000) * 1000).toLocaleDateString('ru-RU')
                                                                        : '...'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={handleUnfreeze}
                                                            className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[10px] uppercase transition-all shadow-md cursor-pointer"
                                                        >
                                                            Разморозить
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 pt-1">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setIsFreezeModalOpen(true)}
                                                                className="flex-1 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs uppercase tracking-wider border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                                title="Бесплатная заморозка до 14 дней"
                                                            >
                                                                <Snowflake size={14} />
                                                                <span>Заморозка</span>
                                                            </button>
                                                            <button
                                                                onClick={() => onTabChange?.('subscriptions')}
                                                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                                            >
                                                                <CreditCard size={14} />
                                                                <span>Продлить</span>
                                                            </button>
                                                        </div>

                                                        {/* ⬆ Upgrade Subscription Button */}
                                                        {(() => {
                                                            const isPremium = activeSubscription?.planId === 'plan_premium_14' || (activeSubscription?.title && /премиум/i.test(activeSubscription.title));
                                                            if (isPremium) return null;

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsUpgradeModalOpen(true)}
                                                                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-sparta-gold hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-md shadow-sparta-gold/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                                                                    title="Повысить уровень тарифа с перерасчетом доплаты"
                                                                >
                                                                    <TrendingUp size={14} />
                                                                    <span>⬆ Улучшить тариф</span>
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                                                {/* ⇄ Split / Share in family button */}
                                                <div className="pt-2 border-t border-white/5 space-y-1.5">
                                                    {(() => {
                                                        const rem = activeSubscription.remainingSessions ?? activeSubscription.totalSessions ?? 0;
                                                        const isFrozen = Boolean(activeSubscription.isFrozen);
                                                        const hasSiblings = children.length > 1;
                                                        const isEnabled = rem >= 1 && !isFrozen && hasSiblings;

                                                        return (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        const otherKids = children.filter(c => c.id !== activeChild.id);
                                                                        if (otherKids.length > 0) {
                                                                            setSplitTargetChildId(otherKids[0].id);
                                                                        }
                                                                        setSplitSessionsCount(Math.min(2, rem));
                                                                        setIsSplitModalOpen(true);
                                                                    }}
                                                                    disabled={!isEnabled}
                                                                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                                                        isEnabled
                                                                            ? 'bg-gradient-to-r from-sparta-gold/15 to-amber-500/10 hover:from-sparta-gold/25 hover:to-amber-500/20 border-sparta-gold/35 text-sparta-gold hover:text-yellow-300 shadow-sm cursor-pointer active:scale-95'
                                                                            : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed opacity-60'
                                                                    }`}
                                                                    title={
                                                                        rem < 1
                                                                            ? 'Для передачи необходимо минимум 1 активное занятие'
                                                                            : isFrozen
                                                                            ? 'Разделение недоступно во время заморозки'
                                                                            : !hasSiblings
                                                                            ? 'Добавьте второго ребёнка для передачи тренировок'
                                                                            : 'Передать часть занятий брату или сестре'
                                                                    }
                                                                >
                                                                    <ArrowLeftRight size={14} className={isEnabled ? 'text-sparta-gold' : 'text-white/20'} />
                                                                    <span>⇄ Поделиться занятиями в семье</span>
                                                                </button>
                                                                <p className="text-[10px] text-white/40 text-center leading-tight">
                                                                    Передайте часть оставшихся тренировок брату или сестре
                                                                </p>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </>
                                        ) : (
                                            /* No subscription state */
                                            <div className="space-y-3 pt-1">
                                                <div>
                                                    <p className="text-base font-russo text-white/80 uppercase">
                                                        Нет активного абонемента
                                                    </p>
                                                    <p className="text-xs text-white/40 mt-0.5">
                                                        Для посещения тренировок оформите абонемент или перенесите занятия от брата/сестры.
                                                    </p>
                                                </div>

                                                {/* If another sibling has spare sessions */}
                                                {(() => {
                                                    const siblingDonor = children.find(c => {
                                                        if (c.id === activeChild.id) return false;
                                                        const sSub = resolveChildSubscription(c, userProfile);
                                                        return isSubscriptionValid(sSub) && (sSub?.remainingSessions ?? 0) >= 1;
                                                    });

                                                    if (siblingDonor) {
                                                        const sSub = resolveChildSubscription(siblingDonor, userProfile);
                                                        const rem = sSub?.remainingSessions || 1;
                                                        return (
                                                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sparta-gold/15 to-amber-500/10 border border-sparta-gold/30 text-xs space-y-2">
                                                                <div className="flex items-center gap-1.5 text-sparta-gold font-bold">
                                                                    <Sparkles size={14} />
                                                                    <span className="uppercase text-[10px] tracking-wider font-extrabold">В семье есть свободные тренировки!</span>
                                                                </div>
                                                                <p className="text-white/70 text-[11px] leading-relaxed">
                                                                    У спортсмена <strong className="text-white">{siblingDonor.childName || 'брата/сестры'}</strong> доступно <strong className="text-sparta-gold font-mono">{rem}</strong> зан.
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedChildId(siblingDonor.id);
                                                                        setSplitTargetChildId(activeChild.id);
                                                                        setSplitSessionsCount(Math.min(2, rem));
                                                                        setIsSplitModalOpen(true);
                                                                    }}
                                                                    className="w-full py-2 rounded-xl bg-sparta-gold text-black font-extrabold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer"
                                                                >
                                                                    <ArrowLeftRight size={13} />
                                                                    <span>Перенести тренировки</span>
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                <button
                                                    onClick={() => onTabChange?.('subscriptions')}
                                                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-sparta-gold to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 hover:brightness-110 cursor-pointer"
                                                >
                                                    <CreditCard size={15} />
                                                    <span>Оформить абонемент</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>


                                    {/* Direct Coach Chat Shortcut */}
                                    <button
                                        onClick={() => onTabChange?.('messages_unified')}
                                        className="w-full p-4 rounded-3xl bg-gradient-to-r from-blue-500/15 to-indigo-500/15 border border-blue-500/30 hover:border-blue-500/60 transition-all flex items-center justify-between text-left group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                                <MessageSquare size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-blue-300">На связи в клубе</p>
                                                <p className="text-xs sm:text-sm font-russo text-white uppercase group-hover:text-blue-400 transition-colors">
                                                    Чат с тренером ({activeCoachName.split(' ')[0]})
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-white/30 group-hover:text-blue-400 transition-colors" />
                                    </button>

                                    {/* Direct Club Administrator Support Shortcut */}
                                    <div className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sparta-gold/15 via-[#1b1a15] to-amber-500/10 border border-sparta-gold/35 hover:border-sparta-gold/60 transition-all shadow-xl shadow-sparta-gold/5 space-y-3">
                                        <div
                                            onClick={() => onTabChange?.('messages')}
                                            className="flex items-center justify-between cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md shadow-sparta-gold/10">
                                                    <MessageSquare size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-black tracking-wider text-amber-300">Сервис и забота • 09:00 – 21:00</p>
                                                    <h4 className="text-sm sm:text-base font-russo text-white uppercase group-hover:text-sparta-gold transition-colors">
                                                        Администрация клуба
                                                    </h4>
                                                    <p className="text-[11px] text-white/50 mt-0.5">
                                                        Справки о болезни, перерасчёт абонементов и любые вопросы
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-white/30 group-hover:text-sparta-gold transition-colors shrink-0" />
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => onTabChange?.('messages')}
                                                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-400 hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 cursor-pointer"
                                            >
                                                <MessageSquare size={15} />
                                                <span>Связаться с администратором</span>
                                            </button>

                                            <a
                                                href="tel:+73512301269"
                                                onClick={(e) => e.stopPropagation()}
                                                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sparta-gold/40 text-white transition-all flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap cursor-pointer"
                                                title="Позвонить в администрацию клуба"
                                            >
                                                <Phone size={14} className="text-sparta-gold" />
                                                <span className="font-mono text-xs">+7 (351) 230-12-69</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. FAST KID ACCESS BAR (QR + PIN + In-Site Management) */}
                            <div className="bg-gradient-to-r from-amber-500/15 via-[#1a1a1e] to-black border border-sparta-gold/35 rounded-3xl p-5 sm:p-6 shadow-xl shadow-sparta-gold/5 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold flex items-center justify-center shrink-0 shadow-md">
                                            <QrCode size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] bg-sparta-gold text-black font-black uppercase px-2 py-0.5 rounded-md">
                                                    🦁 Вход для ребенка
                                                </span>
                                                <span className="text-xs text-white/80 font-bold">
                                                    PIN Чемпиона: <strong className="text-sparta-gold font-russo tracking-widest text-base px-1.5 py-0.5 bg-black/60 rounded-lg border border-sparta-gold/30">{activeChild.kidPin || '1920'}</strong>
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/50 mt-1">
                                                Ребенок вводит эти 4 цифры на сайте и мгновенно попадает в свой «Дневник Чемпиона» без пароля
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <button
                                            type="button"
                                            onClick={() => setIsKidAccessModalOpen(true)}
                                            className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-sparta-gold text-black font-extrabold text-xs hover:brightness-110 shadow-lg shadow-sparta-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <QrCode size={16} />
                                            <span>Показать QR и PIN</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingPin(true);
                                                setIsKidAccessModalOpen(true);
                                            }}
                                            className="px-3.5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
                                            title="Сменить PIN"
                                        >
                                            <KeyRound size={15} className="text-sparta-gold" />
                                            <span>Сменить PIN</span>
                                        </button>
                                    </div>
                                </div>

                                {pinSuccessMsg && (
                                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center">
                                        {pinSuccessMsg}
                                    </div>
                                )}
                            </div>

                            {/* 3. WEEKLY GROUP SCHEDULE */}
                            <FamilyScheduleSection
                                childProfile={activeChild}
                                parentUser={user}
                            />

                            {/* 4. DETAILED STATS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={22} className="text-sparta-gold" />
                                    <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">
                                        Успехи, навыки и динамика
                                    </h3>
                                </div>
                                <StatsSection
                                    userProfile={activeChild}
                                    orders={[]}
                                    requests={[]}
                                    isParentView={true}
                                />
                            </div>

                            {/* 4. ATTENDANCE SECTION */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Calendar size={22} className="text-sparta-gold" />
                                    <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">
                                        Посещаемость и тренировки
                                    </h3>
                                </div>
                                <AttendanceSection userProfile={activeChild} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Link & Create Child Modal */}
            <LinkChildModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                parentId={user?.uid || userProfile?.uid || userProfile?.id || ''}
                parentName={userProfile?.parentName || userProfile?.displayName || user?.displayName || 'Родитель'}
                initialPhone={userProfile?.phone || userProfile?.parentPhone || ''}
                onSuccess={() => {}}
            />

            {/* Unlink Child Confirmation Modal */}
            <AnimatePresence>
                {isUnlinkModalOpen && activeChild && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsUnlinkModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#121214] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="relative z-10 space-y-5">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/20">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <button onClick={() => setIsUnlinkModalOpen(false)} className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-xl font-russo text-white uppercase tracking-wider mb-2">Отвязать профиль?</h3>
                                    <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                                        Вы уверены, что хотите отвязать профиль спортсмена <strong className="text-white uppercase">{activeChild.childName || activeChild.childFirstName}</strong> от вашего кабинета?
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        onClick={() => setIsUnlinkModalOpen(false)}
                                        disabled={isUnlinking}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleConfirmUnlink}
                                        disabled={isUnlinking}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-russo rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isUnlinking ? <Loader2 size={16} className="animate-spin" /> : 'Отвязать'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Kid Access & PIN Modal */}
            <AnimatePresence>
                {isKidAccessModalOpen && activeChild && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsKidAccessModalOpen(false);
                                setIsEditingPin(false);
                            }}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#16161a] border border-sparta-gold/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center">
                                        <QrCode size={18} />
                                    </div>
                                    <span className="text-xs font-russo text-white uppercase tracking-wider">
                                        Детский вход на сайте
                                    </span>
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsKidAccessModalOpen(false);
                                        setIsEditingPin(false);
                                    }} 
                                    className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <h3 className="text-lg sm:text-xl font-russo text-white uppercase mb-1">
                                «Дневник Чемпиона» для {activeChild.childName || 'ребенка'}
                            </h3>
                            <p className="text-xs text-white/50 mb-4">
                                Ребенок может войти со своего телефона или планшета
                            </p>

                            {/* QR Code Frame */}
                            <div className="bg-black/60 border border-sparta-gold/30 rounded-3xl p-4 mb-4 inline-block mx-auto shadow-inner">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/dashboard?pin=${activeChild.kidPin || '1920'}&child=${encodeURIComponent(activeChild.childName || '')}` : `https://sparta-sports-center.vercel.app/dashboard?pin=${activeChild.kidPin || '1920'}`)}&color=0-0-0&bgcolor=212-175-55`}
                                    alt="QR для входа ребенка"
                                    className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl bg-sparta-gold p-2 mx-auto shadow-lg"
                                />
                                <p className="text-[10px] text-amber-200 font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-1">
                                    <Sparkles size={12} className="text-sparta-gold" /> Наведите камеру телефона
                                </p>
                            </div>

                            {/* 4-digit PIN Code display & In-Site Edit */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-white/60 uppercase font-bold">
                                        4-значный PIN Чемпиона:
                                    </span>
                                    <button
                                        onClick={handleRegeneratePin}
                                        disabled={isSavingPin}
                                        className="text-[10px] text-sparta-gold hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <RefreshCw size={11} className={isSavingPin ? 'animate-spin' : ''} />
                                        Случайный PIN
                                    </button>
                                </div>

                                {!isEditingPin ? (
                                    <div className="flex justify-center gap-2 py-1">
                                        {String(activeChild.kidPin || '1920').split('').map((digit: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="w-10 h-12 rounded-xl bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold font-russo text-xl flex items-center justify-center font-bold shadow-inner"
                                            >
                                                {digit}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={customPinInput}
                                            onChange={(e) => setCustomPinInput(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Новый PIN (4 цифры)"
                                            className="w-44 mx-auto text-center font-russo text-lg py-2 bg-black/60 border border-sparta-gold/60 text-sparta-gold rounded-xl outline-none"
                                            autoFocus
                                        />
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={handleSaveCustomPin}
                                                disabled={isSavingPin || customPinInput.length !== 4}
                                                className="px-4 py-1.5 bg-sparta-gold text-black font-bold text-xs rounded-lg disabled:opacity-50 cursor-pointer"
                                            >
                                                {isSavingPin ? 'Сохранение...' : 'Сохранить PIN'}
                                            </button>
                                            <button
                                                onClick={() => setIsEditingPin(false)}
                                                className="px-3 py-1.5 bg-white/10 text-white/60 font-bold text-xs rounded-lg cursor-pointer"
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    const link = `${window.location.origin}/dashboard?pin=${activeChild.kidPin || '1920'}`;
                                    navigator.clipboard.writeText(link);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                            >
                                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                                <span>{copied ? '✓ Ссылка скопирована!' : 'Скопировать ссылку для входа'}</span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Freezing Modal */}
            <AnimatePresence>
                {isFreezeModalOpen && activeChild && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFreezeModalOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#16161a] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-left"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                                        <Snowflake size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-russo text-white uppercase">
                                            Заморозка абонемента
                                        </h3>
                                        <p className="text-[11px] text-white/50">
                                            Бесплатно до 14 дней в год
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsFreezeModalOpen(false)} 
                                    className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-2">
                                        📅 Срок заморозки:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[7, 14].map(days => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setFreezeDays(days)}
                                                className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    freezeDays === days
                                                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                                                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                                }`}
                                            >
                                                ❄️ {days} дней
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-2">
                                        💬 Причина заморозки:
                                    </label>
                                    <div className="space-y-2">
                                        {[
                                            { id: 'illness', label: '🤒 Болезнь / Больничный' },
                                            { id: 'vacation', label: '🏖️ Отпуск / Поездка' },
                                            { id: 'family', label: '🏡 Семейные обстоятельства' }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setFreezeReason(item.id)}
                                                className={`w-full p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                                                    freezeReason === item.id
                                                        ? 'bg-white/15 border-cyan-400 text-white'
                                                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs leading-relaxed">
                                    ℹ️ Срок окончания абонемента автоматически продлится на <strong>{freezeDays} дней</strong>, а тренеру уйдёт уведомление в журнал.
                                </div>

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsFreezeModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmFreeze}
                                        disabled={isFreezing}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                                    >
                                        {isFreezing ? <Loader2 size={16} className="animate-spin" /> : '❄️ Заморозить'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Split / Share Subscription Modal */}
            <AnimatePresence>
                {isSplitModalOpen && activeChild && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSplitModalOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-[#16161a] border border-sparta-gold/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-left"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center border border-sparta-gold/30">
                                        <ArrowLeftRight size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-russo text-white uppercase">
                                            Семейный трансфер занятий
                                        </h3>
                                        <p className="text-[11px] text-white/50">
                                            Перенос и возврат тренировок между братьями и сёстрами
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSplitModalOpen(false)}
                                    className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Mode Tabs */}
                            <div className="flex gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl mb-4">
                                <button
                                    type="button"
                                    onClick={() => setSplitModalTab('transfer')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        splitModalTab === 'transfer'
                                            ? 'bg-sparta-gold text-black shadow-md font-extrabold'
                                            : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <ArrowLeftRight size={13} />
                                    <span>Передать занятия</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSplitModalTab('history')}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                        splitModalTab === 'history'
                                            ? 'bg-sparta-gold text-black shadow-md font-extrabold'
                                            : 'text-white/60 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <History size={13} />
                                    <span>История и возврат</span>
                                    {familyTransfers.filter(t => t.status !== 'refunded').length > 0 && (
                                        <span className={`px-1.5 py-0.2 text-[10px] font-mono font-black rounded-full ${
                                            splitModalTab === 'history' ? 'bg-black text-sparta-gold' : 'bg-sparta-gold text-black'
                                        }`}>
                                            {familyTransfers.filter(t => t.status !== 'refunded').length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {splitModalTab === 'transfer' ? (
                                (() => {
                                    const rem = activeSubscription?.remainingSessions ?? activeSubscription?.totalSessions ?? 0;
                                    const otherChildren = children.filter(c => c.id !== activeChild.id);

                                    if (otherChildren.length === 0) {
                                        return (
                                            <div className="space-y-4 text-center py-4">
                                                <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/15 text-sparta-gold flex items-center justify-center border border-sparta-gold/30 shadow-inner">
                                                    <Users size={28} />
                                                </div>
                                                <div className="space-y-1.5 max-w-xs mx-auto">
                                                    <h4 className="text-base font-russo text-white uppercase">
                                                        Один ребёнок в профиле
                                                    </h4>
                                                    <p className="text-xs text-white/60 leading-relaxed">
                                                        У вас добавлен один ребёнок. Добавьте второго ребёнка (+ Привязать ребёнка), чтобы разделить абонемент и тренировки.
                                                    </p>
                                                </div>
                                                <div className="pt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsSplitModalOpen(false);
                                                            setIsLinkModalOpen(true);
                                                        }}
                                                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sparta-gold to-yellow-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
                                                    >
                                                        <Plus size={16} />
                                                        <span>+ Привязать ребёнка</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {/* Donor Box */}
                                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] uppercase font-bold text-white/40 block">От кого:</span>
                                                    <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                                        👦 {activeChild.childName || activeChild.displayName || 'Спортсмен'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-white/40 block">Доступно:</span>
                                                    <span className="text-sm font-russo text-sparta-gold font-mono">{rem} зан.</span>
                                                </div>
                                            </div>

                                            {/* Recipient Selector */}
                                            <div>
                                                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                                                    Кому передать тренировки:
                                                </label>
                                                <div className="space-y-2">
                                                    {otherChildren.map((child) => {
                                                        const isSelected = splitTargetChildId === child.id;
                                                        const recipientSub = resolveChildSubscription(child, userProfile);
                                                        const recipientRem = recipientSub?.remainingSessions ?? 0;
                                                        return (
                                                            <button
                                                                key={child.id}
                                                                type="button"
                                                                onClick={() => setSplitTargetChildId(child.id)}
                                                                className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-sparta-gold/15 border-sparta-gold text-white shadow-md shadow-sparta-gold/10'
                                                                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                                                                        isSelected ? 'bg-sparta-gold text-black' : 'bg-white/10 text-white'
                                                                    }`}>
                                                                        👦
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs sm:text-sm font-bold text-white">
                                                                            {child.childName || child.displayName || 'Спортсмен'}
                                                                        </div>
                                                                        <div className="text-[10px] text-white/40">
                                                                            {child.groupName || 'Группа Sparta'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[11px] text-sparta-gold font-mono font-bold block">
                                                                        {recipientRem > 0 ? `${recipientRem} зан.` : 'Нет абонемента'}
                                                                    </span>
                                                                    <span className="text-[9px] text-white/30">текущий остаток</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Amount Selector */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                                                        Сколько занятий передать:
                                                    </label>
                                                    <span className="text-xs text-sparta-gold font-bold">
                                                        Останется: {Math.max(0, rem - splitSessionsCount)} зан.
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSplitSessionsCount(prev => Math.max(1, prev - 1))}
                                                        disabled={splitSessionsCount <= 1}
                                                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="flex-1 text-center">
                                                        <span className="text-2xl font-russo text-white">{splitSessionsCount}</span>
                                                        <span className="text-xs text-white/50 block font-medium">
                                                            {splitSessionsCount === 1 ? 'занятие' : splitSessionsCount < 5 ? 'занятия' : 'занятий'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSplitSessionsCount(prev => Math.min(rem, prev + 1))}
                                                        disabled={splitSessionsCount >= rem}
                                                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Quick select buttons */}
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {[1, 2, 4].filter(num => num <= rem).map(num => (
                                                        <button
                                                            key={num}
                                                            type="button"
                                                            onClick={() => setSplitSessionsCount(num)}
                                                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                                splitSessionsCount === num
                                                                    ? 'bg-sparta-gold/20 border-sparta-gold text-sparta-gold'
                                                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                                            }`}
                                                        >
                                                            {num} зан.
                                                        </button>
                                                    ))}
                                                    {rem >= 4 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSplitSessionsCount(Math.floor(rem / 2))}
                                                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                                splitSessionsCount === Math.floor(rem / 2)
                                                                    ? 'bg-sparta-gold/20 border-sparta-gold text-sparta-gold'
                                                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                                            }`}
                                                        >
                                                            ½ ({Math.floor(rem / 2)})
                                                        </button>
                                                    )}
                                                    {rem >= 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSplitSessionsCount(rem)}
                                                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                                splitSessionsCount === rem
                                                                    ? 'bg-sparta-gold/30 border-sparta-gold text-sparta-gold font-extrabold'
                                                                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                                                            }`}
                                                        >
                                                            Все ({rem})
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-sparta-gold/20 text-sparta-gold text-xs leading-relaxed">
                                                ℹ️ Занятия спишутся у <strong>{activeChild.childName || 'спортсмена'}</strong> и мгновенно начислятся на баланс выбранного ребёнка.
                                            </div>

                                            {/* Submit & Cancel Buttons */}
                                            <div className="flex gap-2.5 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSplitModalOpen(false)}
                                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                                >
                                                    Отмена
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSplitSubscription}
                                                    disabled={isSplitting || !splitTargetChildId || splitSessionsCount <= 0}
                                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 cursor-pointer"
                                                >
                                                    {isSplitting ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ArrowLeftRight size={14} />
                                                            <span>Подтвердить и перенести</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                /* History & Return Tab */
                                <div className="space-y-4">
                                    {familyTransfers.length === 0 ? (
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2 py-8">
                                            <History size={32} className="mx-auto text-white/30" />
                                            <h4 className="text-sm font-russo text-white uppercase">Нет истории переводов</h4>
                                            <p className="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
                                                В вашей семье пока не было передач занятий. Все выполненные переводы сохраняются здесь с возможностью мгновенного возврата.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                            {familyTransfers.map(transfer => {
                                                const donorChild = children.find(c => c.id === transfer.donorChildId);
                                                const recipientChild = children.find(c => c.id === transfer.recipientChildId);
                                                const recipientSub = resolveChildSubscription(recipientChild, userProfile);
                                                const recipientRemaining = recipientSub?.remainingSessions ?? 0;
                                                const pendingInTransfer = Math.max(0, (transfer.sessionsCount || 0) - (transfer.returnedCount || 0));
                                                const availableToRefund = Math.min(pendingInTransfer, recipientRemaining);
                                                const isFullyRefunded = transfer.status === 'refunded' || pendingInTransfer <= 0;
                                                const isUsedUp = !isFullyRefunded && availableToRefund <= 0;

                                                const transferDate = transfer.createdAt?.toDate 
                                                    ? transfer.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : 'Недавно';

                                                return (
                                                    <div key={transfer.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                                                    <span>👦 {transfer.donorChildName}</span>
                                                                    <ArrowRight size={12} className="text-sparta-gold shrink-0" />
                                                                    <span>👦 {transfer.recipientChildName}</span>
                                                                </div>
                                                                <p className="text-[10px] text-white/40 mt-0.5">
                                                                    {transferDate}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xs font-russo text-sparta-gold font-mono block">
                                                                    {transfer.sessionsCount} зан.
                                                                </span>
                                                                <span className="text-[9px] uppercase font-bold text-white/40">передано</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                                                            {isFullyRefunded ? (
                                                                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                                                    ✓ Полностью возвращено
                                                                </span>
                                                            ) : isUsedUp ? (
                                                                <span className="text-white/40 text-[10px] leading-tight" title="Все переданные тренировки уже списаны на занятиях">
                                                                    ⚠️ Все занятия уже использованы
                                                                </span>
                                                            ) : (
                                                                <div className="text-[11px]">
                                                                    <span className="text-white/60">К возврату: </span>
                                                                    <strong className="text-sparta-gold font-mono font-bold">{availableToRefund} из {transfer.sessionsCount} зан.</strong>
                                                                </div>
                                                            )}

                                                            {availableToRefund > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReturnTransfer(transfer)}
                                                                    disabled={isReturningTransfer === transfer.id}
                                                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-sparta-gold text-sparta-gold hover:text-black font-extrabold text-[11px] uppercase tracking-wider border border-sparta-gold/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                                >
                                                                    {isReturningTransfer === transfer.id ? (
                                                                        <Loader2 size={13} className="animate-spin" />
                                                                    ) : (
                                                                        <Undo2 size={13} />
                                                                    )}
                                                                    <span>↩ Вернуть ({availableToRefund})</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsSplitModalOpen(false)}
                                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            Закрыть
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Child Profile Modal */}
            <AnimatePresence>
                {isEditChildModalOpen && activeChild && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditChildModalOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#16161a] border border-sparta-gold/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-left"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center border border-sparta-gold/30">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-russo text-white uppercase">
                                            Данные спортсмена
                                        </h3>
                                        <p className="text-[11px] text-white/50">
                                            ФИО ребёнка и возраст для журнала тренера
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsEditChildModalOpen(false)} 
                                    className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleSaveChildInfo(); }} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-1.5">
                                        ⚽ ФИО ребёнка / спортсмена:
                                    </label>
                                    <input
                                        type="text"
                                        value={editChildNameInput}
                                        onChange={(e) => setEditChildNameInput(e.target.value)}
                                        placeholder="Например: Тепляшин Артём"
                                        required
                                        className="w-full h-11 px-3.5 bg-black/60 border border-white/15 rounded-xl text-white text-sm focus:border-sparta-gold outline-none transition-all placeholder:text-white/30"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/70 mb-1.5">
                                        📅 Год рождения:
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={editChildYearInput}
                                        onChange={(e) => setEditChildYearInput(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Например: 2018"
                                        className="w-full h-11 px-3.5 bg-black/60 border border-white/15 rounded-xl text-white text-sm focus:border-sparta-gold outline-none transition-all placeholder:text-white/30 font-mono"
                                    />
                                </div>

                                <div className="flex gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditChildModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingChildInfo || !editChildNameInput.trim()}
                                        className="flex-1 py-3 rounded-xl bg-sparta-gold text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 hover:brightness-110 cursor-pointer disabled:opacity-50"
                                    >
                                        {isSavingChildInfo ? <Loader2 size={16} className="animate-spin" /> : '✓ Сохранить'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Upgrade Subscription Modal */}
            <UpgradeSubscriptionModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                activeChild={activeChild}
                activeSubscription={activeSubscription}
                user={user}
                userProfile={userProfile}
            />

            {/* Route & Entrance Map Modal */}
            <RouteModal
                isOpen={isRouteModalOpen}
                onClose={() => setIsRouteModalOpen(false)}
            />

            {/* Parent Preparation & Checklist Memo Modal */}
            <ParentMemoModal
                isOpen={isMemoModalOpen}
                onClose={() => setIsMemoModalOpen(false)}
                onOpenRoute={() => {
                    setIsMemoModalOpen(false);
                    setIsRouteModalOpen(true);
                }}
            />
        </div>
    );
};

export default ParentDashboard;