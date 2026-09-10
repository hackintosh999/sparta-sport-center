import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Clock,
    UserCheck,
    Calendar,
    CheckCircle2,
    Loader2,
    Send,
    ShieldAlert
} from 'lucide-react';
import { createScheduleOverride } from '../../services/scheduleOverrides';
import { SPARTA_SCHEDULE } from '../../constants/spartaSchedule';
import { BaseModal } from '../ui/BaseModal';

interface ScheduleOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultGroupId?: string;
    defaultGroupName?: string;
    defaultDate?: string;
    creatorName?: string;
    availableGroups?: Array<{ id: string; name: string; coachName?: string }>;
    onSuccess?: () => void;
}

const QUICK_REASONS = [
    { id: 'sick', label: '🤒 Болезнь тренера' },
    { id: 'tournament', label: '🏆 Выезд на турнир / Соревнования' },
    { id: 'hall_cleaning', label: '🧼 Санитарная обработка манежа' },
    { id: 'weather', label: '❄️ Непогода / Морозы' },
    { id: 'maintenance', label: '🚨 Технические работы' },
    { id: 'other', label: '✏️ Другая причина' },
];

const SPARTA_COACHES = [
    'Якупов Павел Валерьевич',
    'Кубарь Сергей Игоревич',
    'Пономарев Сергей Александрович',
    'Меньшиков Антон Александрович',
    'Лебедев Александр Сергеевич'
];

