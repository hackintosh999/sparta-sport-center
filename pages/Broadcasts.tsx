import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Video, Radio, Clock, PlayCircle, Users, ArrowLeft, User as UserIcon, Calendar, Shield, Trophy, MapPin, Sparkles, Filter, ChevronRight, Eye } from 'lucide-react';
import { Broadcast } from '../types/broadcast';
import { Container } from '../components/UIComponents';
import BroadcastChat from '../components/BroadcastChat';
import BroadcastReactions from '../components/BroadcastReactions';
import BroadcastArchiveModal from '../components/BroadcastArchiveModal';
import { BroadcastCountdown } from '../components/BroadcastCountdown';
import { DirectStreamViewer } from '../components/DirectStreamViewer';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Real-time Viewer Hook
const useViewers = (broadcastId: string, isLive: boolean) => {
    const [viewers, setViewers] = useState(0);

    useEffect(() => {
        if (!isLive || !broadcastId) return;

        const sessionId = Math.random().toString(36).substring(2, 15);
        const viewerRef = doc(db, 'broadcasts', broadcastId, 'viewers', sessionId);

        setDoc(viewerRef, { joinedAt: serverTimestamp() }).catch(console.error);

        const viewersQuery = collection(db, 'broadcasts', broadcastId, 'viewers');
        const unsubscribe = onSnapshot(viewersQuery, (snapshot) => {
            setViewers(snapshot.size);
        });

        return () => {
            unsubscribe();
            deleteDoc(viewerRef).catch(console.error);
        };
    }, [broadcastId, isLive]);

    return Math.max(1, viewers);
};

const getVideoEmbedUrl = (url: string) => {
    if (!url) return undefined;

    // YouTube
    const ytRegExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[1].length === 11) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1`;
    }

    // VK Video
    const vkRegExp = /(?:vk\.com|vk\.ru|vkvideo\.ru|live\.vkvideo\.ru)\/(?:video|.*?z=video)(-?\d+)_(\d+)/;
    const vkMatch = url.match(vkRegExp);
    if (vkMatch) {
        return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2&autoplay=1`;
    }

    if (url.includes('video_ext.php')) {
        return url;
    }

    if (url.toLowerCase().includes('<iframe')) {
        const srcMatch = url.match(/src=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) {
            return srcMatch[1];
        }
    }

    return url;
};

