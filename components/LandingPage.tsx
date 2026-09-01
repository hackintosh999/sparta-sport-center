import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    ChevronRight,
    Star,
    Shield,
    ShieldCheck,
    Award,
    Trophy,
    Users,
    CheckCircle,
    ArrowRight,
    MapPin,
    Phone,
    Instagram,
    Facebook,
    Twitter,
    Menu,
    X,
    Play,
    Mail,
    Flame,
    ChevronDown,
    Check,
    Gift,
    Sparkles,
    Zap,
    Heart,
    RefreshCw,
    ExternalLink,
    ArrowUpRight
} from 'lucide-react';

import { Button, GlassCard, SectionHeader, Container } from './UIComponents';
import { NavItem, Feature, Program, Coach, FAQItem } from '../types';
import { Group } from '../types/shop';
import TermsModal from './TermsModal';
import TrialModal from './TrialModal';
import AuthModal from './AuthModal';
import NewsSection from './NewsSection';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import ContactModal from './ContactModal';
import { ScheduleSection } from './ScheduleSection';
import MembershipModal from './MembershipModal';
import SubscriptionsShowcase from './SubscriptionsShowcase';
import ReviewsSection from './ReviewsSection';
import LeaveReviewModal from './LeaveReviewModal';
import SmartEnrollmentWizard from './SmartEnrollmentWizard';
import SEO from './SEO';
import { ThemeToggle } from './ThemeToggle';
import ChildBenefitsSection from './ChildBenefitsSection';
import WhyUsPositioningSection from './WhyUsPositioningSection';
import RouteModal from './RouteModal';
import CitySelector from './CitySelector';
import { useCity } from '../context/CityContext';


// --- Data Constants ---

const NAV_ITEMS: NavItem[] = [
    { label: 'О нас', href: '#about' },
    { label: 'Программы', href: '#programs' },
    { label: 'Расписание', href: '#schedule' },
    { label: 'Магазин', href: '/shop' },
    { label: 'Трансляции', href: '/broadcasts' },
    { label: 'Команда', href: '#team' },
    { label: 'Отзывы', href: '#reviews' },
    { label: 'Вопросы', href: '#faq' },
];



const FEATURES = [
    {
        id: 1,
        title: 'Безопасные залы',
        description: 'Залы с качественным покрытием, которое минимизирует риск травм и позволяет комфортно отрабатывать технику.',
        icon: <ShieldCheck className="w-8 h-8 text-sparta-gold" />,
        iconSrc: '/icon-equipment.png'
    },
    {
        id: 2,
        title: 'Сильный тренерский состав',
        description: 'Опытные наставники, которые не только знают футбол изнутри, но и умеют находить общий язык с детьми.',
        icon: <Users className="w-8 h-8 text-sparta-gold" />,
        iconSrc: '/icon-trophy.png'
    },
    {
        id: 3,
        title: 'Современный инвентарь',
        description: 'Мы используем качественные мячи, барьеры, координационные лестницы и другой инвентарь, чтобы тренировки были эффективными и интересными.',
        icon: <Trophy className="w-8 h-8 text-sparta-gold" />,
        iconSrc: '/icon-flame.png'
    },
    {
        id: 4,
        title: 'Комфорт для родителей',
        description: 'Удобный график занятий, чистые комфортные раздевалки для детей и наличие парковочных мест для родителей.',
        icon: <Heart className="w-8 h-8 text-sparta-gold" />,
        iconSrc: '/icon-comfort.png'
    },
];

const PROGRAMS: Program[] = [
    {
        id: 1,
        title: "Новичок",
        prices: { 1: 5200, 3: 11990, 6: 19990, 12: 36480 },
        image: "/sparta_logo_beginner_tariff.jpg",
        features: ["8 тренировок в месяц (2 раза в неделю)", "Базовая подготовка", "Групповые занятия", "Безопасная среда"]
    },
    {
        id: 2,
        title: "Профессионал",
        prices: { 1: 7790, 3: 17990, 6: 29990, 12: 54720 },
        image: "/sparta_logo_pro_tariff.jpg",
        features: ["12 тренировок в месяц (3 раза в неделю)", "Интенсивная подготовка", "Отработка тактики", "Спортивный анализ"]
    },
    {
        id: 3,
        title: "Чемпион",
        prices: { 1: 9900, 3: 23990, 6: 39990, 12: 72960 },
        image: "/sparta_logo_champion_tariff.jpg",
        features: ["16 тренировок в месяц (4 раза в неделю)", "Игровая практика", "Путь в сборную", "Полный комплект экипировки"]
    }
];

const COACHES: Coach[] = [
    { id: 1, name: "Сергей Пономарев", role: "Старший тренер по футболу", image: "/sergey-ponomarev.png" },
    { id: 2, name: "Антон Глазунов", role: "Старший тренер по киле", image: "/anton-glazunov.png" },
    { id: 3, name: "Аксинья Лебедева", role: "Директор футбольного клуба", image: "/aksinya-lebedeva.png" },
    { id: 4, name: "Сергей Кубарь", role: "Тренер по футболу", image: "/sergey-kubar-gold.png" },
    { id: 5, name: "Павел Якупов", role: "Тренер по футболу", image: "/pavel-yakupov-gold.png" },
];

const FAQS: FAQItem[] = [
    { id: 1, question: "Что взять на первую тренировку?", answer: "Удобную футбольную форму и соответствующую обувь (бутсы для зала или искусственного газона). Мы обеспечиваем игроков водой и всем необходимым тренировочным инвентарем." },
    { id: 2, question: "С какого возраста можно начать?", answer: "У нас есть группы для детей (от 4-х до 14 лет). Программы разделены по возрастам и уровням подготовки для максимального прогресса." },
    { id: 3, question: "Как проходят занятия?", answer: "Каждая тренировка включает в себя технику владения мячом, развитие физических качеств, тактические упражнения и обязательную игровую практику." },
];

// --- Sub-Components ---

import GroupsSection from './GroupsSection';

