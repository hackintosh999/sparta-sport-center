import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Sparkles, MapPin, CheckCircle, ArrowRight, ShieldCheck, Footprints, Flame } from 'lucide-react';

interface FestivalBannerProps {
    onOpenRoute: () => void;
    onOpenMemo: () => void;
    onJoinFestival: () => void;
}

export const FestivalBanner: React.FC<FestivalBannerProps> = ({
    onOpenRoute,
    onOpenMemo,
    onJoinFestival
}) => {
    return (
        <div className="relative z-30 w-full bg-gradient-to-r from-amber-600/30 via-yellow-500/20 to-amber-700/30 border-y border-amber-400/40 backdrop-blur-xl shadow-[0_10px_35px_rgba(245,158,11,0.2)]">
            {/* Pulsing light glow bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    {/* Left: Festival Highlights */}
                    <div className="flex items-center gap-3.5 text-center lg:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-sparta-gold to-yellow-500 text-black flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 font-russo animate-bounce">
                            <Trophy size={24} className="stroke-[2.5]" />
                        </div>
                        <div>
                            <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-russo text-[10px] sm:text-xs uppercase tracking-wider animate-pulse">
                                    🔥 ЗАВТРА РЕЛИЗ ФЕСТИВАЛЯ
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-amber-300 uppercase tracking-wide">
                                    Вход свободный для всей семьи
                                </span>
                            </div>
                            <h3 className="font-russo text-base sm:text-xl text-white uppercase tracking-tight mt-0.5">
                                Большой детский спортивный фестиваль SPARTA
                            </h3>
                            <p className="text-xs text-white/80 font-manrope hidden sm:block">
                                Открытые игры, мастер-классы от наставников, подарки каждому ребёнку и море эмоций!
                            </p>
                        </div>
                    </div>

                    {/* Right: 3 Big Thumb-Friendly Buttons (Min 48px height) */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 w-full lg:w-auto">
                        <button
                            type="button"
                            onClick={onOpenRoute}
                            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-russo uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                            title="Посмотреть схему проезда и адрес площадки"
                        >
                            <MapPin size={16} className="text-sparta-gold" />
                            <span>Как добраться</span>
                        </button>

                        <button
                            type="button"
                            onClick={onOpenMemo}
                            className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-russo uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                            title="Что взять с собой ребенку на фестиваль"
                        >
                            <Footprints size={16} className="text-amber-400" />
                            <span>Что взять с собой</span>
                        </button>

                        <button
                            type="button"
                            onClick={onJoinFestival}
                            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-sparta-gold to-yellow-500 hover:brightness-110 text-black text-xs sm:text-sm font-russo uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 font-black"
                        >
                            <span>Участвовать</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FestivalBanner;
