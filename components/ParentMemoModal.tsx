import React from 'react';
import { BaseModal } from './ui/BaseModal';
import { Sparkles, MapPin, CheckCircle2, Footprints, Shirt, Droplets, Clock, ShieldCheck, X } from 'lucide-react';

interface ParentMemoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenRoute?: () => void;
}

const MEMO_ITEMS = [
    {
        icon: <Footprints className="w-6 h-6 text-amber-400" />,
        badge: 'Обувь',
        title: 'Сменная спортивная обувь',
        desc: 'Чистые кроссовки или футзалки для зала. Для уличного поля — сороконожки (TF) или бутсы (FG). В носках или уличной обуви на поле вход запрещён ради безопасности детей.',
        color: 'from-amber-500/20 to-sparta-gold/10'
    },
    {
        icon: <Shirt className="w-6 h-6 text-emerald-400" />,
        badge: 'Форма',
        title: 'Удобная спортивная форма',
        desc: 'Футболка и шорты (или спортивные штаны). Главное — чтобы одежда не сковывала движений и была дышащей. В залах комфортная температура круглый год.',
        color: 'from-emerald-500/20 to-emerald-500/5'
    },
    {
        icon: <Droplets className="w-6 h-6 text-cyan-400" />,
        badge: 'Вода',
        title: 'Бутылочка с чистой водой (0.5 л)',
        desc: 'Простая негазированная вода комнатной температуры в удобной спортивной бутылочке с дозатором. В клубе всегда есть кулеры для бесплатного долива.',
        color: 'from-cyan-500/20 to-blue-500/5'
    },
    {
        icon: <Clock className="w-6 h-6 text-yellow-400" />,
        badge: 'Время',
        title: 'Приходите за 10–15 минут',
        desc: 'Ребёнку нужно время, чтобы без спешки переодеться в раздевалке, освоиться, познакомиться с тренером и выйти на поле с уверенной улыбкой.',
        color: 'from-yellow-500/20 to-amber-500/5'
    },
    {
        icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
        badge: 'Атмосфера',
        title: 'Поддержка и комфорт родителей',
        desc: 'Для родителей открыта удобная зона ожидания с видом на поле и Wi-Fi. Никакого давления и критики: тренер мягко вовлекает каждого ребёнка в игру!',
        color: 'from-rose-500/20 to-pink-500/5'
    }
];

export const ParentMemoModal: React.FC<ParentMemoModalProps> = ({
    isOpen,
    onClose,
    onOpenRoute
}) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-2xl"
            glowColor="amber"
            zIndex="z-[120]"
            noPadding
        >
            <div className="flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] bg-[#121214] text-white">
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-zinc-900 via-black to-zinc-900 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-sparta-gold/15 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] shrink-0">
                            <Sparkles size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-sparta-gold block">
                                Памятка родителю & гостю
                            </span>
                            <h3 className="font-russo text-lg sm:text-2xl text-white uppercase tracking-tight">
                                Что взять на тренировку и фестиваль
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all cursor-pointer shrink-0"
                        title="Закрыть"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Checklist */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-sparta-gold shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-manrope">
                            Мы позаботились обо всём инвентаре, мячах и манишках. От вас — только удобная одежда и хорошее настроение ребёнка!
                        </p>
                    </div>

                    <div className="space-y-3">
                        {MEMO_ITEMS.map((item, idx) => (
                            <div
                                key={idx}
                                className="p-4 sm:p-4.5 rounded-2xl bg-zinc-900/90 border border-white/10 hover:border-sparta-gold/40 transition-all flex items-start gap-4 shadow-sm"
                            >
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                                    {item.icon}
                                </div>
                                <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-russo text-sm sm:text-base text-white uppercase">
                                            {item.title}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-black uppercase tracking-wider text-sparta-gold border border-white/5">
                                            {item.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-white/70 font-manrope leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Controls (Min 48px height) */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-950/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {onOpenRoute && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenRoute();
                            }}
                            className="min-h-[48px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-russo text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <MapPin size={16} className="text-sparta-gold" />
                            <span>Схема прохода и карта</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[48px] flex-1 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-sparta-gold to-yellow-500 hover:brightness-110 text-black font-russo text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sparta-gold/25 cursor-pointer active:scale-95"
                    >
                        <CheckCircle2 size={18} />
                        <span>Всё понятно, мы готовы!</span>
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default ParentMemoModal;
