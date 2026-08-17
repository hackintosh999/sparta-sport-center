import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc, getDocs, where } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Loader, X, Search, Clock, Save, Video, Radio, Camera, Send, Trophy, Shield, MapPin, User, Calendar, Bell, CheckCircle2, Play } from 'lucide-react';
import { Broadcast, StreamSourceType, BroadcastStatus } from '../../types/broadcast';
import { DirectStreamBroadcaster } from '../../components/DirectStreamBroadcaster';
import { Button } from '../../components/UIComponents';

export const AdminBroadcasts = () => {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeStudioTab, setActiveStudioTab] = useState<'camera_live' | 'schedule_match' | 'external_stream' | 'manage_all'>('manage_all');
    const [searchQuery, setSearchQuery] = useState('');

    // Selected Active Camera Broadcast
    const [activeCameraBroadcastId, setActiveCameraBroadcastId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        tournamentName: string;
        opponentName: string;
        opponentLogo: string;
        ageCategory: string;
        locationName: string;
        coachName: string;
        streamSourceType: StreamSourceType;
        videoUrl: string;
        scheduledDate: string;
        scheduledTime: string;
        status: BroadcastStatus;
        scoreSparta: number;
        scoreOpponent: number;
        matchTime: string;
        sendNotificationToParents: boolean;
    }>({
        title: '',
        description: '',
        tournamentName: 'Первенство Города',
        opponentName: '',
        opponentLogo: '',
        ageCategory: '2017-2018',
        locationName: 'Манеж Грани • Поле №1',
        coachName: 'Главный тренер Спарта',
        streamSourceType: 'direct_camera',
        videoUrl: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '18:30',
        status: 'live',
        scoreSparta: 0,
        scoreOpponent: 0,
        matchTime: '1-й тайм 0\'',
        sendNotificationToParents: true
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Broadcast[];

            setBroadcasts(data);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setFeedbackMessage({ type: 'error', text: `Ошибка доступа к БД: ${error.message}` });
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSaveBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Укажите название матча или трансляции!');
            return;
        }

        setIsSaving(true);
        setFeedbackMessage(null);

        try {
            // Calculate scheduled start time
            let scheduledStartTime: any = null;
            if (formData.scheduledDate && formData.scheduledTime) {
                const combinedDate = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
                scheduledStartTime = combinedDate;
            }

            const roomId = editingId ? (broadcasts.find(b => b.id === editingId)?.webrtcRoomId || `room_${Date.now()}`) : `room_${Date.now()}`;

            const broadcastPayload: any = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                tournamentName: formData.tournamentName.trim(),
                opponentName: formData.opponentName.trim(),
                opponentLogo: formData.opponentLogo.trim(),
                ageCategory: formData.ageCategory,
                locationName: formData.locationName.trim(),
                coachName: formData.coachName.trim(),
                streamSourceType: formData.streamSourceType,
                streamUrl: formData.videoUrl.trim(),
                videoUrl: formData.videoUrl.trim(),
                status: formData.status,
                isLive: formData.status === 'live',
                isScheduled: formData.status === 'scheduled',
                scheduledStartTime: scheduledStartTime,
                webrtcRoomId: roomId,
                scoreSparta: Number(formData.scoreSparta) || 0,
                scoreOpponent: Number(formData.scoreOpponent) || 0,
                matchTime: formData.matchTime || '1-й тайм',
                updatedAt: serverTimestamp()
            };

            let savedDocId = editingId;

            if (editingId) {
                await updateDoc(doc(db, "broadcasts", editingId), broadcastPayload);
            } else {
                broadcastPayload.createdAt = serverTimestamp();
                const newDocRef = await addDoc(collection(db, "broadcasts"), broadcastPayload);
                savedDocId = newDocRef.id;
            }

            // Automatically dispatch targeted notifications to parents if requested
            if (formData.sendNotificationToParents && !editingId) {
                try {
                    const usersSnap = await getDocs(collection(db, 'users'));
                    const notifPromises: Promise<any>[] = [];

                    usersSnap.forEach((uDoc) => {
                        const uData = uDoc.data();
                        // If parent or student matches age group or all
                        const childYear = uData.birthYear || (uData.childBirthYear ? Number(uData.childBirthYear) : null);
                        const isMatch = formData.ageCategory === 'all' || !childYear || formData.ageCategory.includes(String(childYear));

                        if (isMatch) {
                            notifPromises.push(
                                addDoc(collection(db, 'notifications'), {
                                    userId: uDoc.id,
                                    email: uData.email || '',
                                    title: `🏆 Прямой эфир: ${formData.title}`,
                                    message: `Матч ${formData.title} (${formData.ageCategory}) начинается ${formData.scheduledDate} в ${formData.scheduledTime}. Подключайтесь к SPARTA TV!`,
                                    type: 'broadcast_announcement',
                                    broadcastId: savedDocId,
                                    isRead: false,
                                    createdAt: serverTimestamp()
                                })
                            );
                        }
                    });

                    await Promise.all(notifPromises);
                } catch (e) {
                    console.error('Error dispatching notifications:', e);
                }
            }

            setFeedbackMessage({
                type: 'success',
                text: editingId ? 'Трансляция успешно обновлена!' : 'Трансляция создана и уведомления разосланы родителям!'
            });

            // If camera live, switch directly to camera studio
            if (formData.streamSourceType === 'direct_camera' && formData.status === 'live') {
                setActiveCameraBroadcastId(savedDocId);
                setActiveStudioTab('camera_live');
            } else {
                setActiveStudioTab('manage_all');
            }

            // Reset form
            setEditingId(null);
        } catch (error: any) {
            console.error("Error saving broadcast:", error);
            setFeedbackMessage({ type: 'error', text: `Ошибка сохранения: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Удалить эту трансляцию?")) return;
        try {
            await deleteDoc(doc(db, "broadcasts", id));
            setFeedbackMessage({ type: 'success', text: 'Трансляция удалена' });
        } catch (error: any) {
            console.error("Error deleting broadcast:", error);
            setFeedbackMessage({ type: 'error', text: `Ошибка удаления: ${error.message}` });
        }
    };

    const handleQuickScoreUpdate = async (broadcastId: string, deltaSparta: number, deltaOpponent: number) => {
        const target = broadcasts.find(b => b.id === broadcastId);
        if (!target) return;
        const newSparta = Math.max(0, (target.scoreSparta || 0) + deltaSparta);
        const newOpponent = Math.max(0, (target.scoreOpponent || 0) + deltaOpponent);

        await updateDoc(doc(db, 'broadcasts', broadcastId), {
            scoreSparta: newSparta,
            scoreOpponent: newOpponent
        });
    };

    const handleQuickStatusToggle = async (broadcastId: string, newStatus: BroadcastStatus) => {
        await updateDoc(doc(db, 'broadcasts', broadcastId), {
            status: newStatus,
            isLive: newStatus === 'live',
            isScheduled: newStatus === 'scheduled'
        });
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto font-manrope text-white space-y-8">
            {/* Studio Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-sparta-gold">SPARTA STUDIO CONTROL</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-russo uppercase tracking-wider text-white">
                        Управление Медиацентром
                    </h1>
                </div>

                {/* Studio Tab Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { id: 'camera_live', label: '🎥 Прямой эфир с камеры', icon: Camera },
                        { id: 'schedule_match', label: '📅 Запланировать матч', icon: Calendar },
                        { id: 'external_stream', label: '🔗 YouTube / VK Стрим', icon: Video },
                        { id: 'manage_all', label: '📋 Все трансляции', icon: Trophy }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveStudioTab(tab.id as any);
                                    if (tab.id === 'camera_live' && !activeCameraBroadcastId && broadcasts.length > 0) {
                                        const liveOne = broadcasts.find(b => b.streamSourceType === 'direct_camera' || b.isLive);
                                        if (liveOne) setActiveCameraBroadcastId(liveOne.id);
                                    }
                                }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                                    activeStudioTab === tab.id
                                        ? 'bg-sparta-gold text-black shadow-[0_0_20px_rgba(255,191,0,0.3)]'
                                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                            >
                                <Icon size={15} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Feedback Alert */}
            {feedbackMessage && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    feedbackMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 size={18} />
                        <span>{feedbackMessage.text}</span>
                    </div>
                    <button onClick={() => setFeedbackMessage(null)} className="p-1 opacity-50 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* TAB 1: Direct In-Browser Live Camera Studio */}
            {activeStudioTab === 'camera_live' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-sparta-gold/30 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-russo text-lg text-white flex items-center gap-2">
                                    <Camera className="text-sparta-gold" size={20} />
                                    СТРИМ-СТУДИЯ (КАМЕРА СМАРТФОНА / НОУТБУКА)
                                </h3>
                                <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold">
                                    Direct WebRTC
                                </span>
                            </div>

                            {(() => {
                                const currBroadcast = activeCameraBroadcastId ? broadcasts.find(b => b.id === activeCameraBroadcastId) : null;
                                return (
                                    <DirectStreamBroadcaster
                                        roomId={currBroadcast?.webrtcRoomId || activeCameraBroadcastId || 'sparta_main_arena'}
                                        broadcastId={currBroadcast?.id || null}
                                        broadcastTitle={currBroadcast?.title || 'Матч Академии Спарта'}
                                        scoreSparta={currBroadcast?.scoreSparta || 0}
                                        scoreOpponent={currBroadcast?.scoreOpponent || 0}
                                        opponentName={currBroadcast?.opponentName || 'Соперник'}
                                        ageCategory={currBroadcast?.ageCategory || '2017-2018'}
                                        onStreamEnded={() => {
                                            if (activeCameraBroadcastId) {
                                                handleQuickStatusToggle(activeCameraBroadcastId, 'finished');
                                            }
                                        }}
                                    />
                                );
                            })()}
                        </div>
                    </div>

                    {/* Live Scoreboard & Controls */}
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-6">
                            <h4 className="font-russo text-base text-white flex items-center gap-2">
                                <Trophy size={16} className="text-sparta-gold" />
                                ТАБЛО МАТЧА В РЕАЛЬНОМ ВРЕМЕНИ
                            </h4>

                            {activeCameraBroadcastId ? (
                                (() => {
                                    const curr = broadcasts.find(b => b.id === activeCameraBroadcastId);
                                    if (!curr) return <p className="text-xs text-white/40">Выберите активный матч</p>;
                                    return (
                                        <div className="space-y-6">
                                            <div className="p-4 rounded-2xl bg-black/60 border border-white/5 text-center">
                                                <span className="text-xs text-sparta-gold font-bold uppercase">{curr.title}</span>
                                                <div className="grid grid-cols-3 items-center mt-3">
                                                    <div>
                                                        <div className="text-xs text-white/50 mb-1">СПАРТА</div>
                                                        <div className="text-3xl font-russo text-white">{curr.scoreSparta || 0}</div>
                                                        <div className="flex gap-1 justify-center mt-2">
                                                            <button onClick={() => handleQuickScoreUpdate(curr.id, 1, 0)} className="px-2 py-1 bg-white/10 hover:bg-sparta-gold hover:text-black rounded text-xs font-bold">+1</button>
                                                            <button onClick={() => handleQuickScoreUpdate(curr.id, -1, 0)} className="px-2 py-1 bg-white/5 hover:bg-red-500 rounded text-xs font-bold">-1</button>
                                                        </div>
                                                    </div>
                                                    <div className="font-russo text-xl text-white/30">:</div>
                                                    <div>
                                                        <div className="text-xs text-white/50 mb-1">{curr.opponentName || 'СОПЕРНИК'}</div>
                                                        <div className="text-3xl font-russo text-white">{curr.scoreOpponent || 0}</div>
                                                        <div className="flex gap-1 justify-center mt-2">
                                                            <button onClick={() => handleQuickScoreUpdate(curr.id, 0, 1)} className="px-2 py-1 bg-white/10 hover:bg-sparta-gold hover:text-black rounded text-xs font-bold">+1</button>
                                                            <button onClick={() => handleQuickScoreUpdate(curr.id, 0, -1)} className="px-2 py-1 bg-white/5 hover:bg-red-500 rounded text-xs font-bold">-1</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Period / Match Time */}
                                            <div className="flex gap-2">
                                                {['1-й тайм', 'Перерыв', '2-й тайм', 'Матч завершен'].map((timeStr) => (
                                                    <button
                                                        key={timeStr}
                                                        onClick={() => updateDoc(doc(db, 'broadcasts', curr.id), { matchTime: timeStr })}
                                                        className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                                                            curr.matchTime === timeStr
                                                                ? 'bg-sparta-gold text-black border-sparta-gold'
                                                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                                        }`}
                                                    >
                                                        {timeStr}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <p className="text-xs text-white/40">Сначала создайте или выберите матч для ведения счета.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2 & 3: Match Form (Scheduled or External) */}
            {(activeStudioTab === 'schedule_match' || activeStudioTab === 'external_stream') && (
                <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-[#0f0f0f] border border-white/10 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h3 className="font-russo text-xl text-white flex items-center gap-2.5">
                            <Trophy className="text-sparta-gold" size={22} />
                            {activeStudioTab === 'schedule_match' ? 'ЗАПЛАНИРОВАТЬ МАТЧ (ЭКРАН ОЖИДАНИЯ & ОПОВЕЩЕНИЕ)' : 'ДОБАВИТЬ ЭФИР (YOUTUBE / VK / RUTUBE)'}
                        </h3>
                    </div>

                    <form onSubmit={handleSaveBroadcast} className="space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Название матча / трансляции *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="например: Спарта 2017 vs Торпедо • Финал Кубка"
                                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sparta-gold outline-none"
                            />
                        </div>

                        {/* Age Category & Tournament */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Возрастная группа</label>
                                <select
                                    value={formData.ageCategory}
                                    onChange={(e) => setFormData({ ...formData, ageCategory: e.target.value })}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                >
                                    <option value="2017-2018">2017-2018 г.р.</option>
                                    <option value="2015-2016">2015-2016 г.р.</option>
                                    <option value="2019-2020">2019-2020 г.р.</option>
                                    <option value="2021-2022">2021-2022 г.р.</option>
                                    <option value="all">Все группы (Клубный матч)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Турнир / Лига</label>
                                <input
                                    type="text"
                                    value={formData.tournamentName}
                                    onChange={(e) => setFormData({ ...formData, tournamentName: e.target.value })}
                                    placeholder="например: Первенство Города"
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                />
                            </div>
                        </div>

                        {/* Opponent & Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Имя соперника</label>
                                <input
                                    type="text"
                                    value={formData.opponentName}
                                    onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
                                    placeholder="например: ФК Локомотив"
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Место проведения</label>
                                <input
                                    type="text"
                                    value={formData.locationName}
                                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                                    placeholder="Манеж Грани • Поле №1"
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                />
                            </div>
                        </div>

                        {/* Date & Time for Scheduled */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Дата матча</label>
                                <input
                                    type="date"
                                    value={formData.scheduledDate}
                                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Время начала</label>
                                <input
                                    type="time"
                                    value={formData.scheduledTime}
                                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                />
                            </div>
                        </div>

                        {/* Stream Source */}
                        {activeStudioTab === 'external_stream' ? (
                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Ссылка на видео (YouTube / VK / Rutube / HLS)</label>
                                <input
                                    type="text"
                                    value={formData.videoUrl}
                                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value, streamSourceType: 'vk' })}
                                    placeholder="https://vk.com/video... или https://youtu.be/..."
                                    className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:border-sparta-gold outline-none"
                                />
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center gap-3">
                                <Camera className="text-sparta-gold shrink-0" size={24} />
                                <div className="text-xs text-white/80">
                                    <strong>Прямой эфир через сайт:</strong> Вы сможете запустить стрим прямо с камеры смартфона в момент начала матча во вкладке «Прямой эфир с камеры».
                                </div>
                            </div>
                        )}

                        {/* Status Selection */}
                        <div>
                            <label className="block text-xs font-bold text-white/70 mb-2 uppercase">Начальный статус</label>
                            <div className="flex gap-3">
                                {[
                                    { id: 'scheduled', label: '⏳ Экран ожидания (Скоро)' },
                                    { id: 'live', label: '🔴 Прямой эфир (LIVE)' },
                                    { id: 'finished', label: '📁 Запись в архив' }
                                ].map((st) => (
                                    <button
                                        type="button"
                                        key={st.id}
                                        onClick={() => setFormData({ ...formData, status: st.id as any })}
                                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                                            formData.status === st.id
                                                ? 'bg-sparta-gold text-black border-sparta-gold shadow-lg'
                                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                                        }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notification Checkbox */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Bell className="text-sparta-gold" size={18} />
                                <span className="text-xs font-bold text-white">Разослать push-уведомление родителям группы в личный кабинет</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.sendNotificationToParents}
                                onChange={(e) => setFormData({ ...formData, sendNotificationToParents: e.target.checked })}
                                className="w-5 h-5 accent-sparta-gold rounded cursor-pointer"
                            />
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="w-full h-14 bg-gradient-to-r from-amber-400 to-sparta-gold hover:from-amber-300 hover:to-amber-400 text-black font-bold rounded-2xl shadow-xl text-base flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                            <span>{editingId ? 'Сохранить изменения' : 'Создать трансляцию и запустить анонс'}</span>
                        </Button>
                    </form>
                </div>
            )}

            {/* TAB 4: Manage All Broadcasts */}
            {activeStudioTab === 'manage_all' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h3 className="font-russo text-xl text-white">СПИСОК ВСЕХ ТРАНСЛЯЦИЙ ({broadcasts.length})</h3>
                        <Button
                            onClick={() => {
                                setEditingId(null);
                                setActiveStudioTab('schedule_match');
                            }}
                            className="bg-sparta-gold text-black font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg"
                        >
                            <Plus size={16} /> Создать новый матч
                        </Button>
                    </div>

                    {broadcasts.length === 0 ? (
                        <div className="p-12 rounded-3xl bg-[#0f0f0f] border border-white/10 text-center text-white/40">
                            <Radio size={40} className="mx-auto mb-3 text-sparta-gold/30" />
                            <p className="font-russo text-base text-white">Трансляций пока нет</p>
                            <p className="text-xs mt-1">Нажмите «Создать новый матч», чтобы добавить первую игру.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {broadcasts.map((b) => (
                                <div key={b.id} className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-4 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                b.isLive || b.status === 'live' ? 'bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse' :
                                                b.status === 'scheduled' || b.isScheduled ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' :
                                                'bg-white/10 text-white/60'
                                            }`}>
                                                {b.isLive || b.status === 'live' ? '🔴 LIVE' : b.status === 'scheduled' || b.isScheduled ? '⏳ Скоро' : '📁 Запись'}
                                            </span>
                                            {b.ageCategory && (
                                                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/60 font-bold">
                                                    {b.ageCategory}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="font-russo text-base text-white line-clamp-2">{b.title}</h4>
                                        <p className="text-xs text-white/50 flex items-center gap-1.5">
                                            <Trophy size={12} className="text-sparta-gold shrink-0" />
                                            {b.tournamentName || 'Матч'} vs <strong className="text-white">{b.opponentName || 'Соперник'}</strong>
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                        <div className="flex gap-1.5">
                                            {b.isLive ? (
                                                <button
                                                    onClick={() => handleQuickStatusToggle(b.id, 'finished')}
                                                    className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Завершить
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleQuickStatusToggle(b.id, 'live')}
                                                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    В эфир
                                                </button>
                                            )}

                                            {b.streamSourceType === 'direct_camera' && (
                                                <button
                                                    onClick={() => {
                                                        setActiveCameraBroadcastId(b.id);
                                                        setActiveStudioTab('camera_live');
                                                    }}
                                                    className="px-3 py-1.5 bg-sparta-gold/20 text-sparta-gold hover:bg-sparta-gold hover:text-black rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Студия
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleDelete(b.id)}
                                            className="p-2 text-white/40 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminBroadcasts;
