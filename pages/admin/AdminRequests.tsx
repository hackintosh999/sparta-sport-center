import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, Timestamp, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    Search, CheckCircle, Phone, Mail, Trash2, User, MessageCircle,
    MessageSquare, Save, Filter, Calendar, Info, MoreVertical, Zap, X, Loader2,
    CalendarPlus, CheckCheck, AlertCircle, ArrowRightLeft, RotateCcw,
    Users, Flame, Sparkles, CheckCircle2, Plus, Clock, PhoneCall, PhoneOff, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const REJECT_PRESETS = [
    'Не подошло время занятий',
    'Дорого / не устроила цена',
    'Не дозвонились',
    'Передумали',
];

const AdminRequests = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
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
    const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    // Enrollment modal state
    const [enrollTarget, setEnrollTarget] = useState<any | null>(null);
    const [enrollGroupId, setEnrollGroupId] = useState('');
    const [enrollDate, setEnrollDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [filterAgeOnly, setFilterAgeOnly] = useState(true);

    // Active status filter tab
    const [activeStatusTab, setActiveStatusTab] = useState<'new' | 'in_progress' | 'completed' | 'all' | 'rejected'>('new');

    // ••• menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState<any | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

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
            const loadedRequests = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((r: any) => !r.isDeleted);
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

    const updateStatus = async (id: string, newStatus: string, requestData?: any) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        try {
            const updatePayload: Record<string, any> = { status: newStatus };
            if (newStatus !== 'rejected') {
                updatePayload.rejectReason = '';
            }
            await updateDoc(doc(db, 'requests', id), updatePayload);
            const req = requestData || requests.find(r => r.id === id);
            if (req?.email) {
                let title = 'Обновление статуса заявки';
                let message = `Статус вашей заявки изменен на: ${getStatusLabel(newStatus)}`;
                if (newStatus === 'completed') {
                    title = 'Заявка завершена';
                    message = 'Ваша заявка успешно обработана. Ждем вас на тренировке!';
                } else if (newStatus === 'rejected') {
                    title = 'Заявка отклонена';
                    message = 'К сожалению, ваша заявка была отклонена. Свяжитесь с нами для уточнения.';
                } else if (newStatus === 'in_progress' || newStatus === 'contacted') {
                    title = 'Заявка в работе';
                    message = 'Администратор взял вашу заявку в работу. Скоро мы с вами свяжемся.';
                }
                await addDoc(collection(db, 'notifications'), {
                    email: req.email, title, message,
                    type: 'request', isRead: false,
                    createdAt: new Date(), relatedId: id
                });
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = (id: string, reqObj?: any) => {
        const target = reqObj || requests.find(r => r.id === id) || { id };
        setDeleteTarget(target);
        setOpenMenuId(null);
        setIsSidePanelOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        const targetId = deleteTarget.id;
        setIsDeleting(true);

        // 1. Optimistic instant UI update
        setRequests(prev => prev.filter(r => r.id !== targetId));
        if (selectedRequestId === targetId) {
            setSelectedRequestId(null);
            setIsSidePanelOpen(false);
        }

        try {
            console.log(`[AdminRequests] Deleting request ${targetId} from Firestore...`);
            await deleteDoc(doc(db, 'requests', targetId));
            console.log(`[AdminRequests] Successfully deleted request ${targetId}`);
            showToast('Заявка успешно удалена');
            setDeleteTarget(null);
        } catch (error) {
            console.error('[AdminRequests] Error deleting request from Firestore:', error);
            // Fallback: Attempt soft-delete if deleteDoc fails due to security rules
            try {
                console.log(`[AdminRequests] Attempting soft delete for ${targetId}...`);
                await updateDoc(doc(db, 'requests', targetId), {
                    isDeleted: true,
                    deletedAt: serverTimestamp(),
                });
                console.log(`[AdminRequests] Soft delete succeeded for ${targetId}`);
                showToast('Заявка удалена');
                setDeleteTarget(null);
            } catch (fallbackError) {
                console.error('[AdminRequests] Soft delete fallback also failed:', fallbackError);
                showToast('Ошибка при удалении заявки');
                // Re-fetch to restore state if deletion failed entirely
                const snap = await getDocs(collection(db, 'requests'));
                setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => !r.isDeleted));
                setDeleteTarget(null);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectTarget) return;
        setIsRejecting(true);
        setRequests(prev => prev.map(r => r.id === rejectTarget.id ? { ...r, status: 'rejected', rejectReason: rejectReason || 'Не указана' } : r));
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

    const handleAddNote = async (requestId: string, textToAdd?: string, noteType: 'comment' | 'call' = 'comment') => {
        const text = (textToAdd !== undefined ? textToAdd : newNoteText).trim();
        if (!text) return;
        setIsSavingNote(true);
        try {
            const authorName = userProfile?.name || auth.currentUser?.displayName || 'Администратор';
            const note = {
                id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                text,
                createdAt: Timestamp.now(),
                authorName,
                type: noteType,
            };
            await updateDoc(doc(db, 'requests', requestId), {
                notes: arrayUnion(note),
                adminNotes: text,
            });
            setRequests(prev => prev.map(r => r.id === requestId ? {
                ...r,
                notes: [...(r.notes || []), note],
                adminNotes: text,
            } : r));
            if (textToAdd === undefined) {
                setNewNoteText('');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Не удалось сохранить заметку.');
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleDeleteNote = async (requestId: string, noteId: string, noteText?: string) => {
        const req = requests.find(r => r.id === requestId);
        if (!req) return;

        // 1. Filter out from notes array
        const updatedNotes = (req.notes || []).filter((n: any) => n.id !== noteId && (noteText ? n.text !== noteText : true));

        // 2. Check if adminNotes should be updated or cleared
        const lastRemainingText = updatedNotes.length > 0 ? updatedNotes[updatedNotes.length - 1].text : '';
        const shouldClearAdminNotes = noteId === 'legacy_admin_note' || req.adminNotes === noteText || updatedNotes.length === 0;
        const newAdminNotes = shouldClearAdminNotes ? lastRemainingText : (req.adminNotes || '');

        // Optimistic UI update
        setRequests(prev => prev.map(r => r.id === requestId ? {
            ...r,
            notes: updatedNotes,
            adminNotes: newAdminNotes,
        } : r));

        try {
            const updatePayload: Record<string, any> = {
                notes: updatedNotes,
                adminNotes: newAdminNotes,
            };
            await updateDoc(doc(db, 'requests', requestId), updatePayload);
            showToast('Заметка удалена');
        } catch (error) {
            console.error('Error deleting note:', error);
            showToast('Ошибка при удалении заметки');
        }
    };

    const formatNoteTime = (createdAt: any) => {
        if (!createdAt) return 'Недавно';
        let date: Date;
        if (createdAt?.seconds) {
            date = new Date(createdAt.seconds * 1000);
        } else if (typeof createdAt === 'number') {
            date = new Date(createdAt);
        } else if (typeof createdAt === 'string') {
            date = new Date(createdAt);
        } else {
            return 'Недавно';
        }
        if (isNaN(date.getTime())) return 'Недавно';

        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (60 * 1000));
        if (diffMinutes < 1) return 'Только что';
        if (diffMinutes < 60) return `${diffMinutes} мин назад`;

        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return `Сегодня в ${format(date, 'HH:mm')}`;
        if (isYesterday) return `Вчера в ${format(date, 'HH:mm')}`;
        return format(date, 'd MMM в HH:mm', { locale: ru });
    };

    const handleOpenEnroll = (req: any) => {
        setEnrollTarget(req);
        const suggested = getSuggestedGroup(req.childAge);
        const matchG = groups.find(g => g.name === suggested?.name);
        setEnrollGroupId(matchG ? matchG.id : (req.assignedGroupId || (groups[0]?.id || '')));
        setEnrollDate(req.firstLessonDate || format(new Date(), 'yyyy-MM-dd'));
        setFilterAgeOnly(true);
    };

    const getFilteredEnrollGroups = () => {
        if (!enrollTarget || !filterAgeOnly || !enrollTarget.childAge) {
            return groups;
        }
        const ageNum = parseInt(enrollTarget.childAge, 10);
        if (isNaN(ageNum)) return groups;

        const filtered = groups.filter(g => {
            const min = g.ageRange?.min ?? (g.minAge ? parseInt(g.minAge, 10) : 0);
            const max = g.ageRange?.max ?? (g.maxAge ? parseInt(g.maxAge, 10) : 99);
            return ageNum >= min && ageNum <= max;
        });

        return filtered.length > 0 ? filtered : groups;
    };

    const handleConfirmEnroll = async () => {
        if (!enrollTarget) return;
        if (!enrollGroupId) {
            alert('Пожалуйста, выберите группу для зачисления.');
            return;
        }
        setIsEnrolling(true);
        try {
            const grp = groups.find(g => g.id === enrollGroupId);
            const groupName = grp?.name || 'Футбольная секция «Спарта»';
            const formattedDate = enrollDate
                ? format(new Date(enrollDate), 'd MMMM yyyy', { locale: ru })
                : 'в ближайшие дни';

            const authorName = userProfile?.name || auth.currentUser?.displayName || 'Администратор';
            const enrollNote = {
                id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                text: `Зачислен в группу «${groupName}». Дата первого занятия: ${formattedDate}`,
                authorName,
                createdAt: Timestamp.now(),
                type: 'comment' as const,
            };

            // 1. Update Request document
            await updateDoc(doc(db, 'requests', enrollTarget.id), {
                status: 'completed',
                assignedGroupId: enrollGroupId,
                assignedGroupName: groupName,
                firstLessonDate: enrollDate,
                completedAt: serverTimestamp(),
                notes: arrayUnion(enrollNote),
            });

            // 2. Update local state
            setRequests(prev => prev.map(r => r.id === enrollTarget.id ? {
                ...r,
                status: 'completed',
                assignedGroupId: enrollGroupId,
                assignedGroupName: groupName,
                firstLessonDate: enrollDate,
                notes: [...(r.notes || []), enrollNote],
            } : r));

            // 3. Dispatch Notification for Parent
            await addDoc(collection(db, 'notifications'), {
                userId: enrollTarget.userId || null,
                email: enrollTarget.email || null,
                title: 'Поздравляем с зачислением! ⚽',
                message: `Поздравляем! Ваш ребёнок зачислен в группу "${groupName}". Дата первого занятия: ${formattedDate}.`,
                type: 'request',
                link: '/dashboard',
                isRead: false,
                createdAt: serverTimestamp(),
                relatedId: enrollTarget.id,
            });

            // 4. Create or update student record in 'students' collection for coach and attendance
            if (enrollTarget.childName) {
                try {
                    await addDoc(collection(db, 'students'), {
                        name: enrollTarget.childName,
                        childFirstName: enrollTarget.childFirstName || enrollTarget.childName.split(' ')[1] || '',
                        childLastName: enrollTarget.childSurname || enrollTarget.childName.split(' ')[0] || '',
                        childAge: enrollTarget.childAge ? parseInt(enrollTarget.childAge, 10) : 0,
                        groupId: enrollGroupId,
                        groupName: groupName,
                        coachName: grp?.coachName || 'Тренер «Спарта»',
                        parentId: enrollTarget.userId || null,
                        parentName: enrollTarget.parentName || '',
                        parentPhone: enrollTarget.parentPhone || enrollTarget.phone || '',
                        status: 'active',
                        source: 'trial_enrollment',
                        firstLessonDate: enrollDate,
                        createdAt: serverTimestamp(),
                        experienceLevel: enrollTarget.experienceLevel || 'beginner',
                        experienceComment: enrollTarget.experienceComment || enrollTarget.comment || '',
                    });
                } catch (studentErr) {
                    console.warn('Could not auto-create student record in students:', studentErr);
                }
            }

            setEnrollTarget(null);
            setEnrollGroupId('');
        } catch (error) {
            console.error('Error confirming enrollment:', error);
            alert('Ошибка при зачислении в группу.');
        } finally {
            setIsEnrolling(false);
        }
    };

    const handleCompleteWithGroup = async (req: any) => {
        if (!assignGroupId) {
            handleOpenEnroll(req);
            return;
        }
        const grp = groups.find(g => g.id === assignGroupId);
        const groupName = grp?.name || '';
        await updateStatus(req.id, 'completed', req);
        await updateDoc(doc(db, 'requests', req.id), {
            assignedGroupId: assignGroupId,
            assignedGroupName: groupName,
        });
        setRequests(prev => prev.map(r => r.id === req.id ? {
            ...r,
            assignedGroupId: assignGroupId,
            assignedGroupName: groupName,
        } : r));
        setAssignGroupId('');
        setShowGroupSelect(false);
    };

    const openInAppChat = async (req: any) => {
        try {
            // 1. If user is registered and has userId, look up thread with userId
            if (req.userId) {
                const qUser = query(collection(db, 'messages'), where('userId', '==', req.userId));
                const snapUser = await getDocs(qUser);
                if (!snapUser.empty) {
                    navigate(`/admin/messages?id=${snapUser.docs[0].id}`);
                    return;
                }
            }

            // 2. Check if thread exists with email
            if (req.email) {
                const qEmail = query(collection(db, 'messages'), where('email', '==', req.email));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) {
                    navigate(`/admin/messages?id=${snapEmail.docs[0].id}`);
                    return;
                }
            }

            // 3. Check if thread exists with phone
            if (req.parentPhone) {
                const qPhone = query(collection(db, 'messages'), where('phone', '==', req.parentPhone));
                const snapPhone = await getDocs(qPhone);
                if (!snapPhone.empty) {
                    navigate(`/admin/messages?id=${snapPhone.docs[0].id}`);
                    return;
                }
            }

            // 4. If no thread found, create a new dialog in 'messages' collection
            const parentDisplayName = req.parentName 
                ? `${req.parentName} (${req.childSurname || ''} ${req.childName || ''})`.trim()
                : `${req.childSurname || ''} ${req.childName || ''}`.trim() || 'Родитель ученика';

            const userEmail = req.email || `${(req.parentPhone || 'client').replace(/\D/g, '')}@client.sparta.local`;

            const docRef = await addDoc(collection(db, 'messages'), {
                userId: req.userId || null,
                name: parentDisplayName,
                email: userEmail,
                phone: req.parentPhone || '',
                childName: `${req.childSurname || ''} ${req.childName || ''}`.trim(),
                subject: `Заявка: ${req.programType || 'Пробное занятие'}`,
                message: req.comment || 'Заявка с сайта Спарты',
                status: 'new',
                createdAt: serverTimestamp(),
                thread: [{
                    text: req.comment || `Заявка на программу: ${req.programType || 'Пробное занятие'}. Телефон: ${req.parentPhone || '—'}`,
                    sender: 'user',
                    senderName: req.parentName || req.childName || 'Родитель',
                    createdAt: Timestamp.now()
                }]
            });
            navigate(`/admin/messages?id=${docRef.id}`);
        } catch (error) {
            console.error('Error opening chat:', error);
            alert('Ошибка при открытии чата с родителем.');
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

    // Counts for tabs & daily stats
    const newCount = requests.filter(r => (r.status || 'new') === 'new').length;
    const inProgressCount = requests.filter(r => r.status === 'in_progress' || r.status === 'contacted').length;
    const completedCount = requests.filter(r => r.status === 'completed').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;
    const totalCount = requests.length;

    // Daily Stats Calculations
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayStartMs = todayMidnight.getTime();
    const oneWeekAgoMs = todayStartMs - 7 * 24 * 60 * 60 * 1000;

    const newTodayCount = requests.filter(r => {
        const isNew = (r.status || 'new') === 'new';
        const time = r.createdAt?.seconds ? r.createdAt.seconds * 1000 : 0;
        return isNew && time >= todayStartMs;
    }).length;

    const weekTrialsCount = requests.filter(r => {
        const isTrial = !r.isMembership && r.programType !== 'Smart Match';
        const isInWork = r.status === 'in_progress' || r.status === 'contacted';
        const time = r.createdAt?.seconds ? r.createdAt.seconds * 1000 : 0;
        return (isInWork && isTrial) || (isInWork && time >= oneWeekAgoMs);
    }).length || inProgressCount;

    const filteredRequests = requests.filter(req => {
        const s = req.status || 'new';
        const matchesStatus =
            activeStatusTab === 'all' ? true :
            activeStatusTab === 'new' ? s === 'new' :
            activeStatusTab === 'in_progress' ? (s === 'in_progress' || s === 'contacted') :
            activeStatusTab === 'completed' ? s === 'completed' :
            activeStatusTab === 'rejected' ? s === 'rejected' : true;

        const q = searchTerm.toLowerCase().trim();
        const matchesSearch = !q ||
            (req.childName || '').toLowerCase().includes(q) ||
            (req.childSurname || '').toLowerCase().includes(q) ||
            (req.parentName || '').toLowerCase().includes(q) ||
            (req.parentPhone || '').includes(q) ||
            (req.email || '').toLowerCase().includes(q);

        const matchesType = activeTypeFilter === 'all' ||
            (req.programType === 'Smart Match' && activeTypeFilter === 'smart') ||
            (req.isMembership && activeTypeFilter === 'membership') ||
            (!req.isMembership && req.programType !== 'Smart Match' && activeTypeFilter === 'trial');

        return matchesStatus && matchesSearch && matchesType;
    });

    const isUrgent = (req: any) => {
        if (req.status && req.status !== 'new') return false;
        if (!req.createdAt?.seconds) return false;
        const hoursDiff = (Date.now() - req.createdAt.seconds * 1000) / (1000 * 60 * 60);
        return hoursDiff > 24;
    };

    const columns = [
        { id: 'new', title: 'Новые', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { id: 'in_progress', title: 'В работе', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { id: 'completed', title: 'Завершены', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { id: 'rejected', title: 'Отклонены', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Завершен';
            case 'in_progress':
            case 'contacted': return 'В работе';
            case 'rejected': return 'Отклонен';
            default: return 'Новый';
        }
    };

    // Format human-friendly time
    const formatRequestTime = (timestamp: any) => {
        if (!timestamp?.seconds) return 'Только что';
        const date = new Date(timestamp.seconds * 1000);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) {
            return `Сегодня в ${format(date, 'HH:mm')}`;
        }
        if (isYesterday) {
            return `Вчера в ${format(date, 'HH:mm')}`;
        }
        return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
    };

    // Age text helper (e.g. 11 лет, 7 лет, 3 года, 1 год)
    const formatAge = (age: any) => {
        if (!age) return '';
        const num = parseInt(age, 10);
        if (isNaN(num)) return '';
        const lastDigit = num % 10;
        const lastTwoDigits = num % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'лет';
        if (lastDigit === 1) return 'год';
        if (lastDigit >= 2 && lastDigit <= 4) return 'года';
        return 'лет';
    };

    // Helper to find a suggested group based on child age
    const getSuggestedGroup = (childAge: any) => {
        if (!childAge) return null;
        const ageNum = parseInt(childAge, 10);
        if (isNaN(ageNum) || ageNum <= 0) return null;

        // Try to match against actual loaded groups from Firestore
        const matchingGroup = groups.find(g => {
            const min = g.ageRange?.min ?? (g.minAge ? parseInt(g.minAge, 10) : 0);
            const max = g.ageRange?.max ?? (g.maxAge ? parseInt(g.maxAge, 10) : 99);
            return ageNum >= min && ageNum <= max;
        });

        if (matchingGroup) {
            const min = matchingGroup.ageRange?.min ?? matchingGroup.minAge;
            const max = matchingGroup.ageRange?.max ?? matchingGroup.maxAge;
            const ageLabel = min && max ? ` (${min}–${max} лет)` : '';
            const maxSlots = matchingGroup.maxStudents ? parseInt(matchingGroup.maxStudents, 10) : 15;
            const enrolled = Array.isArray(matchingGroup.students) ? matchingGroup.students.length : (matchingGroup.enrolledCount || 8);
            const freeSlots = Math.max(1, maxSlots - enrolled);
            return {
                name: matchingGroup.name,
                ageLabel,
                freeSlots,
            };
        }

        // Intelligent fallback suggestion based on Sparta age cohorts
        if (ageNum >= 3 && ageNum <= 5) {
            return { name: 'Первые шаги (Baby Football)', ageLabel: ' (3–5 лет)', freeSlots: 3 };
        } else if (ageNum >= 6 && ageNum <= 8) {
            return { name: 'Младшая лига «Спарта»', ageLabel: ' (6–8 лет)', freeSlots: 4 };
        } else if (ageNum >= 9 && ageNum <= 11) {
            return { name: 'Средняя лига (2014–2015)', ageLabel: ' (9–11 лет)', freeSlots: 3 };
        } else if (ageNum >= 12 && ageNum <= 16) {
            return { name: 'Старшая юношеская лига', ageLabel: ' (12–16 лет)', freeSlots: 5 };
        }

        return null;
    };

    // Direction badge helper
    const getDirectionBadge = (req: any) => {
        if (req.isMembership) {
            const isPaid = req.paymentMethod === 'cash';
            return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-extrabold uppercase tracking-wider ${isPaid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                    <span>{isPaid ? '🟢' : '🟡'}</span>
                    {req.programType || 'Абонемент'}
                    {req.price ? <span className="opacity-70 font-black ml-1">• {req.price.toLocaleString('ru-RU')} ₽</span> : null}
                </span>
            );
        }
        if (req.programType === 'Smart Match') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 text-[11px] font-extrabold uppercase tracking-wider">
                    🔵 Smart Match 2.0
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-300 text-[11px] font-extrabold uppercase tracking-wider">
                ⚽ Футбол • Пробное занятие
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

    const statusTabs = [
        {
            id: 'new' as const,
            label: 'Новые',
            count: newCount,
            dotColor: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
            activeStyle: 'bg-red-500/15 border-red-500/60 text-red-400 shadow-sm',
            inactiveStyle: 'hover:border-red-500/30 text-white/60 hover:text-white',
        },
        {
            id: 'in_progress' as const,
            label: 'В работе',
            count: inProgressCount,
            dotColor: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]',
            activeStyle: 'bg-yellow-500/15 border-yellow-500/60 text-yellow-400 shadow-sm',
            inactiveStyle: 'hover:border-yellow-500/30 text-white/60 hover:text-white',
        },
        {
            id: 'completed' as const,
            label: 'Зачислены',
            count: completedCount,
            dotColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
            activeStyle: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 shadow-sm',
            inactiveStyle: 'hover:border-emerald-500/30 text-white/60 hover:text-white',
        },
        {
            id: 'all' as const,
            label: 'Все',
            count: totalCount,
            dotColor: 'bg-white/40',
            activeStyle: 'bg-sparta-gold text-black border-sparta-gold shadow-md font-black',
            inactiveStyle: 'hover:border-white/20 text-white/60 hover:text-white',
        },
        {
            id: 'rejected' as const,
            label: 'Отклонены',
            count: rejectedCount,
            dotColor: 'bg-white/20',
            activeStyle: 'bg-white/10 border-white/20 text-white/80',
            inactiveStyle: 'hover:border-white/20 text-white/40 hover:text-white/70',
        },
    ];

    return (
        <div className="min-h-screen pb-24 space-y-5 flex flex-col font-manrope">
            {/* Header: Title + Counter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-russo text-white tracking-tight flex items-center gap-2.5">
                        ЗАЯВКИ
                        {newCount > 0 && (
                            <span className="px-2.5 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black uppercase rounded-full tracking-wider animate-pulse">
                                {newCount} {newCount === 1 ? 'новая' : newCount < 5 ? 'новые' : 'новых'}
                            </span>
                        )}
                    </h1>
                    <span className="text-white/30 text-xs font-medium">Всего: <strong className="text-white/70">{totalCount}</strong></span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                Unified 1-Line Compact Toolbar
            ═══════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-[#121319]/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-lg">
                {/* Left: Status Tabs (Single compact strip) */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar py-0.5">
                    {statusTabs.map(tab => {
                        const isActive = activeStatusTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveStatusTab(tab.id)}
                                className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
                                    isActive
                                        ? tab.activeStyle
                                        : `bg-white/[0.02] border-white/5 ${tab.inactiveStyle}`
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${tab.dotColor}`} />
                                <span>{tab.label}</span>
                                <span className="opacity-30">·</span>
                                <span className={isActive && tab.id === 'all' ? 'text-black font-black' : 'font-extrabold'}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right: Search Input + Compact Direction Selector */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Compact Search Input */}
                    <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={14} />
                        <input
                            type="text"
                            placeholder="Поиск по ФИО, телефону..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-7 py-2 bg-black/60 border border-white/15 hover:border-white/30 focus:border-sparta-gold/70 rounded-xl text-white placeholder-white/40 focus:outline-none text-xs transition-all shadow-inner"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Compact Direction Selector */}
                    <select
                        value={activeTypeFilter}
                        onChange={(e) => setActiveTypeFilter(e.target.value)}
                        className="bg-black/60 border border-white/15 hover:border-white/30 text-white/90 hover:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-sparta-gold/70 transition-all cursor-pointer shrink-0 shadow-inner"
                    >
                        <option value="all" className="bg-[#181a24] text-white">Все направления</option>
                        <option value="trial" className="bg-[#181a24] text-white">⚽ Пробные</option>
                        <option value="smart" className="bg-[#181a24] text-white">🔵 Smart Match</option>
                        <option value="membership" className="bg-[#181a24] text-white">🟢 Абонементы</option>
                    </select>

                    {/* Quick Reset if filters applied */}
                    {(searchTerm || activeTypeFilter !== 'all' || activeStatusTab !== 'new') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setActiveTypeFilter('all');
                                setActiveStatusTab('new');
                            }}
                            title="Сбросить все фильтры"
                            className="p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/15 hover:border-white/30 rounded-xl transition-all cursor-pointer shrink-0"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                Requests List (Balanced, Compact Cards)
            ═══════════════════════════════════════════════ */}
            <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                    activeStatusTab === 'new' && !searchTerm && activeTypeFilter === 'all' ? (
                        <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-6 border border-emerald-500/20 rounded-3xl bg-gradient-to-b from-emerald-500/10 via-emerald-500/[0.02] to-transparent text-center shadow-[0_0_50px_rgba(16,185,129,0.06)]">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-russo text-white mb-2 tracking-wide">
                                Все новые заявки обработаны! Отличная работа 👏
                            </h3>
                            <p className="text-xs sm:text-sm text-white/50 max-w-md leading-relaxed">
                                Входящая очередь полностью чиста. Новые заявки с сайта появятся здесь автоматически в реальном времени.
                            </p>
                            {totalCount > 0 && (
                                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                    {inProgressCount > 0 && (
                                        <button
                                            onClick={() => setActiveStatusTab('in_progress')}
                                            className="px-4 py-2 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span>В работе ({inProgressCount})</span>
                                            <span>→</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setActiveStatusTab('all')}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
                                    >
                                        Посмотреть все заявки ({totalCount})
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-white/20">
                                <Filter size={24} />
                            </div>
                            <h3 className="text-base font-russo text-white/60 mb-1">Заявок не найдено</h3>
                            <p className="text-xs text-white/30 max-w-sm text-center">
                                {searchTerm ? 'По вашему поисковому запросу ничего не найдено.' : 'В этой категории на данный момент нет заявок.'}
                            </p>
                            {(searchTerm || activeTypeFilter !== 'all') && (
                                <button
                                    onClick={() => { setSearchTerm(''); setActiveTypeFilter('all'); }}
                                    className="mt-3 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
                                >
                                    Сбросить фильтры
                                </button>
                            )}
                        </div>
                    )
                ) : (
                    filteredRequests.map((req) => {
                        const reqStatus = req.status || 'new';
                        const urgent = isUrgent(req);
                        const isReqInProgress = reqStatus === 'in_progress' || reqStatus === 'contacted';
                        const isMenuOpen = openMenuId === req.id;
                        const suggestedGroup = getSuggestedGroup(req.childAge);

                        return (
                            <div
                                key={req.id}
                                onClick={() => {
                                    setSelectedRequestId(req.id);
                                    setIsSidePanelOpen(true);
                                }}
                                className={`group relative bg-[#13141b]/95 hover:bg-[#161822] border transition-all duration-200 rounded-2xl p-4 sm:p-5 cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(212,175,55,0.06)] ${
                                    urgent
                                        ? 'border-red-500/40 hover:border-red-500/70 shadow-red-500/5'
                                        : reqStatus === 'new'
                                        ? 'border-sparta-gold/30 hover:border-sparta-gold/60'
                                        : 'border-white/10 hover:border-sparta-gold/30'
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* ─── Left Column: Age + Main Info ─── */}
                                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                                        {/* Age Badge */}
                                        <div className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-sparta-gold/15 to-sparta-gold/5 border border-sparta-gold/30 group-hover:border-sparta-gold/60 transition-all shadow-sm shrink-0">
                                            {req.childAge ? (
                                                <>
                                                    <span className="text-xl sm:text-2xl font-russo text-sparta-gold leading-none">
                                                        {req.childAge}
                                                    </span>
                                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-0.5">
                                                        {formatAge(req.childAge)}
                                                    </span>
                                                </>
                                            ) : (
                                                <User size={22} className="text-sparta-gold/60" />
                                            )}
                                        </div>

                                        {/* Information Stack */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            {/* Line 1: Child Name + Badges */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base sm:text-lg font-russo text-white tracking-wide group-hover:text-sparta-gold transition-colors truncate">
                                                    {req.childSurname ? `${req.childSurname} ${req.childName}` : req.childName || 'Без имени'}
                                                </h3>
                                                {urgent && (
                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-black uppercase rounded-md tracking-wider animate-pulse">
                                                        Срочно &gt;24ч
                                                    </span>
                                                )}
                                                {getDirectionBadge(req)}
                                            </div>

                                            {/* Line 2: Parent Contacts (Phone + Chat + Date) */}
                                            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 text-xs text-white/60">
                                                {req.parentName && (
                                                    <span className="text-white/80 font-medium">
                                                        Родитель: <strong className="text-white">{req.parentName}</strong>
                                                    </span>
                                                )}

                                                {req.parentPhone && (
                                                    <a
                                                        href={`tel:${req.parentPhone}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-600 px-3 py-1 rounded-lg border border-emerald-500/30 transition-all text-xs tracking-wide group/phone shadow-sm"
                                                        title="Позвонить родителю прямо сейчас"
                                                    >
                                                        <PhoneCall size={13} className="text-emerald-400 group-hover/phone:text-white transition-colors shrink-0 animate-pulse" />
                                                        <span>Позвонить: {req.parentPhone}</span>
                                                    </a>
                                                )}

                                                {req.email && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openInAppChat(req);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-sparta-gold hover:text-black text-white/80 border border-white/10 hover:border-sparta-gold/40 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer group/chat"
                                                        title="Написать в чат Спарты"
                                                    >
                                                        <MessageSquare size={13} className="text-sparta-gold group-hover/chat:text-black transition-colors" />
                                                        <span>В чат</span>
                                                    </button>
                                                )}

                                                <span className="text-[11px] text-white/40 flex items-center gap-1">
                                                    <Calendar size={12} className="text-white/30" />
                                                    {formatRequestTime(req.createdAt)}
                                                </span>
                                            </div>

                                            {/* Line 2.5: Experience & Preferred Location Tags */}
                                            {(req.experienceLevel || req.preferredLocation || req.preferredDay) && (
                                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                    {req.experienceLevel && (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${
                                                            req.experienceLevel === 'beginner'
                                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                                : req.experienceLevel === 'active'
                                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                                                : 'bg-red-500/10 border-red-500/30 text-red-300'
                                                        }`}>
                                                            <span>{req.experienceLevel === 'beginner' ? '🟢 Новичок (с нуля)' : req.experienceLevel === 'active' ? '🟡 Любитель' : '🔴 С опытом (1+ год)'}</span>
                                                        </span>
                                                    )}
                                                    {req.preferredLocation && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border bg-white/5 border-white/10 text-white/70 text-[11px] font-medium">
                                                            <MapPin size={11} className="text-sparta-gold shrink-0" />
                                                            <span>{req.preferredLocation}</span>
                                                        </span>
                                                    )}
                                                    {req.preferredDay && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 text-white/50 text-[11px]">
                                                            <span>День: {req.preferredDay}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Line 2.8: Experience Comment */}
                                            {(req.experienceComment || (req.comment && req.comment !== req.programType)) && (
                                                <div className="text-[11px] text-white/70 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 max-w-xl truncate">
                                                    <span className="text-white/40 font-bold mr-1">Опыт/Заметка:</span>
                                                    <span className="italic truncate">"{req.experienceComment || req.comment}"</span>
                                                </div>
                                            )}

                                            {/* Line 3: Smart Group Suggestion */}
                                            {suggestedGroup && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                                                    <span className="text-sparta-gold text-xs leading-none">💡</span>
                                                    <span className="text-white/40">Рекомендуемая группа:</span>
                                                    <span className="font-bold text-sparta-gold">{suggestedGroup.name}{suggestedGroup.ageLabel}</span>
                                                    <span className="text-white/30">•</span>
                                                    <span className="text-emerald-400 font-semibold">
                                                        Свободно {suggestedGroup.freeSlots} {suggestedGroup.freeSlots === 1 ? 'место' : suggestedGroup.freeSlots < 5 ? 'места' : 'мест'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Admin note preview */}
                                            {req.adminNotes && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-yellow-500/80 bg-yellow-500/5 px-2.5 py-1 rounded-lg border-l-2 border-yellow-500/40 max-w-xl truncate">
                                                    <Info size={12} className="shrink-0 text-yellow-500" />
                                                    <span className="truncate italic">{req.adminNotes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ─── Right Column: CTA + Menu ─── */}
                                    <div
                                        className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 shrink-0 self-start md:self-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Primary Action Button */}
                                        {reqStatus === 'new' && (
                                            <button
                                                type="button"
                                                onClick={() => updateStatus(req.id, 'in_progress', req)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-sparta-gold hover:bg-[#ffd700] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                                            >
                                                <Zap size={14} />
                                                <span>Взять в работу</span>
                                            </button>
                                        )}

                                        {isReqInProgress && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRequestId(req.id);
                                                        setIsSidePanelOpen(true);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                                                >
                                                    <CalendarPlus size={13} />
                                                    <span>Назначить</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEnroll(req)}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                                                >
                                                    <CheckCheck size={13} />
                                                    <span>Зачислить</span>
                                                </button>
                                            </div>
                                        )}

                                        {reqStatus === 'completed' && (
                                            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                                                <CheckCircle size={14} className="text-emerald-400" />
                                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                                    {req.assignedGroupName ? req.assignedGroupName : 'Зачислен'}
                                                </span>
                                            </div>
                                        )}

                                        {reqStatus === 'rejected' && (
                                            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                                                <AlertCircle size={14} className="text-red-400" />
                                                <span className="text-red-400 text-xs font-bold uppercase tracking-wider">
                                                    Отклонён
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateStatus(req.id, 'new', req)}
                                                    className="ml-1 text-[10px] text-yellow-400 hover:underline uppercase font-extrabold"
                                                >
                                                    В новые
                                                </button>
                                            </div>
                                        )}

                                        {/* Direct Delete Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(req.id, req);
                                            }}
                                            className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 rounded-xl text-white/40 border border-white/10 transition-all cursor-pointer"
                                            title="Удалить заявку"
                                        >
                                            <Trash2 size={15} />
                                        </button>

                                        {/* Context Menu (•••) */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setOpenMenuId(isMenuOpen ? null : req.id)}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white border border-white/10 transition-all cursor-pointer"
                                                title="Дополнительные действия"
                                            >
                                                <MoreVertical size={15} />
                                            </button>

                                            {isMenuOpen && (
                                                <div
                                                    ref={menuRef}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-[#181a22] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-30 space-y-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenMenuId(null);
                                                            setSelectedRequestId(req.id);
                                                            setIsSidePanelOpen(true);
                                                        }}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 font-medium transition-colors"
                                                    >
                                                        <Info size={14} className="text-sparta-gold" />
                                                        <span>Открыть детали</span>
                                                    </button>

                                                    {reqStatus !== 'new' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuId(null);
                                                                updateStatus(req.id, 'new', req);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-yellow-400 hover:bg-white/5 font-medium transition-colors"
                                                        >
                                                            <RotateCcw size={14} />
                                                            <span>Вернуть в Новые</span>
                                                        </button>
                                                    )}

                                                    {reqStatus !== 'in_progress' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuId(null);
                                                                updateStatus(req.id, 'in_progress', req);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-blue-400 hover:bg-white/5 font-medium transition-colors"
                                                        >
                                                            <ArrowRightLeft size={14} />
                                                            <span>Перевести в работу</span>
                                                        </button>
                                                    )}

                                                    {reqStatus !== 'completed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuId(null);
                                                                handleOpenEnroll(req);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-emerald-400 hover:bg-white/5 font-medium transition-colors"
                                                        >
                                                            <CheckCheck size={14} />
                                                            <span>Зачислить</span>
                                                        </button>
                                                    )}

                                                    {reqStatus !== 'rejected' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOpenMenuId(null);
                                                                setRejectTarget(req);
                                                                setRejectReason('');
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-white/5 font-medium transition-colors"
                                                        >
                                                            <AlertCircle size={14} />
                                                            <span>Отклонить...</span>
                                                        </button>
                                                    )}

                                                    <div className="my-1 border-t border-white/5" />

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(req.id, req)}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 font-medium transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Удалить заявку</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Completion status card when only 1-2 requests remain */}
                {filteredRequests.length > 0 && filteredRequests.length <= 2 && !searchTerm && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.02] to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">
                                    {activeStatusTab === 'new'
                                        ? `Почти чисто! Осталось ${filteredRequests.length === 1 ? 'обработать 1 заявку' : 'обработать 2 заявки'}`
                                        : 'Список актуален и проверен'}
                                </p>
                                <p className="text-white/50 text-xs">
                                    {activeStatusTab === 'new'
                                        ? 'Отличный темп работы 👏 Завершите обработку, чтобы очистить входящую очередь.'
                                        : `В текущем представлении ${filteredRequests.length} ${filteredRequests.length === 1 ? 'запись' : 'записи'}. Всего в базе: ${totalCount}`}
                                </p>
                            </div>
                        </div>
                        {activeStatusTab === 'new' && totalCount > filteredRequests.length && (
                            <button
                                onClick={() => setActiveStatusTab('all')}
                                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white rounded-xl border border-white/10 transition-all font-semibold whitespace-nowrap cursor-pointer text-xs"
                            >
                                Все заявки ({totalCount}) →
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════
                Side Panel (Detail View)
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {isSidePanelOpen && selectedRequest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setIsSidePanelOpen(false);
                                setSelectedRequestId(null);
                            }}
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                            className="admin-backdrop fixed inset-0 z-40 transition-all cursor-pointer"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="fixed right-0 top-0 h-screen w-full max-w-lg bg-[#121318] border-l border-white/10 z-50 shadow-2xl overflow-y-auto custom-scrollbar"
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
                                                (selectedRequest.status === 'in_progress' || selectedRequest.status === 'contacted') ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                selectedRequest.status === 'completed'       ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                                                                               'bg-red-500/10 border-red-500/20 text-red-400'
                                            }`}>
                                                {(selectedRequest.status || 'new') === 'new'  ? '🟡 Новая заявка' :
                                                 (selectedRequest.status === 'in_progress' || selectedRequest.status === 'contacted') ? '🔵 В работе' :
                                                 selectedRequest.status === 'completed'       ? '🟢 Завершена' : '🔴 Отклонена'}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setIsSidePanelOpen(false); setSelectedRequestId(null); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group cursor-pointer">
                                        <X size={20} className="text-white/20 group-hover:text-white" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* ─── Status Stepper in Header ─── */}
                                    <div className="space-y-3">
                                        <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
                                            {[
                                                { id: 'new',         label: '🟡 Новая',     activeClass: 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_16px_rgba(234,179,8,0.35)]' },
                                                { id: 'in_progress', label: '🔵 В работе',  activeClass: 'bg-blue-500 text-white border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.35)]' },
                                                { id: 'completed',   label: '🟢 Завершена', activeClass: 'bg-green-500 text-white border-green-500 shadow-[0_0_16px_rgba(34,197,94,0.35)]' },
                                            ].map(step => {
                                                const curStatus = selectedRequest.status || 'new';
                                                const isActive = step.id === 'in_progress'
                                                    ? (curStatus === 'in_progress' || curStatus === 'contacted')
                                                    : curStatus === step.id;
                                                return (
                                                    <button
                                                        key={step.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (step.id === 'completed') {
                                                                handleOpenEnroll(selectedRequest);
                                                            } else {
                                                                updateStatus(selectedRequest.id, step.id, selectedRequest);
                                                            }
                                                        }}
                                                        className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide rounded-xl border transition-all cursor-pointer ${
                                                            isActive
                                                                ? step.activeClass
                                                                : 'bg-transparent border-transparent text-white/40 hover:bg-white/5 hover:text-white/80'
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Rejected notice */}
                                        {selectedRequest.status === 'rejected' && (
                                            <div className="flex items-center justify-between p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl">
                                                <div className="flex items-center gap-2 text-xs text-red-400 font-bold">
                                                    <AlertCircle size={15} />
                                                    <span>Заявка отклонена{selectedRequest.rejectReason ? `: ${selectedRequest.rejectReason}` : ''}</span>
                                                </div>
                                                <span className="text-[10px] text-white/40">Нажмите статус выше для восстановления</span>
                                            </div>
                                        )}

                                        {/* Group selector — shown when completed or assigned */}
                                        {(selectedRequest.status === 'completed' || selectedRequest.assignedGroupName) && (
                                            <div className="space-y-2 bg-green-500/5 p-3.5 rounded-2xl border border-green-500/20">
                                                <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <CheckCircle size={12} /> Закрепление за группой
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <select
                                                        value={assignGroupId}
                                                        onChange={e => setAssignGroupId(e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-all"
                                                    >
                                                        <option value="">— Привязать к группе —</option>
                                                        {groups.map(g => (
                                                            <option key={g.id} value={g.id}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                    {assignGroupId && (
                                                        <button
                                                            onClick={() => handleCompleteWithGroup(selectedRequest)}
                                                            className="px-4 py-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                                                        >
                                                            Привязать
                                                        </button>
                                                    )}
                                                </div>
                                                {selectedRequest.assignedGroupName && (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/15 rounded-xl mt-2">
                                                        <CheckCircle size={13} className="text-green-500 shrink-0" />
                                                        <span className="text-green-400 text-xs font-bold">{selectedRequest.assignedGroupName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions row: Reject and Delete */}
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                            {selectedRequest.status !== 'rejected' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => { setRejectTarget(selectedRequest); setIsSidePanelOpen(false); }}
                                                    className="text-xs text-white/40 hover:text-orange-400 transition-colors py-1.5 font-medium tracking-wide cursor-pointer"
                                                >
                                                    Отклонить заявку...
                                                </button>
                                            ) : <div />}
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(selectedRequest.id, selectedRequest)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                                            >
                                                <Trash2 size={13} />
                                                <span>Удалить заявку</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ─── Client Info (compact) ─── */}
                                    <div className="bg-white/5 border border-white/5 rounded-[2rem] p-5 space-y-4">

                                        {/* Телефон + Прямая кнопка «Написать в чат» */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-black/40 border border-white/10 rounded-2xl">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <a
                                                    href={`tel:${selectedRequest.parentPhone}`}
                                                    className="w-10 h-10 rounded-xl bg-sparta-gold/10 hover:bg-sparta-gold/25 border border-sparta-gold/30 flex items-center justify-center shrink-0 text-sparta-gold transition-all"
                                                    title="Позвонить родителю"
                                                >
                                                    <Phone size={16} />
                                                </a>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider truncate">
                                                        {selectedRequest.parentName || 'Телефон родителя'}
                                                    </div>
                                                    <a
                                                        href={`tel:${selectedRequest.parentPhone}`}
                                                        className="font-bold text-white hover:text-sparta-gold transition-colors underline-offset-2 hover:underline text-sm truncate block"
                                                    >
                                                        {selectedRequest.parentPhone || '—'}
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Прямая кнопка [ 💬 Написать в чат ] */}
                                            <button
                                                type="button"
                                                onClick={() => openInAppChat(selectedRequest)}
                                                className="px-3.5 py-2.5 bg-gradient-to-r from-sparta-gold/20 to-amber-500/20 hover:from-sparta-gold/30 hover:to-amber-500/30 text-sparta-gold border border-sparta-gold/40 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] active:scale-[0.98] shrink-0"
                                                title="Открыть диалог в мессенджере Спарты"
                                            >
                                                <MessageSquare size={14} />
                                                <span>Написать в чат</span>
                                            </button>
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

                                        {/* Спортивный опыт и филиал */}
                                        {(selectedRequest.experienceLevel || selectedRequest.preferredLocation) && (
                                            <div className="border-t border-white/5 pt-4 space-y-2">
                                                <div className="text-[10px] text-sparta-gold uppercase font-bold tracking-widest">Спортивный опыт и филиал</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedRequest.experienceLevel && (
                                                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white">
                                                            {selectedRequest.experienceLevel === 'beginner' ? '🟢 Новичок (с нуля)' : selectedRequest.experienceLevel === 'active' ? '🟡 Любитель' : '🔴 С опытом (1+ год)'}
                                                        </span>
                                                    )}
                                                    {selectedRequest.preferredLocation && (
                                                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-white/80 flex items-center gap-1">
                                                            <MapPin size={12} className="text-sparta-gold" />
                                                            {selectedRequest.preferredLocation}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

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

                                    {/* ─── Multi-user Chronological Notes Feed ─── */}
                                    <div className="bg-[#101117] border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-xl">
                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-sparta-gold/10 border border-sparta-gold/20 flex items-center justify-center text-sparta-gold">
                                                    <MessageSquare size={14} />
                                                </div>
                                                <span className="text-xs font-russo uppercase tracking-wider text-white">Лента заметок и звонков</span>
                                                <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-bold rounded-full">
                                                    {(selectedRequest.notes?.length || (selectedRequest.adminNotes ? 1 : 0))}
                                                </span>
                                            </div>
                                            {isSavingNote && <Loader2 size={14} className="text-sparta-gold animate-spin" />}
                                        </div>

                                        {/* Quick chips (One click presets) */}
                                        <div className="space-y-1.5">
                                            <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Быстрый статус в 1 клик</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { label: '📵 Не дозвонился', type: 'call' as const, text: '📵 Не дозвонился до родителя' },
                                                    { label: '⏰ Перезвонить', type: 'call' as const, text: '⏰ Просили перезвонить позже' },
                                                    { label: '💬 Думают', type: 'comment' as const, text: '💬 Думают над расписанием / советуются' },
                                                    { label: '🗓 Записан на просмотр', type: 'call' as const, text: '🗓 Договорились о визите на просмотр' },
                                                ].map((chip, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleAddNote(selectedRequest.id, chip.text, chip.type)}
                                                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 hover:border-sparta-gold/40 text-[11px] font-bold transition-all cursor-pointer select-none active:scale-[0.97]"
                                                    >
                                                        {chip.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Chronological list of notes */}
                                        <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                            {(() => {
                                                const notesList: Array<{ id: string, text: string, authorName: string, createdAt: any, type?: 'comment' | 'call' }> = [
                                                    ...(selectedRequest.notes || [])
                                                ];
                                                if (selectedRequest.adminNotes && !notesList.some(n => n.text === selectedRequest.adminNotes)) {
                                                    notesList.unshift({
                                                        id: 'legacy_admin_note',
                                                        text: selectedRequest.adminNotes,
                                                        authorName: 'Заметка администратора',
                                                        createdAt: selectedRequest.createdAt || new Date().toISOString(),
                                                        type: 'comment',
                                                    });
                                                }

                                                if (notesList.length === 0) {
                                                    return (
                                                        <div className="py-6 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                                                            <p className="text-xs text-white/30">Заметок пока нет. Используйте быстрые чипсы выше или поле ввода ниже.</p>
                                                        </div>
                                                    );
                                                }

                                                return notesList.map((note) => {
                                                    const isCall = note.type === 'call' || note.text?.includes('📵') || note.text?.includes('⏰');
                                                    return (
                                                        <div
                                                            key={note.id}
                                                            className={`p-3 rounded-2xl border transition-all text-xs group ${
                                                                isCall
                                                                    ? 'bg-amber-500/5 border-amber-500/20 text-white/90'
                                                                    : 'bg-black/40 border-white/10 text-white/90'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${isCall ? 'bg-amber-400' : 'bg-sparta-gold'}`} />
                                                                    <span className="font-bold text-white text-[11px]">{note.authorName || 'Администратор'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-white/40">{formatNoteTime(note.createdAt)}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteNote(selectedRequest.id, note.id, note.text)}
                                                                        className="opacity-70 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 p-1.5 text-white/30 rounded-lg transition-all cursor-pointer"
                                                                        title="Удалить заметку"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>

                                        {/* Input form */}
                                        <div className="pt-2 border-t border-white/5 space-y-2">
                                            <div className="relative">
                                                <textarea
                                                    value={newNoteText}
                                                    onChange={(e) => setNewNoteText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleAddNote(selectedRequest.id);
                                                        }
                                                    }}
                                                    placeholder="Напишите новую заметку (Enter для отправки)..."
                                                    rows={2}
                                                    className="w-full bg-black/60 border border-white/15 focus:border-sparta-gold/70 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:outline-none transition-all resize-none shadow-inner"
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    disabled={isSavingNote || !newNoteText.trim()}
                                                    onClick={() => handleAddNote(selectedRequest.id)}
                                                    className="px-4 py-2 bg-sparta-gold hover:bg-[#ffd700] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
                                                >
                                                    {isSavingNote ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                                                    <span>Добавить заметку</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Enrollment Modal (Зачисление в группу)
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {enrollTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setEnrollTarget(null); setEnrollGroupId(''); }}
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                            className="admin-backdrop fixed inset-0 cursor-pointer"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative z-10 w-full max-w-lg bg-[#121319] border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                        <CheckCheck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-russo text-white tracking-wide">Зачисление в группу</h3>
                                        <p className="text-white/40 text-xs mt-0.5">
                                            {enrollTarget.childSurname} {enrollTarget.childName}
                                            {enrollTarget.childAge ? ` • ${enrollTarget.childAge} лет` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setEnrollTarget(null); setEnrollGroupId(''); }}
                                    className="p-2 hover:bg-white/5 rounded-xl text-white/30 hover:text-white transition-all cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* Age filter toggle */}
                                {enrollTarget.childAge && (
                                    <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs">
                                        <span className="text-white/70">
                                            Возраст ребёнка: <strong className="text-white">{enrollTarget.childAge} лет</strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setFilterAgeOnly(!filterAgeOnly)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                filterAgeOnly
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-white/10 text-white/50 hover:text-white'
                                            }`}
                                        >
                                            {filterAgeOnly ? '✓ Фильтр по возрасту' : 'Все группы'}
                                        </button>
                                    </div>
                                )}

                                {/* Group Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center justify-between">
                                        <span>Спортивная группа</span>
                                        <span className="text-[10px] text-white/40 lowercase">
                                            {getFilteredEnrollGroups().length} доступно
                                        </span>
                                    </label>
                                    <select
                                        value={enrollGroupId}
                                        onChange={(e) => setEnrollGroupId(e.target.value)}
                                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-500/70 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all cursor-pointer"
                                    >
                                        <option value="" className="bg-[#181a24] text-white/50">— Выберите футбольную группу —</option>
                                        {getFilteredEnrollGroups().map(g => {
                                            const min = g.ageRange?.min ?? g.minAge;
                                            const max = g.ageRange?.max ?? g.maxAge;
                                            const ageStr = min && max ? ` (${min}–${max} лет)` : '';
                                            const coachStr = g.trainerName || g.coachName || g.trainer ? ` • Тренер: ${g.trainerName || g.coachName || g.trainer}` : '';
                                            return (
                                                <option key={g.id} value={g.id} className="bg-[#181a24] text-white">
                                                    {g.name}{ageStr}{coachStr}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Date of First Lesson */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                                        <Calendar size={13} className="text-emerald-400" />
                                        <span>Дата первого посещения / пробного</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={enrollDate}
                                        onChange={(e) => setEnrollDate(e.target.value)}
                                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-500/70 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all cursor-pointer"
                                    />
                                    {/* Quick Date Chips */}
                                    <div className="flex items-center gap-2 pt-1">
                                        {[
                                            { label: 'Сегодня', date: format(new Date(), 'yyyy-MM-dd') },
                                            {
                                                label: 'Завтра',
                                                date: format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
                                            },
                                            {
                                                label: 'В субботу',
                                                date: (() => {
                                                    const d = new Date();
                                                    const day = d.getDay();
                                                    const diff = (6 - day + 7) % 7 || 7;
                                                    d.setDate(d.getDate() + diff);
                                                    return format(d, 'yyyy-MM-dd');
                                                })()
                                            }
                                        ].map(chip => (
                                            <button
                                                key={chip.label}
                                                type="button"
                                                onClick={() => setEnrollDate(chip.date)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                    enrollDate === chip.date
                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                                        : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
                                                }`}
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notification Preview Alert */}
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-white/70 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                        <Sparkles size={14} />
                                        <span>Автоматическое уведомление родителю:</span>
                                    </div>
                                    <p className="text-[11px] text-white/50 leading-relaxed">
                                        Родитель получит уведомление: «Поздравляем! Ваш ребёнок зачислен в группу [{groups.find(g => g.id === enrollGroupId)?.name || '...'}]».
                                    </p>
                                </div>

                                {/* Submit & Cancel Buttons */}
                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setEnrollTarget(null); setEnrollGroupId(''); }}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isEnrolling || !enrollGroupId}
                                        onClick={handleConfirmEnroll}
                                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer active:scale-[0.98]"
                                    >
                                        {isEnrolling ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        <span>Подтвердить зачисление ⚽</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Reject Reason Modal
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {rejectTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                            className="admin-backdrop fixed inset-0 cursor-pointer"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative z-10 w-full max-w-md bg-[#121318] border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl"
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
                                    className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all cursor-pointer">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Preset reasons */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {REJECT_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setRejectReason(preset)}
                                        className={`px-3 py-2.5 text-[11px] font-bold rounded-xl text-left transition-all border cursor-pointer ${
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
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 font-bold rounded-xl transition-all disabled:opacity-50 text-sm uppercase tracking-wider cursor-pointer"
                            >
                                {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                                Подтвердить отказ
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Quick Reply Modal
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {quickReplyRequest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setQuickReplyRequest(null)}
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                            className="admin-backdrop fixed inset-0 cursor-pointer"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative z-10 w-full max-w-md bg-[#121318] border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-russo text-white">Быстрый ответ</h3>
                                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">Кому: {quickReplyRequest.childName}</p>
                                </div>
                                <button onClick={() => setQuickReplyRequest(null)} className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white cursor-pointer">
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
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Delete Confirmation Modal
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {deleteTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isDeleting && setDeleteTarget(null)}
                            style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                            }}
                            className="admin-backdrop fixed inset-0 cursor-pointer"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative z-10 w-full max-w-md bg-[#121318] border border-red-500/30 rounded-[2rem] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(239,68,68,0.25)]"
                        >
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                                    <Trash2 size={22} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg font-russo text-white leading-tight">Удаление заявки</h3>
                                    <p className="text-white/50 text-xs mt-1">
                                        Вы уверены, что хотите удалить заявку? Это действие нельзя отменить.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl mb-6 space-y-1.5">
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>{deleteTarget.childName || deleteTarget.clientName || 'Без имени'}</span>
                                    {deleteTarget.sportType && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-sparta-gold/10 text-sparta-gold border border-sparta-gold/20 font-medium">
                                            {deleteTarget.sportType}
                                        </span>
                                    )}
                                </div>
                                {(deleteTarget.parentPhone || deleteTarget.phone) && (
                                    <div className="text-xs text-white/50">
                                        Телефон: <span className="text-white/80 font-mono font-medium">{deleteTarget.parentPhone || deleteTarget.phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(239,68,68,0.35)] cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {isDeleting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    <span>Удалить</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════
                Toast Notification
            ═══════════════════════════════════════════════ */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-[110] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#181920] border border-white/15 text-white shadow-2xl backdrop-blur-md"
                    >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-xs font-bold pr-2">{toastMessage}</span>
                        <button
                            type="button"
                            onClick={() => setToastMessage(null)}
                            className="text-white/30 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminRequests;
