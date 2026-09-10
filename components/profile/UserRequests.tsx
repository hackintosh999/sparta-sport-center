import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, updateDoc, arrayUnion, or, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { format, isToday, isYesterday, startOfDay, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
    MessageSquare, Send, User, ChevronRight, ChevronDown, Plus, Clock, 
    CheckCircle2, Circle, Search, Paperclip, X, Image as ImageIcon, Smile, 
    Star, Check, CheckCheck, Shield, BadgeCheck, Dumbbell, Code, XCircle, 
    Phone, PhoneCall, Copy, MessageCircle, Mail, Info, ShieldAlert, CreditCard, Upload, 
    Camera, Sparkles, ArrowLeft, Headphones, FileText, Play, Download, RotateCw, ZoomIn, ZoomOut,
    FileSpreadsheet, Volume2, VolumeX, Bell, Mic, Trash2
} from 'lucide-react';
import { QUICK_CATEGORIES, SUPPORT_FAQ } from '../../constants/SupportFAQ';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import SpartaVideoPlayer from '../../components/SpartaVideoPlayer';
import SpartaViewer, { SpartaViewerFile } from '../common/SpartaViewer';
import SpartaAudioPlayer from '../common/SpartaAudioPlayer';
import { useAudioRecorder, formatAudioDuration } from '../../hooks/useAudioRecorder';
import { safeLocalStorage } from '../../utils/storage';
import { playSendSound, playReceiveSound, isSoundMuted, toggleSoundMuted, requestChatNotificationPermission } from '../../utils/soundEffects';

interface MessageHistory {
    text: string;
    sender: 'user' | 'admin' | 'system';
    senderName: string;
    createdAt: Timestamp;
    image?: string;
    attachment?: {
        url: string;
        type: string;
        name: string;
        size?: number;
        duration?: number;
        transcription?: string;
    };
    isRead?: boolean;
    senderRole?: string;
    senderVerification?: any;
    isInternal?: boolean;
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
    typing?: {
        admin?: boolean;
        user?: boolean;
    };
    userId?: string | null;
    email?: string;
    name?: string;
    childId?: string;
    childName?: string;
    childSurname?: string;
    childAge?: string | number;
    parentPhone?: string;
    groupName?: string;
    coachName?: string;
    attachment?: any;
    image?: string;
    type?: 'ticket' | 'trial_request';
    collectionName?: string;
    programType?: string;
    sports?: string[];
    comment?: string;
    history?: {
        status: string;
        timestamp: Timestamp;
        note?: string;
    }[];
    category?: string;
}

type QuickScenario = 'sick_leave' | 'payments' | 'general';

export interface ParsedAttachment {
    url: string;
    name: string;
    type: string;
    size?: number;
    ext: string;
    formattedSize: string;
    isAudio: boolean;
    isImage: boolean;
    isVideo: boolean;
    isDocument: boolean;
    isSpreadsheet: boolean;
    isPdf: boolean;
    duration?: number;
    transcription?: string;
}

export const parseAttachment = (rawAttachment: any, fallbackUrl?: string): ParsedAttachment => {
    let url = '';
    let name = '';
    let type = '';
    let size: number | undefined = undefined;

    if (typeof rawAttachment === 'string') {
        url = rawAttachment.trim();
    } else if (rawAttachment && typeof rawAttachment === 'object') {
        url = (rawAttachment.url || '').trim();
        name = (rawAttachment.name || '').trim();
        type = (rawAttachment.type || '').trim();
        size = typeof rawAttachment.size === 'number' && rawAttachment.size > 0 ? rawAttachment.size : undefined;
    }

    if (!url && fallbackUrl && typeof fallbackUrl === 'string') {
        url = fallbackUrl.trim();
    }

    // Try to extract readable filename from URL if name is generic or missing
    if (!name || name === 'Вложение' || name === 'file' || name === 'blob' || name === 'image') {
        if (url) {
            try {
                const cleanUrl = url.split('?')[0].split('#')[0];
                const lastSegment = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
                if (lastSegment) {
                    const decoded = decodeURIComponent(lastSegment);
                    // Remove leading timestamp prefix like 1741234567_ or 1741234567-
                    const cleanName = decoded.replace(/^\d+[-_]/, '');
                    if (cleanName && cleanName.length > 2) {
                        name = cleanName;
                    }
                }
            } catch {
                // ignore URL decode errors
            }
        }
    }

    // Extract extension from name or url
    let ext = '';
    const cleanUrlPart = url.split('?')[0].split('#')[0];
    const nameOrUrl = (name || cleanUrlPart).toLowerCase();
    const extMatch = nameOrUrl.match(/\.([a-z0-9]+)$/i);
    if (extMatch) {
        ext = extMatch[1].toLowerCase();
    }

    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'heic', 'avif'];
    const videoExtensions = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm', 'weba', 'flac'];
    const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods', 'sheet'];

    // Discern audio vs image vs video vs document
    const isAudio = Boolean(
        (type && (type.startsWith('audio/') || type === 'audio')) ||
        (ext && audioExtensions.includes(ext) && (type?.includes('audio') || name?.toLowerCase().includes('голосовое') || url.includes('voice') || url.includes('audio'))) ||
        name?.toLowerCase().includes('голосовое сообщение')
    );

    const isImage = Boolean(
        !isAudio && (
            (type && type.startsWith('image/')) ||
            imageExtensions.includes(ext)
        )
    );

    const isVideo = Boolean(
        !isImage && !isAudio && (
            (type && type.startsWith('video/')) ||
            videoExtensions.includes(ext)
        )
    );

    const isDocument = Boolean(!isImage && !isVideo && !isAudio && url);
    const isSpreadsheet = spreadsheetExtensions.includes(ext) || type.includes('spreadsheet') || type.includes('excel') || type.includes('csv');
    const isPdf = ext === 'pdf' || type.includes('pdf');

    // Human-readable size or extension badge
    let formattedSize = '';
    if (size && size > 0) {
        if (size >= 1024 * 1024) {
            formattedSize = `${(size / (1024 * 1024)).toFixed(1)} МБ`;
        } else if (size >= 1024) {
            formattedSize = `${Math.round(size / 1024)} КБ`;
        } else {
            formattedSize = `${size} Б`;
        }
    } else if (ext) {
        formattedSize = ext.toUpperCase();
    }

    if (!name) {
        name = isAudio ? 'Голосовое сообщение' : (ext ? `Документ.${ext}` : 'Прикреплённый файл');
    }

    return {
        url,
        name,
        type,
        size,
        ext,
        formattedSize,
        isAudio,
        isImage,
        isVideo,
        isDocument,
        isSpreadsheet,
        isPdf,
        duration: (rawAttachment as any)?.duration,
        transcription: (rawAttachment as any)?.transcription || ''
    };
};

export const PARENT_FAQ = [
    {
        id: 'sick',
        question: 'Как оформить перерасчет или заморозку по больничному?',
        answer: 'Нажмите кнопку «Отправить справку», выберите ребёнка и прикрепите фото или скан медицинской справки. Администратор проверит документ в течение дня и перенесёт пропущенные занятия на следующий период.'
    },
    {
        id: 'balance',
        question: 'Где посмотреть остаток занятий и срок действия абонемента?',
        answer: 'Информация об активном абонементе, дате окончания и количестве оставшихся посещений всегда доступна на главной странице личного кабинета во вкладке «Абонемент».'
    },
    {
        id: 'individual',
        question: 'Как записаться на индивидуальную тренировку или сменить группу?',
        answer: 'Нажмите «Написать администратору» или воспользуйтесь чатом с тренером в личном кабинете. Укажите удобные дни недели и время — мы согласуем расписание с наставником.'
    },
    {
        id: 'lost_found',
        question: 'Что делать, если ребёнок забыл вещь в зале или раздевалке?',
        answer: 'Все забытые вещи бережно собираются на стойке администратора. Напишите нам сообщение с описанием вещи или позвоните по телефону +7 (351) 230-12-69, и мы сразу проверим корзину находок.'
    }
];

interface UserRequestsProps {
    ticketId?: string | null;
    onMobileDetailChange?: (isVisible: boolean) => void;
    activeChild?: any;
}

