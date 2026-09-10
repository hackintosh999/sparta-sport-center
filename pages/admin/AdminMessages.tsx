import React, { useEffect, useState, useRef } from 'react';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc,
    arrayUnion, Timestamp, serverTimestamp, where, getDocs, addDoc 
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
    Search, X, Send, Paperclip, Phone, Mail, CheckCircle2, RotateCcw, 
    Zap, ArrowLeft, FileText, Download, MessageSquare, Loader2, File,
    ChevronDown, ChevronUp, Pin, Reply, Copy, Trash2, User, Mic
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SpartaViewer, { SpartaViewerFile } from '../../components/common/SpartaViewer';
import { SpartaAudioPlayer } from '../../components/common/SpartaAudioPlayer';
import { useAudioRecorder, formatAudioDuration } from '../../hooks/useAudioRecorder';
import { playSendSound } from '../../utils/soundEffects';

export type DialogCategory = 'all' | 'requests' | 'certificates' | 'chat' | 'bot';

export interface MessageHistory {
    text: string;
    sender: 'user' | 'admin';
    senderName: string;
    createdAt: Timestamp;
    isRead?: boolean;
    image?: string;
    attachment?: {
        url: string;
        type: string;
        name: string;
        size?: number;
        duration?: number;
        transcription?: string;
    };
    senderRole?: string;
    senderVerification?: any;
    isInternal?: boolean;
    replyTo?: {
        text: string;
        senderName: string;
    };
}

export interface Message {
    id: string;
    userId?: string;
    name: string;
    email: string;
    phone?: string;
    childId?: string;
    childName?: string;
    groupName?: string;
    coachName?: string;
    subject: string;
    message: string;
    status: 'new' | 'in_progress' | 'waiting' | 'resolved';
    createdAt: Timestamp;
    rating?: number;
    thread?: MessageHistory[];
    category?: string;
    isStarred?: boolean;
    isPinned?: boolean;
    moderatedAt?: any;
    moderatedBy?: string;
    isTyping?: {
        admin?: boolean;
        user?: boolean;
    };
    typing?: {
        admin?: boolean;
        user?: boolean;
    };
}

export interface CannedResponse {
    command: string;
    label: string;
    text: string;
}

export const BASE_CANNED_RESPONSES: CannedResponse[] = [
    {
        command: '/пробное',
        label: 'Пробное занятие',
        text: 'Добрый день! С собой на пробную тренировку понадобятся: удобная спортивная форма, обувь (кеды или футзалки) и бутылочка воды. Ждем вас за 10 минут до начала занятия!'
    },
    {
        command: '/справка',
        label: 'Приём справки о болезни',
        text: 'Здравствуйте! Справку приняли, период болезни зафиксирован. Пропущенные занятия сохранены/перенесены в абонементе. Скорейшего восстановления!'
    },
    {
        command: '/оплата',
        label: 'Оплата абонемента',
        text: 'Добрый день! Оплатить абонемент можно онлайн в вашем личном кабинете в разделе "Мои абонементы". После оплаты доступ и бронь обновятся автоматически.'
    },
    {
        command: '/расписание',
        label: 'Расписание занятий',
        text: 'Здравствуйте! Актуальное расписание занятий вечерних групп: с 19:00 до 20:00. Подробную сетку по дням можно посмотреть в вашем профиле.'
    }
];

