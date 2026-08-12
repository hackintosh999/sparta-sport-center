import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Trophy, Calendar, X, Box, CheckCircle, Star, Lock, Sparkles, Shield, Filter } from 'lucide-react';
import { UserAchievement, AchievementDefinition } from '../../types/shop';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const Viewer3D = React.lazy(() => import('../Viewer3D'));

interface AchievementsListProps {
    userAchievements?: UserAchievement[];
    showAllDefinitions?: boolean;
}

// --- 3D Card Component ---
interface AchievementCardProps {
    achievement?: UserAchievement;
    def: AchievementDefinition;
    isUnlocked: boolean;
    onClick: () => void;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
    achievement,
    def,
    isUnlocked,
    onClick
}) => {
    const ref = useRef<HTMLDivElement>(null);

    // Mouse position state for tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXFromCenter = e.clientX - rect.left - width / 2;
        const mouseYFromCenter = e.clientY - rect.top - height / 2;
        x.set(mouseXFromCenter / width);
        y.set(mouseYFromCenter / height);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Rarity Visuals
    const isLegendary = def.rarity === 'legendary';
    const isRare = def.rarity === 'rare';

    const bgGradient = isUnlocked
        ? (isLegendary
            ? "bg-gradient-to-br from-[#2a2a2a] via-[#3a2e15] to-[#1a1a1a]"
            : isRare
                ? "bg-gradient-to-br from-[#1a2a3a] via-[#1a3a4a] to-[#1a1a1a]"
                : "bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]")
        : "bg-gradient-to-br from-[#141416] via-[#1c1c1e]/60 to-[#0e0e10]";

    const borderClass = isUnlocked
        ? (isLegendary
            ? "border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            : isRare
                ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                : "border-white/20")
        : "border-white/10 hover:border-white/20";

    const glowColor = isUnlocked
        ? (isLegendary ? "rgba(234, 179, 8, 0.3)" : isRare ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)")
        : "rgba(0, 0, 0, 0.5)";

    return (
        <motion.div
            ref={ref}
            style={{
                rotateX: isUnlocked ? rotateX : 0,
                rotateY: isUnlocked ? rotateY : 0,
                transformStyle: "preserve-3d",
                perspective: 1000
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={`relative w-full aspect-[3/4] rounded-2xl cursor-pointer group select-none ${!isUnlocked ? 'opacity-70 hover:opacity-100 transition-opacity' : ''}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Card Container */}
            <div className={`absolute inset-0 rounded-2xl border-2 ${borderClass} ${bgGradient} overflow-hidden shadow-2xl transition-all duration-300`}>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`
                    }}
                />

                {/* Holographic Shine Overlay */}
                {isUnlocked && (
                    <div className="absolute inset-0 rounded-2xl mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                            background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.2) 50%, transparent 54%)`,
                        }}
                    />
                )}

                {/* Content Layer (elevated in 3D) */}
                <div className="relative z-10 w-full h-full flex flex-col p-4" style={{ transform: isUnlocked ? "translateZ(20px)" : "none" }}>

                    {/* Header: Rarity & Lock status */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`
                            px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                            ${isUnlocked
                                ? (isLegendary ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' :
                                    isRare ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                                        'bg-white/10 border-white/20 text-white/70')
                                : 'bg-white/5 border-white/10 text-white/40'}
                        `}>
                            {def.rarity}
                        </div>
                        {isUnlocked ? (
                            isLegendary && <Star size={14} className="text-yellow-500 fill-yellow-500 animate-pulse" />
                        ) : (
                            <div className="p-1 rounded-full bg-black/60 border border-white/10 text-white/40">
                                <Lock size={12} />
                            </div>
                        )}
                    </div>

                    {/* Image / Icon Area (Floating Asset) */}
                    <div className="flex-1 flex items-center justify-center relative my-2">
                        {/* Ambient Rarity Glow */}
                        <div className={`absolute w-24 h-24 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                            isUnlocked
                                ? (isLegendary ? 'bg-yellow-500/35' : isRare ? 'bg-blue-500/25' : 'bg-white/10')
                                : 'bg-transparent'
                        }`} />

                        <div className={`relative z-10 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)] ${!isUnlocked ? 'filter grayscale brightness-75 contrast-125' : ''}`}>
                            {def.mediaUrl ? (
                                def.type === '3d' ? (
                                    <div className="w-24 h-24 flex items-center justify-center bg-black/40 rounded-full border border-white/10 backdrop-blur-sm shadow-xl">
                                        <Box className={isUnlocked ? (isLegendary ? "text-sparta-gold" : "text-white") : "text-white/30"} size={40} />
                                        <div className="absolute -bottom-2 px-2 py-0.5 bg-black/80 text-[8px] font-bold rounded-full border border-white/20 text-sparta-gold">3D MODEL</div>
                                    </div>
                                ) : (
                                    <img src={def.mediaUrl} className="w-28 h-28 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]" alt={def.title} />
                                )
                            ) : (
                                <Trophy className={isUnlocked ? (isLegendary ? "text-yellow-500" : isRare ? "text-blue-400" : "text-white") : "text-white/20"} size={56} />
                            )}
                        </div>
                    </div>

                    {/* Footer: Title & Date or Lock state */}
                    <div className="mt-auto text-center">
                        <h3 className={`font-russo text-sm sm:text-base leading-tight mb-1.5 ${isUnlocked ? (isLegendary ? 'text-white drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]' : 'text-white') : 'text-white/50'}`}>
                            {def.title}
                        </h3>
                        {isUnlocked && achievement ? (
                            <div className="flex items-center justify-center gap-1 text-[10px] text-sparta-gold font-mono font-bold">
                                <Calendar size={10} />
                                {new Date(achievement.date).toLocaleDateString()}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-1 text-[10px] text-white/30 font-medium">
                                <Lock size={10} />
                                <span>Заблокировано</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


const AchievementsList: React.FC<AchievementsListProps> = ({ userAchievements = [], showAllDefinitions = true }) => {
    const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState<{ def: AchievementDefinition; achievement?: UserAchievement; isUnlocked: boolean } | null>(null);
    const [filterTab, setFilterTab] = useState<'all' | 'unlocked' | 'locked'>('all');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "achievement_definitions"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition));
            setDefinitions(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Create lookup map of user achievements
    const userAchMap = React.useMemo(() => {
        const map: Record<string, UserAchievement> = {};
        userAchievements.forEach(ua => {
            if (ua.definitionId) map[ua.definitionId] = ua;
            if (ua.id) map[ua.id] = ua;
        });
        return map;
    }, [userAchievements]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="w-10 h-10 border-4 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-russo text-white/60 uppercase tracking-widest">Загрузка галереи наград...</p>
            </div>
        );
    }

    // Filter definitions
    const displayedItems = definitions.filter(def => {
        const isUnlocked = Boolean(userAchMap[def.id]);
        if (filterTab === 'unlocked') return isUnlocked;
        if (filterTab === 'locked') return !isUnlocked;
        return true;
    });

    const unlockedCount = definitions.filter(d => Boolean(userAchMap[d.id])).length;
    const totalCount = definitions.length;

    return (
        <div className="space-y-6">
            {/* Header Controls & Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold font-russo">
                        🏆
                    </div>
                    <div>
                        <h4 className="text-sm font-russo text-white uppercase tracking-wider">Коллекция Наград</h4>
                        <p className="text-xs text-white/50">Разблокировано: <strong className="text-sparta-gold font-bold">{unlockedCount}</strong> из {totalCount}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                    <button
                        onClick={() => setFilterTab('all')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === 'all' ? 'bg-sparta-gold text-black font-russo' : 'text-white/60 hover:text-white'}`}
                    >
                        Все ({totalCount})
                    </button>
                    <button
                        onClick={() => setFilterTab('unlocked')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === 'unlocked' ? 'bg-emerald-500 text-black font-russo' : 'text-white/60 hover:text-white'}`}
                    >
                        Получены ({unlockedCount})
                    </button>
                    <button
                        onClick={() => setFilterTab('locked')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterTab === 'locked' ? 'bg-white/20 text-white font-russo' : 'text-white/60 hover:text-white'}`}
                    >
                        В процессе ({totalCount - unlockedCount})
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {displayedItems.length === 0 && (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
                        <Trophy size={32} />
                    </div>
                    <h3 className="text-xl text-white font-russo mb-2">Награды не найдены</h3>
                    <p className="text-white/50 max-w-sm text-xs">
                        {filterTab === 'unlocked' ? 'У вас пока нет полученных наград. Посещайте тренировки и выполняйте задания!' : 'Все награды уже разблокированы!'}
                    </p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedItems.map(def => {
                    const achievement = userAchMap[def.id];
                    const isUnlocked = Boolean(achievement);
                    return (
                        <AchievementCard
                            key={def.id}
                            achievement={achievement}
                            def={def}
                            isUnlocked={isUnlocked}
                            onClick={() => setSelectedCard({ def, achievement, isUnlocked })}
                        />
                    );
                })}
            </div>

            {/* Interactive Detail Modal */}
            <AnimatePresence>
                {selectedCard && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedCard(null)} />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#141416] border border-white/15 rounded-3xl w-full max-w-xl overflow-hidden relative z-10 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
                        >
                            <button
                                onClick={() => setSelectedCard(null)}
                                className="absolute top-4 right-4 p-2 bg-black/60 text-white/60 hover:text-white rounded-full z-20 backdrop-blur-sm border border-white/10"
                            >
                                <X size={20} />
                            </button>

                            {/* Visual Side */}
                            <div className="w-full md:w-1/2 bg-gradient-to-br from-black via-[#1a1a1e] to-[#0d0d0f] relative flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/10 min-h-[240px]">
                                <div className={`absolute inset-0 blur-[60px] rounded-full pointer-events-none ${selectedCard.isUnlocked ? (selectedCard.def.rarity === 'legendary' ? 'bg-yellow-500/20' : selectedCard.def.rarity === 'rare' ? 'bg-blue-500/20' : 'bg-white/10') : 'bg-transparent'}`} />

                                <div className={`relative z-10 flex flex-col items-center justify-center ${!selectedCard.isUnlocked ? 'filter grayscale brightness-75' : ''}`}>
                                    {selectedCard.def.type === '3d' && selectedCard.def.mediaUrl ? (
                                        <div className="w-48 h-48 relative">
                                            <Suspense fallback={
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-8 h-8 border-2 border-sparta-gold border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            }>
                                                <Viewer3D url={selectedCard.def.mediaUrl} height="100%" />
                                            </Suspense>
                                            <p className="absolute -bottom-2 w-full text-center text-[10px] text-white/40 font-mono">3D Интерактивная модель</p>
                                        </div>
                                    ) : selectedCard.def.mediaUrl ? (
                                        <img src={selectedCard.def.mediaUrl} className="w-40 h-40 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" alt={selectedCard.def.title} />
                                    ) : (
                                        <Trophy size={90} className={selectedCard.isUnlocked ? (selectedCard.def.rarity === 'legendary' ? 'text-yellow-500' : 'text-blue-400') : 'text-white/20'} />
                                    )}
                                </div>
                            </div>

                            {/* Details Side */}
                            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${selectedCard.isUnlocked ? 'bg-sparta-gold/20 border-sparta-gold text-sparta-gold' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                            {selectedCard.def.rarity}
                                        </span>
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-2 py-1 bg-white/5 rounded-md border border-white/5">
                                            {selectedCard.def.category || 'Особое'}
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-russo text-white uppercase tracking-wide mb-1">{selectedCard.def.title}</h2>
                                        <p className="text-xs text-white/60 leading-relaxed">{selectedCard.def.description || 'Награда за активность и успехи в спортивном центре Спарта.'}</p>
                                    </div>

                                    {/* Grant status or locked info */}
                                    {selectedCard.isUnlocked ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                                <CheckCircle size={16} />
                                                <span>Награда получена</span>
                                            </div>
                                            {selectedCard.achievement?.reason && (
                                                <p className="text-xs text-white italic bg-black/40 p-2.5 rounded-xl border border-white/5">
                                                    "{selectedCard.achievement.reason}"
                                                </p>
                                            )}
                                            {selectedCard.achievement?.date && (
                                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-mono">
                                                    <Calendar size={12} />
                                                    <span>Дата получения: {new Date(selectedCard.achievement.date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                                            <div className="flex items-center gap-2 text-white/50 text-xs font-bold uppercase tracking-wider">
                                                <Lock size={16} className="text-amber-400" />
                                                <span>Заблокированная награда</span>
                                            </div>
                                            <p className="text-xs text-white/50">
                                                Выдаётся тренерами или администратором за постоянство на тренировках, спортивные результаты и дисциплину.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setSelectedCard(null)}
                                    className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AchievementsList;

