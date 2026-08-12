import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, updateDoc, arrayUnion, or, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageSquare, Send, User, ChevronRight, Plus, Clock, CheckCircle2, Circle, Search, Paperclip, X, Image as ImageIcon, Smile, Star, Check, CheckCheck, Shield, BadgeCheck, Dumbbell, Code, XCircle, Phone, MessageCircle, Mail, Info, ShieldAlert } from 'lucide-react';
import { QUICK_CATEGORIES, SUPPORT_FAQ } from '../../constants/SupportFAQ';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import SpartaVideoPlayer from '../../components/SpartaVideoPlayer';
import { FileText, Play, Download } from 'lucide-react';
import { safeLocalStorage } from '../../utils/storage';

interface MessageHistory {
    text: string;
    sender: 'user' | 'admin';
    senderName: string;
    createdAt: Timestamp;
    image?: string;
    attachment?: {
        url: string;
        type: string;
        name: string;
        size?: number;
    };
    isRead?: boolean;
    senderRole?: string;
    senderVerification?: any;
}

interface Ticket {
    id: string;
    subject?: string;
    status: 'new' | 'in_progress' | 'resolved' | 'contacted' | 'completed' | 'rejected';
    createdAt: Timestamp;
    thread?: MessageHistory[];
    message?: string;
    isReadByUser?: boolean;
    rating?: number;
    isTyping?: {
        admin?: boolean;
        user?: boolean;
    };
    userId?: string | null;
    email?: string;
    name?: string;
    senderRole?: string;
    senderVerification?: any;
    collectionName: 'messages' | 'requests';
    // Request specific fields
    type: 'ticket' | 'trial_request';
    childName?: string;
    childSurname?: string;
    childAge?: number;
    programType?: string;
    sports?: string[];
    parentPhone?: string;
    adminNotes?: string;
    comment?: string;
    history?: {
        status: string;
        timestamp: Timestamp;
        note?: string;
    }[];
    category?: string;
}

interface UserRequestsProps {
    ticketId?: string | null;
}

