import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['🔥', '👏', '❤️', '🏆', '💯', '⚽'];

interface Reaction {
    id: string;
    emoji: string;
    userId: string;
    createdAt: any;
    // Client-side animation properties
    xOffset: number;
    duration: number;
}

interface BroadcastReactionsProps {
    broadcastId: string;
}

const BroadcastReactions: React.FC<BroadcastReactionsProps> = ({ broadcastId }) => {
    const { user } = useAuth();
    const [floatingReactions, setFloatingReactions] = useState<Reaction[]>([]);
    const [cooldown, setCooldown] = useState(false);

    // Initial load time to prevent showing old reactions on mount
    const [mountTime] = useState(Date.now());

    useEffect(() => {
        if (!broadcastId) return;

        // Only listen to very recent reactions (last 5 minutes) to avoid massive reads, 
        // but we filter them out client-side if they are older than mount time
        const q = query(
            collection(db, 'broadcast_reactions'),
            where('broadcastId', '==', broadcastId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();

                    // Skip if reaction is older than when we mounted
                    const reactionTime = data.createdAt ? data.createdAt.toMillis() : Date.now();
                    if (reactionTime < mountTime) return;

                    const newReaction: Reaction = {
                        id: change.doc.id,
                        emoji: data.emoji,
                        userId: data.userId,
                        createdAt: data.createdAt,
                        xOffset: Math.random() * 100 - 50, // rand -50 to 50
                        duration: 2 + Math.random() * 2 // 2 to 4 seconds
                    };

                    setFloatingReactions(prev => [...prev, newReaction]);

                    // Remove from screen after animation completes
                    setTimeout(() => {
                        setFloatingReactions(prev => prev.filter(r => r.id !== newReaction.id));
                    }, newReaction.duration * 1000);
                }
            });
        });

        return () => unsubscribe();
    }, [broadcastId, mountTime]);

    const handleSendReaction = useCallback(async (emoji: string) => {
        if (!user || cooldown) return;

        // Anti-spam cooldown
        setCooldown(true);
        setTimeout(() => setCooldown(false), 300); // 300ms cooldown

        try {
            await addDoc(collection(db, 'broadcast_reactions'), {
                broadcastId,
                emoji,
                userId: user.uid,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending reaction:", error);
        }
    }, [broadcastId, user, cooldown]);

    return (
        <div className="relative w-full">
            {/* Floating Animation Layer (Pointer events none so it doesn't block video) */}
            <div className="absolute bottom-16 right-10 w-32 h-[400px] pointer-events-none z-50 overflow-hidden flex justify-center">
                <AnimatePresence>
                    {floatingReactions.map((reaction) => (
                        <motion.div
                            key={reaction.id}
                            initial={{ opacity: 0, y: 50, x: reaction.xOffset, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 1, 0], y: -400, x: reaction.xOffset + (Math.random() * 30 - 15), scale: [0.5, 1.5, 1.2, 1] }}
                            transition={{ duration: reaction.duration, ease: "easeOut" }}
                            className="absolute bottom-0 text-3xl filter drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                        >
                            {reaction.emoji}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Controls Bar */}
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center gap-2 sm:gap-4 w-fit mx-auto shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                {EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => handleSendReaction(emoji)}
                        disabled={!user || cooldown}
                        className="text-2xl sm:text-3xl hover:-translate-y-2 hover:scale-125 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:scale-100"
                        title={!user ? "Войдите, чтобы реагировать" : ""}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BroadcastReactions;
