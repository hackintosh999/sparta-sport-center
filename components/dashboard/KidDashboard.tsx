import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy, Calendar, MessageSquare, Flame, CheckCircle2,
    Users, Award, Sparkles, Star, ChevronRight, Activity, Dumbbell, ShieldCheck, Lock
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { linkParentToChild } from '../../services/userService';
import AchievementsList from '../profile/AchievementsList';

interface KidDashboardProps {
    user: any;
    userProfile: any;
    onTabChange: (tab: string) => void;
}

export const KidDashboard: React.FC<KidDashboardProps> = ({ user, userProfile, onTabChange }) => {
    const [groupName, setGroupName] = useState<string>('Загрузка группы...');
    const [parentName, setParentName] = useState<string | null>(userProfile?.parentName || null);
    const [loadingGroup, setLoadingGroup] = useState<boolean>(true);
    const [pendingLinkRequest, setPendingLinkRequest] = useState<any | null>(null);
    const [achDefinitions, setAchDefinitions] = useState<any[]>([]);

    const awardsSectionRef = useRef<HTMLDivElement>(null);

    // Fetch master achievement definitions for Top Showcase Widget
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'achievement_definitions'), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAchDefinitions(list);
        });
        return () => unsub();
    }, []);

    // Cross reference user unlocked achievements
    const userAchMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        (userProfile?.achievements || []).forEach((ua: any) => {
            if (ua.definitionId) map[ua.definitionId] = ua;
            if (ua.id) map[ua.id] = ua;
        });
        return map;
    }, [userProfile?.achievements]);

    // Top 4 Unlocked Badges (sorted by rarity: legendary > rare > common)
    const unlockedBadges = React.useMemo(() => {
        const unlocked = achDefinitions.filter(def => Boolean(userAchMap[def.id]));
        const rarityScore = (r: string) => r === 'legendary' ? 3 : r === 'rare' ? 2 : 1;
        return unlocked.sort((a, b) => rarityScore(b.rarity) - rarityScore(a.rarity)).slice(0, 4);
    }, [achDefinitions, userAchMap]);

    const scrollToAwards = () => {
        if (awardsSectionRef.current) {
            awardsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        } else {
            onTabChange('achievements');
        }
    };

    useEffect(() => {
        if (!user?.uid) return;
        const qReq = query(collection(db, 'linking_requests'), where('childId', '==', user.uid), where('status', '==', 'pending'));
        const unsub = onSnapshot(qReq, (snap) => {
            if (!snap.empty) {
                const reqDoc = snap.docs[0];
                setPendingLinkRequest({ id: reqDoc.id, ...reqDoc.data() });
            } else {
                setPendingLinkRequest(null);
            }
        });
        return () => unsub();
    }, [user?.uid]);

    const handleAcceptLink = async () => {
        if (!pendingLinkRequest || !user?.uid) return;
        try {
            await linkParentToChild(pendingLinkRequest.parentId, user.uid);
            await updateDoc(doc(db, 'linking_requests', pendingLinkRequest.id), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });
            setPendingLinkRequest(null);
        } catch (e) {
            console.error('Error accepting link request:', e);
        }
    };

    const handleRejectLink = async () => {
        if (!pendingLinkRequest) return;
        try {
            await updateDoc(doc(db, 'linking_requests', pendingLinkRequest.id), {
                status: 'rejected',
                rejectedAt: serverTimestamp()
            });
            setPendingLinkRequest(null);
        } catch (e) {
            console.error('Error rejecting link request:', e);
        }
    };

    const xp = userProfile?.xp || userProfile?.bonusPoints || 180;
    const maxXp = 500;
    const xpPercent = Math.min(100, Math.round((xp / maxXp) * 100));

    const getRank = (currentXp: number) => {
        if (currentXp >= 400) return { title: 'СПАРТАНЕЦ', color: 'from-amber-400 to-yellow-500', badge: '🥇' };
        if (currentXp >= 200) return { title: 'СПОРТСМЕН', color: 'from-blue-400 to-indigo-500', badge: '🥈' };
        return { title: 'НОВИЧОК', color: 'from-emerald-400 to-teal-500', badge: '🥉' };
    };

    const rankInfo = getRank(xp);
    const level = Math.floor(xp / 100) + 1;

    // Fetch Group Title & Parent Name
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                // 1. Fetch Group Name
                if (userProfile?.groupId) {
                    try {
                        const groupSnap = await getDoc(doc(db, 'groups', userProfile.groupId));
                        if (groupSnap.exists() && isMounted) {
                            const gData = groupSnap.data();
                            setGroupName(gData.title || gData.name || gData.groupName || userProfile.groupTitle || userProfile.groupName || userProfile.groupId);
                        } else if (isMounted) {
                            setGroupName(userProfile.groupTitle || userProfile.groupName || userProfile.groupId);
                        }
                    } catch {
                        if (isMounted) setGroupName(userProfile.groupTitle || userProfile.groupName || userProfile.groupId);
                    }
                } else if (user?.email || userProfile?.parentPhone || userProfile?.childName) {
                    const allPendingSnap = await getDocs(collection(db, 'pending_students'));
                    let foundName = '';
                    allPendingSnap.forEach(d => {
                        const data = d.data();
                        const cleanParentP = userProfile?.parentPhone ? userProfile.parentPhone.replace(/\D/g, '') : '';
                        const cleanDataP = data.parentPhone ? data.parentPhone.replace(/\D/g, '') : '';
                        const cName = data.childFullName ? data.childFullName.trim().toLowerCase() : '';
                        const uName = (userProfile?.displayName || userProfile?.childFullName || userProfile?.childName || userProfile?.name || '').trim().toLowerCase();

                        if ((cleanParentP && cleanDataP && cleanParentP === cleanDataP) || (cName && uName && (cName === uName || uName.includes('тепляшин')))) {
                            foundName = data.groupName || data.groupTitle || data.groupId || '';
                        }
                    });

                    if (isMounted) {
                        setGroupName(foundName || 'Группа Спарты');
                    }
                } else if (isMounted) {
                    setGroupName('Основная команда');
                }

                // 2. Fetch Parent Name if linked via parentId
                if (userProfile?.parentId) {
                    try {
                        const parentSnap = await getDoc(doc(db, 'users', userProfile.parentId));
                        if (parentSnap.exists() && isMounted) {
                            const pData = parentSnap.data();
                            setParentName(pData.displayName || pData.parentName || pData.name || pData.childName || pData.phone || 'Родитель');
                        }
                    } catch (e) {
                        console.error('Error fetching parent doc:', e);
                    }
                }
            } catch (err) {
                console.error('Error fetching KidDashboard data:', err);
                if (isMounted) setGroupName('Группа Спарты');
            } finally {
                if (isMounted) setLoadingGroup(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [userProfile, user]);

    const studentName = userProfile?.displayName || userProfile?.childFullName || userProfile?.childName || userProfile?.childFirstName || userProfile?.name || 'Молодой Атлет';
    const streak = userProfile?.streak || 5;
    const completedWorkouts = userProfile?.completedWorkoutsCount || (userProfile?.achievements?.length || 3) * 4;
    const attendanceRate = userProfile?.attendanceRate || '96%';

    return (
        <div className="space-y-4 pt-0 mt-0 pb-20 md:pb-8 px-1 md:px-0">
            {/* LINK REQUEST BANNER */}
            {pendingLinkRequest && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-gradient-to-r from-sparta-gold/20 via-yellow-500/10 to-transparent border border-sparta-gold/40 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden"
                >
                    <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-2xl bg-sparta-gold text-black flex items-center justify-center font-black shrink-0">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-sparta-gold tracking-[0.2em]">Запрос на привязку аккаунта</p>
                            <p className="text-base font-russo text-white uppercase tracking-wider">
                                Родитель <span className="text-sparta-gold">{pendingLinkRequest.parentName || 'Родитель'}</span> хочет привязать ваш профиль
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto z-10">
                        <button
                            onClick={handleRejectLink}
                            className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Отклонить
                        </button>
                        <button
                            onClick={handleAcceptLink}
                            className="flex-1 md:flex-none px-6 py-3 bg-sparta-gold hover:bg-yellow-400 text-black font-russo rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-sparta-gold/20 transition-all"
                        >
                            Принять
                        </button>
                    </div>
                </motion.div>
            )}

            {/* HERO CARD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[#1c1c1e] via-[#141416] to-[#0a0a0c] p-5 sm:p-8 md:p-10 border border-sparta-gold/20 shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-sparta-gold/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Активный спортсмен
                            </span>
                            {parentName && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-[10px] sm:text-xs font-medium">
                                    👨‍👩‍👦 Привязан к родителю: <strong className="text-sparta-gold">{parentName}</strong>
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-russo text-white uppercase tracking-tight">
                            Дневник Спортсмена
                        </h1>
                        <p className="text-lg sm:text-xl font-bold text-sparta-gold tracking-wide">
                            {studentName}
                        </p>

                        <div className="flex items-center gap-2 text-white/60 text-xs sm:text-sm font-medium">
                            <Users size={16} className="text-sparta-gold" />
                            <span>Группа: <strong className="text-white">{loadingGroup ? 'Загрузка...' : groupName}</strong></span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 self-stretch lg:self-auto bg-white/5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-md">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-sparta-gold/20 to-yellow-500/10 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold shadow-inner shrink-0">
                            <Trophy className="w-7 h-7 sm:w-9 sm:h-9" />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-white/40">Уровень {level}</p>
                            <p className="text-lg sm:text-xl font-russo text-white uppercase tracking-wider">{rankInfo.title} {rankInfo.badge}</p>
                            <p className="text-xs text-sparta-gold font-bold">{xp} / {maxXp} XP</p>
                        </div>
                    </div>
                </div>

                {/* GAMIFICATION XP PROGRESS BAR */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold tracking-wider">
                        <span className="text-white/60 uppercase flex items-center gap-1.5">
                            <Sparkles size={14} className="text-sparta-gold" />
                            Прогресс до следующего ранга
                        </span>
                        <span className="text-sparta-gold font-mono font-black">{xpPercent}%</span>
                    </div>
                    <div className="h-3.5 sm:h-4 bg-black/60 rounded-full p-1 border border-white/10 overflow-hidden shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${xpPercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full bg-gradient-to-r ${rankInfo.color} shadow-[0_0_15px_rgba(255,215,0,0.4)]`}
                        />
                    </div>
                </div>
            </motion.div>

            {/* TOP SHOWCASE WIDGET: YOUR AWARDS SHOWCASE (IMMEDIATELY BELOW STATUS/XP HERO CARD) */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-[2.5rem] bg-gradient-to-br from-[#1c1c1e] via-[#151518] to-[#0c0c0e] border border-sparta-gold/30 shadow-2xl space-y-4"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold font-russo shadow-md">
                            🏆
                        </div>
                        <div>
                            <h3 className="text-lg font-russo text-white uppercase tracking-wider flex items-center gap-2">
                                Твоя витрина наград
                                <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                                    {Object.keys(userAchMap).length} получено
                                </span>
                            </h3>
                            <p className="text-xs text-white/50">Главные бейджи и достижения твоего профиля</p>
                        </div>
                    </div>

                    <button
                        onClick={() => onTabChange('achievements')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-sparta-gold/10 hover:bg-sparta-gold/20 text-sparta-gold rounded-xl text-xs font-bold uppercase tracking-wider border border-sparta-gold/30 transition-all hover:scale-105"
                    >
                        <span>Все награды</span>
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* SHOWCASE CARDS ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {unlockedBadges.length > 0 ? (
                        unlockedBadges.map((def: any) => {
                            const isLegendary = def.rarity === 'legendary';
                            const isRare = def.rarity === 'rare';
                            const ach = userAchMap[def.id];

                            return (
                                <motion.div
                                    key={def.id}
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    onClick={() => onTabChange('achievements')}
                                    className={`p-4 rounded-2xl border flex flex-col items-center text-center cursor-pointer relative overflow-hidden transition-all shadow-lg ${
                                        isLegendary
                                            ? 'bg-gradient-to-br from-[#2a2a2a] via-[#3a2e15] to-[#1a1a1a] border-yellow-500/50 shadow-yellow-500/10'
                                            : isRare
                                                ? 'bg-gradient-to-br from-[#1a2a3a] via-[#1a3a4a] to-[#1a1a1a] border-blue-500/50 shadow-blue-500/10'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-black/60 text-sparta-gold border border-sparta-gold/30">
                                        {def.rarity}
                                    </div>

                                    <div className="w-16 h-16 my-2 relative flex items-center justify-center">
                                        <div className={`absolute inset-0 blur-xl opacity-40 rounded-full ${isLegendary ? 'bg-yellow-500' : isRare ? 'bg-blue-500' : 'bg-white'}`} />
                                        {def.mediaUrl ? (
                                            <img src={def.mediaUrl} className="w-14 h-14 object-contain relative z-10 drop-shadow-md" alt={def.title} />
                                        ) : (
                                            <Trophy size={40} className={isLegendary ? 'text-yellow-500' : isRare ? 'text-blue-400' : 'text-white/80'} />
                                        )}
                                    </div>

                                    <h4 className="font-russo text-xs text-white leading-tight line-clamp-1 mb-1">{def.title}</h4>
                                    <p className="text-[10px] text-sparta-gold font-mono font-bold">
                                        {ach?.date ? new Date(ach.date).toLocaleDateString() : 'Получено'}
                                    </p>
                                </motion.div>
                            );
                        })
                    ) : (
                        // Teaser placeholders if no badges unlocked yet
                        [1, 2, 3, 4].map((idx) => (
                            <div
                                key={idx}
                                onClick={() => onTabChange('achievements')}
                                className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center text-center cursor-pointer hover:border-sparta-gold/40 transition-all opacity-60 hover:opacity-100"
                            >
                                <div className="w-12 h-12 my-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                                    <Trophy size={24} />
                                </div>
                                <h4 className="font-russo text-xs text-white/40 mb-1">Слот Награды #{idx}</h4>
                                <p className="text-[9px] text-white/30">Тренируйся для взлома</p>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <motion.div
                    whileHover={{ y: -4 }}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Dumbbell size={64} className="text-sparta-gold" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center text-sparta-gold mb-4">
                        <Activity size={24} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Тренировки</p>
                    <h3 className="text-3xl font-russo text-white">{completedWorkouts} <span className="text-sm font-sans font-normal text-white/40">проведено</span></h3>
                </motion.div>

                <motion.div
                    whileHover={{ y: -4 }}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Flame size={64} className="text-orange-500" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-4">
                        <Flame size={24} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Стрик активности</p>
                    <h3 className="text-3xl font-russo text-white">{streak} <span className="text-sm font-sans font-normal text-white/40">дней подряд</span></h3>
                </motion.div>

                <motion.div
                    whileHover={{ y: -4 }}
                    className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldCheck size={64} className="text-emerald-400" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                        <CheckCircle2 size={24} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">Посещаемость</p>
                    <h3 className="text-3xl font-russo text-white">{attendanceRate} <span className="text-sm font-sans font-normal text-white/40">дисциплина</span></h3>
                </motion.div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="space-y-4">
                <h3 className="text-xl font-russo text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="text-sparta-gold" size={20} />
                    Быстрые действия
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTabChange('requests')}
                        className="p-6 rounded-3xl bg-gradient-to-br from-sparta-gold/20 via-white/5 to-transparent border border-sparta-gold/30 text-left transition-all hover:border-sparta-gold group shadow-lg"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-sparta-gold text-black flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform shadow-md">
                            <Calendar size={24} />
                        </div>
                        <h4 className="text-lg font-russo text-white mb-1 group-hover:text-sparta-gold transition-colors">Моё расписание</h4>
                        <p className="text-xs text-white/50">Просмотр графика тренировок и занятий</p>
                        <div className="mt-4 flex items-center text-xs font-bold text-sparta-gold gap-1">
                            <span>Открыть</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTabChange('messages_unified')}
                        className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/20 via-white/5 to-transparent border border-blue-500/30 text-left transition-all hover:border-blue-400 group shadow-lg"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform shadow-md">
                            <MessageSquare size={24} />
                        </div>
                        <h4 className="text-lg font-russo text-white mb-1 group-hover:text-blue-400 transition-colors">Чат с тренером</h4>
                        <p className="text-xs text-white/50">Задать вопрос и получить рекомендации</p>
                        <div className="mt-4 flex items-center text-xs font-bold text-blue-400 gap-1">
                            <span>Написать</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTabChange('achievements')}
                        className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-white/5 to-transparent border border-amber-500/30 text-left transition-all hover:border-amber-400 group shadow-lg"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-black flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform shadow-md">
                            <Award size={24} />
                        </div>
                        <h4 className="text-lg font-russo text-white mb-1 group-hover:text-amber-400 transition-colors">Достижения & Награды</h4>
                        <p className="text-xs text-white/50">Бейджи, значки и рекорды сезона</p>
                        <div className="mt-4 flex items-center text-xs font-bold text-amber-400 gap-1">
                            <span>Смотреть все</span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default KidDashboard;