const Navbar = ({ onOpenTrial, onOpenAuth }: { onOpenTrial: () => void, onOpenAuth: () => void }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, userProfile, requestedGroupIds } = useAuth();
    const hasRequestedTrial = requestedGroupIds.length > 0;
    const navigate = useNavigate();
    const [hasLiveStream, setHasLiveStream] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        // Listen for ANY live broadcast to show the badge globally
        const q = query(collection(db, 'broadcasts'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const hasLive = snapshot.docs.some(doc => doc.data().isLive === true);
            setHasLiveStream(hasLive);
        });
        return () => unsubscribe();
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center py-6 px-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
            <motion.div
                className={`pointer-events-auto flex items-center justify-between px-6 lg:px-8 py-3 rounded-full transition-all duration-500 ${isScrolled
                    ? 'bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl w-full'
                    : 'bg-transparent w-full'
                    }`}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <motion.div
                    className="flex items-center gap-2 cursor-pointer group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    whileHover={{ scale: 1.05 }}
                >
                    <motion.img
                        src="/sparta-logo.png"
                        alt="SPARTA Logo"
                        className="h-12 w-auto object-contain gold-glow-soft"
                        animate={{ 
                            scale: [1, 1.05, 1],
                            filter: ["drop-shadow(0 0 5px rgba(212,175,55,0.2))", "drop-shadow(0 0 15px rgba(212,175,55,0.5))", "drop-shadow(0 0 5px rgba(212,175,55,0.2))"]
                        }}
                        transition={{ 
                            duration: 4, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                        }}
                        whileHover={{ 
                            rotateY: 15,
                            rotateX: -10,
                            scale: 1.1,
                            transition: { duration: 0.3 }
                        }}
                    />
                    <motion.div
                        className="font-russo text-2xl tracking-widest text-gold-gradient drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        whileHover={{ 
                            scale: 1.05, 
                            filter: "brightness(1.2) drop-shadow(0 0 8px rgba(212,175,55,0.4))",
                            x: 5
                        }}
                    >
                        SPARTA
                    </motion.div>
                    <CitySelector className="ml-1 sm:ml-3" />
                </motion.div>

                {/* Desktop Menu */}
                <div className="hidden xl:flex items-center gap-4 xl:gap-8">
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={(e) => {
                                if (item.href.startsWith('/')) {
                                    e.preventDefault();
                                    navigate(item.href);
                                }
                            }}
                            className="font-manrope text-sm font-medium text-white/70 hover:text-sparta-gold transition-colors cursor-pointer relative"
                        >
                            <span className="flex items-center gap-2">
                                {item.label}
                                {item.href === '/broadcasts' && hasLiveStream && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)] absolute -right-2 top-0" />
                                )}
                            </span>
                        </a>
                    ))}
                </div>

                <div className="hidden xl:flex items-center gap-3 xl:gap-4 shrink-0">
                    {user ? (
                        <div className="flex items-center gap-2 xl:gap-4">
                            <button
                                onClick={() => navigate('/dashboard?tab=profile')}
                                className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10 hover:border-sparta-gold/50 transition-all group backdrop-blur-sm shrink-0 max-w-[140px] xl:max-w-[200px]"
                            >
                                <span className="hidden xl:inline text-white/50 text-xs font-bold uppercase tracking-wider group-hover:text-white/70 transition-colors">Баланс:</span>
                                <span className="font-russo text-sparta-gold text-base xl:text-lg drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] truncate overflow-hidden">
                                    {(userProfile?.walletBalance !== undefined ? userProfile.walletBalance : (userProfile?.balance !== undefined ? userProfile.balance : 0))} ₽
                                </span>
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sparta-gold hover:bg-white/20 transition-all border border-sparta-gold/30 shrink-0 overflow-hidden"
                            >
                                {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" /> : <span className="font-bold text-lg">{user.displayName?.[0] || 'U'}</span>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={onOpenAuth}
                                className="px-6 py-2 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 text-sm"
                            >
                                Войти
                            </button>
                        </>
                    )}
                </div>

                {/* Mobile Toggle */}
                <div className="flex xl:hidden items-center gap-3">
                    {user && (
                         <button
                            onClick={() => navigate('/dashboard')}
                            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sparta-gold border border-sparta-gold/30 shrink-0 overflow-hidden"
                        >
                            {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-base">{user.displayName?.[0] || 'U'}</span>}
                        </button>
                    )}
                    <button className="text-white p-2 hover:bg-white/5 rounded-xl transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </motion.div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 xl:hidden pointer-events-auto"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-20 left-4 right-4 bg-[#111]/95 border border-white/10 rounded-[28px] p-6 flex flex-col gap-5 items-center shadow-2xl z-50 max-h-[85vh] overflow-y-auto custom-scrollbar xl:hidden backdrop-blur-2xl pointer-events-auto"
                        >
                            {NAV_ITEMS.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    onClick={(e) => {
                                        if (item.href.startsWith('/')) {
                                            e.preventDefault();
                                            navigate(item.href);
                                        }
                                        setMobileMenuOpen(false);
                                    }}
                                    className="font-manrope text-lg font-semibold text-white/90 hover:text-sparta-gold transition-colors py-1 cursor-pointer w-full text-center"
                                >
                                    {item.label}
                                </a>
                            ))}
                            {user ? (
                                <>
                                    <div className="w-full flex items-center justify-between bg-black/50 p-4 rounded-2xl border border-white/10 mt-2">
                                        <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Ваш Баланс</span>
                                        <span className="font-russo text-sparta-gold text-lg">
                                            {(userProfile?.walletBalance !== undefined ? userProfile.walletBalance : (userProfile?.balance !== undefined ? userProfile.balance : 0))} ₽
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                                        className="w-full py-3.5 rounded-2xl font-bold bg-sparta-gold text-black hover:brightness-110 transition-all text-center text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                                    >
                                        Личный кабинет
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
                                    className="w-full py-3.5 rounded-2xl font-bold bg-sparta-gold text-black hover:brightness-110 transition-all text-center text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)] mt-2"
                                >
                                    Войти в аккаунт
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
};

const LocationCard: React.FC<{ onOpenRoute?: (locId: string) => void }> = ({ onOpenRoute }) => {
    const { locations, city } = useCity();

    return (
        <div className="bg-white/5 border border-white/10 backdrop-blur-md hover:border-sparta-gold/30 transition-all duration-300 rounded-2xl p-4 sm:p-5 flex flex-col items-start text-left group hover:bg-white/[0.07] relative overflow-hidden h-full justify-between">
            <div>
                <div className="w-9 h-9 rounded-xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center shrink-0 text-sparta-gold mb-2.5 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                    <MapPin size={18} />
                </div>

                <h3 className="font-russo text-base text-white group-hover:text-sparta-gold transition-colors">
                    {locations.length} залов в г. {city.name}
                </h3>
            </div>

            <div className="w-full mt-2">
                <div className="flex flex-col gap-2 mt-2 w-full">
                    {locations.map((loc) => (
                        <button
                            key={loc.id}
                            onClick={() => onOpenRoute && onOpenRoute(loc.id)}
                            className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-yellow-500/50 transition-all cursor-pointer group/pill text-left"
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-white font-manrope font-semibold leading-tight">
                                        {loc.name}
                                    </span>
                                    <span className="text-gray-400 text-xs truncate leading-tight mt-0.5">
                                        {loc.address}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-sparta-gold bg-sparta-gold/10 border border-sparta-gold/20 px-2 py-0.5 rounded-md shrink-0 ml-2 group-hover/pill:bg-sparta-gold group-hover/pill:text-black transition-all">
                                🗺️ Маршрут
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Hero = ({ onOpenTrial, onOpenRoute }: { onOpenTrial: () => void; onOpenRoute?: () => void }) => {
    const { user, userProfile, requestedGroupIds } = useAuth();
    const navigate = useNavigate();
    const { locations, city } = useCity();
    const hasRequestedTrial = requestedGroupIds.length > 0;
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 200]);

    const isEnrolled = !!user;

    return (
        <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden pt-32 pb-20">
            {/* Dynamic Background Elements - Wrapped to prevent overflow */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-sparta-gold/10 rounded-full blur-[80px] md:blur-[150px]" />
                <div className="absolute top-0 right-0 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-purple-900/10 rounded-full blur-[60px] md:blur-[120px]" />
            </div>

            <Container className="relative z-10 text-center flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sparta-gold text-xs sm:text-sm font-bold tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                        <Flame size={14} className="fill-sparta-gold text-sparta-gold shrink-0" />
                        <span>Детская футбольная школа в Челябинске</span>
                    </div>

                    <h1 className="font-russo text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] mb-6 px-4 uppercase tracking-wide">
                        Путь к победам <br className="hidden sm:inline" />
                        начинается в <span className="text-gold-gradient">SPARTA</span>
                    </h1>

                    <p className="font-manrope text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
                        Профессиональная подготовка детей от 4 до 14 лет — от первых тренировок до соревнований. Не просто секция, а школа развития игрока.
                    </p>

                    {/* Primary Action Buttons - Immediate Focus */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-full max-w-2xl mx-auto mb-10">
                        {isEnrolled ? (
                            <Button 
                                className="group w-full sm:w-auto px-6 sm:px-8 py-4 text-sm sm:text-base md:text-lg font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-[0_0_30px_rgba(212,175,55,0.3)]" 
                                onClick={() => navigate('/dashboard')}
                            >
                                <span className="whitespace-nowrap">Личный кабинет</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 shrink-0 group-hover:translate-x-1 transition-transform inline-block" />
                            </Button>
                        ) : (
                            <Button 
                                className="group w-full sm:w-auto px-6 sm:px-8 py-4 text-sm sm:text-base md:text-lg font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-[0_0_30px_rgba(212,175,55,0.3)]" 
                                onClick={onOpenTrial}
                            >
                                <span className="whitespace-nowrap">Прийти на день знакомства</span>
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 shrink-0 group-hover:translate-x-1 transition-transform inline-block" />
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto px-6 py-4 text-sm sm:text-base whitespace-nowrap"
                            onClick={() => {
                                const el = document.getElementById('schedule');
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Расписание
                        </Button>
                    </div>

                    {/* Sleek Trust & Key Indicators Strip */}
                    <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 max-w-4xl mx-auto px-4">
                        <button
                            onClick={onOpenRoute}
                            title="Нажмите, чтобы проложить маршрут до любого из залов"
                            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.06] border border-sparta-gold/30 hover:border-sparta-gold hover:bg-white/[0.12] backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all cursor-pointer group hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] active:scale-95"
                        >
                            <MapPin className="w-4 h-4 text-sparta-gold shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="text-xs sm:text-sm font-manrope font-semibold text-white group-hover:text-sparta-gold transition-colors">
                                {locations.length} залов в г. {city.name}
                            </span>
                            <span className="flex items-center text-[10px] font-bold text-sparta-gold bg-sparta-gold/15 border border-sparta-gold/30 px-2 py-0.5 rounded-md ml-0.5 group-hover:bg-gold-gradient group-hover:text-black transition-all">
                                🗺️ Карта <ChevronRight className="w-3 h-3 ml-0.5 inline-block group-hover:translate-x-0.5 transition-transform" />
                            </span>
                        </button>
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                            <Users className="w-4 h-4 text-sparta-gold shrink-0" />
                            <span className="text-xs sm:text-sm font-manrope font-semibold text-white">Группы 4–14 лет</span>
                        </div>
                        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                            <ShieldCheck className="w-4 h-4 text-sparta-gold shrink-0" />
                            <span className="text-xs sm:text-sm font-manrope font-semibold text-white">Забота & Без стресса</span>
                        </div>
                    </div>
                </motion.div>
            </Container>

            <motion.div style={{ y }} className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sparta-black to-transparent z-10 pointer-events-none" />
        </section>
    );
};

const Marquee = () => {
    return (
        <div className="bg-sparta-gold py-4 overflow-hidden relative z-20 rotate-1 scale-105 border-y-4 border-black">
            <motion.div
                className="whitespace-nowrap flex gap-12"
                style={{ willChange: 'transform' }}
                animate={{ x: "-50%" }}
                transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            >
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="flex items-center gap-12">
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">ДИСЦИПЛИНА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">СИЛА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">ПОБЕДА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest">СПАРТА</span>
                        <span className="text-black font-russo text-2xl md:text-4xl tracking-widest opacity-50">•</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

const WhyUs = () => {
    return (
        <section id="about" className="py-24 relative">
            <Container>
                <SectionHeader
                    title="УСЛОВИЯ И ИНФРАСТРУКТУРА"
                    subtitle="Комфорт и безопасность для игроков и их родителей."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {FEATURES.map((feature, idx) => (
                        <motion.div
                            key={feature.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <GlassCard className="h-full flex flex-col items-center text-center hover:bg-white/10 transition-colors group p-6 rounded-[28px]">
                                <div className="w-16 h-16 mb-6 relative flex items-center justify-center rounded-2xl bg-sparta-gold/10 border border-sparta-gold/20 text-sparta-gold transition-transform duration-500 group-hover:scale-110 group-hover:bg-sparta-gold/20 group-hover:border-sparta-gold/40 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                                    {feature.icon || (
                                        <img src={feature.iconSrc} alt={feature.title} className="w-10 h-10 object-contain drop-shadow-2xl relative z-10" loading="lazy" decoding="async" />
                                    )}
                                </div>
                                <h3 className="font-russo text-xl text-white mb-3 group-hover:text-sparta-gold transition-colors">{feature.title}</h3>
                                <p className="font-manrope text-white/60 text-sm leading-relaxed">{feature.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

export const getProgramImage = (program: any) => {
    if (!program) return '/sparta_clean_beginner_tariff.jpg';
    const img = program.image || '';
    const titleLower = (program.title || '').toLowerCase();

    if (!img || img.includes('tariff') || img.includes('sparta_logo') || img.includes('sparta_custom')) {
        if (titleLower.includes('новичок')) return '/sparta_clean_beginner_tariff.jpg';
        if (titleLower.includes('профессионал')) return '/sparta_clean_pro_tariff.jpg';
        if (titleLower.includes('чемпион')) return '/sparta_clean_champion_tariff.jpg';
    }
    return img;
};

const getPriceInfo = (program: any, duration: number, userProfile?: any) => {
    if (!program) return { monthly: '0', total: '0', originalTotal: null, savings: null, perSession: '0', badgeText: '' };

    const titleLower = (program.title || '').toLowerCase();
    const weeklySessions = program.sessionsPerWeek || (
        titleLower.includes('новичок') ? 2 :
        titleLower.includes('профессионал') ? 3 : 4
    );
    const workoutsPerMonth = weeklySessions * 4;

    const base1MonthPrice = program.prices?.[1] || (
        titleLower.includes('новичок') ? 5200 :
        titleLower.includes('профессионал') ? 7790 : 9990
    );

    const priceMap = program.prices || {};
    let total = priceMap[duration];

    if (!total || total === 0) {
        if (duration === 1) total = base1MonthPrice;
        else if (duration === 3) total = workoutsPerMonth * 3 * 500;
        else if (duration === 6) total = workoutsPerMonth * 6 * 420;
        else if (duration === 12) total = workoutsPerMonth * 12 * 380;
        else total = base1MonthPrice * duration;
    }

    const calculatedOriginalTotal = duration > 1 ? base1MonthPrice * duration : null;
    let originalTotal: number | null = calculatedOriginalTotal;

    if (userProfile?.activePromoDiscount) {
        const applicableTo = userProfile.activePromoApplicableTo || 'all';
        if (applicableTo === 'all' || applicableTo === 'subscriptions') {
            if (!originalTotal) originalTotal = total;
            total = Math.floor(total * (1 - userProfile.activePromoDiscount / 100));
        }
    }

    const totalWorkouts = workoutsPerMonth * duration;
    const perSession = Math.round(total / totalWorkouts);
    const savingsAmount = originalTotal && originalTotal > total ? (originalTotal - total) : 0;
    const monthly = Math.round(total / duration);

    let badgeText = '';
    if (duration === 6) badgeText = 'от 420 ₽ за занятие';
    else if (duration === 3) badgeText = 'от 500 ₽ за занятие';
    else if (duration === 12) badgeText = 'от 380 ₽ за занятие';
    else badgeText = `≈ ${perSession} ₽ / занятие`;

    return {
        monthly: monthly.toLocaleString('ru-RU'),
        total: total.toLocaleString('ru-RU'),
        originalTotal: originalTotal && savingsAmount > 0 ? originalTotal.toLocaleString('ru-RU') : null,
        savings: savingsAmount > 0 ? savingsAmount.toLocaleString('ru-RU') : null,
        perSession: perSession.toLocaleString('ru-RU'),
        badgeText
    };
};

const Programs = ({
    duration,
    setDuration,
    onOpenMembership
}: {
    duration: number;
    setDuration: (d: 1 | 3 | 6 | 12) => void;
    onOpenMembership: (program: Program, mode?: 'purchase' | 'renew') => void
}) => {
    const { userProfile } = useAuth();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "directions"), (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setPrograms(data);
            setLoading(false);
        }, (error) => {
            console.error("Directions fetch error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getDurationLabel = (d: number) => {
        if (d === 1) return '1 месяц';
        if (d >= 2 && d <= 4) return `${d} месяца`;
        return `${d} месяцев`;
    };

    const displayPrograms = (loading || programs.length === 0) ? PROGRAMS : programs;
    const tabs: (1 | 3 | 6 | 12)[] = [1, 3, 6, 12];

    return (
        <section id="programs" className="py-20 md:py-28 relative overflow-hidden">
            {/* Decorative BG - Responsive */}
            <div className="absolute top-1/2 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-sparta-gold/5 rounded-full blur-[60px] md:blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <Container>
                <SectionHeader title="НАПРАВЛЕНИЯ" subtitle="Выберите абонемент, который приведет вашего ребенка к высоким победам." />

                {/* Zen Promo Badge */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border border-amber-400/30 px-5 py-2.5 rounded-full backdrop-blur-md shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                        <Sparkles size={16} className="text-amber-400 animate-pulse shrink-0" />
                        <span className="text-xs sm:text-sm font-bold font-manrope text-amber-200">
                            Обучение <strong className="text-amber-400 font-extrabold underline underline-offset-4 decoration-amber-400/50">от 420 ₽</strong> за занятие
                        </span>
                        <span className="hidden sm:inline text-amber-400/40">•</span>
                        <span className="hidden sm:inline text-xs text-zinc-300 font-medium">100% заморозка при болезни</span>
                    </div>
                </div>

                {/* Duration Selector Tabs - Clean Minimalist Segmented Control */}
                <div className="flex justify-center mb-10 md:mb-14">
                    <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 grid grid-cols-4 gap-1.5 w-full max-w-lg relative backdrop-blur-md">
                        {tabs.map((d) => {
                            const isActive = duration === d;
                            return (
                                <button
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    className={`relative py-3 px-2 sm:px-4 rounded-xl font-manrope text-xs sm:text-sm font-bold transition-all duration-200 z-10 flex items-center justify-center select-none cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'text-black font-extrabold shadow-sm'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    <span>{getDurationLabel(d)}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeDurationBg"
                                            className="absolute inset-0 bg-gold-gradient rounded-xl -z-10 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Responsive Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
                    {displayPrograms.map((program, idx) => {
                        const prices = getPriceInfo(program, duration, userProfile);
                        const isPurchased = userProfile?.subscription?.planId === program.id;
                        const titleLower = program.title.toLowerCase();
                        
                        const isFeatured = titleLower.includes('профессионал');
                        const isVip = titleLower.includes('чемпион');
                        const isBeginner = titleLower.includes('новичок');

                        const frequencySubtitle = isBeginner
                            ? '2 тренировки в неделю • Легкий старт'
                            : isFeatured
                            ? '3 тренировки в неделю • Игра & Прогресс'
                            : '4 тренировки в неделю • Сборная & Турниры';

                        return (
                            <motion.div
                                key={program.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -6 }}
                                transition={{ delay: idx * 0.1, duration: 0.3 }}
                                viewport={{ once: true }}
                                className="relative group flex"
                            >
                                {/* Multi-layer Glowing Frame Container */}
                                <div className={`w-full flex flex-col rounded-[28px] p-[1.5px] transition-all duration-500 relative ${
                                    isPurchased
                                        ? 'bg-gradient-to-b from-sparta-gold via-amber-400 to-sparta-gold shadow-[0_0_40px_rgba(212,175,55,0.4)]'
                                        : isFeatured
                                        ? 'bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-600 shadow-[0_0_45px_rgba(245,158,11,0.35)] scale-[1.03] z-10'
                                        : isVip
                                        ? 'bg-gradient-to-b from-amber-500/50 via-amber-700/30 to-zinc-800/80 shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:shadow-[0_0_35px_rgba(212,175,55,0.3)]'
                                        : 'bg-gradient-to-b from-white/20 via-white/5 to-transparent hover:from-amber-400/40 hover:to-amber-500/20'
                                }`}>
                                    
                                    {/* Card Inner Body with Glassmorphism */}
                                    <div className={`h-full flex flex-col w-full rounded-[26px] overflow-hidden relative backdrop-blur-2xl transition-colors duration-300 ${
                                        isFeatured
                                            ? 'bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-black'
                                            : 'bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-black'
                                    }`}>
                                        
                                        {/* Card Header & Image with Gradient Blend Overlay */}
                                        <div className="relative h-48 sm:h-52 overflow-hidden rounded-t-[26px] bg-zinc-950">
                                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-transparent z-10 pointer-events-none" />
                                            <img
                                                src={getProgramImage(program)}
                                                alt={program.title}
                                                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                                            />
                                            {/* Gradient Mask to smoothly transition image to card body */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10 pointer-events-none" />

                                            {/* Floating Top Badge */}
                                            <div className="absolute top-4 right-4 z-20">
                                                {isFeatured ? (
                                                    <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.8)] border border-amber-300/80 flex items-center gap-1.5 animate-pulse">
                                                        <Flame size={13} className="fill-black" /> ХИТ ПРОДАЖ
                                                    </div>
                                                ) : isVip ? (
                                                    <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-500/60 text-amber-400 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center gap-1.5">
                                                        <Trophy size={13} /> МАКС. РЕЗУЛЬТАТ
                                                    </div>
                                                ) : (
                                                    <div className="bg-zinc-950/70 backdrop-blur-md border border-white/20 text-zinc-300 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                                                        БАЗОВЫЙ
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Main Content */}
                                        <div className="p-6 md:p-7 flex-1 flex flex-col justify-between -mt-4 z-20 relative">
                                            <div>
                                                {/* Header Title & Subtitle */}
                                                <div className="mb-5">
                                                    <h3 className="font-russo text-2xl sm:text-3xl text-white group-hover:text-amber-400 transition-colors tracking-wide">
                                                        {program.title}
                                                    </h3>
                                                    <p className="text-xs font-manrope font-bold text-amber-400/90 mt-1 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                                                        {frequencySubtitle}
                                                    </p>
                                                </div>

                                                {/* Premium Price Box */}
                                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md mb-6 relative overflow-hidden group-hover:border-amber-400/30 transition-colors">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                                                    
                                                    <div className="flex items-baseline gap-2 flex-wrap">
                                                        <span className="font-manrope text-3xl sm:text-4xl font-black text-amber-400 tracking-tight tabular-nums drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">
                                                            {prices.total} ₽
                                                        </span>
                                                        {prices.originalTotal && (
                                                            <span className="line-through text-zinc-500 text-sm font-semibold tabular-nums">
                                                                {prices.originalTotal} ₽
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                                        {prices.badgeText && (
                                                            <span className="bg-amber-400/15 border border-amber-400/30 text-amber-300 font-manrope font-bold text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                                                ⚡ {prices.badgeText}
                                                            </span>
                                                        )}
                                                        {prices.savings && (
                                                            <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">
                                                                Экономия {prices.savings} ₽
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Features Bullet List */}
                                                <ul className="space-y-3 mb-6">
                                                    {program.features.map((feat, i) => (
                                                        <li key={i} className="flex items-start gap-3 text-zinc-200 font-manrope text-xs sm:text-sm leading-relaxed">
                                                            <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/40 mt-0.5 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                                                                <Check size={10} className="text-amber-400" />
                                                            </div>
                                                            <span>{feat}</span>
                                                        </li>
                                                    ))}
                                                    {/* Parent Guarantee Bullet */}
                                                    <li className="flex items-center gap-2.5 text-emerald-400 font-manrope text-xs font-bold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                                                        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                                        <span>100% заморозка при болезни (занятия не сгорают)</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            {/* Action Button & Trust Microtext */}
                                            <div className="pt-4 border-t border-white/10">
                                                {isPurchased ? (
                                                    <div className="space-y-2">
                                                        <Button
                                                            className="w-full group py-3.5 rounded-2xl bg-amber-400 text-black font-extrabold hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                                                            onClick={() => onOpenMembership(program, 'renew')}
                                                        >
                                                            <span>Продлить абонемент</span>
                                                            <RefreshCw className="ml-2 group-hover:rotate-180 transition-transform duration-500" size={16} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <Button
                                                            variant={isFeatured ? "primary" : "outline"}
                                                            className={`w-full group py-3.5 rounded-2xl font-black text-sm transition-all duration-300 ${
                                                                isFeatured
                                                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.5)] border-none'
                                                                    : 'border-white/20 hover:border-amber-400 group-hover:bg-amber-400 group-hover:text-black'
                                                            }`}
                                                            onClick={() => onOpenMembership(program, 'purchase')}
                                                        >
                                                            <span>Забронировать абонемент</span>
                                                            <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                                        </Button>
                                                        <p className="text-[10px] text-center font-manrope text-zinc-400">
                                                            🔒 100% Заморозка при болезни • Абонементы возврату не подлежат
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Subscription Guarantee Banner */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-14 text-center max-w-2xl mx-auto"
                >
                    <div className="inline-flex items-center gap-3 p-5 md:p-6 rounded-3xl bg-white/[0.04] border border-sparta-gold/30 backdrop-blur-md shadow-[0_0_25px_rgba(212,175,55,0.15)] text-left">
                        <ShieldCheck className="w-7 h-7 text-sparta-gold shrink-0" />
                        <p className="text-white/90 text-xs md:text-sm font-manrope font-medium leading-relaxed">
                            <span className="text-sparta-gold font-bold">100% Забота о здоровье & Правила клуба:</span> При болезни ребенка тренировки не сгорают! Бесплатная заморозка абонемента и перенос занятий по медицинскому подтверждению. Активированные абонементы возврату не подлежат.
                        </p>
                    </div>
                </motion.div>
            </Container>
        </section>
    );
};

const Team = () => {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "coaches"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Coach[];

            setCoaches(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fallback: If DB is empty, show default coaches. If DB has data, show DB data.
    const displayCoaches = (loading || coaches.length === 0) ? COACHES : coaches;

    return (
        <section id="team" className="py-24 bg-gradient-to-b from-transparent to-black/50">
            <Container>
                <SectionHeader title="НАША КОМАНДА" />

                <div className="flex flex-wrap justify-center gap-12">
                    {displayCoaches.map((coach, idx) => (
                        <motion.div
                            key={coach.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="group flex flex-col items-center text-center"
                        >
                            <div className="relative mb-6">
                                <div className="w-48 h-48 rounded-full p-1 bg-gradient-to-br from-sparta-gold to-transparent">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-black">
                                        <img
                                            src={coach.image}
                                            alt={coach.name}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                </div>
                            </div>
                            <h4 className="font-manrope font-bold text-lg text-white group-hover:text-sparta-gold transition-colors">{coach.name}</h4>
                            <p className="font-manrope text-white/70 text-sm font-medium mt-0.5">{coach.role}</p>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section >
    );
};

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-24">
            <Container className="max-w-3xl">
                <SectionHeader title="ВОПРОСЫ" subtitle="Ответы на популярные вопросы о вашем пути." />

                <div className="space-y-4">
                    {FAQS.map((faq, idx) => (
                        <motion.div
                            key={faq.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="rounded-[24px] bg-white/5 border border-white/10 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-white/5 transition-colors"
                            >
                                <span className="font-manrope font-semibold text-lg text-white">{faq.question}</span>
                                <ChevronDown
                                    className={`text-sparta-gold transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`}
                                />
                            </button>
                            <AnimatePresence>
                                {openIndex === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-6 pt-0 text-white/60 font-manrope leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

const Footer = ({ onOpenTerms, onOpenContact }: { onOpenTerms: () => void, onOpenContact: () => void }) => {
    return (
        <footer className="bg-[#020202] pt-24 pb-12 border-t border-white/5 relative overflow-hidden">
            {/* Subtle glow at footer bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-sparta-gold/5 blur-[80px]" />

            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <div className="mb-6">
                            <img src="/sparta-logo.png" alt="SPARTA" className="h-16 w-auto object-contain" />
                        </div>
                        <p className="font-manrope text-white/50 max-w-md mb-8">
                            Конечный пункт назначения для чемпионов. Присоединяйтесь к сообществу, стремящемуся к величию.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://vk.com/sparta_fk" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#0077FF] hover:scale-110 hover:shadow-[0_0_15px_rgba(0,119,255,0.4)] transition-all duration-300 group">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M13.162 18.994c.609 0 .858-.406.851-.915-.013-.384 0-1.067 0-1.067.7 0 1.334.248 1.83.612.492.358 1.246 1.103 1.246 1.103.522.38 1.144.267 1.144.267h2.162s.874-.031.54-.741c-.02-.046-.421-.837-2.144-2.316-1.571-1.341-1.366-1.124-.349-2.392 1.012-1.258 2.219-3.13 2.219-3.13.25-.395.148-.718-.148-.718h-2.164c-.251 0-.465.114-.582.327 0 0-1.102 2.766-2.583 4.545-.482.576-.7.76-.957.76-.129 0-.316-.184-.316-.71V9.22c0-.528-.153-.718-.6-.718h-3.39c-.156 0-.314.07-.468.148-.306.155-.544.5-.327.528.274.035.892.16 1.14 1 .306.815.251 2.651.251 2.651s.055.684-.11 1.055c-.113.253-.331.328-.564.328-.483 0-1.666-1.516-2.336-3.235-.24-.62-.435-1.291-.435-1.291-.07-.251-.252-.321-.504-.321H4.334c-.251 0-.306.114-.306.241 0 .226.29.957 1.346 2.457 1.761 2.493 3.65 4.606 7.788 4.606v.003z" />
                                </svg>
                            </a>
                            <a href="https://vk.com/sparta_fk" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#2AABEE] hover:text-white transition-all group" title="ВКонтакте / Telegram">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-[-2px]">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-russo text-lg text-white mb-6">Разделы</h3>
                        <ul className="space-y-4 font-manrope text-white/50">
                            <li><a href="#about" className="hover:text-sparta-gold transition-colors">О нас</a></li>
                            <li><a href="#child-benefits" className="hover:text-sparta-gold transition-colors">Программы</a></li>
                            <li><a href="#schedule" className="hover:text-sparta-gold transition-colors">Расписание</a></li>
                            <li><a href="#reviews" className="hover:text-sparta-gold transition-colors">Отзывы</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-russo text-lg text-white mb-6">Контакты</h4>
                        <ul className="space-y-4 font-manrope text-white/50">
                            <li className="flex items-start gap-3">
                                <MapPin className="text-sparta-gold shrink-0" size={20} />
                                <a
                                    href="https://2gis.ru/chelyabinsk/firm/70000001038666964/tab/reviews?m=61.284612%2C55.168134%2F16"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-sparta-gold transition-colors"
                                >
                                    ОЦ "Ньютон", <br />ул. 250-летия Челябинска, 46
                                </a>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone className="text-sparta-gold shrink-0 mt-1" size={20} />
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-white hover:text-sparta-gold transition-colors whitespace-nowrap">+7 (351) 230-12-69</span>
                                        <span className="text-xs text-white/30">Администратор</span>
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-white hover:text-sparta-gold transition-colors whitespace-nowrap">+7 (919) 339-33-99</span>
                                        <span className="text-xs text-white/30">Директор</span>
                                    </div>
                                </div>
                            </li>
                            <li className="pt-2">
                                <button
                                    onClick={onOpenContact}
                                    className="flex items-center gap-2 text-sm text-sparta-gold hover:text-white transition-colors group"
                                >
                                    <Mail size={16} />
                                    <span className="border-b border-sparta-gold/30 group-hover:border-white/30">Связаться с администратором</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center text-white/30 text-sm font-manrope gap-6">
                    <div>
                        <p className="mb-2">© {new Date().getFullYear()} Спарта Центр Спортивной Подготовки. Все права защищены.</p>
                        <p className="text-xs text-white/20">ИП ЛЕБЕДЕВА КСЕНИЯ АЛЕКСАНДРОВНА | ИНН: 742004340856 | ОГРНИП: 319745600067121</p>
                    </div>
                    <div className="flex gap-6 flex-wrap justify-start md:justify-end">
                        <Link to="/legal/education-info" className="hover:text-white transition-colors border-b border-white/10 pb-0.5">
                            Сведения об образовательной организации
                        </Link>
                        <Link to="/legal/requisites" className="hover:text-white transition-colors">Реквизиты</Link>
                        <Link to="/legal/public-offer" className="hover:text-white transition-colors">Оферта</Link>
                        <a href="#" onClick={(e) => { e.preventDefault(); onOpenTerms(); }} className="hover:text-white transition-colors">Политика</a>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

const STAFF_ROLES = ['admin', 'director', 'developer', 'coach', 'parent'];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isTrialOpen, setIsTrialOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    const [isProductSetupOpen, setIsProductSetupOpen] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isMembershipOpen, setIsMembershipOpen] = useState(false);
    const [membershipMode, setMembershipMode] = useState<'purchase' | 'renew' | 'upgrade'>('purchase');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [selectedRouteLocationId, setSelectedRouteLocationId] = useState<string>('newton');

    const openRouteModal = (locationId?: string) => {
        if (locationId) setSelectedRouteLocationId(locationId);
        setIsRouteModalOpen(true);
    };

    const [duration, setDuration] = useState<1 | 3 | 6 | 12>(1);
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);

    const { user, userProfile, requestedGroupIds } = useAuth();
    const { allLocations } = useCity();

    const isStaff = userProfile?.role && STAFF_ROLES.includes(userProfile.role);

    // Handle payment redirects from Robokassa
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.has('InvId') && queryParams.has('OutSum')) {
            console.log("Payment detected on home page, redirecting to dashboard...");
            window.location.replace(`/dashboard${window.location.search}`);
        }
    }, []);

    const getPriceDisplay = (program: Program | null) => {
        if (!program) return { total: 0, monthly: 0 };
        const priceMap = program.prices || {};
        const total = priceMap[duration] || 0;
        const monthly = Math.round(total / duration);
        return {
            monthly: monthly.toLocaleString('ru-RU'),
            total: total.toLocaleString('ru-RU')
        };
    };

    const handleAuthSuccess = async () => {
        setIsAuthOpen(false);
        navigate('/dashboard');
    };


    const handleJoinClick = (group?: Group) => {
        if (group) {
            setSelectedGroup({ id: group.id, name: group.name });
        } else {
            setSelectedGroup(null);
        }

        setIsWizardOpen(true);
    };

    return (
        <div className="bg-sparta-black min-h-screen text-white font-manrope overflow-hidden relative selection:bg-sparta-gold selection:text-black">
            <SEO 
                title="Футбольная школа SPARTA в Челябинске | Профессиональная подготовка детей"
                description="Детская футбольная школа SPARTA в Челябинске. Профессиональная подготовка от первых тренировок до соревнований. 3 филиала, бесплатное пробное занятие."
                keywords="футбольная школа челябинск, детская футбольная школа, футбол для детей челябинск, секция футбола, спарта челябинск"
                ogImage="https://sparta-sports-center.vercel.app/logo-og.png"
                ogUrl="https://sparta-sports-center.vercel.app/"
            />

            {/* Structured Data for SEO */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "SportsActivityLocation",
                    "name": "SPARTA Football Club",
                    "image": "https://sparta-sports-center.vercel.app/sparta-logo.png",
                    "@id": "https://sparta-sports-center.vercel.app",
                    "url": "https://sparta-sports-center.vercel.app",
                    "telephone": "+73512301269",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "ул. 250-летия Челябинска, 46",
                        "addressLocality": "Челябинск",
                        "postalCode": "454000",
                        "addressCountry": "RU"
                    },
                    "geo": {
                        "@type": "GeoCoordinates",
                        "latitude": 55.168134,
                        "longitude": 61.284612
                    },
                    "department": [
                        {
                            "@type": "SportsActivityLocation",
                            "name": "SPARTA — ОЦ Ньютон",
                            "address": "ул. 250-летия Челябинска, 46, Челябинск"
                        },
                        {
                            "@type": "SportsActivityLocation",
                            "name": "SPARTA — ЧТЗ",
                            "address": "ул. Карпенко, 5Б, Челябинск"
                        },
                        {
                            "@type": "SportsActivityLocation",
                            "name": "SPARTA — Гагарин Парк",
                            "address": "ул. Труда, 183, 4 этаж, Челябинск"
                        },
                        {
                            "@type": "SportsActivityLocation",
                            "name": "SPARTA — L-Town",
                            "address": "пос. L-Town, Челябинская область"
                        }
                    ],
                    "openingHoursSpecification": {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday"
                        ],
                        "opens": "00:00",
                        "closes": "23:59"
                    },
                    "sameAs": [
                        "https://vk.com/sparta_fk"
                    ]
                })}
            </script>

            <Navbar
                onOpenTrial={handleJoinClick}
                onOpenAuth={() => setIsAuthOpen(true)}
            />
            <main>
                {/* Hero Section - Stadium Entrance */}
                <div className="bg-hero-bg bg-fixed bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/60 pointer-events-none z-0"></div>
                    <div className="relative z-10">
                        <Hero onOpenTrial={handleJoinClick} onOpenRoute={() => openRouteModal()} />
                        <Marquee />
                    </div>
                </div>

                {/* CHILD BENEFITS SECTION */}
                <ChildBenefitsSection onOpenTrial={handleJoinClick} />

                {/* WHY US POSITIONING SECTION */}
                <WhyUsPositioningSection />

                {/* WHY US with custom bg */}
                <div className="relative bg-why-us-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/85 z-0"></div>
                    <div className="relative z-10">
                        <WhyUs />
                    </div>
                </div>

                {/* GROUPS LIST SECTION */}
                <GroupsSection onJoinClick={handleJoinClick} />

                {/* SEGMENTED SUBSCRIPTIONS & TARIFFS SHOWCASE */}
                <div id="tariffs" className="relative bg-programs-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/85 z-0"></div>
                    <div className="relative z-10">
                        <SubscriptionsShowcase
                            onSelectPlan={(plan, chosenPeriod = 1) => {
                                setSelectedProgram(plan as any);
                                setDuration(chosenPeriod as any);
                                setMembershipMode('purchase');
                                setIsMembershipOpen(true);
                            }}
                        />
                    </div>
                </div>

                {/* SCHEDULE SECTION */}
                <ScheduleSection />

                {/* TEAM with custom bg */}
                <div className="relative bg-team-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/80 z-0"></div>
                    <div className="relative z-10">
                        <Team />
                    </div>
                    {/* Smooth transition to News */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
                </div>

                {/* REVIEWS SECTION */}
                <ReviewsSection onOpenReview={() => {
                    if (!auth.currentUser) {
                        setIsAuthOpen(true);
                    } else {
                        setIsReviewModalOpen(true);
                    }
                }} />

                {/* NEWS SECTION */}
                <NewsSection />

                {/* FAQ with custom bg */}
                <div className="relative bg-faq-bg bg-cover bg-center bg-fixed">
                    <div className="absolute inset-0 bg-black/85 z-0"></div>
                    <div className="relative z-10">
                        <FAQ />
                    </div>
                </div>
            </main>
            <Footer onOpenTerms={() => setIsTermsOpen(true)} onOpenContact={() => setIsContactOpen(true)} />
            <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

            <LeaveReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} />
            <TrialModal isOpen={isTrialOpen} onClose={() => setIsTrialOpen(false)} selectedGroup={selectedGroup} />
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} />

            <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
            <MembershipModal
                isOpen={isMembershipOpen}
                onClose={() => setIsMembershipOpen(false)}
                program={selectedProgram}
                duration={duration}
                price={selectedProgram?.prices?.[duration] || 0}
                mode={membershipMode}
                onOpenAuth={() => setIsAuthOpen(true)}
            />

            <RouteModal
                isOpen={isRouteModalOpen}
                onClose={() => setIsRouteModalOpen(false)}
                initialLocationId={selectedRouteLocationId}
                locations={allLocations}
            />

            <AnimatePresence>
                {isWizardOpen && (
                    <SmartEnrollmentWizard
                        key="sparta-enrollment-wizard-modal"
                        user={(user || auth.currentUser) ? {
                            uid: (user || auth.currentUser)?.uid || '',
                            email: (user || auth.currentUser)?.email || '',
                            displayName: (user || auth.currentUser)?.displayName || '',
                            ...userProfile
                        } : null}
                        selectedGroup={selectedGroup}
                        onComplete={() => {
                            sessionStorage.removeItem('sparta_wizard_step');
                            setIsWizardOpen(false);
                        }}
                        onContactLink={() => setIsContactOpen(true)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
