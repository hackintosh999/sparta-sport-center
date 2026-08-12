import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Calendar, Sparkles, Shield, ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SPARTA_SCHEDULE, ScheduleSlot } from '../constants/spartaSchedule';

const GroupsSection = ({ onJoinClick }: { onJoinClick?: (group?: any) => void }) => {
    const { user, userProfile } = useAuth();
    const [filter, setFilter] = useState<'all' | 'kids' | 'teens'>('all');
    const [childrenCounts, setChildrenCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Live subscription to Firestore `orders` collection to count enrolled CHILDREN only
    useEffect(() => {
        try {
            const q = query(collection(db, 'orders'), where('type', '==', 'subscription'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const counts: Record<string, number> = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.selectedScheduleId) {
                        counts[data.selectedScheduleId] = (counts[data.selectedScheduleId] || 0) + 1;
                    }
                });
                setChildrenCounts(counts);
            }, (err) => {
                console.warn('Orders realtime listener warning:', err);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error('Error setting up orders listener:', e);
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
                        <Shield size={14} /> Лимит 12 детей на наставника
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
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                                filter === f.id
                                    ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20 scale-105'
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
                        const dynamicOccupied = slot.initialOccupied + (childrenCounts[slot.id] || 0);
                        const currentOccupied = Math.min(slot.maxCapacity, dynamicOccupied);
                        const availableSeats = Math.max(0, slot.maxCapacity - currentOccupied);
                        const isFull = availableSeats <= 0;

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
                                    {/* Header Stream & Availability Badges */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                            slot.streamType === 'weekday'
                                                ? 'bg-blue-400/15 border-blue-400/30 text-blue-300'
                                                : 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
                                        }`}>
                                            {slot.streamTitle}
                                        </span>

                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                            isFull
                                                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        }`}>
                                            {isFull ? '🔴 Группа набрана' : `🟢 Свободно ${availableSeats} из ${slot.maxCapacity} мест`}
                                        </span>
                                    </div>

                                    {/* Group Title */}
                                    <h3 className="text-lg font-bold text-white font-russo group-hover:text-sparta-gold transition-colors mb-1">
                                        Группа {slot.ageGroupLabel}
                                    </h3>

                                    {/* Days & Time */}
                                    <div className="flex items-center gap-2 text-amber-400 font-russo text-sm mb-3">
                                        <Calendar size={15} className="shrink-0" />
                                        <span>{slot.days} • <span className="text-white font-mono text-xs">{slot.time}</span></span>
                                    </div>

                                    {/* Coach Card */}
                                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl mb-3">
                                        <img
                                            src={slot.coachPhoto}
                                            alt={slot.coachName}
                                            className="w-11 h-11 rounded-full object-cover border border-sparta-gold/50 shadow-[0_0_10px_rgba(212,175,55,0.3)] shrink-0"
                                        />
                                        <div>
                                            <p className="text-[10px] text-white/50 font-medium">Тренер наставник</p>
                                            <p className="text-xs font-bold text-white leading-tight">{slot.coachName}</p>
                                            <p className="text-[10px] text-amber-300/80 mt-0.5">{slot.coachTitle}</p>
                                        </div>
                                    </div>

                                    {/* 12-Dot Capacity Visual Scale */}
                                    <div className="mb-3 p-2.5 bg-black/40 border border-white/5 rounded-xl">
                                        <div className="flex items-center justify-between text-[10px] font-semibold text-white/60 mb-1.5">
                                            <span>Наполненость группы детей:</span>
                                            <span className="text-amber-300">{currentOccupied} из {slot.maxCapacity} детей</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 justify-between">
                                            {Array.from({ length: slot.maxCapacity }).map((_, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`h-2 flex-1 rounded-full transition-all ${
                                                        idx < currentOccupied
                                                            ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                                                            : 'bg-emerald-400/80 border border-emerald-300/60 animate-pulse'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Physio Badge */}
                                    {slot.physioBadge && (
                                        <div className="text-[10px] font-semibold text-amber-200/90 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 mb-4">
                                            <Sparkles size={12} className="text-amber-400 shrink-0" />
                                            <span>{slot.physioBadge}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Join Action Button */}
                                <button
                                    onClick={() => onJoinClick && onJoinClick(slot)}
                                    disabled={isFull}
                                    className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                        isFull
                                            ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-sparta-gold via-yellow-500 to-sparta-gold text-black hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.25)]'
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