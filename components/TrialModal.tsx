import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, MapPin, Sparkles, Phone, User, Calendar, Award, ChevronDown, LayoutDashboard, CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { safeLocalStorage } from '../utils/storage';
import { BaseModal } from './ui/BaseModal';
import { checkTrialEligibility, TrialEligibilityResult, normalizePhone } from '../utils/trialEligibility';

export interface SelectedGroupInfo {
    id: string;
    name: string;
    days?: string;
    time?: string;
    ageGroupLabel?: string;
    coachName?: string;
    streamTitle?: string;
    location?: string;
}

interface TrialModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedGroup?: SelectedGroupInfo | null;
    onOpenAuth?: (phone?: string) => void;
}

const SPARTA_LOCATIONS = [
    { id: 'newton', name: 'ОЦ «Ньютон»' },
    { id: 'chtz', name: 'Манеж ЧТЗ' },
    { id: 'gagarin', name: 'Гагарин Парк' },
    { id: 'ltown', name: 'L-Town' },
    { id: 'any', name: 'Посоветуйте ближайший' }
];

const EXPERIENCE_OPTIONS = [
    {
        id: 'beginner',
        title: 'Новичок',
        subtitle: 'Впервые в секции, с нуля',
        badge: '🟢'
    },
    {
        id: 'active',
        title: 'Любитель',
        subtitle: 'Играет во дворе, активный',
        badge: '🟡'
    },
    {
        id: 'experienced',
        title: 'Есть опыт',
        subtitle: 'Занимался в секции 1+ год',
        badge: '🔴'
    }
] as const;

interface DayOption {
    id: string;
    label: string;
}

const getAvailableDayOptions = (group?: SelectedGroupInfo | null): DayOption[] => {
    if (!group || !group.days) {
        return [
            { id: 'Будни (Пн, Ср, Пт)', label: 'Будни (вечер)' },
            { id: 'Выходные (Сб, Вс)', label: 'Выходные' },
            { id: 'В любой день', label: 'Любой день' }
        ];
    }

    const rawDays = group.days;
    // Weekdays pattern (Пн, Ср, Пт)
    if (rawDays.includes('Пн') || rawDays.includes('Ср') || rawDays.includes('Пт')) {
        return [
            { id: 'Понедельник', label: 'Пн' },
            { id: 'Среда', label: 'Ср' },
            { id: 'Пятница', label: 'Пт' },
            { id: 'В любой из дней группы', label: 'Любой день' }
        ];
    }

    // Weekends pattern (Сб, Вс)
    if (rawDays.includes('Сб') || rawDays.includes('Вс')) {
        return [
            { id: 'Суббота', label: 'Сб' },
            { id: 'Воскресенье', label: 'Вс' },
            { id: 'В любой из дней группы', label: 'Любой день' }
        ];
    }

    // Comma-separated or other custom pattern
    const splitDays = rawDays.split(',').map(d => d.trim()).filter(Boolean);
    if (splitDays.length > 0) {
        return [
            ...splitDays.map(d => ({ id: d, label: d })),
            { id: 'В любой из дней группы', label: 'Любой день' }
        ];
    }

    return [
        { id: 'В любой день', label: 'Любой день' }
    ];
};

