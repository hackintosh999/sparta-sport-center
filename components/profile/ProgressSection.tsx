import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Target,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    Star,
    Activity,
    CheckCircle2,
    MessageSquare,
    Zap,
    Sparkles
} from 'lucide-react';
import {
    format,
    subMonths,
    endOfMonth,
    eachMonthOfInterval
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs, limit, Timestamp } from 'firebase/firestore';
import { GlassCard } from '../UIComponents';

interface ProgressSectionProps {
    userProfile: any;
}

const ProgressSection: React.FC<ProgressSectionProps> = ({ userProfile }) => {
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [recentMilestones, setRecentMilestones] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    useEffect(() => {
        const fetchProgressData = async () => {
            const uid = userProfile?.uid || userProfile?.id;
            if (!uid) return;
            setLoading(true);

            try {
                const now = new Date();
                const sixMonthsAgo = subMonths(now, 6);

                // Fetch Activity Log for Skill History and Achievements (Manual logs from coaches)
                const qActivity = query(
                    collection(db, "activity_log"),
                    where("userId", "==", uid),
                    where("timestamp", ">=", Timestamp.fromDate(sixMonthsAgo)),
                    orderBy("timestamp", "asc")
                );

                const activitySnap = await getDocs(qActivity);
                const activities = activitySnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        date: (data.timestamp as Timestamp).toDate(),
                    };
                }) as any[];

                // Process Skill History from manual updates
                const monthIntervals = eachMonthOfInterval({
                    start: sixMonthsAgo,
                    end: now
                });

                const skillHistory = monthIntervals.map(month => {
                    const monthEnd = endOfMonth(month);
                    const monthUpdate = [...activities]
                        .reverse()
                        .find(a => a.date <= monthEnd && a.type === 'training_update');

                    return {
                        month: format(month, 'MMM', { locale: ru }),
                        fullName: format(month, 'MMMM yyyy', { locale: ru }),
                        skills: monthUpdate?.skills || userProfile.skills || {
                            technique: 0,
                            strength: 0,
                            endurance: 0,
                            discipline: 0,
                            flexibility: 0
                        }
                    };
                });

                setHistoryData(skillHistory);

                // Extract Milestones (Manual)
                const milestones = activities
                    .filter(a => a.type === 'achievement' || (a.type === 'training_update' && a.isSignificant))
                    .reverse()
                    .slice(0, 5);
                setRecentMilestones(milestones);

                // Group Announcements
                if (userProfile.groupId) {
                    const qAnn = query(
                        collection(db, "announcements"),
                        where("groupId", "==", userProfile.groupId),
                        orderBy("createdAt", "desc"),
                        limit(3)
                    );
                    const annSnap = await getDocs(qAnn);
                    setAnnouncements(annSnap.docs.map(d => ({
                        id: d.id,
                        ...d.data(),
                        date: d.data().createdAt?.toDate() || new Date()
                    })));
                }

            } catch (error) {
                console.error("Error fetching progress data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProgressData();
    }, [userProfile?.uid, userProfile?.id, userProfile.groupId]);

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <Activity className="animate-spin text-sparta-gold w-10 h-10" />
        </div>
    );

    const GrowthSummary = ({ data }: { data: any[] }) => {
        if (data.length < 1) return null;
        const current = data[data.length - 1].skills;
        const previous = data.length > 1 ? data[data.length - 2].skills : current;

        const skills = [
            { id: 'technique', label: 'Техника', icon: <Award size={16} /> },
            { id: 'strength', label: 'Сила', icon: <Zap size={16} /> },
            { id: 'endurance', label: 'Выносливость', icon: <Activity size={16} /> },
            { id: 'discipline', label: 'Дисциплина', icon: <Target size={16} /> },
            { id: 'flexibility', label: 'Гибкость', icon: <Sparkles size={16} /> }
        ];

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {skills.map(skill => {
                    const diff = current[skill.id] - previous[skill.id];
                    return (
                        <div key={skill.id} className="p-6 bg-white/5 border border-white/5 rounded-[2rem] group hover:border-white/20 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-white/10 text-white/70 group-hover:text-white transition-colors">
                                    {skill.icon}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{skill.label}</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-russo text-white">{current[skill.id]}%</span>
                                {diff !== 0 && (
                                    <div className={`flex items-center gap-1 text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {diff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        <span>{Math.abs(diff)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Top Section: Skill Growth Summary */}
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h4 className="text-2xl font-russo text-white uppercase tracking-tight">Твой рост</h4>
                        <p className="text-white/40 text-sm">Процесс развития на основе оценок тренера</p>
                    </div>
                </div>
                <GrowthSummary data={historyData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Milestones (Manual) */}
                <div className="space-y-6">
                    <h4 className="text-xl font-russo text-white uppercase tracking-tight flex items-center gap-3">
                        <Star className="text-sparta-gold" size={24} />
                        Ключевые вехи
                    </h4>
                    <div className="space-y-3">
                        {recentMilestones.length > 0 ? (
                            recentMilestones.map((m, i) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-5 bg-white/5 border border-white/5 rounded-[24px] hover:border-sparta-gold/30 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${m.type === 'achievement' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                            {m.type === 'achievement' ? '🏆' : '🔥'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h5 className="text-white font-bold text-sm group-hover:text-sparta-gold transition-colors">{m.title || (m.type === 'achievement' ? 'Новая награда' : 'Прогресс в тренировках')}</h5>
                                                <span className="text-[9px] text-white/20 font-bold uppercase">{format(m.date, 'd MMMM', { locale: ru })}</span>
                                            </div>
                                            <p className="text-white/40 text-[11px] mt-1 leading-relaxed">
                                                {m.description || (m.type === 'achievement' ? 'Награда получена за особые заслуги' : `Значительный рост навыков под руководством тренера ${m.coachName || ''}`)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="p-12 text-center bg-white/5 rounded-[32px] border border-white/5 opacity-40">
                                <p className="text-xs font-bold uppercase tracking-widest">Вех пока нет</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-6">
                    <h4 className="text-xl font-russo text-white uppercase tracking-tight flex items-center gap-3">
                        <Target className="text-blue-400" size={24} />
                        Рекомендации по росту
                    </h4>
                    <GlassCard className="p-8 border-white/10 relative overflow-hidden h-full">
                        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

                        <div className="space-y-6 relative z-10">
                            <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xs uppercase tracking-tight mb-1">Сильные стороны</p>
                                    <p className="text-white/40 text-[10px] leading-relaxed">
                                        На основе данных, ваша дисциплина и техника стабильно растут. Это отличный фундамент для перехода на новый уровень.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xs uppercase tracking-tight mb-1">Зона роста</p>
                                    <p className="text-white/40 text-[10px] leading-relaxed">
                                        Попробуйте уделить больше внимания выносливости. Посещение дополнительных тренировок по субботам может ускорить результат.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <p className="text-[10px] font-black uppercase text-sparta-gold tracking-widest mb-4">Твои цели</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 border-white/10 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-sparta-gold" />
                                        </div>
                                        <span className="text-xs font-bold text-white">Достичь 100% техники</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 border-white/10 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                                        </div>
                                        <span className="text-xs font-bold text-white">Пройти 10 тренировок без пропусков</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Announcements */}
                <div className="lg:col-span-2">
                    <h4 className="text-xl font-russo text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                        <MessageSquare className="text-blue-400" size={24} />
                        Новости группы
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {announcements.length > 0 ? (
                            announcements.map((ann, i) => (
                                <motion.div
                                    key={ann.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <GlassCard className="p-6 h-full border-white/5 bg-blue-500/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                    <MessageSquare size={14} />
                                                </div>
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{ann.coachName}</span>
                                            </div>
                                            <span className="text-[9px] text-white/20 font-bold">{format(ann.date, 'd MMM', { locale: ru })}</span>
                                        </div>
                                        <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                                    </GlassCard>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center bg-white/5 rounded-[32px] border border-dashed border-white/10 opacity-30">
                                <p className="text-xs font-bold uppercase tracking-widest">Новых объявлений пока нет</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressSection;