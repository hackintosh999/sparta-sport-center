import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    Zap,
    Trophy,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Info,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Activity,
    Medal,
    Flame,
    Star
} from 'lucide-react';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    isSameDay,
    startOfDay,
    subMonths,
    addMonths
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface AttendanceSectionProps {
    userProfile: any;
}

const AttendanceSection: React.FC<AttendanceSectionProps> = ({ userProfile }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<any>(null);

    useEffect(() => {
        if (!userProfile?.groupId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "attendance"),
            where("groupId", "==", userProfile.groupId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAttendanceData(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile?.groupId]);

    const activeChildUid = userProfile?.id || userProfile?.uid;

    // Helper to get my status for a specific date
    const getMyStatusForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = attendanceData.find(a => a.date === dateStr);
        if (!dayData || !activeChildUid) return null;

        const record = dayData.records?.[activeChildUid];
        if (typeof record === 'string') {
            return { status: record, note: '' };
        }
        return record || null;
    };

    // Calculate Stats
    const stats = (() => {
        if (!activeChildUid) return { streak: 0, attendanceRate: 0, totalSessions: 0, presentCount: 0 };
        const myAttendances = attendanceData.filter(a => {
            const r = a.records?.[activeChildUid];
            const status = typeof r === 'string' ? r : r?.status;
            return status === 'present' || status === 'PRESENT';
        });

        // Current Streak
        let streak = 0;
        const sortedData = [...attendanceData].sort((a, b) => b.date.localeCompare(a.date));
        for (const day of sortedData) {
            const r = day.records?.[activeChildUid];
            const status = typeof r === 'string' ? r : r?.status;
            if (status === 'present' || status === 'PRESENT') streak++;
            else if (status) break;
        }

        const totalSessions = attendanceData.length;
        const presentCount = myAttendances.length;
        const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

        return { streak, attendanceRate, totalSessions, presentCount };
    })();

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    if (!userProfile?.groupId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-3xl border border-white/10 opacity-60">
                <Activity size={48} className="text-white/20 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Группа не выбрана</h3>
                <p className="text-white/40 max-w-xs">Чтобы отслеживать посещаемость, необходимо вступить в одну из наших спортивных групп.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 p-6 rounded-3xl relative overflow-hidden group"
                >
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Zap size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-orange-500/20 rounded-xl text-orange-500">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/60">Текущий страйк</span>
                        </div>
                        <div>
                            <span className="text-5xl font-russo text-white">{stats.streak}</span>
                            <span className="text-sm text-white/40 ml-2 uppercase font-black">дней</span>
                        </div>
                        <p className="text-[10px] text-white/40 mt-4 leading-relaxed">
                            {stats.streak > 5 ? 'Ты в огне! Продолжай в том же духе!' : 'Чем больше тренировок подряд, тем ближе результат.'}
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-black/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-sparta-gold/20 rounded-xl text-sparta-gold">
                                <Activity size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Активность</span>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <span className="text-5xl font-russo text-white">{stats.attendanceRate}</span>
                                <span className="text-2xl font-russo text-sparta-gold">%</span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <p className="text-[10px] font-black text-white/40 uppercase">Посещено</p>
                                <p className="text-sm font-bold text-white">{stats.presentCount} / {stats.totalSessions}</p>
                            </div>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.attendanceRate}%` }}
                                className="h-full bg-gradient-to-r from-sparta-gold to-yellow-500"
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="bg-black/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden group"
                >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                                <Trophy size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Статус атлета</span>
                        </div>
                        <div>
                            <p className="text-2xl font-russo text-white uppercase tracking-tight">
                                {stats.presentCount >= 20 ? 'ВЕТЕРАН' : stats.presentCount >= 10 ? 'АТЛЕТ' : 'НОВИЧОК'}
                            </p>
                            <p className="text-[10px] text-white/30 mt-1 uppercase font-black">
                                Следующий уровень через: {Math.max(0, (stats.presentCount < 10 ? 10 : 20) - stats.presentCount)} занятий
                            </p>
                        </div>
                        <div className="mt-4 flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`flex-1 h-1 rounded-full ${i <= (stats.presentCount % 10) ? 'bg-sparta-gold' : 'bg-white/5'}`} />
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Achievements Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-black/40 border border-white/5 rounded-3xl p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-sparta-gold font-russo uppercase tracking-wider">
                        <Trophy size={18} />
                        <h3>Мои достижения</h3>
                    </div>
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                        Открыто: {
                            [
                                stats.presentCount >= 1,
                                stats.presentCount >= 10,
                                stats.presentCount >= 25,
                                stats.streak >= 5,
                                (stats.attendanceRate === 100 && stats.totalSessions >= 4)
                            ].filter(Boolean).length
                        } / 5
                    </span>
                </div>

                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {[
                        { id: 'first', title: 'Первый шаг', desc: 'Первая тренировка', icon: Zap, condition: stats.presentCount >= 1 },
                        { id: 'bronze', title: 'Атлет', desc: '10 тренировок', icon: Medal, condition: stats.presentCount >= 10 },
                        { id: 'silver', title: 'Мастер', desc: '25 тренировок', icon: Star, condition: stats.presentCount >= 25 },
                        { id: 'streak_5', title: 'Дисциплина', desc: '5 в ряд', icon: Flame, condition: stats.streak >= 5 },
                        { id: 'perfect', title: 'Идеал', desc: '100% за месяц', icon: CheckCircle2, condition: stats.attendanceRate === 100 && stats.totalSessions >= 4 },
                    ].map((ach) => {
                        const Icon = ach.icon;
                        return (
                            <motion.div
                                key={ach.id}
                                whileHover={ach.condition ? { y: -5, scale: 1.02 } : {}}
                                className={`flex-shrink-0 w-32 p-4 rounded-2xl border flex flex-col items-center text-center transition-all duration-500 ${ach.condition
                                        ? 'bg-gradient-to-b from-sparta-gold/10 to-transparent border-sparta-gold/30 shadow-[0_10px_20px_rgba(255,190,0,0.05)]'
                                        : 'bg-white/5 border-white/5 opacity-30 grayscale'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors duration-500 ${ach.condition ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(255,190,0,0.3)]' : 'bg-white/10 text-white/20'
                                    }`}>
                                    <Icon size={24} fill={ach.condition && ach.id !== 'perfect' ? 'currentColor' : 'none'} />
                                </div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${ach.condition ? 'text-white' : 'text-white/40'}`}>{ach.title}</p>
                                <p className="text-[8px] text-white/30 uppercase leading-tight font-bold">{ach.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Card */}
                <div className="lg:col-span-2 bg-black/40 border border-white/5 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <CalendarIcon size={20} className="text-sparta-gold" />
                            <h3 className="text-lg font-bold text-white capitalize">
                                {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                            <div key={day} className="text-center text-[10px] font-black uppercase text-white/20 pb-2">
                                {day}
                            </div>
                        ))}

                        {/* Placeholder for empty days at start of month */}
                        {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {monthDays.map(day => {
                            const res = getMyStatusForDate(day);
                            const isSelected = selectedDay && isSameDay(day, selectedDay.date);

                            return (
                                <motion.div
                                    key={day.toISOString()}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => res && setSelectedDay({ date: day, ...res })}
                                    className={`relative aspect-square rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${isToday(day) ? 'ring-2 ring-sparta-gold ring-offset-2 ring-offset-[#050505]' : ''
                                        } ${(res?.status === 'present' || res?.status === 'PRESENT') ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                                            (res?.status === 'absent' || res?.status === 'MISSED_BURNT') ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                                                (res?.status === 'sick' || res?.status === 'EXCUSED') ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                                                    'bg-white/5 border-white/5 text-white/20'
                                        } ${isSelected ? 'border-sparta-gold shadow-[0_0_15px_rgba(255,190,0,0.2)]' : ''}`}
                                >
                                    <span className="text-xs font-bold">{format(day, 'd')}</span>
                                    {res?.note && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-sparta-gold rounded-full shadow-[0_0_5px_rgba(255,190,0,0.5)]" />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2 opacity-60">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white">Был</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-60">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white">Пропуск</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-60">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white">Болел</span>
                        </div>
                    </div>
                </div>

                {/* Info Card / Feedback Timeline */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {selectedDay ? (
                            <motion.div
                                key="selected"
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="bg-gradient-to-br from-sparta-gold/10 to-transparent border border-sparta-gold/20 rounded-3xl p-6"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <h4 className="font-bold text-white flex flex-col">
                                        <span className="text-[10px] uppercase text-sparta-gold tracking-widest mb-1">Детали занятия</span>
                                        {format(selectedDay.date, 'd MMMM yyyy', { locale: ru })}
                                    </h4>
                                    <button onClick={() => setSelectedDay(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-white/20">
                                        <XCircle size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                                        <div className={`p-2 rounded-xl ${selectedDay.status === 'present' ? 'bg-green-500/20 text-green-500' :
                                                selectedDay.status === 'absent' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {selectedDay.status === 'present' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black uppercase text-white/30 tracking-widest">Результат</p>
                                            <p className="text-lg font-russo text-white">
                                                {selectedDay.status === 'present' ? 'Присутствовал' : selectedDay.status === 'sick' ? 'Болел' : 'Пропуск'}
                                            </p>
                                        </div>
                                        {selectedDay.grade && (
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-sparta-gold tracking-widest">Оценка</p>
                                                <p className="text-2xl font-russo text-white">{selectedDay.grade}<span className="text-xs text-white/40">/10</span></p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedDay.xp > 0 && (
                                        <div className="flex items-center gap-3 bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                                <Zap size={20} fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-xs">Бонус за активность</p>
                                                <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">+{selectedDay.xp} XP начислено</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedDay.note && (
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                                            <div className="flex items-center gap-2 text-sparta-gold">
                                                <MessageSquare size={14} />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Комментарий тренера</p>
                                            </div>
                                            <p className="text-sm italic text-white/70 leading-relaxed font-medium">«{selectedDay.note}»</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="bg-black/40 border border-white/5 rounded-3xl p-6 h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                                    <Clock size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-bold text-white">Выберите день в календаре</h4>
                                    <p className="text-xs text-white/30 leading-relaxed max-w-[200px] mx-auto uppercase font-black tracking-widest">
                                        Нажмите на любую дату с отметкой, чтобы увидеть подробности и комментарии тренера
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default AttendanceSection;