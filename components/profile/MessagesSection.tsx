import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle,
    Users,
    Shield,
    User,
    Plus,
    Search,
    ChevronRight,
    MessageSquare,
    Zap,
    Settings,
    MoreVertical,
    CheckCircle2,
    Clock,
    Filter,
    Layers,
    Heart,
    Star,
    Sparkles,
    Trash2,
    X,
    BadgeCheck,
    Bell,
    BellOff,
    Pin,
    PinOff,
    CheckCircle,
    Eye,
    EyeOff,
    History,
    ExternalLink,
    AlertTriangle,
    Baby
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    addDoc,
    serverTimestamp,
    deleteDoc,
    updateDoc,
    getDoc,
    getDocs,
    documentId,
    writeBatch,
    arrayUnion,
    setDoc
} from 'firebase/firestore';
import { GlassCard, Button } from '../UIComponents';
import GroupChat from './GroupChat'; // We will adapt this or create UnifiedChat
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MessagesSectionProps {
    user: any;
    userProfile: any;
    initialChatId?: string | null;
    initialTargetUid?: string | null;
    initialTargetName?: string | null;
    initialStudentName?: string | null;
    onMobileDetailChange?: (isVisible: boolean) => void;
}


const MessagesSection: React.FC<MessagesSectionProps> = ({ user, userProfile, initialChatId, initialTargetUid, initialTargetName, initialStudentName, onMobileDetailChange }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newChatData, setNewChatData] = useState({
        name: '',
        type: 'group',
        groupId: '',
        groupCategory: '',
        avatarUrl: '',
        isPrivate: false,
        targetUser: null as any,
        topic: '',
        description: ''
    });
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [userPrefs, setUserPrefs] = useState<Record<string, any>>({});
    const hasHandledParams = React.useRef(false);
    const prevParamsKey = React.useRef('');
    const [creationStep, setCreationStep] = useState<'type' | 'details' | 'bulk'>('type');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chatId: string | null } | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [participantData, setParticipantData] = useState<Record<string, { name: string, avatarUrl: string }>>({});
    const [activeSubCategory, setActiveSubCategory] = useState('all');
    const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
    const [isMobileDetailVisible, setIsMobileDetailVisible] = useState(false);

    useEffect(() => {
        onMobileDetailChange?.(isMobileDetailVisible);
    }, [isMobileDetailVisible, onMobileDetailChange]);

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'developer';
    const isDirector = userProfile?.role === 'director' || userProfile?.role === 'developer';
    const isTrainer = userProfile?.role === 'trainer' || userProfile?.role === 'coach';
    const isStaff = isAdmin || isDirector || isTrainer;
    const isDeveloper = userProfile?.role === 'developer';

    const missingGroupsForUser = React.useMemo(() => {
        if (!availableGroups || !chats || availableGroups.length === 0) return [];

        let targetGroups = availableGroups;
        if (!isAdmin && !isDirector && isTrainer) {
            const cid = userProfile?.coachId || user.uid;
            targetGroups = availableGroups.filter(g => g.coachId === cid || g.substituteCoachId === cid);
        } else if (!isAdmin && !isDirector) {
            return [];
        }

        return targetGroups.filter(g => !chats.some(c => c.groupId === g.id));
    }, [availableGroups, chats, isAdmin, isDirector, isTrainer, userProfile?.coachId, user.uid]);

    const isParent = userProfile?.role === 'parent';
    const isStudent = !isStaff && !isParent;

    const DYNAMIC_CATEGORIES = React.useMemo(() => {
        if (isStudent) {
            return [
                { id: 'all', label: 'Все', icon: Layers },
                { id: 'private', label: 'Тренер', icon: User },
                { id: 'groups', label: 'Моя команда', icon: Users },
            ];
        }

        if (isParent) {
            return [
                { id: 'all', label: 'Все', icon: Layers },
                { id: 'private', label: 'Тренер ребёнка', icon: User },
                { id: 'groups', label: 'Группа', icon: Users },
            ];
        }

        const categories = [
            { id: 'all', label: 'Все', icon: Layers },
            { id: 'staff', label: 'Сотрудники', icon: Shield },
            { id: 'groups', label: 'Группы', icon: Users },
            { id: 'parents', label: isTrainer ? 'Родители' : 'Тренерские чаты', icon: Baby },
            { id: 'private', label: 'Личные', icon: User },
        ];

        if (!isStaff) {
            return categories.filter(cat => cat.id !== 'staff');
        }

        return categories;
    }, [isTrainer, isStaff, isParent, isStudent]);

    const [friends, setFriends] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

    // Fetch Friends
    useEffect(() => {
        if (!user?.uid) return;
        const friendshipQuery = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(friendshipQuery, async (snapshot) => {
            const friendUids = snapshot.docs.map(d => d.data().users.find((id: string) => id !== user.uid));
            if (friendUids.length === 0) {
                setFriends([]);
                return;
            }
            const friendData: any[] = [];
            for (const uid of friendUids) {
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists()) {
                    friendData.push({ id: userSnap.id, ...userSnap.data() });
                }
            }
            setFriends(friendData);
        });
        return () => unsubscribe();
    }, [user?.uid]);

    // Auto-repair missing participants: Inject trainer into their own group chats if missing
    useEffect(() => {
        if (!isTrainer || !userProfile?.coachId || chats.length === 0 || availableGroups.length === 0) return;

        const myGroups = availableGroups.filter(g => g.coachId === userProfile.coachId || g.substituteCoachId === userProfile.coachId);

        myGroups.forEach(group => {
            const chat = chats.find(c => c.groupId === group.id);
            if (chat && !chat.participants?.includes(user.uid)) {
                console.log(`Auto-repairing coach ${user.uid} into chat ${chat.id}`);
                const docRef = doc(db, 'chats', chat.id);
                updateDoc(docRef, {
                    participants: arrayUnion(user.uid),
                    moderators: arrayUnion(user.uid)
                }).catch(e => console.error("Repair error:", e));
            }
        });
    }, [chats, availableGroups, isTrainer, userProfile?.coachId, user.uid]);

    // Auto-initialize Direct Coach Chat and Group Chat for Students
    useEffect(() => {
        if (!user?.uid || isStaff) return;

        const initStudentChats = async () => {
            try {
                const studentGroupRefOrId = userProfile?.groupId || userProfile?.group;
                if (!studentGroupRefOrId) return;

                let groupData: any = null;
                let groupIdStr = studentGroupRefOrId;

                const groupDocRef = doc(db, 'groups', studentGroupRefOrId);
                const groupSnap = await getDoc(groupDocRef);

                if (groupSnap.exists()) {
                    groupData = { id: groupSnap.id, ...groupSnap.data() };
                } else {
                    const qGroup = query(collection(db, 'groups'), where('name', '==', studentGroupRefOrId));
                    const qSnap = await getDocs(qGroup);
                    if (!qSnap.empty) {
                        const d = qSnap.docs[0];
                        groupData = { id: d.id, ...d.data() };
                        groupIdStr = d.id;
                    }
                }

                if (!groupData) return;

                const coachUid = groupData.coachId || groupData.trainerId || groupData.coach;

                // 1. Direct Coach Chat Check & Auto-Creation
                if (coachUid && coachUid !== user.uid) {
                    let coachName = 'Павел Якупов';
                    try {
                        const coachSnap = await getDoc(doc(db, 'users', coachUid));
                        if (coachSnap.exists()) {
                            const cData = coachSnap.data();
                            coachName = cData.displayName || cData.full_name || cData.name || cData.childName || coachName;
                        }
                    } catch (e) {
                        console.error("Error fetching coach info:", e);
                    }

                    const qDirect = query(
                        collection(db, 'chats'),
                        where('participants', 'array-contains', user.uid)
                    );
                    const directSnap = await getDocs(qDirect);
                    const existingCoachChat = directSnap.docs.find(d => {
                        const data = d.data();
                        return (data.type === 'private' || data.type === 'direct') && data.participants?.includes(coachUid);
                    });

                    if (!existingCoachChat) {
                        console.log(`Auto-creating direct chat between student ${user.uid} and coach ${coachUid}`);
                        await addDoc(collection(db, 'chats'), {
                            name: `${coachName} (Тренер)`,
                            type: 'private',
                            participants: [user.uid, coachUid],
                            coachId: coachUid,
                            studentUid: user.uid,
                            createdAt: serverTimestamp(),
                            lastMessageAt: serverTimestamp(),
                            lastMessage: 'Чат с тренером создан'
                        });
                    }
                }

                // 2. Group Chat Check & Auto-Join/Create
                const qGroupChat = query(
                    collection(db, 'chats'),
                    where('groupId', '==', groupIdStr)
                );
                const groupChatSnap = await getDocs(qGroupChat);

                if (!groupChatSnap.empty) {
                    const existingGroupChatDoc = groupChatSnap.docs[0];
                    const chatData = existingGroupChatDoc.data();
                    if (!chatData.participants?.includes(user.uid)) {
                        console.log(`Auto-adding student ${user.uid} to group chat ${existingGroupChatDoc.id}`);
                        await updateDoc(doc(db, 'chats', existingGroupChatDoc.id), {
                            participants: arrayUnion(user.uid)
                        });
                    }
                } else {
                    console.log(`Auto-creating group chat for group ${groupIdStr}`);
                    await addDoc(collection(db, 'chats'), {
                        name: groupData.name || 'Групповой чат',
                        type: 'group',
                        groupId: groupIdStr,
                        groupCategory: groupData.category || 'Спорт',
                        coachId: coachUid || null,
                        participants: [user.uid, coachUid].filter(Boolean),
                        createdAt: serverTimestamp(),
                        lastMessageAt: serverTimestamp(),
                        lastMessage: 'Групповой чат создан'
                    });
                }
            } catch (err) {
                console.error("Error initializing student chats:", err);
            }
        };

        initStudentChats();
    }, [user?.uid, userProfile?.groupId, userProfile?.group, isStaff]);

    // Fetch Chats with Real-time Firestore Listener
    useEffect(() => {
        if (!user?.uid) return;

        const chatsRef = collection(db, 'chats');
        let q = query(chatsRef, where('participants', 'array-contains', user.uid), orderBy('lastMessageAt', 'desc'));

        if (isAdmin || isDeveloper) {
            q = query(chatsRef, orderBy('lastMessageAt', 'desc'));
        }

        const handleSnap = (snapshot: any) => {
            const loadedChats = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })).filter((chat: any) => {
                if (isAdmin || isDeveloper) return true;
                if (chat.type === 'staff') return isTrainer || isAdmin || isDirector;
                if (chat.type === 'group' || chat.type === 'parent') {
                    if (chat.participants?.includes(user.uid)) return true;
                    if (userProfile?.groupId === chat.groupId) return true;
                    if (isTrainer && userProfile?.coachId === chat.coachId) return true;
                }
                if (chat.type === 'private' || chat.type === 'direct') {
                    return chat.participants?.includes(user.uid);
                }
                return false;
            });

            setChats(loadedChats);
            setLoading(false);
        };

        const unsubscribe = onSnapshot(q, handleSnap, (error) => {
            console.error("Firestore chats query index error, executing fallback:", error);
            const fallbackQ = query(chatsRef, where('participants', 'array-contains', user.uid));
            onSnapshot(fallbackQ, handleSnap);
        });

        return () => unsubscribe();
    }, [user?.uid, isAdmin, isDeveloper, isTrainer, userProfile?.groupId, userProfile?.coachId]);

    // Memoized Category Counts for Groups
    const groupCategoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        chats.forEach(chat => {
            if (chat.type === 'group' || chat.type === 'parent') {
                const cat = chat.groupCategory || 'Общая';
                counts[cat] = (counts[cat] || 0) + 1;
            }
        });
        return counts;
    }, [chats]);

    // Fetch Groups and determine categories
    useEffect(() => {
        const fetchGroups = async () => {
            const snapshot = await getDocs(collection(db, 'groups'));
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
            setAvailableGroups(data);

            // Extract unique categories from both groups and existing chats
            if (isAdmin || isDirector) {
                const groupCats = data.map(g => g.category).filter(Boolean);
                const chatCats = chats.map(c => c.groupCategory).filter(Boolean);
                const combined = Array.from(new Set([...groupCats, ...chatCats])) as string[];
                setAvailableSubCategories(combined.sort());
            }
        };
        fetchGroups();
    }, [isAdmin, isDirector, chats.length]); // Re-run if chat count changes to catch new cats

    // Fetch User Chat Prefs (Pin, Mute, ClearAt)
    useEffect(() => {
        if (!user?.uid) return;
        const prefsRef = collection(db, 'users', user.uid, 'chat_prefs');
        const unsubscribe = onSnapshot(prefsRef, (snapshot) => {
            const prefs: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                prefs[doc.id] = doc.data();
            });
            setUserPrefs(prefs);
        });
        return () => unsubscribe();
    }, [user?.uid]);

    // Fetch dynamic avatars/names for private chats
    useEffect(() => {
        const uidsToFetch = new Set<string>();
        chats.forEach(chat => {
            if (chat.type === 'private' && chat.participants) {
                chat.participants.forEach((uid: string) => {
                    if (uid !== user?.uid) uidsToFetch.add(uid);
                });
            }
        });

        if (uidsToFetch.size === 0) return;

        const uidsArray = Array.from(uidsToFetch).slice(0, 30);

        const q = query(collection(db, 'users'), where(documentId(), 'in', uidsArray));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newData: Record<string, { name: string, avatarUrl: string }> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                newData[doc.id] = {
                    name: data.childName || data.full_name || data.email || 'Участник',
                    avatarUrl: data.photoURL || data.avatarUrl || ''
                };
            });
            setParticipantData(newData);
        });

        return () => unsubscribe();
    }, [chats, user?.uid]);

    // Deep-linking: auto-select chat from initialChatId or targetUid
    useEffect(() => {
        if (loading || isCreating) return;

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const effectiveChatId = initialChatId || urlParams?.get('chatId');
        const effectiveTargetUid = initialTargetUid || urlParams?.get('targetUid');
        const effectiveTargetName = initialTargetName || urlParams?.get('targetName') || 'Пользователь';
        const effectiveStudentName = initialStudentName || urlParams?.get('studentName');

        const currentParamsKey = `${effectiveChatId}-${effectiveTargetUid}`;
        if (currentParamsKey === prevParamsKey.current && hasHandledParams.current) return;

        if (effectiveChatId && chats.length > 0) {
            const chatToSelect = chats.find(c => c.id === effectiveChatId);
            if (chatToSelect && (!selectedChat || selectedChat.id !== effectiveChatId)) {
                handleSelectChat(chatToSelect);
                hasHandledParams.current = true;
                prevParamsKey.current = currentParamsKey;
            }
        } else if (effectiveTargetUid) {
            if (effectiveStudentName && activeCategory !== 'parents') {
                setActiveCategory('parents');
            }

            const deterministicId = [user?.uid, effectiveTargetUid].sort().join('_');
            const privateChat = chats.find(c =>
                c.id === deterministicId ||
                ((c.type === 'private' || c.type === 'parent' || c.type === 'direct') && c.participants?.includes(effectiveTargetUid))
            );

            if (privateChat) {
                if (!selectedChat || selectedChat.id !== privateChat.id) {
                    handleSelectChat(privateChat);
                    hasHandledParams.current = true;
                    prevParamsKey.current = currentParamsKey;
                }
            } else {
                handleStartPrivateChat(effectiveTargetUid, effectiveTargetName, effectiveStudentName || undefined);
                hasHandledParams.current = true;
                prevParamsKey.current = currentParamsKey;
            }
        }
    }, [initialChatId, initialTargetUid, initialTargetName, initialStudentName, chats, isCreating, loading, user?.uid]);

    const handleSelectChat = async (chat: any) => {
        setSelectedChat(chat);
        setIsMobileDetailVisible(true);

        // Ensure the chat is visible in the current category
        if (activeCategory !== 'all') {
            const matchesCurrent =
                activeCategory === chat.type ||
                (activeCategory === 'parents' && chat.type === 'parent') ||
                (activeCategory === 'groups' && (chat.type === 'group' || chat.type === 'parent')) ||
                (activeCategory === 'private' && (chat.type === 'private' || chat.type === 'direct'));

            if (!matchesCurrent) {
                if (chat.type === 'parent') setActiveCategory('parents');
                else if (chat.type === 'group') setActiveCategory('groups');
                else if (chat.type === 'private' || chat.type === 'direct') setActiveCategory('private');
                else if (chat.type === 'staff') setActiveCategory('staff');
                else setActiveCategory('all');
            }
        }

        if (user?.uid) {
            const chatRef = doc(db, 'chats', chat.id);
            const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chat.id);

            await updateDoc(prefRef, {
                lastReadAt: serverTimestamp(),
                forceUnread: false
            }).catch(async () => {
                const { setDoc } = await import('firebase/firestore');
                await setDoc(prefRef, { lastReadAt: serverTimestamp(), forceUnread: false }, { merge: true });
            });

            await updateDoc(chatRef, {
                [`readBy.${user.uid}`]: serverTimestamp()
            }).catch(() => { });
        }
    };

    // Auto-select first chat on load if none selected
    useEffect(() => {
        if (loading || chats.length === 0 || selectedChat) return;

        if (!initialChatId && !initialTargetUid) {
            handleSelectChat(chats[0]);
        }
    }, [chats, loading, selectedChat, initialChatId, initialTargetUid]);

    const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, chatId });
    };

    const handleTouchStart = (chatId: string) => {
        if (longPressTimer) clearTimeout(longPressTimer);
        const timer = setTimeout(() => {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try {
                    navigator.vibrate(40);
                } catch (err) {
                    // Ignore vibration errors
                }
            }
            setContextMenu({ x: window.innerWidth / 2, y: window.innerHeight / 2, chatId });
        }, 300);
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const togglePin = async (chatId: string) => {
        if (!user?.uid) return;
        const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chatId);
        const isPinned = userPrefs[chatId]?.isPinned;
        await updateDoc(prefRef, { isPinned: !isPinned }).catch(async () => {
            // If doesn't exist, create it
            const { setDoc } = await import('firebase/firestore');
            await setDoc(prefRef, { isPinned: !isPinned }, { merge: true });
        });
        setContextMenu(null);
    };

    const toggleMute = async (chatId: string) => {
        if (!user?.uid) return;
        const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chatId);
        const isMuted = userPrefs[chatId]?.isMuted;
        await updateDoc(prefRef, { isMuted: !isMuted }).catch(async () => {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(prefRef, { isMuted: !isMuted }, { merge: true });
        });
        setContextMenu(null);
    };

    const clearHistory = async (chatId: string) => {
        if (!user?.uid || !window.confirm("Очистить историю для вас? Сообщения других участников останутся.")) return;
        setContextMenu(null);

        const now = new Date();
        const nowMillis = now.getTime();

        // 1. Update user's chat_prefs with lastClearedAt
        const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chatId);
        const prefData = { lastClearedAt: serverTimestamp(), forceUnread: false };
        await updateDoc(prefRef, prefData).catch(async () => {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(prefRef, prefData, { merge: true });
        });

        // 2. Reset chat document lastMessage metadata in Firestore
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, {
            lastMessage: "",
            lastMessageAt: null,
            updatedAt: serverTimestamp()
        }).catch(err => {
            console.warn("Could not reset chat metadata in Firestore:", err);
        });

        // 3. Update local state immediately so UI updates without page refresh
        setUserPrefs(prev => ({
            ...prev,
            [chatId]: {
                ...prev[chatId],
                lastClearedAt: {
                    toMillis: () => nowMillis,
                    seconds: Math.floor(nowMillis / 1000)
                },
                forceUnread: false
            }
        }));

        setChats(prevChats => prevChats.map(c => {
            if (c.id === chatId) {
                return {
                    ...c,
                    lastMessage: "",
                    lastMessageAt: null
                };
            }
            return c;
        }));

        if (selectedChat?.id === chatId) {
            setSelectedChat((prev: any) => prev ? { ...prev, lastMessage: "", lastMessageAt: null } : null);
        }
    };

    const toggleReadStatus = async (chatId: string) => {
        if (!user?.uid) return;
        const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chatId);
        const isUnread = userPrefs[chatId]?.forceUnread;
        await updateDoc(prefRef, { forceUnread: !isUnread, lastReadAt: serverTimestamp() }).catch(async () => {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(prefRef, { forceUnread: !isUnread, lastReadAt: serverTimestamp() }, { merge: true });
        });
        setContextMenu(null);
    };

    const openInNewWindow = (chatId: string) => {
        const url = `${window.location.origin}/dashboard?tab=messages_unified&chatId=${chatId}`;
        window.open(url, '_blank', 'width=1000,height=800');
        setContextMenu(null);
    };

    const handleCreateChat = async () => {
        if (!newChatData.name.trim() || isCreating) return;

        if (newChatData.type === 'social' && selectedFriends.length === 0) {
            alert("Пожалуйста, выберите хотя бы одного друга");
            return;
        }

        setIsCreating(true);
        try {
            const chatsRef = collection(db, 'chats');

            let initialParticipants = [user.uid];
            if (newChatData.type === 'private' && newChatData.targetUser) {
                initialParticipants.push(newChatData.targetUser.id);
            } else if (newChatData.type === 'social') {
                initialParticipants = [...initialParticipants, ...selectedFriends];
            }

            const chatFields: any = {
                name: newChatData.name,
                type: newChatData.type,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                lastMessage: 'Чат создан',
                lastMessageAt: serverTimestamp(),
                participants: initialParticipants,
                avatarUrl: newChatData.avatarUrl || null,
                isPrivate: newChatData.type === 'private' ? true : newChatData.isPrivate,
                isPublic: newChatData.type === 'social',
                topic: newChatData.topic || '',
                description: newChatData.description || ''
            };

            // If private, ensure the name is set correctly if empty
            if (newChatData.type === 'private' && newChatData.targetUser && !chatFields.name) {
                const targetName = newChatData.targetUser.childName ||
                    newChatData.targetUser.full_name ||
                    `${newChatData.targetUser.childFirstName || ''} ${newChatData.targetUser.childLastName || ''}`.trim() ||
                    newChatData.targetUser.email;
                chatFields.name = `Чат с ${targetName}`;
            }

            if (newChatData.groupId) {
                chatFields.groupId = newChatData.groupId;
            }

            const docRef = await addDoc(chatsRef, chatFields);
            setIsCreateModalOpen(false);
            setCreationStep('type');
            setNewChatData({ name: '', type: 'group', groupId: '', groupCategory: '', avatarUrl: '', isPrivate: false, targetUser: null as any, topic: '', description: '' });
            setSelectedFriends([]);
            setUserSearchQuery('');
            setUserSearchResults([]);
            handleSelectChat({ id: docRef.id, ...chatFields });
        } catch (error) {
            console.error("Error creating chat:", error);
            alert("Ошибка при создании чата");
        }
        setIsCreating(false);
    };

    const handleSearchUsers = async (queryStr: string) => {
        setUserSearchQuery(queryStr);
        if (queryStr.length < 2) {
            setUserSearchResults([]);
            return;
        }
        setIsSearchingUsers(true);
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const staffRoles = ['admin', 'director', 'trainer', 'coach', 'developer'];

            const results = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((u: any) => {
                    if (u.id === user.uid) return false;

                    // If user is student (not staff), enforce strict privacy boundaries:
                    // Students can ONLY search & message their assigned group coach and official support/admins.
                    if (!isStaff) {
                        const isAssignedCoach = (userProfile?.coachId && u.id === userProfile.coachId) ||
                            u.role === 'trainer' || u.role === 'coach';
                        const isSupport = u.role === 'admin' || u.role === 'developer' || u.role === 'director';
                        if (!isAssignedCoach && !isSupport) {
                            return false;
                        }
                    }

                    const nameFields = [
                        u.full_name,
                        u.childName,
                        u.childFirstName,
                        u.childLastName,
                        u.displayName,
                        u.email
                    ].filter(Boolean).map(f => String(f).toLowerCase());

                    const searchStr = queryStr.toLowerCase();
                    return nameFields.some(f => f.includes(searchStr));
                })
                .slice(0, 5);
            setUserSearchResults(results);
        } catch (error) {
            console.error("Error searching users:", error);
        }
        setIsSearchingUsers(false);
    };

    const handleBulkCreateGroupChats = async () => {
        if ((!isAdmin && !isDirector) || isCreating) return;

        setIsCreating(true);
        try {
            // 1. Fetch all groups
            const groupsSnap = await getDocs(collection(db, 'groups'));
            const allGroups = groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

            // 2. Fetch all existing group-type chats
            const chatsSnap = await getDocs(query(collection(db, 'chats'), where('type', '==', 'group')));
            const existingChatGroupIds = new Set(chatsSnap.docs.map(doc => doc.data().groupId).filter(Boolean));

            // 3. Filter groups that need a chat
            const groupsToCreate = allGroups.filter(g => !existingChatGroupIds.has(g.id));

            if (groupsToCreate.length === 0) {
                alert("Для всех групп чаты уже созданы!");
                setIsCreating(false);
                return;
            }

            // 4. Create chats in batches
            const chatsRef = collection(db, 'chats');
            let createdCount = 0;

            // Note: serverTimestamp() doesn't work in loops for document fields as well as batch? 
            // Actually it does, but for bulk we can use a small delay or just batch.
            // Firestore batch has a limit of 500.

            for (let i = 0; i < groupsToCreate.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = groupsToCreate.slice(i, i + 500);

                chunk.forEach(group => {
                    const chatRef = doc(chatsRef);
                    batch.set(chatRef, {
                        name: `${group.name} - Общий`,
                        type: 'group',
                        groupId: group.id,
                        groupCategory: group.category || 'Общая',
                        participants: [user.uid], // Initially only admin
                        createdAt: serverTimestamp(),
                        createdBy: user.uid,
                        lastMessage: 'Чат создан автоматически',
                        lastMessageAt: serverTimestamp(),
                        isPrivate: false,
                        topic: 'Общий чат группы',
                        description: `Автоматически созданный чат для группы ${group.name}`
                    });
                    createdCount++;
                });

                await batch.commit();
            }

            setIsCreateModalOpen(false);
            alert(`Успешно создано чатов: ${createdCount}`);
        } catch (error) {
            console.error("Error bulk creating chats:", error);
            alert("Ошибка при массовом создании чатов");
        }
        setIsCreating(false);
    };

    const handleFixMissingChats = async () => {
        if (isCreating || missingGroupsForUser.length === 0) return;
        setIsCreating(true);
        try {
            const adminUsersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['admin', 'director'])));
            const adminIds = adminUsersSnap.docs.map(d => d.id);

            let createdCount = 0;
            const batch = writeBatch(db);

            for (const group of missingGroupsForUser) {
                const groupUsersSnap = await getDocs(query(collection(db, 'users'), where('groupId', '==', group.id)));
                const studentIds = groupUsersSnap.docs.map(d => d.id);

                const getCategoryBranding = (category: string) => {
                    const cat = category?.toLowerCase() || '';
                    if (cat.includes('мма')) return { icon: '🥊', color: '#EF4444' };
                    if (cat.includes('бокс')) return { icon: '🥊', color: '#EF4444' };
                    if (cat.includes('гимнастика') || cat.includes('растяжка')) return { icon: '🤸', color: '#A855F7' };
                    if (cat.includes('танцы')) return { icon: '💃', color: '#EC4899' };
                    if (cat.includes('футбол') || cat.includes('манеж')) return { icon: '⚽', color: '#22C55E' };
                    return { icon: '🏅', color: '#D4AF37' };
                };

                const branding = getCategoryBranding(group.category || 'Общая');

                // We MUST fetch the actual user.uid for the coach docs, because group.coachId is an object ID
                const getCoachUid = async (coachObjId: string) => {
                    if (!coachObjId) return null;
                    const snap = await getDocs(query(collection(db, 'users'), where('coachId', '==', coachObjId)));
                    return snap.empty ? null : snap.docs[0].id;
                };

                const actualCoachUid = await getCoachUid(group.coachId);
                const actualSubUid = await getCoachUid(group.substituteCoachId);

                const participants = [...new Set([
                    ...adminIds,
                    actualCoachUid,
                    actualSubUid,
                    user.uid, // Ensure creator is included
                    ...studentIds
                ])].filter(Boolean);

                const moderators = [...new Set([
                    ...adminIds,
                    actualCoachUid,
                    actualSubUid,
                    user.uid
                ])].filter(Boolean);

                const chatRef = doc(db, 'chats', group.id);
                batch.set(chatRef, {
                    name: `${group.name}`,
                    groupCategory: group.category || 'Общая',
                    participants: participants,
                    moderators: moderators,
                    groupId: group.id,
                    type: 'group',
                    avatarUrl: branding.icon,
                    themeColor: branding.color,
                    isPrivate: false,
                    topic: 'Общий чат группы',
                    description: `Автоматически созданный чат для группы ${group.name}`,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                    lastMessage: 'Чат успешно создан системой',
                    lastMessageAt: serverTimestamp(),
                    visibleToAdmin: true
                }, { merge: true });
                createdCount++;
            }

            await batch.commit();
            alert(`Успешно создано чатов: ${createdCount}`);
        } catch (error) {
            console.error("Error creating missing chats:", error);
            alert("Ошибка при создании чатов");
        }
        setIsCreating(false);
    };

    const handleStartPrivateChat = async (targetId: string, targetName: string, studentName?: string) => {
        if (!targetId || !user?.uid || targetId === user.uid) return;

        // Determine type based on studentName presence or other logic
        const chatType = studentName ? 'parent' : 'private';

        // Immediately provide feedback
        setIsMobileDetailVisible(true);
        if (activeCategory !== 'all') {
            setActiveCategory(chatType === 'parent' ? 'parents' : 'private');
        }

        // Sorted participant IDs for 1-on-1 direct chat
        const chatId = [user.uid, targetId].sort().join('_');
        const chatRef = doc(db, 'chats', chatId);

        // 1. Check if private chat document already exists by deterministic ID
        try {
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const existingData = { id: chatSnap.id, ...chatSnap.data() };
                handleSelectChat(existingData);
                return;
            }
        } catch (e) {
            console.error("Error checking direct chat doc:", e);
        }

        // 2. Check if private chat already exists in loaded `chats` array
        const existingChat = chats.find(c =>
            (c.type === 'private' || c.type === 'parent' || c.type === 'direct') &&
            c.participants?.includes(targetId) &&
            c.participants?.includes(user.uid)
        );

        if (existingChat) {
            handleSelectChat(existingChat);
            return;
        }

        // 3. Create new chat using setDoc with sorted UID key
        setIsCreating(true);

        try {
            const myName = userProfile?.childName || userProfile?.full_name || userProfile?.name || user.email || 'Пользователь';
            const newChat = {
                name: `Чат с ${targetName}`,
                type: chatType,
                studentName: studentName || null,
                participants: [user.uid, targetId],
                participantNames: {
                    [user.uid]: myName,
                    [targetId]: targetName
                },
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                lastMessage: studentName ? `Чат с родителем ${studentName}` : 'Чат начат из профиля',
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isPrivate: true
            };

            await setDoc(chatRef, newChat);
            const chatToSelect = { id: chatId, ...newChat };
            setSelectedChat(chatToSelect);
            handleSelectChat(chatToSelect);
        } catch (error) {
            console.error("Error starting private chat:", error);
        }
        setIsCreating(false);
    };

    const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setContextMenu(null);

        // Allowed for staff members; user requested trainers to be able to manage and delete their chats.
        if (!isStaff) return;

        if (!window.confirm("Удалить этот чат и все сообщения?")) return;

        try {
            await deleteDoc(doc(db, 'chats', chatId));
            if (selectedChat?.id === chatId) {
                setSelectedChat(null);
            }
            alert("Чат успешно удален");
        } catch (error) {
            console.error("Error deleting chat:", error);
            alert("Не удалось удалить чат. Возможно, недостаточно прав.");
        }
    };

    const filteredChats = chats.filter(chat => {
        const matchesCategory = activeCategory === 'all' ||
            (activeCategory === 'groups' && (chat.type === 'group' || chat.type === 'parent')) ||
            (activeCategory === 'parents' && chat.type === 'parent') ||
            (activeCategory === 'private' && (chat.type === 'private' || chat.type === 'direct')) ||
            (activeCategory === 'staff' && (chat.type === 'staff' || chat.type === 'support')) ||
            chat.type === activeCategory;

        // Admin Sub-category Filter
        const matchesSubCategory = (activeCategory !== 'groups' && activeCategory !== 'parents') ||
            activeSubCategory === 'all' ||
            chat.groupCategory === activeSubCategory ||
            (availableGroups.find((g: any) => g.id === chat.groupId)?.category === activeSubCategory);

        const matchesSearch = !searchQuery.trim() ||
            chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSubCategory && matchesSearch;
    }).sort((a, b) => {
        const aPinned = userPrefs[a.id]?.isPinned ? 1 : 0;
        const bPinned = userPrefs[b.id]?.isPinned ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return 0; // Maintain Firestore order secondary
    });

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100dvh-120px)] md:h-[800px] w-full relative overflow-hidden">
            {/* Sidebar: Chat List */}
            <AnimatePresence mode="wait">
                {(!isMobileDetailVisible || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`md:w-80 flex flex-col gap-4 h-full w-full ${isMobileDetailVisible ? 'hidden md:flex' : 'flex'}`}
                    >
                        {/* Search & Action Bar */}
                        <div className="flex flex-col gap-3">
                            {!(isStudent && chats.length <= 2) && (
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Поиск чатов..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-sparta-gold/50 transition-all font-medium placeholder:text-white/30"
                                    />
                                </div>
                            )}
                            {isStaff && (
                                <div className="flex flex-col gap-2">
                                    {missingGroupsForUser.length > 0 && (
                                        <Button
                                            onClick={handleFixMissingChats}
                                            disabled={isCreating}
                                            className="w-full bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                                        >
                                            <AlertTriangle size={16} /> ЧАТЫ НЕ СОЗДАНЫ ({missingGroupsForUser.length})
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => {
                                            setCreationStep('type');
                                            setIsCreateModalOpen(true);
                                        }}
                                        className="w-full bg-gradient-to-r from-sparta-gold to-yellow-500 text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={16} /> Мастер создания чатов
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Categories */}
                        {!(isStudent && chats.length <= 3) && (
                            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide">
                                {DYNAMIC_CATEGORIES.map(cat => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <Icon size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Sub-Categories (Sport Specific) for Admin/Director */}
                        <AnimatePresence mode="wait">
                            {(isAdmin || isDirector || isDeveloper) && activeCategory === 'groups' && availableSubCategories.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col gap-2 mb-2"
                                >
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 pl-1">Категории спорта</span>
                                    <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide no-scrollbar">
                                        <button
                                            onClick={() => setActiveSubCategory('all')}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${activeSubCategory === 'all'
                                                ? 'bg-white/10 text-white border-white/20 shadow-lg shadow-black/20'
                                                : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'}`}
                                        >
                                            <Layers size={12} /> Все ({chats.filter(c => c.type === 'group' || c.type === 'parent').length})
                                        </button>
                                        {availableSubCategories.map(subCat => {
                                            const count = groupCategoryCounts[subCat] || 0;
                                            const displayMap: Record<string, { label: string, icon: string }> = {
                                                'дети': { label: 'Дети', icon: '👶' },
                                                'kids': { label: 'Дети', icon: '👶' },
                                                'подростки': { label: 'Подростки', icon: '🛹' },
                                                'teens': { label: 'Подростки', icon: '🛹' },
                                                'профи': { label: 'Профи', icon: '🌟' },
                                                'pro': { label: 'Профи', icon: '🌟' },
                                                'мма': { label: 'ММА', icon: '🥊' },
                                                'футбол': { label: 'Футбол', icon: '⚽' },
                                                'манеж': { label: 'Манеж', icon: '⚽' },
                                                'самбо': { label: 'Самбо', icon: '🥋' },
                                                'растяжка': { label: 'Растяжка', icon: '🧘' },
                                                'спортивная': { label: 'Спортивная', icon: '🤸' }
                                            };
                                            const lowerSub = subCat.toLowerCase();
                                            const display = Object.entries(displayMap).find(([k]) => lowerSub.includes(k))?.[1] || { label: subCat, icon: '🏆' };

                                            return (
                                                <button
                                                    key={subCat}
                                                    onClick={() => setActiveSubCategory(subCat)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 border ${activeSubCategory === subCat
                                                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                                        : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'}`}
                                                >
                                                    <span className="text-sm">{display.icon}</span> {display.label} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Chat List Scroll Area */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                                ))
                            ) : filteredChats.length === 0 ? (
                                <div className="py-20 text-center opacity-20">
                                    <MessageCircle size={48} className="mx-auto mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">Нет активных чатов</p>
                                </div>
                            ) : (
                                filteredChats.map(chat => {
                                    const otherId = chat.participants?.find((id: string) => id !== user.uid);

                                    const liveData = otherId ? participantData[otherId] : null;
                                    const displayName = chat.type === 'private' && otherId
                                        ? (liveData?.name || (chat.participantNames ? chat.participantNames[otherId] : chat.name))
                                        : chat.name;
                                    const displayAvatar = chat.type === 'private' && otherId
                                        ? (liveData?.avatarUrl || chat.avatarUrl)
                                        : chat.avatarUrl;

                                    const lastClearedTime = userPrefs[chat.id]?.lastClearedAt?.toMillis?.() ||
                                        (userPrefs[chat.id]?.lastClearedAt?.seconds ? userPrefs[chat.id].lastClearedAt.seconds * 1000 : 0);

                                    const lastMsgTime = chat.lastMessageAt?.toMillis?.() ||
                                        (chat.lastMessageAt?.seconds ? chat.lastMessageAt.seconds * 1000 : 0);

                                    const isHistoryCleared = lastClearedTime > 0 && (lastMsgTime === 0 || lastClearedTime >= lastMsgTime);
                                    const previewText = isHistoryCleared || !chat.lastMessage ? 'История очищена' : chat.lastMessage;

                                    const formatTime = (ts: any) => {
                                        if (!ts) return '';
                                        try {
                                            if (typeof ts.toDate === 'function') return format(ts.toDate(), 'HH:mm');
                                            if (ts.seconds) return format(new Date(ts.seconds * 1000), 'HH:mm');
                                        } catch (e) { }
                                        return '';
                                    };

                                    const previewTime = !isHistoryCleared ? formatTime(chat.lastMessageAt) : '';

                                    const isUnread = !isHistoryCleared && (
                                        (lastMsgTime > (userPrefs[chat.id]?.lastReadAt?.toMillis?.() || (userPrefs[chat.id]?.lastReadAt?.seconds ? userPrefs[chat.id].lastReadAt.seconds * 1000 : 0)) && chat.lastMessageBy !== user.uid) ||
                                        userPrefs[chat.id]?.forceUnread
                                    );

                                    return (
                                        <motion.div
                                            key={chat.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => handleSelectChat(chat)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    handleSelectChat(chat);
                                                }
                                            }}
                                            onContextMenu={(e) => handleContextMenu(e, chat.id)}
                                            onTouchStart={() => handleTouchStart(chat.id)}
                                            onTouchEnd={handleTouchEnd}
                                            className={`w-full p-4 rounded-2xl border transition-all text-left flex items-start gap-3 group relative overflow-hidden cursor-pointer ${selectedChat?.id === chat.id ? 'bg-sparta-gold border-sparta-gold shadow-xl shadow-sparta-gold/10' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${selectedChat?.id === chat.id ? 'bg-black/20 border-black/20 text-black' : 'bg-white/10 border-white/10 text-sparta-gold'}`}>
                                                {displayAvatar ? (
                                                    <img src={displayAvatar} alt="" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    chat.type === 'staff' ? <Shield size={20} /> : (chat.type === 'private' ? <User size={20} /> : <Users size={20} />)
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <h4 className={`text-sm font-bold truncate ${selectedChat?.id === chat.id ? 'text-black' : 'text-white'}`}>
                                                            {displayName}
                                                        </h4>
                                                        {chat.type === 'parent' && chat.studentName && (
                                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${selectedChat?.id === chat.id ? 'bg-black/10 text-black/70' : 'bg-white/10 text-white/40'}`}>
                                                                Родитель: {chat.studentName}
                                                            </span>
                                                        )}
                                                        {userPrefs[chat.id]?.isPinned && <Pin size={10} className={selectedChat?.id === chat.id ? 'text-black/40' : 'text-sparta-gold'} />}
                                                        {userPrefs[chat.id]?.isMuted && <BellOff size={10} className={selectedChat?.id === chat.id ? 'text-black/40' : 'text-white/20'} />}
                                                        {/* Unread Indicator */}
                                                        {isUnread && (
                                                            <div className="w-2 h-2 rounded-full bg-sparta-gold shadow-[0_0_8px_rgba(255,184,0,0.6)] shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] font-bold ${selectedChat?.id === chat.id ? 'text-black/60' : 'text-white/20'}`}>
                                                        {previewTime}
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] truncate italic ${selectedChat?.id === chat.id ? 'text-black/60' : 'text-white/40'}`}>
                                                    {previewText}
                                                </p>
                                            </div>
                                            {isStaff && (
                                                <button
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    className={`absolute -right-10 group-hover:right-3 p-2 rounded-lg transition-all ${selectedChat?.id === chat.id ? 'text-black hover:bg-black/10' : 'text-red-500/40 hover:text-red-50'}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area: Universal Chat */}
            <AnimatePresence mode="wait">
                {(isMobileDetailVisible || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`flex-1 min-h-[400px] h-full w-full ${!isMobileDetailVisible ? 'hidden md:flex' : 'flex'}`}
                    >
                        {selectedChat ? (
                            <div className="w-full h-full animate-in fade-in zoom-in-95 duration-300">
                                {/* We will update GroupChat to accept a chatId and work with the new unified structure */}
                                <GroupChat
                                    key={selectedChat.id}
                                    user={user}
                                    userProfile={userProfile}
                                    groupId={selectedChat.groupId || selectedChat.id}
                                    groupName={
                                        selectedChat.type === 'private' && selectedChat.participantNames
                                            ? selectedChat.participantNames[selectedChat.participants?.find((id: string) => id !== user.uid) || ''] || selectedChat.name
                                            : selectedChat.name
                                    }
                                    isUnifiedChat={true}
                                    chatId={selectedChat.id}
                                    onSelectChat={handleSelectChat}
                                    onStartPrivateChat={handleStartPrivateChat}
                                    onBack={() => setIsMobileDetailVisible(false)}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full bg-white/5 border border-white/5 rounded-[40px] flex flex-col items-center justify-center text-center p-12 opacity-60">
                                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-sparta-gold/20 to-transparent border border-white/10 flex items-center justify-center mb-8 animate-bounce transition-all duration-1000">
                                    <MessageCircle size={48} className="text-sparta-gold" />
                                </div>
                                <h3 className="text-2xl font-russo text-white uppercase mb-4 tracking-tight">Выберите диалог</h3>
                                <p className="text-white/40 text-sm max-w-sm font-medium leading-relaxed uppercase tracking-tighter">
                                    Здесь вы можете общаться с тренерами, родителями и другими участниками Sparta Sports Center.
                                    Выберите чат в списке слева, чтобы начать общение.
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Chat Modal (Wizard) */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-8 pb-4 flex items-center justify-between relative border-b border-white/5 bg-white/5">
                                <div>
                                    <h3 className="text-2xl font-bold text-white font-russo uppercase tracking-wider flex items-center gap-3">
                                        {creationStep === 'type' && <><Sparkles className="text-sparta-gold" /> Мастер чатов</>}
                                        {creationStep === 'details' && (newChatData.type === 'private' ? 'Новый диалог' : 'Настройка группы')}
                                        {creationStep === 'bulk' && <><Zap className="text-sparta-gold" /> Массовое создание</>}
                                    </h3>
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mt-1 ml-1">
                                        {creationStep === 'type' && 'Выберите тип коммуникации'}
                                        {creationStep === 'details' && 'Заполните основные данные'}
                                        {creationStep === 'bulk' && 'Создание чатов для всех групп'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <AnimatePresence mode="wait">
                                    {creationStep === 'type' && (
                                        <motion.div
                                            key="step-type"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            <CreationOption
                                                icon={User}
                                                title="Личный чат"
                                                desc="Прямой диалог с родителем или сотрудником"
                                                onClick={() => {
                                                    setNewChatData({ ...newChatData, type: 'private' });
                                                    setCreationStep('details');
                                                }}
                                            />
                                            <CreationOption
                                                icon={Users}
                                                title="Чат для группы"
                                                desc="Создать чат для конкретной тренировочной группы"
                                                onClick={() => {
                                                    setNewChatData({ ...newChatData, type: 'group' });
                                                    setCreationStep('details');
                                                }}
                                            />
                                            <CreationOption
                                                icon={Sparkles}
                                                title="Социальный чат"
                                                desc="Создать свободный чат для друзей и общения"
                                                onClick={() => {
                                                    setNewChatData({ ...newChatData, type: 'social', name: 'Моя компания' });
                                                    setCreationStep('details');
                                                }}
                                            />
                                            {isAdmin && (
                                                <CreationOption
                                                    icon={Zap}
                                                    title="Массовое создание"
                                                    desc="Создать чаты для всех групп без чатов"
                                                    highlight
                                                    onClick={() => setCreationStep('bulk')}
                                                />
                                            )}
                                            {isAdmin && (
                                                <CreationOption
                                                    icon={Shield}
                                                    title="Чат сотрудников"
                                                    desc="Создать закрытый чат только для тренеров"
                                                    onClick={() => {
                                                        setNewChatData({ ...newChatData, type: 'staff', name: 'Чат сотрудников Sparta' });
                                                        setCreationStep('details');
                                                    }}
                                                />
                                            )}
                                        </motion.div>
                                    )}

                                    {creationStep === 'details' && (
                                        <motion.div
                                            key="step-details"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block ml-1">Название чата</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Напр. Группа Утро - Родители"
                                                        value={newChatData.name}
                                                        onChange={(e) => setNewChatData({ ...newChatData, name: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all"
                                                    />
                                                </div>

                                                {newChatData.type === 'social' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block ml-1">Пригласить друзей ({selectedFriends.length})</label>
                                                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {friends.length === 0 ? (
                                                                <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/5">
                                                                    <Users className="mx-auto text-white/10 mb-3" size={32} />
                                                                    <p className="text-white/40 text-xs">У вас пока нет друзей для приглашения</p>
                                                                </div>
                                                            ) : (
                                                                friends.map(f => {
                                                                    const isSelected = selectedFriends.includes(f.id);
                                                                    return (
                                                                        <button
                                                                            key={f.id}
                                                                            onClick={() => {
                                                                                setSelectedFriends(prev =>
                                                                                    isSelected ? prev.filter(id => id !== f.id) : [...prev, f.id]
                                                                                );
                                                                            }}
                                                                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${isSelected ? 'bg-sparta-gold/10 border-sparta-gold/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                                                        >
                                                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sparta-gold font-bold">
                                                                                {(f.childName || f.full_name || f.email).charAt(0)}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="text-sm font-bold text-white">{f.childName || f.full_name || f.email}</p>
                                                                                <p className="text-[10px] text-white/40">{f.email}</p>
                                                                            </div>
                                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-sparta-gold border-sparta-gold' : 'border-white/10'}`}>
                                                                                {isSelected && <CheckCircle size={14} className="text-black" />}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {newChatData.type === 'social' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block ml-1">Пригласить друзей ({selectedFriends.length})</label>
                                                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {friends.length === 0 ? (
                                                                <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/5">
                                                                    <Users className="mx-auto text-white/10 mb-3" size={32} />
                                                                    <p className="text-white/40 text-xs">У вас пока нет друзей для приглашения</p>
                                                                </div>
                                                            ) : (
                                                                friends.map(f => {
                                                                    const isSelected = selectedFriends.includes(f.id);
                                                                    return (
                                                                        <button
                                                                            key={f.id}
                                                                            onClick={() => {
                                                                                setSelectedFriends(prev =>
                                                                                    isSelected ? prev.filter(id => id !== f.id) : [...prev, f.id]
                                                                                );
                                                                            }}
                                                                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${isSelected ? 'bg-sparta-gold/10 border-sparta-gold/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                                                        >
                                                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sparta-gold font-bold">
                                                                                {(f.childName || f.full_name || f.email).charAt(0)}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="text-sm font-bold text-white">{f.childName || f.full_name || f.email}</p>
                                                                                <p className="text-[10px] text-white/40">{f.email}</p>
                                                                            </div>
                                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-sparta-gold border-sparta-gold' : 'border-white/10'}`}>
                                                                                {isSelected && <CheckCircle size={14} className="text-black" />}
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {newChatData.type === 'private' && (
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block ml-1">Выберите собеседника</label>
                                                        <div className="relative">
                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                                            <input
                                                                type="text"
                                                                placeholder={newChatData.targetUser ? (newChatData.targetUser.childName || newChatData.targetUser.full_name || "Пользователь") : "Поиск по имени..."}
                                                                value={userSearchQuery}
                                                                onChange={(e) => handleSearchUsers(e.target.value)}
                                                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all placeholder:text-white/40"
                                                            />
                                                            {isSearchingUsers && (
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                                    <div className="w-4 h-4 border-2 border-sparta-gold border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <AnimatePresence>
                                                            {userSearchResults.length > 0 && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    className="mt-2 bg-black/40 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 z-[100] relative"
                                                                >
                                                                    {userSearchResults.map(u => (
                                                                        <button
                                                                            key={u.id}
                                                                            onClick={() => {
                                                                                const targetName = u.childName || u.full_name || u.email;
                                                                                setNewChatData({ ...newChatData, targetUser: u, name: `Чат с ${targetName}`, isPrivate: true });
                                                                                setUserSearchResults([]);
                                                                                setUserSearchQuery('');
                                                                            }}
                                                                            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all text-left group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-sparta-gold font-bold">
                                                                                {(u.childName || u.full_name || u.email).charAt(0)}
                                                                            </div>
                                                                            <div className="flex items-center justify-between flex-1">
                                                                                <div>
                                                                                    <p className="text-white font-bold">{u.childName || u.full_name || u.email}</p>
                                                                                    <p className="text-white/40 text-xs">{u.email}</p>
                                                                                </div>
                                                                                <Plus size={16} className="text-sparta-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}


                                                {newChatData.type === 'group' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block ml-1">Привязка к группе</label>
                                                            <select
                                                                value={newChatData.groupId}
                                                                onChange={(e) => {
                                                                    const gId = e.target.value;
                                                                    const g = availableGroups.find(group => group.id === gId);
                                                                    setNewChatData({
                                                                        ...newChatData,
                                                                        groupId: gId,
                                                                        name: g ? `${g.name} - Общий` : '',
                                                                        groupCategory: g?.category || 'Общая'
                                                                    });
                                                                }}
                                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-sparta-gold/50 outline-none transition-all appearance-none cursor-pointer"
                                                            >
                                                                <option value="">Без группы</option>
                                                                {availableGroups.map(g => {
                                                                    const cat = g.category?.toLowerCase() || '';
                                                                    let localizedCat = g.category || 'Общая';
                                                                    if (cat === 'kids') localizedCat = 'Дети';
                                                                    else if (cat === 'teens') localizedCat = 'Подростки';
                                                                    else if (cat === 'pro') localizedCat = 'Профи';
                                                                    return (
                                                                        <option key={g.id} value={g.id}>{g.name} ({localizedCat})</option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block ml-1">Приватность</label>
                                                            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
                                                                <button
                                                                    onClick={() => setNewChatData({ ...newChatData, isPrivate: false })}
                                                                    className={`flex-1 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!newChatData.isPrivate ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white'}`}
                                                                >
                                                                    Открытый
                                                                </button>
                                                                <button
                                                                    onClick={() => setNewChatData({ ...newChatData, isPrivate: true })}
                                                                    className={`flex-1 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newChatData.isPrivate ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white'}`}
                                                                >
                                                                    Закрытый
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-4">
                                                <Button
                                                    onClick={() => setCreationStep('type')}
                                                    className="flex-1 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10"
                                                >
                                                    Назад
                                                </Button>
                                                <Button
                                                    onClick={handleCreateChat}
                                                    disabled={isCreating || !newChatData.name.trim() || (newChatData.type === 'private' && !newChatData.targetUser)}
                                                    className="flex-[2] py-5 bg-sparta-gold text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-sparta-gold/20"
                                                >
                                                    {isCreating ? 'Создание...' : 'Создать чат'}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {creationStep === 'bulk' && (
                                        <motion.div
                                            key="step-bulk"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="text-center py-6"
                                        >
                                            <div className="w-20 h-20 bg-sparta-gold/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-sparta-gold border border-sparta-gold/20 shadow-[0_0_30px_rgba(255,200,0,0.1)]">
                                                <Zap size={40} />
                                            </div>
                                            <h4 className="text-xl font-bold text-white font-russo uppercase mb-2">Создать для всех групп?</h4>
                                            <p className="text-white/40 text-sm mb-8 leading-relaxed px-10">
                                                Система автоматически определит группы, у которых еще нет общего чата, и создаст их для вас. Участники будут добавлены автоматически при синхронизации.
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                <Button
                                                    onClick={handleBulkCreateGroupChats}
                                                    disabled={isCreating}
                                                    className="w-full py-5 bg-sparta-gold text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-sparta-gold/20"
                                                >
                                                    {isCreating ? 'Выполняется...' : 'Начать создание'}
                                                </Button>
                                                <button
                                                    onClick={() => setCreationStep('type')}
                                                    className="py-3 text-white/20 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Chat Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-[120]"
                            onClick={() => setContextMenu(null)}
                            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed',
                                left: Math.min(contextMenu.x, window.innerWidth - 220),
                                top: Math.min(contextMenu.y, window.innerHeight - 350),
                            }}
                            className="z-[130] w-52 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1.5"
                        >
                            <ContextMenuItem
                                icon={userPrefs[contextMenu.chatId!]?.isPinned ? PinOff : Pin}
                                label={userPrefs[contextMenu.chatId!]?.isPinned ? "Открепить" : "Закрепить"}
                                onClick={() => togglePin(contextMenu.chatId!)}
                            />
                            <ContextMenuItem
                                icon={userPrefs[contextMenu.chatId!]?.isMuted ? Bell : BellOff}
                                label={userPrefs[contextMenu.chatId!]?.isMuted ? "Включить уведомления" : "Отключить уведомления"}
                                onClick={() => toggleMute(contextMenu.chatId!)}
                            />
                            <ContextMenuItem
                                icon={userPrefs[contextMenu.chatId!]?.forceUnread ? Eye : EyeOff}
                                label={userPrefs[contextMenu.chatId!]?.forceUnread ? "Прочитано" : "Как непрочитанное"}
                                onClick={() => toggleReadStatus(contextMenu.chatId!)}
                            />
                            <div className="h-px bg-white/5 my-1.5 mx-3" />
                            <ContextMenuItem
                                icon={ExternalLink}
                                label="В отдельном окне"
                                onClick={() => openInNewWindow(contextMenu.chatId!)}
                            />
                            <ContextMenuItem
                                icon={History}
                                label="Очистить историю"
                                onClick={() => contextMenu?.chatId && clearHistory(contextMenu.chatId)}
                            />
                            {isStaff && (
                                <ContextMenuItem
                                    icon={Trash2}
                                    label="Удалить чат"
                                    danger
                                    onClick={() => contextMenu?.chatId && handleDeleteChat(contextMenu.chatId, { stopPropagation: () => { } } as any)}
                                />
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

interface ContextMenuItemProps {
    icon: any;
    label: string;
    onClick: () => void;
    danger?: boolean;
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ icon: Icon, label, onClick, danger }) => (
    <button
        onClick={onClick}
        className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-xs font-bold ${danger ? 'text-red-500 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
    >
        <Icon size={16} className={danger ? 'text-red-500' : 'text-white/30'} />
        {label}
    </button>
);

const CreationOption: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, highlight?: boolean }> = ({ icon: Icon, title, desc, onClick, highlight }) => (
    <motion.div
        whileHover={{ scale: 1.02, translateY: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`p-6 rounded-[24px] border border-white/10 text-left transition-all relative overflow-hidden group ${highlight ? 'bg-gradient-to-br from-sparta-gold/20 to-yellow-600/10 border-sparta-gold/30 hover:border-sparta-gold/50' : 'bg-white/5 hover:bg-white/10'}`}
    >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${highlight ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20' : 'bg-white/10 text-sparta-gold'}`}>
            <Icon size={24} />
        </div>
        <h4 className="text-white font-russo uppercase text-sm mb-1 tracking-tight">{title}</h4>
        <p className="text-white/40 text-[10px] font-medium leading-relaxed uppercase tracking-tighter">{desc}</p>

        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={16} className="text-sparta-gold" />
        </div>
    </motion.div>
);

export default MessagesSection;
