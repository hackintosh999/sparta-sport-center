import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Flame, ArrowRight, Zap, ShieldCheck, Calendar, Clock } from 'lucide-react';
import { SubscriptionPlan } from '../types/subscription';
import { DEFAULT_SUBSCRIPTION_PLANS } from '../constants/spartaSubscriptions';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface SubscriptionsShowcaseProps {
    onSelectPlan: (plan: SubscriptionPlan, chosenPeriod?: number) => void;
}

type PeriodMonths = 1 | 3 | 6 | 12;

interface PeriodOption {
    months: PeriodMonths;
    label: string;
    discountPercent: number;
    badge?: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
    { months: 1, label: '1 месяц', discountPercent: 0 },
    { months: 3, label: '3 месяца', discountPercent: 10, badge: '-10%' },
    { months: 6, label: '6 месяцев', discountPercent: 15, badge: '-15%' },
    { months: 12, label: '12 месяцев', discountPercent: 20, badge: '🔥 -20%' },
];

export const SubscriptionsShowcase: React.FC<SubscriptionsShowcaseProps> = ({ onSelectPlan }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodMonths>(1);
    const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);

    useEffect(() => {
        try {
            const q = query(collection(db, 'subscription_plans'), where('isActive', '!=', false));
            const unsub = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const dbPlans = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SubscriptionPlan[];
                    dbPlans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.price - b.price);
                    if (dbPlans.length >= 3) {
                        setPlans(dbPlans.slice(0, 3));
                    } else {
                        setPlans(DEFAULT_SUBSCRIPTION_PLANS);
                    }
                } else {
                    setPlans(DEFAULT_SUBSCRIPTION_PLANS);
                }
            }, (err) => {
                console.warn('Firestore subscription plans fallback:', err);
                setPlans(DEFAULT_SUBSCRIPTION_PLANS);
            });
            return () => unsub();
        } catch (e) {
            setPlans(DEFAULT_SUBSCRIPTION_PLANS);
        }
    }, []);

    // Helper to calculate pricing based on period
    const getPlanPeriodData = (plan: SubscriptionPlan, period: PeriodMonths) => {
        const baseMonthlyPrice = plan.price || 5200;
        const discountMultiplier = period === 1 ? 1 : period === 3 ? 0.9 : period === 6 ? 0.85 : 0.8;
        
        const rawPeriodPrice = Math.round(baseMonthlyPrice * period * discountMultiplier);
        // Round to neat 10s
        const finalPrice = Math.round(rawPeriodPrice / 10) * 10;
        const fullPriceWithoutDiscount = baseMonthlyPrice * period;

        // Calculate sessions count for the period
        let sessionsLabel = '';
        let totalSessionsCount = 8 * period;
        let bullets: string[] = [];

        if (plan.id?.includes('base') || plan.title?.toLowerCase().includes('базов')) {
            totalSessionsCount = 8 * period;
            sessionsLabel = `${totalSessionsCount} тренировок • 2 раза в неделю`;
            bullets = [
                'Основы техники, моторика и координация',
                'Дневник юного футболиста в подарок',
                'Перенос по справке 100%'
            ];
        } else if (plan.id?.includes('intensiv') || plan.title?.toLowerCase().includes('интенсив')) {
            totalSessionsCount = 12 * period;
            sessionsLabel = `${totalSessionsCount} тренировок • 3 раза в неделю`;
            bullets = [
                'Тактика, техника, удары и участие в матчах',
                'Скидка 15% на экипировку в магазине',
                'Игровая практика и турниры'
            ];
        } else {
            // Premium: 12 group + 2 individual per month
            const groupCount = 12 * period;
            const indCount = 2 * period;
            totalSessionsCount = groupCount + indCount;
            sessionsLabel = `${groupCount} групповых + ${indCount} инд. занятий`;
            bullets = [
                'Персональный наставник 1 на 1',
                'Скидка 25% в магазине + аксессуар в подарок',
                'Приоритетный выбор времени и заморозка'
            ];
        }

        const perSession = Math.round(finalPrice / totalSessionsCount);

        return {
            finalPrice,
            fullPriceWithoutDiscount: period > 1 ? fullPriceWithoutDiscount : undefined,
            perSession,
            sessionsLabel,
            bullets,
            totalSessionsCount
        };
    };

    const handleSelect = (plan: SubscriptionPlan) => {
        const periodData = getPlanPeriodData(plan, selectedPeriod);
        const dynamicPlan: SubscriptionPlan = {
            ...plan,
            price: periodData.finalPrice,
            oldPrice: periodData.fullPriceWithoutDiscount,
            totalSessions: periodData.totalSessionsCount,
            perSessionPrice: periodData.perSession,
            validityDays: selectedPeriod * 30,
            features: periodData.bullets
        };
        onSelectPlan(dynamicPlan, selectedPeriod);
    };

    return (
        <section id="tariffs" className="py-16 sm:py-24 relative overflow-hidden font-manrope">
            {/* Direct Anchor for #programs navbar link */}
            <div id="programs" className="absolute -top-24 left-0 pointer-events-none" />

            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-sparta-gold/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sparta-gold/10 border border-sparta-gold/30 text-sparta-gold text-xs uppercase tracking-widest font-black mb-4 shadow-sm">
                        <Sparkles size={14} className="animate-pulse" />
                        Абонементы футбольной школы
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-russo text-white uppercase tracking-wider mb-4">
                        Тарифы обучения
                    </h2>
                    <p className="text-white/80 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                        Выберите подходящий период абонемента со скидкой до 20% и гарантией 100% переноса занятий по справке.
                    </p>
                </div>

                {/* 1. Period Selector Switcher (Tabs / Segmented Control) */}
                <div className="max-w-xl mx-auto mb-12 sm:mb-16">
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl sm:rounded-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 shadow-2xl">
                        {PERIOD_OPTIONS.map((option) => {
                            const isSelected = selectedPeriod === option.months;
                            return (
                                <button
                                    key={option.months}
                                    type="button"
                                    onClick={() => setSelectedPeriod(option.months)}
                                    className={`relative min-h-[48px] py-3 px-3 rounded-xl sm:rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer select-none ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-sparta-gold to-yellow-500 text-black shadow-lg shadow-sparta-gold/25 font-black scale-[1.02]'
                                            : 'text-white/70 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>{option.label}</span>
                                    {option.badge && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black tracking-normal leading-tight ${
                                            isSelected
                                                ? 'bg-black/20 text-black'
                                                : 'bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30'
                                        }`}>
                                            {option.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. 3 Dynamic Recalculated Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
                    {plans.map((plan, idx) => {
                        const isPopular = plan.isPopular || idx === 1;
                        const data = getPlanPeriodData(plan, selectedPeriod);

                        return (
                            <motion.div
                                key={plan.id || idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: idx * 0.1 }}
                                className={`relative flex flex-col rounded-3xl transition-all duration-300 ${
                                    isPopular
                                        ? 'bg-gradient-to-b from-zinc-800/95 via-zinc-900/95 to-black border-2 border-sparta-gold shadow-2xl shadow-sparta-gold/20 md:-translate-y-2'
                                        : 'bg-zinc-900/80 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-xl'
                                }`}
                            >
                                {/* Featured Ribbon for Intensiv */}
                                {isPopular && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-sparta-gold to-yellow-500 text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg whitespace-nowrap">
                                        <Flame size={13} className="fill-black" />
                                        <span>Выбор большинства</span>
                                    </div>
                                )}

                                <div className="p-6 sm:p-8 flex flex-col h-full">
                                    {/* Plan Title & Dynamic Sessions Info */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="text-2xl font-russo text-white uppercase tracking-wide">
                                                {plan.title}
                                            </h3>
                                            {!isPopular && plan.badge && (
                                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-sparta-gold border border-sparta-gold/30">
                                                    {plan.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-sparta-gold font-bold flex items-center gap-1.5">
                                            <Clock size={12} className="text-sparta-gold shrink-0" />
                                            <span>{data.sessionsLabel}</span>
                                        </p>
                                    </div>

                                    {/* Dynamic Pricing Display */}
                                    <div className="py-4 border-y border-white/10 my-2">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl sm:text-4xl font-russo text-white tracking-tight">
                                                {data.finalPrice.toLocaleString('ru-RU')} ₽
                                            </span>
                                            {data.fullPriceWithoutDiscount && (
                                                <span className="text-sm text-white/30 line-through font-bold">
                                                    {data.fullPriceWithoutDiscount.toLocaleString('ru-RU')} ₽
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs">
                                            <span className="text-white/40 font-medium">
                                                за {selectedPeriod === 1 ? '1 месяц' : `${selectedPeriod} месяца`}
                                            </span>
                                            <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                                                100% перенос по справке
                                            </span>
                                        </div>
                                    </div>

                                    {/* Clean Feature List (3 key bullets) */}
                                    <div className="space-y-3.5 my-6 flex-1">
                                        {data.bullets.map((feature, fIdx) => (
                                            <div key={fIdx} className="flex items-start gap-3 text-xs sm:text-sm text-white/85 leading-relaxed">
                                                <div className={`p-1 rounded-full mt-0.5 shrink-0 ${
                                                    isPopular ? 'bg-sparta-gold/20 text-sparta-gold' : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bottom Info Pill: Calculated Per Session */}
                                    <div className="mb-4 text-center">
                                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold w-full">
                                            <Zap size={13} className="text-sparta-gold" />
                                            <span>от {data.perSession.toLocaleString('ru-RU')} ₽ / занятие</span>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => handleSelect(plan)}
                                        className={`w-full min-h-[48px] py-3.5 sm:py-4 rounded-2xl font-russo uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer ${
                                            isPopular
                                                ? 'bg-gradient-to-r from-amber-400 via-sparta-gold to-yellow-500 text-black font-black hover:brightness-110 shadow-lg shadow-sparta-gold/25'
                                                : 'bg-white/10 hover:bg-sparta-gold hover:text-black text-white font-bold border border-white/10 hover:border-transparent'
                                        }`}
                                    >
                                        <span>Выбрать абонемент</span>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default SubscriptionsShowcase;