export const ScheduleOverrideModal: React.FC<ScheduleOverrideModalProps> = ({
    isOpen,
    onClose,
    defaultGroupId,
    defaultGroupName,
    defaultDate,
    creatorName = 'Тренер',
    availableGroups = [],
    onSuccess
}) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const [selectedGroupId, setSelectedGroupId] = useState<string>(
        defaultGroupId || (availableGroups[0]?.id) || 'yakupov_1'
    );

    // Sync when opened with specific group
    React.useEffect(() => {
        if (defaultGroupId) {
            setSelectedGroupId(defaultGroupId);
        } else if (availableGroups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(availableGroups[0].id);
        }
    }, [defaultGroupId, isOpen]);

    const [date, setDate] = useState<string>(defaultDate || todayStr);
    const [actionType, setActionType] = useState<'cancelled' | 'rescheduled' | 'replacement'>('cancelled');
    const [selectedReasonTag, setSelectedReasonTag] = useState<string>('sick');
    const [customReason, setCustomReason] = useState<string>('');
    const [newTime, setNewTime] = useState<string>('19:30 - 20:30');
    const [replacementCoach, setReplacementCoach] = useState<string>(SPARTA_COACHES[1]);
    const [extendSubscription, setExtendSubscription] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Prepare groups list combining availableGroups and Sparta Schedule presets
    const allGroups = availableGroups.length > 0 ? availableGroups : SPARTA_SCHEDULE.map(s => ({
        id: s.id,
        name: `${s.ageGroupLabel} (${s.coachName.split(' ')[0]})`,
        coachName: s.coachName
    }));

    const currentGroup = allGroups.find(g => g.id === selectedGroupId) || allGroups[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const reasonFinal = selectedReasonTag === 'other' || customReason.trim()
            ? (customReason.trim() || 'Оперативное изменение')
            : (QUICK_REASONS.find(r => r.id === selectedReasonTag)?.label || 'Форс-мажор');

        try {
            await createScheduleOverride({
                groupId: selectedGroupId,
                groupName: defaultGroupName || currentGroup?.name || 'Группа Sparta',
                coachName: currentGroup?.coachName || creatorName,
                date,
                status: actionType,
                title: actionType === 'cancelled' ? 'Отмена тренировки' : actionType === 'rescheduled' ? 'Перенос времени' : 'Замена тренера',
                reason: reasonFinal,
                newTime: actionType === 'rescheduled' ? newTime : undefined,
                replacementCoach: actionType === 'replacement' ? replacementCoach : undefined,
                extendSubscription: actionType === 'cancelled' ? extendSubscription : false,
                createdBy: creatorName
            });

            setSuccessMessage('Уведомления успешно разосланы родителям, расписание обновлено!');
            if (onSuccess) onSuccess();

            setTimeout(() => {
                setSuccessMessage(null);
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Error saving schedule override:', error);
            alert('Не удалось сохранить изменения. Пожалуйста, попробуйте снова.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-lg"
            glowColor="amber"
            zIndex="z-[160]"
        >
            <div className="relative overflow-hidden flex flex-col text-left max-h-[calc(100dvh-2.5rem)] sm:max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0 pr-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                            <ShieldAlert size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-wider">
                                Форс-мажор в расписании
                            </h3>
                            <p className="text-xs text-white/50">
                                Оперативные изменения на конкретный день
                            </p>
                        </div>
                    </div>
                </div>

                {successMessage ? (
                    <div className="py-12 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={36} />
                        </div>
                        <h4 className="text-xl font-russo text-white uppercase">Успешно применено!</h4>
                        <p className="text-sm text-emerald-300 max-w-sm mx-auto">{successMessage}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1">
                        {/* Group Selection */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                Тренировочная группа
                            </label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:border-sparta-gold/50 outline-none transition-colors"
                            >
                                {allGroups.map((g) => (
                                    <option key={g.id} value={g.id} className="bg-[#1a1a1f] text-white">
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date selection */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                                Дата форс-мажора
                            </label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:border-sparta-gold/50 outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Action Type Selection */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-white/50 block mb-1.5">
                                Что произошло?
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActionType('cancelled')}
                                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                        actionType === 'cancelled'
                                            ? 'bg-red-500/20 border-red-500 text-white shadow-lg shadow-red-500/20'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    <AlertTriangle size={16} className={actionType === 'cancelled' ? 'text-red-400' : 'text-white/40'} />
                                    <span>Отмена</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActionType('rescheduled')}
                                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                        actionType === 'rescheduled'
                                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    <Clock size={16} className={actionType === 'rescheduled' ? 'text-amber-400' : 'text-white/40'} />
                                    <span>Перенос</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActionType('replacement')}
                                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                        actionType === 'replacement'
                                            ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                    }`}
                                >
                                    <UserCheck size={16} className={actionType === 'replacement' ? 'text-blue-400' : 'text-white/40'} />
                                    <span>Замена</span>
                                </button>
                            </div>
                        </div>

                        {/* Action Details */}
                        {actionType === 'rescheduled' && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                                <label className="text-[10px] uppercase font-bold text-amber-300 block">
                                    Новое время тренировки
                                </label>
                                <input
                                    type="text"
                                    value={newTime}
                                    onChange={(e) => setNewTime(e.target.value)}
                                    placeholder="например 19:30 - 20:30"
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-amber-500/40 text-white text-xs font-bold focus:border-amber-400 outline-none"
                                />
                            </motion.div>
                        )}

                        {actionType === 'replacement' && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                                <label className="text-[10px] uppercase font-bold text-blue-300 block">
                                    Заменяющий тренер
                                </label>
                                <select
                                    value={replacementCoach}
                                    onChange={(e) => setReplacementCoach(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-blue-500/40 text-white text-xs font-bold focus:border-blue-400 outline-none"
                                >
                                    {SPARTA_COACHES.map(c => (
                                        <option key={c} value={c} className="bg-[#1a1a1f] text-white">{c}</option>
                                    ))}
                                </select>
                            </motion.div>
                        )}

                        {/* Reason Quick Tags */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-white/50 block mb-1.5">
                                Причина для родителей
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {QUICK_REASONS.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedReasonTag(r.id);
                                            if (r.id !== 'other') setCustomReason('');
                                        }}
                                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all text-left cursor-pointer ${
                                            selectedReasonTag === r.id
                                                ? 'bg-sparta-gold/20 border-sparta-gold/60 text-white font-bold'
                                                : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
                                        }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>

                            {selectedReasonTag === 'other' && (
                                <textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Опишите причину изменений..."
                                    rows={2}
                                    className="w-full mt-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-sparta-gold/50 outline-none resize-none"
                                />
                            )}
                        </div>

                        {/* Auto subscription extension toggle */}
                        {actionType === 'cancelled' && (
                            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-emerald-300">Продлить абонементы учеников</p>
                                    <p className="text-[10px] text-white/50">
                                        Автоматически добавит +1 день к сроку действия абонемента всем детям группы
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={extendSubscription}
                                    onChange={(e) => setExtendSubscription(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-500 cursor-pointer rounded"
                                />
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs uppercase transition-colors cursor-pointer"
                            >
                                Отмена
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black font-russo text-xs uppercase tracking-wider shadow-lg shadow-sparta-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer font-black"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <Send size={14} />
                                        <span>Применить</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </BaseModal>
    );
};

export default ScheduleOverrideModal;
