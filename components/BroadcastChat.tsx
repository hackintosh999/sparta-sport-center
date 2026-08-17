import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Send, User, MessageSquare, Shield, Dumbbell, Star, BadgeCheck, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    createdAt: number; // Stored locally as milliseconds for rendering and sorting
    userRole?: string;
    userVerification?: any;
}

interface BroadcastChatProps {
    broadcastId: string;
    isLive: boolean;
}

const BroadcastChat: React.FC<BroadcastChatProps> = ({ broadcastId, isLive }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const { user, userProfile } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Fetch messages
    useEffect(() => {
        if (!broadcastId) return;

        const q = query(
            collection(db, 'broadcast_messages'),
            where('broadcastId', '==', broadcastId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt ? docData.createdAt.toMillis() : Date.now()
                } as Message;
            });

            // Client-side sort to avoid Firebase composite index requirement
            data.sort((a, b) => a.createdAt - b.createdAt);

            setMessages(data);

            // Auto scroll if user is at the bottom
            if (isAtBottom) {
                setTimeout(scrollToBottom, 100);
            }
        });

        return () => unsubscribe();
    }, [broadcastId, isAtBottom]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        // Check if user has scrolled up
        const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
        setIsAtBottom(isBottom);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setIsAtBottom(true); // Force scroll on send

        const parentChildBadge = userProfile?.childName
            ? `${user?.displayName || userProfile?.displayName || 'Родитель'} (родитель ${userProfile.childName})`
            : user?.displayName || userProfile?.displayName || 'Болельщик Sparta';

        try {
            await addDoc(collection(db, 'broadcast_messages'), {
                broadcastId,
                userId: user.uid,
                userName: parentChildBadge,
                userAvatar: user.photoURL || userProfile?.photoURL || '',
                text: messageText,
                userRole: userProfile?.role || 'user',
                userVerification: userProfile?.verification || null,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(messageText);
        }
    };

    const handleQuickShout = (text: string) => {
        if (!user) {
            alert("Войдите в аккаунт, чтобы поддержать команду в чате!");
            return;
        }
        setNewMessage(text);
    };

    // Format time (HH:MM)
    const formatTime = (timestampMs: number) => {
        if (!timestampMs) return '';
        const date = new Date(timestampMs);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-[#0F0F0F] rounded-2xl border border-white/10 overflow-hidden font-manrope">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 bg-[#141414] flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-sparta-gold" />
                    <h3 className="text-white font-bold tracking-wider text-sm">
                        {isLive ? 'LIVE ЧАТ РОДИТЕЛЕЙ' : 'ОБСУЖДЕНИЕ'}
                    </h3>
                </div>
                <span className="text-white/40 text-xs font-bold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                    {messages.length} сообщений
                </span>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar min-h-[250px] max-h-[420px]"
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2 py-10">
                        <MessageSquare size={32} className="text-sparta-gold/40" />
                        <p className="text-sm font-medium">В чате пока тихо.</p>
                        <p className="text-xs text-white/20">Поддержите юных спартанцев первым!</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => {
                            const isMe = msg.userId === user?.uid;
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {/* Avatar */}
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center mt-1">
                                        {msg.userAvatar ? (
                                            <img src={msg.userAvatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={13} className="text-white/40" />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <span className={`text-[10px] font-bold ${isMe ? 'text-sparta-gold' : 'text-white/70'} truncate max-w-[170px]`}>
                                                {isMe ? 'Вы' : msg.userName}
                                            </span>
                                            <span className="text-white/25 text-[9px]">{formatTime(msg.createdAt)}</span>
                                        </div>
                                        <div className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm break-words shadow-md ${isMe
                                            ? 'bg-sparta-gold text-black rounded-tr-sm font-medium'
                                            : 'bg-white/10 text-white rounded-tl-sm border border-white/5'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Quick Fan Shoutouts Chips */}
            <div className="px-3 pt-2 pb-1.5 bg-[#121212] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                    { text: '⚽ ГОООЛ!', bg: 'hover:border-amber-400' },
                    { text: '🔥 ВПЕРЁД СПАРТА!', bg: 'hover:border-red-500' },
                    { text: '🧤 СЕЙВ!', bg: 'hover:border-blue-400' },
                    { text: '👏 КРАСАВЦЫ!', bg: 'hover:border-emerald-400' }
                ].map((item, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => handleQuickShout(item.text)}
                        className={`shrink-0 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/90 transition-all ${item.bg}`}
                    >
                        {item.text}
                    </button>
                ))}
            </div>

            {/* Input Form */}
            <div className="p-3 bg-[#141414] border-t border-white/5">
                {user ? (
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Написать в чат матча..."
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sparta-gold/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-2.5 bg-sparta-gold text-black rounded-xl hover:bg-amber-300 disabled:opacity-30 disabled:hover:bg-sparta-gold transition-all shrink-0"
                        >
                            <Send size={15} />
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-1">
                        <p className="text-xs text-white/40">Войдите в аккаунт, чтобы писать в чат</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BroadcastChat;


