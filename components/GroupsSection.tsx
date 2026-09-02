import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Calendar, Sparkles, Shield, ChevronRight, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SPARTA_SCHEDULE, ScheduleSlot } from '../constants/spartaSchedule';

const GroupsSection = ({ onJoinClick }: { onJoinClick?: (group?: any) => void }) => {
    const { user, userProfile } = useAuth();
    const [filter, setFilter] = useState<'all' | 'kids' | 'teens'>('all');
    const [liveGroupCounts, setLiveGroupCounts] = useState<Record<string, number>>({});

    // Live subscription to Firestore `students` collection to count actual enrolled athletes per group
    useEffect(() => {
        try {
            const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
                const counts: Record<string, number> = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const gId = data.groupId;
                    if (gId) {
                        counts[gId] = (counts[gId] || 0) + 1;
                    }
                });
                setLiveGroupCounts(counts);
            }, (err) => {
                console.warn('Students realtime listener warning:', err);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error('Error setting up students listener:', e);
        }
    }, []);

    const filteredSlots = SPARTA_SCHEDULE.filter(slot => {
        if (filter === 'all') return true;
        if (filter === 'kids') return slot.birthYears.some(y => y >= 2016);
        if (filter === 'teens') return slot.birthYears.some(y => y <= 2015);
        return true;
    });

    return (
        <section id="groups" className="py-20 bg-black relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sparta-gold/5 blur-[100px] rounded-full user-select-none pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sparta-gold/10 border border-sparta-gold/30 text-sparta-gold text-xs font-bold uppercase tracking-wider mb-4">
                        <Shield size={14} /> Лимит 10–12 детей на наставника
                    </div>
                    <h2 className="text-4xl md:text-5xl font-russo text-white mb-4">
                        Наши <span className="text-transparent bg-clip-text bg-gradient-to-r from-sparta-gold to-yellow-600">Группы и Расписание</span>
                    </h2>
                    <p className="text-white/60 text-base max-w-2xl mx-auto">
                        Официальная сетка тренировок с личной закрепленностью мест за детьми. 
                        Синхронизируется в реальном времени с тренерским штабом Sparta.
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-center gap-3 mb-10 flex-wrap">
                    {[
                        { id: 'all', label: 'Все 7 групп' },
                        { id: 'kids', label: 'Дошкольники и 1-3 класс (4–8 лет)' },
                        { id: 'teens', label: 'Школьники (9–12+ лет)' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                                filter === f.id
                                    ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20 scale-105 font-extrabold'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Grid of Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSlots.map((slot, idx) => {
                        const firestoreCount = (slot.firestoreGroupId && liveGroupCounts[slot.firestoreGroupId]) ?? liveGroupCounts[slot.id];
                        const currentOccupied = Math.min(
                            slot.maxCapacity,
                            firestoreCount !== undefined ? firestoreCount : slot.initialOccupied
                        );
                        const availableSeats = Math.max(0, slot.maxCapacity - currentOccupied);
                        const isFull = availableSeats <= 0;
                        const isLowSeats = availableSeats > 0 && availableSeats <= 3;
                        const fillPercent = Math.min(100, Math.round((currentOccupied / slot.maxCapacity) * 100));

                        return (
                            <motion.div
                                key={slot.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                viewport={{ once: true }}
                                className="group relative bg-[#121212] border border-white/10 hover:border-sparta-gold/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                            >
                                <div>
                                    {/* Header Stream & Status Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3.5">
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                                            slot.streamType === 'weekday'
                                                ? 'bg-blue-400/15 border-blue-400/30 text-blue-300'
                                                : 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
                                        }`}>
                                            {slot.streamTitle}
                                        </span>

                                        {/* Status Badge */}
                                        {isFull ? (
                                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                                                🔒 Набор закрыт
                                            </span>
                                        ) : isLowSeats ? (
                                            <span className="text-[11px] font-black px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 animate-pulse flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                                                <Flame size={12} className="text-amber-400 fill-amber-400" />
                                                Высокий спрос
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                                Набор открыт
                                            </span>
                                        )}
                                    </div>

                                    {/* Group Title */}
                                    <h3 className="text-xl font-bold text-white font-russo group-hover:text-sparta-gold transition-colors mb-1">
                                        Группа {slot.ageGroupLabel}
                                    </h3>

                                    {/* Days & Time */}
                                    <div className="flex items-center gap-2 text-amber-400 font-russo text-sm mb-3.5">
                                        <Calendar size={15} className="shrink-0" />
                                        <span>{slot.days} • <span className="text-white font-mono text-xs">{slot.time}</span></span>
                                    </div>

                                    {/* Coach Card */}
                                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl mb-3.5">
                                        <img
                                            src={slot.coachPhoto}
                                            alt={slot.coachName}
                                            className="w-11 h-11 rounded-full object-cover border border-sparta-gold/50 shadow-[0_0_10px_rgba(212,175,55,0.3)] shrink-0"
                                        />
                                        <div>
                                            <p className="text-[10px] text-white/50 font-medium">Тренер-наставник</p>
                                            <p className="text-xs font-bold text-white leading-tight">{slot.coachName}</p>
                                            <p className="text-[10px] text-amber-300/80 mt-0.5">{slot.coachTitle}</p>
                                        </div>
                                    </div>

                                    {/* Clean Grounded Capacity & Progress Bar */}
                                    <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl mb-3.5">
                                        <div className="flex items-center justify-between text-xs font-semibold mb-2">
                                            <span className="text-white/70">
                                                Занято: <strong className="text-white font-bold">{currentOccupied}</strong> из <span className="text-white/50">{slot.maxCapacity}</span> мест
                                            </span>
                                            {isFull ? (
                                                <span className="text-red-400 font-bold text-xs">Мест нет</span>
                                            ) : isLowSeats ? (
                                                <span className="text-amber-400 font-black text-xs flex items-center gap-1">
                                                    <Flame size={12} className="fill-amber-400" />
                                                    Осталось {availableSeats} {availableSeats === 1 ? 'место' : availableSeats <= 4 ? 'места' : 'мест'}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-400 font-bold text-xs">
                                                    Осталось {availableSeats} {availableSeats <= 4 ? 'места' : 'мест'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Smooth Progress Bar */}
                                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative mb-2.5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${fillPercent}%` }}
                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                viewport={{ once: true }}
                                                className={`h-full rounded-full transition-all ${
                                                    isFull
                                                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                                        : isLowSeats
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                                        : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                                }`}
                                            />
                                        </div>

                                        {/* Care Microtext */}
                                        <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 border-t border-white/5">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} className="text-sparta-gold" />
                                                Мини-группа до 10–12 детей
                                            </span>
                                            <span className="text-sparta-gold font-medium">Персональное внимание</span>
                                        </div>
                                    </div>

                                    {/* Physio Badge */}
                                    {slot.physioBadge && (
                                        <div className="text-[10px] font-semibold text-amber-200/90 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-xl flex items-center gap-2 mb-4">
                                            <Sparkles size={13} className="text-amber-400 shrink-0" />
                                            <span>{slot.physioBadge}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Join Action Button */}
                                <button
                                    onClick={() => onJoinClick && onJoinClick(slot)}
                                    disabled={isFull}
                                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                        isFull
                                            ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.25)] cursor-pointer'
                                    }`}
                                >
                                    <span>{isFull ? 'В лист ожидания' : 'Выбрать эту группу и записаться'}</span>
                                    <ChevronRight size={16} />
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default GroupsSection;