import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    BookOpen,
    Zap,
    Clock,
    Save,
    Trash2,
    Settings,
    Edit2,
    CheckCircle,
    Users,
    Video,
    Film,
    ShieldAlert
} from 'lucide-react';
import { ScheduleOverrideModal } from '../schedule/ScheduleOverrideModal';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isToday,
    startOfDay,
    subMonths,
    addMonths,
    parseISO
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { GlassCard, Button } from '../UIComponents';

interface CoachCalendarProps {
    userProfile: any;
    myGroups: any[];
    exercises?: any[];
}

const CoachCalendar: React.FC<CoachCalendarProps> = ({ userProfile, myGroups, exercises = [] }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [trainingPlan, setTrainingPlan] = useState<any[]>([]);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
    const [presets, setPresets] = useState<any[]>([]);
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

    // Form state for new topic
    const [editingTopic, setEditingTopic] = useState<{
        id?: string;
        title: string;
        description: string;
        type: 'technique' | 'strength' | 'sparing' | 'other';
        groupId: string;
        videoUrl?: string;
        time: string;
    }>({
        title: '',
        description: '',
        type: 'technique',
        groupId: myGroups[0]?.id || '',
        videoUrl: '',
        time: '18:00'
    });

    useEffect(() => {
        if (!userProfile?.coachId) return;

        const q = query(
            collection(db, "training_plan"),
            where("coachId", "==", userProfile.coachId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTrainingPlan(data);
            setLoading(false);
        });

        // Fetch Presets
        const presetsQ = query(
            collection(db, "training_presets"),
            where("coachId", "==", userProfile.coachId)
        );

        const unsubscribePresets = onSnapshot(presetsQ, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPresets(data);
        });

        return () => {
            unsubscribe();
            unsubscribePresets();
        };
    }, [userProfile?.coachId]);

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const getTopicsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return trainingPlan
            .filter(t => t.date === dateStr && (selectedGroupId === 'all' || t.groupId === selectedGroupId))
            .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    };

    const getGroupShortName = (groupId: string) => {
        const group = myGroups.find(g => g.id === groupId);
        if (!group) return '??';
        const words = group.name.split(' ');
        if (words.length >= 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return group.name.substring(0, 2).toUpperCase();
    };

    const getGroupColor = (groupId: string) => {
        const index = myGroups.findIndex(g => g.id === groupId);
        const colors = [
            '#d4af37', // Gold
            '#3b82f6', // Blue
            '#a855f7', // Purple
            '#10b981', // Green
            '#f97316', // Orange
            '#ec4899'  // Pink
        ];
        return colors[index % colors.length];
    };

    const handleSaveTopic = async () => {
        if (!selectedDay || !editingTopic.title.trim()) return;

        const dateStr = format(selectedDay, 'yyyy-MM-dd');
        const topicId = editingTopic.id || `${dateStr}_${editingTopic.groupId}_${Date.now()}`;

        try {
            await setDoc(doc(db, "training_plan", topicId), {
                ...editingTopic,
                id: topicId,
                date: dateStr,
                coachId: userProfile.coachId,
                updatedAt: serverTimestamp()
            });
            setIsTopicModalOpen(false);
            setEditingTopic({ title: '', description: '', type: 'technique', groupId: selectedGroupId === 'all' ? (myGroups[0]?.id || '') : selectedGroupId, videoUrl: '', time: '18:00' });
        } catch (error) {
            console.error("Error saving topic:", error);
            alert("Ошибка при сохранении");
        }
    };

    const handleSaveAsPreset = async () => {
        if (!editingTopic.title.trim()) {
            alert("Сначала введите название темы");
            return;
        }

        setIsSavingPreset(true);
        try {
            const presetId = `preset_${Date.now()}`;
            await setDoc(doc(db, "training_presets", presetId), {
                title: editingTopic.title,
                description: editingTopic.description,
                type: editingTopic.type,
                videoUrl: editingTopic.videoUrl || '',
                time: editingTopic.time || '18:00',
                coachId: userProfile.coachId,
                createdAt: serverTimestamp()
            });
            alert("Шаблон сохранен в вашу библиотеку!");
        } catch (error) {
            console.error("Error saving preset:", error);
            alert("Ошибка при сохранении шаблона");
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleDeletePreset = async (id: string) => {
        if (!window.confirm("Удалить этот шаблон?")) return;
        try {
            await deleteDoc(doc(db, "training_presets", id));
        } catch (error) {
            console.error("Error deleting preset:", error);
        }
    };

    const applyPreset = (preset: any) => {
        setEditingTopic({
            ...editingTopic,
            title: preset.title,
            description: preset.description,
            type: preset.type,
            videoUrl: preset.videoUrl || '',
            time: preset.time || '18:00'
        });
        if (!isTopicModalOpen) {
            // If we are applying from the side panel, we need to know for which day.
            // Let's assume the user selects a day first.
            if (!selectedDay) {
                alert("Сначала выберите день в календаре");
                return;
            }
            setIsTopicModalOpen(true);
        }
    };

    const handleDeleteTopic = async (id: string) => {
        if (!window.confirm("Удалить этот план?")) return;
        try {
            await deleteDoc(doc(db, "training_plan", id));
        } catch (error) {
            console.error("Error deleting topic:", error);
        }
    };

    const getTopicColor = (type: string) => {
        switch (type) {
            case 'technique': return 'text-sparta-gold bg-sparta-gold/20 border-sparta-gold/30';
            case 'strength': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            case 'sparing': return 'text-red-500 bg-red-500/20 border-red-500/30';
            default: return 'text-white/60 bg-white/10 border-white/20';
        }
    };

    return (
        <div className="space-y-8 pb-20 dashboard-theme">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-russo text-white uppercase tracking-tight">Планировщик сезона</h3>
                    <p className="text-white/40 text-sm mt-1">Составляйте программу тренировок и следите за темами занятий</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsOverrideModalOpen(true)}
                        className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                        title="Отмена занятия, перенос времени или замена тренера с авто-уведомлением родителей"
                    >
                        <ShieldAlert size={16} />
                        <span>⚡ Форс-мажор / Отмена</span>
                    </button>

                    <div className="flex items-center gap-2 bg-field border border-main rounded-2xl p-1.5 h-fit">
                        <button
                            onClick={() => setSelectedGroupId('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedGroupId === 'all' ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white'}`}
                        >
                            Все группы
                        </button>
                        {myGroups.map(g => (
                            <button
                                key={g.id}
                                onClick={() => setSelectedGroupId(g.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedGroupId === g.id ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white'}`}
                            >
                                {g.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Calendar Grid */}
                <div className="lg:col-span-8">
                    <GlassCard className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold">
                                    <CalendarIcon size={24} />
                                </div>
                                <h3 className="text-2xl font-russo text-white uppercase tracking-wider">
                                    {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={prevMonth} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white border border-white/5">
                                    <ChevronLeft size={24} />
                                </button>
                                <button onClick={nextMonth} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white border border-white/5">
                                    <ChevronRight size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-3 mb-4">
                            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                                <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-white/20">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-3">
                            {/* Empty start days */}
                            {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-[4/5] bg-transparent" />
                            ))}

                            {monthDays.map(day => {
                                const dayTopics = getTopicsForDay(day);
                                const isSelected = selectedDay && isSameDay(day, selectedDay);

                                return (
                                    <motion.div
                                        key={day.toISOString()}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        onClick={() => {
                                            setSelectedDay(day);
                                            // If topics exist, maybe show list. If not, open add modal.
                                        }}
                                        className={`min-h-[100px] border relative rounded-2xl p-2 transition-all cursor-pointer flex flex-col group ${isToday(day) ? 'bg-sparta-gold/[0.03] border-sparta-gold/50' : 'bg-field border-main hover:border-sparta-gold/30'
                                            } ${isSelected ? 'ring-2 ring-sparta-gold bg-sparta-gold/[0.05]' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-black p-1 rounded-lg ${isToday(day) ? 'text-sparta-gold' : 'text-white/60 transition-all opacity-100'}`}>
                                                {format(day, 'd')}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDay(day);
                                                    setEditingTopic({ title: '', description: '', type: 'technique', groupId: selectedGroupId === 'all' ? (myGroups[0]?.id || '') : selectedGroupId, videoUrl: '', time: '18:00' });
                                                    setIsTopicModalOpen(true);
                                                }}
                                                className="opacity-50 group-hover:opacity-100 p-1 hover:bg-sparta-gold hover:text-black rounded-lg text-sparta-gold transition-all cursor-pointer"
                                                title="Добавить занятие"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                                            {dayTopics.map((topic) => (
                                                <div
                                                    key={topic.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDay(day);
                                                        setEditingTopic(topic);
                                                        setIsTopicModalOpen(true);
                                                    }}
                                                    className={`px-1.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight border truncate flex items-center gap-2 shadow-sm ${getTopicColor(topic.type)}`}
                                                >
                                                    <span className="font-russo opacity-100 text-white/90 brightness-110">{topic.time || '18:00'}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-black/20 text-[8px] font-black border border-white/10" style={{ color: getGroupColor(topic.groupId) }}>
                                                        {getGroupShortName(topic.groupId)}
                                                    </span>
                                                    <span className="truncate opacity-90">{topic.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </div>

                {/* Legend & Details */}
                <div className="lg:col-span-4 space-y-6">
                    <GlassCard className="p-6">
                        <h4 className="text-xl font-russo text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                            <Settings className="text-sparta-gold" size={20} /> Управление
                        </h4>

                        <div className="space-y-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Типы занятий</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-sparta-gold" />
                                        <span className="text-xs text-white/60">Техника / Приемы</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                        <span className="text-xs text-white/60">Физ. подготовка / Сила</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <span className="text-xs text-white/60">Спарринги / Борьба</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-sparta-gold/10 rounded-2xl border border-sparta-gold/20">
                                <div className="flex gap-3">
                                    <Zap size={18} className="text-sparta-gold shrink-0" />
                                    <p className="text-[10px] text-sparta-gold/80 leading-relaxed font-bold italic">
                                        Темы, которые вы планируете здесь, будут видны помощникам тренера и в будущем — ученикам для подготовки к занятию.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <h4 className="text-xl font-russo text-white uppercase tracking-tight mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BookOpen className="text-sparta-gold" size={20} /> Мои шаблоны
                            </div>
                            <span className="text-[8px] font-black bg-sparta-gold/10 text-sparta-gold px-2 py-1 rounded-lg">{presets.length}</span>
                        </h4>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                            {presets.length === 0 ? (
                                <p className="text-[10px] text-white/20 italic text-center py-4">У вас пока нет сохраненных шаблонов</p>
                            ) : (
                                presets.map(preset => (
                                    <div
                                        key={preset.id}
                                        className="group p-3 bg-white/5 border border-white/5 rounded-2xl hover:border-sparta-gold/30 transition-all cursor-pointer relative"
                                        onClick={() => applyPreset(preset)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h5 className="text-[10px] font-bold text-white group-hover:text-sparta-gold transition-colors truncate pr-6">{preset.title}</h5>
                                            <button
                                                className="absolute top-2.5 right-2.5 opacity-40 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 transition-all cursor-pointer"
                                                title="Удалить пресет"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${preset.type === 'technique' ? 'bg-sparta-gold' :
                                                    preset.type === 'strength' ? 'bg-blue-500' : 'bg-red-500'
                                                }`} />
                                            <span className="text-[8px] text-white/20 uppercase font-black">{preset.type}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>

                    {selectedDay && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-card glass-panel border border-main rounded-3xl p-6"
                        >
                            <h4 className="text-lg font-russo text-white uppercase tracking-tight mb-4 flex items-center justify-between">
                                <span>{format(selectedDay, 'd MMMM', { locale: ru })}</span>
                                <button onClick={() => setSelectedDay(null)} className="text-white/20 hover:text-white">
                                    <X size={18} />
                                </button>
                            </h4>

                            <div className="space-y-3">
                                {getTopicsForDay(selectedDay).length === 0 ? (
                                    <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Ничего не запланировано</p>
                                        <Button
                                            onClick={() => setIsTopicModalOpen(true)}
                                            className="mt-4 px-4 py-2 text-[8px] h-auto"
                                        >
                                            Добавить тему
                                        </Button>
                                    </div>
                                ) : (
                                    getTopicsForDay(selectedDay).map(topic => (
                                        <div
                                            key={topic.id}
                                            className={`p-4 rounded-2xl border transition-all ${getTopicColor(topic.type)}`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-lg font-black">{topic.time || '18:00'}</span>
                                                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-white shadow-sm" style={{ backgroundColor: getGroupColor(topic.groupId) }}>
                                                    {myGroups.find(g => g.id === topic.groupId)?.name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-bold text-sm tracking-tight">{topic.title}</h5>
                                                <div className="flex gap-2 text-white/40">
                                                    <button onClick={() => { setEditingTopic(topic); setIsTopicModalOpen(true); }} className="hover:text-white transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteTopic(topic.id)} className="hover:text-red-500 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] opacity-70 leading-relaxed">{topic.description}</p>
                                            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <Users size={10} />
                                                    <span className="text-[9px] font-black uppercase whitespace-nowrap">{myGroups.find(g => g.id === topic.groupId)?.name}</span>
                                                </div>
                                                {topic.videoUrl && (
                                                    <div className="flex items-center gap-1.5 text-sparta-gold">
                                                        <Video size={12} />
                                                        <span className="text-[9px] font-black uppercase">Видео разбор</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isTopicModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsTopicModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-sparta-gold/20 rounded-2xl text-sparta-gold">
                                        <BookOpen size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-russo text-white uppercase">План занятия</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-sparta-gold mt-1">
                                            {selectedDay ? format(selectedDay, 'd MMMM yyyy', { locale: ru }) : ''}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsTopicModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Выберите из базы (опционально)</label>
                                            {exercises.length > 0 && <span className="text-[8px] font-bold text-sparta-gold uppercase tracking-widest">Доступно: {exercises.length}</span>}
                                        </div>
                                        <select
                                            onChange={(e) => {
                                                const ex = exercises.find(ex => ex.id === e.target.value);
                                                if (ex) {
                                                    setEditingTopic({
                                                        ...editingTopic,
                                                        title: ex.title,
                                                        description: ex.description,
                                                        type: ex.category as any || 'technique',
                                                        videoUrl: ex.videoUrl || ''
                                                    });
                                                }
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold appearance-none cursor-pointer text-xs"
                                        >
                                            <option value="">-- Быстрый выбор упражнения --</option>
                                            {exercises.map(ex => (
                                                <option key={ex.id} value={ex.id}>{ex.title} ({ex.category})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Тема тренировки</label>
                                        <input
                                            type="text"
                                            value={editingTopic.title}
                                            onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                                            placeholder="Например: Проход гарда Тореандо"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold placeholder:text-white/10"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Время</label>
                                            <input
                                                type="time"
                                                value={editingTopic.time}
                                                onChange={(e) => setEditingTopic({ ...editingTopic, time: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Тип занятия</label>
                                            <select
                                                value={editingTopic.type}
                                                onChange={(e) => setEditingTopic({ ...editingTopic, type: e.target.value as any })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="technique">Техника</option>
                                                <option value="strength">Физ. подготовка</option>
                                                <option value="sparing">Спарринг</option>
                                                <option value="other">Другое</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Целевая группа</label>
                                            <select
                                                value={editingTopic.groupId}
                                                onChange={(e) => setEditingTopic({ ...editingTopic, groupId: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                {myGroups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Детали и ключевые моменты</label>
                                        <textarea
                                            rows={4}
                                            value={editingTopic.description}
                                            onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                                            placeholder="Опишите структуру тренировки, разминку и основные приемы..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold placeholder:text-white/10 resize-none h-32"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Ссылка на видео (YouTube/Vimeo/Cloud)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={editingTopic.videoUrl || ''}
                                                onChange={(e) => setEditingTopic({ ...editingTopic, videoUrl: e.target.value })}
                                                placeholder="https://youtube.com/..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-sparta-gold/50 transition-all font-bold placeholder:text-white/10"
                                            />
                                            <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-sparta-gold/5 border border-sparta-gold/10 rounded-2xl">
                                        <div>
                                            <p className="text-[10px] font-bold text-sparta-gold uppercase">Сохранить как шаблон?</p>
                                            <p className="text-[8px] text-white/40 mt-0.5">Вы сможете переиспользовать этот план позже</p>
                                        </div>
                                        <button
                                            onClick={handleSaveAsPreset}
                                            disabled={isSavingPreset}
                                            className="px-4 py-2 bg-sparta-gold/10 hover:bg-sparta-gold text-sparta-gold hover:text-black rounded-xl text-[8px] font-black uppercase transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSavingPreset ? 'Сохранение...' : <><Save size={12} /> Сохранить</>}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <Button
                                        onClick={() => setIsTopicModalOpen(false)}
                                        variant="outline"
                                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest h-auto"
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        onClick={handleSaveTopic}
                                        className="flex-1 py-4 bg-sparta-gold text-black font-black uppercase tracking-widest h-auto shadow-lg shadow-sparta-gold/20"
                                    >
                                        <Save size={18} /> {editingTopic.id ? 'Обновить план' : 'Запланировать'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Force Majeure & Schedule Overrides Modal */}
            <ScheduleOverrideModal
                isOpen={isOverrideModalOpen}
                onClose={() => setIsOverrideModalOpen(false)}
                creatorName={userProfile?.displayName || 'Тренер'}
                availableGroups={myGroups.map(g => ({ id: g.id, name: g.name, coachName: userProfile?.displayName }))}
            />
        </div>
    );
};

export default CoachCalendar;