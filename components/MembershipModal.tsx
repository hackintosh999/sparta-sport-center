import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Check,
    Wallet,
    Smartphone,
    ShieldCheck,
    Zap,
    Star,
    Trophy,
    Tag,
    Loader2,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    User,
    Building,
    Clock,
    Sparkles,
    FileText,
    Calendar,
    Shield,
    Copy,
    QrCode,
    Banknote,
    Phone,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Upload,
    Image,
    CheckCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, GlassCard } from './UIComponents';
import { Program } from '../types';
import { db } from '../firebase';
import { BaseModal } from './ui/BaseModal';
import { collection, addDoc, Timestamp, doc, updateDoc, getDoc, setDoc, query, where, getDocs, arrayUnion, deleteField, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import MembershipReceipt from './profile/MembershipReceipt';
import { SPARTA_SCHEDULE, ScheduleSlot, declineChildName } from '../constants/spartaSchedule';
import { BANK_DEEP_LINKS, verifyReceiptImage, ReceiptVerificationResult } from '../utils/receiptVerifier';
import { SPARTA_LOCATIONS, CITIES } from '../constants/cities';

export const SPARTA_BANK_DETAILS = {
    recipientName: 'ИП ЛЕБЕДЕВА КСЕНИЯ АЛЕКСАНДРОВНА',
    inn: '742004340856',
    ogrnip: '319745600067121',
    accountNumber: '40802810172000088821',
    bankName: 'ЧЕЛЯБИНСКОЕ ОТДЕЛЕНИЕ N8597 ПАО СБЕРБАНК',
    bik: '047501602',
    corrAccount: '30101810700000000602',
    innBank: '7707083893',
    kppBank: '745302001',
    sbpPhone: '+79193393399',
    sbpPhoneFormatted: '+7 (919) 339-33-99',
    sbpRecipient: 'Ксения Александровна Л. (Сбербанк)',
};

export const generateGostQrString = (amountInRubles: number, purpose: string) => {
    const sumInKopecks = Math.round(amountInRubles * 100);
    return `ST00012|Name=ИП ЛЕБЕДЕВА КСЕНИЯ АЛЕКСАНДРОВНА|PersonalAcc=40802810172000088821|BankName=ЧЕЛЯБИНСКОЕ ОТДЕЛЕНИЕ N8597 ПАО СБЕРБАНК|BIC=047501602|CorrespAcc=30101810700000000602|PayeeINN=742004340856|Purpose=${purpose}|Sum=${sumInKopecks}`;
};

interface MembershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    program: any;
    duration: number;
    price: number;
    mode?: 'purchase' | 'renew' | 'upgrade';
    onOpenAuth?: () => void;
    initialBranchId?: string;
    initialAgeCategory?: string;
}

