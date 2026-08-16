import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, SectionHeader } from './UIComponents';
import { ChevronRight, Calendar as CalendarIcon, Clock, Sparkles } from 'lucide-react';
import { SPARTA_SCHEDULE, ScheduleSlot } from '../constants/spartaSchedule';

interface DaySchedule {
    id: string;
    dayName: string;
    slots: ScheduleSlot[];
}

const WEEKLY_DAYS: DaySchedule[] = [
    {
        id: 'mon',
        dayName: 'Понедельник',
        slots: SPARTA_SCHEDULE.filter(s => s.days.includes('Пн'))
    },
    {
        id: 'wed',
        dayName: 'Среда',
        slots: SPARTA_SCHEDULE.filter(s => s.days.includes('Ср'))
    },
    {
        id: 'fri',
        dayName: 'Пятница',
        slots: SPARTA_SCHEDULE.filter(s => s.days.includes('Пт'))
    },
    {
        id: 'sat',
        dayName: 'Суббота',
        slots: SPARTA_SCHEDULE.filter(s => s.days.includes('Сб'))
    },
    {
        id: 'sun',
        dayName: 'Воскресенье',
        slots: SPARTA_SCHEDULE.filter(s => s.days.includes('Вс'))
    }
];

export const ScheduleSection = () => {
    const [selectedDayId, setSelectedDayId] = useState<string>('mon');
    const currentDay = WEEKLY_DAYS.find(d => d.id === selectedDayId) || WEEKLY_DAYS[0];

    return (
        <section id="schedule" className="py-24 relative overflow-hidden bg-black">
            {/* Background Overlay */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <img
                    src="/bg-schedule-v6.png"
                    alt="Stadium Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
            </div>

            <Container className="relative z-10">
                <SectionHeader
                    title="РАСПИСАНИЕ ТРЕНИРОВОК"
                    subtitle="Интерактивный календарь занятий по дням недели для всех возрастных групп Sparta."
                />

                <div className="flex flex-col lg:flex-row gap-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden p-3 sm:p-4">
                    {/* Days Sidebar */}
                    <div className="lg:w-1/3 bg-black/50 p-4 rounded-2xl flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible scrollbar-none">
                        {WEEKLY_DAYS.map((day) => {
                            const isSelected = day.id === currentDay.id;
                            return (
                                <button
                                    key={day.id}
                                    onClick={() => setSelectedDayId(day.id)}
                                    className={`flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-300 text-left min-w-[180px] lg:min-w-0 border ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-amber-400/20 to-yellow-500/10 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                            : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                                            isSelected ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/60'
                                        }`}>
                                            <CalendarIcon size={18} />
                                        </div>
                                        <div>
                                            <span className="font-russo tracking-wider text-base text-white block">{day.dayName}</span>
                                            <span className="text-[10px] text-white/50">{day.slots.length} группы в этот день</span>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        size={18}
                                        className={`transition-transform duration-300 ${isSelected ? 'text-amber-400 rotate-90 lg:rotate-0' : 'opacity-0'}`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {/* Schedule Content */}
                    <div className="lg:w-2/3 p-2 sm:p-4 lg:p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentDay.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <h3 className="font-russo text-xl text-white flex items-center gap-2">
                                        <span>Тренировки на</span>
                                        <span className="text-amber-400">{currentDay.dayName}</span>
                                    </h3>
                                    <span className="text-xs text-white/50">{currentDay.slots.length} группы в графике</span>
                                </div>

                                {currentDay.slots.map((slot, idx) => (
                                    <motion.div
                                        key={slot.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.08 }}
                                        className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 hover:bg-white/10 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 font-mono text-sm font-bold">
                                                <Clock size={22} />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-base font-bold text-amber-300">{slot.time}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                        slot.streamType === 'weekday'
                                                            ? 'bg-blue-400/15 border-blue-400/30 text-blue-300'
                                                            : 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300'
                                                    }`}>
                                                        {slot.streamTitle}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-white text-sm leading-tight group-hover:text-amber-300 transition-colors">
                                                    Группа {slot.ageGroupLabel}
                                                </h4>

                                                <p className="text-xs text-white/70 mt-1 flex items-center gap-2">
                                                    <span>Тренер: <strong>{slot.coachName}</strong></span>
                                                </p>
                                            </div>
                                        </div>

                                        {slot.physioBadge && (
                                            <div className="text-[10px] font-semibold text-amber-200/90 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0">
                                                <Sparkles size={12} className="text-amber-400" />
                                                <span>{slot.physioBadge}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default ScheduleSection;