const UserRequests: React.FC<UserRequestsProps> = ({ ticketId }) => {
    const { user, userProfile } = useAuth();
    const isStaff = ['admin', 'director', 'developer', 'dev'].includes(userProfile?.role || '');
    const [tickets, setTickets] = useState<Ticket[]>([]);

    // Helper: resolve the Firestore collection name for a ticket
    const getCollName = (ticket?: Ticket | null, fallbackId?: string | null): string => {
        if (ticket?.collectionName) return ticket.collectionName;
        // Try to find the ticket in the list
        if (fallbackId) {
            const found = tickets.find(t => t.id === fallbackId);
            if (found?.collectionName) return found.collectionName;
        }
        return 'messages'; // safe default
    };
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    // Auto-select ticket from prop (deep link)
    useEffect(() => {
        if (ticketId) {
            setSelectedTicketId(ticketId);
            setFilterStatus('all'); // Ensure it's not hidden by active filter
        }
    }, [ticketId]);
    const [replyText, setReplyText] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Features State
    const [searchQuery, setSearchQuery] = useState('');
    const [attachment, setAttachment] = useState<{ file: File, preview: string, type: string } | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');
    const [isAgentTyping, setIsAgentTyping] = useState(false);

    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isSupportOnline, setIsSupportOnline] = useState(false);
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    // Live Support Status Listener
    useEffect(() => {
        const staffRoles = ['admin', 'director', 'developer'];
        const q = query(collection(db, 'users'), where('role', 'in', staffRoles));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const oneMinuteAgo = Date.now() - (60 * 1000); // 1 min buffer
            const isAnyOnline = snapshot.docs.some(doc => {
                const data = doc.data();
                if (data.isOnline === true) return true; // Instant flag

                const lastActive = data.lastActive;
                if (!lastActive) return false;
                const millis = lastActive.toMillis ? lastActive.toMillis() : lastActive;
                return millis > oneMinuteAgo;
            });
            setIsSupportOnline(isAnyOnline);
        });

        return () => unsubscribe();
    }, []);

    const QUICK_REPLIES = [
        { label: 'Уточняю', text: 'Уточняю информацию по вашему вопросу, пожалуйста, подождите.' },
        { label: 'Готово', text: 'Ваш запрос выполнен. Если возникнут дополнительные вопросы — пишите!' },
        { label: 'Оплата', text: 'Для подтверждения оплаты отправьте, пожалуйста, скриншот чека.' },
        { label: 'Абонемент', text: 'Ваш абонемент успешно продлен. Хорошей тренировки!' },
        { label: 'Ошибка', text: 'Приносим извинения за неудобства. Мы уже работаем над устранением ошибки.' }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load draft when ticket changes
    useEffect(() => {
        if (!selectedTicketId) return;
        const draft = safeLocalStorage.getItem(`sparta_chat_draft_${selectedTicketId}`);
        if (draft) setReplyText(draft);
        else setReplyText('');
    }, [selectedTicketId]);

    // Save draft when text changes
    useEffect(() => {
        if (!selectedTicketId || replyText === undefined) return;
        if (replyText.trim()) {
            safeLocalStorage.setItem(`sparta_chat_draft_${selectedTicketId}`, replyText);
        } else {
            safeLocalStorage.removeItem(`sparta_chat_draft_${selectedTicketId}`);
        }
    }, [replyText, selectedTicketId]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.emoji-picker-container')) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    useEffect(() => {
        if (!user) return;

        // Fetch Messages (Support Tickets)
        const qMsgs = isStaff
            ? query(collection(db, "messages"), orderBy("createdAt", "desc"))
            : query(
                collection(db, "messages"),
                or(
                    where("userId", "==", user.uid),
                    where("email", "==", user.email)
                )
            );

        // Fetch Trial Requests
        const qReqs = isStaff
            ? query(collection(db, "requests"), orderBy("createdAt", "desc"))
            : query(
                collection(db, "requests"),
                where("email", "==", user.email)
            );

        const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
            const loadedTickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'ticket',
                collectionName: 'messages'
            } as Ticket));
            updateUnifiedItems(loadedTickets, 'tickets');
        });

        const unsubReqs = onSnapshot(qReqs, (snapshot) => {
            const loadedReqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'trial_request',
                collectionName: 'requests'
            } as Ticket));
            updateUnifiedItems(loadedReqs, 'requests');
        });

        return () => {
            unsubMsgs();
            unsubReqs();
        };
    }, [user]);

    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [allRequests, setAllRequests] = useState<Ticket[]>([]);

    const updateUnifiedItems = (items: Ticket[], category: 'tickets' | 'requests') => {
        if (category === 'tickets') setAllTickets(items);
        else setAllRequests(items);
    };

    useEffect(() => {
        const unified = [...allTickets, ...allRequests];
        unified.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTickets(unified);
        setLoading(false);

        // Cleanup drafts for resolved/completed tickets
        unified.forEach(t => {
            if (['resolved', 'completed', 'rejected'].includes(t.status)) {
                safeLocalStorage.removeItem(`sparta_chat_draft_${t.id}`);
            }
        });
    }, [allTickets, allRequests]);

    // Self-healing: If messages found by email are missing userId, update them
    useEffect(() => {
        if (!user || tickets.length === 0) return;

        const orphanTickets = tickets.filter(t => !t.userId && t.email === user.email);
        if (orphanTickets.length > 0) {
            orphanTickets.forEach(async (ticket) => {
                try {
                    await updateDoc(doc(db, ticket.collectionName || "messages", ticket.id), {
                        userId: user.uid
                    });
                } catch (e) {
                    console.error("Error healing ticket userId:", e);
                }
            });
        }
    }, [tickets, user]);

    useEffect(() => {
        if (!selectedTicketId) {
            setIsAgentTyping(false);
            return;
        }
        const st = tickets.find(t => t.id === selectedTicketId);
        if (!st) return;

        const unsubscribe = onSnapshot(doc(db, st.collectionName || "messages", selectedTicketId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const updatedTicket = { id: docSnapshot.id, ...docSnapshot.data() } as Ticket;

                // Update tickets list
                setTickets((prevTickets) =>
                    prevTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)
                );

                // Update typing status
                if (updatedTicket.isTyping?.admin) {
                    setIsAgentTyping(true);
                } else {
                    setIsAgentTyping(false);
                }
            }
        }, (error) => {
            console.error("Error fetching ticket details:", error);
        });

        return () => unsubscribe();
    }, [selectedTicketId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachment({
                file,
                preview: reader.result as string,
                type: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    const uploadFile = async (messageId: string, file: File): Promise<{ url: string, type: string, name: string, size: number }> => {
        setUploadProgress(10);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'review-media');
        formData.append('path', `${messageId}/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`);

        try {
            const response = await fetch('/api/upload-media', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload through proxy');
            }

            setUploadProgress(90);
            const { publicUrl } = await response.json();
            setUploadProgress(100);

            return {
                url: publicUrl,
                type: file.type,
                name: file.name,
                size: file.size
            };
        } catch (error) {
            console.error("Supabase upload error:", error);
            throw error;
        }
    };

    const handleTyping = (() => {
        let timeout: any;
        return async (id: string) => {
            if (!id) return;
            if (timeout) clearTimeout(timeout);
            try {
                await updateDoc(doc(db, getCollName(null, id), id), { "isTyping.user": true });
            } catch (e) { console.warn('Typing indicator failed:', (e as any)?.message); }
            timeout = setTimeout(async () => {
                try {
                    await updateDoc(doc(db, getCollName(null, id), id), { "isTyping.user": false });
                } catch (e) { }
            }, 3000);
        };
    })();

    const handleEmojiClick = (emoji: string) => {
        setReplyText(prev => prev + emoji);
        setShowEmojiPicker(false); // Optional: keep open if multi-select desired
    };

    const handleSendReply = async () => {
        if ((!replyText.trim() && !attachment) || !selectedTicketId) return;

        try {
            // Verify the document exists before trying to update
            const collName = getCollName(selectedTicket, selectedTicketId);
            const ticketRef = doc(db, collName, selectedTicketId);
            const ticketSnap = await getDoc(ticketRef);

            if (!ticketSnap.exists()) {
                alert('Обращение не найдено. Возможно, оно было удалено. Создайте новое обращение.');
                setSelectedTicketId(null);
                return;
            }

            let attachmentData = null;
            if (attachment) {
                setUploadProgress(0);
                attachmentData = await uploadFile(selectedTicketId, attachment.file);
            }

            const reply: MessageHistory = {
                text: replyText,
                sender: isStaff ? 'admin' : 'user',
                senderName: user?.displayName || (isStaff ? 'Администратор' : 'Пользователь'),
                senderRole: userProfile?.role || (isStaff ? 'admin' : 'user'),
                senderVerification: userProfile?.verification || null,
                createdAt: Timestamp.now(),
                ...(attachmentData && { attachment: attachmentData })
            };

            await updateDoc(ticketRef, {
                thread: arrayUnion(reply),
                status: isStaff ? 'in_progress' : 'new',
                isReadByUser: isStaff ? false : true,
                "isTyping.user": !isStaff,
                "isTyping.admin": isStaff
            });

            setReplyText('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error: any) {
            console.error("Full reply error:", error);
            const errorMessage = error?.message || "";
            if (errorMessage.includes("CORS") || errorMessage.includes("Network Error") || errorMessage.includes("Превышено время")) {
                alert("⚠️ Ошибка настройки сервера (CORS)\n\nФайлы не отправляются, так как не настроен Firebase Storage.\n\nПожалуйста, выполните команду настройки в Google Cloud Shell (см. чат).");
            } else {
                alert(`Ошибка при отправке: ${errorMessage}`);
            }
        } finally {
            setUploadProgress(null);
        }
    };

    const handleCreateTicket = async () => {
        if (!newSubject.trim() || !newMessage.trim()) return;

        const docRef = await addDoc(collection(db, "messages"), {
            userId: user?.uid,
            name: user?.displayName || 'Пользователь',
            email: user?.email,
            subject: newSubject,
            category: QUICK_CATEGORIES.find(c => c.label === newSubject)?.id || 'general',
            message: newMessage, // Initial message is stored here
            status: 'new',
            createdAt: Timestamp.now(),
            thread: [{
                text: newMessage,
                sender: 'user',
                senderName: user?.displayName || 'Пользователь',
                createdAt: Timestamp.now()
            }]
        });

        setIsCreating(false);
        setNewSubject('');
        setNewMessage('');
        setSelectedTicketId(docRef.id); // Auto-open the new chat
    };

    const getDisplaySubject = (t: Ticket) => {
        if (t.type === 'trial_request') return t.programType || 'Пробная тренировка';
        if (t.subject && t.subject.trim() !== '') return t.subject;

        // Fallback to message snippet
        const firstMsg = t.message || (t.thread && t.thread.length > 0 ? t.thread[0].text : '');
        if (firstMsg) {
            return firstMsg.length > 30 ? firstMsg.substring(0, 30) + '...' : firstMsg;
        }

        return 'Обращение в поддержку';
    };

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const filteredTickets = tickets.filter(t => {
        const displaySubject = getDisplaySubject(t);
        const matchesSearch = displaySubject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all'
            ? true
            : filterStatus === 'active'
                ? ['new', 'in_progress', 'contacted'].includes(t.status)
                : ['resolved', 'completed', 'rejected'].includes(t.status);
        return matchesSearch && matchesFilter;
    });

    // Auto-scroll when thread updates
    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.thread, selectedTicketId, isAgentTyping]);

    // Mark as read when opening a ticket with unread admin messages
    useEffect(() => {
        if (selectedTicketId && selectedTicket) {
            const thread = selectedTicket.thread || [];
            if (thread.length > 0) {
                const lastMsg = thread[thread.length - 1];
                // If last message is from admin and not marked read, mark it
                if (lastMsg.sender === 'admin' && selectedTicket.isReadByUser !== true) {
                    updateDoc(doc(db, getCollName(selectedTicket, selectedTicketId), selectedTicketId), { isReadByUser: true })
                        .catch(e => console.warn('Mark as read failed (doc may not exist):', e.message));
                }
            }
        }
    }, [selectedTicketId, selectedTicket]);

    const handleRateTicket = async (rating: number) => {
        if (!selectedTicketId) return;

        if (rating === 5) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        try {
            await updateDoc(doc(db, getCollName(selectedTicket, selectedTicketId), selectedTicketId), {
                rating: rating
            });
        } catch (error) {
            console.error("Error rating ticket:", error);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'new': return { label: 'Новое', color: 'text-sparta-gold', icon: Circle };
            case 'in_progress':
            case 'contacted': return { label: 'В работе', color: 'text-blue-400', icon: Clock };
            case 'resolved':
            case 'completed': return { label: 'Решено', color: 'text-green-500', icon: CheckCircle2 };
            case 'rejected': return { label: 'Отклонено', color: 'text-red-500', icon: XCircle };
            default: return { label: status, color: 'text-gray-400', icon: Circle };
        }
    };

    const StatusIcon = selectedTicket ? getStatusInfo(selectedTicket.status).icon : Circle;

    if (loading) return <div className="p-8 text-center text-white/50">Загрузка...</div>;

    return (
        <div className="h-[600px] flex flex-col md:flex-row gap-6 font-manrope messenger-theme">
            {/* List Sidebar */}
            <div className={`flex-1 md:w-1/3 flex flex-col ${selectedTicketId ? 'hidden md:flex' : ''}`}>
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-russo text-white">{isStaff ? 'Управление поддержкой' : 'Мои обращения'}</h2>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-2 bg-sparta-gold rounded-full text-black hover:bg-white transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Поиск обращений..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-sparta-gold outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {isCreating && (
                        <div className="bg-white/5 rounded-xl p-4 border border-sparta-gold/50 animate-in fade-in slide-in-from-top-2">
                            <input
                                type="text"
                                placeholder="Тема (например, Оплата)"
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 text-sm focus:border-sparta-gold outline-none"
                            />
                            <textarea
                                placeholder="Опишите проблему..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 text-sm focus:border-sparta-gold outline-none resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreating(false)} className="px-3 py-1 text-xs text-white/50 hover:text-white">Отмена</button>
                                <button onClick={handleCreateTicket} className="px-3 py-1 bg-sparta-gold text-black rounded-lg text-xs font-bold hover:bg-white transition-colors">Создать</button>
                            </div>
                        </div>
                    )}

                    {(() => {
                        const grouped: Record<string, any[]> = {
                            'Активные': [],
                            'Сегодня': [],
                            'Вчера': [],
                            'Ранее': []
                        };

                        filteredTickets.forEach(ticket => {
                            const date = ticket.createdAt?.toDate?.() || (ticket.createdAt?.seconds ? new Date(ticket.createdAt.seconds * 1000) : new Date(0));
                            const today = startOfDay(new Date());
                            const yesterday = subDays(today, 1);

                            if (!ticket.isReadByUser && ticket.status !== 'resolved' && ticket.status !== 'completed') {
                                grouped['Активные'].push(ticket);
                            } else if (isToday(date)) {
                                grouped['Сегодня'].push(ticket);
                            } else if (isYesterday(date)) {
                                grouped['Вчера'].push(ticket);
                            } else {
                                grouped['Ранее'].push(ticket);
                            }
                        });

                        return Object.entries(grouped).map(([label, items]) => {
                            if (items.length === 0) return null;
                            return (
                                <div key={label} className="mb-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3 px-1 flex items-center gap-2">
                                        {label}
                                        <span className="h-px flex-1 bg-white/5" />
                                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px]">{items.length}</span>
                                    </h4>
                                    <div className="space-y-2">
                                        {items.map(ticket => {
                                            const isSelected = selectedTicketId === ticket.id;
                                            const hasUnread = !ticket.isReadByUser;
                                            const status = getStatusInfo(ticket.status);
                                            const Icon = ticket.type === 'trial_request' ? Dumbbell : status.icon;

                                            return (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => {
                                                        setSelectedTicketId(ticket.id);
                                                        setIsCreating(false);
                                                    }}
                                                    className={`p-4 rounded-2xl cursor-pointer transition-all border group relative ${isSelected
                                                            ? 'bg-sparta-gold border-sparta-gold shadow-lg shadow-sparta-gold/20'
                                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                        }`}
                                                >
                                                    {hasUnread && !isSelected && (
                                                        <div className="absolute -left-1 -top-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0a0a0a] z-10 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                    )}

                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-black' : 'text-sparta-gold'}`}>
                                                            {ticket.type === 'trial_request' ? 'Заявка' : (ticket.category || 'Вопрос')}
                                                        </span>
                                                        <Icon size={14} className={isSelected ? 'text-black/40' : status.color} />
                                                    </div>

                                                    <h5 className={`font-bold text-sm mb-1 line-clamp-1 ${isSelected ? 'text-black' : 'text-white'}`}>
                                                        {getDisplaySubject(ticket)}
                                                    </h5>

                                                    <p className={`text-[10px] line-clamp-1 mb-2 ${isSelected ? 'text-black/60' : 'text-white/40'}`}>
                                                        {ticket.type === 'trial_request' ? `${ticket.childName || ''} ${ticket.childSurname || ''}` : ticket.message || (ticket.thread && ticket.thread.length > 0 ? ticket.thread[0].text : '...')}
                                                    </p>

                                                    <div className="flex justify-between items-center text-[9px]">
                                                        <span className={`font-bold ${isSelected ? 'text-black/40' : 'text-white/20'}`}>
                                                            {ticket.createdAt?.seconds ? format(new Date(ticket.createdAt.seconds * 1000), 'HH:mm') : ''}
                                                        </span>
                                                        <div className={`px-2 py-0.5 rounded-full border ${isSelected
                                                                ? 'bg-black/10 border-black/10 text-black'
                                                                : ticket.status === 'resolved'
                                                                    ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                                                    : 'bg-white/5 border-white/10 text-white/40'
                                                            }`}>
                                                            {status.label}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        });
                    })()}

                    {tickets.length === 0 && !isCreating && (
                        <div className="text-center text-white/30 py-8">
                            <MessageSquare className="mx-auto mb-2 opacity-50" />
                            <p>Нет обращений</p>
                        </div>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 px-1">
                    {[
                        { id: 'all', label: 'Все' },
                        { id: 'active', label: 'Активные' },
                        { id: 'closed', label: 'Закрытые' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === tab.id
                                ? 'bg-sparta-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-[2] bg-white/5 rounded-3xl overflow-hidden flex flex-col border border-white/10 ${!selectedTicketId ? 'hidden md:flex' : ''}`}>
                {selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
                            <button onClick={() => setSelectedTicketId(null)} className="md:hidden text-white/50">
                                <ChevronRight className="rotate-180" />
                            </button>
                            <div>
                                <h3 className="text-white font-bold text-lg">
                                    {getDisplaySubject(selectedTicket)}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-white/50">
                                    <span className="text-sparta-gold">#{selectedTicket.id.slice(-6)}</span>
                                    <span>•</span>
                                    <span>{selectedTicket.createdAt?.seconds ? format(new Date(selectedTicket.createdAt.seconds * 1000), 'd MMMM yyyy', { locale: ru }) : 'Дата не указана'}</span>
                                </div>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                {isStaff && (
                                    <select
                                        value={selectedTicket.status}
                                        onChange={(e) => updateDoc(doc(db, getCollName(selectedTicket, selectedTicketId), selectedTicketId!), { status: e.target.value })}
                                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-sparta-gold transition-colors"
                                    >
                                        <option value="new">Новое</option>
                                        <option value="in_progress">В работе</option>
                                        <option value="resolved">Решено</option>
                                        <option value="rejected">Отклонено</option>
                                    </select>
                                )}
                                <div className={`px-3 py-1 rounded-full text-xs border bg-black/40 ${getStatusInfo(selectedTicket.status).color} ${selectedTicket.status === 'resolved' ? 'border-green-500/30' : 'border-white/10'}`}>
                                    {getStatusInfo(selectedTicket.status).label}
                                </div>
                            </div>
                        </div>

                        {/* Messages List Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/5" id="messages-container">
                            {selectedTicket.type === 'trial_request' && !isStaff ? (
                                <div className="space-y-8 py-4">
                                    {/* ... existing client trial request view ... */}
                                    {/* trial request status visualization */}
                                    <div className="bg-white/5 border border-white/5 rounded-3xl p-8">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-16 h-16 rounded-2xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                                                <Dumbbell size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-russo text-white">{selectedTicket.programType || 'Пробная тренировка'}</h2>
                                                <p className="text-white/40 text-sm tracking-widest uppercase font-bold">Заявка #{selectedTicket.id.slice(0, 8)}</p>
                                            </div>
                                        </div>

                                        {/* Horizontal Progress Timeline */}
                                        <div className="relative pt-10 pb-4">
                                            <div className="absolute top-[52px] left-0 right-0 h-1 bg-white/5" />
                                            <div
                                                className="absolute top-[52px] left-0 h-1 bg-sparta-gold transition-all duration-1000"
                                                style={{
                                                    width: selectedTicket.status === 'completed' ? '100%' :
                                                        selectedTicket.status === 'contacted' ? '66%' :
                                                            selectedTicket.status === 'rejected' ? '100%' : '33%'
                                                }}
                                            />

                                            <div className="flex justify-between relative z-10">
                                                {[
                                                    { id: 'new', label: 'Подана', icon: Plus },
                                                    { id: 'contacted', label: 'Обработка', icon: Phone },
                                                    { id: 'completed', label: 'Одобрена', icon: CheckCircle2 }
                                                ].map((step, idx) => {
                                                    const isCompleted = selectedTicket.status === 'completed' ||
                                                        (selectedTicket.status === 'contacted' && idx <= 1) ||
                                                        (idx === 0);
                                                    const isCurrent = (selectedTicket.status === step.id) || (selectedTicket.status === 'completed' && idx === 2);

                                                    return (
                                                        <div key={step.id} className="flex flex-col items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${isCompleted ? 'bg-sparta-gold border-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'bg-black border-white/10 text-white/20'}`}>
                                                                {step.id === 'completed' && selectedTicket.status === 'rejected' ? <X size={18} className="text-red-500" /> : <step.icon size={18} />}
                                                            </div>
                                                            <div className="text-center">
                                                                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isCompleted ? 'text-white' : 'text-white/20'}`}>{step.label}</div>
                                                                {isCurrent && <motion.div layoutId="activeStep" className="w-1 h-1 bg-sparta-gold rounded-full mx-auto" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <User size={12} className="text-sparta-gold" /> Информация о спортсмене
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-white/40">Имя и фамилия</span>
                                                    <span className="text-white font-bold">{selectedTicket.childSurname} {selectedTicket.childName}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-white/40">Возраст</span>
                                                    <span className="text-white font-bold">{selectedTicket.childAge} лет</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <MessageCircle size={12} className="text-sparta-gold" /> Комментарий и интересы
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {selectedTicket.sports?.map((s, i) => (
                                                    <span key={i} className="px-2 py-1 bg-sparta-gold/10 text-sparta-gold rounded-lg text-[10px] uppercase font-bold tracking-tight border border-sparta-gold/20">
                                                        {s}
                                                    </span>
                                                ))}
                                                {(!selectedTicket.sports || selectedTicket.sports.length === 0) && <span className="text-[10px] text-white/20 italic">Интересы не указаны</span>}
                                            </div>
                                            {selectedTicket.comment ? (
                                                <div className="p-3 bg-black/40 rounded-2xl text-xs text-white/60 italic leading-relaxed border border-white/5">
                                                    "{selectedTicket.comment}"
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-white/20 italic">Комментарий отсутствует</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                                        <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                            <Clock size={12} className="text-sparta-gold" /> История обработки
                                        </div>
                                        <div className="space-y-4">
                                            {selectedTicket.history?.map((h, i) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-2 h-2 rounded-full mt-1.5 transition-shadow duration-300 ${i === 0 ? 'bg-sparta-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]' : 'bg-white/10'}`} />
                                                        {i < selectedTicket.history!.length - 1 && <div className="w-[1px] flex-1 bg-white/5 my-1" />}
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`text-xs font-bold uppercase tracking-tight ${i === 0 ? 'text-white' : 'text-white/40'}`}>
                                                                {getStatusInfo(h.status).label}
                                                            </span>
                                                            <span className="text-[10px] text-white/20">
                                                                {h.timestamp?.seconds ? format(new Date(h.timestamp.seconds * 1000), 'd MMM HH:mm', { locale: ru }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className={`text-xs ${i === 0 ? 'text-white/60' : 'text-white/20'}`}>{h.note || 'Статус обновлен'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedTicket.history || selectedTicket.history.length === 0) && (
                                                <div className="flex gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-sparta-gold mt-1.5" />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-bold text-white uppercase tracking-tight">Подана</span>
                                                            <span className="text-[10px] text-white/20">
                                                                {selectedTicket.createdAt?.seconds ? format(new Date(selectedTicket.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-white/60">Заявка ожидает обработки</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-sparta-gold/5 border border-sparta-gold/10 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-sparta-gold/20 flex items-center justify-center text-sparta-gold">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold mb-1">Нужна помощь?</h4>
                                            <p className="text-white/40 text-xs max-w-sm">Если у вас есть вопросы по вашей заявке, вы можете задать их нашему менеджеру в чате.</p>
                                        </div>
                                        <div className="w-full max-w-sm">
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {QUICK_CATEGORIES.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setNewSubject(cat.label)}
                                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${newSubject === cat.label
                                                                ? 'bg-sparta-gold border-sparta-gold text-black shadow-lg shadow-sparta-gold/20'
                                                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <label className="text-[10px] text-white/40 uppercase font-black mb-2 block tracking-widest">Тема обращения</label>
                                            <input
                                                type="text"
                                                placeholder={`Вопрос по заявке #${selectedTicket.id.slice(0, 8)}`}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sparta-gold transition-all mb-3 font-medium"
                                                value={newSubject}
                                                onChange={(e) => setNewSubject(e.target.value)}
                                            />
                                            <button
                                                onClick={() => {
                                                    setIsCreating(true);
                                                    if (!newSubject.trim()) {
                                                        setNewSubject(`Вопрос по заявке #${selectedTicket.id.slice(0, 8)}`);
                                                    }
                                                    setSelectedTicketId(null);
                                                }}
                                                className="w-full px-6 py-2.5 bg-sparta-gold text-black text-xs font-bold uppercase rounded-xl hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <MessageSquare size={16} /> Начать чат
                                            </button>
                                        </div>
                                    </div>

                                    {/* Chat history for client (Trial Request) */}
                                    <div className="mt-8 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <div className="h-px flex-1 bg-white/5" />
                                            <span className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">История обсуждения</span>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>

                                        {selectedTicket.thread && selectedTicket.thread.length > 0 ? (
                                            <div className="space-y-6">
                                                {selectedTicket.thread.map((msg, idx) => {
                                                    const isAdmin = msg.sender === 'admin';
                                                    return (
                                                        <div key={idx} className={`flex items-end gap-3 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                                                            {isAdmin && (
                                                                <div className="w-8 h-8 rounded-full bg-sparta-gold/20 flex items-center justify-center text-sparta-gold flex-shrink-0 border border-sparta-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                                                                    <Shield size={16} />
                                                                </div>
                                                            )}

                                                            <div className={`max-w-[80%] group`}>
                                                                {isAdmin && (
                                                                    <span className="text-[10px] font-bold text-sparta-gold/60 uppercase tracking-widest ml-1 mb-1 block">
                                                                        Менеджер Sparta
                                                                    </span>
                                                                )}
                                                                <div className={`
                                                                    p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md transition-all duration-300
                                                                    ${isAdmin
                                                                        ? 'bg-white/5 text-white rounded-bl-none border border-white/10 hover:bg-white/[0.08]'
                                                                        : 'bg-sparta-gold text-black rounded-br-none shadow-lg shadow-sparta-gold/20 hover:scale-[1.01]'}
                                                                `}>
                                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                                    <div className={`text-[9px] mt-2 font-bold opacity-40 uppercase tracking-tighter text-right ${isAdmin ? 'text-white' : 'text-black'}`}>
                                                                        {msg.createdAt?.seconds ? format(new Date(msg.createdAt.seconds * 1000), 'HH:mm', { locale: ru }) : ''}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {!isAdmin && (
                                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 flex-shrink-0 border border-white/10">
                                                                    <User size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 text-center text-white/10 opacity-50 italic">
                                                <MessageCircle size={24} className="mb-2" />
                                                <p className="text-[10px] uppercase tracking-widest">Здесь будут отображаться ответы менеджера</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : selectedTicket.type === 'trial_request' && isStaff ? (
                                <div className="space-y-6 py-2">
                                    {/* Admin Context Card */}
                                    <div className="bg-white/5 border-b border-white/10 p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold border border-sparta-gold/20">
                                                    <Dumbbell size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-lg tracking-tight">{selectedTicket.childName} {selectedTicket.childSurname}</h4>
                                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">{selectedTicket.programType} • {selectedTicket.childAge} лет</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end text-[11px] text-white/30 space-y-1">
                                                <div className="flex items-center gap-2 font-mono text-sparta-gold/80 hover:text-sparta-gold cursor-pointer transition-colors bg-white/5 px-2 py-1 rounded-lg">
                                                    <Phone size={12} /> {selectedTicket.parentPhone}
                                                </div>
                                                {selectedTicket.email && (
                                                    <div className="flex items-center gap-2 opacity-60">
                                                        <Mail size={12} /> {selectedTicket.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {selectedTicket.comment && (
                                            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 text-xs text-white/60 italic leading-relaxed">
                                                "{selectedTicket.comment}"
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {selectedTicket.sports?.map((s, i) => (
                                                <span key={i} className="px-2 py-1 bg-white/5 text-white/40 rounded-lg text-[9px] uppercase font-bold tracking-widest border border-white/5">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Internal Note for Admin */}
                                        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4">
                                            <div className="text-[10px] text-yellow-500/60 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Info size={12} /> Внутренняя заметка администратора
                                            </div>
                                            <textarea
                                                defaultValue={selectedTicket.adminNotes || ''}
                                                onBlur={(e) => updateDoc(doc(db, "requests", selectedTicket.id), { adminNotes: e.target.value })}
                                                placeholder="Напишите здесь важную информацию о клиенте..."
                                                className="w-full bg-transparent text-sm text-white placeholder-white/10 focus:outline-none min-h-[60px] resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Chat Thread below the card */}
                                    <div className="space-y-4 min-h-[300px]">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="h-px flex-1 bg-white/5" />
                                            <span className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">История обсуждения</span>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>

                                        {/* Show initial message if exists and it's a trial request */}
                                        {selectedTicket.type === 'trial_request' && selectedTicket.message && (
                                            <div className="flex justify-start mb-6 items-end gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 flex-shrink-0 border border-white/10">
                                                    <User size={16} />
                                                </div>
                                                <div className="max-w-[80%]">
                                                    <div className="p-4 rounded-2xl text-sm leading-relaxed bg-white/5 text-white rounded-bl-none border border-white/10 backdrop-blur-md">
                                                        <p className="whitespace-pre-wrap">{selectedTicket.message}</p>
                                                        <div className="text-[9px] mt-2 font-bold opacity-40 uppercase tracking-tighter text-white/60">
                                                            {selectedTicket.createdAt?.seconds ? format(new Date(selectedTicket.createdAt.seconds * 1000), 'HH:mm', { locale: ru }) : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedTicket.thread && selectedTicket.thread.length > 0 ? (
                                            <div className="space-y-6">
                                                {selectedTicket.thread.map((msg, idx) => {
                                                    const isMe = msg.sender === 'admin';
                                                    return (
                                                        <div key={idx} className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            {!isMe && (
                                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 flex-shrink-0 border border-white/10">
                                                                    <User size={16} />
                                                                </div>
                                                            )}

                                                            <div className={`max-w-[80%] group`}>
                                                                <div className={`
                                                                    p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md transition-all duration-300
                                                                    ${isMe
                                                                        ? 'bg-sparta-gold text-black rounded-br-none shadow-lg shadow-sparta-gold/20 hover:scale-[1.01]'
                                                                        : 'bg-white/5 text-white rounded-bl-none border border-white/10 hover:bg-white/[0.08]'}
                                                                `}>
                                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                                    <div className={`text-[9px] mt-2 font-bold opacity-40 uppercase tracking-tighter text-right ${isMe ? 'text-black' : 'text-white'}`}>
                                                                        {msg.createdAt?.seconds ? format(new Date(msg.createdAt.seconds * 1000), 'HH:mm', { locale: ru }) : ''}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isMe && (
                                                                <div className="w-8 h-8 rounded-full bg-sparta-gold/20 flex items-center justify-center text-sparta-gold flex-shrink-0 border border-sparta-gold/30">
                                                                    <Shield size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5 text-white/10">
                                                    <MessageSquare size={32} />
                                                </div>
                                                <p className="text-sm text-white/40 mb-1 font-medium">История обсуждения пуста</p>
                                                <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">Напишите сообщение пользователю, чтобы начать диалог</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col">
                                    {/* Chat Header and Status Timeline */}
                                    <div className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-20">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                                    {selectedTicket.subject || 'Служба поддержки'}
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                                </h2>
                                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                                    ID: #{selectedTicket.id.slice(-6).toUpperCase()} • {selectedTicket.createdAt?.seconds ? format(new Date(selectedTicket.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru }) : ''}
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedTicket.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                    selectedTicket.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                        'bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20'
                                                }`}>
                                                {selectedTicket.status === 'completed' ? 'Решено' :
                                                    selectedTicket.status === 'in_progress' ? 'В работе' : 'Новое'}
                                            </div>
                                        </div>

                                        {/* Progress Timeline */}
                                        <div className="relative pt-2 pb-2">
                                            <div className="absolute top-[30px] left-0 right-0 h-0.5 bg-white/5" />
                                            <div
                                                className="absolute top-[30px] left-0 h-0.5 bg-sparta-gold transition-all duration-1000"
                                                style={{
                                                    width: selectedTicket.status === 'completed' ? '100%' :
                                                        selectedTicket.status === 'in_progress' ? '50%' : '0%'
                                                }}
                                            />
                                            <div className="flex justify-between relative z-10">
                                                {[
                                                    { id: 'new', label: 'Создано', icon: Plus },
                                                    { id: 'in_progress', label: 'В работе', icon: MessageSquare },
                                                    { id: 'completed', label: 'Решено', icon: CheckCircle2 }
                                                ].map((step, idx) => {
                                                    const isCompleted = (selectedTicket.status === 'completed') ||
                                                        (selectedTicket.status === 'in_progress' && idx <= 1) ||
                                                        (idx === 0);
                                                    const StepIcon = step.icon;
                                                    return (
                                                        <div key={step.id} className="flex flex-col items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border ${isCompleted ? 'bg-sparta-gold border-sparta-gold text-black' : 'bg-black border-white/10 text-white/20'}`}>
                                                                <StepIcon size={14} />
                                                            </div>
                                                            <div className={`text-[9px] font-black uppercase tracking-tighter ${isCompleted ? 'text-white' : 'text-white/20'}`}>{step.label}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 p-4 md:p-8 space-y-6">
                                        {/* Status History Events */}
                                        {selectedTicket.history && selectedTicket.history.length > 0 && (
                                            <div className="space-y-3 mb-8">
                                                {selectedTicket.history.map((h: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.08]">
                                                        <div className={`w-2 h-2 rounded-full ${h.status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : h.status === 'in_progress' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-sparta-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]'}`} />
                                                        <div className="flex-1 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden">
                                                            Обращение {h.status === 'completed' ? 'завершено' : h.status === 'in_progress' ? 'взято в работу' : 'обновлено'}
                                                        </div>
                                                        <div className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">
                                                            {h.timestamp?.seconds ? format(new Date(h.timestamp.seconds * 1000), 'HH:mm') : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Initial Message (if not in thread) */}
                                        {(!selectedTicket.thread || selectedTicket.thread.length === 0) && selectedTicket.message && (
                                            <div className="flex justify-end">
                                                <div className="max-w-[80%] bg-sparta-gold/20 text-white rounded-2xl rounded-tr-none p-4">
                                                    <div className="text-sm">{selectedTicket.message}</div>
                                                    <div className="text-[10px] text-white/40 mt-1 text-right">
                                                        {selectedTicket.createdAt?.seconds ? format(new Date(selectedTicket.createdAt.seconds * 1000), 'HH:mm') : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Thread with Date Headers */}
                                        <AnimatePresence mode="popLayout">
                                            {selectedTicket.thread?.map((msg, idx) => {
                                                const isUser = msg.sender === 'user';
                                                const msgDate = msg.createdAt.toDate();

                                                // Determine if we need to show a date header
                                                let showDateHeader = false;
                                                if (idx === 0) {
                                                    showDateHeader = true;
                                                } else {
                                                    const prevMsg = selectedTicket.thread![idx - 1];
                                                    const prevDate = prevMsg.createdAt.toDate();
                                                    if (prevDate.toDateString() !== msgDate.toDateString()) {
                                                        showDateHeader = true;
                                                    }
                                                }

                                                return (
                                                    <React.Fragment key={idx}>
                                                        {showDateHeader && (
                                                            <div className="flex justify-center my-4">
                                                                <span className="text-[10px] uppercase font-bold text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                                                    {isToday(msgDate) ? 'Сегодня' : isYesterday(msgDate) ? 'Вчера' : format(msgDate, 'd MMMM', { locale: ru })}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            {!isUser && (
                                                                <div className="w-8 h-8 rounded-full bg-sparta-gold/20 flex items-center justify-center text-sparta-gold flex-shrink-0 border border-sparta-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                                                                    <Shield size={16} />
                                                                </div>
                                                            )}

                                                            <div className="max-w-[80%] group">
                                                                {!isUser && (
                                                                    <span className="text-[10px] font-bold text-sparta-gold/60 uppercase tracking-widest ml-1 mb-1 block">
                                                                        Менеджер Sparta
                                                                    </span>
                                                                )}
                                                                <div className={`
                                                                p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md transition-all duration-300
                                                                ${isUser
                                                                        ? 'bg-sparta-gold text-black rounded-br-none shadow-lg shadow-sparta-gold/20 hover:scale-[1.01]'
                                                                        : 'bg-white/5 text-white rounded-bl-none border border-white/10 hover:bg-white/[0.08]'}
                                                            `}>
                                                                    {msg.image && (
                                                                        <div
                                                                            className="mt-2 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all border border-white/10"
                                                                            onClick={() => setZoomImage(msg.image)}
                                                                        >
                                                                            <img src={msg.image} alt="Attachment" className="max-w-full h-auto" />
                                                                        </div>
                                                                    )}
                                                                    {msg.attachment && (
                                                                        <div className="mt-2 text-xs">
                                                                            {msg.attachment.type.startsWith('image/') ? (
                                                                                <div
                                                                                    className="rounded-xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all border border-white/10"
                                                                                    onClick={() => setZoomImage(msg.attachment.url)}
                                                                                >
                                                                                    <img src={msg.attachment.url} alt={msg.attachment.name} className="max-w-full h-auto" />
                                                                                </div>
                                                                            ) : msg.attachment.type.startsWith('video/') ? (
                                                                                <div className="w-[280px] sm:w-[350px] max-w-full aspect-video bg-black/20 rounded-lg overflow-hidden relative">
                                                                                    <div className="absolute inset-0">
                                                                                        <SpartaVideoPlayer src={msg.attachment.url} className="w-full h-full" />
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="p-3 flex items-center gap-3 bg-black/20 rounded-xl border border-black/10">
                                                                                    <FileText size={20} className="text-sparta-gold" />
                                                                                    <div className="text-xs text-white truncate max-w-[150px]">{msg.attachment.name}</div>
                                                                                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-white/50 hover:text-white">
                                                                                        <Download size={16} />
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                                                                    {/* Metadata */}
                                                                    <div className={`text-[9px] mt-2 font-bold flex gap-2 items-center justify-end uppercase tracking-tighter ${isUser ? 'text-black/40' : 'text-white/30'}`}>
                                                                        <span className="flex items-center gap-1">
                                                                            {msg.senderName}
                                                                            {msg.senderRole === 'admin' && <BadgeCheck size={10} className="text-blue-500" />}
                                                                            {msg.senderVerification?.isVerified && <BadgeCheck size={10} className="text-blue-500" />}
                                                                        </span>
                                                                        <span>{format(msgDate, 'HH:mm')}</span>
                                                                        {isUser && (
                                                                            <CheckCheck size={14} className={msg.isRead ? "text-black" : "text-black/20"} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isUser && (
                                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 flex-shrink-0 border border-white/10">
                                                                    <User size={16} />
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </AnimatePresence>
                                        {isAgentTyping && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="flex justify-start"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-2 mt-auto">
                                                    <User size={16} className="text-sparta-gold" />
                                                </div>
                                                <div className="bg-white/10 text-white p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                                </div>
                                            </motion.div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-black/20 border-t border-white/10 relative">
                            {selectedTicket.status === 'completed' ? (
                                <div className="text-center text-white/50 text-sm py-4">
                                    <div className="mb-2 text-white">Вопрос решен? Оцените работу поддержки:</div>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => handleRateTicket(star)}
                                                className={`transition-colors ${selectedTicket.rating && star <= selectedTicket.rating ? 'text-sparta-gold' : 'text-white/20 hover:text-sparta-gold'}`}
                                            >
                                                <Star size={24} className={selectedTicket.rating && star <= selectedTicket.rating ? 'fill-sparta-gold' : ''} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-xs">Обращение закрыто. Создайте новое, если возникли вопросы.</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {/* Quick Replies */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                                        {(isStaff ? QUICK_REPLIES : [
                                            { label: "Где проходит тренировка?", text: "Подскажите, пожалуйста, где именно проходят тренировки?" },
                                            { label: "Стоимость", text: "Какая сейчас актуальная стоимость занятий?" },
                                            { label: "Запись", text: "Как я могу записаться на пробную тренировку?" },
                                            { label: "График", text: "Подскажите актуальный график работы филиала." }
                                        ]).map((reply, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setReplyText(reply.text);
                                                    scrollToBottom();
                                                }}
                                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all whitespace-nowrap"
                                            >
                                                {reply.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Attachment Preview */}
                                    {attachment && (
                                        <div className="flex items-start gap-3 p-2 bg-white/5 rounded-xl border border-white/10 w-fit mb-2 animate-in fade-in slide-in-from-top-1">
                                            {attachment.type.startsWith('image/') ? (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                                    <img src={attachment.preview} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            ) : attachment.type.startsWith('video/') ? (
                                                <div className="w-16 h-16 rounded-lg bg-black flex items-center justify-center shrink-0">
                                                    <Play size={24} className="text-sparta-gold" />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                    <FileText size={24} className="text-white/50" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 py-1 pr-6 relative">
                                                <div className="text-xs font-bold text-white truncate max-w-[150px]">{attachment.file.name}</div>
                                                <div className="text-[10px] text-white/40">{(attachment.file.size / 1024 / 1024).toFixed(2)} MB</div>
                                                <button
                                                    onClick={() => {
                                                        setAttachment(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="absolute top-1 right-0 p-1 bg-black/50 hover:bg-black rounded-full text-white transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Emoji Picker Popup */}
                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className="absolute bottom-20 left-4 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-2xl z-50 emoji-picker-container w-64"
                                            >
                                                <div className="grid grid-cols-6 gap-2">
                                                    {["😊", "👍", "👎", "👋", "🔥", "⚽", "💪", "🏆", "📅", "✅", "❌", "❓", "😎", "🤔", "😢", "🎉", "🤝", "🥇"].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleEmojiClick(emoji)}
                                                            className="text-xl hover:bg-white/10 p-1 rounded transition-colors"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex gap-2 items-end">
                                        <input
                                            type="file"
                                            accept="image/*,video/*,application/pdf"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`p-3 rounded-2xl transition-all duration-300 mb-[1px] emoji-picker-container shadow-lg ${showEmojiPicker ? 'bg-sparta-gold text-black' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:scale-105'}`}
                                            title="Смайлики"
                                        >
                                            <Smile size={20} />
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`p-3 rounded-2xl transition-all duration-300 mb-[1px] shadow-lg ${attachment ? 'bg-sparta-gold text-black shadow-sparta-gold/20' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:scale-105'}`}
                                            title="Прикрепить файл"
                                        >
                                            <Paperclip size={20} />
                                        </button>

                                        <textarea
                                            value={replyText}
                                            onChange={(e) => {
                                                setReplyText(e.target.value);
                                                handleTyping(selectedTicketId);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendReply();
                                                }
                                            }}
                                            placeholder="Напишите сообщение..."
                                            rows={1}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:border-sparta-gold focus:bg-white/[0.08] outline-none resize-none min-h-[50px] max-h-[150px] backdrop-blur-md transition-all placeholder:text-white/20"
                                            style={{ height: 'auto' }}
                                            onInput={(e) => {
                                                e.currentTarget.style.height = 'auto';
                                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                            }}
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={(!replyText.trim() && !attachment) || uploadProgress !== null}
                                            className="p-3 bg-sparta-gold text-black rounded-xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-[1px] relative overflow-hidden"
                                        >
                                            {uploadProgress !== null ? (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                </div>
                                            ) : <Send size={20} />}
                                            {uploadProgress !== null && (
                                                <div
                                                    className="absolute bottom-0 left-0 h-1 bg-black/40 transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto bg-black/40 backdrop-blur-sm p-8 relative">
                        <div className="max-w-3xl mx-auto py-8">
                            <div className="flex flex-col items-center text-center mb-12">
                                <div className="w-20 h-20 bg-sparta-gold/10 rounded-full flex items-center justify-center mb-6 border border-sparta-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                                    <MessageSquare size={32} className="text-sparta-gold" />
                                </div>
                                <h3 className="text-3xl font-russo text-white mb-3 tracking-tight uppercase">Центр поддержки Sparta</h3>
                                <p className="text-white/40 max-w-md font-medium">
                                    Выберите обращение слева или создайте новое. Мы также собрали ответы на самые частые вопросы ниже.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4 transition-all hover:bg-white/10">
                                    <div className="w-10 h-10 bg-sparta-gold/10 rounded-xl flex items-center justify-center text-sparta-gold">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">09:00 - 21:00</div>
                                        <div className="text-white/30 text-[10px] uppercase font-black tracking-widest leading-none mt-1">График работы</div>
                                    </div>
                                </div>
                                <div className={`border p-5 rounded-2xl flex items-center gap-4 transition-all duration-500 ${isSupportOnline ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${isSupportOnline ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/20'}`}>
                                        <CheckCircle2 size={20} className={isSupportOnline ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm transition-colors duration-500 ${isSupportOnline ? 'text-white' : 'text-white/40'}`}>
                                            {isSupportOnline ? 'Онлайн' : 'Офлайн'}
                                        </div>
                                        <div className="text-white/30 text-[10px] uppercase font-black tracking-widest leading-none mt-1">Статус менеджеров</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-px bg-white/5 flex-1" />
                                    <h4 className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Часто задаваемые вопросы</h4>
                                    <div className="h-px bg-white/5 flex-1" />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {SUPPORT_FAQ.map(faq => (
                                        <div key={faq.id} className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-white/10 transition-all group">
                                            <h5 className="text-white font-bold mb-2 flex items-start gap-3">
                                                <span className="w-1.5 h-1.5 bg-sparta-gold rounded-full mt-2 group-hover:scale-125 transition-transform" />
                                                {faq.question}
                                            </h5>
                                            <p className="text-white/40 text-sm pl-4 leading-relaxed">{faq.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Zoom Modal */}
            <AnimatePresence>
                {zoomImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomImage(null)}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-full max-h-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={zoomImage} alt="Zoomed" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain border border-white/10" />
                            <button
                                onClick={() => setZoomImage(null)}
                                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserRequests;