// Helper to detect category of a message
export const getDialogCategory = (msg: Message): { key: 'requests' | 'certificates' | 'chat' | 'bot'; label: string; color: string } => {
    const subj = (msg.subject || '').toLowerCase();
    const text = (msg.message || '').toLowerCase();

    // 1. Bot (AI assistant conversations)
    const isBot = Boolean(
        msg.category === 'bot' ||
        msg.category === 'ai' ||
        (msg as any).isAi === true ||
        subj.includes('бот') ||
        subj.includes('ассистент') ||
        text.includes('бот') ||
        msg.thread?.some(t => t.senderRole === 'bot' || t.senderRole === 'assistant' || t.senderName?.toLowerCase().includes('бот') || t.senderName?.toLowerCase().includes('ассистент'))
    );
    if (isBot) {
        return { key: 'bot', label: '🤖 Чат-бот', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }

    // 2. Certificates (sick leaves and attached files, excluding voice notes)
    const hasFiles = Boolean(
        msg.category === 'sick_leave' ||
        (msg as any).isSickLeave === true ||
        subj.includes('справк') ||
        text.includes('справк') ||
        ((msg as any).attachment?.url && (msg as any).attachment?.type !== 'audio' && !(msg as any).attachment?.type?.startsWith('audio/')) ||
        (msg as any).image ||
        msg.thread?.some(t => Boolean((t.attachment?.url && t.attachment?.type !== 'audio' && !t.attachment?.type?.startsWith('audio/')) || t.image))
    );
    if (hasFiles) {
        return { key: 'certificates', label: '📄 Справка', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }

    // 3. Requests / Trials (Заявки: пробная тренировка, smart match, заявка)
    const isLeadOrTrial = Boolean(
        msg.category === 'trial' ||
        msg.category === 'lead' ||
        subj.includes('заявк') ||
        subj.includes('пробн') ||
        text.includes('заявк') ||
        text.includes('пробн')
    );
    if (isLeadOrTrial) {
        return { key: 'requests', label: '⚽ Заявка', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }

    // 4. Default: Chat (regular questions from parents)
    return { key: 'chat', label: '💬 Чат', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
};

// Helper to format clean {Parent} · {Child} without redundant nested brackets
export const formatCardNames = (rawName?: string, rawChildName?: string): string => {
    let parent = (rawName || '').trim();
    let child = (rawChildName || '').trim();

    // If parent string contains brackets like "Кирдин Сергей ( Кирдин Филипп )"
    const match = parent.match(/^(.*?)\s*[\(\[]+(.*?)[\)\]]+\s*$/);
    if (match) {
        parent = match[1].trim();
        if (!child) {
            child = match[2].trim();
        }
    }

    // Clean any residual brackets in child name
    child = child.replace(/[\(\)\[\]]/g, '').trim();

    // Filter service placeholder keywords
    const lowerChild = child.toLowerCase();
    if (!child || lowerChild === 'undefined' || lowerChild === 'спортсмен' || lowerChild === 'спортсмен спарта' || lowerChild === 'null') {
        child = '';
    }

    // If child and parent are identical
    if (child && parent.toLowerCase() === child.toLowerCase()) {
        return parent;
    }

    // If parent already contains child name
    if (child && parent.toLowerCase().includes(child.toLowerCase())) {
        return parent;
    }

    if (parent && child) {
        return `${parent} · ${child}`;
    }

    return parent || child || 'Пользователь';
};

// Build unified chronological message list
export const buildChatThread = (msg: Message): { item: MessageHistory; threadIndex: number }[] => {
    const list: { item: MessageHistory; threadIndex: number }[] = [];

    // Initial parent message if present
    if (msg.message || (msg as any).attachment || (msg as any).image) {
        const firstInThread = msg.thread?.[0];
        const isDuplicate = firstInThread && firstInThread.text === msg.message && firstInThread.sender === 'user';
        if (!isDuplicate) {
            list.push({
                item: {
                    text: msg.message || '',
                    sender: 'user',
                    senderName: msg.name || 'Родитель',
                    createdAt: msg.createdAt,
                    attachment: (msg as any).attachment || (msg as any).image ? {
                        url: (msg as any).attachment?.url || (msg as any).image,
                        type: (msg as any).attachment?.type || 'image/jpeg',
                        name: (msg as any).attachment?.name || 'Справка / Документ',
                        size: (msg as any).attachment?.size
                    } : undefined,
                    image: (msg as any).image
                },
                threadIndex: -1 // Initial message
            });
        }
    }

    // Thread messages
    if (msg.thread && msg.thread.length > 0) {
        msg.thread.forEach((t, idx) => {
            list.push({ item: t, threadIndex: idx });
        });
    }

    return list;
};

// Helper to highlight matching text in search
export const highlightSearchText = (text: string, queryStr: string, isUserMsg: boolean) => {
    if (!queryStr || !text) return text;
    const clean = queryStr.trim();
    if (!clean) return text;

    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    if (parts.length <= 1) return text;

    return (
        <>
            {parts.map((part, i) => {
                if (part.toLowerCase() === clean.toLowerCase()) {
                    return (
                        <mark
                            key={i}
                            className={`bg-amber-400/30 text-amber-200 rounded px-0.5 ${
                                !isUserMsg ? 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-medium' : ''
                            }`}
                        >
                            {part}
                        </mark>
                    );
                }
                return part;
            })}
        </>
    );
};

export default function AdminMessages() {
    const { userProfile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Messages State
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Filter States: Search + Category Select + Single-Row Status Tabs
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<DialogCategory>('all');
    const [activeTab, setActiveTab] = useState<'inbox' | 'in_progress' | 'resolved'>('inbox');

    // Context Menus State
    const [dialogMenu, setDialogMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
    const [messageMenu, setMessageMenu] = useState<{ x: number; y: number; item: MessageHistory; threadIndex: number } | null>(null);
    const touchTimerRef = useRef<any>(null);
    const msgTouchTimerRef = useRef<any>(null);

    // Quoting / Replying State
    const [replyingTo, setReplyingTo] = useState<{ text: string; senderName: string } | null>(null);

    // Chat Input State
    const [inputText, setInputText] = useState('');
    const [attachment, setAttachment] = useState<{ file: globalThis.File; preview: string; type: string; name: string; size: number } | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Canned Responses & Typing State
    const [isCannedOpen, setIsCannedOpen] = useState(false);
    const [selectedCannedIndex, setSelectedCannedIndex] = useState(0);
    const [dbTemplates, setDbTemplates] = useState<CannedResponse[]>([]);
    const cannedMenuRef = useRef<HTMLDivElement>(null);
    const zapButtonRef = useRef<HTMLButtonElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingAdminTimeoutRef = useRef<any>(null);

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

    // Context & Sick Leave
    const [selectedChildContext, setSelectedChildContext] = useState<any>(null);
    const [isExtendingSub, setIsExtendingSub] = useState(false);

    // SpartaViewer Modal
    const [viewerFile, setViewerFile] = useState<SpartaViewerFile | null>(null);

    // Active Dialog
    const activeMessage = messages.find(m => m.id === selectedId) || null;

    // Search within Active Dialog
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [highlightedMsgIdx, setHighlightedMsgIdx] = useState<number | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const pulseTimeoutRef = useRef<any>(null);
    const isSearchOpenRef = useRef(isSearchOpen);
    isSearchOpenRef.current = isSearchOpen;

    // Chat thread for active dialog
    const chatThread = activeMessage ? buildChatThread(activeMessage) : [];
    const cleanSearchQuery = searchQuery.trim().toLowerCase();

    // Matching message indices in chatThread
    const matchingIndices = React.useMemo(() => {
        if (!cleanSearchQuery || !isSearchOpen || !activeMessage) return [];
        const indices: number[] = [];
        chatThread.forEach(({ item }, idx) => {
            const textMatch = item.text && item.text.toLowerCase().includes(cleanSearchQuery);
            const replyMatch = item.replyTo?.text && item.replyTo.text.toLowerCase().includes(cleanSearchQuery);
            if (textMatch || replyMatch) {
                indices.push(idx);
            }
        });
        return indices;
    }, [activeMessage, chatThread, cleanSearchQuery, isSearchOpen]);

    // Scroll to specific message and briefly pulse outline
    const scrollToMatch = (targetThreadIdx: number) => {
        setHighlightedMsgIdx(targetThreadIdx);
        const element = document.getElementById(`chat-msg-${targetThreadIdx}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (pulseTimeoutRef.current) {
            clearTimeout(pulseTimeoutRef.current);
        }
        pulseTimeoutRef.current = setTimeout(() => {
            setHighlightedMsgIdx(null);
        }, 2000);
    };

    const goToNextMatch = () => {
        if (matchingIndices.length === 0) return;
        const next = (currentMatchIndex + 1) % matchingIndices.length;
        setCurrentMatchIndex(next);
        scrollToMatch(matchingIndices[next]);
    };

    const goToPrevMatch = () => {
        if (matchingIndices.length === 0) return;
        const prev = (currentMatchIndex - 1 + matchingIndices.length) % matchingIndices.length;
        setCurrentMatchIndex(prev);
        scrollToMatch(matchingIndices[prev]);
    };

    const handleCloseSearch = () => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setCurrentMatchIndex(0);
        setHighlightedMsgIdx(null);
    };

    // Auto-scroll to first match when search query changes
    useEffect(() => {
        if (!cleanSearchQuery || matchingIndices.length === 0) {
            setCurrentMatchIndex(0);
            setHighlightedMsgIdx(null);
            return;
        }
        setCurrentMatchIndex(0);
        scrollToMatch(matchingIndices[0]);
    }, [cleanSearchQuery, matchingIndices.length]);

    // Reset search, canned menu & typing on switching dialogs
    useEffect(() => {
        handleCloseSearch();
        setIsCannedOpen(false);
        setSelectedCannedIndex(0);
        if (typingAdminTimeoutRef.current) {
            clearTimeout(typingAdminTimeoutRef.current);
            typingAdminTimeoutRef.current = null;
        }
    }, [selectedId]);

    // Clear typing timeout on component unmount
    useEffect(() => {
        return () => {
            if (typingAdminTimeoutRef.current) {
                clearTimeout(typingAdminTimeoutRef.current);
            }
        };
    }, []);

    // Load optional CRM reply templates from Firestore
    useEffect(() => {
        const qTpl = query(collection(db, 'message_templates'), orderBy('title'));
        const unsubscribe = onSnapshot(qTpl, (snap) => {
            const list: CannedResponse[] = snap.docs.map(docSnap => {
                const data = docSnap.data();
                const title = data.title || '';
                const cmd = title.startsWith('/') ? title : `/${title.toLowerCase().replace(/\s+/g, '_')}`;
                return {
                    command: cmd,
                    label: data.title || 'Шаблон',
                    text: data.content || ''
                };
            });
            setDbTemplates(list);
        }, (err) => {
            console.warn('Could not subscribe to message_templates:', err);
        });
        return () => unsubscribe();
    }, []);

    // Combined list of canned responses (base presets + CRM templates)
    const allCannedResponses = React.useMemo(() => {
        const combined = [...BASE_CANNED_RESPONSES];
        dbTemplates.forEach(t => {
            if (!combined.some(c => c.command.toLowerCase() === t.command.toLowerCase())) {
                combined.push(t);
            }
        });
        return combined;
    }, [dbTemplates]);

    // Query text typed after '/'
    const cannedFilterQuery = React.useMemo(() => {
        if (inputText.startsWith('/')) {
            const match = inputText.match(/^\/([^\s]*)/);
            return match ? match[1].toLowerCase() : '';
        }
        return '';
    }, [inputText]);

    // Filtered templates based on input query
    const filteredCannedResponses = React.useMemo(() => {
        if (!cannedFilterQuery) {
            return allCannedResponses;
        }
        return allCannedResponses.filter(item => {
            const cleanCmd = item.command.replace(/^\//, '').toLowerCase();
            const cleanLabel = item.label.toLowerCase();
            const cleanText = item.text.toLowerCase();
            return cleanCmd.includes(cannedFilterQuery) ||
                   cleanLabel.includes(cannedFilterQuery) ||
                   cleanText.includes(cannedFilterQuery);
        });
    }, [allCannedResponses, cannedFilterQuery]);

    // Keep selected index within valid range
    useEffect(() => {
        if (selectedCannedIndex >= filteredCannedResponses.length) {
            setSelectedCannedIndex(Math.max(0, filteredCannedResponses.length - 1));
        }
    }, [filteredCannedResponses.length, selectedCannedIndex]);

    // Admin typing indicator logic with 2.2s debounce
    const handleAdminTyping = (text: string) => {
        if (!selectedId) return;

        updateDoc(doc(db, "messages", selectedId), {
            "isTyping.admin": true,
            "typing.admin": true
        }).catch(() => {});

        if (typingAdminTimeoutRef.current) {
            clearTimeout(typingAdminTimeoutRef.current);
        }

        typingAdminTimeoutRef.current = setTimeout(() => {
            if (selectedId) {
                updateDoc(doc(db, "messages", selectedId), {
                    "isTyping.admin": false,
                    "typing.admin": false
                }).catch(() => {});
            }
        }, 2200);
    };

    // Handle typing in input with slash detection
    const handleAdminInputChange = (val: string) => {
        setInputText(val);

        if (val.startsWith('/')) {
            setIsCannedOpen(true);
            setSelectedCannedIndex(0);
        } else if (isCannedOpen && !val.includes('/')) {
            setIsCannedOpen(false);
        }

        handleAdminTyping(val);
    };

    // Select canned response
    const handleSelectCanned = (canned: CannedResponse) => {
        let newText = canned.text;
        if (inputText.startsWith('/')) {
            const remainder = inputText.replace(/^\/[^\s]*\s*/, '');
            newText = remainder ? `${canned.text} ${remainder}` : canned.text;
        }
        setInputText(newText);
        setIsCannedOpen(false);
        setSelectedCannedIndex(0);

        handleAdminTyping(newText);

        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const len = newText.length;
                textareaRef.current.setSelectionRange(len, len);
            }
        }, 30);
    };

    // Toggle canned menu via Zap button
    const handleToggleCanned = () => {
        setIsCannedOpen(prev => {
            const next = !prev;
            if (next) {
                setSelectedCannedIndex(0);
                setTimeout(() => textareaRef.current?.focus(), 30);
            }
            return next;
        });
    };

    // Keyboard Shortcuts: Ctrl+F / Cmd+F to open search
    useEffect(() => {
        const handleSearchShortcut = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А')) {
                if (selectedId) {
                    e.preventDefault();
                    setIsSearchOpen(true);
                    setTimeout(() => {
                        searchInputRef.current?.focus();
                        searchInputRef.current?.select();
                    }, 50);
                }
            }
        };

        window.addEventListener('keydown', handleSearchShortcut);
        return () => window.removeEventListener('keydown', handleSearchShortcut);
    }, [selectedId]);

    // Smart screen boundaries for popovers (never overflows screen)
    const getSmartCoordinates = (clientX: number, clientY: number, width = 220, height = 210) => {
        let x = clientX;
        let y = clientY;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        if (x + width > screenW - 12) {
            x = screenW - width - 12;
        }
        if (y + height > screenH - 12) {
            y = screenH - height - 12;
        }
        return { x: Math.max(12, x), y: Math.max(12, y) };
    };

    // Close context menus & canned responses on outside click, scroll or Escape key
    useEffect(() => {
        const handleCloseMenus = (e?: MouseEvent) => {
            setDialogMenu(null);
            setMessageMenu(null);
            if (e) {
                const target = e.target as Node;
                const insideCanned = cannedMenuRef.current?.contains(target);
                const insideZap = zapButtonRef.current?.contains(target);
                if (!insideCanned && !insideZap) {
                    setIsCannedOpen(false);
                }
            } else {
                setIsCannedOpen(false);
            }
        };

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isSearchOpenRef.current) {
                    handleCloseSearch();
                }
                setIsCannedOpen(false);
                setDialogMenu(null);
                setMessageMenu(null);
            }
        };

        window.addEventListener('mousedown', handleCloseMenus);
        window.addEventListener('scroll', () => handleCloseMenus(), true);
        window.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            window.removeEventListener('mousedown', handleCloseMenus);
            window.removeEventListener('scroll', () => handleCloseMenus(), true);
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, []);

    // 1. Listen to Messages Collection
    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: Message[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as Message));
            setMessages(msgs);
            setLoading(false);

            // Deep-link from URL param
            const params = new URLSearchParams(location.search);
            const threadId = params.get('id');
            if (threadId) {
                setSelectedId(threadId);
            } else if (!selectedId && msgs.length > 0 && window.innerWidth >= 768) {
                // Select first conversation by default on desktop
                setSelectedId(msgs[0].id);
            }
        }, (err) => {
            console.error("Error fetching messages:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [location.search]);

    // 2. Fetch Athlete Profile Context
    useEffect(() => {
        if (!activeMessage) {
            setSelectedChildContext(null);
            return;
        }

        // Try by childId
        if (activeMessage.childId) {
            const unsub = onSnapshot(doc(db, "users", activeMessage.childId), (snap) => {
                if (snap.exists()) {
                    setSelectedChildContext({ id: snap.id, ...snap.data() });
                } else {
                    setSelectedChildContext(null);
                }
            }, () => setSelectedChildContext(null));
            return () => unsub();
        }

        // Try by childName
        if (activeMessage.childName) {
            const qChild = query(collection(db, "users"), where("childName", "==", activeMessage.childName));
            getDocs(qChild).then((snap) => {
                if (!snap.empty) {
                    setSelectedChildContext({ id: snap.docs[0].id, ...snap.docs[0].data() });
                } else {
                    getDocs(query(collection(db, "users"), where("displayName", "==", activeMessage.childName)))
                        .then((dSnap) => {
                            if (!dSnap.empty) {
                                setSelectedChildContext({ id: dSnap.docs[0].id, ...dSnap.docs[0].data() });
                            } else {
                                setSelectedChildContext(null);
                            }
                        })
                        .catch(() => setSelectedChildContext(null));
                }
            }).catch(() => setSelectedChildContext(null));
            return;
        }

        // Fallback to userId
        if (activeMessage.userId) {
            const unsub = onSnapshot(doc(db, "users", activeMessage.userId), (snap) => {
                if (snap.exists()) {
                    setSelectedChildContext({ id: snap.id, ...snap.data() });
                } else {
                    setSelectedChildContext(null);
                }
            }, () => setSelectedChildContext(null));
            return () => unsub();
        }

        setSelectedChildContext(null);
    }, [activeMessage?.id, activeMessage?.childId, activeMessage?.childName, activeMessage?.userId]);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (selectedId && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedId, activeMessage?.thread?.length]);

    // Format card time
    const formatCardTime = (ts?: Timestamp) => {
        if (!ts) return '';
        const d = ts.toDate();
        if (isToday(d)) return format(d, 'HH:mm');
        if (isYesterday(d)) return 'Вчера';
        return format(d, 'd MMM', { locale: ru });
    };

    // Helper to get preview of last message
    const getLastMessageText = (msg: Message) => {
        if (msg.thread && msg.thread.length > 0) {
            const last = msg.thread[msg.thread.length - 1];
            if (
                last.attachment?.type === 'audio' ||
                last.attachment?.type?.startsWith('audio/') ||
                last.attachment?.name?.toLowerCase().includes('голосовое')
            ) {
                return '🎤 Голосовое сообщение';
            }
            return last.text || (last.attachment ? '📎 Вложение' : (last.image ? '📷 Фотография' : 'Сообщение'));
        }
        return msg.message || '—';
    };

    // Helper: is sick leave
    const isSickLeave = (msg: Message | null) => {
        if (!msg) return false;
        return (
            msg.category === 'sick_leave' ||
            (msg as any).isSickLeave === true ||
            msg.subject?.toLowerCase().includes('справк') ||
            msg.message?.toLowerCase().includes('справк')
        );
    };

    // Get Status Dot color
    const getStatusDot = (status: string) => {
        switch (status) {
            case 'new':
                return 'bg-amber-400 ring-2 ring-amber-400/20';
            case 'waiting':
                return 'bg-blue-400 ring-2 ring-blue-400/20';
            case 'in_progress':
                return 'bg-sparta-gold ring-2 ring-sparta-gold/20';
            case 'resolved':
                return 'bg-emerald-400 ring-2 ring-emerald-400/20';
            default:
                return 'bg-gray-400';
        }
    };

    // Update status in Firestore & local state
    const handleUpdateStatus = async (id: string, newStatus: 'in_progress' | 'waiting' | 'resolved' | 'new') => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
        try {
            await updateDoc(doc(db, "messages", id), { 
                status: newStatus,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Status update error:", err);
        }
    };

    // Toggle Pin Dialog
    const handleTogglePin = async (id: string, currentPinned: boolean) => {
        const nextPinned = !currentPinned;
        setMessages(prev => prev.map(m => m.id === id ? { ...m, isPinned: nextPinned } : m));
        try {
            await updateDoc(doc(db, "messages", id), { isPinned: nextPinned });
        } catch (err) {
            console.error("Pin toggle error:", err);
        }
    };

    // Delete Dialog
    const handleDeleteDialog = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот диалог?')) return;
        setMessages(prev => prev.filter(m => m.id !== id));
        if (selectedId === id) setSelectedId(null);
        try {
            await deleteDoc(doc(db, "messages", id));
        } catch (err) {
            console.error("Delete dialog error:", err);
        }
    };

    // Delete Single Message from Thread (if admin)
    const handleDeleteMessage = async (threadIdx: number) => {
        if (!activeMessage || !activeMessage.thread) return;
        if (!window.confirm('Удалить это сообщение?')) return;

        const updatedThread = activeMessage.thread.filter((_, idx) => idx !== threadIdx);
        setMessages(prev => prev.map(m => m.id === activeMessage.id ? { ...m, thread: updatedThread } : m));

        try {
            await updateDoc(doc(db, "messages", activeMessage.id), {
                thread: updatedThread
            });
        } catch (err) {
            console.error("Error deleting message:", err);
        }
    };

    // Context Menu Handlers for Dialog Cards
    const openDialogContextMenu = (clientX: number, clientY: number, msg: Message) => {
        const coords = getSmartCoordinates(clientX, clientY, 220, 230);
        setMessageMenu(null);
        setDialogMenu({
            x: coords.x,
            y: coords.y,
            msg
        });
    };

    const handleDialogContextMenu = (e: React.MouseEvent, msg: Message) => {
        e.preventDefault();
        openDialogContextMenu(e.clientX, e.clientY, msg);
    };

    const handleDialogTouchStart = (e: React.TouchEvent, msg: Message) => {
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        touchTimerRef.current = setTimeout(() => {
            openDialogContextMenu(clientX, clientY, msg);
        }, 500);
    };

    const handleDialogTouchEndOrMove = () => {
        if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
        }
    };

    // Context Menu Handlers for Messages
    const openMessageContextMenu = (clientX: number, clientY: number, item: MessageHistory, threadIndex: number) => {
        const coords = getSmartCoordinates(clientX, clientY, 200, 160);
        setDialogMenu(null);
        setMessageMenu({
            x: coords.x,
            y: coords.y,
            item,
            threadIndex
        });
    };

    const handleMessageContextMenu = (e: React.MouseEvent, item: MessageHistory, threadIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        openMessageContextMenu(e.clientX, e.clientY, item, threadIndex);
    };

    const handleMsgTouchStart = (e: React.TouchEvent, item: MessageHistory, threadIndex: number) => {
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        msgTouchTimerRef.current = setTimeout(() => {
            openMessageContextMenu(clientX, clientY, item, threadIndex);
        }, 500);
    };

    const handleMsgTouchEndOrMove = () => {
        if (msgTouchTimerRef.current) {
            clearTimeout(msgTouchTimerRef.current);
            msgTouchTimerRef.current = null;
        }
    };

    // Counts for the 3 Status Tabs
    const countInbox = messages.filter(m => m.status === 'new' || (m.status as string) === 'open' || !m.status).length;
    const countInProgress = messages.filter(m => m.status === 'in_progress' || m.status === 'waiting').length;
    const countResolved = messages.filter(m => m.status === 'resolved').length;

    // Filter messages for left list
    const filteredMessages = messages.filter(msg => {
        // 1. Search filter
        const term = searchTerm.trim().toLowerCase();
        if (term) {
            const matchesParent = msg.name?.toLowerCase().includes(term);
            const matchesChild = msg.childName?.toLowerCase().includes(term);
            const matchesSubject = msg.subject?.toLowerCase().includes(term);
            const matchesMessage = msg.message?.toLowerCase().includes(term);
            const matchesPhone = msg.phone?.includes(term);
            const matchesEmail = msg.email?.toLowerCase().includes(term);
            if (!matchesParent && !matchesChild && !matchesSubject && !matchesMessage && !matchesPhone && !matchesEmail) {
                return false;
            }
        }

        // 2. Category filter
        if (selectedCategory !== 'all') {
            const cat = getDialogCategory(msg);
            if (cat.key !== selectedCategory) {
                return false;
            }
        }

        // 3. Single-row Status Tab filter
        if (activeTab === 'inbox') {
            return msg.status === 'new' || (msg.status as string) === 'open' || !msg.status;
        }
        if (activeTab === 'in_progress') {
            return msg.status === 'in_progress' || msg.status === 'waiting';
        }
        if (activeTab === 'resolved') {
            return msg.status === 'resolved';
        }
        return true;
    });

    // Pinned dialogs sorted to the top, then newest first
    const sortedMessages = [...filteredMessages].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
    });

    // Extend subscription by 7 days for sick leave
    const handleExtendSubscription7Days = async (msg: Message) => {
        if (!msg) return;
        const targetAthlete = selectedChildContext;
        const athleteId = msg.childId || targetAthlete?.id;

        if (!athleteId) {
            alert('Не удалось определить ID спортсмена. Проверьте карточку в базе пользователей.');
            return;
        }

        setIsExtendingSub(true);
        try {
            const currentSub = targetAthlete?.subscription || {};
            const currentExp = currentSub.expiresAt || currentSub.endDate;
            let baseMs = Date.now();
            if (currentExp) {
                const sec = currentExp.seconds ? currentExp.seconds : (new Date(currentExp).getTime() / 1000);
                if (sec > 0 && sec * 1000 > Date.now()) {
                    baseMs = sec * 1000;
                }
            }
            const newExpDate = new Date(baseMs + 7 * 24 * 60 * 60 * 1000);
            const formattedDate = format(newExpDate, 'dd.MM.yyyy');
            const athleteName = msg.childName || targetAthlete?.childName || targetAthlete?.displayName || 'спортсмена';

            const updatedSubscription = {
                ...currentSub,
                title: currentSub.title || 'Стандартный',
                status: 'active',
                expiresAt: Timestamp.fromDate(newExpDate),
                endDate: format(newExpDate, 'yyyy-MM-dd'),
                isFrozen: false,
                frozenUntil: null
            };

            // 1. Update user record in Firestore
            await updateDoc(doc(db, "users", athleteId), {
                subscription: updatedSubscription
            });

            setSelectedChildContext((prev: any) => prev ? { ...prev, subscription: updatedSubscription } : prev);

            // 2. Add system note into thread
            const systemMsg: MessageHistory = {
                text: `✅ Справка о болезни проверена администратором. Абонемент спортсмена ${athleteName} успешно продлён на 7 дней (новый срок действия до ${formattedDate}). Ждём на тренировках!`,
                sender: 'admin',
                senderName: userProfile?.displayName || 'Администрация клуба Sparta',
                senderRole: 'admin',
                createdAt: Timestamp.now(),
                isRead: false
            };

            // 3. Mark ticket resolved
            await updateDoc(doc(db, "messages", msg.id), {
                status: 'resolved',
                thread: arrayUnion(systemMsg),
                moderatedAt: serverTimestamp(),
                moderatedBy: userProfile?.displayName || 'Администратор'
            });

            // 4. Send notification to parent
            if (msg.userId) {
                await addDoc(collection(db, 'notifications'), {
                    userId: msg.userId,
                    email: msg.email || '',
                    title: '✅ Справка о болезни принята',
                    message: `Медицинская справка для ${athleteName} проверена. Абонемент успешно продлён на 7 дней (до ${formattedDate}).`,
                    type: 'subscription_extended',
                    createdAt: serverTimestamp(),
                    read: false,
                    link: '/profile?tab=messages'
                });
            }

            alert(`✅ Справка принята! Абонемент ${athleteName} успешно продлён на 7 дней (до ${formattedDate}).`);
        } catch (err: any) {
            console.error('Error extending subscription:', err);
            alert('Ошибка при продлении: ' + (err?.message || 'Попробуйте снова'));
        } finally {
            setIsExtendingSub(false);
        }
    };

    // File Selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachment({
                file,
                preview: reader.result as string,
                type: file.type,
                name: file.name,
                size: file.size
            });
        };
        reader.readAsDataURL(file);
    };

    // Upload File
    const uploadFile = async (messageId: string, file: globalThis.File): Promise<{ url: string; type: string; name: string; size: number }> => {
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
                throw new Error(error.error || 'Failed to upload file');
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
        } catch (err) {
            console.warn("Media proxy upload failed, falling back to data URL:", err);
            return new Promise((resolve) => {
                const r = new FileReader();
                r.onloadend = () => {
                    resolve({
                        url: r.result as string,
                        type: file.type,
                        name: file.name,
                        size: file.size
                    });
                };
                r.readAsDataURL(file);
            });
        }
    };

    // Send Message
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!inputText.trim() && !attachment) || !selectedId || !activeMessage) return;

        const currentText = inputText.trim();
        const currentAttachment = attachment;
        const currentReply = replyingTo;

        playSendSound();

        if (typingAdminTimeoutRef.current) {
            clearTimeout(typingAdminTimeoutRef.current);
            typingAdminTimeoutRef.current = null;
        }
        setIsCannedOpen(false);

        setInputText('');
        setAttachment(null);
        setReplyingTo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        try {
            let attachmentData = null;
            if (currentAttachment) {
                setUploadProgress(20);
                attachmentData = await uploadFile(selectedId, currentAttachment.file);
            }

            const newMsg: MessageHistory = {
                text: currentText,
                sender: 'admin',
                senderName: auth.currentUser?.displayName || userProfile?.displayName || 'Администратор',
                senderRole: userProfile?.role || 'admin',
                createdAt: Timestamp.now(),
                isRead: false,
                ...(currentReply && { replyTo: currentReply }),
                ...(attachmentData && { attachment: attachmentData }),
                ...(attachmentData?.type?.startsWith('image/') && { image: attachmentData.url })
            };

            // Automatic status transition to 'in_progress'
            const shouldAutoProgress = activeMessage.status === 'new' || (activeMessage.status as string) === 'open' || activeMessage.status === 'waiting';
            const nextStatus = shouldAutoProgress ? 'in_progress' : activeMessage.status;

            // Optimistic update
            setMessages(prev => prev.map(m => m.id === selectedId ? {
                ...m,
                status: nextStatus,
                thread: [...(m.thread || []), newMsg]
            } : m));

            // Update ticket in Firestore
            await updateDoc(doc(db, "messages", selectedId), {
                thread: arrayUnion(newMsg),
                status: nextStatus,
                isReadByUser: false,
                "isTyping.admin": false,
                "typing.admin": false
            });

            // Send notification to user
            if (activeMessage.email || activeMessage.userId) {
                addDoc(collection(db, "notifications"), {
                    userId: activeMessage.userId || '',
                    email: activeMessage.email || '',
                    type: 'request',
                    title: 'Новый ответ от поддержки',
                    message: `Вы получили ответ на обращение: ${activeMessage.subject}`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                    relatedId: selectedId
                }).catch(() => {});
            }
        } catch (err: any) {
            console.error("Error sending message:", err);
            alert('Ошибка отправки: ' + (err?.message || 'Попробуйте снова'));
        } finally {
            setUploadProgress(null);
        }
    };

    // Send Voice Message (Admin)
    const handleSendVoiceAdmin = async () => {
        if (!selectedId || !activeMessage || isSendingVoice) return;
        setIsSendingVoice(true);
        try {
            const recorded = await stopRecording();
            if (!recorded) return;

            playSendSound();

            let uploadedAttachment = null;
            try {
                uploadedAttachment = await uploadFile(selectedId, recorded.file);
            } catch {
                uploadedAttachment = {
                    url: recorded.url,
                    type: recorded.file.type || 'audio/webm',
                    name: recorded.file.name,
                    size: recorded.blob.size
                };
            }

            const newMsg: MessageHistory = {
                text: '',
                sender: 'admin',
                senderName: auth.currentUser?.displayName || userProfile?.displayName || 'Администратор',
                senderRole: userProfile?.role || 'admin',
                createdAt: Timestamp.now(),
                isRead: false,
                ...(replyingTo && { replyTo: replyingTo }),
                attachment: {
                    url: uploadedAttachment.url,
                    type: 'audio',
                    name: `Голосовое сообщение (${formatAudioDuration(recorded.duration)})`,
                    duration: recorded.duration,
                    size: recorded.blob.size,
                    transcription: recorded.transcription || ''
                }
            };

            setReplyingTo(null);

            // Automatic status transition to 'in_progress'
            const shouldAutoProgress = activeMessage.status === 'new' || (activeMessage.status as string) === 'open' || activeMessage.status === 'waiting';
            const nextStatus = shouldAutoProgress ? 'in_progress' : activeMessage.status;

            // Optimistic update
            setMessages(prev => prev.map(m => m.id === selectedId ? {
                ...m,
                status: nextStatus,
                thread: [...(m.thread || []), newMsg]
            } : m));

            // Update ticket in Firestore
            if (typingAdminTimeoutRef.current) {
                clearTimeout(typingAdminTimeoutRef.current);
                typingAdminTimeoutRef.current = null;
            }
            await updateDoc(doc(db, "messages", selectedId), {
                thread: arrayUnion(newMsg),
                status: nextStatus,
                isReadByUser: false,
                "isTyping.admin": false,
                "typing.admin": false
            });

            // Send notification to user
            if (activeMessage.email || activeMessage.userId) {
                addDoc(collection(db, "notifications"), {
                    userId: activeMessage.userId || '',
                    email: activeMessage.email || '',
                    type: 'request',
                    title: 'Новый ответ от поддержки',
                    message: `Вы получили голосовое сообщение в обращении: ${activeMessage.subject}`,
                    isRead: false,
                    createdAt: serverTimestamp(),
                    relatedId: selectedId
                }).catch(() => {});
            }
        } catch (err: any) {
            console.error("Voice reply admin error:", err);
            alert('Ошибка при отправке голосового сообщения');
        } finally {
            setIsSendingVoice(false);
        }
    };

    // Enter to send or navigate canned responses
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (isCannedOpen && filteredCannedResponses.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedCannedIndex(prev => (prev + 1) % filteredCannedResponses.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedCannedIndex(prev => (prev - 1 + filteredCannedResponses.length) % filteredCannedResponses.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectCanned(filteredCannedResponses[selectedCannedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsCannedOpen(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Format Child & Group Header Info
    const getChildHeaderInfo = () => {
        if (!activeMessage) return '';
        const childName = activeMessage.childName || selectedChildContext?.childName || selectedChildContext?.displayName;
        if (!childName) return '';

        // Try extracting birth year
        const birthDateStr = selectedChildContext?.childBirthDate || selectedChildContext?.birthDate || '';
        let birthYear = selectedChildContext?.birthYear || '';
        if (!birthYear && birthDateStr) {
            const match = birthDateStr.match(/\d{4}/);
            if (match) birthYear = match[0];
        }

        // Try extracting group
        const group = activeMessage.groupName || selectedChildContext?.groupName || selectedChildContext?.group;

        if (birthYear && group) {
            return `${childName} (${birthYear} г.р. · ${group})`;
        }
        if (birthYear) {
            return `${childName} (${birthYear} г.р.)`;
        }
        if (group) {
            return `${childName} (${group})`;
        }
        return childName;
    };

    // Open attachment in SpartaViewer
    const openInViewer = (url: string, name?: string, type?: string) => {
        const cleanName = name || (url.split('/').pop()?.split('?')[0]) || 'Документ';
        let detectedType = type;
        if (!detectedType) {
            const ext = cleanName.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext || '')) detectedType = 'image/jpeg';
            else if (ext === 'pdf') detectedType = 'application/pdf';
            else detectedType = 'application/octet-stream';
        }
        setViewerFile({
            url,
            name: cleanName,
            type: detectedType
        });
    };

    return (
        <div className="font-manrope h-[calc(100vh-theme(spacing.16))] flex flex-col min-h-0 text-white select-none relative">
            {/* Main 2-Column Container */}
            <div className="flex-1 flex overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl min-h-0">
                
                {/* ======================================================== */}
                {/* 1. LEFT COLUMN (35% width, fixed list from top to bottom) */}
                {/* ======================================================== */}
                <div className={`w-full md:w-[35%] lg:w-[32%] xl:w-[30%] flex flex-col border-r border-white/10 bg-[#151515] min-w-[300px] shrink-0 min-h-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* Top Search + Category Select Bar */}
                    <div className="p-3 pb-2.5 border-b border-white/10 shrink-0 space-y-2">
                        <div className="flex items-center gap-2">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Поиск по диалогам..."
                                    className="w-full bg-[#202020] border border-white/10 rounded-xl pl-9 pr-7 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sparta-gold transition-colors"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Category Select Dropdown */}
                            <div className="relative shrink-0">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value as DialogCategory)}
                                    className="bg-[#202020] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs text-gray-200 focus:outline-none focus:border-sparta-gold transition-colors appearance-none cursor-pointer font-medium hover:bg-white/5"
                                >
                                    <option value="all" className="bg-[#1b1b1b] text-white">Все категории</option>
                                    <option value="requests" className="bg-[#1b1b1b] text-white">⚽ Пробные заявки</option>
                                    <option value="certificates" className="bg-[#1b1b1b] text-white">📄 Справки</option>
                                    <option value="chat" className="bg-[#1b1b1b] text-white">💬 Вопросы родителей</option>
                                    <option value="bot" className="bg-[#1b1b1b] text-white">🤖 Чат-бот</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Single Row Status Tabs: [ 🔥 Входящие (N) ] [ В работе (N) ] [ Решённые (N) ] */}
                    <div className="p-2 border-b border-white/5 bg-[#121212] shrink-0">
                        <div className="grid grid-cols-3 gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-white/5 text-xs font-medium">
                            <button
                                onClick={() => setActiveTab('inbox')}
                                className={`py-1.5 px-1 rounded-lg text-center transition-all truncate flex items-center justify-center gap-1 ${
                                    activeTab === 'inbox' 
                                        ? 'bg-sparta-gold text-black font-semibold shadow' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <span>🔥 Входящие</span>
                                {countInbox > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        activeTab === 'inbox' ? 'bg-black/20 text-black' : 'bg-amber-400/20 text-amber-300'
                                    }`}>
                                        {countInbox}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('in_progress')}
                                className={`py-1.5 px-1 rounded-lg text-center transition-all truncate flex items-center justify-center gap-1 ${
                                    activeTab === 'in_progress' 
                                        ? 'bg-sparta-gold text-black font-semibold shadow' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <span>В работе</span>
                                <span className={`text-[10px] ${activeTab === 'in_progress' ? 'text-black/80' : 'text-gray-500'}`}>
                                    ({countInProgress})
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('resolved')}
                                className={`py-1.5 px-1 rounded-lg text-center transition-all truncate flex items-center justify-center gap-1 ${
                                    activeTab === 'resolved' 
                                        ? 'bg-sparta-gold text-black font-semibold shadow' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <span>Решённые</span>
                                <span className={`text-[10px] ${activeTab === 'resolved' ? 'text-black/80' : 'text-gray-500'}`}>
                                    ({countResolved})
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Cards List (Fixed vertical scrolling, NO ACCORDIONS) */}
                    <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-sparta-gold" />
                                <span className="text-xs">Загрузка обращений...</span>
                            </div>
                        ) : sortedMessages.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-xs">
                                Обращений не найдено
                            </div>
                        ) : (
                            sortedMessages.map(msg => {
                                const isSelected = selectedId === msg.id;
                                const formattedTitle = formatCardNames(msg.name, msg.childName);
                                const catInfo = getDialogCategory(msg);

                                return (
                                    <div
                                        key={msg.id}
                                        onClick={() => setSelectedId(msg.id)}
                                        onContextMenu={(e) => handleDialogContextMenu(e, msg)}
                                        onTouchStart={(e) => handleDialogTouchStart(e, msg)}
                                        onTouchEnd={handleDialogTouchEndOrMove}
                                        onTouchMove={handleDialogTouchEndOrMove}
                                        className={`p-3.5 cursor-pointer transition-colors border-l-4 relative select-none ${
                                            isSelected 
                                                ? 'bg-sparta-gold/15 border-l-sparta-gold text-white' 
                                                : 'border-l-transparent hover:bg-white/5 text-gray-300'
                                        }`}
                                    >
                                        {/* Line 1: Clean Formatted Name (Parent · Child) + Time & Status Dot */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {msg.isPinned && (
                                                    <span title="Закреплённый диалог" className="shrink-0 flex items-center">
                                                        <Pin className="w-3 h-3 text-sparta-gold fill-current" />
                                                    </span>
                                                )}
                                                <span className="font-semibold text-xs sm:text-sm text-white truncate" title={formattedTitle}>
                                                    {formattedTitle}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[11px] text-gray-400 font-mono">
                                                    {formatCardTime(msg.createdAt)}
                                                </span>
                                                <span className={`w-2 h-2 rounded-full ${getStatusDot(msg.status)}`} />
                                            </div>
                                        </div>

                                        {/* Line 2: Category Badge & Subject */}
                                        <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${catInfo.color}`}>
                                                {catInfo.label}
                                            </span>
                                            <span className="text-xs font-medium text-white/90 truncate">
                                                {msg.subject || 'Обращение'}
                                            </span>
                                        </div>

                                        {/* Line 3: Last Message snippet strictly in 1 clean line */}
                                        {msg.isTyping?.user || (msg as any).typing?.user ? (
                                            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse truncate">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 inline-block animate-ping" />
                                                печатает...
                                            </p>
                                        ) : (
                                            <p className="line-clamp-1 text-xs text-neutral-400 truncate">
                                                {getLastMessageText(msg)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 2. RIGHT COLUMN (65% width, чистый чат)                  */}
                {/* ======================================================== */}
                <div className={`flex-1 flex flex-col min-w-0 bg-[#0e0e0e] min-h-0 ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
                    
                    {!activeMessage ? (
                        // Empty State
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sparta-gold/50 mb-3 shadow-inner">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-300 mb-1">Выберите диалог</h3>
                            <p className="text-xs text-gray-500 max-w-sm">
                                Выберите обращение из списка слева, чтобы начать переписку с родителем.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* --- HEADER --- */}
                            <div className="p-3.5 px-4 border-b border-white/10 bg-[#161616] flex items-center justify-between gap-3 shrink-0">
                                
                                {/* Mobile Back Button + Title Info */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                        onClick={() => setSelectedId(null)}
                                        className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>

                                    <div className="min-w-0">
                                        {/* Parent Name · Child (Group) */}
                                        <h2 className="text-sm sm:text-base font-semibold text-white truncate flex items-center gap-1.5">
                                            <span>{activeMessage.name}</span>
                                            {getChildHeaderInfo() && (
                                                <span className="text-sparta-gold font-normal truncate">
                                                    · {getChildHeaderInfo()}
                                                </span>
                                            )}
                                        </h2>

                                        {/* Phone for calling or typing indicator */}
                                        {activeMessage.isTyping?.user || (activeMessage as any).typing?.user ? (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 animate-pulse">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 inline-block animate-ping" />
                                                    печатает...
                                                </span>
                                                {activeMessage.phone && <span className="text-white/20">•</span>}
                                                {activeMessage.phone && (
                                                    <a
                                                        href={`tel:${activeMessage.phone}`}
                                                        className="inline-flex items-center gap-1.5 text-sparta-gold/80 hover:text-sparta-gold hover:underline font-mono text-xs"
                                                        title="Позвонить родителю"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        <span>{activeMessage.phone}</span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                                                {activeMessage.phone ? (
                                                    <a
                                                        href={`tel:${activeMessage.phone}`}
                                                        className="inline-flex items-center gap-1.5 text-sparta-gold hover:underline font-mono"
                                                        title="Позвонить родителю"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                        <span>{activeMessage.phone}</span>
                                                    </a>
                                                ) : activeMessage.email ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-400">
                                                        <Mail className="w-3 h-3" />
                                                        <span>{activeMessage.email}</span>
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Actions in Header */}
                                <div className="flex items-center gap-2 shrink-0">
                                    
                                    {/* Prominent Sick Leave Extension Button */}
                                    {isSickLeave(activeMessage) && (
                                        <button
                                            onClick={() => handleExtendSubscription7Days(activeMessage)}
                                            disabled={isExtendingSub}
                                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-sparta-gold hover:from-amber-400 hover:to-yellow-300 text-black font-semibold text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                                            title="Автоматически продлить абонемент на 7 дней и закрыть обращение"
                                        >
                                            {isExtendingSub ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Zap className="w-3.5 h-3.5 fill-current" />
                                            )}
                                            <span className="hidden sm:inline">⚡ Продлить на 7 дней</span>
                                            <span className="sm:hidden">+7 дн.</span>
                                        </button>
                                    )}

                                    {/* In-Dialog Search Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!isSearchOpen) {
                                                setIsSearchOpen(true);
                                                setTimeout(() => {
                                                    searchInputRef.current?.focus();
                                                    searchInputRef.current?.select();
                                                }, 50);
                                            } else {
                                                handleCloseSearch();
                                            }
                                        }}
                                        className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border font-medium text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                                            isSearchOpen
                                                ? 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/40'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
                                        }`}
                                        title="Поиск по сообщениям (Ctrl+F)"
                                    >
                                        <Search className="w-4 h-4" />
                                        <span className="hidden sm:inline">Поиск</span>
                                    </button>

                                    {/* Unified Single Action Button: [ ✅ Завершить диалог ] vs [ ↩️ Вернуть в работу ] */}
                                    {activeMessage.status !== 'resolved' ? (
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(activeMessage.id, 'resolved')}
                                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                                            title="Завершить диалог и переместить в решённые"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>✅ Завершить диалог</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(activeMessage.id, 'in_progress')}
                                            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 font-medium text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                                            title="Вернуть диалог в работу"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            <span>↩️ Вернуть в работу</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* --- COMPACT IN-DIALOG SEARCH STRIP --- */}
                            {isSearchOpen && (
                                <div className="p-2 px-4 border-b border-white/10 bg-[#161616] flex items-center justify-between gap-3 shrink-0">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Search className="w-4 h-4 text-sparta-gold shrink-0" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (e.shiftKey) {
                                                        goToPrevMatch();
                                                    } else {
                                                        goToNextMatch();
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    handleCloseSearch();
                                                }
                                            }}
                                            placeholder="Поиск по сообщениям..."
                                            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Match Counter */}
                                        {searchQuery.trim() ? (
                                            <div className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                                                {matchingIndices.length > 0 ? (
                                                    <span className="text-gray-300">
                                                        <span className="text-sparta-gold font-semibold">{currentMatchIndex + 1}</span> из {matchingIndices.length}
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-400 font-medium">Ничего не найдено</span>
                                                )}
                                            </div>
                                        ) : null}

                                        {/* Navigation Arrows */}
                                        <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
                                            <button
                                                type="button"
                                                onClick={goToPrevMatch}
                                                disabled={matchingIndices.length === 0}
                                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                title="Предыдущее совпадение (Shift+Enter)"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={goToNextMatch}
                                                disabled={matchingIndices.length === 0}
                                                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                                title="Следующее совпадение (Enter)"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Close Search Button */}
                                        <button
                                            type="button"
                                            onClick={handleCloseSearch}
                                            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                            title="Закрыть поиск (Escape)"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- MESSAGE HISTORY STREAM --- */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[#0e0e0e]">
                                {chatThread.map(({ item, threadIndex }, idx) => {
                                    const isUser = item.sender === 'user';
                                    const isSystem = item.senderRole === 'system' || item.senderName?.toLowerCase().includes('система') || item.text?.startsWith('✅');
                                    const timeStr = item.createdAt ? format(item.createdAt.toDate(), 'HH:mm') : '';

                                    const isCurrentMatch = isSearchOpen && matchingIndices.length > 0 && matchingIndices[currentMatchIndex] === idx;
                                    const isPulseActive = highlightedMsgIdx === idx;

                                    // System notification
                                    if (isSystem) {
                                        return (
                                            <div key={idx} id={`chat-msg-${idx}`} className="flex justify-center my-2 transition-all">
                                                <div className={`max-w-md bg-white/5 border border-white/10 rounded-xl px-3.5 py-1.5 text-center text-xs text-gray-300 shadow-sm leading-relaxed transition-all ${
                                                    isCurrentMatch || isPulseActive ? 'ring-2 ring-sparta-gold shadow-lg shadow-sparta-gold/30 animate-pulse' : ''
                                                }`}>
                                                    {isSearchOpen && cleanSearchQuery ? highlightSearchText(item.text, cleanSearchQuery, true) : item.text}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // User message (Left, Dark) or Admin message (Right, Gold)
                                    return (
                                        <div
                                            key={idx}
                                            id={`chat-msg-${idx}`}
                                            className={`flex ${isUser ? 'justify-start' : 'justify-end'} transition-all`}
                                        >
                                            <div
                                                onContextMenu={(e) => handleMessageContextMenu(e, item, threadIndex)}
                                                onTouchStart={(e) => handleMsgTouchStart(e, item, threadIndex)}
                                                onTouchEnd={handleMsgTouchEndOrMove}
                                                onTouchMove={handleMsgTouchEndOrMove}
                                                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3.5 text-sm shadow-md transition-all select-text ${
                                                    isUser
                                                        ? 'bg-[#222222] border border-white/10 text-white rounded-tl-sm hover:border-white/20'
                                                        : 'bg-[#D4AF37] text-black font-normal rounded-tr-sm hover:brightness-105'
                                                } ${
                                                    isCurrentMatch || isPulseActive
                                                        ? isUser
                                                            ? 'ring-2 ring-sparta-gold shadow-lg shadow-sparta-gold/40 animate-pulse'
                                                            : 'ring-2 ring-black shadow-lg shadow-black/40 animate-pulse'
                                                        : ''
                                                }`}
                                            >
                                                {/* Author Name + Time */}
                                                <div className={`flex items-center justify-between gap-4 mb-1 text-[11px] select-none ${
                                                    isUser ? 'text-sparta-gold font-medium' : 'text-black/70 font-semibold'
                                                }`}>
                                                    <span>{isUser ? activeMessage.name : (item.senderName || 'Администратор')}</span>
                                                    <span className="font-mono text-[10px] opacity-75">{timeStr}</span>
                                                </div>

                                                {/* Quoted / Replied Message Banner */}
                                                {item.replyTo && (
                                                    <div className={`mb-2 p-2 rounded-lg border-l-2 text-xs select-none ${
                                                        isUser
                                                            ? 'bg-black/30 border-sparta-gold text-gray-300'
                                                            : 'bg-black/15 border-black text-black/90'
                                                    }`}>
                                                        <div className="font-semibold text-[11px] opacity-90">{item.replyTo.senderName}</div>
                                                        <div className="truncate opacity-75">
                                                            {isSearchOpen && cleanSearchQuery ? highlightSearchText(item.replyTo.text, cleanSearchQuery, isUser) : item.replyTo.text}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Text Content */}
                                                {item.text && (
                                                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                                                        {isSearchOpen && cleanSearchQuery
                                                            ? highlightSearchText(item.text, cleanSearchQuery, isUser)
                                                            : item.text}
                                                    </p>
                                                )}

                                                {/* Image Attachment */}
                                                {(item.image || (item.attachment && item.attachment.type?.startsWith('image/'))) && (
                                                    <div className="mt-2">
                                                        <img
                                                            src={item.image || item.attachment?.url}
                                                            alt="Вложение"
                                                            onClick={() => openInViewer(item.image || item.attachment?.url || '', item.attachment?.name || 'Фотография')}
                                                            className="max-h-60 rounded-xl object-cover border border-black/10 cursor-pointer hover:opacity-95 transition"
                                                        />
                                                    </div>
                                                )}

                                                {/* Voice Audio Message Player */}
                                                {item.attachment && (
                                                    item.attachment.type === 'audio' ||
                                                    item.attachment.type?.startsWith('audio/') ||
                                                    item.attachment.name?.toLowerCase().includes('голосовое') ||
                                                    item.attachment.url?.includes('voice_')
                                                ) && (
                                                    <div className="mt-2">
                                                        <SpartaAudioPlayer
                                                            url={item.attachment.url}
                                                            duration={item.attachment.duration}
                                                            name={item.attachment.name}
                                                            transcription={item.attachment.transcription}
                                                            variant={isUser ? 'dark' : 'gold'}
                                                            onSaveTranscription={async (transcriptionText) => {
                                                                if (!activeMessage || !selectedId) return;
                                                                const updatedThread = (activeMessage.thread || []).map((m: any, mIdx: number) => {
                                                                    if (mIdx === threadIndex) {
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

                                                                setMessages(prev => prev.map(m => m.id === selectedId ? { ...m, thread: updatedThread } : m));
                                                                try {
                                                                    await updateDoc(doc(db, "messages", selectedId), { thread: updatedThread });
                                                                } catch (err) {
                                                                    console.error('Error saving transcription in AdminMessages:', err);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                {/* Document Attachment (PDF, DOC, XLS, etc.) */}
                                                {item.attachment &&
                                                    !item.attachment.type?.startsWith('image/') &&
                                                    !item.attachment.type?.startsWith('audio/') &&
                                                    item.attachment.type !== 'audio' &&
                                                    !item.attachment.name?.toLowerCase().includes('голосовое') &&
                                                    !item.attachment.url?.includes('voice_') && (
                                                    <div
                                                        onClick={() => openInViewer(item.attachment?.url || '', item.attachment?.name, item.attachment?.type)}
                                                        className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                                            isUser
                                                                ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                                                                : 'bg-black/10 hover:bg-black/20 border-black/10 text-black'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                isUser ? 'bg-white/10 text-sparta-gold' : 'bg-black/10 text-black'
                                                            }`}>
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-semibold truncate">
                                                                    {item.attachment.name || 'Документ'}
                                                                </div>
                                                                <div className="text-[10px] opacity-70">
                                                                    {item.attachment.size ? `${(item.attachment.size / 1024).toFixed(0)} КБ` : 'Нажмите для просмотра'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Download className="w-4 h-4 shrink-0 opacity-80" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* User typing indicator in thread */}
                                {(activeMessage.isTyping?.user || (activeMessage as any).typing?.user) && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 pl-1 py-1 animate-pulse">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="bg-[#202020] border border-white/10 text-white/70 px-3 py-1.5 rounded-2xl rounded-tl-xs flex items-center gap-1.5 text-xs">
                                            <span className="text-emerald-400 font-medium">{activeMessage.name || 'Родитель'} печатает</span>
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* --- INPUT ROW (EXACTLY ONE INPUT FIELD) --- */}
                            <div className="relative shrink-0 bg-[#161616] border-t border-white/10">
                                
                                {/* Canned Responses Popover Menu */}
                                <AnimatePresence>
                                    {isCannedOpen && (
                                        <motion.div
                                            ref={cannedMenuRef}
                                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute bottom-full mb-2 left-2 sm:left-4 w-[calc(100%-16px)] sm:w-80 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-2 z-50 flex flex-col max-h-80 overflow-hidden"
                                        >
                                            <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-xs text-white/50 shrink-0">
                                                <span className="flex items-center gap-1.5 font-semibold text-sparta-gold">
                                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                                    Быстрые шаблоны
                                                </span>
                                                <span className="text-[10px] text-white/40 hidden sm:inline">
                                                    ↑↓ выбор • Enter • Esc
                                                </span>
                                            </div>

                                            <div className="overflow-y-auto overflow-x-hidden p-1 space-y-1 max-h-64 custom-scrollbar">
                                                {filteredCannedResponses.length === 0 ? (
                                                    <div className="p-4 text-center text-xs text-white/40">
                                                        Шаблонов по запросу <span className="text-sparta-gold font-mono">/{cannedFilterQuery}</span> не найдено
                                                    </div>
                                                ) : (
                                                    filteredCannedResponses.map((item, idx) => {
                                                        const isSelected = idx === selectedCannedIndex;
                                                        return (
                                                            <button
                                                                key={item.command}
                                                                type="button"
                                                                onClick={() => handleSelectCanned(item)}
                                                                onMouseEnter={() => setSelectedCannedIndex(idx)}
                                                                className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1 border ${
                                                                    isSelected
                                                                        ? 'bg-sparta-gold/15 border-sparta-gold/40 text-white shadow-sm'
                                                                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-transparent text-white/80'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="font-mono text-xs font-bold text-sparta-gold bg-sparta-gold/10 px-1.5 py-0.5 rounded border border-sparta-gold/20">
                                                                        {item.command}
                                                                    </span>
                                                                    <span className="text-xs font-semibold text-white truncate flex-1 ml-1.5">
                                                                        {item.label}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <span className="text-[10px] text-sparta-gold font-medium shrink-0">
                                                                            Enter ↵
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                                                                    {item.text}
                                                                </p>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Quoting / Replying Banner */}
                                {replyingTo && (
                                    <div className="p-2.5 px-4 bg-[#1f1f1f] border-b border-white/5 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Reply className="w-4 h-4 text-sparta-gold shrink-0" />
                                            <div className="min-w-0 text-xs">
                                                <div className="font-semibold text-sparta-gold truncate">
                                                    Ответ пользователю {replyingTo.senderName}
                                                </div>
                                                <div className="text-gray-400 truncate line-clamp-1">
                                                    {replyingTo.text}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(null)}
                                            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                            title="Отменить ответ"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Attachment Preview Strip */}
                                {attachment && (
                                    <div className="p-2.5 px-4 bg-[#1e1e1e] border-b border-white/5 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {attachment.type.startsWith('image/') ? (
                                                <img src={attachment.preview} alt="Превью" className="w-8 h-8 rounded object-cover border border-white/10" />
                                            ) : (
                                                <File className="w-5 h-5 text-sparta-gold" />
                                            )}
                                            <span className="text-xs text-gray-300 truncate max-w-xs">{attachment.name}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">({(attachment.size / 1024).toFixed(0)} КБ)</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachment(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Form or Recording Bar */}
                                {isRecording ? (
                                    <div className="p-3 flex items-center justify-between gap-3 bg-[#1e1e1e] animate-in fade-in duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex items-center justify-center">
                                                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute opacity-75" />
                                                <span className="w-3 h-3 rounded-full bg-red-500 relative" />
                                            </div>
                                            <span className="text-xs font-mono font-bold text-red-400">
                                                {formattedDuration}
                                            </span>
                                            <div className="hidden sm:flex items-center gap-1">
                                                <div className="w-1 h-3 bg-red-500/60 rounded-full animate-pulse" />
                                                <div className="w-1 h-5 bg-red-500 rounded-full animate-pulse delay-75" />
                                                <div className="w-1 h-2 bg-red-500/40 rounded-full animate-pulse delay-150" />
                                                <div className="w-1 h-4 bg-red-500/80 rounded-full animate-pulse delay-100" />
                                            </div>
                                            <span className="text-xs text-gray-400">Идёт запись голосового...</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={cancelRecording}
                                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                                                title="Отменить запись"
                                            >
                                                <X className="w-4 h-4" />
                                                <span className="hidden sm:inline">Отмена</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isSendingVoice}
                                                onClick={handleSendVoiceAdmin}
                                                className="px-4 py-1.5 rounded-xl bg-sparta-gold hover:bg-yellow-400 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                                                title="Отправить голосовое"
                                            >
                                                {isSendingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                <span>Отправить</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="p-3 flex items-center gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                        />

                                        {/* Paperclip Button */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                                            title="Прикрепить файл или фото"
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>

                                        {/* Microphone Button */}
                                        <button
                                            type="button"
                                            onClick={startRecording}
                                            className="p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-sparta-gold transition-colors shrink-0"
                                            title="Записать голосовое сообщение"
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>

                                        {/* Zap Canned Responses Button */}
                                        <button
                                            ref={zapButtonRef}
                                            type="button"
                                            onClick={handleToggleCanned}
                                            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                                                isCannedOpen
                                                    ? 'bg-sparta-gold/20 text-sparta-gold'
                                                    : 'hover:bg-white/10 text-gray-400 hover:text-sparta-gold'
                                            }`}
                                            title="Быстрые шаблоны ответов (/)"
                                        >
                                            <Zap className="w-5 h-5" />
                                        </button>

                                        {/* Single Textarea / Input */}
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            value={inputText}
                                            onChange={(e) => handleAdminInputChange(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Напишите ответ родителю (или введите / для шаблона)..."
                                            className="flex-1 bg-[#202020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sparta-gold transition-colors resize-none max-h-32"
                                        />

                                        {/* Send Button */}
                                        <button
                                            type="submit"
                                            disabled={(!inputText.trim() && !attachment) || uploadProgress !== null}
                                            className="p-2.5 rounded-xl bg-sparta-gold hover:bg-yellow-400 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 shrink-0"
                                            title="Отправить ответ"
                                        >
                                            {uploadProgress !== null ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Send className="w-5 h-5" />
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* 3. CONTEXT MENU FOR DIALOG CARDS                         */}
            {/* ======================================================== */}
            {dialogMenu && (
                <div
                    style={{ left: dialogMenu.x, top: dialogMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="fixed z-50 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-1.5 w-56 backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-100"
                >
                    {/* Status change */}
                    {dialogMenu.msg.status !== 'resolved' ? (
                        <button
                            type="button"
                            onClick={() => {
                                handleUpdateStatus(dialogMenu.msg.id, 'resolved');
                                setDialogMenu(null);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-emerald-300 hover:bg-white/10 transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Завершить диалог</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                handleUpdateStatus(dialogMenu.msg.id, 'in_progress');
                                setDialogMenu(null);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-blue-300 hover:bg-white/10 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4 text-blue-400" />
                            <span>Вернуть в работу</span>
                        </button>
                    )}

                    {/* Toggle Pin */}
                    <button
                        type="button"
                        onClick={() => {
                            handleTogglePin(dialogMenu.msg.id, !!dialogMenu.msg.isPinned);
                            setDialogMenu(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-gray-200 hover:bg-white/10 transition-colors"
                    >
                        <Pin className={`w-4 h-4 ${dialogMenu.msg.isPinned ? 'text-sparta-gold fill-current' : 'text-gray-400'}`} />
                        <span>{dialogMenu.msg.isPinned ? 'Открепить диалог' : 'Закрепить диалог'}</span>
                    </button>

                    {/* Mark Unread */}
                    <button
                        type="button"
                        onClick={() => {
                            handleUpdateStatus(dialogMenu.msg.id, 'new');
                            setDialogMenu(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-gray-200 hover:bg-white/10 transition-colors"
                    >
                        <Mail className="w-4 h-4 text-amber-400" />
                        <span>Пометить непрочитанным</span>
                    </button>

                    {/* Go to Student Profile */}
                    <button
                        type="button"
                        onClick={() => {
                            const searchTarget = dialogMenu.msg.childName || dialogMenu.msg.name || '';
                            setDialogMenu(null);
                            navigate(`/admin/users?search=${encodeURIComponent(searchTarget)}`);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-gray-200 hover:bg-white/10 transition-colors"
                    >
                        <User className="w-4 h-4 text-blue-400" />
                        <span>Профиль ученика</span>
                    </button>

                    <div className="h-px bg-white/10 my-1" />

                    {/* Delete Dialog */}
                    <button
                        type="button"
                        onClick={() => {
                            const id = dialogMenu.msg.id;
                            setDialogMenu(null);
                            handleDeleteDialog(id);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-red-400 hover:bg-red-500/15 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Удалить диалог</span>
                    </button>
                </div>
            )}

            {/* ======================================================== */}
            {/* 4. CONTEXT MENU FOR MESSAGES                             */}
            {/* ======================================================== */}
            {messageMenu && (
                <div
                    style={{ left: messageMenu.x, top: messageMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="fixed z-50 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl p-1.5 w-52 backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-100"
                >
                    {/* Reply to message */}
                    <button
                        type="button"
                        onClick={() => {
                            setReplyingTo({
                                text: messageMenu.item.text,
                                senderName: messageMenu.item.senderName || (messageMenu.item.sender === 'user' ? (activeMessage?.name || 'Родитель') : 'Администратор')
                            });
                            setMessageMenu(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-gray-200 hover:bg-white/10 transition-colors"
                    >
                        <Reply className="w-4 h-4 text-sparta-gold" />
                        <span>Ответить</span>
                    </button>

                    {/* Copy Text */}
                    {messageMenu.item.text && (
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(messageMenu.item.text);
                                setMessageMenu(null);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-gray-200 hover:bg-white/10 transition-colors"
                        >
                            <Copy className="w-4 h-4 text-blue-400" />
                            <span>Скопировать текст</span>
                        </button>
                    )}

                    {/* Delete Message (if sender is admin and from thread) */}
                    {messageMenu.item.sender === 'admin' && messageMenu.threadIndex >= 0 && (
                        <>
                            <div className="h-px bg-white/10 my-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    const idx = messageMenu.threadIndex;
                                    setMessageMenu(null);
                                    handleDeleteMessage(idx);
                                }}
                                className="w-full px-3 py-2 rounded-lg text-left font-medium flex items-center gap-2.5 text-red-400 hover:bg-red-500/15 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Удалить сообщение</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* SpartaViewer Modal for full preview, zoom, rotate, print and direct download */}
            <SpartaViewer
                isOpen={!!viewerFile}
                file={viewerFile}
                onClose={() => setViewerFile(null)}
            />
        </div>
    );
}
