import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Flame, Users, Sparkles, CheckCircle2, Award, ArrowRight, Zap } from 'lucide-react';
import { Container, SectionHeader } from './UIComponents';

type AgeGroup = '4-7' | '8-12' | '13-14';

interface BenefitItem {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    badge: string;
    bgNumber: string;
    tags: string[];
    checklist: string[];
    isFeatured?: boolean;
}

const BENEFITS_BY_AGE: Record<AgeGroup, BenefitItem[]> = {
    '4-7': [
        {
            id: 'health-4-7',
            icon: <Flame className="w-6 h-6 text-amber-400" />,
            title: 'Физическое развитие & Игровая адаптация',
            description: 'Формирование идеальной осанки, координации движений и моторики через увлекательные упражнения.',
            badge: 'Раннее развитие',
            bgNumber: '01',
            tags: ['Координация', 'Ловкость', 'Осанка'],
            checklist: [
                'Игровая методика развития внимания и реакций',
                'Профилактика плоскостопия и искривлений',
                'Мягкая адаптация к коллективу без стресса',
            ],
            isFeatured: true,
        },
        {
            id: 'discipline-4-7',
            icon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
            title: 'Дисциплина через игру',
            description: 'Первые навыки самостоятельности, умение слушать наставника и выполнять спортивные правила.',
            badge: 'Характер',
            bgNumber: '02',
            tags: ['Дисциплина', 'Самоконтроль', 'Режим'],
            checklist: [
                'Приучение к спортивному порядку',
                'Удержание фокуса на заданиях',
                'Уважение к тренеру и команде',
            ],
        },
        {
            id: 'social-4-7',
            icon: <Users className="w-6 h-6 text-amber-400" />,
            title: 'Дружба & Общение',
            description: 'Помогаем победить стеснительность, завести верных друзей и получить эмоции от спорта.',
            badge: 'Социализация',
            bgNumber: '03',
            tags: ['Команда', 'Дружба', 'Лидерство'],
            checklist: [
                'Преодоление страхов и стеснения',
                'Первый опыт работы в команде',
                'Радость от личных побед и успехов',
            ],
        },
    ],
    '8-12': [
        {
            id: 'health-8-12',
            icon: <Flame className="w-6 h-6 text-amber-400" />,
            title: 'Атлетическая форма & Скорость',
            description: 'Укрепление мышечного корсета, развитие выносливости, моторики и компенсация учебных нагрузок.',
            badge: 'Фундамент формы',
            bgNumber: '01',
            tags: ['Скорость', 'Выносливость', 'Сила'],
            checklist: [
                'Развитие скоростно-силовых качеств',
                'Снятие зажимов от школьного портфеля и парт',
                'Формирование привычки к активности',
            ],
            isFeatured: true,
        },
        {
            id: 'discipline-8-12',
            icon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
            title: 'Характер & Самоконтроль',
            description: 'Воспитание спортивного трудолюбия, воли к победе и умения брать ответственность за свой результат.',
            badge: 'Характер',
            bgNumber: '02',
            tags: ['Трудолюбие', 'Целеполагание', 'Воля'],
            checklist: [
                'Спортивный режим и пунктуальность',
                'Умение исправлять собственные ошибки',
                'Эмоциональный самоконтроль в игре',
            ],
        },
        {
            id: 'social-8-12',
            icon: <Users className="w-6 h-6 text-amber-400" />,
            title: 'Командный дух & Лидерство',
            description: 'Развитие коммуникации, поддержка партнеров на поле и проявление лидерских качеств.',
            badge: 'Социализация',
            bgNumber: '03',
            tags: ['Взаимовыручка', 'Общение', 'Уважение'],
            checklist: [
                'Круг сильных мотивированных друзей',
                'Взаимовыручка в сложные моменты',
                'Уважение к соперникам и правилам',
            ],
        },
    ],
    '13-14': [
        {
            id: 'health-13-14',
            icon: <Flame className="w-6 h-6 text-amber-400" />,
            title: 'Атлетизм & Игровая Подготовка',
            description: 'Профессиональная физическая форма, подготовка к разрядам, турнирам и интенсивным нагрузкам.',
            badge: 'Про-уровень',
            bgNumber: '01',
            tags: ['Атлетизм', 'Разряды', 'Форма'],
            checklist: [
                'Формирование подтянутого рельефного тела',
                'Разгрузка от экзаменационных стрессов',
                'Готовность к спортивным турнирам',
            ],
            isFeatured: true,
        },
        {
            id: 'discipline-13-14',
            icon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
            title: 'Целеустремленность & Фокус',
            description: 'Умение ставить личные цели, управлять эмоциями под давлением и распределять время.',
            badge: 'Характер',
            bgNumber: '02',
            tags: ['Фокус', 'Стойкость', 'Тайм-менеджмент'],
            checklist: [
                'Тайм-менеджмент: спорт и учеба',
                'Психологическая стойкость в игре',
                'Уверенность в любых ситуациях',
            ],
        },
        {
            id: 'social-13-14',
            icon: <Users className="w-6 h-6 text-amber-400" />,
            title: 'Лидерство & Наставничество',
            description: 'Зрелая позиция в коллективе, умение вести команду за собой и работать на общий результат.',
            badge: 'Социализация',
            bgNumber: '03',
            tags: ['Наставничество', 'Команда', 'Зрелость'],
            checklist: [
                'Проявление характера на поле',
                'Сильное окружение единомышленников',
                'Навыки командного лидерства',
            ],
        },
    ],
};

interface ChildBenefitsSectionProps {
    onOpenTrial?: () => void;
}