const TrialModal: React.FC<TrialModalProps> = ({ isOpen, onClose, selectedGroup, onOpenAuth }) => {
    const navigate = useNavigate();
    const { user, userProfile, refreshTrialStatus } = useAuth();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showComment, setShowComment] = useState(false);
    const [existingIneligibility, setExistingIneligibility] = useState<TrialEligibilityResult | null>(null);

    const handleTrackRequest = () => {
        onClose();
        if (user) {
            navigate('/dashboard?tab=requests');
        } else if (onOpenAuth) {
            onOpenAuth(formData.parentPhone);
        } else {
            navigate('/dashboard?tab=requests');
        }
    };

    const [formData, setFormData] = useState({
        childFullName: '',
        childAge: '',
        experienceLevel: 'beginner' as 'beginner' | 'active' | 'experienced',
        preferredLocation: 'ОЦ «Ньютон»',
        preferredDay: '',
        parentName: '',
        parentPhone: '',
        email: '',
        comment: ''
    });

    const availableDays = useMemo(() => {
        return getAvailableDayOptions(selectedGroup);
    }, [selectedGroup]);

    useEffect(() => {
        if (!isOpen) {
            setExistingIneligibility(null);
            setIsSubmitted(false);
            return;
        }

        setIsSubmitted(false);
        setIsSubmitting(false);
        setExistingIneligibility(null);

        const initialDays = getAvailableDayOptions(selectedGroup);
        const defaultDay = initialDays[initialDays.length - 1]?.id || 'В любой день';

        if (userProfile) {
            const existingChildName = userProfile.childFullName ||
                [userProfile.childLastName, userProfile.childFirstName || userProfile.childName].filter(Boolean).join(' ') ||
                userProfile.childName || '';

            setFormData(prev => ({
                ...prev,
                childFullName: prev.childFullName || existingChildName,
                childAge: prev.childAge || (userProfile.childAge ? String(userProfile.childAge) : ''),
                parentName: prev.parentName || userProfile.parentName || userProfile.firstName || userProfile.displayName || '',
                parentPhone: prev.parentPhone || userProfile.parentPhone || userProfile.phone || '',
                email: prev.email || userProfile.email || user?.email || '',
                preferredDay: prev.preferredDay || defaultDay,
                preferredLocation: selectedGroup?.location || prev.preferredLocation || 'ОЦ «Ньютон»'
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                preferredDay: prev.preferredDay || defaultDay,
                preferredLocation: selectedGroup?.location || prev.preferredLocation || 'ОЦ «Ньютон»'
            }));
        }
    }, [isOpen, userProfile, user, selectedGroup]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('8')) value = '7' + value.slice(1);
        if (!value.startsWith('7') && value.length > 0) value = '7' + value;

        let formatted = '+7';
        if (value.length > 1) formatted += ' (' + value.substring(1, 4);
        if (value.length >= 5) formatted += ') ' + value.substring(4, 7);
        if (value.length >= 8) formatted += '-' + value.substring(7, 9);
        if (value.length >= 10) formatted += '-' + value.substring(9, 11);

        setFormData(prev => ({ ...prev, parentPhone: value.length <= 1 ? '' : formatted }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedChild = formData.childFullName.trim();
        if (!trimmedChild) {
            alert("Пожалуйста, укажите имя ребенка.");
            return;
        }

        const ageNum = parseInt(formData.childAge, 10);
        if (isNaN(ageNum) || ageNum > 14 || ageNum < 3) {
            alert("Пожалуйста, укажите возраст ребенка от 3 до 14 лет.");
            return;
        }

        const rawPhone = formData.parentPhone.replace(/\D/g, '');
        if (rawPhone.length < 10) {
            alert("Пожалуйста, укажите корректный номер телефона для связи.");
            return;
        }

        setIsSubmitting(true);
        setExistingIneligibility(null);

        try {
            // Anti-Abuse Deduplication Check
            const eligibility = await checkTrialEligibility({
                phone: formData.parentPhone,
                childName: trimmedChild,
                userId: user?.uid
            });

            if (!eligibility.eligible) {
                setExistingIneligibility(eligibility);
                setIsSubmitting(false);
                return;
            }

            const nameParts = trimmedChild.split(/\s+/);
            let parsedSurname = '';
            let parsedFirstName = '';
            if (nameParts.length >= 2) {
                parsedSurname = nameParts[0];
                parsedFirstName = nameParts.slice(1).join(' ');
            } else {
                parsedFirstName = trimmedChild;
                parsedSurname = '';
            }

            const expOption = EXPERIENCE_OPTIONS.find(o => o.id === formData.experienceLevel);
            const expLabel = expOption ? `${expOption.title} (${expOption.subtitle})` : 'Новичок';

            const cleanPhone = normalizePhone(formData.parentPhone);
            const requestPayload = {
                childName: trimmedChild,
                childFullName: trimmedChild,
                childSurname: parsedSurname,
                childFirstName: parsedFirstName,
                childAge: String(ageNum),
                experienceLevel: formData.experienceLevel,
                experienceLevelLabel: expLabel,
                experienceComment: formData.comment.trim(),
                comment: formData.comment.trim(),
                preferredLocation: selectedGroup?.location || formData.preferredLocation,
                preferredDay: formData.preferredDay || 'В любой день',
                parentName: formData.parentName.trim(),
                parentPhone: formData.parentPhone.trim(),
                phone: formData.parentPhone.trim(),
                cleanPhone: cleanPhone,
                email: formData.email.trim() || null,
                userId: user?.uid || null,
                createdAt: serverTimestamp(),
                status: 'new',
                programType: 'Пробная тренировка',
                groupId: selectedGroup?.id || null,
                groupTitle: selectedGroup?.name || null,
                preferredGroupTitle: selectedGroup?.name || null,
                groupSchedule: selectedGroup?.days ? `${selectedGroup.days} ${selectedGroup.time || ''}`.trim() : null,
                history: [{
                    status: 'new',
                    timestamp: Timestamp.now(),
                    note: selectedGroup
                        ? `Заявка на пробное занятие (Группа: ${selectedGroup.name}${selectedGroup.days ? `, ${selectedGroup.days} ${selectedGroup.time || ''}` : ''})`
                        : 'Заявка на пробное занятие'
                }]
            };

            const docRef = await addDoc(collection(db, "requests"), requestPayload);
            console.log("Trial request created with ID:", docRef.id);

            const currentRequestedIds = JSON.parse(safeLocalStorage.getItem('trial_requested_ids') || '[]');
            if (selectedGroup && !currentRequestedIds.includes(selectedGroup.id)) {
                safeLocalStorage.setItem('trial_requested_ids', JSON.stringify([...currentRequestedIds, selectedGroup.id]));
            } else if (!selectedGroup) {
                safeLocalStorage.setItem('trial_requested_general', 'true');
            }

            if (refreshTrialStatus) await refreshTrialStatus();
            setIsSubmitted(true);
        } catch (error) {
            console.error("Error adding trial request: ", error);
            alert("Ошибка при отправке заявки. Проверьте соединение с интернетом.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            glowColor="amber"
            zIndex="z-50"
        >
            <div className="text-left font-manrope">
                {existingIneligibility ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center py-5 px-1"
                    >
                        <div className="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center text-sparta-gold mb-4 border border-sparta-gold/30 shadow-[0_0_25px_rgba(212,175,55,0.25)]">
                            {existingIneligibility.reason === 'already_attended' ? (
                                <Award size={32} className="text-sparta-gold" />
                            ) : existingIneligibility.reason === 'already_scheduled' ? (
                                <CheckCircle2 size={32} className="text-emerald-400" />
                            ) : (
                                <Clock size={32} className="text-amber-400" />
                            )}
                        </div>

                        <h3 className="font-russo text-xl sm:text-2xl text-white mb-2">
                            {existingIneligibility.reason === 'already_requested_pending' && 'Заявка уже на рассмотрении!'}
                            {existingIneligibility.reason === 'already_scheduled' && 'Вы уже записаны на тренировку!'}
                            {existingIneligibility.reason === 'already_attended' && 'Пробное занятие уже состоялось'}
                            {existingIneligibility.reason === 'already_student' && 'Спортсмен уже в составе SPARTA'}
                        </h3>

                        <p className="text-white/75 text-xs sm:text-sm max-w-sm mb-5 leading-relaxed font-manrope">
                            {existingIneligibility.message}
                        </p>

                        <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white/60 max-w-sm mb-6 space-y-1.5 w-full text-left">
                            <div className="flex items-center justify-between text-[11px] text-white/40 uppercase font-bold">
                                <span>Проверенные данные:</span>
                                <span className="text-sparta-gold font-mono">1 заявка / 1 ребёнок</span>
                            </div>
                            <div className="text-white text-xs font-semibold flex items-center justify-between">
                                <span>Номер телефона:</span>
                                <span className="font-mono text-sparta-gold">{formData.parentPhone}</span>
                            </div>
                            {formData.childFullName && (
                                <div className="text-white text-xs font-semibold flex items-center justify-between">
                                    <span>Имя ребёнка:</span>
                                    <span>{formData.childFullName}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2.5 w-full max-w-sm">
                            <button
                                type="button"
                                onClick={handleTrackRequest}
                                className="w-full py-3.5 px-5 bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-extrabold rounded-xl hover:brightness-110 transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-sparta-gold/25 flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                <LayoutDashboard size={16} />
                                <span>Перейти в Личный кабинет</span>
                            </button>

                            <a
                                href="https://t.me/sparta_football"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl transition-all text-xs font-semibold cursor-pointer border border-white/10 flex items-center justify-center gap-2"
                            >
                                <MessageCircle size={15} className="text-sky-400" />
                                <span>Связаться с администратором</span>
                            </a>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2 px-4 text-white/40 hover:text-white rounded-xl transition-all text-xs font-medium cursor-pointer text-center"
                            >
                                Закрыть
                            </button>
                        </div>
                    </motion.div>
                ) : !isSubmitted ? (
                    <>
                        {/* HEADER */}
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sparta-gold/10 border border-sparta-gold/30 text-sparta-gold text-[10px] font-bold uppercase tracking-wider mb-2">
                                <Shield size={12} /> Индивидуальный подбор группы
                            </div>
                            <h2 className="font-russo text-2xl md:text-3xl text-white mb-1">
                                Запись на <span className="text-sparta-gold">пробное занятие</span>
                            </h2>
                            <p className="text-white/60 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
                                Администратор перезвонит вам, ответит на вопросы и согласует дату первого занятия.
                            </p>
                        </div>

                        {/* SELECTED GROUP SUMMARY (IF SELECTED) */}
                        {selectedGroup && (
                            <div className="p-3 bg-white/5 border border-sparta-gold/30 rounded-xl mb-3 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0 flex-1">
                                    <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block">
                                        Выбранная группа:
                                    </span>
                                    <span className="font-bold text-sparta-gold truncate block text-xs sm:text-sm">
                                        {selectedGroup.name}
                                    </span>
                                    {selectedGroup.days && (
                                        <div className="text-white/70 text-[11px] mt-0.5 flex items-center gap-1">
                                            <Calendar size={12} className="text-sparta-gold shrink-0" />
                                            <span>
                                                График: <strong className="text-white font-mono">{selectedGroup.days}</strong>
                                                {selectedGroup.time && <span> ({selectedGroup.time})</span>}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {selectedGroup.coachName && (
                                    <div className="text-[10px] text-white/50 text-right shrink-0 hidden sm:block">
                                        Наставник:<br />
                                        <strong className="text-white">{selectedGroup.coachName}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* CHILD INFO: UNITED FULL NAME + AGE */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-white/70 mb-1 ml-1">
                                        Имя и фамилия ребенка *
                                    </label>
                                    <input
                                        type="text"
                                        name="childFullName"
                                        required
                                        value={formData.childFullName}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-sparta-gold/60 focus:bg-white/10 transition-all text-sm"
                                        placeholder="Например: Артём или Иванов Артём"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 mb-1 ml-1">
                                        Возраст (лет) *
                                    </label>
                                    <input
                                        type="number"
                                        name="childAge"
                                        required
                                        min="3"
                                        max="14"
                                        value={formData.childAge}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-sparta-gold/60 focus:bg-white/10 transition-all text-sm"
                                        placeholder="7"
                                    />
                                </div>
                            </div>

                            {/* CHILD EXPERIENCE CHIPS (1-CLICK) */}
                            <div>
                                <label className="block text-[11px] font-semibold text-white/70 mb-1.5 ml-1">
                                    Спортивный опыт ребенка
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {EXPERIENCE_OPTIONS.map((opt) => {
                                        const isSelected = formData.experienceLevel === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, experienceLevel: opt.id }))}
                                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'bg-sparta-gold/15 border-sparta-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                        <span>{opt.badge}</span>
                                                        {opt.title}
                                                    </span>
                                                    {isSelected && <Check size={14} className="text-sparta-gold" />}
                                                </div>
                                                <span className="text-[10px] text-white/50 leading-tight">
                                                    {opt.subtitle}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* DYNAMIC TIMING / DAYS BASED ON GROUP */}
                            {selectedGroup ? (
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 mb-1.5 ml-1">
                                        Удобный день для пробного в этой группе
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {availableDays.map(day => {
                                            const isSelected = formData.preferredDay === day.id;
                                            return (
                                                <button
                                                    key={day.id}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, preferredDay: day.id }))}
                                                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-sparta-gold text-black border-sparta-gold font-extrabold shadow-sm'
                                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-white/70 mb-1 ml-1">
                                            Филиал в Челябинске
                                        </label>
                                        <select
                                            name="preferredLocation"
                                            value={formData.preferredLocation}
                                            onChange={handleChange}
                                            className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-sparta-gold/50 text-xs cursor-pointer"
                                        >
                                            {SPARTA_LOCATIONS.map(loc => (
                                                <option key={loc.id} value={loc.name} className="bg-[#1e1e1e] text-white">
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-white/70 mb-1 ml-1">
                                            Удобное время занятий
                                        </label>
                                        <div className="grid grid-cols-3 gap-1">
                                            {availableDays.map(day => {
                                                const isSelected = formData.preferredDay === day.id;
                                                return (
                                                    <button
                                                        key={day.id}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, preferredDay: day.id }))}
                                                        className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-sparta-gold text-black border-sparta-gold font-extrabold'
                                                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PARENT CONTACTS: NAME + PHONE */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 mb-1 ml-1">
                                        Ваше имя *
                                    </label>
                                    <input
                                        type="text"
                                        name="parentName"
                                        required
                                        value={formData.parentName}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-sparta-gold/60 focus:bg-white/10 transition-all text-sm"
                                        placeholder="Например: Анна"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-white/70 mb-1 ml-1">
                                        Телефон для связи *
                                    </label>
                                    <input
                                        type="tel"
                                        name="parentPhone"
                                        required
                                        value={formData.parentPhone}
                                        onChange={handlePhoneChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-sparta-gold/60 focus:bg-white/10 transition-all text-sm font-mono"
                                        placeholder="+7 (999) 000-00-00"
                                    />
                                </div>
                            </div>

                            {/* OPTIONAL COLLAPSIBLE COMMENT */}
                            <div>
                                {!showComment ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowComment(true)}
                                        className="text-xs text-sparta-gold/80 hover:text-sparta-gold transition-colors inline-flex items-center gap-1.5 py-0.5 cursor-pointer ml-1 font-medium"
                                    >
                                        <span>+ Есть пожелание или комментарий?</span>
                                    </button>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-[11px] font-medium text-white/70 ml-1">
                                                Пожелания или комментарий <span className="text-white/30 font-normal">(необязательно)</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowComment(false);
                                                    setFormData(prev => ({ ...prev, comment: '' }));
                                                }}
                                                className="text-[10px] text-white/40 hover:text-white/70 cursor-pointer"
                                            >
                                                Скрыть
                                            </button>
                                        </div>
                                        <textarea
                                            name="comment"
                                            value={formData.comment}
                                            onChange={handleChange}
                                            rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all text-xs resize-none"
                                            placeholder="Например: занимался гимнастикой 6 месяцев, левша..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-extrabold py-3.5 rounded-xl hover:brightness-110 transition-all transform active:scale-[0.99] shadow-lg shadow-sparta-gold/20 cursor-pointer text-sm flex items-center justify-center gap-2 mt-2"
                            >
                                <Phone size={16} />
                                <span>{isSubmitting ? 'Отправка...' : 'Отправить заявку администратору'}</span>
                            </button>
                        </form>

                        <p className="text-white/30 text-[10px] text-center mt-3">
                            Нажимая кнопку, вы соглашаетесь на обработку персональных данных. Все согласование проходит напрямую через спортивный центр Sparta.
                        </p>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center py-6"
                    >
                        <div className="w-16 h-16 bg-sparta-gold/15 rounded-full flex items-center justify-center text-sparta-gold mb-4 border border-sparta-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                            <Check size={32} />
                        </div>
                        <h3 className="font-russo text-2xl text-white mb-2">Заявка отправлена!</h3>
                        <p className="text-white/70 text-sm max-w-sm mb-4 leading-relaxed">
                            Администратор свяжется с вами в течение <strong className="text-sparta-gold font-bold">15 минут</strong> по номеру <br />
                            <strong className="text-white font-mono text-base">{formData.parentPhone}</strong>, <br />
                            чтобы ответить на вопросы и согласовать время пробного занятия.
                        </p>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 max-w-sm mb-6">
                            За ходом рассмотрения заявки также можно следить на сайте в вашем Личном кабинете.
                        </div>
                        <div className="flex flex-col gap-2.5 w-full max-w-sm mt-2">
                            <button
                                type="button"
                                onClick={handleTrackRequest}
                                className="w-full py-3.5 px-5 bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-extrabold rounded-xl hover:brightness-110 transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-sparta-gold/25 flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                <LayoutDashboard size={16} />
                                <span>Отслеживать статус в Личном кабинете</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition-all text-xs font-semibold cursor-pointer border border-white/10 text-center"
                            >
                                Остаться на главной странице
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </BaseModal>
    );
};

export default TrialModal;
