import React, { useState } from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    User,
    Sparkles,
    Shield,
    AlertCircle,
    Check,
    Copy,
    Trophy,
    ChevronRight,
    Flame
} from 'lucide-react';

interface SpartaScheduleChatCardProps {
    text: string;
    scheduleMeta?: {
        groupId?: string;
        groupName?: string;
        coachName?: string;
    };
    isMe?: boolean;
}

const DAY_SHORT_MAP: Record<string, string> = {
    'понедельник': 'ПН',
    'пн': 'ПН',
    'вторник': 'ВТ',
    'вт': 'ВТ',
    'среда': 'СР',
    'ср': 'СР',
    'четверг': 'ЧТ',
    'чт': 'ЧТ',
    'пятница': 'ПТ',
    'пт': 'ПТ',
    'суббота': 'СБ',
    'сб': 'СБ',
    'воскресенье': 'ВС',
    'воскресение': 'ВС',
    'вс': 'ВС',
    'monday': 'ПН',
    'mon': 'ПН',
    'tuesday': 'ВТ',
    'tue': 'ВТ',
    'wednesday': 'СР',
    'wed': 'СР',
    'thursday': 'ЧТ',
    'thu': 'ЧТ',
    'friday': 'ПТ',
    'fri': 'ПТ',
    'saturday': 'СБ',
    'sat': 'СБ',
    'sunday': 'ВС',
    'sun': 'ВС'
};

export const getShortDay = (dayStr: string): string => {
    if (!dayStr) return 'ТР';
    const clean = dayStr.toLowerCase().trim();
    if (DAY_SHORT_MAP[clean]) return DAY_SHORT_MAP[clean];
    for (const [k, v] of Object.entries(DAY_SHORT_MAP)) {
        if (clean.startsWith(k) || k.startsWith(clean)) return v;
    }
    return dayStr.slice(0, 2).toUpperCase();
};

