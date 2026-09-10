import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    CheckCircle2, 
    Sparkles, 
    ArrowRight, 
    ArrowLeft,
    Send, 
    Shield,
    MessageSquare,
    MapPin,
    Navigation,
    Heart,
    Zap
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { SPARTA_SCHEDULE, ScheduleSlot } from '../constants/spartaSchedule';
import { linkStudentToGroup } from '../utils/studentLinking';
import { safeLocalStorage } from '../utils/storage';
import confetti from 'canvas-confetti';
import { BaseModal } from './ui/BaseModal';

interface SmartEnrollmentWizardProps {
    user: any;
    onComplete: () => void;
    onContactLink?: () => void;
    selectedGroup?: { id: string; name: string } | null;
}

const SmartEnrollmentWizard: React.FC<SmartEnrollmentWizardProps> = ({ 
    user, 
    onComplete, 
    onContactLink, 
    selectedGroup 
}) => {
    const { userProfile, refreshTrialStatus } = useAuth();
    const { allLocations, selectedCity } = useCity();
    const currentYear = new Date().getFullYear();

    // Step: 1 (Child & Branch & Schedule), 2 (Parent Contacts & Care), 3 (Clean Ticket)
    const [step, setStep] = useState<1 | 2 | 3>(() => {
        const saved = sessionStorage.getItem('sparta_wizard_step');
        return saved === '3' ? 3 : saved === '2' ? 2 : 1;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Step 1: Child & Branch ---
    const [childLastName, setChildLastName] = useState(userProfile?.childLastName || '');
    const [childFirstName, setChildFirstName] = useState(userProfile?.childName || 'Ваня');
    const [birthDate, setBirthDate] = useState('15.04.2020');
    const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'active' | 'experienced'>('beginner');
    const [selectedLocationId, setSelectedLocationId] = useState<string>('newton');
    const [selectedSlotId, setSelectedSlotId] = useState<string>('ponomarev_4');
    const [showAllSchedule, setShowAllSchedule] = useState(false);
    const [groupCapacityMap, setGroupCapacityMap] = useState<Record<string, { occupied: number; maxCapacity: number }>>({});

    // Filter branches to Chelyabinsk only
    const activeBranches = useMemo(() => {
        return allLocations.filter(loc => loc.id !== 'miass_ecotime' && loc.cityId !== 'miass');
    }, [allLocations]);

    // Real-time group occupancy sync from Firestore
    useEffect(() => {
        const fetchOccupancy = async () => {
            try {
                const countByGroup: Record<string, number> = {};

                // 1. Count actual enrolled students in groups from students collection
                const studentsSnap = await getDocs(collection(db, 'students'));
                studentsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const gId = data.groupId;
                    if (gId) {
                        countByGroup[gId] = (countByGroup[gId] || 0) + 1;
                    }
                });

                // 2. Count active trial applications if any
                const trialsSnap = await getDocs(collection(db, 'trials'));
                trialsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const gId = data.groupId;
                    if (gId) {
                        countByGroup[gId] = (countByGroup[gId] || 0) + 1;
                    }
                });

                // 3. Build live capacity map
                const map: Record<string, { occupied: number; maxCapacity: number }> = {};
                SPARTA_SCHEDULE.forEach(slot => {
                    const firestoreCount = (slot.firestoreGroupId && countByGroup[slot.firestoreGroupId]) ?? countByGroup[slot.id];
                    const maxCap = slot.maxCapacity || 20;
                    const occupied = Math.min(
                        maxCap,
                        firestoreCount !== undefined ? firestoreCount : (slot.initialOccupied || 16)
                    );
                    map[slot.id] = {
                        occupied,
                        maxCapacity: maxCap
                    };
                });
                setGroupCapacityMap(map);
            } catch (e) {
                console.error("Error loading group occupancy:", e);
            }
        };

        fetchOccupancy();
    }, []);

    // --- Step 2: Parent Contacts & Care ---
    const [parentLastName, setParentLastName] = useState(userProfile?.parentLastName || '');
    const [parentFirstName, setParentFirstName] = useState(userProfile?.displayName || userProfile?.parentName || user?.displayName || '');
    const [parentPhone, setParentPhone] = useState(userProfile?.phone || user?.phoneNumber || '');
    const [parentComment, setParentComment] = useState('');

    // Update step helper
    const updateStep = (newStep: 1 | 2 | 3) => {
        sessionStorage.setItem('sparta_wizard_step', String(newStep));
        setStep(newStep);
    };

    // Calculate effective birth year and age automatically from date DD.MM.YYYY
    const { calculatedYear, calculatedAge, isValidDate } = useMemo(() => {
        const parts = birthDate.split('.');
        if (parts.length === 3 && parts[2]?.length === 4) {
            const y = parseInt(parts[2], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[0], 10);
            if (!isNaN(y) && y >= 2008 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return {
                    calculatedYear: y,
                    calculatedAge: Math.max(3, currentYear - y),
                    isValidDate: true
                };
            }
        }
        return {
            calculatedYear: 2020,
            calculatedAge: 6,
            isValidDate: false
        };
    }, [birthDate, currentYear]);

    // Matching schedule slots based on age
    const matchingSlots = useMemo(() => {
        const filtered = SPARTA_SCHEDULE.filter(slot => 
            slot.birthYears.includes(calculatedYear)
        );
        return filtered.length > 0 ? filtered : [SPARTA_SCHEDULE[5], SPARTA_SCHEDULE[0]];
    }, [calculatedYear]);

    // Active Slot
    const selectedSlot = useMemo(() => {
        const found = SPARTA_SCHEDULE.find(s => s.id === selectedSlotId);
        if (found) return found;
        return matchingSlots[0] || SPARTA_SCHEDULE[0];
    }, [selectedSlotId, matchingSlots]);

    // Active Location
    const selectedLocation = useMemo(() => {
        const found = allLocations.find(l => l.id === selectedLocationId);
        if (found) return found;
        return allLocations[0] || {
            id: 'newton',
            name: 'ОЦ «Ньютон»',
            address: 'ул. 250-летия Челябинска, 46',
            city: 'Челябинск',
            href: 'https://yandex.ru/maps/?text=%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%2C%20%D1%83%D0%BB%D0%B8%D1%86%D0%B0%20250-%D0%BB%D0%B5%D1%82%D0%B8%D1%8F%20%D0%A7%D0%B5%D0%BB%D1%8F%D0%B1%D0%B8%D0%BD%D1%81%D0%BA%D0%B0%2C%2046'
        };
    }, [allLocations, selectedLocationId]);

    // Sync if opened with a pre-selected group
    useEffect(() => {
        if (selectedGroup?.id) {
            const found = SPARTA_SCHEDULE.find(s => s.id === selectedGroup.id);
            if (found) {
                setSelectedSlotId(found.id);
                if (found.birthYears && found.birthYears.length > 0) {
                    setBirthDate(`15.05.${found.birthYears[0]}`);
                }
            }
        }
    }, [selectedGroup]);

    // Date mask handler
    const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.substring(0, 8);

        let formatted = '';
        if (value.length > 0) formatted = value.substring(0, 2);
        if (value.length >= 3) formatted += '.' + value.substring(2, 4);
        if (value.length >= 5) formatted += '.' + value.substring(4, 8);

        setBirthDate(formatted);
    };

    // Phone mask handler
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('8')) value = '7' + value.slice(1);
        if (!value.startsWith('7') && value.length > 0) value = '7' + value;
        
        let formatted = '+7';
        if (value.length > 1) formatted += ' (' + value.substring(1, 4);
        if (value.length >= 5) formatted += ') ' + value.substring(4, 7);
        if (value.length >= 8) formatted += '-' + value.substring(7, 9);
        if (value.length >= 10) formatted += '-' + value.substring(9, 11);
        
        setParentPhone(value.length <= 1 ? '' : formatted);
    };

    // Go to Step 2 Validation
    const handleNextToStep2 = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!childFirstName.trim()) {
            setError('Пожалуйста, укажите имя ребенка');
            return;
        }

        if (birthDate.length < 10) {
            setError('Пожалуйста, укажите полную дату рождения (ДД.ММ.ГГГГ)');
            return;
        }

        updateStep(2);
    };

    // Final Booking Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const rawPhone = parentPhone.replace(/\D/g, '');
        if (rawPhone.length < 10) {
            setError('Пожалуйста, укажите корректный номер телефона');
            return;
        }

        if (!parentFirstName.trim()) {
            setError('Пожалуйста, укажите имя родителя');
            return;
        }

        setLoading(true);

        try {
            let activeParentUid = (user && user.uid) ? user.uid : null;
            const fullChildName = `${childLastName.trim()} ${childFirstName.trim()}`.trim();
            const fullParentName = `${parentLastName.trim()} ${parentFirstName.trim()}`.trim();

            // 1. Create or query Parent Doc
            if (!activeParentUid) {
                const qPhone = query(collection(db, 'users'), where('phone', '==', parentPhone.trim()));
                const phoneSnap = await getDocs(qPhone);
                if (!phoneSnap.empty) {
                    activeParentUid = phoneSnap.docs[0].id;
                } else {
                    const newParentDoc = await addDoc(collection(db, 'users'), {
                        displayName: fullParentName,
                        name: fullParentName,
                        parentName: fullParentName,
                        parentLastName: parentLastName.trim(),
                        parentFirstName: parentFirstName.trim(),
                        phone: parentPhone.trim(),
                        role: 'parent',
                        status: 'active',
                        createdAt: serverTimestamp()
                    });
                    activeParentUid = newParentDoc.id;
                }
            }

            // 2. Set parent session
            if (activeParentUid) {
                safeLocalStorage.setItem('sparta_auth_user', JSON.stringify({
                    uid: activeParentUid,
                    displayName: fullParentName,
                    name: fullParentName,
                    role: 'parent',
                    status: 'active',
                    phone: parentPhone.trim()
                }));
            }


            // 3. Save trial booking
            const generatedKidPin = Math.floor(1000 + Math.random() * 9000).toString();
            const trialData = {
                parentId: activeParentUid,
                parentName: fullParentName,
                parentPhone: parentPhone.trim(),
                childName: fullChildName,
                childLastName: childLastName.trim(),
                childFirstName: childFirstName.trim(),
                childAge: calculatedAge,
                birthDate: birthDate.trim(),
                birthYear: calculatedYear,
                kidPin: generatedKidPin,
                experienceLevel,
                locationId: selectedLocation.id,
                locationName: selectedLocation.name,
                locationAddress: selectedLocation.address,
                slotId: selectedSlot.id,
                streamTitle: selectedSlot.streamTitle,
                days: selectedSlot.days,
                time: selectedSlot.time,
                coachName: selectedSlot.coachName,
                comment: parentComment.trim() || null,
                status: 'confirmed',
                type: 'trial_visit',
                source: 'sparta_smart_booking',
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'trials'), trialData);

            // Save in requests for Admin CRM
            await addDoc(collection(db, 'requests'), {
                childName: fullChildName,
                childAge: String(calculatedAge),
                birthDate: birthDate.trim(),
                parentName: fullParentName,
                parentPhone: parentPhone.trim(),
                locationId: selectedLocation.id,
                locationName: selectedLocation.name,
                comment: parentComment.trim() || null,
                userId: activeParentUid,
                status: 'new',
                programType: 'Пробная тренировка',
                groupId: selectedSlot.id,
                groupTitle: `${selectedSlot.streamTitle} (${selectedSlot.days} ${selectedSlot.time})`,
                createdAt: serverTimestamp(),
            });

            if (refreshTrialStatus) {
                try {
                    await refreshTrialStatus();
                } catch (e) {
                    console.warn('refreshTrialStatus error:', e);
                }
            }

            // Fire celebration confetti!
            try {
                confetti({
                    particleCount: 130,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#D4AF37', '#FFD700', '#FFA500', '#FFFFFF']
                });
            } catch (confettiErr) {
                console.warn('Confetti error:', confettiErr);
            }

            updateStep(3);
        } catch (err: any) {
            console.error('Error submitting trial registration:', err);
            setError('Произошла ошибка при сохранении. Пожалуйста, попробуйте еще раз.');
        } finally {
            setLoading(false);
        }
    };

    const fullChildDisplayName = `${childLastName.trim()} ${childFirstName.trim()}`.trim() || 'Юный спортсмен';

    const handleClose = () => {
        if (step === 3) {
            onComplete();
            window.location.href = '/dashboard';
        } else {
            onComplete();
        }
    };

    return (
        <BaseModal
            isOpen={true}
            onClose={handleClose}
            maxWidth="max-w-lg"
            noPadding
            showCloseButton={false}
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="relative w-full bg-[#121212] overflow-hidden max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] flex flex-col font-manrope text-left rounded-2xl sm:rounded-3xl">
                {/* Header (Compact) */}
                <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-white/10 relative z-10 shrink-0 bg-[#121212]/90">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-sparta-gold text-black flex items-center justify-center font-russo text-base font-black shadow-md shrink-0">
                            S
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sparta-gold bg-sparta-gold/10 px-1.5 py-0.5 rounded border border-sparta-gold/20">
                                    {step === 1 ? 'Шаг 1 из 2' : step === 2 ? 'Шаг 2 из 2' : '✓ Подтверждено'}
                                </span>
                                <h3 className="font-russo text-sm sm:text-base text-white">
                                    {step === 3 ? 'Пригласительный билет' : 'День знакомства со Sparta'}
                                </h3>
                            </div>
                            <p className="text-[11px] text-white/50 font-manrope truncate max-w-[240px] sm:max-w-none">
                                {step === 1 ? 'Подберем группу, где ребенку будет комфортно' : step === 2 ? 'Контакты для подтверждения визита' : 'Ждем вас на футбольном поле!'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        aria-label="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10 space-y-3">
                    <AnimatePresence mode="wait">
                        {/* ================= STEP 1: COMPACT CHILD & BRANCH & SCHEDULE ================= */}
                        {step === 1 && (
                            <motion.form
                                key="step1"
                                id="wizard-step1-form"
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 15 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleNextToStep2}
                                className="space-y-3 sm:space-y-3.5"
                            >
                                {/* 1. Child Names (Side-by-side even on mobile) */}
                                <div>
                                    <label className="block text-[11px] font-bold text-white/80 mb-1">
                                        Спортсмен *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={childLastName}
                                            onChange={e => setChildLastName(e.target.value)}
                                            placeholder="Фамилия"
                                            className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl py-2 px-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                        />
                                        <div className="relative">
                                            <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="text"
                                                required
                                                value={childFirstName}
                                                onChange={e => setChildFirstName(e.target.value)}
                                                placeholder="Имя *"
                                                className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl py-2 pl-8 pr-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Exact Birth Date + Live Feedback in one row */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[11px] font-bold text-white/80">
                                            Дата рождения ребенка *
                                        </label>
                                        <span className="text-[10px] text-sparta-gold font-bold">
                                            {childFirstName || 'Ребенок'}: {calculatedAge} {calculatedAge === 1 ? 'год' : calculatedAge <= 4 ? 'года' : 'лет'}
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Calendar size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="text"
                                            required
                                            value={birthDate}
                                            onChange={handleBirthDateChange}
                                            placeholder="ДД.ММ.ГГГГ"
                                            maxLength={10}
                                            className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl py-2 px-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors font-mono"
                                        />
                                    </div>
                                </div>

                                {/* 3. Branch / Location Selector (Compact 3-segment chips with Street Addresses) */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1">
                                        <MapPin size={11} className="text-sparta-gold" />
                                        <span>Филиал в Челябинске:</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {activeBranches.map(loc => {
                                            const isSelected = selectedLocationId === loc.id;
                                            return (
                                                <button
                                                    key={loc.id}
                                                    type="button"
                                                    onClick={() => setSelectedLocationId(loc.id)}
                                                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-sparta-gold/20 border-sparta-gold shadow-sm ring-1 ring-sparta-gold text-white'
                                                            : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    <span className="text-[11px] sm:text-xs font-bold text-white block truncate leading-tight">
                                                        {loc.shortName || loc.name}
                                                    </span>
                                                    <span className="text-[9px] text-white/60 block truncate mt-0.5 font-mono">
                                                        {loc.id === 'newton' ? 'ул. 250-летия, 46' : loc.id === 'chtz' ? 'ул. Карпенко, 5Б' : 'ул. Труда, 183'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Dynamic Selected Branch Address Orientation Bar */}
                                    <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-white/80">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <MapPin size={12} className="text-sparta-gold shrink-0" />
                                            <span className="truncate">
                                                <strong>{selectedLocation.name}:</strong> {selectedLocation.address} ({(selectedLocation as any).badge || selectedLocation.city || 'Челябинск'})
                                            </span>
                                        </div>
                                        {selectedLocation.href && (
                                            <a
                                                href={selectedLocation.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-sparta-gold hover:underline font-bold shrink-0 ml-1.5 flex items-center gap-0.5"
                                            >
                                                <span>Карта ↗</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* 4. Sports Temperament (Compact 3-button bar) */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider">
                                        Опыт в футболе:
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setExperienceLevel('beginner')}
                                            className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                                                experienceLevel === 'beginner'
                                                    ? 'bg-sparta-gold/20 border-sparta-gold text-white ring-1 ring-sparta-gold shadow-sm'
                                                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-[11px] sm:text-xs block font-bold">🧸 Впервые</span>
                                            <span className="text-[9px] block text-white/50 mt-0.5">Мягкий старт</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setExperienceLevel('active')}
                                            className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                                                experienceLevel === 'active'
                                                    ? 'bg-sparta-gold/20 border-sparta-gold text-white ring-1 ring-sparta-gold shadow-sm'
                                                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-[11px] sm:text-xs block font-bold">🏃 Активный</span>
                                            <span className="text-[9px] block text-white/50 mt-0.5">Много сил</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setExperienceLevel('experienced')}
                                            className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                                                experienceLevel === 'experienced'
                                                    ? 'bg-sparta-gold/20 border-sparta-gold text-white ring-1 ring-sparta-gold shadow-sm'
                                                    : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-[11px] sm:text-xs block font-bold">🏆 Есть опыт</span>
                                            <span className="text-[9px] block text-white/50 mt-0.5">Был в секции</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 5. Matching Groups & Schedule (Compact List) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[10px] font-bold text-white/60 uppercase tracking-wider">
                                            Группы и время:
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowAllSchedule(!showAllSchedule)}
                                            className="text-[10px] text-sparta-gold hover:underline font-bold cursor-pointer"
                                        >
                                            {showAllSchedule ? 'Скрыть другие' : 'Все группы ▾'}
                                        </button>
                                    </div>

                                    {/* Compact Group Cards with Live Firestore Capacity */}
                                    <div className="space-y-1.5">
                                        {(showAllSchedule ? SPARTA_SCHEDULE : matchingSlots).map(slot => {
                                            const isSelected = selectedSlot.id === slot.id;
                                            const cap = groupCapacityMap[slot.id] || {
                                                occupied: slot.initialOccupied || 16,
                                                maxCapacity: slot.maxCapacity || 20
                                            };
                                            const remaining = Math.max(1, cap.maxCapacity - cap.occupied);

                                            return (
                                                <button
                                                    key={slot.id}
                                                    type="button"
                                                    onClick={() => setSelectedSlotId(slot.id)}
                                                    className={`w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                                        isSelected
                                                            ? 'bg-sparta-gold/15 border-sparta-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] ring-1 ring-sparta-gold text-white'
                                                            : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] sm:text-xs font-bold text-white truncate">
                                                                {slot.streamTitle}
                                                            </span>
                                                            <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                                                                {slot.days}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px]">
                                                            <span className="font-bold text-sparta-gold font-mono">
                                                                {slot.time}
                                                            </span>
                                                            <span className="text-white/40 text-[10px]">
                                                                • 1 ч
                                                            </span>
                                                            <span className="text-white/60 text-[10px] truncate">
                                                                (Тренер: {slot.coachName.split(' ')[0]} {slot.coachName.split(' ')[1] ? slot.coachName.split(' ')[1][0] + '.' : ''})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 flex items-center gap-2">
                                                        {/* Real-time remaining seats badge */}
                                                        {remaining <= 2 ? (
                                                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                                                                🔥 {remaining} {remaining === 1 ? 'место' : 'места'}
                                                            </span>
                                                        ) : remaining <= 4 ? (
                                                            <span className="text-[9px] font-bold text-yellow-300 bg-yellow-500/15 px-1.5 py-0.5 rounded border border-yellow-500/30 whitespace-nowrap">
                                                                ⚡ {remaining} места
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                                                                🟢 {remaining} мест
                                                            </span>
                                                        )}

                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                            isSelected ? 'border-sparta-gold bg-sparta-gold text-black' : 'border-white/30'
                                                        }`}>
                                                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                                        {error}
                                    </div>
                                )}
                            </motion.form>
                        )}

                        {/* ================= STEP 2: PARENT CONTACTS & CARE ================= */}
                        {step === 2 && (
                            <motion.form
                                key="step2"
                                id="wizard-step2-form"
                                initial={{ opacity: 0, x: 15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -15 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleSubmit}
                                className="space-y-3"
                            >
                                {/* Chosen Summary Ticket */}
                                <div className="p-3 rounded-2xl bg-black/60 border border-sparta-gold/30 flex items-center justify-between gap-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-white">
                                            {fullChildDisplayName} ({calculatedAge} {calculatedAge === 1 ? 'год' : calculatedAge <= 4 ? 'года' : 'лет'}) • {selectedSlot.days}, {selectedSlot.time}
                                        </p>
                                        <p className="text-[11px] text-sparta-gold flex items-center gap-1">
                                            <MapPin size={11} />
                                            <span>{selectedLocation.name} ({selectedLocation.address})</span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateStep(1)}
                                        className="text-[11px] text-sparta-gold hover:underline font-bold shrink-0 cursor-pointer"
                                    >
                                        Изменить
                                    </button>
                                </div>

                                {/* Parent Name Inputs (Side by side) */}
                                <div>
                                    <label className="block text-[11px] font-bold text-white/80 mb-1">
                                        Родитель *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={parentLastName}
                                            onChange={e => setParentLastName(e.target.value)}
                                            placeholder="Фамилия"
                                            className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl py-2 px-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                        />
                                        <div className="relative">
                                            <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="text"
                                                required
                                                value={parentFirstName}
                                                onChange={e => setParentFirstName(e.target.value)}
                                                placeholder="Имя *"
                                                className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl py-2 pl-8 pr-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Parent Phone Input */}
                                <div>
                                    <label className="block text-[11px] font-bold text-white/80 mb-1">
                                        Телефон для связи *
                                    </label>
                                    <div className="relative">
                                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input
                                            type="tel"
                                            required
                                            value={parentPhone}
                                            onChange={handlePhoneChange}
                                            placeholder="+7 (999) 000-00-00"
                                            className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl py-2 pl-8 pr-3 text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition-colors font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Wishes & Notes */}
                                <div>
                                    <label className="block text-[11px] font-bold text-white/80 mb-1 flex items-center justify-between">
                                        <span>Пожелания или особенности</span>
                                        <span className="text-[9px] text-white/40 font-normal">Необязательно</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={parentComment}
                                        onChange={e => setParentComment(e.target.value)}
                                        placeholder="Например: немного стесняется, аллергия на пыльцу..."
                                        className="w-full bg-black/40 border border-white/15 focus:border-sparta-gold rounded-xl p-2 text-xs text-white placeholder:text-white/30 outline-none transition-colors resize-none"
                                    />
                                </div>

                                {/* Care Reassurance */}
                                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs space-y-0.5">
                                    <p className="font-bold text-sparta-gold flex items-center gap-1.5 text-[11px]">
                                        <Heart size={12} className="fill-sparta-gold text-sparta-gold shrink-0" />
                                        <span>Бережная встреча {childFirstName || 'ребенка'}</span>
                                    </p>
                                    <p className="text-[10px] text-white/80 leading-snug">
                                        Тренер <strong>{selectedSlot.coachName.split(' ')[0]}</strong> заранее прочитает анкету и встретит {childFirstName} по имени, чтобы ребенок почувствовал поддержку с первой минуты.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                                        {error}
                                    </div>
                                )}
                            </motion.form>
                        )}

                        {/* ================= STEP 3: CLEAN SUCCESS TICKET ================= */}
                        {step === 3 && (
                            <motion.div
                                key="step3-clean"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-3 py-1"
                            >
                                <div className="text-center">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.4)] mb-1.5">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h4 className="font-russo text-base sm:text-lg text-white">
                                        Визит успешно забронирован!
                                    </h4>
                                    <p className="text-xs text-white/70 font-manrope mt-0.5">
                                        Администратор подтвердит запись по телефону <strong className="text-white font-mono">{parentPhone}</strong>
                                    </p>
                                </div>

                                {/* Clean Digital Ticket Card */}
                                <div className="p-3.5 sm:p-4 rounded-2xl bg-black/75 border border-sparta-gold/50 text-left space-y-2.5 shadow-xl relative overflow-hidden">
                                    <div className="flex items-center justify-between pb-2 border-b border-white/15 text-xs">
                                        <span className="text-sparta-gold font-russo font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                                            🎫 Пригласительный билет
                                        </span>
                                        <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 text-[9px]">
                                            ✓ Закреплено
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Спортсмен</p>
                                            <p className="text-white font-extrabold text-xs sm:text-sm mt-0.5 truncate">{fullChildDisplayName} ({calculatedAge} {calculatedAge === 1 ? 'год' : calculatedAge <= 4 ? 'года' : 'лет'})</p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Время</p>
                                            <p className="text-sparta-gold font-extrabold text-xs sm:text-sm mt-0.5 font-mono">{selectedSlot.days} • {selectedSlot.time}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Филиал</p>
                                            <p className="text-white font-bold text-xs mt-0.5 truncate">{selectedLocation.name}</p>
                                            <p className="text-white/50 text-[9px] truncate">{selectedLocation.address}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-[9px] uppercase font-bold tracking-wider">Наставник</p>
                                            <p className="text-white font-bold text-xs mt-0.5 truncate">{selectedSlot.coachName}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Reassurance on Dashboard Access */}
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] text-white/80">
                                    <Sparkles size={14} className="text-sparta-gold shrink-0" />
                                    <span>
                                        Дневник футболиста и расписание уже доступны в вашем Личном Кабинете.
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom Sticky Action Footer (Always Visible & Accessible) */}
                <div className="p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 border-t border-white/10 bg-[#121212]/95 backdrop-blur-md relative z-10 shrink-0 space-y-2">
                    {step === 1 && (
                        <button
                            type="submit"
                            form="wizard-step1-form"
                            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-manrope font-extrabold text-xs sm:text-sm hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>Далее: Контакты родителя</span>
                            <ArrowRight size={15} />
                        </button>
                    )}

                    {step === 2 && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => updateStep(1)}
                                className="py-3 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <ArrowLeft size={13} />
                                <span>Назад</span>
                            </button>
                            <button
                                type="submit"
                                form="wizard-step2-form"
                                disabled={loading}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-manrope font-extrabold text-xs sm:text-sm hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? (
                                    <span>Оформляем визит...</span>
                                ) : (
                                    <>
                                        <span>Подтвердить визит и получить билет</span>
                                        <ArrowRight size={15} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => {
                                    onComplete();
                                    window.location.href = '/dashboard';
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-manrope font-extrabold text-xs sm:text-sm transition-all hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>В Личный Кабинет родителя</span>
                                <ArrowRight size={15} />
                            </button>

                            {selectedLocation.href && (
                                <a
                                    href={selectedLocation.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-3 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Navigation size={13} className="text-amber-400" />
                                    <span>Маршрут</span>
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    onComplete();
                                    if (onContactLink) {
                                        onContactLink();
                                    } else {
                                        window.location.href = '/dashboard?tab=messages';
                                    }
                                }}
                                className="py-3 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <MessageSquare size={13} className="text-sparta-gold" />
                                <span>Чат</span>
                            </button>
                        </div>
                    )}

                    {/* Footer Reassurance */}
                    {step < 3 && (
                        <p className="text-[10px] text-center text-white/40">
                            🔒 Первое занятие бесплатно • Уже занимаетесь?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    onComplete();
                                    if (onContactLink) onContactLink();
                                }}
                                className="text-sparta-gold hover:underline font-semibold cursor-pointer ml-0.5"
                            >
                                Войти в кабинет
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};

export default SmartEnrollmentWizard;