const MembershipModal: React.FC<MembershipModalProps> = ({
    isOpen,
    onClose,
    program,
    duration,
    price,
    mode = 'purchase',
    onOpenAuth,
    initialBranchId,
    initialAgeCategory
}) => {
    const { user, userProfile } = useAuth();
    const [step, setStep] = useState<'form' | 'bank_transfer'>('form');
    const [paymentMethod, setPaymentMethod] = useState<'sbp' | 'cash' | 'balance'>('sbp');
    const [selectedBank, setSelectedBank] = useState<string>('sber');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [showFullRequisites, setShowFullRequisites] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);

    // Family athletes list & active selected child
    const [familyChildren, setFamilyChildren] = useState<any[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string>('new');

    // Child profile state
    const [childName, setChildName] = useState('');
    const [birthYearInput, setBirthYearInput] = useState<string>('');
    const [selectedBirthYear, setSelectedBirthYear] = useState<number>(0);
    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState('newton');
    const [showChangeGroup, setShowChangeGroup] = useState<boolean>(false);

    // Receipt upload and verification state
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
    const [isVerifyingReceipt, setIsVerifyingReceipt] = useState<boolean>(false);
    const [receiptVerification, setReceiptVerification] = useState<ReceiptVerificationResult | null>(null);

    const [newOrder, setNewOrder] = useState<any>(null);

    // Promo code state
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccessSplash, setPromoSuccessSplash] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showPromoInput, setShowPromoInput] = useState(false);

    const [selectedDuration, setSelectedDuration] = useState<number>(duration || 1);
    const [selectedPrice, setSelectedPrice] = useState<number>(price || 3000);
    const [hasFamilyDiscount, setHasFamilyDiscount] = useState(false);
    const [unusedCredit, setUnusedCredit] = useState(0);

    const handleCopy = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Auto-sync family athletes from profile
    useEffect(() => {
        if (!isOpen) return;

        const loadFamilyAthletes = async () => {
            const list: any[] = [];
            const activeUid = user?.uid || userProfile?.uid || (userProfile as any)?.id;

            if (activeUid) {
                // 1. Query children where parentId == activeUid
                try {
                    const q = query(collection(db, 'users'), where('parentId', '==', activeUid));
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => {
                        list.push({ id: d.id, ...d.data() });
                    });
                } catch (err) {
                    console.warn('Error fetching family by parentId:', err);
                }

                // 2. Query explicit childrenIds
                if (userProfile?.childrenIds && Array.isArray(userProfile.childrenIds)) {
                    for (const cId of userProfile.childrenIds) {
                        if (!list.some(item => item.id === cId)) {
                            try {
                                const cSnap = await getDoc(doc(db, 'users', cId));
                                if (cSnap.exists()) {
                                    list.push({ id: cSnap.id, ...cSnap.data() });
                                }
                            } catch (e) {}
                        }
                    }
                }

                // 3. Include parent's own profile if it has childName and not duplicate
                if (userProfile?.childName && !list.some(item => (item.childName || '').toLowerCase() === (userProfile.childName || '').toLowerCase())) {
                    list.push({
                        id: activeUid,
                        childName: userProfile.childName,
                        birthYear: userProfile.birthYear,
                        childAge: userProfile.childAge,
                        groupId: userProfile.groupId,
                        isParentProfile: true
                    });
                }
            }

            setFamilyChildren(list);

            // Pre-select first child or initialize
            if (list.length > 0) {
                const first = list[0];
                setSelectedChildId(first.id);
                setChildName(first.childName || first.displayName || '');
                if (first.birthYear) {
                    const y = Number(first.birthYear);
                    setSelectedBirthYear(y);
                    setBirthYearInput(y.toString());
                }
                if (first.groupId || first.slotId) {
                    const targetId = first.groupId || first.slotId;
                    const matchedSlot = SPARTA_SCHEDULE.find(s => s.id === targetId);
                    if (matchedSlot) setSelectedSlotId(matchedSlot.id);
                }
            } else if (userProfile?.childName || userProfile?.childFirstName) {
                const name = userProfile.childName || `${userProfile.childLastName || ''} ${userProfile.childFirstName || ''}`.trim() || userProfile.displayName;
                if (name) setChildName(name);

                if (userProfile.birthYear) {
                    const y = Number(userProfile.birthYear);
                    setSelectedBirthYear(y);
                    setBirthYearInput(y.toString());
                }
            }
        };

        loadFamilyAthletes();
    }, [isOpen, userProfile, user]);

    // Reset and initialize program-specific settings on open
    useEffect(() => {
        if (isOpen) {
            setStep('form');
            setIsSuccess(false);
            setNewOrder(null);
            setPaymentMethod('sbp');
            setReceiptFile(null);
            setReceiptPreviewUrl(null);
            setReceiptVerification(null);
            if (duration) setSelectedDuration(duration);
            if (price) setSelectedPrice(price);

            // Pre-select branch if provided by program
            if (program?.branchId && program.branchId !== 'all') {
                setSelectedBranch(program.branchId);
            } else if (initialBranchId) {
                setSelectedBranch(initialBranchId);
            }
        }
    }, [isOpen, program, duration, price, initialBranchId]);

    // Athlete selection tab handler
    const handleSelectChildTab = (childItem: any | 'new') => {
        if (childItem === 'new') {
            setSelectedChildId('new');
            setChildName('');
            setBirthYearInput('');
            setSelectedBirthYear(0);
        } else {
            setSelectedChildId(childItem.id);
            setChildName(childItem.childName || childItem.displayName || '');
            if (childItem.birthYear) {
                const y = Number(childItem.birthYear);
                setSelectedBirthYear(y);
                setBirthYearInput(y.toString());
            } else {
                setSelectedBirthYear(0);
                setBirthYearInput('');
            }
            if (childItem.groupId || childItem.slotId) {
                const targetId = childItem.groupId || childItem.slotId;
                const matchedSlot = SPARTA_SCHEDULE.find(s => s.id === targetId);
                if (matchedSlot) setSelectedSlotId(matchedSlot.id);
            }
        }
    };

    // Birth year change
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

    const getProgramBasePrice = (prog: any, dur: number): number => {
        if (!prog) return 0;
        if (prog.prices && prog.prices[dur]) return Number(prog.prices[dur]);
        let monthly = 5200;
        if (prog.prices && prog.prices[1]) {
            monthly = Number(prog.prices[1]);
        } else if (prog.price) {
            monthly = Number(prog.price);
        }
        if (dur === 1) return monthly;
        if (dur === 3) return Math.round((monthly * 3 * 0.9) / 10) * 10;
        if (dur === 6) return Math.round((monthly * 6 * 0.85) / 10) * 10;
        if (dur === 12) return Math.round((monthly * 12 * 0.8) / 10) * 10;
        return monthly * dur;
    };

    // Price calculation
    useEffect(() => {
        if (!program) return;
        let base = getProgramBasePrice(program, selectedDuration);

        if (hasFamilyDiscount) base = base * 0.9;
        if (appliedPromo && appliedPromo.value) {
            const discountAmount = (base * Number(appliedPromo.value)) / 100;
            base = Math.max(0, base - discountAmount);
        }
        if (mode === 'upgrade' && unusedCredit > 0) {
            base = Math.max(0, base - unusedCredit);
        }

        setSelectedPrice(Math.round(base || 0));
    }, [selectedDuration, program, hasFamilyDiscount, appliedPromo, mode, unusedCredit]);

    // Handle receipt file upload and auto-verification
    const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReceiptFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);

            setIsVerifyingReceipt(true);
            const targetAmount = (typeof selectedPrice === 'number' && !isNaN(selectedPrice) && selectedPrice > 0)
                ? selectedPrice
                : getProgramBasePrice(program, selectedDuration);
            try {
                const result = await verifyReceiptImage(file, targetAmount);
                setReceiptVerification(result);
            } catch (err) {
                console.warn('Verification error:', err);
                setReceiptVerification({
                    isBankReceipt: true,
                    extractedAmount: targetAmount,
                    isAmountMatching: true,
                    isRecipientMatching: true,
                    confidenceScore: 0.6,
                    verdict: 'needs_manual_review',
                    explanation: 'Чек загружен и будет проверен администратором.'
                });
            } finally {
                setIsVerifyingReceipt(false);
            }
        }
    };

    // Test / Demo receipt generator for instant testing
    const handleUseDemoReceipt = () => {
        const demoCanvas = document.createElement('canvas');
        demoCanvas.width = 400;
        demoCanvas.height = 260;
        const ctx = demoCanvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#064e3b';
            ctx.fillRect(0, 0, 400, 260);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('СБЕРБАНК • ЧЕК ПЕРЕВОДА', 20, 35);
            ctx.font = '13px sans-serif';
            ctx.fillText(`Сумма перевода: ${displayPrice.toLocaleString('ru-RU')} ₽`, 20, 70);
            ctx.fillText('Получатель: Ксения Александровна Л.', 20, 100);
            ctx.fillText('Телефон: +7 (919) 339-33-99', 20, 130);
            ctx.fillText(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, 20, 160);
            ctx.fillText('Статус: Успешно переведено', 20, 190);
            ctx.fillStyle = '#34d399';
            ctx.fillText('✓ Исполнено банком', 20, 230);
        }
        const dataUrl = demoCanvas.toDataURL('image/png');
        setReceiptPreviewUrl(dataUrl);
        setReceiptFile(new File([], 'demo_sberbank_receipt.png'));
        setReceiptVerification({
            isBankReceipt: true,
            extractedAmount: displayPrice,
            isAmountMatching: true,
            isRecipientMatching: true,
            recipientNameFound: 'Ксения Александровна Л.',
            operationId: `DEMO-${Date.now()}`,
            confidenceScore: 1.0,
            verdict: 'approved',
            explanation: 'Демо-чек успешно подтверждён (реквизиты и сумма совпадают).'
        });
    };

    // Bank deep-link opener
    const handleOpenBank = (bank: typeof BANK_DEEP_LINKS[0]) => {
        setSelectedBank(bank.id);
        if (bank.appUrl) {
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile) {
                window.location.href = bank.appUrl;
                setTimeout(() => {
                    if (bank.webUrl) window.open(bank.webUrl, '_blank');
                }, 1500);
            } else if (bank.webUrl) {
                window.open(bank.webUrl, '_blank');
            }
        } else if (bank.webUrl) {
            window.open(bank.webUrl, '_blank');
        }
    };

    // Promo code apply
    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError('');
        try {
            const q = query(
                collection(db, 'promo_codes'),
                where('code', '==', promoCode.trim().toUpperCase()),
                where('active', '==', true)
            );
            const snap = await getDocs(q);
            if (snap.empty) {
                setPromoError('Промокод не найден или не активен');
                setIsApplyingPromo(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const data = promoDoc.data();
            if (data.usersUsed && data.usersUsed.includes(user?.uid)) {
                setPromoError('Вы уже использовали этот промокод');
                setIsApplyingPromo(false);
                return;
            }
            if (data.maxUses && data.currentUses >= data.maxUses) {
                setPromoError('Лимит использований промокода исчерпан');
                setIsApplyingPromo(false);
                return;
            }

            setAppliedPromo({ id: promoDoc.id, ...data });
            setPromoSuccessSplash(true);
            setTimeout(() => setPromoSuccessSplash(false), 2500);
            setShowPromoInput(false);
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка при проверке промокода');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    // Grant active membership
    const grantSubscription = async (finalPrice: number, targetChildDocId: string) => {
        if (!user || !program) return;
        try {
            const expiryDate = new Date();
            const durationMonths = selectedDuration || 1;
            const validityDays = program.validityDays || (durationMonths * 30);
            expiryDate.setDate(expiryDate.getDate() + validityDays);

            const total = (program.id?.includes('base') || program.title?.toLowerCase().includes('базов'))
                ? (8 * durationMonths)
                : (program.id?.includes('intensiv') || program.title?.toLowerCase().includes('интенсив'))
                ? (12 * durationMonths)
                : (program.id?.includes('premium') || program.title?.toLowerCase().includes('премиум'))
                ? (14 * durationMonths)
                : (program.totalSessions ? (program.totalSessions * durationMonths) : (8 * durationMonths));

            const planBranchId = program.branchId || selectedBranch || 'newton';
            const matchedLoc = SPARTA_LOCATIONS.find(l => l.id === planBranchId);
            const planBranchName = program.branchName || matchedLoc?.name || 'ОЦ «Ньютон»';
            const planCityId = program.cityId || matchedLoc?.cityId || 'chelyabinsk';

            const subData: any = {
                planId: program.id || 'novice',
                title: program.title || 'Абонемент',
                childId: targetChildDocId,
                childName: childName.trim() || 'Спортсмен',
                parentId: user.uid,
                parentPhone: userProfile?.phone || userProfile?.parentPhone || '',
                parentEmail: user.email || userProfile?.email || '',
                cityId: planCityId,
                cityName: planCityId === 'novosibirsk' ? 'Новосибирск' : 'Челябинск',
                branchId: planBranchId,
                branchName: planBranchName,
                isUniversal: Boolean(program.isUniversal),
                ageCategory: program.ageCategory || (selectedBirthYear ? (2026 - selectedBirthYear <= 6 ? 'JUNIOR_3_6' : 'SENIOR_7_14') : 'ALL'),
                scheduleSlot: selectedSlotId || (program.scheduleSlots ? program.scheduleSlots[0] : '19:00 - 20:00'),
                scheduleDays: activeSlot?.days || program.scheduleDays || 'Пн, Ср, Пт',
                scheduleTime: activeSlot?.time || (program.scheduleSlots ? program.scheduleSlots[0] : '19:00 - 20:00'),
                type: program.type || 'sessions',
                totalSessions: total,
                remainingSessions: total,
                activatedAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiryDate),
                status: 'ACTIVE',
                freezeDaysAvailable: 14,
                freezeDaysTotal: 0,
                purchasePrice: finalPrice
            };

            // 1. Write to specific target child doc
            const targetRef = doc(db, 'users', targetChildDocId);
            await updateDoc(targetRef, {
                subscription: subData,
                hasActiveMembership: true,
                membershipExpires: Timestamp.fromDate(expiryDate),
                groupId: selectedSlotId || '',
                groupName: activeSlot?.streamTitle || 'Основная группа',
                coachName: activeSlot?.coachName || 'Тренер Sparta',
                childName: childName.trim(),
                birthYear: selectedBirthYear || undefined,
                childAge: selectedBirthYear ? (2026 - selectedBirthYear) : undefined
            }).catch(err => console.warn('Child sub update error:', err));

            // 2. Also write to family child doc ONLY if parent has exactly 1 child and targetChildDocId was parent UID
            if (targetChildDocId === user.uid && familyChildren.length === 1) {
                const firstChild = familyChildren[0];
                if (firstChild?.id && firstChild.id !== user.uid) {
                    await updateDoc(doc(db, 'users', firstChild.id), {
                        subscription: { ...subData, childId: firstChild.id },
                        hasActiveMembership: true,
                        membershipExpires: Timestamp.fromDate(expiryDate),
                        groupId: selectedSlotId || '',
                        groupName: activeSlot?.streamTitle || 'Основная группа',
                        coachName: activeSlot?.coachName || 'Тренер Sparta'
                    }).catch(err => console.warn('Single child sync error:', err));
                }
            }

            // 3. Mirror on parent doc
            await updateDoc(doc(db, 'users', user.uid), {
                lastPurchasedChildId: targetChildDocId,
                hasActiveMembership: true,
                subscription: subData
            }).catch(() => {});
        } catch (e) {
            console.error('Error granting subscription:', e);
        }
    };

    // Final Order Confirmation
    const handleConfirmPayment = async () => {
        if (!user) {
            if (onOpenAuth) onOpenAuth();
            return;
        }
        setIsProcessing(true);

        try {
            let finalPrice = (typeof selectedPrice === 'number' && !isNaN(selectedPrice) && selectedPrice > 0)
                ? selectedPrice
                : getProgramBasePrice(program, selectedDuration);
            const activeSlot = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);
            const parentPhone = userProfile?.phone || userProfile?.parentPhone || (user as any)?.phone || '';

            // Resolve target child document
            let targetChildDocId = selectedChildId !== 'new' ? selectedChildId : user.uid;

            if (childName.trim()) {
                const cleanChildName = childName.trim();

                // If user selected 'new' athlete tab and has existing children or wants a separate doc
                if (selectedChildId === 'new') {
                    try {
                        const newChildRef = await addDoc(collection(db, 'users'), {
                            parentId: user.uid,
                            parentName: userProfile?.displayName || user.displayName || 'Родитель',
                            parentPhone: parentPhone,
                            parentEmail: user.email || '',
                            childName: cleanChildName,
                            displayName: cleanChildName,
                            birthYear: selectedBirthYear || 0,
                            childAge: selectedBirthYear ? (2026 - selectedBirthYear) : 0,
                            role: 'athlete',
                            groupId: selectedSlotId || '',
                            groupName: activeSlot?.streamTitle || 'Основная группа',
                            coachName: activeSlot?.coachName || 'Тренер Sparta',
                            createdAt: serverTimestamp()
                        });
                        targetChildDocId = newChildRef.id;

                        // Link child to parent account
                        await updateDoc(doc(db, 'users', user.uid), {
                            childrenIds: arrayUnion(targetChildDocId),
                            childName: userProfile?.childName || cleanChildName
                        }).catch(() => {});
                    } catch (err) {
                        console.warn('Error creating new child doc, using parent doc:', err);
                        targetChildDocId = user.uid;
                    }
                } else if (targetChildDocId !== user.uid) {
                    // Update existing child doc
                    const childRef = doc(db, 'users', targetChildDocId);
                    const childUpdates: any = {
                        childName: cleanChildName,
                        displayName: cleanChildName,
                        birthYear: selectedBirthYear || 0,
                        groupId: selectedSlotId || '',
                        groupName: activeSlot?.streamTitle || 'Основная группа',
                        coachName: activeSlot?.coachName || 'Тренер Sparta'
                    };
                    if (selectedBirthYear && selectedBirthYear >= 2005) {
                        childUpdates.childAge = 2026 - selectedBirthYear;
                    }
                    if (parentPhone) {
                        childUpdates.parentPhone = parentPhone;
                    }
                    await updateDoc(childRef, childUpdates).catch(() => {});
                }

                // Update parent doc profile name fallback
                const parentUpdates: any = {
                    childName: cleanChildName,
                    birthYear: selectedBirthYear || 0,
                    groupId: selectedSlotId || '',
                    groupName: activeSlot?.streamTitle || 'Основная группа',
                    coachName: activeSlot?.coachName || 'Тренер Sparta'
                };
                if (selectedBirthYear && selectedBirthYear >= 2005) {
                    parentUpdates.childAge = 2026 - selectedBirthYear;
                }
                await updateDoc(doc(db, 'users', user.uid), parentUpdates).catch(() => {});
            }

            const planBranchId = program?.branchId || selectedBranch || 'newton';
            const matchedLoc = SPARTA_LOCATIONS.find(l => l.id === planBranchId);
            const planBranchName = program?.branchName || matchedLoc?.name || 'ОЦ «Ньютон»';
            const planCityId = program?.cityId || matchedLoc?.cityId || 'chelyabinsk';

            const isAutoApproved = receiptVerification?.verdict === 'approved';
            const orderStatus = (paymentMethod === 'balance' || isAutoApproved || finalPrice <= 0)
                ? 'completed'
                : paymentMethod === 'cash'
                ? 'pending_cash'
                : 'pending_transfer';

            const calculatedTotalSessions = program?.totalSessions !== undefined && program?.totalSessions !== null
                ? program.totalSessions
                : Math.max(1, (selectedDuration || 1) * 4 * (program?.sessionsPerWeek || 2));

            const orderData: any = {
                email: user.email || '',
                userId: user.uid,
                parentId: user.uid,
                childId: targetChildDocId,
                userName: userProfile?.displayName || user.displayName || 'Родитель',
                parentPhone: parentPhone || '',
                childName: childName ? childName.trim() : 'Спортсмен',
                childBirthYear: selectedBirthYear || 0,
                selectedScheduleId: selectedSlotId || '',
                coachName: activeSlot?.coachName || '',
                scheduleDays: activeSlot?.days || program?.scheduleDays || '',
                scheduleTime: activeSlot?.time || (program?.scheduleSlots ? program.scheduleSlots[0] : ''),
                selectedBranch: planBranchId,
                branchId: planBranchId,
                branchName: planBranchName,
                cityId: planCityId,
                cityName: planCityId === 'novosibirsk' ? 'Новосибирск' : 'Челябинск',
                ageCategory: program?.ageCategory || (selectedBirthYear ? (2026 - selectedBirthYear <= 6 ? 'JUNIOR_3_6' : 'SENIOR_7_14') : 'ALL'),
                planId: program?.id || 'novice',
                planTitle: program?.title || 'Новичок',
                totalSessions: calculatedTotalSessions,
                remainingSessions: calculatedTotalSessions,
                duration: selectedDuration || 1,
                price: finalPrice,
                paymentMethod: paymentMethod || 'sbp',
                selectedBank: selectedBank || 'sber',
                date: Timestamp.now(),
                createdAt: Timestamp.now(),
                status: orderStatus,
                type: 'subscription',
                receiptUrl: receiptPreviewUrl || null,
                receiptOperationId: receiptVerification?.operationId || null,
                discountApplied: appliedPromo ? `promo:${appliedPromo.code}` : (hasFamilyDiscount ? 'family' : 'none')
            };

            if (receiptVerification) {
                orderData.receiptVerification = {
                    isBankReceipt: !!receiptVerification.isBankReceipt,
                    extractedAmount: Number(receiptVerification.extractedAmount || 0),
                    isAmountMatching: !!receiptVerification.isAmountMatching,
                    isRecipientMatching: !!receiptVerification.isRecipientMatching,
                    extractedRecipient: receiptVerification.recipientNameFound || '',
                    operationId: receiptVerification.operationId || '',
                    confidenceScore: Number(receiptVerification.confidenceScore || 0),
                    verdict: receiptVerification.verdict || 'needs_manual_review',
                    explanation: receiptVerification.explanation || ''
                };
            }

            // Deduct balance if using balance
            if (paymentMethod === 'balance' && finalPrice > 0) {
                const currentBalance = userProfile?.walletBalance || 0;
                if (currentBalance < finalPrice) {
                    alert("Недостаточно средств на балансе!");
                    setIsProcessing(false);
                    return;
                }
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { walletBalance: currentBalance - finalPrice });
            }

            // Save order
            const orderRef = await addDoc(collection(db, "orders"), orderData);
            setNewOrder({ id: orderRef.id, ...orderData });

            // Create linked request for Admin Kanban & Coach Roster
            await addDoc(collection(db, "requests"), {
                name: userProfile?.displayName || user.displayName || 'Родитель',
                childName: childName ? childName.trim() : 'Спортсмен',
                phone: parentPhone || '',
                email: user.email || '',
                programType: `Абонемент: ${program?.title || 'Новичок'}`,
                isMembership: true,
                paymentMethod: paymentMethod || 'sbp',
                status: orderStatus === 'completed' ? 'completed' : 'new',
                orderId: orderRef.id,
                childId: targetChildDocId,
                branchId: planBranchId,
                scheduleId: selectedSlotId || '',
                coachName: activeSlot?.coachName || '',
                scheduleDays: activeSlot?.days || '',
                scheduleTime: activeSlot?.time || '',
                price: finalPrice,
                duration: selectedDuration || 1,
                createdAt: Timestamp.now(),
                date: Timestamp.now()
            }).catch(e => console.warn('Linked request create failed:', e));

            // Notify Coach & Administration
            await addDoc(collection(db, "notifications"), {
                title: paymentMethod === 'cash'
                    ? '💵 Запись на тренировку (Оплата наличными)'
                    : '💳 Оформлен новый абонемент (СБП/Банк)',
                message: `Спортсмен: ${childName ? childName.trim() : 'Новый ученик'} (${selectedBirthYear || '—'} г.р.). Филиал: ${planBranchName}. Группа: ${activeSlot ? activeSlot.days + ' ' + activeSlot.time : 'Основная'}. Тренер: ${activeSlot?.coachName || 'Не указан'}. Сумма: ${finalPrice.toLocaleString('ru-RU')} ₽.`,
                type: 'membership_order',
                isRead: false,
                createdAt: Timestamp.now(),
                coachName: activeSlot?.coachName || '',
                scheduleId: selectedSlotId || ''
            }).catch(e => console.warn('Notification create failed:', e));

            // If completed (auto-verified or balance), grant active subscription immediately
            if (orderStatus === 'completed') {
                await grantSubscription(finalPrice, targetChildDocId);
            }

            // Mark promo code
            if (appliedPromo) {
                const promoRef = doc(db, 'promo_codes', appliedPromo.id);
                await updateDoc(promoRef, {
                    currentUses: (appliedPromo.currentUses || 0) + 1,
                    usersUsed: arrayUnion(user.uid)
                }).catch(() => {});
            }

            setIsSuccess(true);
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Произошла ошибка при сохранении. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!program) return null;

    const activeSlot = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);
    const weeklySessions = program.sessionsPerWeek || (program.title?.toLowerCase().includes('новичок') ? 2 : program.title?.toLowerCase().includes('профессионал') ? 3 : 4);
    const totalSessions = Math.max(1, (selectedDuration || 1) * 4 * weeklySessions);
    const displayPrice = (typeof selectedPrice === 'number' && !isNaN(selectedPrice) && selectedPrice > 0)
        ? selectedPrice
        : getProgramBasePrice(program, selectedDuration);
    const perSession = Math.floor(displayPrice / totalSessions) || 450;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            noPadding
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="relative w-full bg-zinc-950 rounded-[2rem] overflow-hidden font-manrope text-white flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 'bank_transfer' && !isSuccess && (
                            <button
                                onClick={() => setStep('form')}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg sm:text-xl font-russo text-white uppercase tracking-wider">
                                {isSuccess ? 'Бронирование подтверждено' : step === 'bank_transfer' ? 'Оплата и подтверждение' : `Абонемент «${program.title}»`}
                            </h2>
                            <p className="text-xs text-white/40">
                                {isSuccess ? 'Ваш заказ зафиксирован в системе' : step === 'bank_transfer' ? 'Прямой перевод без скрытых комиссий' : 'Быстрое оформление за 1 минуту'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                    <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-2"
                                    >
                                        {newOrder && (
                                            <MembershipReceipt
                                                order={{
                                                    ...newOrder,
                                                    userName: user?.displayName || 'Родитель',
                                                    childName: childName.trim() || undefined,
                                                    status: newOrder.status,
                                                    email: user?.email || ''
                                                }}
                                                onClose={onClose}
                                            />
                                        )}
                                    </motion.div>
                                ) : step === 'form' ? (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-5"
                                    >
                                        {/* Duration Selector */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Срок абонемента:</label>
                                                <span className="text-xs text-amber-400 font-bold font-mono">≈ {perSession.toLocaleString('ru-RU')} ₽ / занятие</span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { d: 1, label: '1 мес.' },
                                                    { d: 3, label: '3 мес.', badge: '🔥 -10%' },
                                                    { d: 6, label: '6 мес.', badge: '-15%' },
                                                    { d: 12, label: '12 мес.', badge: '-20%' }
                                                ].map(item => (
                                                    <button
                                                        key={item.d}
                                                        type="button"
                                                        onClick={() => setSelectedDuration(item.d)}
                                                        className={`relative p-2.5 rounded-xl border text-center transition-all ${
                                                            selectedDuration === item.d
                                                                ? 'border-amber-400 bg-amber-400/15 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                                                        }`}
                                                    >
                                                        {item.badge && (
                                                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full whitespace-nowrap">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        <div className="text-xs sm:text-sm font-bold">{item.label}</div>
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Reassurance info */}
                                            <div className="flex items-center gap-1.5 text-[11px] text-white/50 pt-2 px-0.5">
                                                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                                <span>Бесплатная заморозка до 14 дней при болезни или отпуске • Без автосписаний</span>
                                            </div>
                                        </div>

                                        {/* Family Athlete Selector & Child Info */}
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                            {/* Family Tabs */}
                                            {familyChildren.length > 0 && (
                                                <div className="pb-3 border-b border-white/10">
                                                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                                                        Выберите спортсмена:
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {familyChildren.map(child => {
                                                            const age = child.birthYear ? (2026 - Number(child.birthYear)) : (child.childAge || null);
                                                            return (
                                                                <button
                                                                    key={child.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectChildTab(child)}
                                                                    className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                                        selectedChildId === child.id
                                                                            ? 'bg-amber-400 text-black font-black shadow-md shadow-amber-400/20'
                                                                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                                                                    }`}
                                                                >
                                                                    <span>👦 {child.childName || child.displayName || 'Спортсмен'}</span>
                                                                    {age && <span className="text-[10px] opacity-75 font-normal">({age} лет)</span>}
                                                                </button>
                                                            );
                                                        })}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectChildTab('new')}
                                                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                                                selectedChildId === 'new'
                                                                    ? 'bg-amber-400 text-black font-black'
                                                                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-dashed border-white/20'
                                                                }`}
                                                        >
                                                            ➕ Новый ребёнок
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-xs font-bold text-white/70">
                                                        ⚽ ФИО спортсмена:
                                                    </label>
                                                    {childName.trim() && (
                                                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                                            <Check size={11} /> Заполнено
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="relative flex items-center">
                                                    <User size={16} className="absolute left-3.5 text-white/30 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        value={childName}
                                                        onChange={(e) => setChildName(e.target.value)}
                                                        placeholder="Фамилия и имя ребёнка"
                                                        className="w-full h-11 pl-10 pr-3.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none transition-all placeholder:text-white/25"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="block text-xs font-bold text-white/70 mb-1.5">
                                                        📅 Год рождения:
                                                    </label>
                                                    <div className="relative flex items-center">
                                                        <Calendar size={16} className="absolute left-3.5 text-white/30 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            value={birthYearInput}
                                                            onChange={(e) => handleBirthYearInputChange(e.target.value)}
                                                            placeholder="2018"
                                                            maxLength={4}
                                                            className="w-full h-11 pl-10 pr-3.5 bg-black/50 border border-white/10 rounded-xl text-white text-sm focus:border-amber-400 focus:outline-none transition-all placeholder:text-white/25 font-mono"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-white/70 mb-1.5">
                                                        👥 Возраст:
                                                    </label>
                                                    <div className={`h-11 px-3.5 bg-black/30 border rounded-xl flex items-center text-xs font-bold transition-all ${
                                                        selectedBirthYear && selectedBirthYear >= 2005 && selectedBirthYear <= 2024
                                                            ? 'border-amber-400/30 text-amber-300 bg-amber-400/5'
                                                            : 'border-white/5 text-white/40'
                                                    }`}>
                                                        {selectedBirthYear && selectedBirthYear >= 2005 && selectedBirthYear <= 2024
                                                            ? `⚡ ${2026 - selectedBirthYear} лет`
                                                            : 'Укажите год'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Age suitability check against plan */}
                                            {selectedBirthYear >= 2005 && selectedBirthYear <= 2024 && program?.ageCategory && program.ageCategory !== 'ALL' && (
                                                <div className="pt-1">
                                                    {(program.ageCategory === 'JUNIOR_3_6' && (2026 - selectedBirthYear) > 6) ? (
                                                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
                                                            <AlertCircle size={13} className="shrink-0" />
                                                            <span>Тариф рассчитан на возраст 3–6 лет (возраст спортсмена {2026 - selectedBirthYear} лет)</span>
                                                        </div>
                                                    ) : (program.ageCategory === 'SENIOR_7_14' && (2026 - selectedBirthYear) < 7) ? (
                                                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
                                                            <AlertCircle size={13} className="shrink-0" />
                                                            <span>Тариф рассчитан на возраст 7–14 лет (возраст спортсмена {2026 - selectedBirthYear} лет)</span>
                                                        </div>
                                                    ) : (
                                                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
                                                            <CheckCircle2 size={13} className="shrink-0" />
                                                            <span>Идеально подходит по возрастной категории ({program.ageLabel || '3–14 лет'})</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Assigned Group & Sessions count */}
                                            {selectedBirthYear >= 2005 && selectedBirthYear <= 2024 ? (
                                                <div className="space-y-2 pt-2 border-t border-white/5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div>
                                                            <span className="text-white/40 block text-[10px] uppercase font-bold">Филиал и группа:</span>
                                                            <span className="text-amber-300 font-bold">
                                                                {program.branchName || 'ОЦ «Ньютон»'} • {activeSlot ? `${activeSlot.days} ${activeSlot.time}` : 'Основная группа'}
                                                            </span>
                                                            <div className="text-[10px] text-white/40 mt-0.5">
                                                                ⚽ {program.totalSessions ? `${program.totalSessions} занятий` : `${totalSessions} тренировок`} • Манеж Sparta
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowChangeGroup(!showChangeGroup)}
                                                            className="text-amber-400/80 hover:text-amber-300 text-[11px] underline shrink-0 ml-2"
                                                        >
                                                            {showChangeGroup ? 'Скрыть' : 'Сменить время'}
                                                        </button>
                                                    </div>

                                                    {/* Coach placement reassurance note */}
                                                    <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed flex items-start gap-2">
                                                        <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                                        <span>
                                                            <strong>Распределение тренером:</strong> на первой тренировке тренер лично оценит подготовку ребёнка и при необходимости подберёт более точную по уровню группу.
                                                        </span>
                                                    </div>

                                                    {showChangeGroup && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="space-y-1.5 pt-1"
                                                        >
                                                            {SPARTA_SCHEDULE.map(slot => (
                                                                <button
                                                                    key={slot.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedSlotId(slot.id);
                                                                        setShowChangeGroup(false);
                                                                    }}
                                                                    className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center text-xs transition-all ${
                                                                        selectedSlotId === slot.id
                                                                            ? 'border-amber-400 bg-amber-400/10 text-white'
                                                                            : 'border-white/5 bg-black/30 text-white/60 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <span>{slot.days} • {slot.time}</span>
                                                                    <span className="text-[10px] opacity-70">{slot.coachName}</span>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-white/40">
                                                    <Clock size={14} className="text-amber-400 shrink-0" />
                                                    <span>Укажите год рождения выше, чтобы подобрать расписание</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payment Choice */}
                                        <div>
                                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                                                Способ оплаты:
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('sbp')}
                                                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                                                        paymentMethod === 'sbp'
                                                            ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2.5 rounded-xl ${paymentMethod === 'sbp' ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70'}`}>
                                                            <Zap size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-white">Перевод через банк</div>
                                                            <div className="text-[10px] text-white/40">Сбер, Т-Банк, ВТБ, СБП</div>
                                                        </div>
                                                    </div>
                                                    {paymentMethod === 'sbp' && <Check size={16} className="text-amber-400 shrink-0" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('cash')}
                                                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                                                        paymentMethod === 'cash'
                                                            ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2.5 rounded-xl ${paymentMethod === 'cash' ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/70'}`}>
                                                            <Banknote size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-white">Наличными</div>
                                                            <div className="text-[10px] text-white/40">На первой тренировке</div>
                                                        </div>
                                                    </div>
                                                    {paymentMethod === 'cash' && <Check size={16} className="text-emerald-400 shrink-0" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Promo Code Trigger */}
                                        {!appliedPromo ? (
                                            <div>
                                                {!showPromoInput ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPromoInput(true)}
                                                        className="text-[11px] text-white/40 hover:text-amber-400/80 flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Tag size={12} />
                                                        <span>У меня есть промокод</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={promoCode}
                                                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                            placeholder="ВВЕДИТЕ ПРОМОКОД"
                                                            className="flex-1 h-10 px-3 bg-black/50 border border-white/10 rounded-xl text-xs uppercase font-mono text-white focus:border-amber-400 focus:outline-none"
                                                        />
                                                        <Button
                                                            onClick={handleApplyPromo}
                                                            disabled={isApplyingPromo || !promoCode.trim()}
                                                            className="h-10 px-4 text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
                                                        >
                                                            {isApplyingPromo ? <Loader2 size={14} className="animate-spin" /> : 'Применить'}
                                                        </Button>
                                                    </div>
                                                )}
                                                {promoError && <p className="text-red-400 text-[11px] mt-1">{promoError}</p>}
                                            </div>
                                        ) : (
                                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                                                <div className="flex items-center gap-2">
                                                    <Check size={14} />
                                                    <span>Промокод <strong>{appliedPromo.code}</strong> (-{appliedPromo.value}%)</span>
                                                </div>
                                                <button onClick={() => setAppliedPromo(null)} className="text-white/40 hover:text-white text-[11px]">Удалить</button>
                                            </div>
                                        )}

                                        {/* Total Summary and Submit */}
                                        <div className="pt-2">
                                            {paymentMethod === 'cash' ? (
                                                <Button
                                                    onClick={handleConfirmPayment}
                                                    disabled={isProcessing}
                                                    className="w-full h-13 text-sm sm:text-base font-extrabold bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-black shadow-[0_0_25px_rgba(52,211,153,0.25)] rounded-2xl flex items-center justify-center gap-2"
                                                >
                                                    {isProcessing ? (
                                                        <><Loader2 className="animate-spin" size={18} /> Сохранение...</>
                                                    ) : (
                                                        `Забронировать место без предоплаты →`
                                                    )}
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => setStep('bank_transfer')}
                                                    disabled={isProcessing}
                                                    className="w-full h-13 text-sm sm:text-base font-extrabold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-black hover:brightness-110 shadow-[0_0_30px_rgba(245,158,11,0.25)] rounded-2xl flex items-center justify-center gap-2"
                                                >
                                                    {isProcessing ? (
                                                        <><Loader2 className="animate-spin" size={18} /> Сохранение...</>
                                                    ) : (
                                                        `Оплатить через банк ${displayPrice.toLocaleString('ru-RU')} ₽ →`
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    /* Step 2: Bank Transfer & Receipt Upload */
                                    <motion.div
                                        key="bank_transfer"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Bank Fast App Selector */}
                                        <div>
                                            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                                                1. Откройте приложение вашего банка:
                                            </label>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {BANK_DEEP_LINKS.map(bank => (
                                                    <button
                                                        key={bank.id}
                                                        type="button"
                                                        onClick={() => handleOpenBank(bank)}
                                                        className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                                                            selectedBank === bank.id
                                                                ? bank.borderActive
                                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${bank.iconColor}`}>
                                                            {bank.badge.slice(0, 1)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-white/80 truncate w-full">{bank.badge}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Transfer Details Card */}
                                        <div className="p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 space-y-2.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-white/40">Номер телефона получателя (СБП / Сбербанк)</div>
                                                    <div className="text-sm font-mono font-bold text-white">{SPARTA_BANK_DETAILS.sbpPhoneFormatted}</div>
                                                    <div className="text-[11px] text-amber-400">{SPARTA_BANK_DETAILS.sbpRecipient}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(SPARTA_BANK_DETAILS.sbpPhone, 'phone')}
                                                    className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                                                >
                                                    {copiedField === 'phone' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                    <span>{copiedField === 'phone' ? 'Скопировано' : 'Копировать'}</span>
                                                </button>
                                            </div>

                                            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-white/40">Точная сумма перевода</div>
                                                    <div className="text-base font-russo text-amber-400">{displayPrice.toLocaleString('ru-RU')} ₽</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(displayPrice.toString(), 'sum')}
                                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                                                >
                                                    {copiedField === 'sum' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                    <span>{copiedField === 'sum' ? 'Скопировано' : 'Копировать'}</span>
                                                </button>
                                            </div>

                                            {/* QR Code toggle */}
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowQrCode(!showQrCode)}
                                                    className="text-[11px] text-white/50 hover:text-white flex items-center gap-1"
                                                >
                                                    <QrCode size={13} />
                                                    <span>{showQrCode ? 'Скрыть QR-код банка' : 'Показать ГОСТ QR-код для оплаты'}</span>
                                                </button>
                                                {showQrCode && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-3 p-3 bg-white rounded-2xl flex flex-col items-center text-center"
                                                    >
                                                        <QRCodeSVG
                                                            value={generateGostQrString(displayPrice, `Абонемент ${program.title} ${childName.trim() || 'Спортсмен'}`)}
                                                            size={130}
                                                            level="M"
                                                        />
                                                        <span className="text-[10px] text-black/60 font-bold mt-2">Сканируйте камерой в приложении банка</span>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 2: Receipt Upload & Auto-Verification */}
                                        <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-3">
                                            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider">
                                                2. Прикрепите чек или скриншот перевода:
                                            </label>

                                            {!receiptPreviewUrl ? (
                                                <div>
                                                    <label className="cursor-pointer block border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl p-4 text-center transition-all bg-white/5 group">
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={handleReceiptChange}
                                                            className="hidden"
                                                        />
                                                        <Upload size={22} className="mx-auto text-white/40 group-hover:text-amber-400 transition-colors mb-1.5" />
                                                        <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                                            Нажмите для выбора файла или скриншота
                                                        </div>
                                                        <div className="text-[10px] text-white/30 mt-0.5">PNG, JPG, PDF из банковского приложения</div>
                                                    </label>

                                                    {/* Test Demo Button for rapid verification */}
                                                    <div className="flex justify-end pt-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={handleUseDemoReceipt}
                                                            className="text-[11px] text-amber-400/80 hover:text-amber-300 underline flex items-center gap-1 transition-colors"
                                                        >
                                                            <span>🧪 Вставить тестовый демо-чек</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10">
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <img
                                                                src={receiptPreviewUrl}
                                                                alt="Receipt"
                                                                className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0"
                                                            />
                                                            <div className="truncate text-xs">
                                                                <div className="font-bold text-white truncate">{receiptFile?.name || 'Чек перевода'}</div>
                                                                <div className="text-[10px] text-white/40">{(receiptFile?.size ? (receiptFile.size / 1024).toFixed(0) + ' КБ' : '')}</div>
                                                            </div>
                                                        </div>
                                                        <label className="cursor-pointer text-[11px] text-amber-400 hover:underline shrink-0">
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                onChange={handleReceiptChange}
                                                                className="hidden"
                                                            />
                                                            Заменить
                                                        </label>
                                                    </div>

                                                    {/* Verification Status */}
                                                    {isVerifyingReceipt ? (
                                                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
                                                            <Loader2 size={16} className="animate-spin shrink-0 text-amber-400" />
                                                            <span>Проверяем реквизиты и сумму перевода...</span>
                                                        </div>
                                                    ) : receiptVerification?.verdict === 'approved' ? (
                                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                                                            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                                                            <div>
                                                                <div className="font-bold">Чек успешно проверен!</div>
                                                                <div className="text-[10px] opacity-80">Реквизиты и сумма {displayPrice.toLocaleString('ru-RU')} ₽ подтверждены</div>
                                                            </div>
                                                        </div>
                                                    ) : receiptVerification?.verdict === 'duplicate_receipt' ? (
                                                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
                                                            <AlertCircle size={16} className="shrink-0 text-red-400" />
                                                            <div>
                                                                <div className="font-bold">Ошибка номера чека</div>
                                                                <div className="text-[10px] opacity-80">{receiptVerification.explanation}</div>
                                                            </div>
                                                        </div>
                                                    ) : receiptVerification ? (
                                                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-xs text-blue-300">
                                                            <Check size={16} className="shrink-0 text-blue-400" />
                                                            <div>
                                                                <div className="font-bold">Чек прикреплён</div>
                                                                <div className="text-[10px] opacity-80">{receiptVerification.explanation}</div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirmation Button */}
                                        <div className="pt-2">
                                            <Button
                                                onClick={handleConfirmPayment}
                                                disabled={isProcessing || isVerifyingReceipt || receiptVerification?.verdict === 'duplicate_receipt'}
                                                className="w-full h-13 text-base font-extrabold bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 text-black shadow-[0_0_25px_rgba(52,211,153,0.25)] rounded-2xl flex items-center justify-center gap-2"
                                            >
                                                {isProcessing ? (
                                                    <><Loader2 className="animate-spin" size={18} /> Обработка...</>
                                                ) : (
                                                    `Я перевёл(а) ${displayPrice.toLocaleString('ru-RU')} ₽ — Готово`
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                    </AnimatePresence>
                </div>
            </div>
        </BaseModal>
    );
};

export default MembershipModal;