export const ChildBenefitsSection: React.FC<ChildBenefitsSectionProps> = ({ onOpenTrial }) => {
    const [selectedAge, setSelectedAge] = useState<AgeGroup>('8-12');

    const ageTabs: { key: AgeGroup; label: string; sub: string }[] = [
        { key: '4-7', label: '4–7 лет', sub: 'Раннее развитие' },
        { key: '8-12', label: '8–12 лет', sub: 'Базовая подготовка' },
        { key: '13-14', label: '13–14 лет', sub: 'Продвинутый уровень' },
    ];

    const currentBenefits = BENEFITS_BY_AGE[selectedAge];

    return (
        <section id="child-benefits" className="pt-24 md:pt-44 pb-16 md:pb-20 relative overflow-hidden bg-sparta-dark/90 scroll-mt-24">
            {/* Background Ambient Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-sparta-gold/10 rounded-full blur-[130px] pointer-events-none" />

            <Container className="relative z-10">
                <SectionHeader
                    title="РЕЗУЛЬТАТЫ ТРЕНИРОВОК"
                    subtitle="Конкретные изменения в характере, физической форме и дисциплине вашего ребенка уже через 3 месяца."
                    showDot={false}
                />

                {/* Age Group Selector Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md max-w-full overflow-x-auto no-scrollbar">
                        {ageTabs.map((tab) => {
                            const isActive = selectedAge === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setSelectedAge(tab.key)}
                                    className={`relative px-4 py-2 rounded-xl font-manrope transition-all duration-300 flex flex-col items-center min-w-[110px] md:min-w-[130px] ${
                                        isActive
                                            ? 'text-sparta-black font-extrabold shadow-[0_2px_15px_rgba(212,175,55,0.3)]'
                                            : 'text-white/60 hover:text-white font-medium'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeAgeTab"
                                            className="absolute inset-0 bg-gold-gradient rounded-xl -z-10"
                                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                        />
                                    )}
                                    <span className="text-xs md:text-sm font-russo tracking-wide">{tab.label}</span>
                                    <span className={`text-[9px] uppercase tracking-wider ${isActive ? 'text-black/80 font-bold' : 'text-white/40'}`}>
                                        {tab.sub}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Compact 3-Column Grid */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedAge}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-6"
                    >
                        {currentBenefits.map((benefit) => (
                            <div
                                key={benefit.id}
                                className={`group relative rounded-2xl p-5 md:p-6 flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                                    benefit.isFeatured
                                        ? 'bg-gradient-to-b from-amber-500/15 via-white/[0.04] to-black/80 border border-sparta-gold/50 shadow-[0_8px_30px_rgba(212,175,55,0.15)] hover:border-sparta-gold'
                                        : 'bg-white/5 backdrop-blur-xl border border-white/10 hover:border-sparta-gold/40 hover:bg-white/[0.08]'
                                }`}
                            >
                                {/* Background Accent Number in Top Right */}
                                <span className="absolute top-2 right-3 font-russo text-6xl md:text-7xl text-white/[0.06] group-hover:text-sparta-gold/20 transition-colors select-none pointer-events-none z-0">
                                    {benefit.bgNumber}
                                </span>

                                <div className="relative z-10">
                                    {/* Header Icon + Title */}
                                    <div className="flex items-start gap-3 mb-3 pr-12">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                            benefit.isFeatured
                                                ? 'bg-amber-500/20 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                                : 'bg-white/5 border border-white/15'
                                        }`}>
                                            {benefit.icon}
                                        </div>
                                        <div>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sparta-gold px-2 py-0.5 rounded-md bg-sparta-gold/10 border border-sparta-gold/20 mb-1">
                                                <Sparkles className="w-2.5 h-2.5 text-sparta-gold" /> {benefit.badge}
                                            </span>
                                            <h3 className="font-russo text-base md:text-lg text-white group-hover:text-sparta-gold transition-colors leading-snug">
                                                {benefit.title}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Short Description */}
                                    <p className="font-manrope text-white/75 text-xs md:text-sm leading-relaxed mb-4">
                                        {benefit.description}
                                    </p>

                                    {/* High-Contrast Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {benefit.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-white/90 group-hover:border-sparta-gold/40 group-hover:bg-sparta-gold/15 transition-colors"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Checklist */}
                                    <div className="space-y-2 pt-3 border-t border-white/10 relative z-10">
                                        {benefit.checklist.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2 text-white/85 text-xs md:text-sm font-manrope">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-sparta-gold shrink-0 mt-0.5" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Clean Footer without Star/Arrow */}
                                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sparta-gold/80 font-manrope relative z-10">
                                    <span>{benefit.isFeatured ? 'Результат Sparta' : 'Воспитание личности'}</span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {/* BOTTOM GUARANTEE & CTA BANNER */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="relative rounded-2xl bg-gradient-to-r from-amber-500/10 via-black/90 to-sparta-gold/15 border border-sparta-gold/30 p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg overflow-hidden"
                >
                    <div className="flex items-center gap-3.5 text-left">
                        <div className="w-11 h-11 rounded-xl bg-gold-gradient text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-sparta-gold">
                                <Zap className="w-3 h-3 fill-sparta-gold" /> 95% родителей рекомендуют Sparta
                            </div>
                            <h4 className="font-russo text-sm md:text-base text-white leading-snug">
                                Первое пробное занятие — бесплатно
                            </h4>
                            <p className="font-manrope text-white/60 text-xs mt-0.5">
                                Оцените атмосферу и тренерский подход уже на первой тренировке.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onOpenTrial}
                        className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gold-gradient text-black font-russo font-bold text-xs md:text-sm uppercase tracking-wider hover:brightness-110 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] active:scale-95 transition-all duration-300 flex items-center justify-center gap-1.5 group shrink-0"
                    >
                        <span>Записаться бесплатно</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>
            </Container>
        </section>
    );
};

export default ChildBenefitsSection;
