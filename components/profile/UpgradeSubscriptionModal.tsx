import React, { useState } from 'react';
import { 
    X, TrendingUp, Sparkles, 
    Trophy, 
    CreditCard, Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { SubscriptionPlan, SubscriptionStatus } from '../../types/subscription';
import { SPARTA_SUBSCRIPTIONS } from '../../constants/spartaSubscriptions';
import { BaseModal } from '../ui/BaseModal';

interface UpgradeSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeChild: any;
    activeSubscription: any;
    user: any;
    userProfile: any;
    onSuccess?: () => void;
}

export const UpgradeSubscriptionModal: React.FC<UpgradeSubscriptionModalProps> = ({
    isOpen,
    onClose,
    activeChild,
    activeSubscription,
    user,
    userProfile,
    onSuccess
}) => {
    const [isUpgrading, setIsUpgrading] = useState(false);

    // Identify current plan
    const currentTitle = activeSubscription?.title || 'Базовый';
    const isCurrentIntensive = /интенсив/i.test(currentTitle) || activeSubscription?.planId === 'plan_intensiv_12';
    const isCurrentPremium = /премиум/i.test(currentTitle) || activeSubscription?.planId === 'plan_premium_14';

    const currentTotal = activeSubscription?.totalSessions || (isCurrentIntensive ? 12 : isCurrentPremium ? 14 : 8);
    const currentRemaining = activeSubscription?.remainingSessions ?? currentTotal;

    const currentBasePrice = isCurrentPremium ? 11900 : isCurrentIntensive ? 7790 : 5200;

    // Available target plans for upgrade
    const availablePlans: SubscriptionPlan[] = isCurrentIntensive
        ? SPARTA_SUBSCRIPTIONS.filter(p => p.id === 'plan_premium_14')
        : isCurrentPremium
        ? []
        : SPARTA_SUBSCRIPTIONS.filter(p => p.id === 'plan_intensiv_12' || p.id === 'plan_premium_14');

    const [selectedTargetPlanId, setSelectedTargetPlanId] = useState<string>(
        availablePlans[0]?.id || 'plan_intensiv_12'
    );

    const selectedTargetPlan = availablePlans.find(p => p.id === selectedTargetPlanId) || availablePlans[0];

    // Proration & Surcharge Calculation
    const unusedCurrentRatio = currentTotal > 0 ? (currentRemaining / currentTotal) : 0.5;
    const currentUnusedValue = Math.round(currentBasePrice * unusedCurrentRatio);

    // Target plan price
    const targetPrice = selectedTargetPlan?.price || 7790;
    
    // Transparent surcharge: Target Plan Full Price - Unused Value of Current Plan (min 500 RUB)
    const rawSurcharge = targetPrice - currentUnusedValue;
    const surcharge = Math.max(500, Math.round(rawSurcharge / 10) * 10);

    // Additional sessions to add to student's balance
    const targetTotalSessions = selectedTargetPlan?.totalSessions || (selectedTargetPlan?.id === 'plan_premium_14' ? 14 : 12);
    const additionalSessions = Math.max(0, targetTotalSessions - currentTotal);

    const handleConfirmUpgrade = async () => {
        if (!activeChild?.id || !selectedTargetPlan || isUpgrading) return;
        setIsUpgrading(true);

        try {
            const isTargetPremium = selectedTargetPlan.id === 'plan_premium_14';
            const newTotal = currentTotal + additionalSessions;
            const newRemaining = currentRemaining + additionalSessions;

            const childRef = doc(db, 'users', activeChild.id);

            const updatedSub = {
                ...(activeSubscription || {}),
                planId: selectedTargetPlan.id,
                title: selectedTargetPlan.title,
                totalSessions: newTotal,
                remainingSessions: newRemaining,
                individualSessions: isTargetPremium ? 2 : (activeSubscription?.individualSessions || 0),
                merchDiscount: isTargetPremium ? 25 : 15,
                uniformGift: isTargetPremium ? true : (activeSubscription?.uniformGift || false),
                status: 'ACTIVE' as SubscriptionStatus,
                isActive: true,
                isFrozen: false,
                updatedAt: serverTimestamp()
            };

            // 1. Update Child profile
            await updateDoc(childRef, {
                subscription: updatedSub,
                hasActiveMembership: true
            });

            // 2. Mirror on Parent doc if active
            if (user?.uid) {
                await updateDoc(doc(db, 'users', user.uid), {
                    subscription: updatedSub
                }).catch(() => {});
            }

            // 3. Log Order / Upgrade Record
            await addDoc(collection(db, 'orders'), {
                userId: user?.uid || userProfile?.uid || '',
                childId: activeChild.id,
                childName: activeChild.childName || activeChild.displayName || 'Спортсмен',
                type: 'SUBSCRIPTION_UPGRADE',
                fromPlan: currentTitle,
                toPlan: selectedTargetPlan.title,
                amount: surcharge,
                additionalSessions,
                status: 'succeeded',
                createdAt: serverTimestamp()
            }).catch(() => {});

            // 4. Send Parent Notification
            await addDoc(collection(db, 'notifications'), {
                userId: user?.uid || userProfile?.uid || '',
                title: '⬆ Тариф успешно повышен!',
                message: `Тариф для спортсмена ${activeChild.childName || 'ребёнка'} успешно улучшен до «${selectedTargetPlan.title}». Начислено +${additionalSessions} занятий к балансу!`,
                type: 'SUBSCRIPTION_UPGRADE',
                createdAt: serverTimestamp(),
                read: false
            }).catch(() => {});

            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#D4AF37', '#10B981', '#FFD700', '#FFFFFF']
            });

            alert(`✓ Тариф успешно повышен до «${selectedTargetPlan.title}»! Баланс пополнен на +${additionalSessions} занятий.`);
            
            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Upgrade subscription error:', err);
            alert('Ошибка при повышении тарифа: ' + (err.message || 'Попробуйте позже'));
        } finally {
            setIsUpgrading(false);
        }
    };

    if (!activeChild) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            glowColor="amber"
            zIndex="z-[140]"
        >
            <div className="relative text-left font-manrope">
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sparta-gold to-yellow-500 text-black flex items-center justify-center font-bold shadow-md shadow-sparta-gold/20">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-russo text-white uppercase tracking-wider">
                                Повышение тарифа
                            </h3>
                            <p className="text-[11px] text-white/50">
                                Переход на новый уровень с перерасчетом остатка
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Current Plan Summary Card */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between mb-4">
                    <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-white/40 block">Текущий абонемент:</span>
                        <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-sparta-gold font-russo uppercase">{currentTitle}</span>
                            <span className="text-white/40 font-normal">({activeChild.childName || 'Спортсмен'})</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-white/40 block">Остаток:</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                            {currentRemaining} из {currentTotal} зан.
                        </span>
                    </div>
                </div>

                {/* Target Plans Options */}
                <div className="space-y-2.5 mb-5">
                    <label className="block text-xs font-bold text-white/70 uppercase tracking-wider">
                        Выберите новый тариф:
                    </label>
                    <div className="space-y-2.5">
                        {availablePlans.map((plan) => {
                            const isSelected = selectedTargetPlanId === plan.id;
                            const isPlanPremium = plan.id === 'plan_premium_14';
                            const planSessionsToAdd = Math.max(0, (plan.totalSessions || 12) - currentTotal);

                            return (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedTargetPlanId(plan.id)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-sparta-gold/20 via-amber-500/10 to-transparent border-sparta-gold shadow-lg shadow-sparta-gold/10'
                                            : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {plan.badge && (
                                        <span className="absolute top-0 right-0 px-3 py-1 bg-sparta-gold text-black font-extrabold text-[9px] uppercase tracking-wider rounded-bl-xl shadow-sm">
                                            {plan.badge}
                                        </span>
                                    )}

                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                                                    isSelected ? 'border-sparta-gold bg-sparta-gold text-black font-bold' : 'border-white/30 text-transparent'
                                                }`}>
                                                    ✓
                                                </div>
                                                <span className="text-sm font-russo text-white uppercase tracking-wider">
                                                    «{plan.title}»
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] font-mono">
                                                    +{planSessionsToAdd} зан.
                                                </span>
                                            </div>

                                            <p className="text-[11px] text-white/60 leading-tight pl-7">
                                                {plan.description}
                                            </p>

                                            {/* Plan Features */}
                                            <div className="pl-7 pt-1 space-y-1">
                                                {plan.features?.slice(0, 2).map((feat, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-white/80">
                                                        <Sparkles size={11} className="text-sparta-gold shrink-0" />
                                                        <span>{feat}</span>
                                                    </div>
                                                ))}
                                                {isPlanPremium && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold">
                                                        <Trophy size={11} className="text-sparta-gold shrink-0" />
                                                        <span>2 индивидуальные тренировки с наставником</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 mt-5 sm:mt-0">
                                            <span className="text-base font-russo text-white block">
                                                {plan.price?.toLocaleString('ru-RU')} ₽
                                            </span>
                                            <span className="text-[9px] text-white/40 block">в месяц</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Calculation & Surcharge Box */}
                {selectedTargetPlan && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-sparta-gold/15 to-amber-500/5 border border-sparta-gold/30 space-y-2 mb-5">
                        <div className="flex items-center justify-between text-xs text-white/70">
                            <span>Стоимость нового тарифа «{selectedTargetPlan.title}»:</span>
                            <span className="font-mono text-white font-bold">{targetPrice.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/70">
                            <span>Зачёт неиспользованных {currentRemaining} занятий:</span>
                            <span className="font-mono text-emerald-400 font-bold">-{currentUnusedValue.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="pt-2 border-t border-sparta-gold/20 flex items-center justify-between">
                            <div>
                                <span className="text-xs uppercase font-extrabold text-white block">Сумма доплаты:</span>
                                <span className="text-[10px] text-sparta-gold">Баланс пополнится на +{additionalSessions} тренировок</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xl sm:text-2xl font-russo text-sparta-gold font-mono">
                                    {surcharge.toLocaleString('ru-RU')} ₽
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmUpgrade}
                        disabled={isUpgrading || !selectedTargetPlan}
                        className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 cursor-pointer"
                    >
                        {isUpgrading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                <CreditCard size={15} />
                                <span>Доплатить {surcharge.toLocaleString('ru-RU')} ₽ и улучшить</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default UpgradeSubscriptionModal;
