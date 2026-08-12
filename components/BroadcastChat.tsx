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

        try {
            await addDoc(collection(db, 'broadcast_messages'), {
                broadcastId,
                userId: user.uid,
                userName: user.displayName || userProfile?.childName || 'Спортсмен',
                userAvatar: user.photoURL || userProfile?.photoURL || '',
                text: messageText,
                userRole: userProfile?.role || 'user',
                userVerification: userProfile?.verification || null,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            // Optionally restore message if failed
            setNewMessage(messageText);
        }
    };

    // Format time (HH:MM)
    const formatTime = (timestampMs: number) => {
        if (!timestampMs) return '';
        const date = new Date(timestampMs);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-[#0F0F0F] rounded-2xl border border-white/5 overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 bg-[#141414] flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-sparta-gold" />
                    <h3 className="text-white font-bold tracking-wider">
                        {isLive ? 'LIVE ЧАТ' : 'ОБСУЖДЕНИЕ'}
                    </h3>
                </div>
                <span className="text-white/40 text-xs font-bold bg-white/5 px-2 py-1 rounded-md">
                    {messages.length} SMS
                </span>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar"
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-2">
                        <MessageSquare size={32} />
                        <p className="text-sm">Сообщений пока нет.</p>
                        <p className="text-xs">Напишите первым!</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg, index) => {
                            const isMe = msg.userId === user?.uid;
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {/* Avatar */}
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center mt-1">
                                        {msg.userAvatar ? (
                                            <img src={msg.userAvatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={14} className="text-white/40" />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className={`flex items-center gap-1 text-[10px] font-bold ${isMe ? 'text-sparta-gold' : 'text-white/60'}`}>
                                                {isMe ? 'Вы' : msg.userName}
                                                {msg.userRole === 'admin' && <span title="Администратор"><BadgeCheck size={10} className="text-blue-500 shrink-0" /></span>}
                                                {msg.userRole === 'trainer' && <span title="Тренер"><Dumbbell size={10} className="text-green-500 shrink-0" /></span>}
                                                {msg.userRole === 'director' && <span title="Директор"><Star size={10} className="text-purple-500 shrink-0" /></span>}
                                                {msg.userRole === 'developer' && <span title="Разработчик"><Code size={10} className="text-cyan-500 shrink-0" /></span>}
                                                {msg.userVerification?.isVerified && <span title={msg.userVerification.title}><BadgeCheck size={10} className="text-blue-500 shrink-0" /></span>}
                                            </span>
                                            <span className="text-white/20 text-[9px]">{formatTime(msg.createdAt)}</span>
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm break-words shadow-sm ${isMe
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

            {/* Scroll to bottom button (if not at bottom) */}
            {!isAtBottom && messages.length > 0 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={() => { setIsAtBottom(true); scrollToBottom(); }}
                        className="bg-black/80 backdrop-blur-md text-white border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white/10 transition-colors shadow-lg"
                    >
                        Вниз ↓
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3 bg-[#111] border-t border-white/5 z-10">
                {user ? (
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={isLive ? "Написать в эфир..." : "Оставить комментарий..."}
                            className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all placeholder:text-white/20"
                            maxLength={200}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="absolute right-2 w-8 h-8 rounded-full bg-sparta-gold text-black flex items-center justify-center hover:bg-[#ffd700] disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 transition-all"
                        >
                            <Send size={14} className="ml-0.5" />
                        </button>
                    </form>
                ) : (
                    <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-white/40 text-xs">Войдите, чтобы писать в чат</p>
                        {/* Could add a mini Login button here if we wire up the modal */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BroadcastChat;
