import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Bell, BellRing, CheckCircle2, Shield, Trophy, MapPin, User, Calendar, Zap, Sparkles } from 'lucide-react';
import { Broadcast } from '../types/broadcast';
import { SmoothFlipCounter } from './SmoothFlipCounter';
import { Sparta3DShield, Ball3D, Trophy3D } from './Sparta3DIcons';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BroadcastCountdownProps {
    broadcast: Broadcast;
    onMatchStart?: () => void;
}

export const BroadcastCountdown: React.FC<BroadcastCountdownProps> = ({ broadcast, onMatchStart }) => {
    const { user, userProfile } = useAuth();
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPassed: boolean }>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isPassed: false
    });
    const [isReminded, setIsReminded] = useState(false);
    const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

    // Calculate target start time
    const getTargetDate = (): Date => {
        if (broadcast.scheduledStartTime) {
            if (broadcast.scheduledStartTime.toDate) {
                return broadcast.scheduledStartTime.toDate();
            }
            return new Date(broadcast.scheduledStartTime);
        }
        if (broadcast.scheduledAt) {
            if (broadcast.scheduledAt.toDate) return broadcast.scheduledAt.toDate();
            return new Date(broadcast.scheduledAt);
        }
        // Default fallback to 1 hour from creation or today 18:00
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        return d;
    };

    useEffect(() => {
        const target = getTargetDate();

        const updateTimer = () => {
            const now = new Date().getTime();
            const diff = target.getTime() - now;

            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
                if (onMatchStart) onMatchStart();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds, isPassed: false });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [broadcast]);

    const handleSetReminder = async () => {
        if (!user) {
            alert('Войдите в аккаунт, чтобы получить напоминание в личном кабинете!');
            return;
        }

        setIsSubmittingReminder(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: user.uid,
                email: user.email,
                title: `🔔 Напоминание: ${broadcast.title}`,
                message: `Прямая трансляция матча «${broadcast.title}» (${broadcast.ageCategory || 'Все группы'}) начнется в ближайшее время на SPARTA TV!`,
                type: 'broadcast_reminder',
                broadcastId: broadcast.id,
                isRead: false,
                createdAt: serverTimestamp()
            });
            setIsReminded(true);
        } catch (e) {
            console.error('Error creating reminder notification:', e);
        } finally {
            setIsSubmittingReminder(false);
        }
    };

    const targetDate = getTargetDate();
    const formattedDate = targetDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#141414] via-[#0d0d0d] to-[#080808] border border-sparta-gold/30 shadow-[0_0_60px_rgba(255,191,0,0.15)] font-manrope">
            {/* Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-sparta-gold/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Standby Header Status */}
            <div className="relative z-10 px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-black tracking-wider uppercase border border-amber-400/30">
                        <Clock size={13} className="animate-spin" style={{ animationDuration: '6s' }} /> СКОРО В ЭФИРЕ
                    </span>
                    {broadcast.ageCategory && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-xs font-bold">
                            {broadcast.ageCategory}
                        </span>
                    )}
                </div>
                <div className="text-xs text-white/60 flex items-center gap-1.5 font-medium">
                    <Calendar size={13} className="text-sparta-gold" />
                    <span>Начало: <strong className="text-white">{formattedDate}</strong></span>
                </div>
            </div>

            {/* Match Presentation Duel Arena */}
            <div className="relative z-10 p-6 md:p-12 flex flex-col items-center text-center">
                {/* Tournament Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/70 mb-8 uppercase tracking-widest">
                    <Trophy size={14} className="text-sparta-gold" />
                    {broadcast.tournamentName || 'Официальный матч Академии'}
                </div>

                {/* Team Badges Confrontation */}
                <div className="grid grid-cols-3 items-center w-full max-w-2xl mx-auto mb-10">
                    {/* Home Team (Sparta) */}
                    <div className="flex flex-col items-center">
                        <motion.div
                            whileHover={{ scale: 1.08 }}
                            className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-amber-400/20 via-black to-amber-500/10 border-2 border-sparta-gold/80 flex items-center justify-center shadow-[0_0_35px_rgba(255,191,0,0.35)] mb-3"
                        >
                            <Sparta3DShield size={52} />
                        </motion.div>
                        <span className="font-russo text-lg md:text-2xl text-white uppercase tracking-wider">СПАРТА</span>
                        <span className="text-[11px] text-sparta-gold font-bold uppercase tracking-widest mt-0.5">Хозяева</span>
                    </div>

                    {/* VS Badge */}
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/40 font-russo text-sm md:text-base">
                            VS
                        </div>
                    </div>

                    {/* Away Team (Opponent) */}
                    <div className="flex flex-col items-center">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/5 border-2 border-white/20 flex items-center justify-center shadow-lg mb-3"
                        >
                            {broadcast.opponentLogo ? (
                                <img src={broadcast.opponentLogo} alt={broadcast.opponentName} className="w-16 h-16 object-contain" />
                            ) : (
                                <Shield size={44} className="text-white/60" />
                            )}
                        </motion.div>
                        <span className="font-russo text-lg md:text-2xl text-white uppercase tracking-wider">
                            {broadcast.opponentName || 'СОПЕРНИК'}
                        </span>
                        <span className="text-[11px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Гости</span>
                    </div>
                </div>

                {/* Match Title */}
                <h2 className="text-2xl md:text-4xl font-russo text-white uppercase tracking-wide mb-3 max-w-xl">
                    {broadcast.title}
                </h2>
                {broadcast.description && (
                    <p className="text-white/60 text-sm md:text-base max-w-lg mb-8">
                        {broadcast.description}
                    </p>
                )}

                {/* Location & Coach Footnotes */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/50 mb-10">
                    {broadcast.locationName && (
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <MapPin size={13} className="text-sparta-gold" /> {broadcast.locationName}
                        </span>
                    )}
                    {broadcast.coachName && (
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <User size={13} className="text-sparta-gold" /> Тренер: <strong className="text-white/80">{broadcast.coachName}</strong>
                        </span>
                    )}
                </div>

                {/* Real-time Countdown Clocks with Smooth Digit Flip */}
                <div className="w-full max-w-xl mb-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-sparta-gold mb-4">
                        ДО НАЧАЛА ПРЯМОГО ЭФИРА
                    </p>
                    <div className="grid grid-cols-4 gap-2 sm:gap-4">
                        <SmoothFlipCounter value={timeLeft.days} label="ДНЕЙ" size="lg" />
                        <SmoothFlipCounter value={timeLeft.hours} label="ЧАСОВ" size="lg" />
                        <SmoothFlipCounter value={timeLeft.minutes} label="МИНУТ" size="lg" />
                        <SmoothFlipCounter value={timeLeft.seconds} label="СЕКУНД" size="lg" highlight={true} />
                    </div>
                </div>

                {/* Action CTA: Remind me */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSetReminder}
                        disabled={isReminded || isSubmittingReminder}
                        className={`px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-2.5 shadow-xl ${
                            isReminded
                                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                        }`}
                    >
                        {isReminded ? (
                            <>
                                <CheckCircle2 size={18} />
                                <span>Напоминание установлено!</span>
                            </>
                        ) : (
                            <>
                                <Bell size={18} />
                                <span>Напомнить о начале матча</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
