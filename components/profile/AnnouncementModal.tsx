import React, { useState } from 'react';
import { Megaphone, X, Sparkles, Pin, Flame, Trophy, AlertTriangle, Clock } from 'lucide-react';
import { BaseModal } from '../ui/BaseModal';

export interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendAnnouncement: (title: string, text: string, priority: 'normal' | 'urgent', pin: boolean) => Promise<void>;
    isSending?: boolean;
}

const PRESETS = [
    { title: '⚡ Изменение времени тренировки', text: 'Уважаемые родители и спортсмены! Обратите внимание, что тренировка переносится. Просьба прийти за 15 минут до начала.', priority: 'normal' as const, icon: Clock },
    { title: '⚠️ Отмена занятия (Форс-мажор)', text: 'Внимание! По техническим причинам тренировка сегодня отменяется. Занятие будет отработано в резервный день.', priority: 'urgent' as const, icon: AlertTriangle },
    { title: '🏆 Сбор команды на турнир', text: 'Команда приглашается на выездные соревнования! Просьба подтвердить участие и предоставить медицинские справки.', priority: 'normal' as const, icon: Trophy },
    { title: '📢 Важная информация от тренера', text: 'Просьба ознакомиться с важными изменениями и правилами посещения занятий в этом месяце.', priority: 'normal' as const, icon: Megaphone }
];

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
    isOpen,
    onClose,
    onSendAnnouncement,
    isSending = false
}) => {
    const [title, setTitle] = useState('📢 Важное объявление тренера');
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
    const [pin, setPin] = useState(true);

    const handleApplyPreset = (preset: typeof PRESETS[0]) => {
        setTitle(preset.title);
        setText(preset.text);
        setPriority(preset.priority);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || isSending) return;
        await onSendAnnouncement(title.trim() || '📢 Важное объявление', text.trim(), priority, pin);
        setText('');
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            showCloseButton={false}
            glowColor={priority === 'urgent' ? 'red' : 'amber'}
            zIndex="z-[250]"
        >
            <div className="relative">
                {/* Glowing Top Edge */}
                <div className={`absolute -top-6 -left-6 -right-6 h-1.5 ${priority === 'urgent' ? 'bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-400 via-sparta-gold to-yellow-500'}`} />

                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 pt-1">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30'}`}>
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black font-russo text-white uppercase tracking-wider">
                                Официальное объявление
                            </h3>
                            <p className="text-xs text-white/50">
                                Публикация в чат с выделением и закреплением
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-1.5 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Quick Presets */}
                <div className="mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-2">
                        Быстрые шаблоны:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                        {PRESETS.map((p, idx) => {
                            const IconComp = p.icon;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleApplyPreset(p)}
                                    className="flex items-center gap-2 p-2 sm:p-2.5 bg-white/5 hover:bg-sparta-gold/15 border border-white/10 hover:border-sparta-gold/40 rounded-xl text-left transition-all group cursor-pointer"
                                >
                                    <IconComp size={15} className="text-sparta-gold shrink-0 group-hover:scale-110 transition-transform" />
                                    <span className="text-[11px] font-bold text-white/80 group-hover:text-white truncate">
                                        {p.title.replace(/^[^\s]+\s/, '')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                    {/* Title Input */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1.5">
                            Заголовок объявления:
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Например: 📢 Перенос занятия..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-sparta-gold transition-colors"
                        />
                    </div>

                    {/* Text Area */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1.5">
                            Текст сообщения:
                        </label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={3}
                            required
                            placeholder="Введите подробности для спортсменов и родителей..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-white focus:outline-none focus:border-sparta-gold resize-none transition-colors"
                        />
                    </div>

                    {/* Priority Selector & Pin Checkbox */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                        {/* Priority Toggle */}
                        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2">
                            <button
                                type="button"
                                onClick={() => setPriority('normal')}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${priority === 'normal' ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
                            >
                                <Sparkles size={13} />
                                <span>Важно</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPriority('urgent')}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${priority === 'urgent' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
                            >
                                <Flame size={13} />
                                <span>Срочно</span>
                            </button>
                        </div>

                        {/* Pin Checkbox */}
                        <label className="flex items-center justify-end sm:justify-start gap-2 text-xs text-white/80 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={pin}
                                onChange={(e) => setPin(e.target.checked)}
                                className="rounded bg-white/10 border-white/20 text-sparta-gold focus:ring-0 w-4 h-4 cursor-pointer"
                            />
                            <span className="flex items-center gap-1">
                                <Pin size={12} className="text-sparta-gold rotate-45" />
                                Закрепить вверху
                            </span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-3">
                        <button
                            type="submit"
                            disabled={!text.trim() || isSending}
                            className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                text.trim() && !isSending
                                    ? priority === 'urgent'
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 active:scale-[0.99]'
                                        : 'bg-gradient-to-r from-amber-400 to-sparta-gold hover:from-yellow-400 hover:to-amber-500 text-black shadow-lg shadow-sparta-gold/30 active:scale-[0.99]'
                                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                            }`}
                        >
                            <Megaphone size={16} />
                            <span>{isSending ? 'Публикация...' : 'Опубликовать для всех'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </BaseModal>
    );
};

export default AnnouncementModal;
