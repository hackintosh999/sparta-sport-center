import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs, addDoc, query, where, setDoc, arrayUnion } from 'firebase/firestore';
import { User, Group, ExperienceLevel, Temperament } from '../types/shop';
import { useAuth } from '../context/AuthContext';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Star,
    Calendar,
    CalendarCheck,
    Clock,
    Trophy,
    Dumbbell,
    Search,
    Target,
    Zap,
    Heart,
    TrendingUp,
    UserIcon,
    ArrowLeft,
    PhoneIncoming,
    X,
    ShieldCheck,
    Users,
    Sparkles,
    PlusCircle,
    Loader2
} from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { linkStudentToGroup } from '../utils/studentLinking';
import { safeLocalStorage } from '../utils/storage';
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar
} from 'recharts';

interface SmartEnrollmentWizardProps {
    user: any; // Firebase User + Profile combo or just User
    onComplete: () => void;
    onContactLink?: () => void;
    selectedGroup?: { id: string; name: string } | null;
}

const GOALS = [
    { id: 'professional', title: 'Профессиональный рост', desc: 'Участие в турнирах, карьера в футболе', icon: TrendingUp },
    { id: 'health', title: 'Здоровье и форма', desc: 'Общая физическая подготовка, активный досуг', icon: Heart },
    { id: 'social', title: 'Общение и развитие', desc: 'Командный дух, новые друзья, дисциплина', icon: Star },
];

const EXPERIENCE_LEVELS: { id: ExperienceLevel; title: string; desc: string; icon: any }[] = [
    { id: 'newbie', title: 'Новичок', desc: 'Начинаем с самых основ', icon: Star },
    { id: 'amateur', title: 'Любитель', desc: 'Есть базовые навыки', icon: Dumbbell },
    { id: 'pro', title: 'Опытный', desc: 'Серьезная подготовка', icon: Trophy },
];

const TEMPERAMENTS: { id: Temperament; title: string; emoji: string; desc: string }[] = [
    { id: 'leader', title: 'Лидер', emoji: '🦁', desc: 'Любит вести за собой, берет ответственность' },
    { id: 'team_player', title: 'Командный игрок', emoji: '🤝', desc: 'Комфортно чувствует себя в коллективе' },
    { id: 'shy_start', title: 'Тихий старт', emoji: '🐢', desc: 'Нужно время, чтобы раскрыться и привыкнуть' },
    { id: 'energetic', title: 'Энерджи', emoji: '⚡', desc: 'Очень активный, постоянно в движении' },
];

const MOTIVATIONS = [
    { id: 'win', title: 'Победы', emoji: '🏆', desc: 'Дух чемпиона' },
    { id: 'friends', title: 'Друзья', emoji: '🤝', desc: 'Общение и игры' },
    { id: 'skills', title: 'Финты', emoji: '⚽', desc: 'Техника и трюки' },
    { id: 'fun', title: 'Радость', emoji: '😊', desc: 'Эмоции и драйв' },
];

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 2000;
        const stepTime = Math.abs(Math.floor(duration / value));

        const timer = setInterval(() => {
            start += 1;
            setDisplayValue(start);
            if (start >= value) clearInterval(timer);
        }, stepTime);

        return () => clearInterval(timer);
    }, [value]);

    return <>{displayValue}</>;
};