export const SpartaScheduleChatCard: React.FC<SpartaScheduleChatCardProps> = ({
    text,
    scheduleMeta,
    isMe
}) => {
    const [copied, setCopied] = useState(false);

    // Parsing schedule text
    const parseSchedule = (rawText: string) => {
        let groupName = scheduleMeta?.groupName || '';
        let coachName = scheduleMeta?.coachName || '';
        let ageRange = '';
        const slots: Array<{ day: string; shortDay: string; time: string; location: string }> = [];
        let note = '';

        // Extract Group & Age
        const groupLineMatch = rawText.match(/(?:🏆\s*)?\*?Группа:\*?\s*([^\n]+)/i);
        if (groupLineMatch) {
            const fullGroupLine = groupLineMatch[1].replace(/\*/g, '').trim();
            // Look for explicit age pattern like (4-6 лет) or (4–6)
            const explicitAgeMatch = fullGroupLine.match(/\((\d{1,2}\s*[-–—]\s*\d{1,2}(?:\s*лет)?)\)/i);
            const birthYearMatch = fullGroupLine.match(/(\d{4})\s*[-–—]\s*(\d{4})/);

            if (explicitAgeMatch) {
                let ageStr = explicitAgeMatch[1].trim();
                if (!ageStr.includes('лет')) ageStr += ' лет';
                ageRange = ageStr;
                groupName = fullGroupLine.replace(explicitAgeMatch[0], '').replace(/\s{2,}/g, ' ').trim();
            } else if (birthYearMatch) {
                const y1 = parseInt(birthYearMatch[1], 10);
                const y2 = parseInt(birthYearMatch[2], 10);
                const curY = new Date().getFullYear();
                const minAge = curY - Math.max(y1, y2);
                const maxAge = curY - Math.min(y1, y2);
                ageRange = `${y1}–${y2} г.р. (${minAge}–${maxAge} лет)`;
                groupName = fullGroupLine;
            } else {
                groupName = fullGroupLine;
            }
        }

        // Extract Coach
        const coachMatch = rawText.match(/(?:👤\s*)?\*?Тренер:\*?\s*([^\n]+)/i);
        if (coachMatch && !coachName) {
            coachName = coachMatch[1].replace(/\*/g, '').trim();
        }

        // Extract Day Slots
        // Example format: • *Суббота:* 12:00 – 13:00 📍 Главный зал  OR  ▫️ Пн: 19:00–20:00 (Манеж)
        const lines = rawText.split('\n');
        for (const line of lines) {
            const slotMatch = line.match(/(?:(?:[•\-*]|▫️)\s*)?\*?([А-Яа-яA-Za-z]+):\*?\s*([0-9]{1,2}:[0-9]{2}(?:\s*[-–—]\s*[0-9]{1,2}:[0-9]{2})?)(?:\s*(?:📍|\()?\s*([^)\n]+)\)?)?/iu);
            if (slotMatch) {
                const dayName = slotMatch[1].replace(/\*/g, '').trim();
                const time = slotMatch[2].replace(/\*/g, '').trim();
                let location = (slotMatch[3] || 'Главный манеж').replace(/[📍*()]/gu, '').trim();
                if (!location) location = 'Главный манеж';

                const shortDay = getShortDay(dayName);
                slots.push({ day: dayName, shortDay, time, location });
            }
        }

        // Extract Note
        const noteMatch = rawText.match(/(?:📢\s*)?\*?(?:Важно|Объявление):\*?\s*([^\n]+(?:\n[^\n]+)*)/i);
        if (noteMatch) {
            note = noteMatch[1].replace(/\*/g, '').trim();
        }

        return {
            groupName: groupName || 'Тренировочная группа Спарта',
            coachName: coachName || 'Тренерский штаб Спарта',
            ageRange,
            slots,
            note
        };
    };

    const data = parseSchedule(text);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return (
        <div className="w-full max-w-xl my-1.5 rounded-3xl bg-gradient-to-b from-[#1e1e26] via-[#15151c] to-[#0f0f13] border-2 border-sparta-gold/40 shadow-2xl p-4 sm:p-5 relative overflow-hidden select-text text-left font-sans transition-all hover:border-sparta-gold/60">
            {/* Ambient Gold Glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-sparta-gold/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Branding & Official Badge */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sparta-gold to-yellow-600 text-black flex items-center justify-center font-black text-xs shadow-md shadow-sparta-gold/20">
                        ⚽
                    </div>
                    <div>
                        <div className="text-xs font-russo uppercase tracking-wider text-white flex items-center gap-1.5">
                            <span>SPARTA • РАСПИСАНИЕ</span>
                        </div>
                        <div className="text-[10px] text-white/40 font-medium">
                            Официальное расписание занятий
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/40 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ОФИЦИАЛЬНО
                    </span>
                </div>
            </div>

            {/* Group Title & Coach */}
            <div className="mb-4 space-y-1 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-white font-russo tracking-wide">
                        {data.groupName}
                    </h4>
                    {data.ageRange && (
                        <span className="bg-white/10 text-white/90 text-[11px] font-medium px-2 py-0.5 rounded-lg border border-white/10">
                            {data.ageRange}
                        </span>
                    )}
                </div>

                <div className="text-xs text-white/70 flex items-center gap-1.5 pt-0.5">
                    <span className="text-white/40">Тренер:</span>
                    <span className="text-sparta-gold font-semibold font-russo">
                        {data.coachName}
                    </span>
                </div>
            </div>

            {/* Days & Time Slots */}
            <div className="space-y-2 mb-4 relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
                    <Calendar size={12} className="text-sparta-gold" />
                    <span>Дни и время тренировок</span>
                </div>

                {data.slots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {data.slots.map((slot, idx) => (
                            <div
                                key={idx}
                                className="bg-black/60 border border-white/10 hover:border-sparta-gold/40 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between transition-all group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-sparta-gold/15 border border-sparta-gold/30 text-sparta-gold font-mono font-black text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                                        {slot.shortDay}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">
                                            {slot.day}
                                        </div>
                                        <div className="text-[10px] text-white/40 flex items-center gap-1">
                                            <MapPin size={10} className="text-sparta-gold" />
                                            <span className="truncate max-w-[120px]">{slot.location}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right pl-2 shrink-0">
                                    <div className="text-xs font-bold font-mono text-sparta-gold">
                                        {slot.time}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-3 bg-black/40 border border-white/10 rounded-2xl text-xs text-white/60">
                        {text}
                    </div>
                )}
            </div>

            {/* Important Admin Note */}
            {data.note && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 mb-3.5 flex items-start gap-2.5 text-xs text-amber-200 relative z-10">
                    <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed font-medium">
                        <span className="font-bold text-amber-300">Важно: </span>
                        {data.note}
                    </div>
                </div>
            )}

            {/* Actions Bar */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 relative z-10">
                <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                    {copied ? (
                        <>
                            <Check size={13} className="text-emerald-400" />
                            <span className="text-emerald-400">Скопировано</span>
                        </>
                    ) : (
                        <>
                            <Copy size={13} />
                            <span>Скопировать</span>
                        </>
                    )}
                </button>

                <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                    <Flame size={12} className="text-sparta-gold" />
                    <span>Футбольный центр Спарта</span>
                </div>
            </div>
        </div>
    );
};
