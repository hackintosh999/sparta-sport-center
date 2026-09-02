import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, Timestamp, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    Search, CheckCircle, Phone, Mail, Trash2, User, MessageCircle,
    MessageSquare, Save, Filter, Calendar, Info, MoreVertical, Zap, X, Loader2,
    CalendarPlus, CheckCheck, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const REJECT_PRESETS = [
    'Не подошло время занятий',
    'Дорого / не устроила цена',
    'Не дозвонились',
    'Передумали',
];

const AdminRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [activeTypeFilter, setActiveTypeFilter] = useState('all');
    const [quickReplyRequest, setQuickReplyRequest] = useState<any | null>(null);
    const [quickMessage, setQuickMessage] = useState('');
    const [isSendingQuick, setIsSendingQuick] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [assignGroupId, setAssignGroupId] = useState('');
    const [showGroupSelect, setShowGroupSelect] = useState(false);

    // ••• menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState<any | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Close ••• menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(loadedRequests);
            setLoading(false);
        }, (error) => {
            console.error('AdminRequests Firestore Error:', error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        getDocs(collection(db, 'groups')).then(snap => {
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }).catch(console.error);
    }, []);

    const updateStatus = async (id: string, newStatus: string, requestData: any) => {
        try {
            await updateDoc(doc(db, 'requests', id), { status: newStatus });
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
                await addDoc(collection(db, 'notifications'), {
                    email: requestData.email, title, message,
                    type: 'request', isRead: false,
                    createdAt: new Date(), relatedId: id
                });
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Удалить заявку?')) {
            try {
                await deleteDoc(doc(db, 'requests', id));
            } catch (error) {
                console.error('Error deleting request:', error);
            }
        }
        setOpenMenuId(null);
    };

    const handleReject = async () => {
        if (!rejectTarget) return;
        setIsRejecting(true);
        try {
            await updateDoc(doc(db, 'requests', rejectTarget.id), {
                status: 'rejected',
                rejectReason: rejectReason || 'Не указана',
            });
            if (rejectTarget.email) {
                await addDoc(collection(db, 'notifications'), {
                    email: rejectTarget.email,
                    title: 'Заявка отклонена',
                    message: 'К сожалению, ваша заявка была отклонена. Свяжитесь с нами для уточнения.',
                    type: 'request', isRead: false,
                    createdAt: new Date(), relatedId: rejectTarget.id
                });
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
        setIsRejecting(false);
        setRejectTarget(null);
        setRejectReason('');
    };

    const handleAddNote = async (requestId: string) => {
        if (!newNoteText.trim()) return;
        setIsSavingNote(true);
        try {
            const note = {
                id: Date.now().toString(),
                text: newNoteText.trim(),
                createdAt: Timestamp.now(),
                authorName: auth.currentUser?.displayName ?? auth.currentUser?.email ?? 'Администратор',
                authorRole: 'admin',
            };
            await updateDoc(doc(db, 'requests', requestId), { notes: arrayUnion(note) });
            setNewNoteText('');
        } catch (error) {
            console.error('Error adding note:', error);
        }
        setIsSavingNote(false);
    };

    const handleDeleteNote = async (requestId: string, noteId: string) => {
        const req = requests.find(r => r.id === requestId);
        if (!req) return;
        const updated = (req.notes || []).filter((n: any) => n.id !== noteId);
        try {
            await updateDoc(doc(db, 'requests', requestId), { notes: updated });
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleCompleteWithGroup = async (req: any) => {
        await updateStatus(req.id, 'completed', req);
        if (assignGroupId) {
            const grp = groups.find(g => g.id === assignGroupId);
            await updateDoc(doc(db, 'requests', req.id), {
                assignedGroupId,
                assignedGroupName: grp?.name || '',
            });
            setAssignGroupId('');
            setShowGroupSelect(false);
        }
    };

    const openInAppChat = async (req: any) => {
        if (!req.email) { alert('Для открытия чата необходим Email пользователя.'); return; }
        try {
            const q = query(collection(db, 'messages'), where('email', '==', req.email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                navigate(`/admin/messages?id=${snapshot.docs[0].id}`);
            } else {
                const docRef = await addDoc(collection(db, 'messages'), {
                    userId: req.userId || null,
                    name: `${req.childSurname} ${req.childName}`,
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Пробная тренировка'}`,
                    message: req.comment || 'Новая заявка через форму на сайте',
                    status: 'new', createdAt: serverTimestamp(),
                    thread: [{
                        text: req.comment || `Новая заявка на программу: ${req.programType || 'Пробная тренировка'}`,
                        sender: 'user', senderName: req.childName, createdAt: Timestamp.now()
                    }]
                });
                navigate(`/admin/messages?id=${docRef.id}`);
            }
        } catch (error) {
            console.error('Error opening chat:', error);
            alert('Ошибка при открытии чата.');
        }
    };

    const handleSendQuickMessage = async () => {
        if (!quickReplyRequest || !quickMessage.trim()) return;
        setIsSendingQuick(true);
        try {
            const req = quickReplyRequest;
            const q = query(collection(db, 'messages'), where('email', '==', req.email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const threadDoc = snapshot.docs[0];
                const existingThread = threadDoc.data().thread || [];
                await updateDoc(doc(db, 'messages', threadDoc.id), {
                    status: 'active', lastMessageAt: serverTimestamp(),
                    thread: [...existingThread, { text: quickMessage, sender: 'admin', senderName: 'Администратор', createdAt: Timestamp.now() }]
                });
            } else {
                await addDoc(collection(db, 'messages'), {
                    userId: req.userId || null,
                    name: `${req.childSurname} ${req.childName}`,
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Пробная тренировка'}`,
                    status: 'active', createdAt: serverTimestamp(), lastMessageAt: serverTimestamp(),
                    thread: [
                        { text: req.comment || `Новая заявка на программу: ${req.programType || 'Пробная тренировка'}`, sender: 'user', senderName: req.childName, createdAt: Timestamp.now() },
                        { text: quickMessage, sender: 'admin', senderName: 'Администратор', createdAt: Timestamp.now() }
                    ]
                });
            }
            setQuickMessage('');
            setQuickReplyRequest(null);
            alert('Сообщение отправлено!');
        } catch (error) {
            console.error('Error sending quick message:', error);
            alert('Ошибка при отправке.');
        }
        setIsSendingQuick(false);
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
        const hoursDiff = (Date.now() - req.createdAt.seconds * 1000) / (1000 * 60 * 60);
        return hoursDiff > 24;
    };

    const columns = [
        { id: 'new', title: 'Новые', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { id: 'contacted', title: 'В работе', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { id: 'completed', title: 'Завершены', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { id: 'rejected', title: 'Отклонены', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Завершен';
            case 'contacted': return 'В работе';
            case 'rejected': return 'Отклонен';
            default: return 'Новый';
        }
    };

    // Direction badge helper
    const getDirectionBadge = (req: any) => {
        if (req.isMembership) {
            const isPaid = req.paymentMethod === 'cash';
            return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider ${isPaid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                    <span>{isPaid ? '🟢' : '🟡'}</span>
                    {req.programType || 'Абонемент'}
                    {req.price ? <span className="opacity-70 font-black ml-1">• {req.price.toLocaleString('ru-RU')} ₽</span> : null}
                </span>
            );
        }
        if (req.programType === 'Smart Match') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider">
                    🔵 Smart Match
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
                🟡 Пробное занятие
            </span>
        );
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
                        <button onClick={() => setActiveTypeFilter('all')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTypeFilter === 'all' ? 'bg-sparta-gold text-black' : 'text-white/40'}`}>Все</button>
                        <button onClick={() => setActiveTypeFilter('smart')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTypeFilter === 'smart' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'text-white/40'}`}>Smart Match</button>
                        <button onClick={() => setActiveTypeFilter('trial')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTypeFilter === 'trial' ? 'bg-sparta-gold/20 text-sparta-gold' : 'text-white/40'}`}>Пробные</button>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 relative">
                <div className="flex gap-6 h-full min-w-max pb-4">
                    {columns.map(column => {
                        const columnRequests = filteredRequests.filter(req => (req.status || 'new') === column.id);

                        return (
                            <div key={column.id} className="w-[340px] flex flex-col bg-white/[0.02] rounded-[2rem] border border-white/5 h-full overflow-hidden backdrop-blur-sm relative">
                                {/* Column top accent line */}
                                <div className={`absolute top-0 inset-x-0 h-[2px] rounded-t-[2rem] ${
                                    column.id === 'new' ? 'bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent' :
                                    column.id === 'contacted' ? 'bg-gradient-to-r from-transparent via-blue-500/60 to-transparent' :
                                    column.id === 'completed' ? 'bg-gradient-to-r from-transparent via-green-500/60 to-transparent' :
                                    'bg-gradient-to-r from-transparent via-red-500/40 to-transparent'
                                }`} />

                                {/* Column Header */}
                                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                                            column.id === 'new' ? 'bg-yellow-500' :
                                            column.id === 'contacted' ? 'bg-blue-500' :
                                            column.id === 'completed' ? 'bg-green-500' : 'bg-red-400'
                                        }`} />
                                        <h3 className={`font-russo uppercase tracking-wider text-sm ${column.color}`}>{column.title}</h3>
                                    </div>
                                    <span className="bg-white/5 text-white/40 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5">
                                        {columnRequests.length}
                                    </span>
                                </div>

                                {/* Column Cards */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {columnRequests.map(req => (
                                        <motion.div
                                            layoutId={req.id}
                                            key={req.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`group/card relative bg-white/5 border rounded-2xl p-4 cursor-pointer hover:bg-white/[0.08] hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 ${
                                                isUrgent(req)
                                                    ? 'ring-2 ring-red-500/30 border-red-500/30 bg-red-500/[0.02] hover:border-red-500/50'
                                                    : 'border-white/10 hover:border-sparta-gold/30'
                                            }`}
                                            onClick={() => { setSelectedRequestId(req.id); setIsSidePanelOpen(true); }}
                                        >
                                            {/* Urgent badge */}
                                            {isUrgent(req) && (
                                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse z-20">СРОЧНО</div>
                                            )}

                                            {/* Left accent line */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-sparta-gold/30 rounded-r-full group-hover/card:bg-sparta-gold transition-colors" />

                                            {/* ─── Card Header ─── */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    {/* Name + age badge */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-white font-bold font-russo tracking-wide text-[14px] group-hover/card:text-sparta-gold transition-colors leading-tight">
                                                            {req.childSurname || ''} {req.childName || 'Без имени'}
                                                        </h4>
                                                        {req.childAge && (
                                                            <span className="text-white/40 text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                                                                {req.childAge} лет
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Date */}
                                                    <div className="flex items-center gap-1 text-[10px] text-white/30 mt-1">
                                                        <Calendar size={9} />
                                                        <span>{req.createdAt?.seconds ? format(new Date(req.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru }) : '—'}</span>
                                                    </div>
                                                </div>

                                                {/* ••• Menu */}
                                                <div className="relative" ref={openMenuId === req.id ? menuRef : undefined}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === req.id ? null : req.id); }}
                                                        className="p-1.5 text-white/20 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                    >
                                                        <MoreVertical size={15} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {openMenuId === req.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                                                                transition={{ duration: 0.12 }}
                                                                className="absolute right-0 top-8 z-30 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl w-48 overflow-hidden"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <button
                                                                    onClick={() => { setRejectTarget(req); setOpenMenuId(null); }}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/60 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                                                                >
                                                                    <AlertCircle size={14} />
                                                                    Отклонить заявку
                                                                </button>
                                                                <div className="border-t border-white/5" />
                                                                <button
                                                                    onClick={() => handleDelete(req.id)}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Удалить заявку
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* ─── Contact block ─── */}
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-7 h-7 rounded-lg bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center shrink-0">
                                                    <Phone size={12} className="text-sparta-gold" />
                                                </div>
                                                <a
                                                    href={`tel:${req.parentPhone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="font-mono text-xs text-white/80 hover:text-sparta-gold transition-colors underline-offset-2 hover:underline"
                                                >
                                                    {req.parentPhone || '—'}
                                                </a>
                                                {req.email && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openInAppChat(req); }}
                                                        className="ml-auto text-sparta-gold/70 hover:text-sparta-gold transition-colors p-1.5 hover:bg-sparta-gold/10 rounded-lg"
                                                        title="Написать в чате Спарты"
                                                    >
                                                        <MessageSquare size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* ─── Direction badge ─── */}
                                            <div className="mb-3">
                                                {getDirectionBadge(req)}
                                            </div>

                                            {/* Admin note preview */}
                                            {req.adminNotes && (
                                                <div className="flex gap-2 items-start bg-yellow-500/5 p-2 rounded-lg border-l-2 border-yellow-500/30 mb-3">
                                                    <Info size={11} className="text-yellow-500 mt-0.5 shrink-0" />
                                                    <p className="text-[10px] text-yellow-500/70 line-clamp-1 italic">{req.adminNotes}</p>
                                                </div>
                                            )}

                                            {/* ─── Column CTA ─── */}
                                            <div className="pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                                                {/* NEW: single prominent CTA */}
                                                {(req.status === 'new' || !req.status) && (
                                                    <button
                                                        onClick={() => updateStatus(req.id, 'contacted', req)}
                                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-sparta-gold text-black font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all active:scale-[0.98]"
                                                    >
                                                        <Zap size={14} />
                                                        Взять в работу
                                                    </button>
                                                )}

                                                {/* CONTACTED: two CTAs */}
                                                {req.status === 'contacted' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setSelectedRequestId(req.id); setIsSidePanelOpen(true); }}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            <CalendarPlus size={12} />
                                                            Назначить
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(req.id, 'completed', req)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            <CheckCheck size={12} />
                                                            Зачислить
                                                        </button>
                                                    </div>
                                                )}

                                                {/* COMPLETED: static badge */}
                                                {req.status === 'completed' && (
                                                    <div className="flex items-center justify-center gap-2 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                        <CheckCircle size={13} className="text-green-500" />
                                                        <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider">Зачислен</span>
                                                    </div>
                                                )}

                                                {/* REJECTED: static badge with reason */}
                                                {req.status === 'rejected' && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-center gap-2 py-2 bg-white/5 border border-white/10 rounded-xl">
                                                            <AlertCircle size={13} className="text-white/30" />
                                                            <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider">Отклонён</span>
                                                        </div>
                                                        {req.rejectReason && (
                                                            <p className="text-[9px] text-white/20 text-center italic truncate px-1">{req.rejectReason}</p>
                                                        )}
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
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                Side Panel (Detail View)
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {isSidePanelOpen && selectedRequest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsSidePanelOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            className="fixed right-0 top-0 h-screen w-full max-w-lg bg-[#0d0d0d] border-l border-white/10 z-[70] shadow-2xl overflow-y-auto custom-scrollbar"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl ${columns.find(c => c.id === (selectedRequest.status || 'new'))?.bg || 'bg-white/10'}`}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-russo text-white">{selectedRequest.childSurname} {selectedRequest.childName}</h2>
                                            <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                (selectedRequest.status || 'new') === 'new'  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                                selectedRequest.status === 'contacted'       ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                selectedRequest.status === 'completed'       ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                                                                               'bg-white/5 border-white/10 text-white/30'
                                            }`}>
                                                {(selectedRequest.status || 'new') === 'new'  ? '🟡 Новая заявка' :
                                                 selectedRequest.status === 'contacted'       ? '🔵 В работе' :
                                                 selectedRequest.status === 'completed'       ? '🟢 Завершена' : '⚫ Отклонена'}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsSidePanelOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                                        <X size={20} className="text-white/20 group-hover:text-white" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* ─── Status Stepper ─── */}
                                    <div className="space-y-3">
                                        {/* 3-step bar */}
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'new',       label: '🟡 Новая',   activeClass: 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_16px_rgba(234,179,8,0.35)]' },
                                                { id: 'contacted', label: '🔵 В работе', activeClass: 'bg-blue-500 text-white border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.35)]' },
                                                { id: 'completed', label: '🟢 Зачислен', activeClass: 'bg-green-500 text-white border-green-500 shadow-[0_0_16px_rgba(34,197,94,0.35)]' },
                                            ].map(step => {
                                                const curStatus = selectedRequest.status || 'new';
                                                const isActive = curStatus === step.id;
                                                return (
                                                    <button
                                                        key={step.id}
                                                        onClick={() => {
                                                            if (step.id === 'completed') {
                                                                setShowGroupSelect(s => !s);
                                                                handleCompleteWithGroup(selectedRequest);
                                                            } else {
                                                                updateStatus(selectedRequest.id, step.id, selectedRequest);
                                                            }
                                                        }}
                                                        className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide rounded-xl border transition-all ${
                                                            isActive
                                                                ? step.activeClass
                                                                : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20 hover:text-white/60'
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Group selector — shown when completed */}
                                        {(selectedRequest.status === 'completed' || showGroupSelect) && (
                                            <div className="flex gap-2 items-center">
                                                <select
                                                    value={assignGroupId}
                                                    onChange={e => setAssignGroupId(e.target.value)}
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sparta-gold transition-all"
                                                >
                                                    <option value="">— Привязать к группе —</option>
                                                    {groups.map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                                {assignGroupId && (
                                                    <button
                                                        onClick={() => handleCompleteWithGroup(selectedRequest)}
                                                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 rounded-xl text-xs font-bold uppercase transition-all"
                                                    >
                                                        Привязать
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {selectedRequest.assignedGroupName && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/15 rounded-xl">
                                                <CheckCircle size={13} className="text-green-500 shrink-0" />
                                                <span className="text-green-400 text-xs font-bold">{selectedRequest.assignedGroupName}</span>
                                            </div>
                                        )}

                                        {/* Chat button */}
                                        {selectedRequest.email && (
                                            <button
                                                onClick={() => openInAppChat(selectedRequest)}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-sparta-gold/8 hover:bg-sparta-gold/15 text-sparta-gold border border-sparta-gold/20 font-bold rounded-2xl transition-all text-sm uppercase tracking-wider"
                                            >
                                                <MessageSquare size={15} /> Написать в чате Спарты
                                            </button>
                                        )}

                                        {/* Reject link */}
                                        {(selectedRequest.status !== 'rejected' && selectedRequest.status !== 'completed') && (
                                            <button
                                                onClick={() => { setRejectTarget(selectedRequest); setIsSidePanelOpen(false); }}
                                                className="w-full text-center text-xs text-white/20 hover:text-red-400 transition-colors py-1 font-medium tracking-wider"
                                            >
                                                Отклонить заявку
                                            </button>
                                        )}
                                    </div>

                                    {/* ─── Client Info (compact) ─── */}
                                    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-5 space-y-4">

                                        {/* Телефон */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center shrink-0">
                                                <Phone size={15} className="text-sparta-gold" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{selectedRequest.parentName || 'Телефон родителя'}</div>
                                                <a href={`tel:${selectedRequest.parentPhone}`}
                                                    className="font-bold text-white hover:text-sparta-gold transition-colors underline-offset-2 hover:underline text-sm">
                                                    {selectedRequest.parentPhone || '—'}
                                                </a>
                                            </div>
                                        </div>

                                        {/* Email (если есть) */}
                                        {selectedRequest.email && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                    <Mail size={15} className="text-white/40" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Email</div>
                                                    <div className="text-white text-sm font-medium">{selectedRequest.email}</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Направление */}
                                        <div className="border-t border-white/5 pt-4">
                                            {getDirectionBadge(selectedRequest)}
                                            {selectedRequest.sports && selectedRequest.sports.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {selectedRequest.sports.map((s: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-1 bg-sparta-gold/8 text-sparta-gold border border-sparta-gold/15 rounded-lg text-[10px] font-bold uppercase tracking-wider">{s}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Возраст + Дата */}
                                        <div className="flex gap-4 border-t border-white/5 pt-4">
                                            <div className="flex-1">
                                                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Возраст</div>
                                                <div className="text-white font-bold text-sm">{selectedRequest.childAge ? `${selectedRequest.childAge} лет` : '—'}</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Дата заявки</div>
                                                <div className="text-white font-bold text-sm">
                                                    {selectedRequest.createdAt?.seconds ? format(new Date(selectedRequest.createdAt.seconds * 1000), 'd MMM yyyy HH:mm', { locale: ru }) : '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Комментарий родителя */}
                                        {selectedRequest.comment && (
                                            <div className="border-t border-white/5 pt-4">
                                                <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Комментарий</div>
                                                <div className="p-3 bg-black/30 rounded-xl text-white/70 italic text-sm leading-relaxed border border-white/5">
                                                    "{selectedRequest.comment}"
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Smart Match 2.0 deep profile */}
                                    {selectedRequest.programType === 'Smart Match 2.0' && (
                                        <div className="bg-white/5 border border-white/5 rounded-[2rem] p-5">
                                            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Zap size={14} /> Глубокий профиль (Smart Match 2.0)
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-5">
                                                <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Темперамент</div>
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
                                                <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-2">Опыт</div>
                                                    <div className="text-sm font-bold text-white uppercase tracking-tight">
                                                        {selectedRequest.experience || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-3">Оценка навыков</div>
                                                {[
                                                    { id: 'speed', label: 'Скорость', color: 'bg-blue-500' },
                                                    { id: 'technique', label: 'Техника', color: 'bg-green-500' },
                                                    { id: 'discipline', label: 'Дисциплина', color: 'bg-purple-500' }
                                                ].map(skill => (
                                                    <div key={skill.id} className="space-y-1.5 mb-3">
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

                                    {/* Admin notes */}
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
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Reject Reason Modal
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {rejectTarget && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 16 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] p-8 z-[90] shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-russo text-white">Причина отказа</h3>
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">
                                        {rejectTarget.childSurname} {rejectTarget.childName}
                                    </p>
                                </div>
                                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                                    className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Preset reasons */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {REJECT_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setRejectReason(preset)}
                                        className={`px-3 py-2.5 text-[11px] font-bold rounded-xl text-left transition-all border ${
                                            rejectReason === preset
                                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>

                            {/* Custom reason */}
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Или укажите другую причину..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500/40 min-h-[80px] transition-all mb-5 resize-none"
                            />

                            {/* Confirm button */}
                            <button
                                onClick={handleReject}
                                disabled={isRejecting}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 font-bold rounded-xl transition-all disabled:opacity-50 text-sm uppercase tracking-wider"
                            >
                                {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                                Подтвердить отказ
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Quick Reply Modal
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {quickReplyRequest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                                    <button onClick={() => setQuickMessage('Добрый день! Оставили заявку на нашем сайте. Удобно ли вам сейчас пообщаться?')}
                                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] rounded-lg transition-all">
                                        Приветствие
                                    </button>
                                    <button onClick={() => setQuickMessage('Здравствуйте! Заявка одобрена, ждем вас на пробную тренировку в субботу.')}
                                        className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] rounded-lg transition-all">
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
