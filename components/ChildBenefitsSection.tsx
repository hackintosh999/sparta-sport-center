import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Flame, Users, CheckCircle2, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';
import { Container, SectionHeader } from './UIComponents';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type AgeGroup = '4-7' | '8-12' | '13-14';

interface BenefitItem {
    id: string;
    icon: React.ReactNode;
    category: string;
    title: string;
    image: string;
    checklist: string[];
    resultText: string;
    isFeatured?: boolean;
}

const BENEFITS_BY_AGE: Record<AgeGroup, BenefitItem[]> = {
    '4-7': [
        {
            id: 'health-4-7',
            icon: <Flame className="w-4 h-4 text-amber-400" />,
            category: 'Физическое развитие',
            title: 'Ловкость & Здоровая осанка',
            image: '/sparta_real_dynamics.jpg',
            checklist: [
                'Игровая гимнастика: профилактика плоскостопия и сутулости',
                'Развитие координации, баланса и быстрой реакции',
                'Здоровая выработка энергии без переутомления',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Крепкое здоровье и правильное развитие тела',
            isFeatured: true,
        },
        {
            id: 'discipline-4-7',
            icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
            category: 'Характер и дисциплина',
            title: 'Самостоятельность & Фокус',
            image: '/sparta_real_award.jpg',
            checklist: [
                'Дисциплина через игру: учим слушать тренера и правила',
                'Удержание внимания на задачах без капризов',
                'Первые привычки аккуратности и спортивного порядка',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Внимательность и самостоятельность дома',
        },
        {
            id: 'social-4-7',
            icon: <Users className="w-4 h-4 text-amber-400" />,
            category: 'Социализация и среда',
            title: 'Адаптация & Первые друзья',
            image: '/sparta_real_huddle.jpg',
            checklist: [
                'Победа над стеснительностью: мягкий вход в коллектив',
                'Радость командных игр и общения со сверстниками',
                'Уверенность в себе при встрече с новыми ребятами',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Общительный ребенок, готовый к садику и школе',
        },
    ],
    '8-12': [
        {
            id: 'health-8-12',
            icon: <Flame className="w-4 h-4 text-amber-400" />,
            category: 'Физическое развитие',
            title: 'Здоровая осанка & Выносливость',
            image: '/sparta_real_dynamics.jpg',
            checklist: [
                'Ровная спина: снимаем зажимы от школьного портфеля и парт',
                'Крепкий мышечный корсет и правильная координация движений',
                'Здоровая альтернатива гаджетам — фокус на активном движении',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Энергичный ребенок с правильной осанкой',
            isFeatured: true,
        },
        {
            id: 'discipline-8-12',
            icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
            category: 'Характер и дисциплина',
            title: 'Самоконтроль & Дисциплина',
            image: '/sparta_real_award.jpg',
            checklist: [
                'Дисциплина без слез: ребенок сам следит за временем и формой',
                'Характер чемпиона: учим достойно принимать неудачи и победы',
                'Внимательность: развитие концентрации внимания на тренировках',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Собранность в учебе и уверенность в себе',
        },
        {
            id: 'social-8-12',
            icon: <Users className="w-4 h-4 text-amber-400" />,
            category: 'Социализация и среда',
            title: 'Командный дух & Дружба',
            image: '/sparta_real_huddle.jpg',
            checklist: [
                'Сильное окружение: ребенок находит верных, активных друзей',
                'Умение работать в команде и поддерживать партнеров в игре',
                'Уважение к правилам, тренеру и границам сверстников',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Умение общаться, дружить и побеждать вместе',
        },
    ],
    '13-14': [
        {
            id: 'health-13-14',
            icon: <Flame className="w-4 h-4 text-amber-400" />,
            category: 'Атлетизм и форма',
            title: 'Атлетизм & Разгрузка от стресса',
            image: '/sparta_real_dynamics.jpg',
            checklist: [
                'Подтянутое тело, сила и скорость для соревнований',
                'Мощная разгрузка от школьных экзаменов и уроков',
                'Профессиональная подготовка к юношеским турнирам',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Спортивное телосложение и выносливость',
            isFeatured: true,
        },
        {
            id: 'discipline-13-14',
            icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
            category: 'Характер и фокус',
            title: 'Психологическая стойкость',
            image: '/sparta_real_award.jpg',
            checklist: [
                'Тайм-менеджмент: умение совмещать спорт и отличную учебу',
                'Хладнокровие и уверенность в стрессовых ситуациях',
                'Умение ставить личные цели и достигать их',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Зрелый характер и целеустремленность',
        },
        {
            id: 'social-13-14',
            icon: <Users className="w-4 h-4 text-amber-400" />,
            category: 'Лидерство и окружение',
            title: 'Лидерство & Сильная команда',
            image: '/sparta_real_huddle.jpg',
            checklist: [
                'Правильное спортивное окружение вместо вредных привычек',
                'Лидерские качества: умение брать ответственность за команду',
                'Уважение среди сверстников и крепкая мужская дружба',
            ],
            resultText: '🎯 РЕЗУЛЬТАТ: Уверенный лидер с правильными ценностями',
        },
    ],
};

interface ChildBenefitsSectionProps {
    onOpenTrial?: () => void;
}

export const ChildBenefitsSection: React.FC<ChildBenefitsSectionProps> = ({ onOpenTrial }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedAge, setSelectedAge] = useState<AgeGroup>('8-12');
    const isEnrolled = !!user;

    const ageTabs: { key: AgeGroup; label: string }[] = [
        { key: '4-7', label: '4–7 лет' },
        { key: '8-12', label: '8–12 лет' },
        { key: '13-14', label: '13–14 лет' },
    ];

    const currentBenefits = BENEFITS_BY_AGE[selectedAge];

    return (
        <section id="child-benefits" className="pt-24 md:pt-36 pb-16 md:pb-20 relative overflow-hidden bg-sparta-dark/90 scroll-mt-24">
            {/* Background Ambient Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-sparta-gold/10 rounded-full blur-[130px] pointer-events-none" />

            <Container className="relative z-10">
                <SectionHeader
                    title="РЕЗУЛЬТАТЫ ТРЕНИРОВОК"
                    subtitle="Конкретные изменения в характере, физической форме и дисциплине вашего ребенка уже через 3 месяца."
                    showDot={false}
                />

                {/* Clean Minimalist Age Tabs */}
                <div className="flex justify-center mb-10">
                    <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 grid grid-cols-3 gap-1.5 w-full max-w-md relative backdrop-blur-md">
                        {ageTabs.map((tab) => {
                            const isActive = selectedAge === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setSelectedAge(tab.key)}
                                    className={`relative py-2.5 px-3 rounded-xl font-manrope text-xs sm:text-sm font-bold transition-all duration-200 z-10 flex items-center justify-center select-none cursor-pointer whitespace-nowrap ${
                                        isActive
                                            ? 'text-black font-extrabold shadow-sm'
                                            : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeAgeTab"
                                            className="absolute inset-0 bg-gold-gradient rounded-xl -z-10 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3-Column Clean Benefits Grid with Emotional Real Photos */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedAge}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8"
                    >
                        {currentBenefits.map((benefit) => (
                            <div
                                key={benefit.id}
                                className={`group relative rounded-2xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                                    benefit.isFeatured
                                        ? 'bg-gradient-to-b from-amber-500/15 via-[#141414] to-black border border-sparta-gold/50 shadow-[0_8px_30px_rgba(212,175,55,0.15)] hover:border-sparta-gold'
                                        : 'bg-[#121212] backdrop-blur-xl border border-white/10 hover:border-sparta-gold/40 hover:bg-[#161616]'
                                }`}
                            >
                                <div>
                                    {/* Cinematic Emotional Photo Cover with Gradient & Floating Badge */}
                                    <div className="relative h-44 sm:h-48 w-full rounded-xl overflow-hidden mb-5 border border-white/10 group-hover:border-sparta-gold/30 transition-all">
                                        <img
                                            src={benefit.image}
                                            alt={benefit.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/25 to-black/10" />

                                        {/* Floating Glassmorphic Category Badge */}
                                        <div className="absolute top-3 left-3 backdrop-blur-md bg-black/75 border border-sparta-gold/35 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-sparta-gold flex items-center gap-1.5 shadow-md">
                                            {benefit.icon}
                                            <span>{benefit.category}</span>
                                        </div>
                                    </div>

                                    {/* Main Title */}
                                    <h3 className="font-russo text-lg md:text-xl text-white group-hover:text-sparta-gold transition-colors leading-snug mb-4">
                                        {benefit.title}
                                    </h3>

                                    {/* Clean Actionable Checklist */}
                                    <ul className="space-y-3 mb-6">
                                        {benefit.checklist.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5 text-white/90 text-xs sm:text-sm font-manrope leading-relaxed">
                                                <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/40 mt-0.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                                </div>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Grounded Result Pill Footer */}
                                <div className="pt-3.5 border-t border-white/10">
                                    <p className="text-xs font-bold text-amber-300/95 font-manrope leading-relaxed">
                                        {benefit.resultText}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* BOTTOM WARM GUEST BANNER */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="relative rounded-2xl bg-gradient-to-r from-amber-500/10 via-black/80 to-sparta-gold/15 border border-sparta-gold/30 p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg overflow-hidden backdrop-blur-md"
                >
                    <div className="flex items-start md:items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-sparta-gold/10 border border-sparta-gold/40 text-sparta-gold flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                            <HeartHandshake className="w-6 h-6 text-sparta-gold" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-md mb-1.5">
                                <Sparkles className="w-3 h-3 text-sparta-gold" />
                                <span>Бережная адаптация & гостеприимство</span>
                            </div>
                            <h4 className="font-russo text-base md:text-lg text-white leading-snug">
                                Первый шаг в футбол — спокойно, бережно и без давления
                            </h4>
                            <p className="font-manrope text-white/70 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                                {isEnrolled
                                    ? 'Ваш ребенок уже в клубе Sparta! Отслеживайте тренировки, достижения и успехи в личном кабинете.'
                                    : 'Познакомьтесь с тренером и манежем. Комплиментарный первый визит ни к чему не обязывает — мы не навязываем звонки и услуги.'}
                            </p>
                        </div>
                    </div>

                    {isEnrolled ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-manrope font-extrabold text-xs sm:text-sm hover:brightness-110 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group shrink-0 cursor-pointer shadow-md"
                        >
                            <span>Личный кабинет</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={onOpenTrial}
                            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black font-manrope font-extrabold text-xs sm:text-sm hover:brightness-110 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group shrink-0 cursor-pointer shadow-md"
                        >
                            <span>Прийти на день знакомства</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    )}
                </motion.div>
            </Container>
        </section>
    );
};

export default ChildBenefitsSection;
