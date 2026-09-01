import React, { useState, useMemo } from 'react';
import { db } from '../../firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import {
    X,
    Send,
    MessageSquare,
    Calendar,
    Pin,
    Check,
    Clock,
    MapPin,
    Users,
    Sparkles,
    Shield,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    SlidersHorizontal
} from 'lucide-react';
import { Group } from '../../types/shop';
import { getShortDay } from '../profile/SpartaScheduleChatCard';

interface ScheduleMessengerPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    groups: Group[];
    coaches: any[];
    defaultGroup?: Group | null;
    onSuccess?: () => void;
}

export const ScheduleMessengerPublishModal: React.FC<ScheduleMessengerPublishModalProps> = ({
    isOpen,
    onClose,
    groups,
    coaches,
    defaultGroup,
    onSuccess
}) => {
    if (!isOpen) return null;

    const [targetMode, setTargetMode] = useState<'ALL_GROUPS' | 'SINGLE_GROUP' | 'CHANNEL'>(
        defaultGroup ? 'SINGLE_GROUP' : 'ALL_GROUPS'
    );
    const [selectedGroupId, setSelectedGroupId] = useState<string>(
        defaultGroup ? defaultGroup.id : (groups[0]?.id || '')
    );
    const [customNote, setCustomNote] = useState<string>('Просьба приходить за 10 минут до начала и не забывать сменную обувь и воду ⚽');
    const [isPinned, setIsPinned] = useState<boolean>(true);
    const [sending, setSending] = useState<boolean>(false);
    const [sentCount, setSentCount] = useState<number | null>(null);

    // Selected group object for preview
    const previewGroup = useMemo(() => {
        if (targetMode === 'SINGLE_GROUP') {
            return groups.find(g => g.id === selectedGroupId) || groups[0];
        }
        return groups[0];
    }, [targetMode, selectedGroupId, groups]);

    const getCoachName = (coachId?: string) => {
        const c = coaches.find(co => co.id === coachId);
        return c?.name || 'Тренер Спарта';
    };

    // Format text representation of a group's schedule
    const formatGroupScheduleText = (g: Group) => {
        const coach = getCoachName(g.coachId);
        const sched = g.schedule || [];
        
        let text = `⚽ *SPARTA • РАСПИСАНИЕ ТРЕНИРОВОК*\n`;
        text += `🏆 *Группа:* ${g.name} (${g.ageRange?.min || 0}–${g.ageRange?.max || 18} лет)\n`;
        text += `👤 *Тренер:* ${coach}\n\n`;
        text += `🗓 *График занятий:*\n`;

        if (sched.length === 0) {
            text += `— Расписание уточняется у администрации\n`;
        } else {
            sched.forEach(s => {
                text += `• *${s.day}:* ${s.time}${s.endTime ? `–${s.endTime}` : ''} 📍 ${s.location || 'Главный манеж'}\n`;
            });
        }

        if (customNote.trim()) {
            text += `\n📢 *Важно:* ${customNote.trim()}`;
        }

        return text;
    };

    const handlePublish = async () => {
        setSending(true);
        setSentCount(null);

        try {
            const targetGroupsToPublish = targetMode === 'ALL_GROUPS'
                ? groups
                : targetMode === 'SINGLE_GROUP'
                ? groups.filter(g => g.id === selectedGroupId)
                : [];

            let successfulSends = 0;

            if (targetMode === 'CHANNEL') {
                // Publish to general channel
                const channelsSnap = await getDocs(query(collection(db, 'chats'), where('type', '==', 'channel')));
                let channelDocId = '';

                if (channelsSnap.empty) {
                    const newChan = await addDoc(collection(db, 'chats'), {
                        name: '📢 Новости и Анонсы Спарта',
                        type: 'channel',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        participants: []
                    });
                    channelDocId = newChan.id;
                } else {
                    channelDocId = channelsSnap.docs[0].id;
                }

                // Format general schedule
                let fullText = `⚽ *ОФИЦИАЛЬНОЕ РАСПИСАНИЕ СЕКЦИЙ СПАРТА*\n\n`;
                groups.forEach(g => {
                    fullText += `🏆 *${g.name}* (Тренер: ${getCoachName(g.coachId)})\n`;
                    (g.schedule || []).forEach(s => {
                        fullText += `  ▫️ ${s.day}: ${s.time}${s.endTime ? `–${s.endTime}` : ''} (${s.location || 'Манеж'})\n`;
                    });
                    fullText += `\n`;
                });
                if (customNote.trim()) {
                    fullText += `📢 *Объявление:* ${customNote.trim()}\n`;
                }

                await addDoc(collection(db, 'chats', channelDocId, 'messages'), {
                    text: fullText,
                    senderId: 'admin_sparta',
                    senderName: 'Администрация Спарта',
                    timestamp: serverTimestamp(),
                    isPinned,
                    type: 'schedule_announcement'
                });

                await updateDoc(doc(db, 'chats', channelDocId), {
                    lastMessage: '🗓 Опубликовано актуальное расписание школы',
                    lastMessageAt: serverTimestamp(),
                    lastMessageBy: 'admin_sparta'
                });

                successfulSends = 1;
            } else {
                // Publish to group chats
                for (const grp of targetGroupsToPublish) {
                    const messageText = formatGroupScheduleText(grp);

                    // Find or create group chat
                    const chatsSnap = await getDocs(
                        query(collection(db, 'chats'), where('groupId', '==', grp.id))
                    );

                    let chatId = '';

                    if (chatsSnap.empty) {
                        // Check by name
                        const nameSnap = await getDocs(
                            query(collection(db, 'chats'), where('name', '==', grp.name))
                        );

                        if (!nameSnap.empty) {
                            chatId = nameSnap.docs[0].id;
                            await updateDoc(doc(db, 'chats', chatId), { groupId: grp.id });
                        } else {
                            const newChat = await addDoc(collection(db, 'chats'), {
                                name: grp.name,
                                type: 'group',
                                groupId: grp.id,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                                participants: []
                            });
                            chatId = newChat.id;
                        }
                    } else {
                        chatId = chatsSnap.docs[0].id;
                    }

                    // Add message
                    await addDoc(collection(db, 'chats', chatId, 'messages'), {
                        text: messageText,
                        senderId: 'admin_sparta',
                        senderName: 'Администрация Спарта',
                        timestamp: serverTimestamp(),
                        isPinned,
                        type: 'schedule_announcement',
                        scheduleMeta: {
                            groupId: grp.id,
                            groupName: grp.name,
                            coachName: getCoachName(grp.coachId)
                        }
                    });

                    // Update chat last message
                    await updateDoc(doc(db, 'chats', chatId), {
                        lastMessage: `🗓 Новое расписание: ${grp.name}`,
                        lastMessageAt: serverTimestamp(),
                        lastMessageBy: 'admin_sparta'
                    });

                    successfulSends++;
                }
            }

            setSentCount(successfulSends);
            if (onSuccess) onSuccess();

            setTimeout(() => {
                onClose();
            }, 1800);
        } catch (error) {
            console.error('Error publishing schedule to Sparta messenger:', error);
            alert('Ошибка при публикации расписания. Попробуйте еще раз.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-[#16161a] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sparta-gold/15 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold shadow-md">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white font-russo flex items-center gap-2">
                                <span>Публикация расписания в Мессенджер Спарта</span>
                            </h2>
                            <p className="text-white/40 text-xs mt-0.5">
                                Мгновенная рассылка интерактивного графика в родительские и групповые чаты
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Grid: Controls (Left) + Live Preview (Right) */}
                <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0c0c0e]">
                    {/* Left Column: Form Settings */}
                    <div className="lg:col-span-6 space-y-4 text-left">
                        {/* 1. Target Audience */}
                        <div className="bg-[#151518] border border-white/10 rounded-2xl p-4 space-y-3">
                            <label className="block text-white/80 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sparta-gold">
                                <Users size={14} /> 1. Куда опубликовать?
                            </label>

                            <div className="space-y-2">
                                <label
                                    onClick={() => setTargetMode('ALL_GROUPS')}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        targetMode === 'ALL_GROUPS'
                                            ? 'bg-sparta-gold/10 border-sparta-gold/50 text-white'
                                            : 'bg-black/40 border-white/5 text-white/60 hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="target"
                                        checked={targetMode === 'ALL_GROUPS'}
                                        onChange={() => setTargetMode('ALL_GROUPS')}
                                        className="mt-1 accent-sparta-gold"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-white flex items-center gap-2">
                                            <span>Во все чаты групп Спарта ({groups.length})</span>
                                            <span className="bg-sparta-gold/20 text-sparta-gold text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                                                Авто
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-white/40 mt-0.5">
                                            Каждая группа получит персональную карточку своего расписания
                                        </div>
                                    </div>
                                </label>

                                <label
                                    onClick={() => setTargetMode('SINGLE_GROUP')}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        targetMode === 'SINGLE_GROUP'
                                            ? 'bg-sparta-gold/10 border-sparta-gold/50 text-white'
                                            : 'bg-black/40 border-white/5 text-white/60 hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="target"
                                        checked={targetMode === 'SINGLE_GROUP'}
                                        onChange={() => setTargetMode('SINGLE_GROUP')}
                                        className="mt-1 accent-sparta-gold"
                                    />
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-white">Только в конкретный чат группы</div>
                                        {targetMode === 'SINGLE_GROUP' && (
                                            <select
                                                value={selectedGroupId}
                                                onChange={e => setSelectedGroupId(e.target.value)}
                                                className="w-full bg-black border border-white/15 rounded-xl p-2 text-xs text-white mt-2 focus:border-sparta-gold outline-none cursor-pointer font-medium"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>
                                                        {g.name} ({g.ageRange?.min || 0}–{g.ageRange?.max || 18} лет)
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </label>

                                <label
                                    onClick={() => setTargetMode('CHANNEL')}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        targetMode === 'CHANNEL'
                                            ? 'bg-sparta-gold/10 border-sparta-gold/50 text-white'
                                            : 'bg-black/40 border-white/5 text-white/60 hover:bg-white/5'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="target"
                                        checked={targetMode === 'CHANNEL'}
                                        onChange={() => setTargetMode('CHANNEL')}
                                        className="mt-1 accent-sparta-gold"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-white">Общий канал новостей Спарта</div>
                                        <div className="text-[11px] text-white/40 mt-0.5">
                                            Единое расписание всех возрастов для всей школы
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* 2. Custom Note / Announcement */}
                        <div className="bg-[#151518] border border-white/10 rounded-2xl p-4 space-y-3">
                            <label className="block text-white/80 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-sparta-gold">
                                <Sparkles size={14} /> 2. Комментарий или объявление
                            </label>

                            <textarea
                                value={customNote}
                                onChange={e => setCustomNote(e.target.value)}
                                placeholder="Например: Не забудьте сменную обувь и форму!"
                                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-sparta-gold outline-none h-20 resize-none font-sans"
                            />

                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={isPinned}
                                        onChange={e => setIsPinned(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-black accent-sparta-gold cursor-pointer"
                                    />
                                    <span className="flex items-center gap-1">
                                        <Pin size={12} className="text-sparta-gold" />
                                        Закрепить сообщение в шапке чата
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Live Mobile Preview */}
                    <div className="lg:col-span-6 space-y-3 text-left">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white/60 uppercase tracking-wider font-mono">
                                📱 Живое превью в Мессенджере Спарта
                            </span>
                            <span className="text-[10px] text-white/40">
                                {targetMode === 'ALL_GROUPS' ? 'Пример для группы' : 'Точный вид'}
                            </span>
                        </div>

                        {/* Mobile Phone Mockup Screen */}
                        <div className="bg-[#18181c] border-2 border-white/10 rounded-3xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
                            {/* Chat Top Bar */}
                            <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                                <div className="w-8 h-8 rounded-full bg-sparta-gold/20 text-sparta-gold flex items-center justify-center font-bold text-xs shrink-0">
                                    ⚽
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-xs font-bold text-white truncate">
                                        {targetMode === 'CHANNEL' ? '📢 Новости и Анонсы Спарта' : (previewGroup?.name || 'Чат группы')}
                                    </div>
                                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <span>Онлайн чат Спарта</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pinned Badge if enabled */}
                            {isPinned && (
                                <div className="bg-sparta-gold/10 border border-sparta-gold/30 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-sparta-gold font-medium">
                                    <Pin size={11} className="rotate-45" />
                                    <span>Закрепленное сообщение администрации</span>
                                </div>
                            )}

                            {/* Message Bubble (Branded Sparta Card) */}
                            <div className="bg-[#1f1f26] border border-sparta-gold/40 rounded-2xl p-4 space-y-3 shadow-lg relative">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-sparta-gold text-black flex items-center justify-center font-bold text-[10px]">
                                            SP
                                        </div>
                                        <div>
                                            <div className="text-xs font-russo text-white">
                                                SPARTA • РАСПИСАНИЕ
                                            </div>
                                            <div className="text-[9px] text-white/40">
                                                Администрация • Только что
                                            </div>
                                        </div>
                                    </div>
                                    <span className="bg-sparta-gold/20 text-sparta-gold text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                                        ОФИЦИАЛЬНО
                                    </span>
                                </div>

                                {/* Group & Coach Info */}
                                <div>
                                    <div className="text-sm font-bold text-white font-russo">
                                        {targetMode === 'CHANNEL' ? 'Сводка всех групп' : previewGroup?.name}
                                    </div>
                                    <div className="text-[11px] text-white/60 flex items-center gap-2 mt-0.5">
                                        <span>Возраст: {previewGroup?.ageRange?.min || 0}–{previewGroup?.ageRange?.max || 18} лет</span>
                                        <span>•</span>
                                        <span className="text-sparta-gold font-medium">
                                            {getCoachName(previewGroup?.coachId)}
                                        </span>
                                    </div>
                                </div>

                                {/* Days Slots List */}
                                <div className="space-y-1.5 pt-1">
                                    {previewGroup?.schedule && previewGroup.schedule.length > 0 ? (
                                        previewGroup.schedule.map((s, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-sparta-gold text-[11px] w-6">
                                                        {getShortDay(s.day)}
                                                    </span>
                                                    <span className="text-white font-medium text-[11px]">
                                                        {s.day}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px]">
                                                    <span className="font-mono font-bold text-white">
                                                        {s.time}{s.endTime ? `–${s.endTime}` : ''}
                                                    </span>
                                                    <span className="text-white/40 text-[10px]">
                                                        📍 {s.location || 'Манеж'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-white/30 italic py-1">
                                            Расписание не задано
                                        </div>
                                    )}
                                </div>

                                {/* Custom Note Box */}
                                {customNote.trim() && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                                        <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                        <div className="leading-snug">{customNote.trim()}</div>
                                    </div>
                                )}

                                {/* Interactive Action Button inside chat */}
                                <div className="pt-1">
                                    <div className="w-full py-2 bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                                        <span>⚽ Открыть дневник тренировок</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-white/10 bg-[#16161a] flex items-center justify-between shrink-0">
                    <button
                        onClick={onClose}
                        disabled={sending}
                        className="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
                    >
                        Отмена
                    </button>

                    <div className="flex items-center gap-3">
                        {sentCount !== null && (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                                <CheckCircle2 size={16} />
                                Опубликовано в {sentCount} чат(ов)!
                            </span>
                        )}

                        <button
                            onClick={handlePublish}
                            disabled={sending || (sentCount !== null)}
                            className="bg-sparta-gold hover:bg-[#ffd700] text-black font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-sparta-gold/20 hover:shadow-sparta-gold/40 transition-all flex items-center gap-2 cursor-pointer text-xs disabled:opacity-50"
                        >
                            {sending ? (
                                <>
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Публикация в чаты...</span>
                                </>
                            ) : sentCount !== null ? (
                                <>
                                    <Check size={15} />
                                    <span>Готово!</span>
                                </>
                            ) : (
                                <>
                                    <Send size={15} className="fill-black" />
                                    <span>
                                        {targetMode === 'ALL_GROUPS'
                                            ? `Опубликовать во все группы (${groups.length})`
                                            : targetMode === 'SINGLE_GROUP'
                                            ? 'Опубликовать в чат группы'
                                            : 'Опубликовать в общий канал'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