const UserRequests: React.FC<UserRequestsProps> = ({ ticketId, onMobileDetailChange, activeChild }) => {
    const { user, userProfile } = useAuth();
    const isStaff = ['admin', 'director', 'developer', 'dev'].includes(userProfile?.role || '');
    const [tickets, setTickets] = useState<Ticket[]>([]);

    // Helper: resolve the Firestore collection name for a ticket
    const getCollName = (ticket?: Ticket | null, fallbackId?: string | null): string => {
        if (ticket?.collectionName) return ticket.collectionName;
        if (fallbackId) {
            const found = tickets.find(t => t.id === fallbackId);
            if (found?.collectionName) return found.collectionName;
        }
        return 'messages';
    };

    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    // Auto-select ticket from prop (deep link)
    useEffect(() => {
        if (ticketId) {
            setSelectedTicketId(ticketId);
            setFilterStatus('all');
        }
    }, [ticketId]);

    const [replyText, setReplyText] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audio Voice Recording
    const {
        isRecording,
        recordingDuration,
        formattedDuration,
        startRecording,
        stopRecording,
        cancelRecording
    } = useAudioRecorder();
    const [isSendingVoice, setIsSendingVoice] = useState(false);

    // Quick Scenarios & Creation State
    const [selectedScenario, setSelectedScenario] = useState<QuickScenario>('general');
    const [createAttachment, setCreateAttachment] = useState<{ file: File; preview: string; type: string } | null>(null);
    const [selectedChildForTicket, setSelectedChildForTicket] = useState<any>(activeChild || null);
    const [parentChildren, setParentChildren] = useState<any[]>([]);
    const createFileInputRef = useRef<HTMLInputElement>(null);

    // Interactive rating states (feedback & auto-hide)
    const [ratedSuccessMap, setRatedSuccessMap] = useState<Record<string, boolean>>({});
    const [dismissedRatingMap, setDismissedRatingMap] = useState<Record<string, boolean>>({});

    // Sync mobile active state (hide bottom nav when chatting or creating)
    useEffect(() => {
        const isMobileActive = Boolean(selectedTicketId || isCreating);
        onMobileDetailChange?.(isMobileActive);
    }, [selectedTicketId, isCreating, onMobileDetailChange]);

    // Fetch user's children for quick assignment
    useEffect(() => {
        let isMounted = true;
        const fetchChildren = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, 'students'), where('parentId', '==', user.uid));
                const snap = await getDocs(q);
                if (isMounted && !snap.empty) {
                    const kids = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setParentChildren(kids);
                    if (!selectedChildForTicket && kids.length > 0) {
                        setSelectedChildForTicket(kids[0]);
                    }
                } else if (userProfile?.childName) {
                    const fallbackChild = {
                        childName: userProfile.childName,
                        groupName: userProfile.groupName || '',
                        coachName: userProfile.coachName || ''
                    };
                    if (isMounted) {
                        setParentChildren([fallbackChild]);
                        if (!selectedChildForTicket) setSelectedChildForTicket(fallbackChild);
                    }
                }
            } catch (e) {
                console.error('Error fetching children for user tickets:', e);
            }
        };

        fetchChildren();
        return () => {
            isMounted = false;
        };
    }, [user, userProfile]);

    const openCreateWithScenario = (sc: QuickScenario) => {
        setSelectedScenario(sc);
        setCreateAttachment(null);
        const childName = selectedChildForTicket?.childName || activeChild?.childName || '';
        if (sc === 'sick_leave') {
            setNewSubject(childName ? `Справка о болезни: ${childName}` : 'Справка о болезни');
            setNewMessage('');
        } else if (sc === 'payments') {
            setNewSubject(childName ? `Оплата занятий: ${childName}` : 'Оплата занятий');
            setNewMessage('');
        } else {
            setNewSubject('');
            setNewMessage('');
        }
        setIsCreating(true);
        setSelectedTicketId(null);
    };

    const handleScenarioChange = (sc: QuickScenario) => {
        setSelectedScenario(sc);
        const childName = selectedChildForTicket?.childName || activeChild?.childName || '';
        if (sc === 'sick_leave') {
            setNewSubject(childName ? `Справка о болезни: ${childName}` : 'Справка о болезни');
        } else if (sc === 'payments') {
            setNewSubject(childName ? `Оплата занятий: ${childName}` : 'Оплата занятий');
        } else {
            setNewSubject('');
        }
    };

    const handleChildSelect = (child: any) => {
        setSelectedChildForTicket(child);
        const childName = child?.childName || child?.name || '';
        if (selectedScenario === 'sick_leave') {
            setNewSubject(childName ? `Справка о болезни: ${childName}` : 'Справка о болезни');
        } else if (selectedScenario === 'payments') {
            setNewSubject(childName ? `Оплата занятий: ${childName}` : 'Оплата занятий');
        }
    };

    const handleCreateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            alert('Размер файла не должен превышать 20 МБ');
            return;
        }

        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
        setCreateAttachment({ file, preview, type: file.type });
    };

    // New Features State
    const [searchQuery, setSearchQuery] = useState('');
    const [attachment, setAttachment] = useState<{ file: File, preview: string, type: string } | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [showPhonePopover, setShowPhonePopover] = useState(false);
    const [phoneCopied, setPhoneCopied] = useState(false);
    const phonePopoverRef = useRef<HTMLDivElement>(null);

    const handleCopyPhone = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText('+73512301269').catch(() => {});
        }
        setPhoneCopied(true);
        setTimeout(() => setPhoneCopied(false), 2000);
    };

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');
    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const userTypingTimeoutRef = useRef<any>(null);

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (userTypingTimeoutRef.current) {
                clearTimeout(userTypingTimeoutRef.current);
            }
        };
    }, []);

    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isSupportOnline, setIsSupportOnline] = useState(false);
    const [viewerFile, setViewerFile] = useState<SpartaViewerFile | null>(null);
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
    const [openFaqId, setOpenFaqId] = useState<string | null>('sick');

    // Sound & Notification tracking
    const [soundMuted, setSoundMutedState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return isSoundMuted();
        }
        return false;
    });
    const isInitialMsgsLoadRef = useRef<boolean>(true);
    const isInitialReqsLoadRef = useRef<boolean>(true);
    const threadLengthsRef = useRef<Map<string, number>>(new Map());
    const lastSoundPlayedAtRef = useRef<number>(0);
    const unreadBgCountRef = useRef<number>(0);
    const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : 'Sparta');

    // Reset background unread title when user switches back to tab or focuses window
    useEffect(() => {
        if (typeof document === 'undefined') return;

        if (!originalTitleRef.current && document.title) {
            originalTitleRef.current = document.title;
        }

        const handleFocusOrVisible = () => {
            if (!document.hidden) {
                unreadBgCountRef.current = 0;
                if (originalTitleRef.current) {
                    document.title = originalTitleRef.current;
                }
            }
        };

        document.addEventListener('visibilitychange', handleFocusOrVisible);
        window.addEventListener('focus', handleFocusOrVisible);

        return () => {
            document.removeEventListener('visibilitychange', handleFocusOrVisible);
            window.removeEventListener('focus', handleFocusOrVisible);
        };
    }, []);

    // Live Support Status Listener
    useEffect(() => {
        const staffRoles = ['admin', 'director', 'developer'];
        const q = query(collection(db, 'users'), where('role', 'in', staffRoles));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const oneMinuteAgo = Date.now() - (60 * 1000);
            const isAnyOnline = snapshot.docs.some(doc => {
                const data = doc.data();
                if (data.isOnline === true) return true;
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
        { label: 'Справка принята', text: 'Справка принята в работу. Перерасчет будет выполнен в течение дня.' },
        { label: 'Чек получен', text: 'Оплата получена, спасибо! Абонемент успешно активирован.' },
        { label: 'Спасибо', text: 'Спасибо за обращение! Если возникнут новые вопросы — пишите нам в любое время.' }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Close emoji picker, phone popover, and lightbox when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showEmojiPicker && !(e.target as HTMLElement).closest('.emoji-picker-container')) {
                setShowEmojiPicker(false);
            }
            if (showPhonePopover && phonePopoverRef.current && !phonePopoverRef.current.contains(e.target as Node)) {
                setShowPhonePopover(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewerFile) {
                    setViewerFile(null);
                    return;
                }
                if (showPhonePopover) setShowPhonePopover(false);
                if (showEmojiPicker) setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showEmojiPicker, showPhonePopover, viewerFile]);

    // Restore draft on select ticket
    useEffect(() => {
        if (selectedTicketId) {
            const draft = safeLocalStorage.getItem(`sparta_chat_draft_${selectedTicketId}`);
            if (draft) {
                setReplyText(draft);
            } else {
                setReplyText('');
            }
        }
    }, [selectedTicketId]);

    // Save draft on change
    useEffect(() => {
        if (selectedTicketId) {
            if (replyText.trim()) {
                safeLocalStorage.setItem(`sparta_chat_draft_${selectedTicketId}`, replyText);
            } else {
                safeLocalStorage.removeItem(`sparta_chat_draft_${selectedTicketId}`);
            }
        }
    }, [replyText, selectedTicketId]);

    // Real-time Firestore Listeners: unified messages + requests
    useEffect(() => {
        if (!user) return;

        let q1;
        if (user.email) {
            q1 = query(
                collection(db, "messages"),
                or(
                    where("userId", "==", user.uid),
                    where("email", "==", user.email)
                )
            );
        } else {
            q1 = query(
                collection(db, "messages"),
                where("userId", "==", user.uid)
            );
        }

        const triggerAdminReplyAlert = (adminMsgText: string) => {
            const now = Date.now();
            if (now - lastSoundPlayedAtRef.current > 2000) {
                lastSoundPlayedAtRef.current = now;
                playReceiveSound();
            }

            if (typeof document !== 'undefined' && document.hidden) {
                unreadBgCountRef.current += 1;
                document.title = `🔔 (${unreadBgCountRef.current}) Ответ поддержки · Sparta`;

                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    try {
                        new Notification('Спарта — Новое сообщение от поддержки', {
                            body: adminMsgText ? (adminMsgText.length > 70 ? adminMsgText.slice(0, 70) + '...' : adminMsgText) : 'Администратор ответил на ваше обращение',
                            icon: '/favicon.ico'
                        });
                    } catch {}
                }
            }
        };

        const unsubMsgs = onSnapshot(q1, (snapshot) => {
            const loadedTickets: Ticket[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'ticket',
                collectionName: 'messages'
            } as Ticket));
            updateUnifiedItems(loadedTickets, 'tickets');

            if (isInitialMsgsLoadRef.current) {
                snapshot.docs.forEach(d => {
                    const data = d.data();
                    const thread = data.thread || [];
                    threadLengthsRef.current.set(`messages_${d.id}`, thread.length);
                });
                isInitialMsgsLoadRef.current = false;
            } else {
                let hasNewAdminMessage = false;
                let lastAdminMsgText = '';

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'modified' || change.type === 'added') {
                        const docId = change.doc.id;
                        const data = change.doc.data();
                        const thread = data.thread || [];
                        const currentLen = thread.length;
                        const prevLen = threadLengthsRef.current.get(`messages_${docId}`) ?? 0;
                        threadLengthsRef.current.set(`messages_${docId}`, currentLen);

                        if (currentLen > prevLen) {
                            const newMessages = thread.slice(prevLen);
                            const adminMsg = newMessages.find((m: any) => m.sender === 'admin' || m.sender === 'system');
                            if (adminMsg) {
                                hasNewAdminMessage = true;
                                if (adminMsg.text) lastAdminMsgText = adminMsg.text;
                            }
                        }
                    }
                });

                if (hasNewAdminMessage) {
                    triggerAdminReplyAlert(lastAdminMsgText);
                }
            }
        }, (error) => {
            console.error("Error loading messages:", error);
            setLoading(false);
        });

        const q2 = query(
            collection(db, "requests"),
            where("userId", "==", user.uid)
        );

        const unsubReqs = onSnapshot(q2, (snapshot) => {
            const loadedReqs: Ticket[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'trial_request',
                collectionName: 'requests'
            } as Ticket));
            updateUnifiedItems(loadedReqs, 'requests');

            if (isInitialReqsLoadRef.current) {
                snapshot.docs.forEach(d => {
                    const data = d.data();
                    const thread = data.thread || [];
                    threadLengthsRef.current.set(`requests_${d.id}`, thread.length);
                });
                isInitialReqsLoadRef.current = false;
            } else {
                let hasNewAdminMessage = false;
                let lastAdminMsgText = '';

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'modified' || change.type === 'added') {
                        const docId = change.doc.id;
                        const data = change.doc.data();
                        const thread = data.thread || [];
                        const currentLen = thread.length;
                        const prevLen = threadLengthsRef.current.get(`requests_${docId}`) ?? 0;
                        threadLengthsRef.current.set(`requests_${docId}`, currentLen);

                        if (currentLen > prevLen) {
                            const newMessages = thread.slice(prevLen);
                            const adminMsg = newMessages.find((m: any) => m.sender === 'admin' || m.sender === 'system');
                            if (adminMsg) {
                                hasNewAdminMessage = true;
                                if (adminMsg.text) lastAdminMsgText = adminMsg.text;
                            }
                        }
                    }
                });

                if (hasNewAdminMessage) {
                    triggerAdminReplyAlert(lastAdminMsgText);
                }
            }
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
        if (st) {
            setIsAgentTyping(Boolean(st.isTyping?.admin || st.typing?.admin));
        }
        const coll = st?.collectionName || 'messages';

        const unsubscribe = onSnapshot(doc(db, coll, selectedTicketId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const updatedTicket = { id: docSnapshot.id, ...docSnapshot.data() } as Ticket;

                setTickets((prevTickets) =>
                    prevTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)
                );

                if (updatedTicket.isTyping?.admin || updatedTicket.typing?.admin) {
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

    const handleTyping = (ticketId: string | null) => {
        if (!ticketId) return;
        const ticket = tickets.find(t => t.id === ticketId);
        const coll = getCollName(ticket, ticketId);
        const ticketRef = doc(db, coll, ticketId);

        if (userTypingTimeoutRef.current) {
            clearTimeout(userTypingTimeoutRef.current);
        }

        updateDoc(ticketRef, {
            'isTyping.user': true,
            'typing.user': true
        }).catch(() => { });

        userTypingTimeoutRef.current = setTimeout(() => {
            updateDoc(ticketRef, {
                'isTyping.user': false,
                'typing.user': false
            }).catch(() => { });
            userTypingTimeoutRef.current = null;
        }, 2200);
    };

    const handleEmojiClick = (emoji: string) => {
        setReplyText(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleSendReply = async () => {
        if ((!replyText.trim() && !attachment) || !selectedTicketId) return;

        playSendSound();

        const currentText = replyText;
        const currentAttachment = attachment;

        setReplyText('');
        safeLocalStorage.removeItem(`sparta_chat_draft_${selectedTicketId}`);

        try {
            let uploadedAttachment = null;
            if (currentAttachment) {
                uploadedAttachment = await uploadFile(selectedTicketId, currentAttachment.file);
            }

            const newMessageObj: MessageHistory = {
                text: currentText,
                sender: 'user',
                senderName: user?.displayName || userProfile?.displayName || 'Пользователь',
                createdAt: Timestamp.now(),
                ...(uploadedAttachment && {
                    attachment: uploadedAttachment,
                    ...(uploadedAttachment.type.startsWith('image/') && { image: uploadedAttachment.url })
                })
            };

            const ticket = tickets.find(t => t.id === selectedTicketId);
            const currentColl = getCollName(ticket, selectedTicketId);
            const ticketRef = doc(db, currentColl, selectedTicketId);

            const isResolved = ['resolved', 'completed', 'rejected'].includes(ticket?.status || '');
            const newStatus = isResolved ? 'in_progress' : (ticket?.status || 'in_progress');

            if (userTypingTimeoutRef.current) {
                clearTimeout(userTypingTimeoutRef.current);
                userTypingTimeoutRef.current = null;
            }

            await updateDoc(ticketRef, {
                thread: arrayUnion(newMessageObj),
                status: newStatus,
                isReadByUser: true,
                'isTyping.user': false,
                'typing.user': false
            });

            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(scrollToBottom, 60);

        } catch (error: any) {
            console.error("Full reply error:", error);
            const errorMessage = error?.message || "";
            if (errorMessage.includes("CORS") || errorMessage.includes("Network Error") || errorMessage.includes("Превышено время")) {
                alert("⚠️ Ошибка отправки файла.\\n\\nПожалуйста, повторите попытку или отправьте файл меньшего размера.");
            } else {
                alert(`Ошибка при отправке: ${errorMessage}`);
            }
        } finally {
            setUploadProgress(null);
        }
    };

    const handleSendVoiceReply = async () => {
        if (!selectedTicketId || isSendingVoice) return;
        setIsSendingVoice(true);
        try {
            const recorded = await stopRecording();
            if (!recorded) return;

            playSendSound();

            let uploadedAttachment = null;
            try {
                uploadedAttachment = await uploadFile(selectedTicketId, recorded.file);
            } catch {
                uploadedAttachment = {
                    url: recorded.url,
                    type: recorded.file.type || 'audio/webm',
                    name: recorded.file.name,
                    size: recorded.blob.size
                };
            }

            const newMessageObj: MessageHistory = {
                text: '',
                sender: 'user',
                senderName: user?.displayName || userProfile?.displayName || 'Пользователь',
                createdAt: Timestamp.now(),
                attachment: {
                    url: uploadedAttachment.url,
                    type: 'audio',
                    name: `Голосовое сообщение (${formatAudioDuration(recorded.duration)})`,
                    duration: recorded.duration,
                    size: recorded.blob.size,
                    transcription: recorded.transcription || ''
                }
            };

            const ticket = tickets.find(t => t.id === selectedTicketId);
            const currentColl = getCollName(ticket, selectedTicketId);
            const ticketRef = doc(db, currentColl, selectedTicketId);

            const isResolved = ['resolved', 'completed', 'rejected'].includes(ticket?.status || '');
            const newStatus = isResolved ? 'in_progress' : (ticket?.status || 'in_progress');

            if (userTypingTimeoutRef.current) {
                clearTimeout(userTypingTimeoutRef.current);
                userTypingTimeoutRef.current = null;
            }

            await updateDoc(ticketRef, {
                thread: arrayUnion(newMessageObj),
                status: newStatus,
                isReadByUser: true,
                'isTyping.user': false,
                'typing.user': false
            });

            setTimeout(scrollToBottom, 60);
        } catch (error: any) {
            console.error("Voice reply error:", error);
            alert('Ошибка при отправке голосового сообщения');
        } finally {
            setIsSendingVoice(false);
        }
    };

    const handleCreateTicket = async () => {
        const trimmedMessage = newMessage.trim();
        const trimmedSubject = newSubject.trim();

        let finalMessage = trimmedMessage;
        if (!finalMessage && createAttachment) {
            if (selectedScenario === 'sick_leave') {
                finalMessage = 'Прикреплена медицинская справка о болезни для перерасчёта абонемента.';
            } else if (selectedScenario === 'payments') {
                finalMessage = 'Прикреплен чек об оплате для подтверждения.';
            } else {
                finalMessage = 'Прикреплен файл к обращению.';
            }
        }

        if (!finalMessage) {
            alert('Пожалуйста, введите текст сообщения или прикрепите файл.');
            return;
        }

        const childObj = selectedChildForTicket || activeChild;
        const cName = (childObj?.childName || childObj?.name || userProfile?.childName || '').trim();
        const cId = childObj?.id || null;
        const gName = (childObj?.groupName || userProfile?.groupName || '').trim();
        const cCoach = (childObj?.coachName || userProfile?.coachName || '').trim();
        const parentPhone = (userProfile?.phone || userProfile?.parentPhone || user?.phoneNumber || userProfile?.contactPhone || '').trim();

        const finalSubject = trimmedSubject || (
            selectedScenario === 'sick_leave' ? (cName ? `Справка о болезни: ${cName}` : 'Справка о болезни') :
            selectedScenario === 'payments' ? (cName ? `Оплата занятий: ${cName}` : 'Оплата занятий') :
            'Общее обращение в клуб'
        );

        let uploadedAttachment = null;
        if (createAttachment) {
            try {
                uploadedAttachment = await uploadFile('new_tickets', createAttachment.file);
            } catch (err) {
                alert('Не удалось загрузить файл. Пожалуйста, попробуйте снова.');
                return;
            }
        }

        const newTicketData = {
            userId: user?.uid || null,
            email: user?.email || '',
            name: user?.displayName || userProfile?.displayName || 'Пользователь',
            subject: finalSubject,
            category: selectedScenario,
            childName: cName,
            childId: cId,
            groupName: gName,
            coachName: cCoach,
            parentPhone: parentPhone,
            status: 'new',
            createdAt: Timestamp.now(),
            isReadByUser: true,
            thread: [{
                text: finalMessage,
                sender: 'user',
                senderName: user?.displayName || userProfile?.displayName || 'Пользователь',
                createdAt: Timestamp.now(),
                ...(uploadedAttachment && { attachment: uploadedAttachment })
            }]
        };

        try {
            playSendSound();
            const docRef = await addDoc(collection(db, "messages"), newTicketData);
            setIsCreating(false);
            setCreateAttachment(null);
            setNewSubject('');
            setNewMessage('');
            setSelectedTicketId(docRef.id);
        } catch (e) {
            console.error('Failed to create ticket:', e);
            alert('Ошибка при создании обращения. Пожалуйста, попробуйте снова.');
        }
    };

    // Helper to resolve clean child name (ignoring placeholder words like 'Спортсмен')
    const resolveTicketChildName = (t?: Ticket | null): string => {
        if (!t) return '';
        const rawCandidates = [
            t.childName,
            t.childSurname ? `${t.childName || ''} ${t.childSurname}`.trim() : '',
            (t as any).studentName,
            (t as any).athleteName
        ];

        for (const candidate of rawCandidates) {
            if (candidate && typeof candidate === 'string') {
                const cleaned = candidate.trim();
                const lower = cleaned.toLowerCase();
                if (
                    lower &&
                    lower !== 'спортсмен' &&
                    lower !== 'спортсмен спарта' &&
                    lower !== 'undefined' &&
                    lower !== 'null' &&
                    lower !== 'новый ученик'
                ) {
                    return cleaned;
                }
            }
        }

        // Fallback: check if t.childId matches any child in parentChildren
        if (t.childId && parentChildren.length > 0) {
            const foundChild = parentChildren.find(c => c.id === t.childId);
            if (foundChild) {
                const cName = (foundChild.childName || foundChild.name || '').trim();
                if (cName && !cName.toLowerCase().includes('спортсмен')) {
                    return cName;
                }
            }
        }

        // Fallback: if parent has active child or profile childName
        const profileChild = (activeChild?.childName || activeChild?.name || userProfile?.childName || '').trim();
        if (profileChild && !profileChild.toLowerCase().includes('спортсмен')) {
            return profileChild;
        }

        return '';
    };

    const getDisplaySubject = (t: Ticket) => {
        if (t.type === 'trial_request') return 'Пробная тренировка';

        let subj = (t.subject || '').trim();

        // Strip ugly artifact strings from legacy subjects
        subj = subj
            .replace(/\s*·\s*спортсмен(\s+спарта)?/gi, '')
            .replace(/\s*:\s*спортсмен(\s+спарта)?/gi, '')
            .replace(/\s*-\s*спортсмен(\s+спарта)?/gi, '')
            .replace(/\(спортсмен(\s+спарта)?\)/gi, '')
            .trim();

        if (t.category === 'sick_leave' || subj.toLowerCase().includes('справк') || (t.message && t.message.toLowerCase().includes('справк'))) {
            return 'Справка о болезни';
        }
        if (t.category === 'payments' || subj.toLowerCase().includes('оплат') || (t.message && (t.message.toLowerCase().includes('оплат') || t.message.toLowerCase().includes('чек')))) {
            return 'Вопрос по оплате';
        }

        if (subj && !subj.toLowerCase().includes('обращение в поддержку') && !subj.toLowerCase().includes('спортсмен')) {
            return subj;
        }

        // Check first message for meaningful topic
        const firstMsg = (t.message || (t.thread && t.thread.length > 0 ? t.thread[0].text : '')).trim();
        if (firstMsg) {
            const cleanFirst = firstMsg.replace(/^(здравствуйте|добрый день|привет)[,.\s]*/i, '').trim();
            if (cleanFirst.length > 0 && cleanFirst.length <= 40) {
                return cleanFirst;
            }
            if (cleanFirst.length > 40) {
                return cleanFirst.substring(0, 37) + '...';
            }
        }

        return 'Вопрос администратору';
    };

    const getHeaderTitle = (t: Ticket) => {
        const base = getDisplaySubject(t);
        const childName = resolveTicketChildName(t);

        if (childName) {
            // Check if base already includes child's name
            if (base.toLowerCase().includes(childName.toLowerCase())) {
                return base;
            }
            return `${base} · ${childName}`;
        }

        return base;
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'new':
                return {
                    label: 'В обработке',
                    color: 'text-amber-400',
                    bg: 'bg-amber-400/10 border-amber-400/25 text-amber-300',
                    dot: 'bg-amber-400',
                    icon: Clock
                };
            case 'in_progress':
            case 'contacted':
                return {
                    label: 'В работе',
                    color: 'text-blue-400',
                    bg: 'bg-blue-400/10 border-blue-400/25 text-blue-300',
                    dot: 'bg-blue-400 animate-pulse',
                    icon: Clock
                };
            case 'resolved':
            case 'completed':
                return {
                    label: 'Решено',
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-400/10 border-emerald-400/25 text-emerald-300',
                    dot: 'bg-emerald-400',
                    icon: CheckCircle2
                };
            case 'rejected':
                return {
                    label: 'Отклонено',
                    color: 'text-rose-400',
                    bg: 'bg-rose-400/10 border-rose-400/25 text-rose-300',
                    dot: 'bg-rose-400',
                    icon: XCircle
                };
            default:
                return {
                    label: status || 'В обработке',
                    color: 'text-gray-400',
                    bg: 'bg-white/5 border-white/10 text-white/60',
                    dot: 'bg-gray-400',
                    icon: Circle
                };
        }
    };

    // Robust thread constructor merging initial request, attachments, thread, replies, notes, and resolution events
    const buildTicketThread = (t: Ticket): MessageHistory[] => {
        const rawList: MessageHistory[] = [];

        // 1. Gather array sources: thread, messages, replies
        const existingThread = Array.isArray(t.thread) ? t.thread : [];
        const existingMessages = Array.isArray((t as any).messages) ? (t as any).messages : [];
        const existingReplies = Array.isArray((t as any).replies) ? (t as any).replies : [];
        const combinedReplies = [...existingThread, ...existingMessages, ...existingReplies];

        // 2. Identify initial user message and attachments on root document
        const initialText = (t.message || t.comment || (t as any).text || (t as any).description || '').trim();
        const rawAttachment = t.attachment || (t as any).file || (t as any).fileUrl || null;
        const candidateRootUrl = (t as any).image || (t as any).imageUrl || (t as any).photoUrl || null;

        let initialAttachment: any = null;
        let initialImage: string | undefined = undefined;

        if (rawAttachment || candidateRootUrl) {
            const parsedRoot = parseAttachment(rawAttachment, candidateRootUrl);
            if (parsedRoot.url) {
                initialAttachment = {
                    url: parsedRoot.url,
                    name: parsedRoot.name,
                    type: parsedRoot.type,
                    ...(parsedRoot.size ? { size: parsedRoot.size } : {})
                };
                if (parsedRoot.isImage) {
                    initialImage = parsedRoot.url;
                }
            }
        }

        // Check if initial message is already part of combinedReplies
        const hasInitialInThread = combinedReplies.some(m =>
            m.sender === 'user' &&
            ((initialText && m.text && m.text.trim() === initialText) ||
             (initialAttachment?.url && (m.attachment?.url === initialAttachment.url || m.image === initialAttachment.url)))
        );

        if (!hasInitialInThread && (initialText || initialAttachment || t.category === 'sick_leave' || t.type === 'trial_request')) {
            let defaultText = initialText;
            if (!defaultText) {
                if (t.category === 'sick_leave') defaultText = 'Прикреплена медицинская справка о болезни.';
                else if (t.category === 'payments') defaultText = 'Прикреплен документ об оплате.';
                else if (t.type === 'trial_request') defaultText = 'Заявка на пробную тренировку';
                else defaultText = 'Обращение в службу поддержки';
            }

            rawList.push({
                text: defaultText,
                sender: 'user',
                senderName: t.name || userProfile?.displayName || user?.displayName || 'Родитель',
                createdAt: t.createdAt || Timestamp.now(),
                ...(initialImage ? { image: initialImage } : {}),
                ...(initialAttachment ? { attachment: initialAttachment } : {})
            });
        }

        // 3. Add all combined replies (filtering out internal notes for non-staff)
        combinedReplies.forEach(m => {
            if ((m as any).isInternal && !isStaff) return;
            rawList.push({
                ...m,
                sender: m.sender || 'admin',
                senderName: m.senderName || (m.sender === 'user' ? (t.name || 'Родитель') : 'Служба заботы Sparta'),
                createdAt: m.createdAt || Timestamp.now()
            });
        });

        // 4. Check for adminResponse or reply field on the root document
        const rootAdminResponse = (t as any).adminResponse || (t as any).reply || (t as any).response;
        if (rootAdminResponse && typeof rootAdminResponse === 'string' && rootAdminResponse.trim()) {
            const alreadyIn = rawList.some(m => m.text.trim() === rootAdminResponse.trim());
            if (!alreadyIn) {
                rawList.push({
                    text: rootAdminResponse,
                    sender: 'admin',
                    senderName: 'Служба заботы Sparta',
                    createdAt: (t as any).respondedAt || (t as any).updatedAt || Timestamp.now()
                });
            }
        }

        // 5. Check history or notes for status resolutions or admin notes
        if (Array.isArray((t as any).history)) {
            (t as any).history.forEach((h: any) => {
                if (h.note && typeof h.note === 'string' && h.note.trim()) {
                    const alreadyIn = rawList.some(m => m.text.trim() === h.note.trim());
                    if (!alreadyIn) {
                        rawList.push({
                            text: `ℹ️ ${h.note}`,
                            sender: 'system',
                            senderName: 'Система',
                            createdAt: h.timestamp || Timestamp.now()
                        });
                    }
                }
            });
        }

        // 6. If ticket is resolved/completed, and there are NO admin messages and NO system messages saying it's resolved:
        const isResolved = ['resolved', 'completed'].includes(t.status);
        if (isResolved) {
            const hasResolutionMessage = rawList.some(m =>
                m.sender === 'admin' ||
                m.sender === 'system' ||
                (m.text && (m.text.includes('решено') || m.text.includes('продлен') || m.text.includes('продлён') || m.text.startsWith('✅')))
            );

            if (!hasResolutionMessage) {
                rawList.push({
                    text: t.category === 'sick_leave'
                        ? '✅ Справка проверена администратором. Абонемент успешно продлён.'
                        : '✅ Обращение рассмотрено и успешно решено администратором клуба.',
                    sender: 'system',
                    senderName: 'Служба заботы Sparta',
                    createdAt: (t as any).resolvedAt || (t as any).updatedAt || t.createdAt || Timestamp.now()
                });
            }
        }

        // Sort by createdAt ascending
        rawList.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
            return timeA - timeB;
        });

        return rawList;
    };

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);


    const getLastMessageInfo = (t: Ticket) => {
        const list = buildTicketThread(t);
        if (list.length > 0) {
            const last = list[list.length - 1];
            let date: Date;
            if (last.createdAt?.toDate) date = last.createdAt.toDate();
            else if (last.createdAt?.seconds) date = new Date(last.createdAt.seconds * 1000);
            else date = new Date();

            let previewText = last.text;
            if (!previewText && last.attachment) {
                previewText = last.attachment.type?.startsWith('image/') ? '📷 Фото' : '📎 Файл';
            }
            if (!previewText && last.image) {
                previewText = '📷 Фото';
            }

            return {
                text: previewText || 'Сообщение',
                sender: last.sender,
                date
            };
        }

        let date: Date;
        if (t.createdAt?.toDate) date = t.createdAt.toDate();
        else if (t.createdAt?.seconds) date = new Date(t.createdAt.seconds * 1000);
        else date = new Date();

        return {
            text: 'Новое обращение',
            sender: 'user' as const,
            date
        };
    };

    const formatListDate = (date: Date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Вчера';
        return format(date, 'd MMM', { locale: ru });
    };

    const handleSelectTicket = (id: string) => {
        setSelectedTicketId(id);
        setShowPhonePopover(false);
        setTimeout(scrollToBottom, 60);
    };

    const filteredTickets = tickets.filter(t => {
        const title = getHeaderTitle(t).toLowerCase();
        const lastMsg = getLastMessageInfo(t).text.toLowerCase();
        const q = searchQuery.toLowerCase();
        const matchesSearch = title.includes(q) || lastMsg.includes(q);
        const matchesFilter = filterStatus === 'all'
            ? true
            : filterStatus === 'active'
                ? ['new', 'in_progress', 'contacted'].includes(t.status)
                : ['resolved', 'completed', 'rejected'].includes(t.status);
        return matchesSearch && matchesFilter;
    });

    // Auto-select latest ticket on desktop if none selected
    useEffect(() => {
        if (!selectedTicketId && tickets.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
            setSelectedTicketId(tickets[0].id);
        }
    }, [tickets.length]);

    // Auto-scroll when thread updates
    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.thread, selectedTicketId, isAgentTyping]);

    // Mark as read when opening a ticket with unread admin messages (only when tab is active)
    useEffect(() => {
        if (selectedTicketId && selectedTicket && typeof document !== 'undefined' && !document.hidden) {
            const thread = selectedTicket.thread || [];
            if (thread.length > 0) {
                const lastMsg = thread[thread.length - 1];
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

        // Show instant smooth feedback
        setRatedSuccessMap(prev => ({ ...prev, [selectedTicketId]: true }));

        // Auto-hide rating bar after 3 seconds
        setTimeout(() => {
            setDismissedRatingMap(prev => ({ ...prev, [selectedTicketId]: true }));
        }, 3000);

        try {
            await updateDoc(doc(db, getCollName(selectedTicket, selectedTicketId), selectedTicketId), {
                rating: rating
            });
        } catch (error) {
            console.error("Error rating ticket:", error);
        }
    };

    if (loading) return <div className="p-8 text-center text-white/50">Загрузка...</div>;

    return (
        <div className="w-full max-w-5xl xl:max-w-6xl mx-auto font-manrope messenger-theme text-left">
            {isCreating ? (
                /* Create Ticket View */
                <div className="bg-[#121214] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl">
                    <div className="max-w-xl mx-auto w-full space-y-6">
                        {/* Header with back button */}
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setCreateAttachment(null);
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer text-xs font-semibold border border-white/10"
                                >
                                    <ArrowLeft size={16} />
                                    <span className="hidden sm:inline">Назад к переписке</span>
                                </button>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-russo text-white uppercase tracking-tight">Новое обращение</h3>
                                    <p className="text-xs text-white/40">Администрация Sparta всегда на связи</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreating(false);
                                    setCreateAttachment(null);
                                }}
                                className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 3 Quick Scenarios selector */}
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-white/50 tracking-wider">Выберите тему обращения:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleScenarioChange('sick_leave')}
                                    className={`p-3 rounded-2xl border text-center transition-all flex sm:flex-col items-center gap-2.5 sm:gap-1.5 cursor-pointer ${
                                        selectedScenario === 'sick_leave'
                                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <FileText size={20} className={selectedScenario === 'sick_leave' ? 'text-emerald-400' : 'text-white/40'} />
                                    <div className="text-left sm:text-center">
                                        <span className="text-xs font-bold block leading-tight">Справка о болезни</span>
                                        <span className="text-[10px] text-white/40 block sm:hidden">Заморозка абонемента</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleScenarioChange('payments')}
                                    className={`p-3 rounded-2xl border text-center transition-all flex sm:flex-col items-center gap-2.5 sm:gap-1.5 cursor-pointer ${
                                        selectedScenario === 'payments'
                                            ? 'bg-blue-500/15 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <CreditCard size={20} className={selectedScenario === 'payments' ? 'text-blue-400' : 'text-white/40'} />
                                    <div className="text-left sm:text-center">
                                        <span className="text-xs font-bold block leading-tight">Оплата и чеки</span>
                                        <span className="text-[10px] text-white/40 block sm:hidden">Подтверждение оплаты</span>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleScenarioChange('general')}
                                    className={`p-3 rounded-2xl border text-center transition-all flex sm:flex-col items-center gap-2.5 sm:gap-1.5 cursor-pointer ${
                                        selectedScenario === 'general'
                                            ? 'bg-sparta-gold/15 border-sparta-gold text-sparta-gold shadow-md shadow-sparta-gold/10'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <MessageSquare size={20} className={selectedScenario === 'general' ? 'text-sparta-gold' : 'text-white/40'} />
                                    <div className="text-left sm:text-center">
                                        <span className="text-xs font-bold block leading-tight">Общий вопрос</span>
                                        <span className="text-[10px] text-white/40 block sm:hidden">Расписание и клуб</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Child Selector */}
                        {parentChildren.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[11px] uppercase font-bold text-white/50 tracking-wider">Спортсмен (ребёнок):</label>
                                <div className="flex flex-wrap gap-2">
                                    {parentChildren.map((ch: any) => {
                                        const isSelected = (selectedChildForTicket?.id === ch.id) || (selectedChildForTicket?.childName === ch.childName);
                                        return (
                                            <button
                                                key={ch.id || ch.childName}
                                                type="button"
                                                onClick={() => handleChildSelect(ch)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-sparta-gold text-black border-sparta-gold shadow-sm'
                                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                <User size={13} />
                                                <span>{ch.childName || ch.name || 'Ребёнок'}</span>
                                                {ch.groupName && <span className="text-[10px] opacity-70">({ch.groupName})</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Custom Subject (for general) */}
                        {selectedScenario === 'general' && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] uppercase font-bold text-white/50 tracking-wider">Тема обращения:</label>
                                <input
                                    type="text"
                                    placeholder="Например: Вопрос по расписанию"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-sparta-gold outline-none"
                                />
                            </div>
                        )}

                        {/* Attachment Card */}
                        <div className="space-y-2">
                            <label className="text-[11px] uppercase font-bold text-white/50 tracking-wider flex items-center justify-between">
                                <span>
                                    {selectedScenario === 'sick_leave' ? 'Фото или скан справки:' :
                                     selectedScenario === 'payments' ? 'Чек или скриншот оплаты:' :
                                     'Прикрепить файл (опционально):'}
                                </span>
                            </label>

                            <input
                                type="file"
                                ref={createFileInputRef}
                                className="hidden"
                                accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,video/*"
                                onChange={handleCreateFileSelect}
                            />

                            {createAttachment ? (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                                    {createAttachment.type.startsWith('image/') ? (
                                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                            <img src={createAttachment.preview} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${
                                            createAttachment.file.name.match(/\.(xls|xlsx|csv)$/i)
                                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                : 'bg-white/10 text-sparta-gold border-white/10'
                                        }`}>
                                            {createAttachment.file.name.match(/\.(xls|xlsx|csv)$/i) ? (
                                                <FileSpreadsheet size={24} />
                                            ) : (
                                                <FileText size={24} />
                                            )}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white truncate">{createAttachment.file.name}</p>
                                        <p className="text-[10px] text-white/40">{(createAttachment.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCreateAttachment(null)}
                                        className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => createFileInputRef.current?.click()}
                                    className={`w-full p-5 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${
                                        selectedScenario === 'sick_leave'
                                            ? 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10'
                                            : selectedScenario === 'payments'
                                            ? 'border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5 hover:bg-blue-500/10'
                                            : 'border-white/10 hover:border-sparta-gold/50 bg-white/[0.02] hover:bg-white/5'
                                    }`}
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 group-hover:scale-110 group-hover:text-sparta-gold transition-all">
                                        <Camera size={22} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-white group-hover:text-sparta-gold transition-colors">
                                            {selectedScenario === 'sick_leave' ? 'Сфотографировать или выбрать справку' :
                                             selectedScenario === 'payments' ? 'Загрузить скриншот чека' :
                                             'Нажмите, чтобы прикрепить фото или документ'}
                                        </p>
                                        <p className="text-[10px] text-white/40 mt-0.5">JPG, PNG или PDF до 20 МБ</p>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Message Textarea */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] uppercase font-bold text-white/50 tracking-wider">
                                {selectedScenario === 'sick_leave' ? 'Даты болезни и комментарий:' :
                                 selectedScenario === 'payments' ? 'Комментарий к оплате:' :
                                 'Текст обращения:'}
                            </label>

                            {/* Quick Questions Chips (Only for new general inquiry) */}
                            {selectedScenario === 'general' && (
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {[
                                        { label: "📍 Где проходят тренировки?", text: "Подскажите, пожалуйста, где именно проходят тренировки и как добраться?" },
                                        { label: "💳 Стоимость занятий", text: "Какая сейчас актуальная стоимость абонементов и разовых занятий?" },
                                        { label: "⚽ Пробная тренировка", text: "Как записаться на пробную тренировку и что нужно взять с собой?" },
                                        { label: "⏰ График работы", text: "Подскажите актуальный график тренировок и работы филиала." }
                                    ].map((chip, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                setNewMessage(chip.text);
                                                if (!newSubject) setNewSubject(chip.label.replace(/^[^\s]+\s*/, ''));
                                            }}
                                            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-sparta-gold/15 hover:border-sparta-gold/40 border border-white/10 text-[11px] text-white/70 hover:text-white transition-all cursor-pointer"
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                rows={3}
                                placeholder={
                                    selectedScenario === 'sick_leave' ? 'Укажите период болезни (например, с 10 по 18 марта) для заморозки...' :
                                    selectedScenario === 'payments' ? 'Укажите сумму, дату перевода или банк...' :
                                    'Опишите ваш вопрос подробно...'
                                }
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white text-sm focus:border-sparta-gold outline-none resize-none placeholder:text-white/20"
                            />
                        </div>

                        {/* Reassurance Notice */}
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-sparta-gold/10 border border-sparta-gold/20 text-xs text-sparta-gold/90">
                            <Info size={16} className="shrink-0 text-sparta-gold" />
                            <span>Ответ администратора поступит прямо в этот чат и продублируется в ваши уведомления.</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreating(false);
                                    setCreateAttachment(null);
                                }}
                                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateTicket}
                                disabled={uploadProgress !== null || (!newMessage.trim() && !createAttachment)}
                                className="px-6 py-3 rounded-xl bg-sparta-gold hover:bg-white text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-sparta-gold/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {uploadProgress !== null ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        <span>Загрузка...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} />
                                        <span>Отправить администратору</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : tickets.length === 0 ? (
                /* Empty Onboarding View */
                <div className="space-y-8 pb-12">
                    {/* 1. Hero Block */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1a14] via-[#121214] to-[#0d0d0f] border border-sparta-gold/20 p-6 sm:p-8 shadow-2xl">
                        <div className="absolute -right-16 -top-16 w-64 h-64 bg-sparta-gold/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sparta-gold/10 border border-sparta-gold/30 text-sparta-gold text-xs font-bold uppercase tracking-wider">
                                    <Sparkles size={14} />
                                    <span>Служба заботы Sparta</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-russo text-white tracking-tight uppercase">
                                    Всегда рядом и готовы помочь
                                </h2>
                                <p className="text-white/60 text-xs sm:text-sm max-w-xl leading-relaxed">
                                    Поможем с абонементами, расписанием и справками. Отвечаем ежедневно с 09:00 до 21:00.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                                <a
                                    href="tel:+73512301269"
                                    className="inline-flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white transition-all group shadow-md"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Phone size={15} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Срочный вопрос</div>
                                        <div className="text-sparta-gold font-mono font-bold text-sm">+7 (351) 230-12-69</div>
                                    </div>
                                </a>

                                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white/60">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSupportOnline ? 'bg-green-400' : 'bg-sparta-gold'}`} />
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSupportOnline ? 'bg-green-500' : 'bg-sparta-gold'}`} />
                                    </span>
                                    <span>{isSupportOnline ? 'Администраторы онлайн' : 'График: 09:00 — 21:00'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. 3 Quick Scenarios */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm sm:text-base font-russo text-white uppercase tracking-tight flex items-center gap-2">
                                <Sparkles size={16} className="text-sparta-gold" />
                                Быстрые сценарии
                            </h3>
                            <span className="text-xs text-white/40">1 клик для связи</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            {/* Card 1: Sick leave */}
                            <button
                                type="button"
                                onClick={() => openCreateWithScenario('sick_leave')}
                                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 hover:border-emerald-500/60 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between gap-4"
                            >
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-emerald-500/30">
                                        <FileText size={24} />
                                    </div>
                                    <div className="text-white font-bold text-base mb-1 group-hover:text-emerald-300 transition-colors">
                                        Отправить справку
                                    </div>
                                    <p className="text-white/50 text-xs leading-relaxed">
                                        Перерасчет или заморозка абонемента по болезни ребёнка
                                    </p>
                                </div>
                                <div className="w-full pt-2 border-t border-emerald-500/15">
                                    <div className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-500/15 group-hover:bg-emerald-500/30 border border-emerald-500/30 group-hover:border-emerald-500/70 text-emerald-300 group-hover:text-emerald-100 font-bold text-xs flex items-center justify-between transition-all duration-200 shadow-sm">
                                        <span>Прикрепить фото справки</span>
                                        <Camera size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </button>

                            {/* Card 2: Payments */}
                            <button
                                type="button"
                                onClick={() => openCreateWithScenario('payments')}
                                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/25 hover:border-blue-500/60 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between gap-4"
                            >
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-blue-500/30">
                                        <CreditCard size={24} />
                                    </div>
                                    <div className="text-white font-bold text-base mb-1 group-hover:text-blue-300 transition-colors">
                                        Оплата и абонементы
                                    </div>
                                    <p className="text-white/50 text-xs leading-relaxed">
                                        Отправить чек, продлить абонемент или уточнить тариф
                                    </p>
                                </div>
                                <div className="w-full pt-2 border-t border-blue-500/15">
                                    <div className="w-full py-2.5 px-3.5 rounded-xl bg-blue-500/15 group-hover:bg-blue-500/30 border border-blue-500/30 group-hover:border-blue-500/70 text-blue-300 group-hover:text-blue-100 font-bold text-xs flex items-center justify-between transition-all duration-200 shadow-sm">
                                        <span>Вопрос по оплате или чек</span>
                                        <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </button>

                            {/* Card 3: Write to admin */}
                            <button
                                type="button"
                                onClick={() => openCreateWithScenario('general')}
                                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-sparta-gold/10 via-amber-500/5 to-transparent border border-sparta-gold/25 hover:border-sparta-gold/60 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sparta-gold/10 active:scale-[0.98] cursor-pointer flex flex-col justify-between gap-4"
                            >
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-sparta-gold/30">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div className="text-white font-bold text-base mb-1 group-hover:text-sparta-gold transition-colors">
                                        Написать администратору
                                    </div>
                                    <p className="text-white/50 text-xs leading-relaxed">
                                        Любые вопросы по расписанию, форме и тренировкам
                                    </p>
                                </div>
                                <div className="w-full pt-2 border-t border-sparta-gold/15">
                                    <div className="w-full py-2.5 px-3.5 rounded-xl bg-sparta-gold/15 group-hover:bg-sparta-gold/30 border border-sparta-gold/30 group-hover:border-sparta-gold/70 text-sparta-gold group-hover:text-amber-100 font-bold text-xs flex items-center justify-between transition-all duration-200 shadow-sm">
                                        <span>Задать вопрос</span>
                                        <Send size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Reassurance banner */}
                        <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/70">
                            <div className="w-8 h-8 rounded-xl bg-sparta-gold/15 text-sparta-gold flex items-center justify-center shrink-0">
                                <Info size={16} />
                            </div>
                            <div className="leading-relaxed">
                                <span className="text-white font-bold">Где ждать ответ? </span>
                                Ответ администратора поступит <span className="text-sparta-gold font-semibold">прямо в этот раздел</span> и продублируется в уведомления вашего профиля.
                            </div>
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <h3 className="text-base sm:text-lg font-russo text-white uppercase tracking-tight">
                                Часто задаваемые вопросы
                            </h3>
                            <span className="text-xs text-white/40">Полезно знать</span>
                        </div>

                        <div className="space-y-2.5">
                            {PARENT_FAQ.map(faq => {
                                const isOpen = openFaqId === faq.id;
                                return (
                                    <div
                                        key={faq.id}
                                        className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-colors hover:border-white/20"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                                            className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 font-semibold text-xs sm:text-sm text-white/90">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sparta-gold shrink-0" />
                                                <span>{faq.question}</span>
                                            </div>
                                            <ChevronDown
                                                size={16}
                                                className={`text-white/40 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-sparta-gold' : ''}`}
                                            />
                                        </button>
                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-5 pb-5 pt-0 text-white/60 text-xs sm:text-sm leading-relaxed pl-8 sm:pl-9 border-t border-white/5 pt-3">
                                                        {faq.answer}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* Two-Column Messenger View */
                <div className="h-[calc(100dvh-130px)] md:h-[740px] min-h-[540px] bg-[#121214]/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden flex shadow-2xl relative">
                    {/* Left Column: Dialogs List */}
                    <div className={`w-full md:w-80 lg:w-88 border-r border-white/10 flex flex-col shrink-0 bg-black/40 ${selectedTicketId ? 'hidden md:flex' : 'flex'}`}>
                        {/* Sidebar Header */}
                        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between gap-2 bg-black/20 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-sparta-gold/15 text-sparta-gold flex items-center justify-center border border-sparta-gold/30">
                                    <Headphones size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-russo text-white uppercase tracking-tight flex items-center gap-2">
                                        Поддержка
                                        <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                            {tickets.length}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isSupportOnline ? 'bg-green-400' : 'bg-sparta-gold'}`} />
                                        <span>{isSupportOnline ? 'Онлайн' : '09:00 — 21:00'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newMuted = toggleSoundMuted();
                                        setSoundMutedState(newMuted);
                                        if (!newMuted) {
                                            playReceiveSound();
                                            requestChatNotificationPermission().catch(() => {});
                                        }
                                    }}
                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                        soundMuted
                                            ? 'bg-white/5 hover:bg-white/10 text-white/40 border-white/10 hover:text-white'
                                            : 'bg-sparta-gold/15 text-sparta-gold border-sparta-gold/30 hover:bg-sparta-gold/25 shadow-sm'
                                    }`}
                                    title={soundMuted ? 'Включить звук уведомлений' : 'Звук уведомлений включен (нажмите для проверки звука или выключения)'}
                                >
                                    {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(true);
                                        setSelectedScenario('general');
                                        setNewSubject('');
                                        setNewMessage('');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-sparta-gold text-black hover:bg-yellow-400 font-bold transition-all text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                                    title="Новое обращение"
                                >
                                    <Plus size={15} />
                                    <span>Новое</span>
                                </button>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-3 pt-3 pb-2 flex items-center gap-1 bg-black/10 shrink-0">
                            {[
                                { id: 'all', label: 'Все' },
                                { id: 'active', label: 'В работе' },
                                { id: 'closed', label: 'Решённые' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFilterStatus(tab.id as any)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                                        filterStatus === tab.id
                                            ? 'bg-sparta-gold text-black shadow-sm font-bold'
                                            : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="px-3 pb-2.5 pt-1 bg-black/10 shrink-0">
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Поиск по диалогам..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-sparta-gold/60 outline-none transition-colors"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Dialogs List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                            {filteredTickets.length === 0 ? (
                                <div className="p-8 text-center text-xs text-white/40 flex flex-col items-center justify-center h-full gap-2">
                                    <MessageSquare size={26} className="text-white/20" />
                                    <span>Обращений не найдено</span>
                                </div>
                            ) : (
                                filteredTickets.map(t => {
                                    const isSelected = selectedTicketId === t.id;
                                    const lastMsg = getLastMessageInfo(t);
                                    const status = getStatusInfo(t.status);
                                    const hasUnread = !t.isReadByUser;
                                    const title = getHeaderTitle(t);
                                    const isSick = t.category === 'sick_leave';
                                    const isPay = t.category === 'payments';

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => handleSelectTicket(t.id)}
                                            className={`p-3 sm:p-3.5 text-left cursor-pointer transition-all flex items-start gap-3 relative hover:bg-white/[0.04] ${
                                                isSelected
                                                    ? 'bg-white/[0.08] border-l-2 border-sparta-gold'
                                                    : ''
                                            }`}
                                        >
                                            {/* Icon avatar */}
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                                                isSick
                                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                                    : isPay
                                                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                                        : 'bg-sparta-gold/15 text-sparta-gold border-sparta-gold/30'
                                            }`}>
                                                {isSick ? <FileText size={16} /> : isPay ? <CreditCard size={16} /> : <MessageSquare size={16} />}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1.5 mb-1">
                                                    <span className={`text-xs truncate font-bold ${isSelected ? 'text-white' : hasUnread ? 'text-white' : 'text-white/80'}`}>
                                                        {title}
                                                    </span>
                                                    <span className="text-[10px] text-white/40 shrink-0 font-mono">
                                                        {formatListDate(lastMsg.date)}
                                                    </span>
                                                </div>

                                                <p className={`text-xs truncate mb-1.5 leading-snug ${hasUnread ? 'text-white/90 font-medium' : 'text-white/50'}`}>
                                                    {lastMsg.sender === 'user' && <span className="text-white/40">Вы: </span>}
                                                    {lastMsg.text}
                                                </p>

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.bg}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                        <span>{status.label}</span>
                                                    </span>

                                                    {hasUnread && (
                                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" title="Новое сообщение" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Active Conversation */}
                    <div className={`flex-1 flex flex-col min-w-0 bg-[#0d0d0f]/60 relative ${selectedTicketId ? 'flex' : 'hidden md:flex'}`}>
                        {selectedTicket ? (
                            <>
                                {/* Chat Header */}
                                <div className="relative z-30 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-black/40 backdrop-blur-md shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTicketId(null)}
                                            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer text-xs font-semibold shrink-0 border border-white/10 active:scale-95"
                                            title="К списку диалогов"
                                        >
                                            <ArrowLeft size={16} />
                                            <span>Назад</span>
                                        </button>

                                        <div className="min-w-0">
                                            <h3 className="text-white font-bold text-sm sm:text-base truncate leading-snug">
                                                {getHeaderTitle(selectedTicket)}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                                                {isAgentTyping ? (
                                                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 inline-block animate-ping" />
                                                        Администратор печатает...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="truncate">
                                                            {selectedTicket.createdAt?.seconds
                                                                ? format(new Date(selectedTicket.createdAt.seconds * 1000), 'd MMMM, HH:mm', { locale: ru })
                                                                : 'Недавно'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusInfo(selectedTicket.status).bg}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusInfo(selectedTicket.status).dot}`} />
                                                            <span>{getStatusInfo(selectedTicket.status).label}</span>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Sound Toggle Button with instant audio test */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newMuted = toggleSoundMuted();
                                                setSoundMutedState(newMuted);
                                                if (!newMuted) {
                                                    playReceiveSound();
                                                    requestChatNotificationPermission().catch(() => {});
                                                }
                                            }}
                                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                soundMuted
                                                    ? 'bg-white/5 hover:bg-white/10 text-white/40 border-white/10 hover:text-white'
                                                    : 'bg-sparta-gold/15 hover:bg-sparta-gold/25 text-sparta-gold border-sparta-gold/30 hover:border-sparta-gold/50 shadow-sm'
                                            }`}
                                            title={soundMuted ? 'Включить звук уведомлений' : 'Звук уведомлений включен (нажмите для проверки звука или выключения)'}
                                        >
                                            {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                        </button>

                                        {isStaff && (
                                            <select
                                                value={selectedTicket.status}
                                                onChange={(e) => updateDoc(doc(db, getCollName(selectedTicket, selectedTicketId), selectedTicketId!), { status: e.target.value })}
                                                className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-sparta-gold transition-colors cursor-pointer"
                                            >
                                                <option value="new">В обработке</option>
                                                <option value="in_progress">В работе</option>
                                                <option value="resolved">Решено</option>
                                                <option value="rejected">Отклонено</option>
                                            </select>
                                        )}
                                        {/* Mobile Phone Link (Direct call on smartphones) */}
                                        <a
                                            href="tel:+73512301269"
                                            className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-sparta-gold transition-colors"
                                            title="Позвонить: +7 (351) 230-12-69"
                                        >
                                            <Phone size={16} />
                                        </a>

                                        {/* Desktop Phone Popover */}
                                        <div className="hidden md:block relative z-50" ref={phonePopoverRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowPhonePopover(prev => !prev)}
                                                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                    showPhonePopover
                                                        ? 'bg-sparta-gold text-black border-sparta-gold shadow-md shadow-sparta-gold/20'
                                                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-sparta-gold'
                                                }`}
                                                title="Позвонить администратору"
                                            >
                                                <Phone size={16} />
                                            </button>

                                            <AnimatePresence>
                                                {showPhonePopover && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-[#1a1a1a]/95 border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/80 z-[60] text-left backdrop-blur-md"
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                                                <PhoneCall size={16} className="text-sparta-gold shrink-0" />
                                                                <span>Срочный вопрос?</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPhonePopover(false)}
                                                                className="p-1 -mr-1 -mt-1 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-white/60 mb-3 leading-relaxed">
                                                            Администраторы на связи и готовы оперативно помочь:
                                                        </p>

                                                        <a
                                                            href="tel:+73512301269"
                                                            className="block font-mono text-base font-bold text-sparta-gold hover:underline mb-1 transition-colors"
                                                        >
                                                            +7 (351) 230-12-69
                                                        </a>

                                                        <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-3.5">
                                                            <Clock size={12} className="text-white/40 shrink-0" />
                                                            <span>Ежедневно с 09:00 до 21:00</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={handleCopyPhone}
                                                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all cursor-pointer active:scale-95"
                                                        >
                                                            {phoneCopied ? (
                                                                <>
                                                                    <Check size={14} className="text-emerald-400" />
                                                                    <span className="text-emerald-400 font-semibold">Скопировано! ✓</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={14} className="text-white/60" />
                                                                    <span>Скопировать номер</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Feed Area */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-black/10" id="messages-container">
                                    {/* If trial request, display trial details card */}
                                    {selectedTicket.type === 'trial_request' && (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-2 text-xs space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-sparta-gold font-bold uppercase tracking-wider text-xs">
                                                    <Dumbbell size={16} />
                                                    <span>{selectedTicket.programType || 'Пробная тренировка'}</span>
                                                </div>
                                                <span className="text-[10px] text-white/40 font-mono">Заявка на секцию</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5 text-white/80 text-xs">
                                                {(() => {
                                                    const cName = resolveTicketChildName(selectedTicket);
                                                    return cName ? (
                                                        <div>
                                                            <span className="text-white/40">Ребёнок: </span>
                                                            <span className="font-semibold">{cName}</span>
                                                            {selectedTicket.childAge ? <span className="text-white/50"> ({selectedTicket.childAge} лет)</span> : null}
                                                        </div>
                                                    ) : null;
                                                })()}
                                                {selectedTicket.parentPhone && (
                                                    <div>
                                                        <span className="text-white/40">Телефон: </span>
                                                        <span className="font-mono text-white/90">{selectedTicket.parentPhone}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedTicket.sports && selectedTicket.sports.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {selectedTicket.sports.map((sport, i) => (
                                                        <span key={i} className="px-2 py-0.5 rounded-md bg-sparta-gold/10 text-sparta-gold text-[10px] font-bold border border-sparta-gold/20 uppercase tracking-wider">
                                                            {sport}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {selectedTicket.comment && (
                                                <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-white/70 italic leading-relaxed">
                                                    «{selectedTicket.comment}»
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Message Feed */}
                                    {(() => {
                                        const threadList = buildTicketThread(selectedTicket);

                                        if (threadList.length === 0 && selectedTicket.type !== 'trial_request') {
                                            return (
                                                <div className="flex flex-col items-center justify-center py-16 text-center text-white/40">
                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-sparta-gold">
                                                        <MessageSquare size={22} />
                                                    </div>
                                                    <p className="text-sm font-semibold text-white/80">Диалог начат</p>
                                                    <p className="text-xs text-white/40 mt-1 max-w-xs">
                                                        Напишите сообщение или прикрепите документ. Служба заботы ответит вам в ближайшее время.
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <AnimatePresence mode="popLayout">
                                                {threadList.map((msg, idx) => {
                                                    const isUser = msg.sender === 'user';
                                                    const isSystem = msg.sender === 'system' ||
                                                        Boolean(msg.text && (msg.text.startsWith('✅') || msg.text.startsWith('ℹ️') || msg.text.startsWith('🔔')));

                                                    let msgDate: Date;
                                                    if (msg.createdAt?.toDate) {
                                                        msgDate = msg.createdAt.toDate();
                                                    } else if (msg.createdAt?.seconds) {
                                                        msgDate = new Date(msg.createdAt.seconds * 1000);
                                                    } else {
                                                        msgDate = new Date();
                                                    }

                                                    let showDateHeader = false;
                                                    if (idx === 0) {
                                                        showDateHeader = true;
                                                    } else {
                                                        const prevMsg = threadList[idx - 1];
                                                        const prevDate = prevMsg.createdAt?.toDate
                                                            ? prevMsg.createdAt.toDate()
                                                            : (prevMsg.createdAt?.seconds ? new Date(prevMsg.createdAt.seconds * 1000) : null);
                                                        if (prevDate && prevDate.toDateString() !== msgDate.toDateString()) {
                                                            showDateHeader = true;
                                                        }
                                                    }

                                                    return (
                                                        <React.Fragment key={idx}>
                                                            {showDateHeader && (
                                                                <div className="flex justify-center my-3">
                                                                    <span className="text-[10px] uppercase font-bold text-white/40 bg-white/5 border border-white/10 px-3 py-1 rounded-full shadow-xs">
                                                                        {isToday(msgDate) ? 'Сегодня' : isYesterday(msgDate) ? 'Вчера' : format(msgDate, 'd MMMM', { locale: ru })}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {isSystem ? (
                                                                /* Compact centered system pill */
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: 6 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="flex justify-center my-2.5 px-2"
                                                                >
                                                                    <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-lg text-center leading-relaxed backdrop-blur-md shadow-sm border ${
                                                                        msg.text.startsWith('✅')
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                                                            : 'bg-white/[0.06] border-white/10 text-white/80'
                                                                    }`}>
                                                                        <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                                                                        <div className="text-[10px] mt-1 opacity-50 text-right">
                                                                            {format(msgDate, 'HH:mm')}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            ) : (
                                                                /* Chat Bubble: User or Admin */
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                                                                >
                                                                    {!isUser && (
                                                                        <div className="w-8 h-8 rounded-full bg-sparta-gold/15 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold shrink-0 mb-1 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                                                                            <Shield size={16} />
                                                                        </div>
                                                                    )}

                                                                    <div className="max-w-[85%] sm:max-w-[75%] group">
                                                                        {!isUser && (
                                                                            <div className="flex items-center gap-1.5 ml-1 mb-1">
                                                                                <span className="text-[11px] font-bold text-sparta-gold">
                                                                                    Служба заботы Sparta
                                                                                </span>
                                                                                <BadgeCheck size={12} className="text-blue-400" />
                                                                            </div>
                                                                        )}

                                                                        <div className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md transition-all ${
                                                                            isUser
                                                                                ? 'bg-sparta-gold text-black rounded-tr-xs shadow-md shadow-sparta-gold/15 font-medium'
                                                                                : 'bg-white/[0.07] border border-white/10 text-white rounded-tl-xs hover:bg-white/[0.09]'
                                                                        }`}>
                                                                            {/* Unified Attachment & Document Render */}
                                                                            {(() => {
                                                                                const rawAttachment: any = msg.attachment;
                                                                                const candidateUrl: string =
                                                                                    (typeof rawAttachment === 'string' ? rawAttachment : rawAttachment?.url) ||
                                                                                    msg.image ||
                                                                                    (msg as any).imageUrl ||
                                                                                    (msg as any).fileUrl ||
                                                                                    '';

                                                                                const parsed = parseAttachment(rawAttachment, candidateUrl);
                                                                                const isImageBroken = Boolean(parsed.url && brokenImages[parsed.url]);
                                                                                const imageSrc: string | null = parsed.isImage && parsed.url && !isImageBroken ? parsed.url : null;
                                                                                const isVideo = parsed.isVideo && Boolean(parsed.url);
                                                                                const isDocument = (parsed.isDocument || (parsed.isImage && isImageBroken)) && Boolean(parsed.url);

                                                                                return (
                                                                                    <>
                                                                                        {/* 1. Image Render */}
                                                                                        {imageSrc && (
                                                                                            <div
                                                                                                className="mb-2.5 rounded-2xl overflow-hidden cursor-pointer group/img relative border border-black/10 hover:opacity-95 transition-all max-w-sm shadow-sm"
                                                                                                onClick={() => setViewerFile({
                                                                                                    url: imageSrc,
                                                                                                    name: parsed.name,
                                                                                                    type: parsed.type || 'image/jpeg',
                                                                                                    ext: parsed.ext,
                                                                                                    size: parsed.formattedSize
                                                                                                })}
                                                                                            >
                                                                                                <img
                                                                                                    src={imageSrc}
                                                                                                    alt={parsed.name || "Вложение"}
                                                                                                    onError={() => setBrokenImages(prev => ({ ...prev, [imageSrc]: true }))}
                                                                                                    className="max-w-full h-auto max-h-72 object-cover rounded-2xl"
                                                                                                />
                                                                                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                                                    <span className="bg-black/75 text-white text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 font-semibold shadow-lg">
                                                                                                        <Search size={13} /> Просмотр
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 2. Video Player */}
                                                                                        {isVideo && parsed.url && (
                                                                                            <div className="mb-2.5 w-[280px] sm:w-[350px] max-w-full aspect-video bg-black/40 rounded-2xl overflow-hidden relative border border-white/10 shadow-sm">
                                                                                                <div className="absolute inset-0">
                                                                                                    <SpartaVideoPlayer src={parsed.url} className="w-full h-full" />
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 2.5 Audio Player */}
                                                                                        {parsed.isAudio && parsed.url && (
                                                                                            <div className="mb-2.5">
                                                                                                <SpartaAudioPlayer
                                                                                                    url={parsed.url}
                                                                                                    duration={parsed.duration}
                                                                                                    transcription={parsed.transcription}
                                                                                                    isUser={!isUser}
                                                                                                    variant={isUser ? 'gold' : 'dark'}
                                                                                                    onSaveTranscription={async (transcriptionText) => {
                                                                                                        const ticket = tickets.find(t => t.id === selectedTicketId);
                                                                                                        if (!ticket || !selectedTicketId) return;
                                                                                                        const currentColl = getCollName(ticket, selectedTicketId);
                                                                                                        const ticketRef = doc(db, currentColl, selectedTicketId);

                                                                                                        const updatedThread = (ticket.thread || []).map((m: any, mIdx: number) => {
                                                                                                            if (mIdx === idx) {
                                                                                                                return {
                                                                                                                    ...m,
                                                                                                                    attachment: {
                                                                                                                        ...(typeof m.attachment === 'object' ? m.attachment : {}),
                                                                                                                        transcription: transcriptionText
                                                                                                                    }
                                                                                                                };
                                                                                                            }
                                                                                                            return m;
                                                                                                        });

                                                                                                        setTickets(prev => prev.map(t => t.id === selectedTicketId ? { ...t, thread: updatedThread } : t));
                                                                                                        try {
                                                                                                            await updateDoc(ticketRef, { thread: updatedThread });
                                                                                                        } catch (err) {
                                                                                                            console.error('Error saving transcription to Firestore:', err);
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 3. Document / File Card */}
                                                                                        {isDocument && parsed.url && (
                                                                                            <div className="mb-2.5">
                                                                                                <div
                                                                                                    onClick={() => setViewerFile({
                                                                                                        url: parsed.url,
                                                                                                        name: parsed.name,
                                                                                                        type: parsed.type,
                                                                                                        ext: parsed.ext,
                                                                                                        size: parsed.formattedSize
                                                                                                    })}
                                                                                                    className={`chat-doc-card preserve-bg p-2.5 sm:p-3 flex items-center justify-between gap-3 rounded-2xl border transition-all group/doc active:scale-[0.99] cursor-pointer ${
                                                                                                        isUser ? 'chat-doc-card-user' : 'chat-doc-card-admin'
                                                                                                    }`}
                                                                                                    title={`Просмотреть «${parsed.name}» в Sparta Viewer`}
                                                                                                >
                                                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover/doc:scale-105 shadow-xs ${
                                                                                                            parsed.isPdf
                                                                                                                ? 'chat-doc-icon-pdf'
                                                                                                                : parsed.isSpreadsheet
                                                                                                                    ? 'chat-doc-icon-sheet'
                                                                                                                    : 'chat-doc-icon-default'
                                                                                                        }`}>
                                                                                                            {parsed.isSpreadsheet ? (
                                                                                                                <FileSpreadsheet size={18} />
                                                                                                            ) : (
                                                                                                                <FileText size={18} />
                                                                                                            )}
                                                                                                        </div>
                                                                                                        <div className="text-left min-w-0">
                                                                                                            <div className="chat-doc-title text-xs sm:text-sm font-bold truncate max-w-[170px] sm:max-w-[220px]">
                                                                                                                {parsed.name}
                                                                                                            </div>
                                                                                                            <div className="chat-doc-subtitle text-[10px] flex items-center gap-1.5 mt-0.5">
                                                                                                                {parsed.formattedSize && (
                                                                                                                    <span className="chat-doc-badge px-1.5 py-0.5 rounded font-mono font-bold uppercase text-[9px]">
                                                                                                                        {parsed.formattedSize}
                                                                                                                    </span>
                                                                                                                )}
                                                                                                                <span className="truncate">Нажмите для просмотра</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <a
                                                                                                        href={parsed.url}
                                                                                                        download={parsed.name}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                        className="chat-doc-download p-2 rounded-xl shrink-0 transition-colors shadow-xs"
                                                                                                        title="Скачать файл напрямую"
                                                                                                    >
                                                                                                        <Download size={16} />
                                                                                                    </a>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* 4. Protection against empty bubble */}
                                                                                        {!msg.text?.trim() && !imageSrc && !isVideo && !isDocument && (
                                                                                            <div className={`p-2.5 flex items-center gap-2 rounded-xl text-xs mb-1 ${
                                                                                                isUser ? 'bg-white/80 border border-black/10 text-slate-800' : 'bg-white/5 border border-white/10 text-white/60'
                                                                                            }`}>
                                                                                                <Paperclip size={14} className="shrink-0" />
                                                                                                <span>{candidateUrl ? 'Вложение' : 'Сообщение без текста'}</span>
                                                                                                {candidateUrl && (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setViewerFile({ url: candidateUrl, name: 'Вложение' })}
                                                                                                        className={`ml-auto font-bold underline text-[11px] cursor-pointer ${
                                                                                                            isUser ? 'text-black' : 'text-sparta-gold'
                                                                                                        }`}
                                                                                                    >
                                                                                                        Открыть
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}

                                                                            {/* Message Text */}
                                                                            {msg.text && (
                                                                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                                                            )}

                                                                            {/* Meta: time and read status */}
                                                                            <div className={`text-[10px] mt-1.5 font-semibold flex items-center justify-end gap-1.5 ${
                                                                                isUser ? 'text-black/50' : 'text-white/40'
                                                                            }`}>
                                                                                <span>{format(msgDate, 'HH:mm')}</span>
                                                                                {isUser && (
                                                                                    <CheckCheck size={14} className={msg.isRead ? "text-black" : "text-black/30"} />
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        );
                                    })()}

                                    {/* Agent typing indicator */}
                                    {isAgentTyping && (
                                        <div className="flex items-center gap-3 justify-start animate-in fade-in">
                                            <div className="w-8 h-8 rounded-full bg-sparta-gold/15 border border-sparta-gold/30 flex items-center justify-center text-sparta-gold shrink-0">
                                                <Shield size={16} />
                                            </div>
                                            <div className="bg-white/5 border border-white/10 text-white/70 px-4 py-2.5 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs">
                                                <span>Служба заботы печатает</span>
                                                <span className="w-1.5 h-1.5 bg-sparta-gold rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                                <span className="w-1.5 h-1.5 bg-sparta-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <span className="w-1.5 h-1.5 bg-sparta-gold rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Interactive Slim Rating Banner: auto-hides after rating or if already rated */}
                                {['resolved', 'completed'].includes(selectedTicket.status) &&
                                 !dismissedRatingMap[selectedTicket.id] &&
                                 (!selectedTicket.rating || ratedSuccessMap[selectedTicket.id]) && (
                                    <div className="px-4 py-2.5 bg-emerald-500/10 border-t border-emerald-500/20 text-xs overflow-hidden transition-all duration-300">
                                        {ratedSuccessMap[selectedTicket.id] ? (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex items-center justify-center gap-2 py-0.5 text-emerald-300 font-semibold text-center w-full"
                                            >
                                                <Sparkles size={15} className="text-sparta-gold" />
                                                <span>Спасибо за оценку!</span>
                                                <span className="text-sparta-gold">⭐</span>
                                            </motion.div>
                                        ) : (
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-emerald-300">
                                                    <CheckCircle2 size={15} />
                                                    <span className="font-medium">Вопрос решён. Оцените работу поддержки:</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => handleRateTicket(star)}
                                                            className="p-1 transition-transform hover:scale-125 cursor-pointer text-white/30 hover:text-sparta-gold"
                                                            title={`Оценить на ${star}`}
                                                        >
                                                            <Star size={17} className="hover:fill-sparta-gold" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Input / Action Area (ALWAYS ACTIVE) */}
                                <div className="relative border-t border-white/10 bg-black/40 backdrop-blur-md">
                                    <div className="p-3 sm:p-4 flex flex-col gap-2.5">

                                        {/* Attachment Preview */}
                                        {attachment && (
                                            <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl border border-white/10 w-fit max-w-full animate-in fade-in slide-in-from-bottom-1 relative">
                                                {attachment.type.startsWith('image/') ? (
                                                    <div className="relative shrink-0">
                                                        <img
                                                            src={attachment.preview}
                                                            alt="Предпросмотр фото"
                                                            className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAttachment(null);
                                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                            }}
                                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 hover:bg-red-500 border border-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                                                            title="Отменить прикрепление"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 pr-7 relative">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                                                            attachment.file.name.match(/\.(xls|xlsx|csv)$/i)
                                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                                                : 'bg-white/10 border-white/10 text-sparta-gold'
                                                        }`}>
                                                            {attachment.file.name.match(/\.(xls|xlsx|csv)$/i) ? (
                                                                <FileSpreadsheet size={22} />
                                                            ) : (
                                                                <FileText size={22} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 max-w-[180px]">
                                                            <div className="text-xs font-semibold text-white truncate">{attachment.file.name}</div>
                                                            <div className="text-[10px] text-white/40 font-mono">
                                                                {attachment.file.size > 1024 * 1024
                                                                    ? `${(attachment.file.size / 1024 / 1024).toFixed(1)} МБ`
                                                                    : `${Math.round(attachment.file.size / 1024)} КБ`}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAttachment(null);
                                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                            }}
                                                            className="absolute top-0 right-0 p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
                                                            title="Отменить прикрепление"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}

                                                {attachment.type.startsWith('image/') && (
                                                    <div className="min-w-0 max-w-[160px] pr-2 hidden sm:block">
                                                        <div className="text-xs font-medium text-white truncate">{attachment.file.name}</div>
                                                        <div className="text-[10px] text-white/40 font-mono">
                                                            {attachment.file.size > 1024 * 1024
                                                                ? `${(attachment.file.size / 1024 / 1024).toFixed(1)} МБ`
                                                                : `${Math.round(attachment.file.size / 1024)} КБ`}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Emoji Picker Popup */}
                                        <AnimatePresence>
                                            {showEmojiPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    className="absolute bottom-20 left-4 bg-[#1a1a1c] border border-white/15 rounded-2xl p-3 shadow-2xl z-50 emoji-picker-container w-64"
                                                >
                                                    <div className="grid grid-cols-6 gap-2">
                                                        {["😊", "👍", "👎", "👋", "🔥", "⚽", "💪", "🏆", "📅", "✅", "❌", "❓", "😎", "🤔", "😢", "🎉", "🤝", "🥇"].map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                type="button"
                                                                onClick={() => handleEmojiClick(emoji)}
                                                                className="text-xl hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer text-center"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                         {/* Input Bar or Voice Recording Bar */}
                                        {isRecording ? (
                                            <div className="flex items-center justify-between gap-3 w-full bg-rose-950/40 border border-rose-500/40 rounded-2xl p-2.5 px-4 animate-in fade-in shadow-lg shadow-rose-950/20">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                                                    <span className="text-rose-300 font-mono font-bold text-sm tracking-wider shrink-0">
                                                        {formattedDuration}
                                                    </span>
                                                    <div className="hidden xs:flex items-center gap-1 shrink-0">
                                                        <span className="w-1 h-3 bg-rose-500/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1 h-5 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1 h-2 bg-rose-500/80 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                                        <span className="w-1 h-4 bg-rose-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                                                    </div>
                                                    <span className="text-xs text-rose-200/80 truncate hidden sm:inline">
                                                        Запись голосового сообщения...
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={cancelRecording}
                                                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                                        title="Отменить запись"
                                                    >
                                                        <Trash2 size={15} />
                                                        <span className="hidden sm:inline">Отмена</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={handleSendVoiceReply}
                                                        disabled={isSendingVoice}
                                                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                                        title="Отправить голосовое сообщение"
                                                    >
                                                        {isSendingVoice ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Send size={15} />
                                                                <span>Отправить</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 items-end">
                                                <input
                                                    type="file"
                                                    accept="image/*,video/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                                                    ref={fileInputRef}
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                                                        showEmojiPicker
                                                            ? 'bg-sparta-gold text-black'
                                                            : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                                                    }`}
                                                    title="Смайлики"
                                                >
                                                    <Smile size={19} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                                                        attachment
                                                            ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/20'
                                                            : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                                                    }`}
                                                    title="Прикрепить файл"
                                                >
                                                    <Paperclip size={19} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={startRecording}
                                                    className="p-3 rounded-xl transition-all cursor-pointer bg-white/5 text-white/50 hover:text-sparta-gold hover:bg-white/10"
                                                    title="Записать голосовое сообщение"
                                                >
                                                    <Mic size={19} />
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
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-sparta-gold focus:bg-white/[0.08] outline-none resize-none min-h-[44px] max-h-[140px] transition-all placeholder:text-white/30"
                                                    style={{ height: 'auto' }}
                                                    onInput={(e) => {
                                                        e.currentTarget.style.height = 'auto';
                                                        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                                    }}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={handleSendReply}
                                                    disabled={(!replyText.trim() && !attachment) || uploadProgress !== null}
                                                    className="p-3 bg-sparta-gold text-black rounded-xl hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 relative overflow-hidden font-bold"
                                                    title="Отправить сообщение"
                                                >
                                                    {uploadProgress !== null ? (
                                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                    ) : (
                                                        <Send size={19} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* No conversation selected on desktop */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0d0d0f]/40">
                                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-4 shadow-xl">
                                    <MessageSquare size={32} />
                                </div>
                                <h4 className="text-white font-russo text-base uppercase tracking-tight mb-2">
                                    Выберите диалог
                                </h4>
                                <p className="text-white/40 text-xs max-w-sm mb-6 leading-relaxed">
                                    Выберите обращение из списка слева, чтобы просмотреть переписку, или создайте новое
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(true);
                                        setSelectedScenario('general');
                                        setNewSubject('');
                                        setNewMessage('');
                                    }}
                                    className="px-5 py-2.5 rounded-xl bg-sparta-gold text-black font-bold text-xs hover:bg-yellow-400 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-sparta-gold/20"
                                >
                                    <Plus size={16} />
                                    <span>Новое обращение</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Universal Sparta Multi-Format Document & Media Viewer */}
            <SpartaViewer
                isOpen={Boolean(viewerFile)}
                onClose={() => setViewerFile(null)}
                file={viewerFile}
            />
        </div>
    );
};

export default UserRequests;