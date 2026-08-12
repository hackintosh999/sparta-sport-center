import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Calendar, Trophy, Zap, TrendingUp, Clock, Target, Award, Loader2, Pencil, Sparkles, HelpCircle, Flame, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface StatsSectionProps {
    userProfile: any;
    requests: any[];
    orders: any[];
    isAdmin?: boolean;
    isParentView?: boolean;
    onUpdateActivity?: (date: string, minutes: number) => Promise<void>;
    onUpdateManualStats?: (updates: any) => Promise<void>;
}

const StatsSection: React.FC<StatsSectionProps> = ({ userProfile, requests, orders, isAdmin = false, isParentView = false, onUpdateActivity, onUpdateManualStats }) => {
    const [dailyActivity, setDailyActivity] = useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = useState(true);
    const [editingStat, setEditingStat] = useState<{ key: string, label: string, value: any } | null>(null);
    const [tempStatValue, setTempStatValue] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    // --- MANUAL STATS ONLY (as requested by user) ---

    // 1. Days as Member (Staj)
    const joinDateStr = userProfile?.manualStats?.joinDate || format(new Date(), 'yyyy-MM-dd');
    const daysAsMember = Math.max(0, differenceInDays(new Date(), new Date(joinDateStr)));

    // 2. Core Metrics
    const totalTrainings = Number(userProfile?.manualStats?.trainings || 0);
    const totalActiveDays = Number(userProfile?.manualStats?.activeDays || 0);
    const totalSpending = Number(userProfile?.manualStats?.spending || 0);
    const totalXp = Number(userProfile?.manualStats?.xp || (totalTrainings * 100)); // Default to trainings * 100 if manual XP is missing

    // 3. Fetch Activity (for Heatmap)
    useEffect(() => {
        const uid = userProfile?.uid || userProfile?.id;
        if (!uid) return;

        // Daily activity is still fetched as it represents the "History Heatmap" 
        // which the admin can edit via onUpdateActivity
        const qActivity = query(
            collection(db, "users", uid, "dailyActivity"),
            orderBy("date", "desc"),
            limit(365)
        );

        const unsubscribeActivity = onSnapshot(qActivity, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            setDailyActivity(data.sort((a, b) => a.date.localeCompare(b.date)));
            setLoadingActivity(false);
        });

        return () => unsubscribeActivity();
    }, [userProfile?.uid, userProfile?.id]);

    // 4. Level Logic (based on manual XP)
    const getLevelInfo = () => {
        if (totalXp < 500) return { name: "Новичок", level: 1, nextAt: 500, icon: "🛡️", color: "from-blue-500 to-indigo-600" };
        if (totalXp < 1500) return { name: "Воин", level: 2, nextAt: 1500, icon: "⚔️", color: "from-green-500 to-emerald-600" };
        if (totalXp < 3000) return { name: "Спартанец", level: 3, nextAt: 3000, icon: "🏛️", color: "from-sparta-gold to-yellow-600" };
        if (totalXp < 5000) return { name: "Элитный Воин", level: 4, nextAt: 5000, icon: "🔥", color: "from-orange-500 to-red-600" };
        return { name: "Легенда Спарты", level: 5, nextAt: totalXp + 1000, icon: "👑", color: "from-purple-500 to-pink-600" };
    };

    const levelInfo = getLevelInfo();
    const prevThreshold = [0, 0, 500, 1500, 3000, 5000][levelInfo.level] || 0;
    const progress = Math.min(100, Math.max(0, ((totalXp - prevThreshold) / (levelInfo.nextAt - prevThreshold)) * 100));

    // 5. Simplified Skills (Manual values from profile)
    const skills = [
        { name: "Техника", icon: <Award size={14} />, value: userProfile?.skills?.technique ?? 40, color: "bg-purple-500" },
        { name: "Сила", icon: <Zap size={14} />, value: userProfile?.skills?.strength ?? 50, color: "bg-sparta-gold" },
        { name: "Выносливость", icon: <Activity size={14} />, value: userProfile?.skills?.endurance ?? 45, color: "bg-green-500" },
        { name: "Дисциплина", icon: <Target size={14} />, value: userProfile?.skills?.discipline ?? 60, color: "bg-blue-500" },
        { name: "Гибкость", icon: <Sparkles size={14} />, value: userProfile?.skills?.flexibility ?? 30, color: "bg-pink-500" }
    ];

    const getMinutesForDate = (dateStr: string) => {
        return dailyActivity.find(a => a.date === dateStr)?.minutes || 0;
    };

    const handleSaveStat = async () => {
        if (!editingStat || !onUpdateManualStats) return;
        setIsUpdating(true);
        try {
            const updates: any = {};
            updates[`manualStats.${editingStat.key}`] = editingStat.key === 'joinDate' ? tempStatValue : Number(tempStatValue);
            await onUpdateManualStats(updates);
            setEditingStat(null);
        } catch (e) {
            console.error("Error saving stat:", e);
        }
        setIsUpdating(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. Top Section: Rank & Level */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`lg:col-span-2 relative overflow-hidden rounded-[2.5rem] p-8 bg-gradient-to-br ${levelInfo.color} shadow-2xl group`}
                >
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <Trophy size={200} />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 h-full">
                        <div className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/20 backdrop-blur-xl border-4 border-white/30 flex items-center justify-center text-6xl md:text-7xl shadow-2xl animate-float">
                                {levelInfo.icon}
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full font-russo text-xs uppercase tracking-widest shadow-xl flex items-center gap-1">
                                Уровень {levelInfo.level}
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setEditingStat({ key: 'xp', label: 'Опыт (XP)', value: totalXp });
                                            setTempStatValue(totalXp.toString());
                                        }}
                                        className="ml-1 text-black/40 hover:text-black transition-colors"
                                    >
                                        <Pencil size={10} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <h4 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Твой текущий статус</h4>
                                <h2 className="text-4xl md:text-5xl font-russo text-white uppercase tracking-tighter drop-shadow-lg">{levelInfo.name}</h2>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end px-1">
                                    <span className="text-white/80 text-[11px] font-bold uppercase tracking-widest">Прогресс ранга</span>
                                    <span className="text-white font-russo text-lg">{totalXp} <span className="text-white/50 text-xs">/ {levelInfo.nextAt} XP</span></span>
                                </div>
                                <div className="h-4 bg-black/20 rounded-full overflow-hidden p-1 border border-white/10">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                    />
                                </div>
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">
                                    {levelInfo.nextAt - totalXp > 0
                                        ? `Осталось ${levelInfo.nextAt - totalXp} XP до следующего уровня`
                                        : 'Максимальный уровень достигнут!'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Weekly Highlight */}
                {!isParentView && (
                    <div className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold/5 rounded-full blur-3xl" />
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 text-sparta-gold flex items-center justify-center">
                                    <Flame size={24} />
                                </div>
                                <div>
                                    <h4 className="text-white font-russo uppercase text-sm tracking-wider">Твой огонь</h4>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Активность</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <Calendar className="text-blue-400" size={20} />
                                    <div>
                                        <p className="text-white font-bold text-xs">{totalTrainings} тренировок</p>
                                        <p className="text-white/30 text-[9px] uppercase font-black">Всего пройдено</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <Clock className="text-green-400" size={20} />
                                    <div>
                                        <p className="text-white font-bold text-xs">{totalTrainings * 90} минут</p>
                                        <p className="text-white/30 text-[9px] uppercase font-black">Приблизительное время</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                            <p className="text-[10px] font-black text-sparta-gold uppercase tracking-[0.2em] animate-pulse">Ты в отличной форме!</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Middle Section: Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: "Тренировок", value: totalTrainings, icon: <Zap className="text-sparta-gold" />, color: "from-sparta-gold/20 to-transparent", key: 'trainings' },
                    { label: "Активных дней", value: totalActiveDays, icon: <Activity className="text-green-500" />, color: "from-green-500/20 to-transparent", key: 'activeDays' },
                    { label: "Стаж (дней)", value: daysAsMember, icon: <Calendar className="text-blue-500" />, color: "from-blue-500/20 to-transparent", key: 'joinDate' },
                    { label: "Вложено (₽)", value: totalSpending.toLocaleString(), icon: <TrendingUp className="text-purple-500" />, color: "from-purple-500/20 to-transparent", key: 'spending' }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={`bg-gradient-to-br ${stat.color} border border-white/10 rounded-3xl p-6 relative group overflow-hidden`}
                    >
                        <div className="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-100 transition-all">
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setEditingStat(stat as any);
                                        setTempStatValue(stat.value.toString().replace(/\s/g, ''));
                                    }}
                                    className="p-1.5 bg-white/10 rounded-lg hover:text-sparta-gold"
                                >
                                    <Pencil size={12} />
                                </button>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center mb-4 text-white/50 group-hover:text-white transition-all">
                            {stat.icon}
                        </div>
                        <p className="text-white/40 text-[9px] uppercase font-black tracking-[0.2em] mb-1">{stat.label}</p>
                        <h5 className="text-2xl font-russo text-white">{stat.value}</h5>
                    </motion.div>
                ))}
            </div>

            {/* 3. Achievements Shortcut */}
            {!isParentView && (
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between group hover:bg-white/10 transition-all cursor-pointer gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[2rem] bg-purple-500/10 flex items-center justify-center text-purple-400 shadow-xl border border-purple-500/20">
                            <Award size={32} />
                        </div>
                        <div>
                            <h5 className="text-white font-russo uppercase tracking-wider text-2xl">Твои достижения</h5>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Трофеи и награды за твои успехи</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#111] bg-white/5 flex items-center justify-center text-xs opacity-50 group-hover:opacity-100 transition-opacity">
                                    🔒
                                </div>
                            ))}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-sparta-gold group-hover:text-black transition-all">
                            <ChevronRight size={24} />
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Edit Modal */}
            {editingStat && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white font-russo mb-6 flex items-center gap-3">
                            <Pencil size={20} className="text-sparta-gold" />
                            {editingStat.label}
                        </h3>
                        <div className="space-y-4 mb-8">
                            <input
                                type={editingStat.key === 'joinDate' ? 'date' : 'number'}
                                value={tempStatValue}
                                onChange={(e) => setTempStatValue(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl text-white font-russo focus:outline-none focus:border-sparta-gold transition-all"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setEditingStat(null)} className="flex-1 py-4 rounded-2xl text-white/50 font-bold hover:bg-white/5 transition-colors">Отмена</button>
                            <button onClick={handleSaveStat} disabled={isUpdating} className="flex-1 py-4 rounded-2xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/20 disabled:opacity-50">
                                {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'Сохранить'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default StatsSection;