const Broadcasts = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'live' | 'schedule' | 'archive'>('live');
    const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('all');
    const [selectedArchive, setSelectedArchive] = useState<Broadcast | null>(null);
    const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "broadcasts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Broadcast[];

            setBroadcasts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] pt-32 pb-20 flex items-center justify-center font-manrope">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sparta-gold"></div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Загрузка SPARTA TV...</p>
                </div>
            </div>
        );
    }

    // Split broadcasts by status
    const liveBroadcasts = broadcasts.filter(b => b.isLive || b.status === 'live');
    const scheduledBroadcasts = broadcasts.filter(b => (!b.isLive && b.status !== 'live') && (b.isScheduled || b.status === 'scheduled' || b.scheduledStartTime));
    const archiveBroadcasts = broadcasts.filter(b => !b.isLive && b.status !== 'live' && !b.isScheduled && b.status !== 'scheduled' && !b.scheduledStartTime);

    // Apply age filters
    const filterByAge = (items: Broadcast[]) => {
        if (selectedAgeFilter === 'all') return items;
        return items.filter(b => b.ageCategory === selectedAgeFilter);
    };

    // Determine current active primary stream / hero match
    const currentPrimaryBroadcast = selectedBroadcastId
        ? broadcasts.find(b => b.id === selectedBroadcastId)
        : (liveBroadcasts[0] || scheduledBroadcasts[0] || null);

    const LiveViewersCounter = ({ broadcastId }: { broadcastId: string }) => {
        const viewers = useViewers(broadcastId, true);
        return (
            <span className="flex items-center gap-1.5 text-white bg-white/5 px-3 py-1 rounded-full border border-white/10 text-xs font-bold">
                <Users size={14} className="text-sparta-gold" /> {viewers} {viewers === 1 ? 'зритель' : 'зрителей'}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#060606] pb-24 font-manrope text-white selection:bg-sparta-gold selection:text-black">
            {/* 🧭 Sticky Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-[#0c0c0c]/90 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-2xl">
                {/* Brand & Back Button */}
                <div className="flex items-center gap-3 sm:gap-6">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                    >
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">На главную</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sparta-gold to-amber-500 flex items-center justify-center text-black font-russo text-lg shadow-lg">
                            S
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-russo text-lg tracking-wider text-white">SPARTA</span>
                                <span className="px-1.5 py-0.5 rounded bg-sparta-gold text-black font-black text-[10px] tracking-wider uppercase">TV</span>
                            </div>
                            <p className="text-[10px] text-white/40 font-medium hidden md:block">Медиацентр и прямые трансляции</p>
                        </div>
                    </div>
                </div>

                {/* Status Pills */}
                <div className="hidden md:flex items-center gap-3">
                    {liveBroadcasts.length > 0 ? (
                        <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            В ЭФИРЕ: {liveBroadcasts.length}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-medium">
                            <Radio size={12} /> Эфир свободен
                        </span>
                    )}

                    {scheduledBroadcasts.length > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold">
                            <Clock size={12} /> СКОРО: {scheduledBroadcasts.length}
                        </span>
                    )}
                </div>

                {/* Navigation Quick Links */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => navigate('/?section=schedule')}
                        className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all"
                    >
                        <Calendar size={14} className="text-sparta-gold" />
                        <span>Расписание</span>
                    </button>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-sparta-gold hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-1.5"
                    >
                        <UserIcon size={14} />
                        <span>Кабинет</span>
                    </button>
                </div>
            </header>

            <Container className="pt-8 space-y-12">
                {/* 🌟 HERO ARENA: Active Live Match OR Standby Countdown */}
                <section className="relative">
                    {currentPrimaryBroadcast ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Main Video Screen / Standby */}
                            <div className="lg:col-span-2 space-y-4">
                                {currentPrimaryBroadcast.isLive || currentPrimaryBroadcast.status === 'live' ? (
                                    /* LIVE STREAM VIEWER */
                                    <div className="space-y-4">
                                        {currentPrimaryBroadcast.streamSourceType === 'direct_camera' ? (
                                            /* Direct In-Browser WebRTC Stream from Coach Camera */
                                            <DirectStreamViewer
                                                roomId={currentPrimaryBroadcast.webrtcRoomId || currentPrimaryBroadcast.id}
                                                scoreSparta={currentPrimaryBroadcast.scoreSparta}
                                                scoreOpponent={currentPrimaryBroadcast.scoreOpponent}
                                                opponentName={currentPrimaryBroadcast.opponentName}
                                                matchTime={currentPrimaryBroadcast.matchTime}
                                            />
                                        ) : (
                                            /* Embedded Stream (YouTube / VK / HLS) */
                                            <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-sparta-gold/30 shadow-[0_0_50px_rgba(255,191,0,0.15)] group">
                                                {getVideoEmbedUrl(currentPrimaryBroadcast.streamUrl || currentPrimaryBroadcast.videoUrl || '') ? (
                                                    <iframe
                                                        src={getVideoEmbedUrl(currentPrimaryBroadcast.streamUrl || currentPrimaryBroadcast.videoUrl || '')}
                                                        className="w-full h-full border-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-950">
                                                        <Radio size={48} className="text-sparta-gold/40 mb-4 animate-pulse" />
                                                        <h3 className="font-russo text-xl text-white mb-2">ПОТОК В ПРОЦЕССЕ ПОДКЛЮЧЕНИЯ</h3>
                                                        <p className="text-white/50 text-xs max-w-sm">Прямой эфир скоро запустится. Пожалуйста, не закрывайте страницу.</p>
                                                    </div>
                                                )}

                                                {/* Live Status Overlay */}
                                                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black tracking-wider uppercase shadow-xl animate-pulse">
                                                        <span className="w-2 h-2 rounded-full bg-white animate-ping" /> LIVE
                                                    </span>
                                                    {currentPrimaryBroadcast.matchTime && (
                                                        <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur border border-white/10 text-sparta-gold text-xs font-mono font-bold">
                                                            {currentPrimaryBroadcast.matchTime}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Real-time Match Scoreboard Overlay */}
                                                {(currentPrimaryBroadcast.scoreSparta !== undefined || currentPrimaryBroadcast.opponentName) && (
                                                    <div className="absolute top-4 right-4 z-10 px-4 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-sparta-gold/40 flex items-center gap-3 shadow-2xl">
                                                        <span className="text-xs font-bold text-white uppercase flex items-center gap-1">
                                                            <Shield size={12} className="text-sparta-gold" /> Спарта
                                                        </span>
                                                        <div className="px-2 py-0.5 rounded-lg bg-sparta-gold text-black font-russo text-sm font-black">
                                                            {currentPrimaryBroadcast.scoreSparta || 0} : {currentPrimaryBroadcast.scoreOpponent || 0}
                                                        </div>
                                                        <span className="text-xs font-bold text-white/70 uppercase">
                                                            {currentPrimaryBroadcast.opponentName || 'Соперник'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Match Info & Action Strip */}
                                        <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-white/10 flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-sparta-gold uppercase tracking-wider">
                                                        {currentPrimaryBroadcast.tournamentName || 'Официальный матч'}
                                                    </span>
                                                    {currentPrimaryBroadcast.ageCategory && (
                                                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] font-bold">
                                                            {currentPrimaryBroadcast.ageCategory}
                                                        </span>
                                                    )}
                                                </div>
                                                <h1 className="text-xl sm:text-2xl font-russo text-white uppercase">
                                                    {currentPrimaryBroadcast.title}
                                                </h1>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <LiveViewersCounter broadcastId={currentPrimaryBroadcast.id} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* PRE-MATCH STANDBY COUNTDOWN SCREEN */
                                    <BroadcastCountdown
                                        broadcast={currentPrimaryBroadcast}
                                        onMatchStart={() => {
                                            // Handle automatic transition to live
                                        }}
                                    />
                                )}
                            </div>

                            {/* Live Parents Chat & Fan Reactions */}
                            <div className="space-y-4">
                                <div className="h-[480px]">
                                    <BroadcastChat
                                        broadcastId={currentPrimaryBroadcast.id}
                                        isLive={currentPrimaryBroadcast.isLive || currentPrimaryBroadcast.status === 'live'}
                                    />
                                </div>
                                <BroadcastReactions broadcastId={currentPrimaryBroadcast.id} />
                            </div>
                        </div>
                    ) : (
                        /* Welcome Showcase Screen when no broadcast is live */
                        <div className="p-8 md:p-14 rounded-3xl bg-gradient-to-b from-[#141414] to-[#090909] border border-white/10 text-center relative overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-sparta-gold/10 rounded-full blur-[120px] pointer-events-none" />
                            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-sparta-gold uppercase tracking-widest">
                                    <Sparkles size={14} /> Официальный медиацентр
                                </div>
                                <h1 className="text-3xl md:text-5xl font-russo text-white uppercase tracking-wider">
                                    SPARTA <span className="text-sparta-gold">TV</span>
                                </h1>
                                <p className="text-white/60 text-sm md:text-base leading-relaxed">
                                    Прямые трансляции турниров, матчи юношеских лиг и видеозаписи лучших моментов клуба Спарта в высоком качестве.
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* 📑 Content Navigation Tabs & Age Filters */}
                <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                        {/* Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'live', label: '🔴 Прямой эфир & Матчи', count: liveBroadcasts.length },
                                { id: 'schedule', label: '📅 Расписание эфиров', count: scheduledBroadcasts.length },
                                { id: 'archive', label: '📁 Архив записей', count: archiveBroadcasts.length }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'bg-sparta-gold text-black shadow-[0_0_20px_rgba(255,191,0,0.3)]'
                                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            activeTab === tab.id ? 'bg-black text-sparta-gold' : 'bg-white/10 text-white/90'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Age Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            <span className="text-xs text-white/40 font-bold mr-1 flex items-center gap-1">
                                <Filter size={12} /> Возраст:
                            </span>
                            {[
                                { id: 'all', label: 'Все' },
                                { id: '2015-2016', label: '2015-2016' },
                                { id: '2017-2018', label: '2017-2018' },
                                { id: '2019-2020', label: '2019-2020' },
                                { id: '2021-2022', label: '2021-2022' }
                            ].map((age) => (
                                <button
                                    key={age.id}
                                    onClick={() => setSelectedAgeFilter(age.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        selectedAgeFilter === age.id
                                            ? 'bg-white/20 text-white border border-sparta-gold/50'
                                            : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                                    }`}
                                >
                                    {age.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab 1: Live & Active Broadcasts */}
                    {activeTab === 'live' && (
                        <div>
                            {liveBroadcasts.length === 0 ? (
                                <div className="p-12 rounded-3xl bg-neutral-900/30 border border-white/5 text-center space-y-3">
                                    <Radio size={36} className="text-white/20 mx-auto" />
                                    <h3 className="font-russo text-lg text-white">СЕЙЧАС ПРЯМЫХ ЭФИРОВ НЕТ</h3>
                                    <p className="text-white/40 text-xs max-w-sm mx-auto">
                                        Загляните во вкладку «Расписание эфиров», чтобы узнать даты ближайших игр юных чемпионов.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filterByAge(liveBroadcasts).map((b) => (
                                        <div
                                            key={b.id}
                                            onClick={() => setSelectedBroadcastId(b.id)}
                                            className="group p-4 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-sparta-gold/50 transition-all cursor-pointer space-y-3"
                                        >
                                            <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900">
                                                {b.thumbnailUrl ? (
                                                    <img src={b.thumbnailUrl} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Radio size={32} className="text-sparta-gold" />
                                                    </div>
                                                )}
                                                <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                                                    LIVE
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-sparta-gold font-bold uppercase">{b.tournamentName || 'Матч'}</span>
                                                <h4 className="font-russo text-sm text-white line-clamp-1 group-hover:text-sparta-gold transition-colors">{b.title}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Scheduled Matches */}
                    {activeTab === 'schedule' && (
                        <div>
                            {scheduledBroadcasts.length === 0 ? (
                                <div className="p-12 rounded-3xl bg-neutral-900/30 border border-white/5 text-center space-y-3">
                                    <Clock size={36} className="text-white/20 mx-auto" />
                                    <h3 className="font-russo text-lg text-white">НЕТ ЗАПЛАНИРОВАННЫХ МАТЧЕЙ</h3>
                                    <p className="text-white/40 text-xs max-w-sm mx-auto">
                                        Расписание новых турниров появится здесь сразу после жеребьевки.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filterByAge(scheduledBroadcasts).map((b) => (
                                        <div
                                            key={b.id}
                                            onClick={() => setSelectedBroadcastId(b.id)}
                                            className="group p-5 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-black uppercase border border-amber-400/20">
                                                        ⏳ Скоро
                                                    </span>
                                                    {b.ageCategory && (
                                                        <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-0.5 rounded">
                                                            {b.ageCategory}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-russo text-base text-white group-hover:text-sparta-gold transition-colors line-clamp-2">
                                                    {b.title}
                                                </h4>
                                                {b.locationName && (
                                                    <p className="text-xs text-white/50 flex items-center gap-1.5">
                                                        <MapPin size={12} className="text-sparta-gold shrink-0" /> {b.locationName}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/70">
                                                <span>Открыть предматч →</span>
                                                <ChevronRight size={14} className="text-sparta-gold group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 3: Archives & VOD */}
                    {activeTab === 'archive' && (
                        <div>
                            {archiveBroadcasts.length === 0 ? (
                                <div className="p-12 rounded-3xl bg-neutral-900/30 border border-white/5 text-center space-y-3">
                                    <Video size={36} className="text-white/20 mx-auto" />
                                    <h3 className="font-russo text-lg text-white">АРХИВ ПОКА ПУСТ</h3>
                                    <p className="text-white/40 text-xs max-w-sm mx-auto">
                                        Записи завершенных игр будут автоматически сохраняться в этой вкладке.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filterByAge(archiveBroadcasts).map((b) => (
                                        <div
                                            key={b.id}
                                            onClick={() => setSelectedArchive(b)}
                                            className="group p-4 rounded-2xl bg-[#0f0f0f] border border-white/10 hover:border-sparta-gold/40 transition-all cursor-pointer space-y-3"
                                        >
                                            <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900">
                                                {b.thumbnailUrl ? (
                                                    <img src={b.thumbnailUrl} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <PlayCircle size={40} className="text-white/50 group-hover:text-sparta-gold transition-colors" />
                                                    </div>
                                                )}
                                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                                                    ЗАПИСЬ
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-russo text-sm text-white line-clamp-1 group-hover:text-sparta-gold transition-colors">{b.title}</h4>
                                                <p className="text-xs text-white/40 mt-1 line-clamp-2">{b.description || 'Запись матча'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </Container>

            {/* Archive Video Modal */}
            {selectedArchive && (
                <BroadcastArchiveModal
                    isOpen={!!selectedArchive}
                    broadcast={selectedArchive}
                    onClose={() => setSelectedArchive(null)}
                />
            )}
        </div>
    );
};

export default Broadcasts;