const SmartEnrollmentWizard: React.FC<SmartEnrollmentWizardProps> = ({ user, onComplete, onContactLink, selectedGroup }) => {
    const { refreshTrialStatus } = useAuth();
    const [step, setStep] = useState(0); // 0: Initial Choice, 1: Basic Info, 2-4: Wizard, 5: Results, 7: Done
    const [enrollmentType, setEnrollmentType] = useState<'existing' | 'new' | null>(null);
    const [hasPreviousExperience, setHasPreviousExperience] = useState(false);

    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSearching, setIsSearching] = useState(false); // To search for existing students
    const [searchError, setSearchError] = useState<string | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(selectedGroup?.id || null);
    const [selectedGroupName, setSelectedGroupName] = useState<string | null>(selectedGroup?.name || null);
    const [joinMode, setJoinMode] = useState<'trial' | 'direct' | null>(null);

    // Fetch coach details when group is selected
    useEffect(() => {
        if (selectedGroupId && step === 6) {
            const group = groups.find(g => g.id === selectedGroupId);
            if (group?.coachId) {
                const fetchCoach = async () => {
                    const coachDoc = await getDocs(collection(db, "coaches"));
                    const coachData = coachDoc.docs.find(d => d.id === group.coachId)?.data();
                    if (coachData) setSelectedCoach(coachData);
                };
                fetchCoach();
            }
        }
    }, [selectedGroupId, step, groups]);

    // Sync from prop if it changes
    useEffect(() => {
        if (selectedGroup?.id) {
            setSelectedGroupId(selectedGroup.id);
        }
    }, [selectedGroup]);

    // Form Data
    const [formData, setFormData] = useState({
        childFirstName: user?.childFirstName || '',
        childLastName: user?.childLastName || '',
        parentPhone: user?.parentPhone || user?.phone || '',
        childAge: user?.childAge?.toString() || '',
        childBirthYear: user?.childBirthYear?.toString() || (new Date().getFullYear() - (user?.childAge || 7)).toString(),
        childDob: user?.childDob || '', // Added DOB field
        experienceLevel: (user?.experienceLevel || 'newbie') as ExperienceLevel,
        yearsOfExperience: '0',
        goal: user?.enrollmentGoals || 'health',
        temperament: (user?.temperament || 'team_player') as Temperament,
        detailedSkills: user?.detailedSkills || {
            speed: 5,
            technique: 5,
            discipline: 5
        },
        preferredDays: user?.preferredSchedule?.days || [] as string[],
        preferredTime: (user?.preferredSchedule?.timeOfDay || 'any') as 'morning' | 'afternoon' | 'evening' | 'any',
        otherSports: '',
        footballExp: '',
        motivation: 'friends',
        characterNote: '',
        finalTrialDate: '',
        finalTrialTime: '',
        finalNotes: '',
        isCustomDate: false
    });


    const [selectedCoach, setSelectedCoach] = useState<any>(null);

    const calculateAgeFromDob = (dobString: string): string => {
        if (!dobString) return '';
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age.toString();
    };

    const formatName = (name: string) => {
        if (!name) return "";
        return name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
    };

    // Auto-calculate age when DOB changes
    useEffect(() => {
        if (formData.childDob) {
            const calculatedAge = calculateAgeFromDob(formData.childDob);
            if (calculatedAge && calculatedAge !== formData.childAge) {
                setFormData(prev => ({
                    ...prev,
                    childAge: calculatedAge,
                    childBirthYear: new Date(formData.childDob).getFullYear().toString()
                }));
            }
        }
    }, [formData.childDob]);

    useEffect(() => {
        const fetchGroups = async () => {
            const snap = await getDocs(collection(db, "groups"));
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
        };
        fetchGroups();
    }, []);

    const handleBack = () => {
        setStep(prev => Math.max(0, prev - 1));
    };

    const handleNext = async () => {
        if (step === 1 && enrollmentType === 'existing') {
            await handleExistingStudentLink();
            return;
        }

        if (step === 4) {
            setIsAnalyzing(true);
            setTimeout(() => {
                setIsAnalyzing(false);
                setStep(5);
            }, 3000);
        } else if (step < 7) {
            setStep(step + 1);
        }
    };

    const handleExistingStudentLink = async () => {
        setSearchError(null);
        if (!formData.childFirstName || !formData.childLastName || !formData.childDob) {
            setSearchError("Пожалуйста, заполните Имя, Фамилию и Дату рождения");
            return;
        }

        setIsSearching(true);
        try {
            const userId = user.uid || user.id;
            const fullName = `${formData.childFirstName} ${formData.childLastName}`.trim();
            const age = parseInt(formData.childAge) || 0;

            const result = await linkStudentToGroup(
                userId,
                fullName,
                age,
                formData.parentPhone,
                user.email || '',
                formData.childDob,
                'football' // Specializing for Football club
            );

            if (result.success) {
                // Success! The linkStudentToGroup utility handles the state updates in DB.
                // We just need to show the success screen.
                setJoinMode('direct'); // Mark as direct since they are already in
                setStep(7);
            } else {
                setSearchError("ДАННЫЕ НЕ НАЙДЕНЫ. Проверьте правильность Имени/Фамилии или продолжите как «Новенький».");
            }
        } catch (error) {
            console.error("Linking error:", error);
            setSearchError("Произошла ошибка при поиске.");
        } finally {
            setIsSearching(false);
        }
    };


    const handleJoinGroup = (mode: 'trial' | 'direct', overrideGroupId?: string, overrideGroupName?: string) => {
        if (overrideGroupId) setSelectedGroupId(overrideGroupId);
        if (overrideGroupName) setSelectedGroupName(overrideGroupName);
        setJoinMode(mode);
        // From Results (Step 5), take the user to the Confirmation (Step 6)
        setStep(6);
    };

    const handleFinalConfirm = async () => {
        setLoading(true);
        try {
            const userId = user.uid || user.id;
            if (!userId) throw new Error("User ID not found");

            const targetGroupId = selectedGroupId;
            if (!targetGroupId) throw new Error("No group selected");

            const fullName = `${formData.childFirstName} ${formData.childLastName}`.trim();
            const age = parseInt(formData.childAge) || 0;
            const birthYear = parseInt(formData.childBirthYear) || (new Date().getFullYear() - age);

            const userUpdate: any = {
                groupId: targetGroupId,
                childFirstName: formData.childFirstName,
                childLastName: formData.childLastName,
                childName: fullName,
                childAge: age,
                childDob: formData.childDob,
                childBirthYear: birthYear,
                experienceLevel: formData.experienceLevel,
                temperament: formData.temperament,
                detailedSkills: formData.detailedSkills,
                enrollmentGoals: formData.goal,
                parentPhone: formData.parentPhone,
                profileCompleted: true,
                preferredSchedule: {
                    days: formData.preferredDays,
                    timeOfDay: formData.preferredTime
                },
                otherSports: formData.otherSports,
                footballExp: formData.footballExp,
                motivation: formData.motivation
            };

            if (joinMode === 'direct') {
                userUpdate.membershipStatus = 'pending_payment';
            }

            await updateDoc(doc(db, "users", userId), userUpdate);

            // Create admin request
            await addDoc(collection(db, "requests"), {
                userId,
                childName: formData.childFirstName,
                childSurname: formData.childLastName,
                childAge: age,
                parentName: user.displayName || 'Пользователь',
                parentPhone: formData.parentPhone,
                email: user.email || '',
                sports: ['Футбол'],
                programType: joinMode === 'trial' ? "Пробная тренировка" : "Smart Match (Direct Join)",
                status: 'pending',
                source: 'smart_match',
                createdAt: serverTimestamp(),
                groupId: targetGroupId,
                groupTitle: groups.find(g => g.id === targetGroupId)?.name || null,
                preferredDay: formData.preferredDays?.join(', ') || 'Любой',
                experienceLevel: formData.experienceLevel,
                temperament: formData.temperament,
                detailedSkills: formData.detailedSkills,
                otherSports: formData.otherSports,
                motivation: formData.motivation,
                characterNote: formData.characterNote,
                trialDate: formData.finalTrialDate,
                trialTime: formData.finalTrialTime,
                comment: `${joinMode === 'trial' ? 'Запись на ПРОБНОЕ' : 'ПРЯМОЕ ВСТУПЛЕНИЕ'} через Smart Match 2.0. Дата: ${formData.finalTrialDate}. Время: ${formData.finalTrialTime}. Характер: ${formData.temperament}. Мотивация: ${formData.motivation}. Заметка: ${formData.characterNote}`
            });

            if (joinMode === 'trial' && refreshTrialStatus) {
                await refreshTrialStatus();
            }

            try {
                await linkStudentToGroup(
                    userId,
                    fullName,
                    age,
                    formData.parentPhone,
                    user.email || '',
                    formData.childDob,
                    'football'
                );
            } catch (linkError) {
                console.warn("Auto-linking failed, but enrollment succeeded:", linkError);
            }

            if (joinMode === 'trial') {
                safeLocalStorage.setItem('trial_requested', 'true');
            }

            setStep(7); // Go to Final Success

            // ─── NEW: AUTOMATED CHAT INITIALIZATION ───
            try {
                if (targetGroupId && selectedCoach) {
                    const coachId = selectedCoach.uid || selectedCoach.id;
                    if (coachId) {
                        const chatId = [coachId, userId].sort().join('_');
                        const chatRef = doc(db, "private_chats", chatId);

                        // Create or Update Private Chat
                        const welcomeMsg = `Здравствуйте! Спасибо за заявку на пробную тренировку для ${formData.childFirstName}. Я буду вашим тренером. Мы ждем вас ${formData.finalTrialDate} в ${formData.finalTrialTime}. Если у вас есть вопросы, пишите!`;

                        await setDoc(chatRef, {
                            participants: [coachId, userId],
                            participantNames: {
                                [coachId]: selectedCoach.name,
                                [userId]: fullName
                            },
                            lastMessage: welcomeMsg,
                            lastMessageAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            unreadCount: {
                                [userId]: 1,
                                [coachId]: 0
                            }
                        }, { merge: true });

                        // Add the welcome message
                        const msgRef = doc(collection(chatRef, "messages"));
                        await setDoc(msgRef, {
                            text: welcomeMsg,
                            senderId: coachId,
                            createdAt: serverTimestamp(),
                            type: 'system'
                        });

                        // Optionally: Add to group chat if already defined in group doc
                        const group = groups.find(g => g.id === targetGroupId);
                        if (group?.chatId) {
                            const groupChatRef = doc(db, "group_chats", group.chatId);
                            await updateDoc(groupChatRef, {
                                participants: arrayUnion(userId),
                                [`participantNames.${userId}`]: fullName
                            });
                        }
                    }
                }
            } catch (chatError) {
                console.warn("Automated chat initialization failed:", chatError);
            }
        } catch (error) {
            console.error(error);
            alert("Ошибка вступления");
        } finally {
            setLoading(false);
        }
    };

    const getRecommendedGroups = () => {
        const age = parseInt(formData.childAge);
        return groups
            .map(group => {
                let score = 0;
                const insights: string[] = [];

                // 1. Age Fit (Mandatory + Accuracy Bonus)
                if (age < group.ageRange.min || age > group.ageRange.max) return null;
                const ageMid = (group.ageRange.min + group.ageRange.max) / 2;
                const ageDiff = Math.abs(age - ageMid);
                const ageScore = ageDiff <= 1 ? 25 : 20;
                score += ageScore;
                if (ageScore === 25) insights.push("Идеальный возраст");

                // 2. Skill & Potential Fit (Max 25%)
                if (group.difficultyLevel === formData.experienceLevel) {
                    score += 15;
                }

                const skillAvg = (formData.detailedSkills.speed + formData.detailedSkills.technique + formData.detailedSkills.discipline) / 3;
                const groupIntensity = Number(group.intensity) || 5;
                if (Math.abs(skillAvg - groupIntensity) <= 2) {
                    score += 10;
                    insights.push("Уровень нагрузки подходит");
                }

                // 3. Psychometric Harmony (Max 30%)
                if (group.focus?.includes(formData.temperament)) {
                    score += 15;
                    insights.push("Подходит характеру");
                }

                const goalsMap: Record<string, string> = {
                    'champion': 'competitive',
                    'master': 'disciplined',
                    'soul': 'encouraging',
                    'joy': 'encouraging'
                };
                if (group.socialAtmosphere === goalsMap[formData.goal]) {
                    score += 15;
                    insights.push("Нужная атмосфера");
                }

                // 4. Logistics (Max 20%)
                if (group.schedule?.some(s => formData.preferredDays.includes(s.day))) {
                    score += 20;
                    insights.push("Удобное расписание");
                }

                return { group, score: Math.min(score, 100), insights };
            })
            .filter(Boolean) as { group: Group, score: number, insights: string[] }[];
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onComplete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onComplete]);

    const recommendations = (step === 5 || step === 6) ? getRecommendedGroups().sort((a, b) => b.score - a.score) : [];

    const progress = step === 0 ? 0 : Math.min((step / 6) * 100, 100);

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl font-manrope overflow-y-auto max-h-[100dvh] text-white" role="dialog" aria-modal="true" aria-label="Подбор группы">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sparta-gold/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sparta-gold/5 blur-[120px] rounded-full" />
            </div>

            <div className="relative min-h-full flex flex-col items-center justify-center p-4 py-8">
                {/* Header */}
                <div className="w-full max-w-4xl flex items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-6">
                        {step > 0 && step < 7 && (
                            <button
                                onClick={handleBack}
                                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:border-sparta-gold hover:text-sparta-gold transition-all text-white/40 group shrink-0"
                            >
                                <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                        )}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 flex items-center justify-center border border-sparta-gold/20 shrink-0">
                                <Target className="text-sparta-gold" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-russo text-white tracking-widest uppercase text-glow">SMART MATCH <span className="text-sparta-gold">2.0</span></h1>
                                <p className="text-white/30 text-[10px] uppercase font-bold">AI - СИСТЕМА ПОДБОРА ГРУПП</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-2">
                            <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                                {step < 7 ? `Шаг ${step} из 6` : 'Готово'}
                            </div>
                            <div className="w-32 sm:w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className="h-full bg-gold-gradient rounded-full"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={onComplete}
                            className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/60 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-all shrink-0"
                            aria-label="Закрыть подбор группы"
                            title="Закрыть"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content - Flexible Height to accommodate rich cards */}
                <div className="w-full max-w-4xl h-[80vh] min-h-[600px] max-h-[850px] relative">
                    <AnimatePresence mode="wait">
                        {/* Safe Default Case: Step 0 or unknown state */}
                        {(step === 0 || step > 7) && (
                            <motion.div
                                key="step0"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="flex flex-col items-center justify-center h-full text-center"
                            >
                                <h2 className="text-5xl md:text-7xl font-russo text-white mb-6 uppercase tracking-tighter">
                                    Добро пожаловать в <br />
                                    <span className="text-glow text-sparta-gold">SPARTA</span>
                                </h2>
                                <p className="text-white/40 text-lg mb-12 max-w-xl">
                                    Чтобы мы могли максимально быстро и точно интегрировать вас в жизнь клуба, выберите ваш статус:
                                </p>

                                <div className="grid md:grid-cols-2 gap-8 w-full">
                                    <button
                                        onClick={() => {
                                            setEnrollmentType('existing');
                                            setStep(1);
                                        }}
                                        className="group p-8 rounded-[40px] bg-white/5 border border-white/10 hover:border-sparta-gold transition-all text-left relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                                            <Users size={80} />
                                        </div>
                                        <div className="w-16 h-16 rounded-2xl bg-sparta-gold/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <Zap className="text-sparta-gold" size={32} />
                                        </div>
                                        <h3 className="text-3xl font-russo text-white mb-2 uppercase">Я уже занимаюсь</h3>
                                        <p className="text-white/40 leading-relaxed font-bold">
                                            Уже состою в группе, мне нужно просто привязать свой существующий профиль.
                                        </p>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setEnrollmentType('new');
                                            setStep(1);
                                        }}
                                        className="group p-8 rounded-[40px] bg-white/5 border border-white/10 hover:border-sparta-gold transition-all text-left relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
                                            <Sparkles size={80} />
                                        </div>
                                        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <PlusCircle className="text-blue-400" size={32} />
                                        </div>
                                        <h3 className="text-3xl font-russo text-white mb-2 uppercase">Я новенький</h3>
                                        <p className="text-white/40 leading-relaxed font-bold">
                                            Хочу пройти диагностику Smart Match 2.0 и подобрать идеальную группу.
                                        </p>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid md:grid-cols-2 gap-8 h-full"
                            >
                                <div className="flex flex-col justify-center space-y-6">
                                    <h2 className="text-4xl md:text-6xl font-russo text-white leading-[1.1] uppercase tracking-tighter">
                                        {enrollmentType === 'existing'
                                            ? <>Поиск <span className="text-sparta-gold text-glow">ученика</span></>
                                            : <>Давайте <span className="text-sparta-gold text-glow">познакомимся!</span></>
                                        }
                                    </h2>
                                    <p className="text-white/50 text-lg leading-relaxed max-w-md">
                                        {enrollmentType === 'existing'
                                            ? 'Введите данные ребенка для автоматического поиска и привязки к вашей группе.'
                                            : 'Чтобы подобрать идеальную команду и программу тренировок, нам нужно немного данных о юном чемпионе.'}
                                    </p>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 max-w-sm">
                                            <div className="w-10 h-10 rounded-full bg-sparta-gold/20 flex items-center justify-center">
                                                <ShieldCheck size={20} className="text-sparta-gold" />
                                            </div>
                                            <p className="text-[10px] text-white/40 leading-tight uppercase font-bold">Ваши данные под защитой <br />безопасности SPARTA</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 space-y-4 self-center">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-bold ml-1">Фамилия</label>
                                            <input
                                                value={formData.childLastName}
                                                onChange={e => setFormData({ ...formData, childLastName: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-sparta-gold outline-none transition-all placeholder-white/10"
                                                placeholder="Фамилия ребенка"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-bold ml-1">Имя</label>
                                            <input
                                                value={formData.childFirstName}
                                                onChange={e => setFormData({ ...formData, childFirstName: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-sparta-gold outline-none transition-all placeholder-white/10"
                                                placeholder="Напр. Александр"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-bold ml-1">Дата рождения</label>
                                            <input
                                                type="date"
                                                value={formData.childDob}
                                                onChange={e => setFormData({ ...formData, childDob: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-sparta-gold outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-bold ml-1">Возраст</label>
                                            <input
                                                type="number"
                                                readOnly
                                                value={formData.childAge}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white/40 cursor-not-allowed outline-none"
                                                placeholder="7"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-white/40 uppercase font-bold ml-1">Телефон родителя (Необязательно)</label>
                                            <input
                                                type="tel"
                                                value={formData.parentPhone}
                                                onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-sparta-gold outline-none transition-all placeholder-white/10"
                                                placeholder="+7 (999) 000-00-00"
                                            />
                                        </div>

                                        {enrollmentType === 'new' && (
                                            <div className="pt-2 border-t border-white/5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="text-[10px] text-white/40 uppercase font-bold">Раньше занимались футболом?</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setHasPreviousExperience(true)}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${hasPreviousExperience ? 'bg-sparta-gold text-black' : 'bg-white/5 text-white/40'}`}
                                                        >Да</button>
                                                        <button
                                                            onClick={() => {
                                                                setHasPreviousExperience(false);
                                                                setFormData({ ...formData, footballExp: '' });
                                                            }}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!hasPreviousExperience ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}
                                                        >Нет</button>
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {hasPreviousExperience && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <input
                                                                value={formData.footballExp}
                                                                onChange={e => setFormData({ ...formData, footballExp: e.target.value })}
                                                                className="w-full bg-white/5 border border-sparta-gold/30 rounded-2xl p-4 text-white text-sm focus:border-sparta-gold outline-none transition-all placeholder-white/10 mb-2"
                                                                placeholder="В каком клубе и как долго?"
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-4 mt-4">
                                        <button
                                            onClick={handleBack}
                                            className="px-6 py-5 bg-white/5 text-white/40 font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 border border-white/5"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            disabled={!formData.childFirstName || !formData.childLastName || !formData.childDob || (enrollmentType === 'new' && parseInt(formData.childAge) > 14) || isSearching}
                                            className="flex-1 py-5 bg-sparta-gold text-black font-black uppercase tracking-widest rounded-2xl hover:bg-yellow-500 transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,175,55,0.2)] disabled:opacity-20 disabled:grayscale"
                                        >
                                            {isSearching ? (
                                                <>Ищем в базе... <Loader2 className="animate-spin" size={20} /></>
                                            ) : (
                                                enrollmentType === 'existing' ? 'Привязать профиль' : 'К анализу способностей'
                                            )}
                                            {!isSearching && <ChevronRight size={20} />}
                                        </button>
                                    </div>

                                    {searchError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                                        >
                                            <p className="text-red-400 text-xs font-bold text-center leading-tight">
                                                {searchError}
                                            </p>
                                            <button
                                                onClick={() => setEnrollmentType('new')}
                                                className="w-full mt-2 text-[10px] text-white/40 hover:text-white uppercase font-bold transition-colors"
                                            >
                                                Или продолжить как «Новенький»
                                            </button>
                                        </motion.div>
                                    )}

                                    {enrollmentType === 'existing' && (
                                        <button
                                            onClick={() => setStep(0)}
                                            className="w-full mt-2 text-[10px] text-white/40 hover:text-white uppercase font-bold transition-colors text-center"
                                        >
                                            Вернуться к выбору
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-12">
                                    <h2 className="text-4xl font-russo text-white mb-4">Выберите <span className="text-sparta-gold text-glow">траекторию</span> развития</h2>
                                    <p className="text-white/50 max-w-lg mx-auto">Что больше всего зажигает глаза юного чемпиона? Мы подберем группу с идеальным микроклиматом.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        {
                                            id: 'champion',
                                            title: 'Путь Чемпиона',
                                            desc: 'Стремимся к кубкам, турнирам и большим победам.',
                                            icon: Trophy,
                                            goal: 'pro',
                                            motivation: 'win',
                                            accent: 'border-sparta-gold/30',
                                            glow: 'shadow-sparta-gold/20'
                                        },
                                        {
                                            id: 'master',
                                            title: 'Мастер Финтов',
                                            desc: 'Хотим выучить все технические приемы и владеть мячом.',
                                            icon: Zap,
                                            goal: 'growth',
                                            motivation: 'skills',
                                            accent: 'border-blue-500/30',
                                            glow: 'shadow-blue-500/20'
                                        },
                                        {
                                            id: 'soul',
                                            title: 'Душа Команды',
                                            desc: 'Ищем друзей, общение и командный дух через игру.',
                                            icon: Users,
                                            goal: 'social',
                                            motivation: 'friends',
                                            accent: 'border-green-500/30',
                                            glow: 'shadow-green-500/20'
                                        },
                                        {
                                            id: 'joy',
                                            title: 'Энергия и Радость',
                                            desc: 'Занимаемся для здоровья и отличного настроения.',
                                            icon: Heart,
                                            goal: 'health',
                                            motivation: 'joy',
                                            accent: 'border-orange-500/30',
                                            glow: 'shadow-orange-500/20'
                                        }
                                    ].map((path) => {
                                        const isSelected = formData.goal === path.goal && formData.motivation === path.motivation;
                                        return (
                                            <button
                                                key={path.id}
                                                onClick={() => setFormData({ ...formData, goal: path.goal, motivation: path.motivation })}
                                                className={`p-8 rounded-[2.5rem] border transition-all text-center relative overflow-hidden group flex flex-col h-full
                                                    ${isSelected ? `bg-white/5 ${path.accent} ${path.glow} shadow-xl scale-[1.02]` : 'bg-white/5 border-white/5 hover:border-white/20'}
                                                `}
                                            >
                                                <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500
                                                    ${isSelected ? 'bg-sparta-gold text-black scale-110 rotate-[10deg]' : 'bg-white/5 text-white/30 group-hover:text-sparta-gold'}
                                                `}>
                                                    <path.icon size={32} />
                                                </div>
                                                <h3 className={`text-lg font-bold mb-3 ${isSelected ? 'text-white' : 'text-white/60'}`}>{path.title}</h3>
                                                <p className="text-[11px] leading-relaxed text-white/30 mb-6 flex-grow">{path.desc}</p>

                                                {isSelected && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-6 right-6 text-sparta-gold">
                                                        <Check size={20} className="drop-shadow-[0_0_10px_rgba(212,175,55,1)]" />
                                                    </motion.div>
                                                )}

                                                <div className={`mt-auto h-1 w-full rounded-full transition-all duration-700 ${isSelected ? 'bg-sparta-gold opacity-100' : 'bg-white/5 opacity-0'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-12 flex justify-between items-center">
                                    <button onClick={handleBack} className="flex items-center gap-2 text-white/30 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]">
                                        <ArrowLeft size={16} /> Назад
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={!formData.goal}
                                        className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sparta-gold transition-all flex items-center gap-3 shadow-xl disabled:opacity-20"
                                    >
                                        К оценке навыков <ChevronRight size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-4xl font-russo text-white mb-4">Способности <span className="text-sparta-gold">атлета</span></h2>
                                    <p className="text-white/50 max-w-lg mx-auto">Расскажите нам немного о навыках юного чемпиона, чтобы мы нашли ему достойных партнеров по команде.</p>
                                </div>

                                <div className="grid md:grid-cols-[1fr_350px] gap-12 items-start">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Уровень подготовки</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {EXPERIENCE_LEVELS.map(level => {
                                                    const isSelected = formData.experienceLevel === level.id;
                                                    return (
                                                        <button
                                                            key={level.id}
                                                            onClick={() => {
                                                                const preset = level.id === 'pro' ? 8 : level.id === 'amateur' ? 5 : 2;
                                                                setFormData({
                                                                    ...formData,
                                                                    experienceLevel: level.id,
                                                                    detailedSkills: {
                                                                        speed: preset,
                                                                        technique: preset,
                                                                        discipline: preset
                                                                    }
                                                                });
                                                            }}
                                                            className={`py-4 rounded-2xl border transition-all text-center relative group
                                                                ${isSelected ? 'bg-sparta-gold border-sparta-gold text-black font-black' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}
                                                            `}
                                                        >
                                                            <div className="text-[10px] uppercase tracking-widest">{level.title}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-8 p-8 bg-white/5 rounded-3xl border border-white/5">
                                            {[
                                                { id: 'technique', title: 'Техника', icon: '⚽', color: 'text-green-400', desc: 'Как ребенок управляет мячом' },
                                                { id: 'speed', title: 'Скорость', icon: '⚡', color: 'text-blue-400', desc: 'Бег и реакция на поле' },
                                                { id: 'discipline', title: 'Дисциплина', icon: '🧘', color: 'text-purple-400', desc: 'Внимание и работа в группе' }
                                            ].map(skill => {
                                                const val = (formData.detailedSkills as any)[skill.id];
                                                const label = val > 7 ? 'Отлично' : val > 4 ? 'Уверенно' : 'Начальный';

                                                return (
                                                    <div key={skill.id} className="space-y-4">
                                                        <div className="flex justify-between items-end px-1">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-lg">{skill.icon}</span>
                                                                    <span className="text-xs font-black uppercase text-white/80">{skill.title}</span>
                                                                </div>
                                                                <p className="text-[10px] text-white/30 italic">{skill.desc}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`text-[10px] font-black uppercase ${skill.color}`}>{label}</span>
                                                                <div className="text-xl font-russo text-white leading-none">{val}/10</div>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={val}
                                                            onChange={e => setFormData({
                                                                ...formData,
                                                                detailedSkills: { ...formData.detailedSkills, [skill.id]: parseInt(e.target.value) }
                                                            })}
                                                            className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-sparta-gold border border-white/5"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Athlete Card Preview */}
                                        <div className="bg-gradient-to-b from-white/10 to-transparent p-1 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                                <Trophy size={120} />
                                            </div>

                                            <div className="p-8 space-y-6">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="text-[10px] font-black text-sparta-gold uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-sparta-gold/10 rounded-full w-fit">Карточка атлета</div>
                                                        <h3 className="text-2xl font-russo text-white uppercase">{formData.childFirstName || 'Юный чемпион'}</h3>
                                                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{formData.childAge} лет • {EXPERIENCE_LEVELS.find(l => l.id === formData.experienceLevel)?.title}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {[
                                                        { id: 'technique', label: 'TEC', val: formData.detailedSkills.technique, color: 'bg-green-500' },
                                                        { id: 'speed', label: 'SPD', val: formData.detailedSkills.speed, color: 'bg-blue-500' },
                                                        { id: 'discipline', label: 'DIS', val: formData.detailedSkills.discipline, color: 'bg-purple-500' }
                                                    ].map(s => (
                                                        <div key={s.id} className="space-y-1">
                                                            <div className="flex justify-between text-[8px] font-black text-white/40 uppercase">
                                                                <span>{s.label}</span>
                                                                <span>{s.val * 10}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${s.val * 10}%` }}
                                                                    className={`h-full ${s.color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-4 border-t border-white/5">
                                                    <p className="text-[9px] text-white/30 italic leading-relaxed uppercase tracking-tighter font-bold">
                                                        "Отличные показатели! Этот уровень подготовки идеально подходит для наших групп."
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Other Sports */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-white/40 uppercase font-bold ml-1">Другие увлечения</label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {['Единоборства', 'Плавание', 'Танцы', 'Гимнастика'].map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => setFormData({ ...formData, otherSports: formData.otherSports ? `${formData.otherSports}, ${tag}` : tag })}
                                                            className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[8px] font-black text-white/40 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                                                        >+ {tag}</button>
                                                    ))}
                                                </div>
                                                <input
                                                    value={formData.otherSports}
                                                    onChange={e => setFormData({ ...formData, otherSports: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-sparta-gold outline-none transition-all placeholder-white/10"
                                                    placeholder="Напр. Плавание 2 года"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 flex justify-between gap-4 items-center">
                                    <button onClick={handleBack} className="flex items-center gap-2 text-white/30 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]">
                                        <ArrowLeft size={16} /> Назад
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-sparta-gold transition-all flex items-center gap-3 shadow-xl"
                                    >
                                        Далее <ChevronRight size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-12">
                                    <h2 className="text-4xl font-russo text-white mb-4">Характер и <span className="text-sparta-gold">атмосфера</span></h2>
                                    <p className="text-white/50 max-w-lg mx-auto">
                                        {formData.childFirstName ? `Как ${formData.childFirstName} чувствует себя в новой компании? ` : 'Какой ваш чемпион в коллективе? '}
                                        Расскажите нам, и мы подберем идеальную среду для развития.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                    {[
                                        { id: 'leader', emoji: '🐯', title: 'Лидер', archetype: 'Наставник-Стратег', desc: 'Любит вести за собой, берет ответственность', color: 'border-red-500/30', glow: 'shadow-red-500/20', advice: 'Дадим роль капитана и возможность проявлять инициативу.' },
                                        { id: 'team_player', emoji: '🤝', title: 'Душа команды', archetype: 'Командный Ментор', desc: 'Комфортно чувствует себя в коллективе', color: 'border-blue-500/30', glow: 'shadow-blue-500/20', advice: 'Поможем стать опорой команды и развить навыки паса.' },
                                        { id: 'shy_start', emoji: '🐢', title: 'Тихий старт', archetype: 'Мягкий Наставник', desc: 'Нужно время, чтобы раскрыться и привыкнуть', color: 'border-purple-500/30', glow: 'shadow-purple-500/20', advice: 'Обеспечим мягкое вовлечение в процесс без лишнего давления.' },
                                        { id: 'energetic', emoji: '⚡', title: 'Энерджи', archetype: 'Драйвовый Коуч', desc: 'Очень активный, постоянно в движении', color: 'border-orange-500/30', glow: 'shadow-orange-500/20', advice: 'Направим неиссякаемую энергию в правильное, спортивное русло.' }
                                    ].map(temp => {
                                        const isSelected = formData.temperament === temp.id;
                                        return (
                                            <button
                                                key={temp.id}
                                                onClick={() => setFormData({ ...formData, temperament: temp.id as Temperament })}
                                                className={`p-8 rounded-[2.5rem] border transition-all text-center flex flex-col items-center gap-6 group h-full relative overflow-hidden
                                                    ${isSelected ? `bg-white/5 ${temp.color} ${temp.glow} shadow-2xl scale-[1.02]` : 'bg-white/5 border-white/5 hover:border-white/10'}
                                                `}
                                            >
                                                <div className="space-y-1">
                                                    <span className={`text-5xl block transition-transform duration-500 ${isSelected ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-40 group-hover:opacity-100 group-hover:scale-110'}`}>{temp.emoji}</span>
                                                    {isSelected && (
                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[8px] font-black text-sparta-gold uppercase tracking-widest">{temp.archetype}</motion.div>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className={`font-black uppercase tracking-widest text-sm ${isSelected ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>{temp.title}</h3>
                                                    <p className={`text-[10px] leading-relaxed font-medium ${isSelected ? 'text-white/60' : 'text-white/20'}`}>{temp.desc}</p>
                                                </div>

                                                {isSelected && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-6 right-6 text-sparta-gold">
                                                        <Check size={20} />
                                                    </motion.div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="grid md:grid-cols-[1fr_300px] gap-8">
                                    <motion.div
                                        animate={formData.temperament ? { opacity: 1, x: 0 } : { opacity: 0.5, x: 0 }}
                                        className="p-1 rounded-[2.5rem] bg-gradient-to-r from-sparta-gold/20 via-white/5 to-transparent border border-white/5 relative overflow-hidden group h-fit"
                                    >
                                        <div className="bg-black/40 backdrop-blur-xl p-8 rounded-[2.4rem] flex flex-col md:flex-row items-center gap-8">
                                            <div className="w-20 h-20 rounded-3xl bg-sparta-gold/10 flex items-center justify-center shrink-0 border border-sparta-gold/20 relative">
                                                <div className="absolute inset-0 bg-sparta-gold/20 blur-2xl rounded-full animate-pulse" />
                                                <ShieldCheck size={40} className="text-sparta-gold relative z-10" />
                                            </div>
                                            <div className="space-y-2 text-center md:text-left">
                                                <h4 className="text-xs font-black text-sparta-gold uppercase tracking-[0.3em]">Индивидуальный подход</h4>
                                                <p className="text-sm text-white/80 leading-relaxed font-medium">
                                                    {formData.temperament ? (
                                                        <span>Для такого типа характера мы подготовили особую методику: <span className="text-sparta-gold italic font-bold">«{[
                                                            { id: 'leader', advice: 'дадим роль капитана и возможность проявлять инициативу.' },
                                                            { id: 'team_player', advice: 'поможем стать опорой команды и развить навыки паса.' },
                                                            { id: 'shy_start', advice: 'обеспечим мягкое вовлечение в процесс без лишнего давления.' },
                                                            { id: 'energetic', advice: 'направим неиссякаемую энергию в правильное русло.' }
                                                        ].find(a => a.id === formData.temperament)?.advice}»</span></span>
                                                    ) : (
                                                        "Выберите характер вашего ребенка выше, чтобы увидеть, какую атмосферу подготовит для него тренер."
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Что еще важно знать тренеру?</label>
                                        <textarea
                                            value={formData.characterNote}
                                            onChange={e => setFormData({ ...formData, characterNote: e.target.value })}
                                            placeholder="Напр. Боится громкого свистка или очень расстраивается, когда мяч уходит в аут..."
                                            className="w-full bg-white/5 border border-white/5 rounded-[2rem] p-6 text-white text-xs min-h-[140px] focus:border-white/20 outline-none transition-all placeholder-white/10 resize-none font-medium leading-relaxed italic"
                                        />
                                    </div>
                                </div>

                                <div className="mt-12 flex justify-between gap-4 items-center">
                                    <button onClick={handleBack} className="flex items-center gap-2 text-white/30 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]">
                                        <ArrowLeft size={16} /> Назад
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        disabled={!formData.temperament}
                                        className="px-16 py-6 bg-gradient-to-r from-sparta-gold to-yellow-600 text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-[0_20px_50px_rgba(212,175,55,0.3)] disabled:opacity-20 disabled:grayscale overflow-hidden relative group"
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span className="relative z-10">Запустить AI Анализ</span>
                                        <Zap size={20} fill="currentColor" className="relative z-10 animate-pulse" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {isAnalyzing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-center p-8"
                            >
                                <div className="relative w-48 h-48 mb-12">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-t-2 border-sparta-gold rounded-full"
                                    />
                                    <motion.div
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-4 border-b-2 border-blue-500/30 rounded-full"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Target className="text-sparta-gold animate-pulse" size={64} />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-russo text-white mb-2 uppercase tracking-widest">Анализируем данные...</h2>
                                <p className="text-white/30 text-sm max-w-xs mx-auto">
                                    Сопоставляем профиль {formData.childFirstName} с {groups.length} активными группами и методиками тренеров Sparta...
                                </p>
                            </motion.div>
                        )}

                        {step === 7 && (
                            <motion.div
                                key="step7"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center text-center max-w-lg mx-auto h-full"
                            >
                                <div className="w-28 h-28 bg-gradient-to-br from-sparta-gold to-yellow-600 rounded-full flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(212,175,55,0.4)] relative">
                                    <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping opacity-20" />
                                    <Check size={56} className="text-black" />
                                </div>
                                <h2 className="text-4xl md:text-5xl font-russo text-white mb-4 italic tracking-tighter uppercase">
                                    Заявка <span className="text-sparta-gold">принята!</span>
                                </h2>
                                <p className="text-white/60 text-lg mb-4 max-w-sm font-medium">
                                    <span className="text-white font-black">{formatName(formData.childFirstName)}</span>, добро пожаловать в семью Sparta!
                                </p>
                                <div className="px-6 py-2 bg-sparta-gold/10 border border-sparta-gold/30 rounded-full mb-8">
                                    <p className="text-sparta-gold text-xs font-black uppercase tracking-widest leading-none">
                                        Группа: {selectedGroupName || "Выбрана"}
                                    </p>
                                </div>

                                {/* Next Steps Timeline */}
                                <div className="w-full max-w-md grid grid-cols-3 gap-4 mb-10 relative">
                                    <div className="absolute top-6 left-[15%] right-[15%] h-[2px] bg-white/5" />

                                    <div className="flex flex-col items-center gap-3 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 text-white/50">
                                            <PhoneIncoming size={20} />
                                        </div>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Звонок<br />менеджера</p>
                                    </div>

                                    <div className="flex flex-col items-center gap-3 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 text-white/50">
                                            <CalendarCheck size={20} />
                                        </div>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Подтверждение<br />даты</p>
                                    </div>

                                    <div className="flex flex-col items-center gap-3 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 flex items-center justify-center border border-sparta-gold/30 text-sparta-gold">
                                            <Star size={20} />
                                        </div>
                                        <p className="text-[9px] font-black text-sparta-gold uppercase tracking-widest text-center">Встреча<br />на поле</p>
                                    </div>
                                </div>

                                {/* Parental Checklist */}
                                <div className="w-full p-6 bg-white/5 border border-white/10 rounded-3xl mb-8 text-left">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-sparta-gold/20 rounded-xl text-sparta-gold">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <h4 className="text-[12px] font-black text-white uppercase tracking-widest">ЧЕК-ЛИСТ ПЕРЕД ТРЕНИРОВКОЙ</h4>
                                    </div>
                                    <ul className="space-y-3">
                                        {[
                                            'Удобная спортивная форма и обувь (кеды/кроссовки)',
                                            'Бутылочка негазированной воды',
                                            'Хорошее настроение и готовность к новым знакомствам!',
                                            'Приезжайте за 10-15 минут до начала занятия'
                                        ].map((item, i) => (
                                            <li key={i} className="flex gap-3 text-xs text-white/50 leading-relaxed font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-sparta-gold mt-1.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="w-full flex flex-col gap-4">
                                    <button
                                        onClick={() => window.location.href = '/dashboard'}
                                        className="w-full py-5 bg-sparta-gold text-black font-bold rounded-2xl hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-sparta-gold/20"
                                    >
                                        Личный кабинет <ChevronRight size={20} />
                                    </button>
                                    <button
                                        onClick={onComplete}
                                        className="w-full py-4 text-white/30 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs"
                                    >
                                        Вернуться на главную
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl md:text-4xl font-russo text-white mb-4 italic tracking-wider">
                                        <span className="uppercase">Команда мечты для</span> <span className="text-sparta-gold select-none">{formatName(formData.childFirstName)}</span>
                                    </h2>
                                    <p className="text-white/40 max-w-lg mx-auto leading-relaxed font-medium">
                                        Мы подобрали группы, где {formatName(formData.childFirstName)} будет чувствовать себя максимально комфортно!
                                    </p>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10 space-y-6">
                                    {recommendations.length > 0 ? (
                                        recommendations.map(({ group, score, insights }, idx) => {
                                            const coachArchetype = group.difficultyLevel === 'pro' ? 'Спокойный профессионал' : group.difficultyLevel === 'amateur' ? 'Мастер мотивации' : 'Добрый наставник';

                                            return (
                                                <div key={group.id} className="bg-zinc-900/90 border border-white/5 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group hover:border-sparta-gold/30 transition-all duration-500 shadow-2xl">
                                                    {/* Top Bar: More Compact */}
                                                    <div className="flex items-center justify-between mb-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sm">🎯</div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-white/30 uppercase font-black leading-none mb-1">Совпадение</span>
                                                                    <span className="text-lg font-russo text-sparta-gold">
                                                                        <AnimatedNumber value={score} />%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {idx === 0 && (
                                                            <div className="bg-gradient-to-r from-sparta-gold to-yellow-600 text-black text-[9px] font-black px-6 py-2 rounded-xl uppercase tracking-[0.15rem] shadow-xl">
                                                                Лучший выбор ✨
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Match Insights - Real-time Analysis */}
                                                    <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                                        {insights.map((insight, i) => (
                                                            <div key={i} className="px-3 py-1.5 bg-white/5 rounded-full border border-white/5 text-[8px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-2">
                                                                <div className="w-1 h-1 rounded-full bg-sparta-gold shadow-[0_0_5px_rgba(212,175,55,0.8)]" />
                                                                {insight}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Central Identity: Adjusted font sizes */}
                                                    <div className="text-center mb-8">
                                                        <h3 className="text-3xl font-russo text-white uppercase tracking-tight mb-4 group-hover:text-sparta-gold transition-colors leading-tight">
                                                            {group.name}
                                                        </h3>
                                                        <div className="flex flex-wrap justify-center gap-3">
                                                            {group.schedule?.map((s, i) => (
                                                                <div key={i} className="px-5 py-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2.5 text-white/60 font-bold text-xs">
                                                                    <Calendar size={16} className="text-sparta-gold" />
                                                                    {s.day}, {s.time}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Why We Match: More compact boxes */}
                                                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                                                        <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="w-10 h-10 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-xl">😊</div>
                                                                <h4 className="text-[10px] font-black text-sparta-gold uppercase tracking-widest">Атмосфера</h4>
                                                            </div>
                                                            <p className="text-xs text-white/40 font-medium leading-relaxed">Максимально дружелюбная команда чемпионов</p>
                                                        </div>
                                                        <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">🚀</div>
                                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Развитие</h4>
                                                            </div>
                                                            <p className="text-xs text-white/40 font-medium leading-relaxed">{group.difficultyLevel === 'newbie' ? 'Мягкий старт с нуля' : 'Активный рост техники'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Coach Quote: Subtle highlight */}
                                                    <div className="mb-8 p-5 bg-white/5 rounded-2xl border border-white/5 text-center italic relative">
                                                        <p className="text-xs text-white/50 leading-relaxed">
                                                            «Тренер подготовил программу для <span className="text-white font-bold">{formatName(formData.childFirstName)}</span>!»
                                                        </p>
                                                    </div>

                                                    {/* Action CTA */}
                                                    <div className="flex flex-col gap-5 items-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedGroupId(group.id);
                                                                setJoinMode('trial');
                                                                handleJoinGroup('trial', group.id, group.name);
                                                            }}
                                                            className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-sparta-gold transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.05)] active:scale-95 group/btn overflow-hidden relative"
                                                        >
                                                            <div className="absolute inset-0 bg-sparta-gold/20 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
                                                            <span className="relative z-10">Иду на тренировку!</span> <ChevronRight size={20} className="relative z-10" />
                                                        </button>
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-3 py-1.5 bg-green-500/10 rounded-full flex items-center gap-2 text-[9px] text-green-500 font-bold uppercase tracking-widest">
                                                                <ShieldCheck size={12} /> Бронируется бесплатно
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                            <Search size={48} className="mx-auto text-white/10 mb-4" />
                                            <h3 className="text-xl font-bold text-white mb-2">Группы пока не созданы</h3>
                                            <p className="text-white/30 text-sm mb-8">Для возраста {formData.childAge} лет на данный момент нет подходящих групп.</p>
                                            <button onClick={onComplete} className="text-sparta-gold hover:underline font-bold uppercase tracking-widest text-xs">Пропустить этот этап</button>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 flex justify-between items-center px-4">
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 text-white/30 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]"
                                    >
                                        <ArrowLeft size={16} /> К настройкам характера
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (onContactLink) onContactLink();
                                            onComplete();
                                        }}
                                        className="text-white/20 hover:text-white transition-colors text-xs uppercase font-bold tracking-widest"
                                    >
                                        Не нашел что искал, связаться с менеджером
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 6 && (
                            <motion.div
                                key="step6"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-4xl font-russo text-white mb-2 uppercase tracking-tighter">ВАШ ПЕРСОНАЛЬНЫЙ <span className="text-sparta-gold">ПРОПУСК SPARTA</span></h2>
                                    <p className="text-white/40 max-w-lg mx-auto text-sm font-medium">Почти готово! Подтвердите детали вашей первой тренировки и получите доступ к базе чемпионов.</p>
                                </div>

                                <div className="grid lg:grid-cols-[1fr_350px] gap-12 items-center flex-1">
                                    {/* Passport Visual */}
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-sparta-gold/10 blur-[100px] rounded-full group-hover:bg-sparta-gold/20 transition-all duration-1000" />

                                        {/* Security Hologram Effect */}
                                        <motion.div
                                            initial={{ opacity: 0.1, x: '-100%' }}
                                            animate={{ x: '200%' }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 z-20 pointer-events-none opacity-20 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                                        />

                                        <div className="relative bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-[3rem] p-10 overflow-hidden shadow-2xl">


                                            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                                                <div className="w-32 h-40 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 relative overflow-hidden group/photo">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                    <UserIcon size={48} className="text-white/20 relative z-10" />
                                                    <div className="text-[8px] font-black text-white/40 uppercase tracking-widest relative z-10">PHOTO ID</div>
                                                </div>

                                                <div className="flex-1 space-y-6 w-full">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Статус: Готов к зачислению</span>
                                                        </div>
                                                        <h3 className="text-4xl font-russo text-white uppercase leading-none mb-1">{formData.childFirstName}</h3>
                                                        <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Athlete ID: SMV2-{(Math.random() * 10000).toFixed(0)}</div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                                                        <div className="space-y-1">
                                                            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Группа назначения</div>
                                                            <div className="text-xs font-bold text-sparta-gold uppercase">{selectedGroupName}</div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Уровень</div>
                                                            <div className="text-xs font-bold text-white uppercase">{EXPERIENCE_LEVELS.find(l => l.id === formData.experienceLevel)?.title}</div>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                                                                <Star size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Архетип</div>
                                                                <div className="text-[10px] font-bold text-white uppercase">{TEMPERAMENTS.find(t => t.id === formData.temperament)?.title}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Score</div>
                                                            <div className="text-lg font-russo text-sparta-gold leading-none">
                                                                {recommendations.find(r => r.group.id === selectedGroupId)?.score || 95}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <AnimatePresence>
                                                        {selectedCoach && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="pt-4 border-t border-white/5 flex items-center gap-3"
                                                            >
                                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-sparta-gold/30 bg-white/5 shrink-0">
                                                                    {selectedCoach.image ? (
                                                                        <img src={selectedCoach.image} alt={selectedCoach.name} className="w-full h-full object-cover transition-all duration-500" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <UserIcon size={16} className="text-white/20" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="text-[7px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Верифицированный наставник</div>
                                                                    <div className="text-[10px] font-bold text-white truncate">{selectedCoach.name}</div>
                                                                    <div className="text-[7px] text-sparta-gold uppercase font-bold tracking-tighter opacity-70">{selectedCoach.role}</div>
                                                                </div>
                                                                <div className="p-1.5 bg-sparta-gold/10 rounded-lg text-sparta-gold shrink-0">
                                                                    <ShieldCheck size={12} />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Confirmation Details */}
                                    <div className="space-y-8 relative">


                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none">Дата первого визита</label>
                                                <button
                                                    onClick={() => setFormData({ ...formData, isCustomDate: !formData.isCustomDate })}
                                                    className="text-[8px] font-black text-sparta-gold uppercase tracking-widest hover:underline"
                                                >
                                                    {formData.isCustomDate ? 'Вернуться к расписанию' : 'Указать свою дату'}
                                                </button>
                                            </div>

                                            {!formData.isCustomDate ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {(() => {
                                                        const group = groups.find(g => g.id === selectedGroupId);
                                                        const availableSlots = group?.schedule || [];
                                                        const daysMap: Record<string, string> = {
                                                            'Пн': 'Понедельник', 'Вт': 'Вторник', 'Ср': 'Среда', 'Чт': 'Четверг', 'Пт': 'Пятница', 'Сб': 'Суббота', 'Вс': 'Воскресенье'
                                                        };
                                                        return availableSlots.slice(0, 2).map(slot => (
                                                            <button
                                                                key={slot.day}
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    finalTrialDate: daysMap[slot.day],
                                                                    finalTrialTime: slot.time
                                                                })}
                                                                className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1
                                                                    ${formData.finalTrialDate === daysMap[slot.day] ? 'bg-sparta-gold border-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-center w-full">
                                                                    <span className="text-[8px] font-black uppercase opacity-60">Ближайший {slot.day}</span>
                                                                    <span className="text-[8px] font-black uppercase opacity-40">{slot.time}</span>
                                                                </div>
                                                                <span className="text-xs font-bold uppercase">{daysMap[slot.day]}</span>
                                                            </button>
                                                        ));
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 mb-1.5 ml-1 text-sparta-gold/40">
                                                            <Calendar size={10} />
                                                            <label className="text-[8px] font-black uppercase tracking-widest leading-none">День</label>
                                                        </div>
                                                        <input
                                                            type="date"
                                                            value={formData.finalTrialDate}
                                                            onChange={e => setFormData({ ...formData, finalTrialDate: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-[10px] outline-none focus:border-sparta-gold transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 mb-1.5 ml-1 text-sparta-gold/40">
                                                            <Clock size={10} />
                                                            <label className="text-[8px] font-black uppercase tracking-widest leading-none">Время</label>
                                                        </div>
                                                        <input
                                                            type="time"
                                                            value={formData.finalTrialTime}
                                                            onChange={e => setFormData({ ...formData, finalTrialTime: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-[10px] outline-none focus:border-sparta-gold transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end px-1">
                                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Заметка тренеру (финально)</label>
                                                <span className="text-[8px] text-white/20 italic">Необязательно</span>
                                            </div>
                                            <textarea
                                                value={formData.finalNotes || ''}
                                                onChange={e => setFormData({ ...formData, finalNotes: e.target.value })}
                                                placeholder="Напр. Мы придем вместе с другом..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-xs min-h-[100px] focus:border-sparta-gold outline-none transition-all placeholder-white/10 resize-none font-medium"
                                            />
                                        </div>

                                        <button
                                            onClick={handleFinalConfirm}
                                            disabled={loading || !formData.finalTrialDate}
                                            className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-sparta-gold transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-20 relative overflow-hidden group/submit"
                                        >
                                            {loading ? (
                                                <Loader2 className="animate-spin" size={20} />
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-sparta-gold opacity-0 group-hover/submit:opacity-100 transition-opacity translate-y-full group-hover/submit:translate-y-0 duration-500" />
                                                    <span className="relative z-10">ПОЛУЧИТЬ ПРОПУСК И ВОЙТИ</span>
                                                    <ChevronRight size={20} className="relative z-10" />
                                                </>
                                            )}
                                        </button>

                                        <div className="flex items-center justify-center gap-2">
                                            <ShieldCheck size={14} className="text-white/20" />
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Безопасное соединение зашифровано TLS</span>
                                        </div>

                                        <div className="pt-4 flex justify-center">
                                            <button
                                                onClick={handleBack}
                                                className="flex items-center gap-2 text-white/20 hover:text-white transition-colors font-bold uppercase tracking-widest text-[9px]"
                                            >
                                                <ArrowLeft size={14} /> К выбору группы
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer simple exit if needed */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                    <button onClick={onComplete} className="p-4 rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(212, 175, 55, 0.2);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(212, 175, 55, 0.4);
                }
                .text-glow {
                    text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
                }
            `}</style>
        </div>
    );
};

export default SmartEnrollmentWizard;
