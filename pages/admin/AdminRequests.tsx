import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Search, CheckCircle, XCircle, Clock, Phone, Mail, Trash2, User, MessageCircle, Save, ChevronRight, Filter, Calendar, Info, MoreVertical, ExternalLink, Zap, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AdminRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [activeTypeFilter, setActiveTypeFilter] = useState('all');
    const [quickReplyRequest, setQuickReplyRequest] = useState<any | null>(null);
    const [quickMessage, setQuickMessage] = useState('');
    const [isSendingQuick, setIsSendingQuick] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log(`AdminRequests: Fetched ${snapshot.size} requests.`);
            const loadedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(loadedRequests);
            setLoading(false);
        }, (error) => {
            console.error("AdminRequests Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateStatus = async (id: string, newStatus: string, requestData: any) => {
        try {
            await updateDoc(doc(db, "requests", id), { status: newStatus });

            if (requestData.email) {
                let title = 'Обновление статуса заявки';
                let message = `Статус вашей заявки изменен на: ${getStatusLabel(newStatus)}`;

                if (newStatus === 'completed') {
                    title = 'Заявка завершена';
                    message = 'Ваша заявка успешно обработана. Ждем вас на тренировке!';
                } else if (newStatus === 'rejected') {
                    title = 'Заявка отклонена';
                    message = 'К сожалению, ваша заявка была отклонена. Свяжитесь с нами для уточнения.';
                } else if (newStatus === 'contacted') {
                    title = 'Заявка в работе';
                    message = 'Администратор взял вашу заявку в работу. Скоро мы с вами свяжемся.';
                }

                await addDoc(collection(db, "notifications"), {
                    email: requestData.email,
                    title,
                    message,
                    type: 'request',
                    isRead: false,
                    createdAt: new Date(),
                    relatedId: id
                });
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Удалить заявку?")) {
            try {
                await deleteDoc(doc(db, "requests", id));
            } catch (error) {
                console.error("Error deleting request:", error);
            }
        }
    };

    const handleSaveNote = async (id: string) => {
        const note = editingNotes[id];
        if (note === undefined) return;

        setSavingNoteId(id);
        try {
            await updateDoc(doc(db, "requests", id), { adminNotes: note });
        } catch (error) {
            console.error("Error saving notes:", error);
        }
        setSavingNoteId(null);
    };

    const handleNoteChange = (id: string, value: string) => {
        setEditingNotes(prev => ({ ...prev, [id]: value }));
    };

    const openInAppChat = async (req: any) => {
        if (!req.email) {
            alert("Для открытия чата необходим Email пользователя.");
            return;
        }

        try {
            // Check if thread exists
            const q = query(collection(db, "messages"), where("email", "==", req.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                navigate(`/admin/messages?id=${snapshot.docs[0].id}`);
            } else {
                // Create new thread
                const docRef = await addDoc(collection(db, "messages"), {
                    userId: req.userId || null,
                    name: `${req.childSurname} ${req.childName}`,
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Пробная тренировка'}`,
                    message: req.comment || 'Новая заявка через форму на сайте',
                    status: 'new',
                    createdAt: serverTimestamp(),
                    thread: [{
                        text: req.comment || `Новая заявка на программу: ${req.programType || 'Пробная тренировка'}`,
                        sender: 'user',
                        senderName: req.childName,
                        createdAt: Timestamp.now()
                    }]
                });
                navigate(`/admin/messages?id=${docRef.id}`);
            }
        } catch (error) {
            console.error("Error opening chat:", error);
            alert("Ошибка при открытии чата.");
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            (req.childName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.childSurname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.parentPhone || '').includes(searchTerm) ||
            (req.email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = activeTypeFilter === 'all' ||
            (req.programType === 'Smart Match' && activeTypeFilter === 'smart') ||
            (req.programType !== 'Smart Match' && activeTypeFilter === 'trial');

        return matchesSearch && matchesType;
    });

    const isUrgent = (req: any) => {
        if (req.status && req.status !== 'new') return false;
        if (!req.createdAt?.seconds) return false;
        const now = new Date().getTime();
        const created = req.createdAt.seconds * 1000;
        const hoursDiff = (now - created) / (1000 * 60 * 60);
        return hoursDiff > 24;
    };

    const handleSendQuickMessage = async () => {
        if (!quickReplyRequest || !quickMessage.trim()) return;
        setIsSendingQuick(true);
        try {
            const req = quickReplyRequest;
            // Similar logic to openInAppChat but just adds the message
            const q = query(collection(db, "messages"), where("email", "==", req.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const threadDoc = snapshot.docs[0];
                const existingThread = threadDoc.data().thread || [];
                await updateDoc(doc(db, "messages", threadDoc.id), {
                    status: 'active',
                    lastMessageAt: serverTimestamp(),
                    thread: [...existingThread, {
                        text: quickMessage,
                        sender: 'admin',
                        senderName: 'Администратор',
                        createdAt: Timestamp.now()
                    }]
                });
            } else {
                await addDoc(collection(db, "messages"), {
                    userId: req.userId || null,
                    name: `${req.childSurname} ${req.childName}`,
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Пробная тренировка'}`,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    lastMessageAt: serverTimestamp(),
                    thread: [
                        {
                            text: req.comment || `Новая заявка на программу: ${req.programType || 'Пробная тренировка'}`,
                            sender: 'user',
                            senderName: req.childName,
                            createdAt: Timestamp.now()
                        },
                        {
                            text: quickMessage,
                            sender: 'admin',
                            senderName: 'Администратор',
                            createdAt: Timestamp.now()
                        }
                    ]
                });
            }
            setQuickMessage('');
            setQuickReplyRequest(null);
            alert("Сообщение отправлено!");
        } catch (error) {
            console.error("Error sending quick message:", error);
            alert("Ошибка при отправке.");
        }
        setIsSendingQuick(false);
    };

    const columns = [
        { id: 'new', title: 'Новые', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { id: 'contacted', title: 'В работе', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { id: 'completed', title: 'Завершены', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { id: 'rejected', title: 'Отклонены', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Завершен';
            case 'contacted': return 'В работе';
            case 'rejected': return 'Отклонен';
            default: return 'Новый';
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-sparta-gold/30 border-t-sparta-gold rounded-full animate-spin" />
            <p className="text-white/40 font-russo animate-pulse tracking-widest uppercase text-sm">Загрузка запросов...</p>
        </div>
    );

    const selectedRequest = requests.find(r => r.id === selectedRequestId);

    return (
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col font-manrope">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 p-2 flex-shrink-0">
                <div className="relative">
                    <h1 className="text-4xl font-russo text-white mb-2 tracking-tight">
                        ЗАЯВКИ <span className="text-sparta-gold opacity-50">/</span> <span className="text-white/40 text-lg uppercase font-manrope font-bold tracking-[0.2em]">Kanban</span>
                    </h1>
                    <div className="absolute -bottom-1 left-0 w-24 h-1 bg-gradient-to-r from-sparta-gold to-transparent rounded-full" />
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                    <div className="relative flex items-center group w-full md:w-80">
                        <Search className="absolute left-4 text-white/20 group-focus-within:text-sparta-gold transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск клиента, телефона, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all font-medium"
                        />
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setActiveTypeFilter('all')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTypeFilter === 'all' ? 'bg-sparta-gold text-black' : 'text-white/40'}`}
                        >Все</button>
                        <button
                            onClick={() => setActiveTypeFilter('smart')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTypeFilter === 'smart' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-white/40'}`}
                        >Smart Match</button>
                        <button
                            onClick={() => setActiveTypeFilter('trial')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTypeFilter === 'trial' ? 'bg-sparta-gold/20 text-sparta-gold' : 'text-white/40'}`}
                        >Пробные</button>
                    </div>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 relative">
                <div className="flex gap-6 h-full min-w-max pb-4">
                    {columns.map(column => {
                        const columnRequests = filteredRequests.filter(req => (req.status || 'new') === column.id);

                        return (
                            <div key={column.id} className="w-[340px] flex flex-col bg-white/[0.02] rounded-[2rem] border border-white/5 h-full overflow-hidden backdrop-blur-sm relative group">
                                {/* Subtle Glow Pattern */}
                                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-${column.color.split('-')[1]}-500/50 to-transparent opacity-50`} />

                                {/* Column Header */}
                                <div className={`p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${column.color.replace('text', 'bg')} shadow-[0_0_10px_rgba(var(--color),0.5)] animate-pulse`} />
                                        <h3 className={`font-russo uppercase tracking-wider text-sm ${column.color}`}>
                                            {column.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white/5 text-white/40 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5">
                                            {columnRequests.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {columnRequests.map(req => (
                                        <motion.div
                                            layoutId={req.id}
                                            key={req.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => {
                                                setSelectedRequestId(req.id);
                                                setIsSidePanelOpen(true);
                                            }}
                                            className={`group/card relative bg-white/5 border border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-white/[0.08] hover:border-sparta-gold/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 ${isUrgent(req) ? 'ring-2 ring-red-500/30 border-red-500/30 bg-red-500/[0.02]' : ''}`}
                                        >
                                            {/* Urgent Pulse */}
                                            {isUrgent(req) && (
                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse z-20">
                                                    СРОЧНО
                                                </div>
                                            )}
                                            {/* Accent Line */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-sparta-gold/30 rounded-r-full group-hover/card:bg-sparta-gold transition-colors" />

                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-white font-bold font-russo tracking-wide group-hover/card:text-sparta-gold transition-colors">
                                                            {req.childSurname || ''} {req.childName || 'Без имени'}
                                                        </h4>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/30 uppercase font-bold tracking-widest">
                                                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                                            <User size={10} className="text-sparta-gold" />
                                                            {req.childAge ? `${req.childAge} ЛЕТ` : '? ЛЕТ'}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar size={10} />
                                                            {req.createdAt?.seconds ? format(new Date(req.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru }) : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(req.id);
                                                        }}
                                                        className="p-1.5 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Details Section */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3 text-xs text-white/70">
                                                        <div className="w-8 h-8 rounded-lg bg-sparta-gold/10 flex items-center justify-center text-sparta-gold border border-sparta-gold/20">
                                                            <Phone size={14} />
                                                        </div>
                                                        <span className="font-mono">{req.parentPhone || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {req.email && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setQuickReplyRequest(req);
                                                                    }}
                                                                    className="h-10 px-3 flex items-center justify-center gap-2 text-sparta-gold bg-sparta-gold/10 hover:bg-sparta-gold hover:text-black border border-sparta-gold/20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
                                                                    title="Быстрый ответ через сайт"
                                                                >
                                                                    <Zap size={14} />
                                                                    Ответить
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openInAppChat(req);
                                                                    }}
                                                                    className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white bg-white/5 border border-white/5 rounded-xl transition-all"
                                                                    title="Открыть полный чат"
                                                                >
                                                                    <MessageCircle size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* QUICK ACTIONS ROW */}
                                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                                    {(req.status === 'new' || !req.status) && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'contacted', req); }}
                                                            className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            В работу
                                                        </button>
                                                    )}
                                                    {req.status === 'contacted' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'completed', req); }}
                                                            className="flex-1 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Завершить
                                                        </button>
                                                    )}
                                                    {(req.status === 'new' || !req.status || req.status === 'contacted') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'rejected', req); }}
                                                            className="px-3 py-2 bg-red-500/5 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 rounded-lg text-[10px] font-bold uppercase transition-all"
                                                        >
                                                            Отказ
                                                        </button>
                                                    )}
                                                </div>

                                                {req.isMembership ? (
                                                    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                                                        req.paymentMethod === 'cash'
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                    }`}>
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <Zap size={12} className="shrink-0" />
                                                            <span className="text-[11px] font-extrabold uppercase tracking-wider truncate">
                                                                {req.programType || 'Абонемент'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
                                                            {req.paymentMethod === 'cash' ? '💵 Наличные' : '💳 СБП/Банк'} {req.price ? `• ${req.price.toLocaleString('ru-RU')} ₽` : ''}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${req.programType === 'Smart Match' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                                                        <Zap size={12} className={req.programType === 'Smart Match' ? 'text-indigo-400' : 'text-blue-400'} />
                                                        <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                                                            {req.programType || '🆓 Пробная тренировка'}
                                                        </span>
                                                    </div>
                                                )}

                                                {req.sports && req.sports.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {req.sports.map((sport: string, idx: number) => (
                                                            <span key={idx} className="bg-white/5 text-white/40 text-[9px] px-2 py-0.5 rounded border border-white/10 uppercase font-bold tracking-tighter">
                                                                {sport}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Admin Notes Preview */}
                                                {req.adminNotes && (
                                                    <div className="flex gap-2 items-start bg-yellow-500/5 p-2 rounded-lg border-l-2 border-yellow-500/30">
                                                        <Info size={12} className="text-yellow-500 mt-0.5 shrink-0" />
                                                        <p className="text-[10px] text-yellow-500/70 line-clamp-1 italic">{req.adminNotes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}

                                    {columnRequests.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-white/5 rounded-[1.5rem] bg-white/[0.01]">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                                <Filter size={20} className="text-white/10" />
                                            </div>
                                            <p className="text-[10px] uppercase font-bold tracking-widest text-white/10">Пусто в этой колонке</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Side Panel / Modal for Details */}
            <AnimatePresence>
                {isSidePanelOpen && selectedRequest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidePanelOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="fixed right-0 top-0 h-screen w-full max-w-lg bg-[#0d0d0d] border-l border-white/10 z-[70] shadow-2xl overflow-y-auto custom-scrollbar"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl ${columns.find(c => c.id === (selectedRequest.status || 'new'))?.bg.replace('bg-', 'bg-') || 'bg-white/10'}`}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-russo text-white">{selectedRequest.childSurname} {selectedRequest.childName}</h2>
                                            <p className="text-white/40 text-xs tracking-widest uppercase font-bold">{selectedRequest.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsSidePanelOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                                        <X size={20} className="text-white/20 group-hover:text-white" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => updateStatus(selectedRequest.id, 'contacted', selectedRequest)}
                                            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-500 font-bold text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <Phone size={20} /> В работу
                                        </button>
                                        <button
                                            onClick={() => updateStatus(selectedRequest.id, 'completed', selectedRequest)}
                                            className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-500 font-bold text-xs uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <CheckCircle size={20} /> Одобрить
                                        </button>
                                        <button
                                            onClick={() => updateStatus(selectedRequest.id, 'rejected', selectedRequest)}
                                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <XCircle size={20} /> Отклонить
                                        </button>
                                        <button
                                            onClick={() => openInAppChat(selectedRequest)}
                                            className="p-4 bg-sparta-gold/10 border border-sparta-gold/20 rounded-2xl text-sparta-gold font-bold text-xs uppercase tracking-widest hover:bg-sparta-gold hover:text-black transition-all flex flex-col items-center gap-2"
                                        >
                                            <MessageCircle size={20} /> Написать
                                        </button>
                                    </div>

                                    {/* Main Info */}
                                    <div className="space-y-4">
                                        <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Возраст</div>
                                                    <div className="text-white font-bold">{selectedRequest.childAge} лет</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Создано</div>
                                                    <div className="text-white font-bold">
                                                        {selectedRequest.createdAt?.seconds ? format(new Date(selectedRequest.createdAt.seconds * 1000), 'd MMMM yyyy HH:mm', { locale: ru }) : '—'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-white/5 pt-6">
                                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-3">Контакты</div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 text-white">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Phone size={18} className="text-sparta-gold" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-white/40">{selectedRequest.parentName || 'Телефон'}</div>
                                                            <div className="font-bold underline cursor-pointer">{selectedRequest.parentPhone}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-white">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Mail size={18} className="text-sparta-gold" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-white/40">Email</div>
                                                            <div className="font-bold">{selectedRequest.email || '—'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-white/5 pt-6">
                                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-3">Интересы и спорт</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedRequest.sports?.map((s: string, i: number) => (
                                                        <span key={i} className="px-4 py-2 bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20 rounded-xl text-xs font-bold uppercase tracking-wider">
                                                            {s}
                                                        </span>
                                                    ))}
                                                    {(!selectedRequest.sports || selectedRequest.sports.length === 0) && (
                                                        <span className="text-white/20 italic text-sm">Виды спорта не выбраны</span>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedRequest.programType === 'Smart Match 2.0' && (
                                                <div className="border-t border-white/5 pt-6 animate-in fade-in slide-in-from-bottom-4">
                                                    <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <Zap size={14} /> Глубокий профиль (Smart Match 2.0)
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2 font-manrope">Темперамент</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl">
                                                                    {selectedRequest.temperament === 'leader' ? '🦁' :
                                                                        selectedRequest.temperament === 'team_player' ? '🤝' :
                                                                            selectedRequest.temperament === 'shy_start' ? '🐢' : '⚡'}
                                                                </span>
                                                                <span className="text-sm font-bold text-white uppercase tracking-tight">
                                                                    {selectedRequest.temperament === 'leader' ? 'Лидер' :
                                                                        selectedRequest.temperament === 'team_player' ? 'Командный' :
                                                                            selectedRequest.temperament === 'shy_start' ? 'Тихий старт' : 'Энерджи'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2 font-manrope">Опыт</div>
                                                            <div className="text-sm font-bold text-white uppercase tracking-tight">
                                                                {selectedRequest.experienceLevel === 'pro' ? 'Продвинутый' :
                                                                    selectedRequest.experienceLevel === 'amateur' ? 'Средний' : 'Новичок'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Оценка навыков</div>
                                                        {[
                                                            { id: 'speed', label: 'Скорость', color: 'bg-blue-500' },
                                                            { id: 'technique', label: 'Техника', color: 'bg-green-500' },
                                                            { id: 'discipline', label: 'Дисциплина', color: 'bg-purple-500' }
                                                        ].map(skill => (
                                                            <div key={skill.id} className="space-y-1.5">
                                                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                                                    <span className="text-white/50">{skill.label}</span>
                                                                    <span className="text-white">{selectedRequest.detailedSkills?.[skill.id] || 0}/10</span>
                                                                </div>
                                                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${(selectedRequest.detailedSkills?.[skill.id] || 0) * 10}%` }}
                                                                        className={`h-full ${skill.color}`}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedRequest.comment && (
                                                <div className="border-t border-white/5 pt-6">
                                                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Комментарий</div>
                                                    <div className="p-4 bg-black/40 rounded-2xl text-white/70 italic text-sm leading-relaxed border border-white/5">
                                                        "{selectedRequest.comment}"
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Admin Internal Notes */}
                                        <div className="bg-sparta-gold/5 border border-sparta-gold/10 rounded-[2rem] p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-[10px] text-sparta-gold font-bold uppercase tracking-widest flex items-center gap-2">
                                                    <Info size={14} /> Внутренняя заметка
                                                </div>
                                                {savingNoteId === selectedRequest.id && <Loader2 size={14} className="text-sparta-gold animate-spin" />}
                                            </div>
                                            <textarea
                                                value={editingNotes[selectedRequest.id] !== undefined ? editingNotes[selectedRequest.id] : (selectedRequest.adminNotes || '')}
                                                onChange={(e) => handleNoteChange(selectedRequest.id, e.target.value)}
                                                onBlur={() => handleSaveNote(selectedRequest.id)}
                                                placeholder="Напишите здесь важную информацию о клиенте..."
                                                className="w-full bg-black/40 border border-sparta-gold/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-sparta-gold min-h-[120px] transition-all"
                                            />
                                            <p className="text-[10px] text-sparta-gold/40 mt-3 italic text-center">Заметка сохраняется автоматически при выходе из поля</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Quick Reply Modal */}
            <AnimatePresence>
                {quickReplyRequest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setQuickReplyRequest(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] p-8 z-[90] shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-russo text-white">Быстрый ответ</h3>
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">Кому: {quickReplyRequest.childName}</p>
                                </div>
                                <button onClick={() => setQuickReplyRequest(null)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <textarea
                                    autoFocus
                                    value={quickMessage}
                                    onChange={(e) => setQuickMessage(e.target.value)}
                                    placeholder="Введите ваше сообщение клиенту..."
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-sparta-gold min-h-[150px] transition-all"
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setQuickMessage("Добрый день! Оставили заявку на нашем сайте. Удобно ли вам сейчас пообщаться?")}
                                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] rounded-lg transition-all"
                                    >
                                        Приветствие
                                    </button>
                                    <button
                                        onClick={() => setQuickMessage("Здравствуйте! Заявка одобрена, ждем вас на пробную тренировку в субботу.")}
                                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] rounded-lg transition-all"
                                    >
                                        Одобрение
                                    </button>
                                </div>

                                <button
                                    disabled={isSendingQuick || !quickMessage.trim()}
                                    onClick={handleSendQuickMessage}
                                    className="w-full bg-sparta-gold text-black font-bold py-4 rounded-xl hover:bg-[#ffd700] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSendingQuick ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    Отправить сообщение
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminRequests;
