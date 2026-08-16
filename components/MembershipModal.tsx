import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Wallet, Smartphone, ShieldCheck, Zap, Star, Trophy, Tag, Loader2, ChevronRight, ArrowLeft, User, Building, Clock, Sparkles, FileText, Calendar, Shield } from 'lucide-react';
import { Button, GlassCard } from './UIComponents';
import { Program } from '../types';
import { db } from '../firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, getDoc, setDoc, query, where, getDocs, arrayUnion, deleteField, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import MembershipReceipt from './profile/MembershipReceipt';

interface MembershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    program: Program | null;
    duration: number;
    price: number;
    mode?: 'purchase' | 'renew' | 'upgrade';
    onOpenAuth?: () => void;
}

import { SPARTA_SCHEDULE, ScheduleSlot, declineChildName } from '../constants/spartaSchedule';

const MembershipModal: React.FC<MembershipModalProps> = ({
    isOpen,
    onClose,
    program,
    duration,
    price,
    mode = 'purchase',
    onOpenAuth
}) => {
    const { user, userProfile } = useAuth();
    const [step, setStep] = useState<'details' | 'athlete' | 'payment'>('details');
    const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'robokassa' | 'invoice' | 'balance' | null>('sbp');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Step 2 Athlete Personalization State
    const [childName, setChildName] = useState('');
    const [birthYearInput, setBirthYearInput] = useState<string>('2017');
    const [selectedBirthYear, setSelectedBirthYear] = useState<number>(2017);
    const [selectedSlotId, setSelectedSlotId] = useState<string>('yakupov_1');
    const [selectedBranch, setSelectedBranch] = useState('south');
    const [childrenCounts, setChildrenCounts] = useState<Record<string, number>>({});
    const [hasExistingGroup, setHasExistingGroup] = useState<boolean>(false);
    const [existingGroupName, setExistingGroupName] = useState<string>('');
    const [showChangeGroup, setShowChangeGroup] = useState<boolean>(false);

    // Auto-sync child data and group assignment from profile / linked kids / trials
    useEffect(() => {
        if (!isOpen) return;

        const loadActiveAthleteInfo = async () => {
            // 1. Direct child fields on userProfile (e.g. if student logged in)
            if (userProfile?.childName || userProfile?.childFirstName) {
                const name = userProfile.childName || `${userProfile.childLastName || ''} ${userProfile.childFirstName || ''}`.trim() || userProfile.displayName;
                if (name) setChildName(name);

                if (userProfile.birthYear) {
                    const y = Number(userProfile.birthYear);
                    setSelectedBirthYear(y);
                    setBirthYearInput(y.toString());
                } else if (userProfile.birthDate) {
                    const match = userProfile.birthDate.match(/(19|20)\d{2}/);
                    if (match) {
                        const y = parseInt(match[0], 10);
                        setSelectedBirthYear(y);
                        setBirthYearInput(userProfile.birthDate);
                    }
                } else if (userProfile.childAge) {
                    const y = 2026 - Number(userProfile.childAge);
                    setSelectedBirthYear(y);
                    setBirthYearInput(y.toString());
                }

                if (userProfile.slotId || userProfile.groupId) {
                    const targetId = userProfile.slotId || userProfile.groupId;
                    const matchedSlot = SPARTA_SCHEDULE.find(s => s.id === targetId);
                    if (matchedSlot) {
                        setSelectedSlotId(matchedSlot.id);
                        setHasExistingGroup(true);
                        setExistingGroupName(userProfile.groupName || matchedSlot.streamTitle);
                    }
                }
                return;
            }

            // 2. Parent's linked children in users collection
            if (userProfile?.childrenIds && userProfile.childrenIds.length > 0) {
                try {
                    const firstChildId = userProfile.childrenIds[0];
                    const childDoc = await getDoc(doc(db, 'users', firstChildId));
                    if (childDoc.exists()) {
                        const cData = childDoc.data();
                        const name = cData.childName || `${cData.childLastName || ''} ${cData.childFirstName || ''}`.trim() || cData.name || cData.displayName;
                        if (name) setChildName(name);

                        if (cData.birthYear) {
                            const y = Number(cData.birthYear);
                            setSelectedBirthYear(y);
                            setBirthYearInput(y.toString());
                        } else if (cData.birthDate) {
                            const match = cData.birthDate.match(/(19|20)\d{2}/);
                            if (match) {
                                const y = parseInt(match[0], 10);
                                setSelectedBirthYear(y);
                                setBirthYearInput(cData.birthDate);
                            }
                        } else if (cData.childAge) {
                            const y = 2026 - Number(cData.childAge);
                            setSelectedBirthYear(y);
                            setBirthYearInput(y.toString());
                        }

                        if (cData.slotId || cData.groupId) {
                            const targetId = cData.slotId || cData.groupId;
                            const matchedSlot = SPARTA_SCHEDULE.find(s => s.id === targetId);
                            if (matchedSlot) {
                                setSelectedSlotId(matchedSlot.id);
                                setHasExistingGroup(true);
                                setExistingGroupName(cData.groupName || matchedSlot.streamTitle);
                            }
                        }
                        return;
                    }
                } catch (err) {
                    console.error('Error fetching linked child in MembershipModal:', err);
                }
            }

            // 3. Check trial booking for parent's phone
            const parentPhone = userProfile?.phone || user?.phone || userProfile?.parentPhone;
            if (parentPhone) {
                try {
                    const qTrials = query(collection(db, 'trials'), where('parentPhone', '==', parentPhone));
                    const trialsSnap = await getDocs(qTrials);
                    if (!trialsSnap.empty) {
                        const latestTrial = trialsSnap.docs[trialsSnap.docs.length - 1].data();
                        if (latestTrial.childName) setChildName(latestTrial.childName);
                        if (latestTrial.birthYear) {
                            const y = Number(latestTrial.birthYear);
                            setSelectedBirthYear(y);
                            setBirthYearInput(y.toString());
                        } else if (latestTrial.birthDate) {
                            const match = latestTrial.birthDate.match(/(19|20)\d{2}/);
                            if (match) {
                                const y = parseInt(match[0], 10);
                                setSelectedBirthYear(y);
                                setBirthYearInput(latestTrial.birthDate);
                            }
                        } else if (latestTrial.childAge) {
                            const y = 2026 - Number(latestTrial.childAge);
                            setSelectedBirthYear(y);
                            setBirthYearInput(y.toString());
                        }

                        if (latestTrial.slotId) {
                            const matchedSlot = SPARTA_SCHEDULE.find(s => s.id === latestTrial.slotId);
                            if (matchedSlot) {
                                setSelectedSlotId(matchedSlot.id);
                                setHasExistingGroup(true);
                                setExistingGroupName(latestTrial.streamTitle || matchedSlot.streamTitle);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching trial in MembershipModal:', err);
                }
            }
        };

        loadActiveAthleteInfo();
    }, [isOpen, userProfile, user]);

    useEffect(() => {
        try {
            const q = query(collection(db, 'orders'), where('type', '==', 'subscription'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const counts: Record<string, number> = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.selectedScheduleId) {
                        counts[data.selectedScheduleId] = (counts[data.selectedScheduleId] || 0) + 1;
                    }
                });
                setChildrenCounts(counts);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error('Orders listener setup error:', e);
        }
    }, []);

    const handleBirthYearInputChange = (val: string) => {
        setBirthYearInput(val);
        const match = val.match(/(19|20)\d{2}/);
        if (match) {
            const year = parseInt(match[0], 10);
            if (year >= 2008 && year <= 2024) {
                setSelectedBirthYear(year);
                const matching = SPARTA_SCHEDULE.filter(s => s.birthYears.includes(year));
                if (matching.length > 0) {
                    setSelectedSlotId(matching[0].id);
                }
            }
        }
    };


    const [newOrder, setNewOrder] = useState<any>(null);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccessSplash, setPromoSuccessSplash] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showPromoInput, setShowPromoInput] = useState(false);

    const [selectedDuration, setSelectedDuration] = useState<number>(duration);
    const [selectedPrice, setSelectedPrice] = useState<number>(price);
    const [hasFamilyDiscount, setHasFamilyDiscount] = useState(false);
    const [unusedCredit, setUnusedCredit] = useState(0);

    // Reset modal state when opened with a new program/duration
    useEffect(() => {
        if (isOpen) {
            setStep('details');
            setIsSuccess(false);
            setNewOrder(null);
            setPaymentMethod('sbp');
            if (duration) setSelectedDuration(duration);
            if (price) setSelectedPrice(price);
        }
    }, [isOpen, program, duration, price]);

    // Initial family check
    useEffect(() => {
        const checkFamily = async () => {
            if (userProfile?.parentPhone) {
                const q = query(collection(db, "users"), where("parentPhone", "==", userProfile.parentPhone));
                const snap = await getDocs(q);
                if (snap.size > 1) {
                    setHasFamilyDiscount(true);
                }
            }
        };
        checkFamily();
    }, [userProfile]);

    // Auto-apply saved promo code
    useEffect(() => {
        if (!appliedPromo && !promoCode && userProfile && program && isOpen && user) {
            let codeToApply: string | null = null;

            // Check item-specific promo first
            if (userProfile.activePromos?.[program.id]) {
                codeToApply = userProfile.activePromos[program.id].code;
            } else if (userProfile.activePromoCode && userProfile.activePromoDiscount) {
                // Fallback to global active promo
                const applicableTo = userProfile.activePromoApplicableTo || 'all';
                if (applicableTo === 'all' || applicableTo === 'subscriptions') {
                    codeToApply = userProfile.activePromoCode;
                }
            }

            if (codeToApply) {
                const fetchPromo = async () => {
                    const q = query(collection(db, 'promo_codes'), where('code', '==', codeToApply));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const promoDoc = snap.docs[0];
                        setAppliedPromo({ id: promoDoc.id, ...promoDoc.data() });
                        setPromoCode(codeToApply!);
                    } else if (userProfile.activePromos?.[program.id]) {
                        // Clear invalid saved promo for this item
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            [`activePromos.${program.id}`]: deleteField()
                        });
                    }
                };
                fetchPromo();
            }
        }
    }, [isOpen, userProfile, program, user]);

    // Pro-rata upgrade calculation
    useEffect(() => {
        if (mode === 'upgrade' && userProfile?.subscription) {
            const sub = userProfile.subscription;
            if (sub.expiresAt && sub.startedAt && sub.purchasePrice) {
                const now = new Date();
                const expiry = sub.expiresAt.toDate();
                const start = sub.startedAt.toDate();

                const totalDuration = expiry.getTime() - start.getTime();
                const remainingDuration = expiry.getTime() - now.getTime();

                if (remainingDuration > 0 && totalDuration > 0) {
                    const credit = Math.floor((sub.purchasePrice / totalDuration) * remainingDuration);
                    setUnusedCredit(Math.max(0, credit));
                }
            } else if (sub.expiresAt) {
                // Fallback if startedAt/purchasePrice missing (estimative)
                const now = new Date();
                const expiry = sub.expiresAt.toDate();
                const remainingDays = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                // Assume 1000 RUB per month if price unknown
                const credit = remainingDays * 33;
                setUnusedCredit(credit);
            }
        } else {
            setUnusedCredit(0);
        }
    }, [mode, userProfile]);

    // Update price when duration changes
    useEffect(() => {
        if (program?.prices) {
            let currentDuration = selectedDuration;
            if (!program.prices[currentDuration] || program.prices[currentDuration] === 0) {
                const available = [1, 3, 6, 12].find(d => program.prices[d] && program.prices[d] > 0);
                if (available) {
                    currentDuration = available;
                    setSelectedDuration(available);
                }
            }

            let p = program.prices[currentDuration] || price;
            if (hasFamilyDiscount) {
                p = Math.floor(p * 0.9);
            }

            // Apply Promo Code Discount
            if (appliedPromo && appliedPromo.type === 'discount') {
                p = Math.floor(p * (1 - appliedPromo.value / 100));
            }

            // Subtract unused credit if upgrading
            if (mode === 'upgrade') {
                p = Math.max(0, p - unusedCredit);
            }

            setSelectedPrice(p);
        }
    }, [selectedDuration, program, price, hasFamilyDiscount, mode, unusedCredit, appliedPromo]);

    const applyPromoCode = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError('');

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoCode.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoError('Промокод не найден');
                setIsApplyingPromo(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoData = promoDoc.data();

            // Validate promo
            if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
                setPromoError('Срок действия промокода истек');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
                setPromoError('Промокод больше не действителен (лимит исчерпан)');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.usersUsed && user && promoData.usersUsed.includes(user.uid)) {
                setPromoError('Вы уже использовали этот промокод');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.type !== 'discount') {
                setPromoError('Этот промокод не применим к тарифам (нужна скидка)');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.applicableTo === 'shop') {
                setPromoError('Этот промокод действует только в разделе "Магазин"');
                setIsApplyingPromo(false);
                return;
            }

            // Success
            setAppliedPromo({ id: promoDoc.id, ...promoData });

            if (user && program) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    [`activePromos.${program.id}`]: {
                        code: promoData.code,
                        discount: promoData.value,
                        id: promoDoc.id,
                        type: promoData.type
                    }
                });
            }

            setPromoSuccessSplash(true);
            setTimeout(() => setPromoSuccessSplash(false), 2500); // 2.5sec splash
            setShowPromoInput(false);
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка при проверке промокода');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    if (!program) return null;

    const handleNext = () => {
        if (!user && onOpenAuth) {
            onOpenAuth();
            return;
        }
        if (step === 'details') {
            setStep('athlete');
        } else if (step === 'athlete') {
            setStep('payment');
        }
    };

    const handleBack = () => {
        if (step === 'payment') {
            setStep('athlete');
        } else if (step === 'athlete') {
            setStep('details');
        }
    };

    const handleConfirmPayment = async () => {
        if (!user) {
            if (onOpenAuth) onOpenAuth();
            return;
        }
        if (!paymentMethod) return;
        setIsProcessing(true);

        try {
            // Check for Family Discount (accounts with same parent phone)
            let finalPrice = selectedPrice;

            const activeSlot = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);

            const orderData = {
                email: user.email,
                userName: user.displayName || 'Anonymous',
                childName: childName.trim(),
                childBirthYear: selectedBirthYear,
                selectedScheduleId: selectedSlotId,
                coachName: activeSlot ? activeSlot.coachName : '',
                scheduleDays: activeSlot ? activeSlot.days : '',
                scheduleTime: activeSlot ? activeSlot.time : '',
                selectedBranch,
                planId: program.id,
                planTitle: program.title,
                duration: selectedDuration,
                price: finalPrice,
                paymentMethod,
                date: Timestamp.now(),
                createdAt: Timestamp.now(),
                status: paymentMethod === 'balance' ? 'completed' : 'pending',
                type: 'subscription',
                discountApplied: appliedPromo ? `promo:${appliedPromo.code}` : (hasFamilyDiscount ? 'family' : (mode === 'upgrade' ? 'upgrade_credit' : 'none'))
            };

            // If paying by balance directly, we run logic. Else for YooKassa it's delayed.
            // Mark promo as used
            if (appliedPromo) {
                const promoRef = doc(db, 'promo_codes', appliedPromo.id);
                // Increment uses, append user UID
                await updateDoc(promoRef, {
                    currentUses: (appliedPromo.currentUses || 0) + 1,
                    usersUsed: arrayUnion(user.uid)
                });

                // Log Activation for Admin History
                await addDoc(collection(db, 'promo_activations'), {
                    userId: user.uid,
                    promoId: appliedPromo.id,
                    code: appliedPromo.code,
                    type: appliedPromo.type,
                    value: appliedPromo.value,
                    timestamp: Timestamp.now()
                });
            }

            if (paymentMethod === 'balance' || paymentMethod === 'robokassa' || paymentMethod === 'sbp') {
                const currentBalance = userProfile?.walletBalance || 0;
                if (paymentMethod === 'balance' && currentBalance < finalPrice) {
                    alert("Недостаточно средств на балансе!");
                    setIsProcessing(false);
                    return;
                }

                if (paymentMethod === 'balance') {
                    // Deduct Balance
                    const userRef = doc(db, 'users', user.uid);
                    const updates: any = { walletBalance: currentBalance - finalPrice };
                    if (appliedPromo) {
                        if (userProfile?.activePromos?.[program.id]?.code === appliedPromo.code) {
                            updates[`activePromos.${program.id}`] = deleteField();
                        }
                        if (userProfile?.activePromoCode === appliedPromo.code) {
                            updates.activePromoCode = null;
                            updates.activePromoDiscount = null;
                            updates.activePromoApplicableTo = null;
                        }
                    }
                    await updateDoc(userRef, updates);
                }

                // Grant subscription and save completed order
                const orderRef = await addDoc(collection(db, "orders"), {
                    ...orderData,
                    status: 'completed',
                    price: finalPrice
                });
                setNewOrder({ id: orderRef.id, ...orderData, price: finalPrice });

                // Update or link student profile with group
                if (childName.trim()) {
                    const activeSlot = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);
                    const childDocId = (userProfile?.childrenIds && userProfile.childrenIds[0]) || user.uid;
                    const childRef = doc(db, 'users', childDocId);
                    await updateDoc(childRef, {
                        childName: childName.trim(),
                        childAge: 2026 - selectedBirthYear,
                        birthYear: selectedBirthYear,
                        groupId: selectedSlotId,
                        groupName: activeSlot?.streamTitle || existingGroupName || 'Основная группа',
                        coachName: activeSlot?.coachName || 'Тренер Sparta'
                    }).catch(() => {});
                }

                await grantSubscription(finalPrice);
                setIsSuccess(true);
            } else if (paymentMethod === 'invoice') {
                const orderRef = await addDoc(collection(db, "orders"), {
                    ...orderData,
                    status: 'pending_invoice',
                    price: finalPrice
                });
                setNewOrder({ id: orderRef.id, ...orderData, price: finalPrice });
                setIsSuccess(true);
            }



        } catch (error) {
            console.error("Error creating purchase order:", error);
            alert("Ошибка при оплате. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsProcessing(false);
        }
    };

    const grantSubscription = async (finalPrice: number) => {
        let expiresAtDate = new Date();
        let isEarlyRenewal = false;

        // If renewing, extend from current expiry if it's in the future
        if (mode === 'renew' && userProfile?.subscription?.expiresAt) {
            try {
                const currentExpiry = userProfile.subscription.expiresAt.toDate();
                if (currentExpiry > new Date()) {
                    expiresAtDate = new Date(currentExpiry);

                    // Early renewal bonus (> 5 days before expiry)
                    const daysToExpiry = (currentExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    if (daysToExpiry > 5) {
                        isEarlyRenewal = true;
                    }
                }
            } catch (e) {
                console.error("Error parsing current expiry:", e);
            }
        }

        expiresAtDate.setMonth(expiresAtDate.getMonth() + selectedDuration);

        // Early renewal notification
        if (isEarlyRenewal && user) {
            await addDoc(collection(db, "notifications"), {
                email: user.email,
                title: "Спасибо за продление! 🎁",
                message: `Благодарим вас за раннее продление подписки!`,
                type: 'info',
                isRead: false,
                createdAt: Timestamp.now()
            });
        }

        const userRef = doc(db, "users", user!.uid);
        await updateDoc(userRef, {
            subscription: {
                planId: program!.id,
                title: program!.title,
                expiresAt: Timestamp.fromDate(expiresAtDate),
                status: 'active',
                startedAt: mode === 'renew' ? (userProfile?.subscription?.startedAt || Timestamp.now()) : Timestamp.now(),
                purchasePrice: finalPrice + unusedCredit // The base price for pro-rata
            }
        });

        /* 
        // Award 2 Guest Passes
        const uidShort = user!.uid.substring(0, 4).toUpperCase();
        for (let i = 1; i <= 2; i++) {
            const passId = `GUEST-${uidShort}-${Date.now().toString().slice(-4)}-${i}`;
            await setDoc(doc(db, "guest_passes", passId), {
                id: passId,
                ownerId: user!.uid,
                status: 'active',
                createdAt: serverTimestamp(),
                type: 'standard_gift'
            });
        }
        */

        // Referral Bonus Logic: Run only if NOT awarded yet and user has a referrer
        if (userProfile?.referredBy && !userProfile?.referralBonusAwarded) {
            try {
                // Find inviter by referral code
                const invitersQuery = query(
                    collection(db, "users"),
                    where("referralCode", "==", userProfile.referredBy)
                );
                const inviterSnap = await getDocs(invitersQuery);

                const userRef = doc(db, "users", user!.uid);
                const batchUpdates: any = { referralBonusAwarded: true };

                if (!inviterSnap.empty) {
                    const inviterDoc = inviterSnap.docs[0];
                    const inviterData = inviterDoc.data();
                    const inviterRef = doc(db, "users", inviterDoc.id);

                    // 1. Extend inviter's subscription by 7 days
                    let inviterExpiry = new Date();
                    if (inviterData.subscription?.expiresAt) {
                        inviterExpiry = inviterData.subscription.expiresAt.toDate();
                    }
                    inviterExpiry.setDate(inviterExpiry.getDate() + 7);

                    await updateDoc(inviterRef, {
                        'subscription.expiresAt': Timestamp.fromDate(inviterExpiry),
                        'referrals.count': (inviterData.referrals?.count || 0) + 1,
                        'referrals.bonusDays': (inviterData.referrals?.bonusDays || 0) + 7
                    });

                    // Notify inviter
                    await addDoc(collection(db, "notifications"), {
                        email: inviterData.email,
                        title: "Бонус за друга! 🎁",
                        message: `Ваш друг ${user!.displayName || 'купил абонемент'}! Вам начислено +7 дней к подписке.`,
                        type: 'success',
                        isRead: false,
                        createdAt: Timestamp.now()
                    });
                }

                // 2. Grant +7 days to the NEW USER (the one who just bought)
                expiresAtDate.setDate(expiresAtDate.getDate() + 7);
                batchUpdates['subscription.expiresAt'] = Timestamp.fromDate(expiresAtDate);

                await updateDoc(userRef, batchUpdates);

                // Add notification for the new user
                await addDoc(collection(db, "notifications"), {
                    email: user!.email,
                    title: "Реферальный бонус! 🎁",
                    message: `Вам начислено +7 дополнительных дней за регистрацию по приглашению!`,
                    type: 'success',
                    isRead: false,
                    createdAt: Timestamp.now()
                });

                console.log('Referral bonuses granted successfully');

            } catch (err) {
                console.error("Referral bonus failed:", err);
            }
        }
    };

    const getIcon = (title: string) => {
        if (title.toLowerCase().includes('новичок')) return <Zap className="text-blue-400" size={32} />;
        if (title.toLowerCase().includes('профессионал')) return <Star className="text-sparta-gold" size={32} />;
        return <Trophy className="text-red-500" size={32} />;
    };

    return (
        <AnimatePresence>
            {isOpen && program && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                    />

                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl pointer-events-auto"
                        >
                        {/* Header with Zen Stepper */}
                        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${step === 'details' ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : step === 'athlete' ? 'bg-blue-400/10 border-blue-400/30 text-blue-400' : 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'}`}>
                                        {step === 'details' ? 'Шаг 1 из 3 • Состав плана' : step === 'athlete' ? 'Шаг 2 из 3 • Данные спортсмена' : 'Шаг 3 из 3 • Безопасная оплата'}
                                    </span>
                                </div>
                                <h2 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wider">
                                    {isSuccess ? 'Оформление завершено' : step === 'details' ? (mode === 'renew' ? 'Продление абонемента' : `Абонемент «${program.title}»`) : step === 'athlete' ? 'Персонализация программы' : 'Завершение бронирования'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all border border-white/5">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-sm bg-zinc-950">
                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-4"
                                    >
                                        {!newOrder ? (
                                            <>
                                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 text-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_35px_rgba(52,211,153,0.4)]">
                                                    <ShieldCheck size={36} />
                                                </div>
                                                <h3 className="text-2xl font-russo text-white mb-2">Добро пожаловать в Sparta!</h3>
                                                <p className="text-white/70 mb-6 max-w-sm mx-auto text-xs leading-relaxed">
                                                    Абонемент успешно активирован. Наш администратор уже готовит для вас вводную консультацию и расписание.
                                                </p>
                                                <Button onClick={onClose} className="w-full h-12 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black font-bold">
                                                    Перейти в личный кабинет
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <MembershipReceipt
                                                    order={{
                                                        ...newOrder,
                                                        userName: user?.displayName || 'Спортсмен',
                                                        email: user?.email || ''
                                                    }}
                                                    onClose={onClose}
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                ) : step === 'details' ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="relative space-y-5"
                                    >
                                        {/* Success Splash Overlay */}
                                        <AnimatePresence>
                                            {promoSuccessSplash && appliedPromo && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                                    className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md rounded-2xl flex items-center justify-center border border-green-500/30 overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />
                                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-sparta-gold/20 rounded-full blur-[100px] pointer-events-none" />

                                                    <div className="text-center p-6 relative z-10">
                                                        <motion.div
                                                            initial={{ scale: 0, rotate: -180 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                                            className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(74,222,128,0.5)]"
                                                        >
                                                            <Tag size={32} className="text-black" />
                                                        </motion.div>
                                                        <motion.h3
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.2 }}
                                                            className="text-3xl font-russo text-white mb-2 uppercase tracking-widest"
                                                        >
                                                            Скидка -{appliedPromo.value}%!
                                                        </motion.h3>
                                                        <motion.p
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.3 }}
                                                            className="text-sparta-gold font-bold mb-4 text-sm"
                                                        >
                                                            Промокод {appliedPromo.code} активирован
                                                        </motion.p>
                                                        <motion.div
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ delay: 0.4 }}
                                                            className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 border border-white/10 rounded-xl"
                                                        >
                                                            <div className="w-8 h-8 rounded shrink-0 bg-white/5 flex items-center justify-center">
                                                                {getIcon(program.title)}
                                                            </div>
                                                            <span className="text-white font-bold text-sm">{program.title}</span>
                                                        </motion.div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Reassuring Hero Card */}
                                        <div className="p-5 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 rounded-2xl border border-amber-500/20 shadow-[0_0_35px_rgba(245,158,11,0.08)] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                                            {(() => {
                                                const weeklySessions = program.sessionsPerWeek || (program.title.toLowerCase().includes('новичок') ? 2 : program.title.toLowerCase().includes('профессионал') ? 3 : 4);
                                                const totalSessions = selectedDuration * 4 * weeklySessions;
                                                const basePrice = totalSessions * 650;
                                                const origBasePrice = basePrice > selectedPrice ? basePrice : null;
                                                const savings = origBasePrice ? (origBasePrice - selectedPrice) : 0;
                                                const perSession = Math.floor(selectedPrice / totalSessions);

                                                return (
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                                        <div className="flex items-start sm:items-center gap-3.5">
                                                            <div className="w-13 h-13 p-3 bg-gradient-to-br from-amber-400/20 to-yellow-600/10 rounded-2xl flex items-center justify-center border border-amber-500/30 shrink-0 shadow-lg relative">
                                                                {getIcon(program.title)}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-russo text-white uppercase tracking-wide">{program.title}</h3>
                                                                <div className="mt-1 flex items-center gap-2">
                                                                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                                                                        ⚡ ≈ {perSession.toLocaleString('ru-RU')} ₽ / тренировка
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-left sm:text-right border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                                                            <div className="flex items-center sm:justify-end gap-2 flex-wrap mb-0.5">
                                                                {origBasePrice && (
                                                                    <span className="text-white/30 line-through text-xs font-mono tracking-tight">
                                                                        {origBasePrice.toLocaleString('ru-RU')} ₽
                                                                    </span>
                                                                )}
                                                                {savings > 0 && (
                                                                    <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.2)]">
                                                                        Ваша экономия {savings.toLocaleString('ru-RU')} ₽
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-tight flex items-baseline sm:justify-end gap-1">
                                                                <span>{selectedPrice.toLocaleString('ru-RU')} ₽</span>
                                                                <span className="text-white/50 font-manrope font-normal text-xs">/ {selectedDuration} мес.</span>
                                                            </div>

                                                            {mode === 'upgrade' && unusedCredit > 0 && (
                                                                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">Зачтено по остатку: -{unusedCredit.toLocaleString('ru-RU')} ₽</span>
                                                            )}
                                                            {hasFamilyDiscount && (
                                                                <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-md font-bold border border-amber-500/30 whitespace-nowrap mt-1 inline-block">СЕМЕЙНАЯ СКИДКА -10%</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Duration Selector */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                                    {mode === 'renew' ? 'Выберите срок продления:' : 'Период обучения:'}
                                                </label>
                                                <span className="text-[11px] text-amber-400/80 font-medium">Чем дольше срок, тем выше выгода</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[1, 3, 6, 12].map((d) => {
                                                    const isAvailable = Boolean(program?.prices?.[d]);
                                                    return (
                                                        <button
                                                            key={d}
                                                            type="button"
                                                            disabled={!isAvailable}
                                                            onClick={() => isAvailable && setSelectedDuration(d)}
                                                            className={`relative py-3 px-2 rounded-xl border font-bold transition-all text-xs text-center flex flex-col items-center justify-center ${
                                                                selectedDuration === d
                                                                    ? 'border-amber-400 bg-gradient-to-b from-amber-400/20 to-amber-500/5 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                                                                    : !isAvailable
                                                                    ? 'border-white/5 bg-white/5 text-white/20 cursor-not-allowed opacity-40'
                                                                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                        >
                                                            <span className="text-sm font-russo">{d} {d === 1 ? 'месяц' : d < 5 ? 'месяца' : 'месяцев'}</span>
                                                            {d === 1 && isAvailable && (
                                                                <span className="mt-1 text-[9px] font-medium text-white/50">
                                                                    Ознакомительный
                                                                </span>
                                                            )}
                                                            {d === 3 && isAvailable && (
                                                                <span className="mt-1 bg-white/10 text-zinc-200 border border-white/15 text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                                    Рекомендуемый курс
                                                                </span>
                                                            )}
                                                            {d === 6 && isAvailable && (
                                                                <span className="mt-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                                    Активное развитие
                                                                </span>
                                                            )}
                                                            {d === 12 && isAvailable && (
                                                                <span className="mt-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                                    Максимальный прогресс
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* What's Included */}
                                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">В абонемент входит:</h4>
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {(() => {
                                                    const featuresList = [...program.features];
                                                    if (selectedDuration >= 3 && !featuresList.some(f => f.toLowerCase().includes('заморозка'))) {
                                                        featuresList.push('Заморозка абонемента до 14 дней');
                                                    }
                                                    return featuresList.map((feat, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-xs text-white/90">
                                                            <div className="p-0.5 rounded-full bg-amber-400/20 text-amber-400 mt-0.5 shrink-0">
                                                                <Check size={12} />
                                                            </div>
                                                            <span>{feat}</span>
                                                        </li>
                                                    ));
                                                })()}
                                            </ul>
                                        </div>

                                        {/* Reassuring Care & Comfort Badges (Replacing Harsh Legal Warning) */}
                                        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 border border-emerald-500/20 space-y-2.5">
                                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                                <ShieldCheck size={16} />
                                                <span>Забота и поддержка Sparta:</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-white/80">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-emerald-400 shrink-0">❄️</span>
                                                    <span><strong>100% Заморозка</strong> в случае болезни или отпуска</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-amber-400 shrink-0">🤝</span>
                                                    <span><strong>Помощь наставника</strong> с выбором удобной группы</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="text-blue-400 shrink-0">🔒</span>
                                                    <span><strong>Без автосписаний</strong> и скрытых подписок</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Promo Code System */}
                                        <div className="pt-1">
                                            {appliedPromo ? (
                                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between group">
                                                    <div className="flex items-center gap-2.5 text-emerald-400">
                                                        <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                                                            <Check size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs tracking-wide">Промокод <span className="font-mono text-emerald-300">{appliedPromo.code}</span> применён!</div>
                                                            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5"><Tag size={10} /> Скидка -{appliedPromo.value}%</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setAppliedPromo(null)}
                                                        className="text-emerald-400/50 hover:text-emerald-300 hover:bg-emerald-500/20 p-1.5 rounded-lg transition-colors"
                                                        title="Отменить промокод"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : showPromoInput ? (
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1">
                                                        <div className="relative">
                                                            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                                            <input
                                                                type="text"
                                                                value={promoCode}
                                                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                                placeholder="ВВЕДИТЕ ПРОМОКОД"
                                                                className={`w-full bg-black/60 border ${promoError ? 'border-red-500/50' : 'border-white/15'} rounded-xl p-2.5 pl-9 text-white uppercase font-mono tracking-widest text-xs focus:border-amber-400 outline-none transition-colors`}
                                                            />
                                                        </div>
                                                        {promoError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-[10px] mt-1 ml-1 font-bold tracking-wider uppercase">{promoError}</motion.p>}
                                                    </div>
                                                    <Button onClick={applyPromoCode} disabled={isApplyingPromo || !promoCode.trim()} className="px-4 h-[40px] text-xs">
                                                        {isApplyingPromo ? <Loader2 className="animate-spin" size={16} /> : 'Применить'}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowPromoInput(true)} className="text-white/50 text-[11px] font-bold uppercase tracking-widest hover:text-amber-400 transition-colors flex items-center gap-1.5 group">
                                                    <Tag size={12} className="group-hover:-rotate-12 transition-transform" /> У меня есть промокод
                                                </button>
                                            )}
                                        </div>

                                        {/* Main Action Button */}
                                        <div className="pt-2">
                                            <Button onClick={handleNext} className="w-full h-13 text-base font-extrabold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2">
                                                <span>{user ? 'Перейти к заполнению данных ребёнка' : 'Войти в аккаунт и продолжить'}</span>
                                                <ChevronRight size={18} />
                                            </Button>
                                            <p className="text-[11px] text-white/50 text-center mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                                                <span>🔒 Платежи защищены шифрованием</span>
                                                <span>•</span>
                                                <span>Официальный договор и гарантия</span>
                                            </p>
                                        </div>
                                    </motion.div>
                                ) : step === 'athlete' ? (
                                    <motion.div
                                        key="athlete"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        {/* Child Name Input */}
                                        <div>
                                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                <User size={14} className="text-amber-400" />
                                                <span>Как зовут юного спортсмена?</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={childName}
                                                onChange={(e) => setChildName(e.target.value)}
                                                placeholder="Например, Артём"
                                                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:border-amber-400 focus:outline-none transition-colors text-sm font-medium"
                                            />
                                        </div>

                                        {/* Smart Manual Birth Year / Date Input */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-amber-400" />
                                                    <span>Год или дата рождения ребёнка:</span>
                                                </label>
                                                {selectedBirthYear && (
                                                    <span className="text-[11px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                        ⚽ Возраст: {2026 - selectedBirthYear} лет ({selectedBirthYear} г.р.)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={birthYearInput}
                                                    onChange={(e) => handleBirthYearInputChange(e.target.value)}
                                                    placeholder="Например, 2017 или 15.04.2017"
                                                    className="w-full px-4 py-3 pr-10 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:border-amber-400 focus:outline-none transition-colors text-sm font-medium"
                                                />
                                                <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Dynamic Interactive Schedule Cards / Pre-selected Assigned Group */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Clock size={14} className="text-amber-400" />
                                                    <span>Группа для занятий:</span>
                                                </label>
                                                {hasExistingGroup && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowChangeGroup(!showChangeGroup)}
                                                        className="text-[11px] text-amber-400 hover:underline font-bold transition-all"
                                                    >
                                                        {showChangeGroup ? 'Оставить закрепленную группу' : 'Выбрать другое время'}
                                                    </button>
                                                )}
                                            </div>

                                            {hasExistingGroup && !showChangeGroup ? (
                                                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-950 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] relative">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-black">
                                                            ✓ Ваша закрепленная группа
                                                        </span>
                                                        <span className="text-[11px] text-white/40 font-mono">
                                                            {selectedBirthYear} г.р.
                                                        </span>
                                                    </div>
                                                    {(() => {
                                                        const currentSlot = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);
                                                        return (
                                                            <div>
                                                                <div className="font-russo text-base text-amber-300">
                                                                    {currentSlot ? `${currentSlot.days} • ${currentSlot.time}` : existingGroupName}
                                                                </div>
                                                                <div className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                                                                    <User size={13} className="text-amber-400" />
                                                                    <span>Тренер: <strong>{currentSlot?.coachName || 'Тренер Sparta'}</strong></span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                                                    {SPARTA_SCHEDULE.filter(s => s.birthYears.includes(selectedBirthYear)).map((slot) => {
                                                        const isSelected = selectedSlotId === slot.id;
                                                        const dynamicOccupied = slot.initialOccupied + (childrenCounts[slot.id] || 0);
                                                        const currentOccupied = Math.min(slot.maxCapacity, dynamicOccupied);
                                                        const availableSeats = Math.max(0, slot.maxCapacity - currentOccupied);
                                                        return (
                                                            <button
                                                                key={slot.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedSlotId(slot.id);
                                                                    setShowChangeGroup(false);
                                                                    setHasExistingGroup(true);
                                                                    setExistingGroupName(slot.streamTitle);
                                                                }}
                                                                className={`w-full p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                                                                    isSelected
                                                                        ? 'border-amber-400 bg-gradient-to-r from-amber-400/20 via-zinc-900 to-zinc-950 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                                        slot.streamType === 'weekday'
                                                                            ? 'bg-blue-400/15 border-blue-400/30 text-blue-300'
                                                                            : 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
                                                                    }`}>
                                                                        {slot.streamTitle}
                                                                    </span>
                                                                    {availableSeats <= 0 ? (
                                                                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                                                                            🔒 Набор закрыт
                                                                        </span>
                                                                    ) : availableSeats <= 3 ? (
                                                                        <span className="text-[10px] font-black text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                                                                            🔥 Осталось {availableSeats} {availableSeats === 1 ? 'место' : 'места'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                                                            🟢 Свободно {availableSeats} мест
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-baseline justify-between mt-1.5">
                                                                    <div className="font-russo text-base text-amber-300 tracking-wide">
                                                                        {slot.days} • <span className="text-white font-mono text-sm">{slot.time}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-2 text-xs text-white/80 font-medium flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <User size={13} className="text-amber-400 shrink-0" />
                                                                        <span>Тренер: <strong>{slot.coachName}</strong></span>
                                                                    </div>
                                                                    <span className="text-[10px] text-white/60 font-mono">
                                                                        {currentOccupied}/{slot.maxCapacity} мест
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>




                                        {/* Step 2 Buttons */}
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                onClick={handleBack}
                                                className="flex-1 h-12 border-white/15 text-white/70 hover:text-white"
                                            >
                                                ← Назад
                                            </Button>
                                            <Button
                                                onClick={handleNext}
                                                className="flex-[2] h-12 text-sm font-extrabold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-1.5"
                                            >
                                                <span>Закрепить место для {declineChildName(childName)}</span>
                                                <ChevronRight size={18} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="payment"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Personalized Reservation Hero Card */}
                                        {(() => {
                                            const activeSlot = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);
                                            return (
                                                <div className="bg-gradient-to-br from-amber-500/15 via-zinc-900 to-zinc-950 p-4 rounded-2xl border border-amber-400/30 space-y-2 shadow-lg">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-lg shrink-0">
                                                            ⚽
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white leading-tight">
                                                                Персональный резерв {childName.trim() ? `для ${childName.trim()}` : 'для вашего ребёнка'} ({selectedBirthYear} г.р.)
                                                            </h4>
                                                            <p className="text-[11px] text-amber-300/90 mt-0.5 font-medium">
                                                                {activeSlot ? `${activeSlot.days} • ${activeSlot.time} (${activeSlot.coachName.split(' ')[0]} ${activeSlot.coachName.split(' ')[1] || ''})` : 'Индивидуальный график'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                                        <span className="text-white/60 font-medium">{program.title} ({selectedDuration} мес.)</span>
                                                        <span className="text-amber-400 font-mono font-bold text-base">{selectedPrice.toLocaleString('ru-RU')} ₽</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Payment Methods Selection */}
                                        <div className="space-y-2.5">
                                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider">
                                                Выберите способ оплаты:
                                            </label>

                                            {/* SBP - Primary Fast Option */}
                                            <button
                                                onClick={() => setPaymentMethod('sbp')}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'sbp' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'sbp' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}>
                                                        <Zap size={22} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                                            <span>СБП (Система быстрых платежей)</span>
                                                            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase">В 1 клик</span>
                                                        </div>
                                                        <div className="text-xs text-white/50 mt-0.5">Оплата без ввода карты через приложение вашего банка</div>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'sbp' && <Check size={20} className="text-amber-400 shrink-0" />}
                                            </button>

                                            {/* Bank Cards */}
                                            <button
                                                onClick={() => setPaymentMethod('robokassa')}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'robokassa' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'robokassa' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}>
                                                        <CreditCard size={22} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-sm text-white">Банковская карта</div>
                                                        <div className="text-xs text-white/50 mt-0.5">МИР, Visa, Mastercard • Мгновенный чек (54-ФЗ)</div>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'robokassa' && <Check size={20} className="text-amber-400 shrink-0" />}
                                            </button>

                                            {/* Corporate Invoice */}
                                            <button
                                                onClick={() => setPaymentMethod('invoice')}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'invoice' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'invoice' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}>
                                                        <FileText size={22} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-sm text-white">Оплата по счёту (ИП / ООО)</div>
                                                        <div className="text-xs text-white/50 mt-0.5">Сформировать официальный счёт с печатью</div>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'invoice' && <Check size={20} className="text-amber-400 shrink-0" />}
                                            </button>

                                            {/* Show internal balance ONLY if balance > 0 */}
                                            {(userProfile?.walletBalance || 0) > 0 && (
                                                <button
                                                    onClick={() => setPaymentMethod('balance')}
                                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'balance' ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'balance' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}>
                                                            <Wallet size={22} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-bold text-sm text-white">Внутренний баланс аккаунта</div>
                                                            <div className="text-xs text-amber-400 font-bold mt-0.5">Доступно: {(userProfile?.walletBalance || 0).toLocaleString('ru-RU')} ₽</div>
                                                        </div>
                                                    </div>
                                                    {paymentMethod === 'balance' && <Check size={20} className="text-amber-400 shrink-0" />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Trust Triad Subtext */}
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center text-xs text-white/50 space-y-1">
                                            <p className="flex items-center justify-center gap-1.5 text-white/70 font-medium">
                                                <span>🛡️ 100% Защита платежей по стандарту PCI DSS</span>
                                            </p>
                                            <p className="text-[11px] text-white/40">Мгновенный чек по 54-ФЗ на e-mail • Официальный договор и гарантия возврата</p>
                                        </div>

                                        {/* Step 3 Navigation Buttons */}
                                        <div className="flex gap-3 pt-2">
                                            <Button variant="outline" onClick={handleBack} className="flex-1 h-12 border-white/15 text-white/70 hover:text-white">
                                                ← Назад к данным
                                            </Button>
                                            <Button
                                                onClick={handleConfirmPayment}
                                                disabled={!paymentMethod || isProcessing}
                                                className="flex-[2] h-12 text-sm sm:text-base font-extrabold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.3)]"
                                            >
                                                {isProcessing ? 'Обработка...' : `Подтвердить и оплатить ${selectedPrice.toLocaleString('ru-RU')} ₽`}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </>
        )}
    </AnimatePresence>
    );
};

export default MembershipModal;
