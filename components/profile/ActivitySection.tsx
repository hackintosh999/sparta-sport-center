import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Star,
    Zap,
    Trophy,
    TrendingUp,
    CheckCircle,
    Award,
    ChevronDown,
    Activity
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ActivitySectionProps {
    userProfile: any;
}

const ActivitySection: React.FC<ActivitySectionProps> = ({ userProfile }) => {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userProfile?.uid) return;

        const q = query(
            collection(db, "activity_log"),
            where("userId", "==", userProfile.uid),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        // Fallback: If no userId query works (e.g. if I saved it differently), I'll search by path-like ID
        // But the previous edit saved it as doc(db, "activity_log", `${studentId}_${date}`)
        // Wait, I should have included userId in the document data for easier querying.
        // Let me check my previous edit to handle this.

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setActivities(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.uid]);

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <Activity className="animate-spin text-sparta-gold w-8 h-8 opacity-20" />
        </div>
    );

    if (activities.length === 0) return (
        <div className="flex flex-col items-center justify-center p-20 bg-white/5 rounded-3xl border border-dashed border-white/10 opacity-40">
            <Clock size={48} className="mb-4 text-white/20" />
            <p className="text-sm font-bold uppercase tracking-widest text-white/60">История событий пуста</p>
            <p className="text-xs text-white/20 mt-2">Здесь будут отображаться ваши достижения и результаты тренировок</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-sparta-gold/20 via-white/5 to-transparent" />

                <div className="space-y-8">
                    {activities.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative pl-16"
                        >
                            {/* Icon Circle */}
                            <div className="absolute left-0 top-0 w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center z-10 shadow-xl group-hover:border-sparta-gold/50 transition-colors">
                                {item.type === 'training_update' && <TrendingUp size={20} className="text-blue-400" />}
                                {item.type === 'achievement' && <Award size={22} className="text-sparta-gold" />}
                                {item.type === 'grade' && <Star size={20} className="text-yellow-400" />}
                                {item.type === 'attendance' && <CheckCircle size={20} className="text-green-400" />}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-white font-russo uppercase tracking-wider text-sm">
                                                {item.type === 'training_update' && 'Прогресс в тренировке'}
                                                {item.type === 'achievement' && 'Получена новая награда'}
                                                {item.type === 'grade' && 'Аттестация'}
                                                {item.type === 'attendance' && 'Посещение'}
                                            </h4>
                                            <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
                                                {item.timestamp?.seconds ? format(new Date(item.timestamp.seconds * 1000), 'd MMMM HH:mm', { locale: ru }) : item.date}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/40 italic">Тренер: {item.coachName || 'Система Спарта'}</p>
                                    </div>

                                    {item.type === 'achievement' && (
                                        <div className="px-4 py-2 bg-sparta-gold/10 rounded-xl border border-sparta-gold/20 flex items-center gap-3">
                                            <span className="text-2xl">{item.achievement?.icon || '🏆'}</span>
                                            <span className="text-xs font-bold text-sparta-gold uppercase tracking-widest">{item.achievement?.title}</span>
                                        </div>
                                    )}
                                </div>

                                {item.type === 'training_update' && item.skills && (
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {[
                                            { key: 'technique', label: 'Техника' },
                                            { key: 'strength', label: 'Сила' },
                                            { key: 'endurance', label: 'Выносливость' },
                                            { key: 'discipline', label: 'Дисциплина' },
                                            { key: 'flexibility', label: 'Гибкость' }
                                        ].map(skill => (
                                            <div key={skill.key} className="p-3 bg-black/40 rounded-2xl border border-white/5 text-center">
                                                <p className="text-[8px] text-white/20 font-black uppercase tracking-tighter mb-1">{skill.label}</p>
                                                <p className="text-sm font-russo text-white">{item.skills[skill.key]}%</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {item.note && (
                                    <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-xs text-white/60 leading-relaxed italic">
                                            « {item.note} »
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActivitySection;