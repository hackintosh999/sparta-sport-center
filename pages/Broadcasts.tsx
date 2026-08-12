import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Video, Radio, Clock, PlayCircle, Users } from 'lucide-react';
import { Broadcast } from '../types/broadcast';
import { Container } from '../components/UIComponents';
import BroadcastChat from '../components/BroadcastChat';
import BroadcastReactions from '../components/BroadcastReactions';
import BroadcastArchiveModal from '../components/BroadcastArchiveModal';

// Real-time Viewer Hook
const useViewers = (broadcastId: string, isLive: boolean) => {
    const [viewers, setViewers] = useState(0);

    useEffect(() => {
        if (!isLive || !broadcastId) return;

        // Simplified Approach: Periodically ping a viewer document, and count active pings via a Cloud Function,
        // or for purely client-side: just listen to a central counter if we had server integration.
        // Since we are serverless without custom Cloud Functions deployed yet, we'll do a basic
        // presence collection: each viewer creates a doc and deletes it on unmount.

        // Generate a random ID for this viewer session
        const sessionId = Math.random().toString(36).substring(2, 15);
        const viewerRef = doc(db, 'broadcasts', broadcastId, 'viewers', sessionId);

        // 1. Join stream: create presence doc
        setDoc(viewerRef, { joinedAt: serverTimestamp() }).catch(console.error);

        // 2. Listen to total viewers
        const viewersQuery = collection(db, 'broadcasts', broadcastId, 'viewers');
        const unsubscribe = onSnapshot(viewersQuery, (snapshot) => {
            setViewers(snapshot.size); // The number of active docs is the viewer count
        });

        // 3. Leave stream: delete presence doc
        return () => {
            unsubscribe();
            deleteDoc(viewerRef).catch(console.error);
        };
    }, [broadcastId, isLive]);

    return Math.max(1, viewers); // Show at least 1 (themselves) if connected
};

const Broadcasts = () => {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArchive, setSelectedArchive] = useState<Broadcast | null>(null);

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
            <div className="min-h-screen bg-[#020202] pt-32 pb-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sparta-gold"></div>
            </div>
        );
    }

    const liveBroadcasts = broadcasts.filter(b => b.isLive);
    const archiveBroadcasts = broadcasts.filter(b => !b.isLive);

    const LiveViewersCounter = ({ broadcastId }: { broadcastId: string }) => {
        const viewers = useViewers(broadcastId, true);
        return (
            <span className="flex items-center gap-1.5 text-white bg-white/5 px-2.5 py-1 rounded border border-white/10 text-xs font-bold">
                <Users size={14} className="text-white/60" /> {viewers}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-[#020202] pt-32 pb-20 font-manrope">
            {/* Header */}
            <div className="relative py-12 mb-12 overflow-hidden bg-black/50 border-y border-white/5">
                {/* Decorative background effects */}
                <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-sparta-gold/10 rounded-full blur-[120px] -translate-y-1/2 -z-10 mix-blend-screen pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] -translate-y-1/2 -z-10 mix-blend-screen pointer-events-none" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] -z-10 pointer-events-none" />

                <Container>
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 mb-4">
                            <Video className="text-sparta-gold" size={24} />
                            <span className="text-sparta-gold text-sm font-bold tracking-[0.2em] uppercase">Медиацентр</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-russo text-white mb-6 uppercase tracking-wider">
                            SPARTA <span className="text-sparta-gold">TV</span>
                        </h1>
                        <p className="text-white/60 text-lg md:text-xl">
                            Прямые трансляции турниров, записи матчей и главные события клуба
                        </p>
                    </div>
                </Container>
            </div>

            <Container className="space-y-20">
                {/* Live Section */}
                {liveBroadcasts.length > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-red-500/20 pb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                            <h2 className="text-2xl font-russo text-white tracking-widest uppercase">В ЭФИРЕ</h2>
                        </div>

                        <div className="space-y-12">
                            {liveBroadcasts.map((live, index) => (
                                <div key={live.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
                                    {/* Main Live Video */}
                                    <div
                                        className={`relative bg-[#0F0F0F] rounded-2xl border border-red-500/30 overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.1)] group flex flex-col lg:col-span-2`}
                                    >
                                        {/* Video Container (16:9 Aspect Ratio) */}
                                        <div className="w-full relative pt-[56.25%] bg-black">
                                            <iframe
                                                src={live.videoUrl}
                                                className="absolute top-0 left-0 w-full h-full"
                                                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                                                allowFullScreen
                                                frameBorder="0"
                                                title={live.title}
                                            />
                                        </div>

                                        {/* Video Meta info below player */}
                                        <div className="p-6 md:p-8 bg-gradient-to-t from-red-950/20 to-transparent relative">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                                                        <Radio size={14} /> В ЭФИРЕ
                                                    </span>
                                                    <LiveViewersCounter broadcastId={live.id} />
                                                </div>

                                                {/* Reactions Component */}
                                                <div className="relative static sm:absolute sm:right-6 sm:bottom-6 sm:translate-y-0 z-20">
                                                    <BroadcastReactions broadcastId={live.id} />
                                                </div>
                                            </div>

                                            <div className="pr-0 sm:pr-48">
                                                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{live.title}</h3>
                                                {live.description && (
                                                    <p className="text-white/60 text-base leading-relaxed max-w-2xl">{live.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chat Column */}
                                    <div className="lg:col-span-1 h-[500px] lg:h-auto min-h-[400px]">
                                        <BroadcastChat broadcastId={live.id} isLive={true} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Archive Section */}
                {archiveBroadcasts.length > 0 && (
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-russo text-white/90 tracking-widest uppercase flex items-center gap-3">
                                <Clock className="text-sparta-gold" size={24} />
                                АРХИВ ТРАНСЛЯЦИЙ
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {archiveBroadcasts.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedArchive(item)}
                                    className="group bg-[#0A0A0A] rounded-2xl border border-white/5 hover:border-sparta-gold/30 hover:bg-[#111] overflow-hidden transition-all duration-300 cursor-pointer flex flex-col"
                                >
                                    <div className="relative w-full pt-[56.25%] bg-black group-hover:scale-[1.02] transition-transform duration-500 ease-out">
                                        {/* Overlay to prevent accidental clicks while scrolling through archive grid */}
                                        <div className="absolute inset-x-0  flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" style={{ top: 'calc(50% - 24px)', bottom: 'auto', left: 'auto', right: 'calc(50% - 24px)' }}>
                                            <div className="w-12 h-12 bg-sparta-gold/90 text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.5)] transform scale-90 group-hover:scale-100 transition-transform duration-300 ease-out">
                                                <PlayCircle size={24} className="ml-1" />
                                            </div>
                                        </div>

                                        {/* For the archive thumbnail, we load the iframe but disable pointer events so the click bubbles to the container */}
                                        <iframe
                                            src={item.videoUrl}
                                            className="absolute top-0 left-0 w-full h-full grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                                            allow="encrypted-media; picture-in-picture"
                                            frameBorder="0"
                                            style={{ pointerEvents: 'none' }} // Disabled so clicking plays in Modal
                                            title={item.title}
                                            tabIndex={-1}
                                        />
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 md:h-14 group-hover:text-sparta-gold transition-colors duration-300">{item.title}</h3>
                                        {item.description && (
                                            <p className="text-white/40 text-sm line-clamp-2 mt-auto">{item.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {broadcasts.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-3xl">
                        <Video size={48} className="text-white/10 mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-widest">ТРАНСЛЯЦИЙ ПОКА НЕТ</h3>
                        <p className="text-white/40">Здесь будут появляться прямые эфиры и записи матчей.</p>
                    </div>
                )}
            </Container>

            {/* Archive Modal */}
            <BroadcastArchiveModal
                isOpen={!!selectedArchive}
                onClose={() => setSelectedArchive(null)}
                broadcast={selectedArchive}
            />
        </div>
    );
};

export default Broadcasts;
