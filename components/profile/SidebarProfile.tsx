import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentAchievements, SpartanUnifiedAchievement, MAX_PINNED_SLOTS, getAward3DDefaultIcon } from '../../hooks/useStudentAchievements';
import { AwardDetailModal } from './AwardDetailModal';
import { Plus } from 'lucide-react';

interface SidebarProfileProps {
    user: any;
    userProfile: any;
    onTabChange?: (tab: string) => void;
}

export const SidebarProfile: React.FC<SidebarProfileProps> = ({
    user,
    userProfile,
    onTabChange
}) => {
    const studentId = user?.uid;
    const {
        pinnedAwards,
        pinnedAwardItems
    } = useStudentAchievements(studentId);

    const [selectedAward, setSelectedAward] = useState<SpartanUnifiedAchievement | null>(null);
    const [bouncingSlot, setBouncingSlot] = useState<number | null>(null);

    // 🎯 Реакция слота: пружинный отскок и ударная волна (Ripple) при завершении полета
    useEffect(() => {
        const handleBounce = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && typeof detail.slotIndex === 'number') {
                setBouncingSlot(detail.slotIndex);
                setTimeout(() => {
                    setBouncingSlot(null);
                }, 600);
            }
        };

        window.addEventListener('sparta:award-slot-bounce', handleBounce);
        return () => window.removeEventListener('sparta:award-slot-bounce', handleBounce);
    }, []);

    // 4 слота витрины наград
    const slots = [0, 1, 2, 3];

    const handleSlotClick = (index: number) => {
        const award = pinnedAwardItems[index];
        if (award) {
            setSelectedAward(award);
        } else {
            onTabChange?.('achievements');
        }
    };

    return (
        <>
            {/* Horizontal 4-Slot Awards Showcase (grid grid-cols-4) */}
            <div className="grid grid-cols-4 gap-2 p-2 rounded-xl bg-zinc-900/80 border border-white/5 my-2">
                {slots.map((index) => {
                    const award = pinnedAwardItems[index];
                    const isLanded = bouncingSlot === index;

                    return (
                        <motion.div
                            key={award ? award.id : `empty_${index}`}
                            animate={isLanded ? { scale: [1, 1.4, 0.92, 1] } : { scale: 1 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                            className="relative flex items-center justify-center"
                        >
                            {/* Золотая ударная волна (Ripple) */}
                            <AnimatePresence>
                                {isLanded && (
                                    <motion.span
                                        initial={{ scale: 0.8, opacity: 0.9 }}
                                        animate={{ scale: 2.2, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                        className="absolute inset-0 rounded-full border-2 border-amber-400 pointer-events-none z-30"
                                    />
                                )}
                            </AnimatePresence>

                            {award ? (
                                <button
                                    id={`sidebar-award-slot-${index}`}
                                    type="button"
                                    onClick={() => handleSlotClick(index)}
                                    className={`w-8 h-8 rounded-full border bg-black/60 flex items-center justify-center p-1 relative group shrink-0 transition-all cursor-pointer ${
                                        isLanded
                                            ? 'ring-2 ring-amber-400 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.8)] z-20'
                                            : 'border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.3)] hover:scale-110'
                                    }`}
                                    title={`Закреплено (${index + 1}/4): ${award.title} • Нажмите для просмотра`}
                                >
                                    <img
                                        src={award.iconUrl || getAward3DDefaultIcon(award.category, award.type, award.title)}
                                        alt={award.title}
                                        className="w-full h-full object-contain drop-shadow-sm"
                                    />
                                </button>
                            ) : (
                                <button
                                    id={`sidebar-award-slot-${index}`}
                                    type="button"
                                    onClick={() => handleSlotClick(index)}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all cursor-pointer shrink-0 ${
                                        isLanded
                                            ? 'ring-2 ring-amber-400 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.8)] z-20 bg-amber-500/20 text-amber-300'
                                            : 'border-dashed border-zinc-700 text-zinc-600 hover:border-amber-400/50 hover:text-amber-400'
                                    }`}
                                    title={`Свободный слот (${index + 1}/4) • Закрепить награду из Зала Славы`}
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Interactive Award Detail & Pin Modal */}
            <AwardDetailModal
                isOpen={Boolean(selectedAward)}
                onClose={() => setSelectedAward(null)}
                award={selectedAward}
                studentId={studentId}
                onOpenAwards={() => onTabChange?.('achievements')}
            />
        </>
    );
};

export default SidebarProfile;
