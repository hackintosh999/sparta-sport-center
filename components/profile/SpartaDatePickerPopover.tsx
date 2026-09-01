import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Sparkles,
    Check,
    X,
    Dumbbell,
    Clock
} from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    setMonth,
    setYear,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    subDays,
    addDays
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface SpartaDatePickerPopoverProps {
    isOpen: boolean;
    selectedDate: string; // YYYY-MM-DD
    onSelectDate: (dateStr: string) => void;
    onClose: () => void;
    messageDates?: Set<string>; // Set of 'YYYY-MM-DD' dates with messages
    trainingDays?: string[]; // e.g. ['Суббота', 'Воскресенье', 'Сб', 'Вс']
    messageCountByDate?: Record<string, number>;
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_SHORT = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

const DAY_NAME_TO_INDEX: Record<string, number> = {
    'воскресенье': 0,
    'вс': 0,
    'понедельник': 1,
    'пн': 1,
    'вторник': 2,
    'вт': 2,
    'среда': 3,
    'ср': 3,
    'четверг': 4,
    'чт': 4,
    'пятница': 5,
    'пт': 5,
    'суббота': 6,
    'сб': 6
};

export const SpartaDatePickerPopover: React.FC<SpartaDatePickerPopoverProps> = ({
    isOpen,
    selectedDate,
    onSelectDate,
    onClose,
    messageDates = new Set(),
    trainingDays = ['Суббота', 'Воскресенье'],
    messageCountByDate = {}
}) => {
    const initialMonth = useMemo(() => {
        if (selectedDate) {
            try {
                const parts = selectedDate.split('-');
                if (parts.length === 3) {
                    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                }
            } catch (e) { }
        }
        return new Date();
    }, [selectedDate]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

    // Normalize training day indices (0..6)
    const trainingDayIndices = useMemo(() => {
        const set = new Set<number>();
        for (const td of trainingDays) {
            const clean = td.toLowerCase().trim();
            if (DAY_NAME_TO_INDEX[clean] !== undefined) {
                set.add(DAY_NAME_TO_INDEX[clean]);
            }
        }
        return set;
    }, [trainingDays]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [startDate, endDate]);

    const selectedDateObj = useMemo(() => {
        if (!selectedDate) return null;
        try {
            const parts = selectedDate.split('-');
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } catch (e) {
            return null;
        }
    }, [selectedDate]);

    // Find nearest training date with messages or in schedule
    const handleJumpToTraining = () => {
        const today = new Date();
        // Look back up to 30 days for the most recent training day with messages
        for (let i = 0; i < 30; i++) {
            const check = subDays(today, i);
            const dStr = format(check, 'yyyy-MM-dd');
            if (trainingDayIndices.has(check.getDay()) && messageDates.has(dStr)) {
                onSelectDate(dStr);
                onClose();
                return;
            }
        }
        // Otherwise jump to next/current training day
        for (let i = 0; i < 7; i++) {
            const check = addDays(today, i);
            if (trainingDayIndices.has(check.getDay())) {
                onSelectDate(format(check, 'yyyy-MM-dd'));
                onClose();
                return;
            }
        }
    };

    if (!isOpen) return null;

    const renderCalendarContent = (isMobile: boolean) => (
        <>
            {/* Header: Month & Year + Interactive Nav */}
            <div className="flex items-center justify-between mb-3 px-1">
                <button
                    type="button"
                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                    className="flex items-center gap-2 group px-2.5 py-1.5 -ml-1 rounded-xl hover:bg-white/5 active:scale-95 transition-all text-left"
                    title="Выбрать месяц и год"
                >
                    <Calendar size={isMobile ? 18 : 15} className="text-sparta-gold group-hover:scale-110 transition-transform" />
                    <h4 className={`${isMobile ? 'text-base' : 'text-sm'} font-russo uppercase text-white tracking-wider group-hover:text-sparta-gold transition-colors flex items-center gap-1.5`}>
                        <span>{format(currentMonth, 'LLLL yyyy', { locale: ru })}</span>
                        <span className="text-[10px] text-sparta-gold/70 font-mono">▾</span>
                    </h4>
                </button>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white/10 text-white/70 hover:text-sparta-gold rounded-xl transition-all active:scale-95"
                        title="Предыдущий месяц"
                    >
                        <ChevronLeft size={isMobile ? 20 : 16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white/10 text-white/70 hover:text-sparta-gold rounded-xl transition-all active:scale-95"
                        title="Следующий месяц"
                    >
                        <ChevronRight size={isMobile ? 20 : 16} />
                    </button>
                </div>
            </div>

            {/* Month Selection Grid View */}
            {isMonthPickerOpen ? (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-2"
                >
                    <div className="flex items-center justify-between mb-3 px-3 bg-white/5 rounded-xl py-2">
                        <span className="text-xs font-bold text-white/50 uppercase font-mono">Год</span>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(setYear(currentMonth, currentMonth.getFullYear() - 1))}
                                className="p-1.5 hover:text-sparta-gold text-white/70 active:scale-90"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="font-russo text-sparta-gold text-base">{currentMonth.getFullYear()}</span>
                            <button
                                type="button"
                                onClick={() => setCurrentMonth(setYear(currentMonth, currentMonth.getFullYear() + 1))}
                                className="p-1.5 hover:text-sparta-gold text-white/70 active:scale-90"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {MONTHS_SHORT.map((mName, mIdx) => {
                            const isCurM = currentMonth.getMonth() === mIdx;
                            return (
                                <button
                                    key={mName}
                                    type="button"
                                    onClick={() => {
                                        setCurrentMonth(setMonth(currentMonth, mIdx));
                                        setIsMonthPickerOpen(false);
                                    }}
                                    className={`py-2.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                        isCurM
                                            ? 'bg-sparta-gold text-black border-sparta-gold shadow-md shadow-sparta-gold/30'
                                            : 'bg-white/5 text-white/70 border-white/5 hover:border-sparta-gold/40 hover:text-white'
                                    }`}
                                >
                                    {mName}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            ) : (
                <>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {WEEK_DAYS.map((wd, i) => (
                            <div
                                key={wd}
                                className={`text-[10px] sm:text-[10px] font-bold uppercase tracking-wider py-1 ${
                                    i >= 5 ? 'text-sparta-gold/90' : 'text-white/40'
                                }`}
                            >
                                {wd}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false;
                            const isTodayDate = isToday(day);
                            const hasMessages = messageDates.has(dateStr);
                            const isTrainingDay = trainingDayIndices.has(day.getDay());
                            const msgCount = messageCountByDate[dateStr] || 0;

                            const tooltipText = `${format(day, 'd MMMM (EEEE)', { locale: ru })}${
                                isTrainingDay ? ' • ⚽ День тренировки' : ''
                            }${hasMessages ? ` • 💬 Есть сообщения (${msgCount || 'активность'})` : ''}`;

                            return (
                                <button
                                    key={dateStr}
                                    type="button"
                                    title={tooltipText}
                                    onClick={() => {
                                        onSelectDate(dateStr);
                                        onClose();
                                    }}
                                    className={`h-10 sm:h-8.5 rounded-xl flex flex-col items-center justify-center relative text-xs sm:text-xs font-semibold transition-all group active:scale-90 ${
                                        !isCurrentMonth
                                            ? 'text-white/15 hover:text-white/40'
                                            : isSelected
                                                ? 'bg-sparta-gold text-black font-black shadow-[0_0_12px_rgba(212,175,55,0.6)] ring-2 ring-yellow-400 scale-105 z-10'
                                                : isTodayDate
                                                    ? 'border border-sparta-gold/60 text-sparta-gold hover:bg-sparta-gold/20 font-bold'
                                                    : isTrainingDay
                                                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-white hover:border-sparta-gold/50 hover:bg-sparta-gold/15'
                                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <span className="leading-none">{format(day, 'd')}</span>

                                    {/* Bottom Indicators Container */}
                                    <div className="flex items-center gap-0.5 mt-0.5 h-1">
                                        {/* Training Day Mini Soccer Ball */}
                                        {isTrainingDay && isCurrentMonth && !isSelected && (
                                            <span className="text-[7px] leading-none select-none opacity-90 group-hover:scale-125 transition-transform">⚽</span>
                                        )}
                                        {/* Message Activity Dot */}
                                        {hasMessages && !isSelected && (
                                            <span className="w-1.5 h-1.5 sm:w-1 sm:h-1 rounded-full bg-sparta-gold shadow-[0_0_4px_rgba(212,175,55,1)]" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Quick Action Shortcuts Footer */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={() => {
                            const todayStr = format(new Date(), 'yyyy-MM-dd');
                            onSelectDate(todayStr);
                            onClose();
                        }}
                        className="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg bg-white/5 hover:bg-sparta-gold/20 text-white/90 hover:text-sparta-gold border border-white/10 hover:border-sparta-gold/40 transition-all font-bold active:scale-95"
                    >
                        Сегодня
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                            onSelectDate(yesterdayStr);
                            onClose();
                        }}
                        className="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg bg-white/5 hover:bg-sparta-gold/20 text-white/90 hover:text-sparta-gold border border-white/10 hover:border-sparta-gold/40 transition-all font-bold active:scale-95"
                    >
                        Вчера
                    </button>
                    <button
                        type="button"
                        onClick={handleJumpToTraining}
                        className="px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 transition-all font-bold flex items-center gap-1 active:scale-95"
                        title="Перейти к ближайшей тренировке"
                    >
                        <span>⚽</span>
                        <span>Тренировка</span>
                    </button>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    {selectedDate && (
                        <button
                            type="button"
                            onClick={() => {
                                onSelectDate('');
                                onClose();
                            }}
                            className="px-2.5 py-1.5 text-red-400 hover:text-red-300 font-bold transition-colors active:scale-95"
                        >
                            Сброс
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 sm:p-1 text-white/40 hover:text-white transition-colors rounded-xl sm:rounded-lg hover:bg-white/10"
                        title="Закрыть"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </>
    );

    const mobileContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:hidden pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.05, bottom: 0.6 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 90 || info.velocity.y > 250) {
                                onClose();
                            }
                        }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="relative z-10 w-full bg-[#121218] border-t border-sparta-gold/40 rounded-t-[32px] p-5 pb-9 shadow-[0_-20px_60px_rgba(0,0,0,0.95)] max-h-[85vh] overflow-y-auto touch-pan-y select-none"
                    >
                        {/* Drag Handle */}
                        <div className="w-16 h-1.5 bg-white/30 hover:bg-sparta-gold/60 rounded-full mx-auto mb-3.5 cursor-grab active:cursor-grabbing transition-colors" />
                        {renderCalendarContent(true)}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    const desktopContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="hidden sm:block absolute right-0 top-full mt-2 z-50">
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -6 }}
                        className="relative z-50 w-full min-w-[320px] max-w-[340px] bg-[#121218]/98 backdrop-blur-2xl border border-sparta-gold/30 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
                    >
                        {renderCalendarContent(false)}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            {desktopContent}
            {mounted && typeof document !== 'undefined' ? createPortal(mobileContent, document.body) : null}
        </>
    );
};
