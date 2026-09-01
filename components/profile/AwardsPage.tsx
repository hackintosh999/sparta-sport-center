import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Scroll, ArrowLeft, Gift, Sparkles, Filter, CheckCircle2, Zap } from 'lucide-react';
import { useStudentAchievements, SpartanUnifiedAchievement, AwardCategoryType, MAX_PINNED_SLOTS } from '../../hooks/useStudentAchievements';
import { TrophyStandCard } from './TrophyStandCard';
import { CertificateCard } from './CertificateCard';
import { CertificateLightboxModal } from './CertificateLightboxModal';
import { AwardDetailModal } from './AwardDetailModal';
import { BadgeDetailModal } from '../dashboard/BadgeDetailModal';

interface AwardsPageProps {
    studentId?: string | null;
    studentName?: string;
    onOpenShop?: () => void;
    onBackToDashboard?: () => void;
}

export const AwardsPage: React.FC<AwardsPageProps> = ({
    studentId,
    studentName = 'Чемпион Спарты',
    onOpenShop,
    onBackToDashboard
}) => {
    const {
        achievements,
        awardsList,
        achievementsList,
        unlockedCount,
        totalCount,
        pinnedBadgeId,
        pinnedAwards,
        togglePin,
        togglePinAward,
        markAsViewed,
        medals,
        cups,
        certificates,
        challenges
    } = useStudentAchievements(studentId);

    const [activeTab, setActiveTab] = useState<AwardCategoryType>('medal');
    const [selectedBadge, setSelectedBadge] = useState<SpartanUnifiedAchievement | null>(null);
    const [selectedCertificate, setSelectedCertificate] = useState<SpartanUnifiedAchievement | null>(null);
    const [pinToastMessage, setPinToastMessage] = useState<string | null>(null);

    // 🚀 Fly-to-Profile Animation State (Arc & Physics)
    const [flyingAward, setFlyingAward] = useState<{
        id: string;
        iconUrl?: string;
        icon?: string;
        startX: number;
        startY: number;
        arcPeakY: number;
        targetX: number;
        targetY: number;
        targetSlotIndex: number;
    } | null>(null);
    const [pinningAwardId, setPinningAwardId] = useState<string | null>(null);
    const [optimisticPinnedIds, setOptimisticPinnedIds] = useState<string[]>([]);

    const handleTogglePin = async (badgeId: string, buttonEl?: HTMLElement) => {
        const targetBadge = achievements.find(a => a.id === badgeId);

        // Только элементы из awards_catalog могут быть закреплены в витрину
        if (targetBadge && targetBadge.canPinToProfile === false) {
            setPinToastMessage('Спортивные достижения нельзя закрепить в витрину наград.');
            setTimeout(() => setPinToastMessage(null), 3000);
            return;
        }

        const isCurrentlyPinned = pinnedAwards.includes(badgeId) || optimisticPinnedIds.includes(badgeId);

        if (isCurrentlyPinned) {
            setOptimisticPinnedIds(prev => prev.filter(id => id !== badgeId));
            await togglePinAward(badgeId);
            return;
        }

        if (pinnedAwards.length >= MAX_PINNED_SLOTS) {
            setPinToastMessage('В профиле можно закрепить максимум 4 награды. Снимите одну звездочку, чтобы закрепить новую.');
            setTimeout(() => setPinToastMessage(null), 3500);
            return;
        }

        const targetSlotIndex = pinnedAwards.length;
        const targetEl = document.getElementById(`sidebar-award-slot-${targetSlotIndex}`);

        if (buttonEl && targetEl && targetBadge) {
            const startRect = buttonEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();

            // Кнопка на время полета плавно переходит в disabled с лоадером
            setPinningAwardId(badgeId);

            const iconSize = 80;
            const startX = startRect.left + startRect.width / 2 - iconSize / 2;
            const startY = startRect.top + startRect.height / 2 - iconSize / 2;
            const targetX = targetRect.left + targetRect.width / 2 - iconSize / 2;
            const targetY = targetRect.top + targetRect.height / 2 - iconSize / 2;
            const arcPeakY = Math.min(startY, targetY) - 70;

            setFlyingAward({
                id: badgeId,
                iconUrl: targetBadge.iconUrl,
                icon: targetBadge.icon,
                startX,
                startY,
                arcPeakY,
                targetX,
                targetY,
                targetSlotIndex
            });
        } else {
            setOptimisticPinnedIds(prev => [...prev, badgeId]);
            await togglePinAward(badgeId);
        }
    };

    const handleBadgeClick = (b: SpartanUnifiedAchievement) => {
        markAsViewed(b.id);
        if (b.type === 'certificate') {
            setSelectedCertificate(b);
        } else {
            setSelectedBadge(b);
        }
    };

    const currentList = useMemo(() => {
        switch (activeTab) {
            case 'medal':
                return medals;
            case 'cup':
                return cups;
            case 'certificate':
                return certificates;
            case 'achievement':
                return challenges;
            default:
                return medals;
        }
    }, [activeTab, medals, cups, certificates, challenges]);

    return (
        <div className="w-full space-y-6 pb-20 md:pb-12 text-white">
            {/* 1. ШАПКА СТРАНИЦЫ */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#18181c]/95 via-[#121215]/95 to-[#09090b]/95 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-4"
            >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-1/4 w-80 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                {onBackToDashboard && (
                    <button
                        type="button"
                        onClick={onBackToDashboard}
                        className="inline-flex items-center gap-2 text-xs font-bold text-white/50 hover:text-sparta-gold transition-colors cursor-pointer mb-1 group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Вернуться в личный кабинет</span>
                    </button>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                    <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-sparta-gold flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                                <Trophy size={24} className="text-amber-400" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-wide">
                                🏆 Коллекция наград и кубков
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-white/60 leading-relaxed pl-1">
                            Все твои спортивные медали, командные кубки и грамоты в одном месте
                        </p>
                    </div>

                    {/* Карточка-счетчик справа: 🏅 Открыто {unlockedCount} из {totalCount} наград */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <div className="p-3.5 px-5 rounded-2xl bg-zinc-900/90 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex items-center gap-3 backdrop-blur-md">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">
                                🏅
                            </div>
                            <div>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                                    Твой статус
                                </span>
                                <div className="text-sm sm:text-base font-russo text-amber-300">
                                    Открыто {unlockedCount} из {totalCount} наград
                                </div>
                            </div>
                        </div>

                        {onOpenShop && (
                            <button
                                type="button"
                                onClick={onOpenShop}
                                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-sparta-gold hover:brightness-110 text-black rounded-xl font-russo uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer shrink-0 font-black"
                            >
                                <Gift size={15} />
                                <span>Магазин призов →</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* 2. ВКЛАДКИ: 3 ВИДА НАГРАД + СПОРТИВНЫЕ ДОСТИЖЕНИЯ */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {/* Вкладка 1: [ 🏅 Все медали ] */}
                <button
                    type="button"
                    onClick={() => setActiveTab('medal')}
                    className={`px-5 py-3 rounded-2xl text-xs font-russo uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shrink-0 font-bold border ${
                        activeTab === 'medal'
                            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-102'
                            : 'bg-zinc-900/80 hover:bg-zinc-800 text-white/70 border-white/10'
                    }`}
                >
                    <span className="text-base">🏅</span>
                    <span>Все медали</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                        activeTab === 'medal' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                    }`}>
                        {medals.filter(m => m.unlocked).length} / {medals.length}
                    </span>
                </button>

                {/* Вкладка 2: [ 🏆 Кубки команды ] */}
                <button
                    type="button"
                    onClick={() => setActiveTab('cup')}
                    className={`px-5 py-3 rounded-2xl text-xs font-russo uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shrink-0 font-bold border ${
                        activeTab === 'cup'
                            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-102'
                            : 'bg-zinc-900/80 hover:bg-zinc-800 text-white/70 border-white/10'
                    }`}
                >
                    <span className="text-base">🏆</span>
                    <span>Кубки команды</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                        activeTab === 'cup' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                    }`}>
                        {cups.filter(c => c.unlocked).length} / {cups.length}
                    </span>
                </button>

                {/* Вкладка 3: [ 📜 Грамоты от тренера ] */}
                <button
                    type="button"
                    onClick={() => setActiveTab('certificate')}
                    className={`px-5 py-3 rounded-2xl text-xs font-russo uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shrink-0 font-bold border ${
                        activeTab === 'certificate'
                            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-102'
                            : 'bg-zinc-900/80 hover:bg-zinc-800 text-white/70 border-white/10'
                    }`}
                >
                    <span className="text-base">📜</span>
                    <span>Грамоты</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                        activeTab === 'certificate' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                    }`}>
                        {certificates.filter(c => c.unlocked).length} / {certificates.length}
                    </span>
                </button>

                {/* Вкладка 4: [ ⚡ Достижения & Нормативы ] */}
                <button
                    type="button"
                    onClick={() => setActiveTab('achievement')}
                    className={`px-5 py-3 rounded-2xl text-xs font-russo uppercase tracking-wider flex items-center gap-2.5 transition-all cursor-pointer shrink-0 font-bold border ${
                        activeTab === 'achievement'
                            ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-102'
                            : 'bg-zinc-900/80 hover:bg-zinc-800 text-white/70 border-white/10'
                    }`}
                >
                    <span className="text-base">⚡</span>
                    <span>Нормативы & Челленджи</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                        activeTab === 'achievement' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
                    }`}>
                        {challenges.filter(c => c.unlocked).length} / {challenges.length}
                    </span>
                </button>
            </div>

            {/* 3. СЕТКА НАГРАД (2.5D СТЕНДЫ ИЛИ КЛУБНЫЕ ДИПЛОМЫ) */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
                {activeTab === 'certificate' ? (
                    certificates.map((cert) => (
                        <CertificateCard
                            key={cert.id}
                            certificate={cert}
                            onClick={(c) => handleBadgeClick(c)}
                            onTogglePin={handleTogglePin}
                            isPinnedInProfile={pinnedAwards.includes(cert.id) || optimisticPinnedIds.includes(cert.id)}
                            pinnedCount={pinnedAwards.length}
                        />
                    ))
                ) : (
                    currentList.map((item) => (
                        <TrophyStandCard
                            key={item.id}
                            badge={item}
                            onClick={(b) => handleBadgeClick(b)}
                            onTogglePin={item.canPinToProfile ? handleTogglePin : undefined}
                            isPinnedInProfile={pinnedAwards.includes(item.id) || optimisticPinnedIds.includes(item.id)}
                            isPinning={pinningAwardId === item.id}
                            pinnedCount={pinnedAwards.length}
                        />
                    ))
                )}
            </motion.div>

            {/* 🚀 БЕСШОВНАЯ ФИЗИЧЕСКАЯ АНИМАЦИЯ ПОЛЕТА ПО ДУГЕ В ВИТРИНУ (Arc & Physics) */}
            <AnimatePresence>
                {flyingAward && (
                    <motion.div
                        key={flyingAward.id}
                        initial={{
                            x: flyingAward.startX,
                            y: flyingAward.startY,
                            scale: 1,
                            rotate: 0,
                            opacity: 1,
                            filter: 'drop-shadow(0 0 0px rgba(251,191,36,0))'
                        }}
                        animate={{
                            x: flyingAward.targetX,
                            // Дуга: сначала подбрасываем вверх на -70px относительно прямой линии
                            y: [flyingAward.startY, flyingAward.arcPeakY, flyingAward.targetY],
                            scale: [1, 1.2, 0.42],
                            rotate: [0, -15, 0],
                            opacity: [1, 1, 0.95],
                            filter: [
                                'drop-shadow(0 0 5px rgba(251,191,36,0.3))',
                                'drop-shadow(0 0 25px rgba(251,191,36,0.9))',
                                'drop-shadow(0 0 8px rgba(251,191,36,0.4))'
                            ]
                        }}
                        transition={{
                            duration: 0.85,
                            times: [0, 0.45, 1],
                            ease: [0.16, 1, 0.3, 1] // Плавное замедление к концу
                        }}
                        onAnimationComplete={async () => {
                            const completed = flyingAward;
                            // 1. Запустить магнитный отскок и ударную волну (Ripple) в слоте сайдбара
                            window.dispatchEvent(new CustomEvent('sparta:award-slot-bounce', {
                                detail: {
                                    slotIndex: completed.targetSlotIndex,
                                    awardId: completed.id
                                }
                            }));
                            // 2. Сохранить в Firestore и переключить кнопку на [ ✅ В витрине ]
                            await togglePinAward(completed.id);
                            setOptimisticPinnedIds(prev => [...prev, completed.id]);
                            setPinningAwardId(null);
                            setFlyingAward(null);
                        }}
                        className="fixed top-0 left-0 z-50 pointer-events-none"
                    >
                        {flyingAward.iconUrl ? (
                            <img src={flyingAward.iconUrl} alt="" className="w-20 h-20 object-contain" />
                        ) : (
                            <div className="w-20 h-20 rounded-3xl bg-zinc-950/95 border-2 border-amber-400 p-2 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(251,191,36,0.9)]">
                                <span>{flyingAward.icon || '🏅'}</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pinned Awards Limit Toast Notification */}
            <AnimatePresence>
                {pinToastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 border border-amber-300"
                    >
                        <span>⭐</span>
                        <span>{pinToastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. ИНТЕРАКТИВНАЯ МОДАЛКА ПРИВЯЗКИ НАГРАДЫ С АНИМАЦИЕЙ (AwardDetailModal) */}
            <AwardDetailModal
                isOpen={Boolean(selectedBadge)}
                onClose={() => setSelectedBadge(null)}
                award={selectedBadge}
                studentId={studentId}
            />

            {/* 5. ПОЛНОРАЗМЕРНЫЙ ПРОСМОТР ГРАМОТЫ (LIGHTBOX MODAL С КНОПКОЙ СКАЧИВАНИЯ) */}
            <CertificateLightboxModal
                isOpen={Boolean(selectedCertificate)}
                onClose={() => setSelectedCertificate(null)}
                certificate={selectedCertificate}
                studentName={studentName}
            />
        </div>
    );
};

export default AwardsPage;
