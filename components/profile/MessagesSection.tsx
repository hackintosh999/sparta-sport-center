import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    Bookmark,
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
    Baby,
    Crown,
    Dumbbell
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
    setDoc,
    limit
} from 'firebase/firestore';
import { GlassCard, Button } from '../UIComponents';
import GroupChat from './GroupChat'; // We will adapt this or create UnifiedChat
import { SpartaAvatar } from './SpartaAvatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SpartaStoriesViewer, SpartaStoryGroup, SpartaStorySlide } from './SpartaStoriesViewer';
import { SpartaCreateStoryModal } from './SpartaCreateStoryModal';
import { SpartaModerationModal } from './SpartaModerationModal';
import { SpartaHighlightsModal, SpartaHighlightAlbum } from './SpartaHighlightsModal';
import { Sparta3DReactionIcon } from './SpartaReactions';

interface MessagesSectionProps {
    user: any;
    userProfile: any;
    initialChatId?: string | null;
    initialTargetUid?: string | null;
    initialTargetName?: string | null;
    initialStudentName?: string | null;
    onMobileDetailChange?: (isVisible: boolean) => void;
    onTabChange?: (tab: any) => void;
}


const MessagesSection: React.FC<MessagesSectionProps> = ({ user, userProfile, initialChatId, initialTargetUid, initialTargetName, initialStudentName, onMobileDetailChange, onTabChange }) => {
    const [searchParams] = useSearchParams();
    const directChatId = searchParams.get('chatId') || initialChatId;
    const [activeCategory, setActiveCategory] = useState('all');
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isFriendPickerOpen, setIsFriendPickerOpen] = useState(false);
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
    const [participantData, setParticipantData] = useState<Record<string, any>>({});
    const [typingMap, setTypingMap] = useState<Record<string, string[]>>({});
    const [activeSubCategory, setActiveSubCategory] = useState('all');
    const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
    const [isMobileDetailVisible, setIsMobileDetailVisible] = useState(false);
    const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);
    const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
    const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0);
    const [viewedStoryIds, setViewedStoryIds] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(localStorage.getItem('sparta_viewed_stories') || '[]');
        } catch {
            return [];
        }
    });
    const [firestoreStories, setFirestoreStories] = useState<any[]>([]);
    const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
    const [pendingReportsCount, setPendingReportsCount] = useState(0);

    // Highlights state
    const [highlights, setHighlights] = useState<SpartaHighlightAlbum[]>([]);
    const [isCreateHighlightOpen, setIsCreateHighlightOpen] = useState(false);
    const [activeHighlightGroup, setActiveHighlightGroup] = useState<SpartaStoryGroup | null>(null);

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'developer';
    const isDirector = userProfile?.role === 'director' || userProfile?.role === 'developer';
    const isTrainer = userProfile?.role === 'trainer' || userProfile?.role === 'coach';
    const isStaff = isAdmin || isDirector || isTrainer;
    const isDeveloper = userProfile?.role === 'developer';

    useEffect(() => {
        onMobileDetailChange?.(isMobileDetailVisible);
    }, [isMobileDetailVisible, onMobileDetailChange]);

    // Real-Time subscription for pending moderation reports (for staff)
    useEffect(() => {
        if (!isStaff) return;
        const q = query(
            collection(db, 'reports'),
            where('status', '==', 'pending')
        );
        const unsub = onSnapshot(q, (snap) => {
            setPendingReportsCount(snap.size);
        }, () => { });
        return () => unsub();
    }, [isStaff]);

    // Real-Time subscription for highlights albums
    useEffect(() => {
        const q = query(collection(db, 'highlights'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const list: SpartaHighlightAlbum[] = [];
            snapshot.docs.forEach(d => {
                const data = d.data();
                list.push({
                    id: d.id,
                    title: data.title,
                    coverIcon: data.coverIcon || 'trophy',
                    coverGradient: data.coverGradient || 'bg-gradient-to-br from-amber-600 via-[#1c140a] to-black',
                    authorId: data.authorId,
                    authorName: data.authorName,
                    slides: data.slides || []
                });
            });
            setHighlights(list);
        }, (err) => {
            console.warn("Error fetching highlights:", err);
        });

        return () => unsub();
    }, []);

    const handleDeleteHighlightDirect = async (albumId: string, albumTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Удалить закрепленный альбом «${albumTitle}»?`)) return;
        try {
            await deleteDoc(doc(db, 'highlights', albumId));
        } catch (err) {
            console.error("Error deleting highlight:", err);
        }
    };

    const handleOpenHighlight = (album: SpartaHighlightAlbum) => {
        const group: SpartaStoryGroup = {
            authorId: album.authorId,
            authorName: album.title,
            authorRole: 'club',
            roleLabel: 'Актуальное',
            slides: album.slides && album.slides.length > 0 ? album.slides : [
                {
                    id: 'hl_empty_' + album.id,
                    title: album.title,
                    subtitle: 'Подборка Актуального',
                    description: 'В этом альбоме пока нет историй. Нажмите + или сохраните историю в этот альбом.',
                    gradient: album.coverGradient,
                    mediaType: 'gradient'
                }
            ]
        };
        setActiveHighlightGroup(group);
    };

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

    const isDirectChat = (chat: any) => {
        if (!chat) return false;
        if (chat.type === 'saved' || chat.id?.startsWith('saved_')) return false;
        if (chat.groupId) return false;
        if (chat.type === 'group' || chat.type === 'team' || chat.type === 'channel') return false;
        return chat.type === 'private' || chat.type === 'direct' || chat.type === 'parent' || chat.type === 'child' || chat.type === 'social' || (Array.isArray(chat.participants) && chat.participants.length === 2);
    };

    // Helper to extract the other participant's dynamic details relative to current user
    const getOtherParticipantInfo = (chat: any) => {
        if (!chat) return { otherId: null, details: {} as any, role: '', name: '', childInfo: '' };

        const isCurrentUser = (id: string) => {
            if (!id) return false;
            if (id === user?.uid) return true;
            if (isTrainer && userProfile?.coachId && id === userProfile.coachId) return true;
            return false;
        };

        let otherId: string | null = null;
        if (Array.isArray(chat.participants)) {
            otherId = chat.participants.find((id: string) => !isCurrentUser(id)) ||
                chat.participants.find((id: string) => id !== user?.uid) || null;
        }
        if (!otherId) {
            otherId = (chat.parentId && !isCurrentUser(chat.parentId)) ? chat.parentId :
                (chat.studentUid && !isCurrentUser(chat.studentUid)) ? chat.studentUid :
                (chat.targetUserId && !isCurrentUser(chat.targetUserId)) ? chat.targetUserId :
                (chat.userId && !isCurrentUser(chat.userId)) ? chat.userId :
                (chat.coachId && !isCurrentUser(chat.coachId)) ? chat.coachId : null;
        }

        const details = (otherId && chat.participantDetails?.[otherId]) || {};
        const live = otherId ? participantData[otherId] : null;

        // Dynamic Role calculation
        let role = (details.role || live?.role || (otherId && chat.participantRoles?.[otherId]) || '').toLowerCase();
        if (!role) {
            if (chat.type === 'parent' || chat.parentName || (otherId && chat.parentId === otherId)) {
                role = 'parent';
            } else if (chat.type === 'child' || (otherId && chat.studentUid === otherId)) {
                role = 'student';
            } else if (isTrainer) {
                role = 'parent';
            } else if (isParent) {
                role = 'coach';
            }
        }

        // Dynamic Display Name calculation
        let name = details.name ||
            live?.name ||
            (otherId && chat.participantNames?.[otherId]) ||
            chat.parentName;

        const lowChatName = (chat.name || '').toLowerCase();
        if (!name || ['родитель', 'ребенок', 'чат', 'группа', 'тренер'].includes(name.toLowerCase())) {
            if (role === 'parent') {
                name = chat.parentName || (chat.childName ? `Родитель (${chat.childName})` : (chat.name && !lowChatName.includes('тренер') ? chat.name : 'Родитель'));
            } else if (role === 'student') {
                name = chat.childName || chat.studentName || 'Ученик';
            } else if (role === 'coach' || role === 'trainer') {
                name = chat.coachName || (chat.name && !lowChatName.includes('родитель') ? chat.name : 'Тренер');
            } else {
                name = chat.name || 'Собеседник';
            }
        }

        const childInfo = (chat.childName || chat.studentName)
            ? `Родитель: ${chat.childName || chat.studentName}`
            : 'Родитель ученика';

        return { otherId, details, role, name, childInfo };
    };

    const isCoachChat = (chat: any) => {
        if (!isDirectChat(chat)) return false;
        const { role } = getOtherParticipantInfo(chat);
        return role === 'coach' || role === 'trainer';
    };

    const isChildChat = (chat: any) => {
        if (!isDirectChat(chat)) return false;
        const { role } = getOtherParticipantInfo(chat);
        return role === 'student' || role === 'kid' || role === 'child' || chat.type === 'child';
    };

    const isParentDirectChat = (chat: any) => {
        if (!isDirectChat(chat)) return false;
        const { role } = getOtherParticipantInfo(chat);
        return role === 'parent' || chat.type === 'parent';
    };

    const isFriendChat = (chat: any) => {
        if (!isDirectChat(chat)) return false;
        const { role } = getOtherParticipantInfo(chat);
        return role === 'friend' || (!['coach', 'trainer', 'parent', 'student', 'child', 'kid'].includes(role) && chat.type !== 'parent');
    };

    const isGroupChat = (chat: any) => {
        if (!chat) return false;
        if (chat.type === 'saved' || chat.id?.startsWith('saved_')) return false;
        if (isDirectChat(chat)) return false;
        return chat.type === 'group' || chat.type === 'team' || !!chat.groupId;
    };

    const [friends, setFriends] = useState<any[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

    const DYNAMIC_CATEGORIES = React.useMemo(() => {
        const savedCount = chats.filter(c => c.type === 'saved' || c.id === `saved_${user?.uid}`).length;

        if (isStudent) {
            const groupCount = chats.filter(isGroupChat).length;
            const coachCount = chats.filter(isCoachChat).length;
            const friendCount = chats.filter(isFriendChat).length;
            const familyCount = chats.filter(isParentDirectChat).length;

            return [
                { id: 'all', label: 'Все', count: chats.length, icon: Layers },
                { id: 'saved', label: '⭐️ Избранное', count: savedCount, icon: Bookmark },
                { id: 'groups', label: 'Команда', count: groupCount, icon: Users },
                { id: 'coach', label: 'Тренеры', count: coachCount, icon: Dumbbell },
                { id: 'family', label: 'Родители', count: familyCount, icon: Baby },
                { id: 'friends', label: 'Друзья', count: friendCount || friends.length, icon: Heart },
            ];
        }

        if (isParent) {
            const childCount = chats.filter(isChildChat).length;
            const coachCount = chats.filter(isCoachChat).length;
            const groupCount = chats.filter(isGroupChat).length;

            return [
                { id: 'all', label: 'Все', count: chats.length, icon: Layers },
                { id: 'saved', label: '⭐️ Избранное', count: savedCount, icon: Bookmark },
                { id: 'child', label: 'Спортсмен', count: childCount, icon: Baby },
                { id: 'coach', label: 'Тренеры', count: coachCount, icon: Dumbbell },
                { id: 'groups', label: 'Группы', count: groupCount, icon: Users },
            ];
        }

        const categories = [
            { id: 'all', label: 'Все', count: chats.length, icon: Layers },
            { id: 'saved', label: '⭐️ Избранное', count: savedCount, icon: Bookmark },
            { id: 'staff', label: 'Сотрудники', count: chats.filter(c => c.type === 'staff' || c.type === 'support').length, icon: Shield },
            { id: 'groups', label: 'Группы', count: chats.filter(isGroupChat).length, icon: Users },
            { id: 'parents', label: isTrainer ? 'Родители' : 'Тренерские', count: chats.filter(c => c.type === 'parent' || isParentDirectChat(c)).length, icon: Baby },
            { id: 'private', label: 'Личные', count: chats.filter(isDirectChat).length, icon: User },
        ];

        if (!isStaff) {
            return categories.filter(cat => cat.id !== 'staff');
        }

        return categories;
    }, [isTrainer, isStaff, isParent, isStudent, chats, friends.length, user?.uid]);

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
                        const isMatchByUid = (data.type === 'private' || data.type === 'direct') && data.participants?.includes(coachUid);
                        const isMatchByName = (data.name || '').toLowerCase().includes(coachName.toLowerCase());
                        return isMatchByUid || isMatchByName;
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
                    // Check by name before creating a new doc
                    const qName = query(collection(db, 'chats'), where('name', '==', groupData.name));
                    const snapName = await getDocs(qName);

                    if (!snapName.empty) {
                        const existingDoc = snapName.docs[0];
                        await updateDoc(doc(db, 'chats', existingDoc.id), {
                            groupId: groupIdStr,
                            participants: arrayUnion(user.uid)
                        });
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
                }
            } catch (err) {
                console.error("Error initializing student chats:", err);
            }
        };

        initStudentChats();
    }, [user?.uid, userProfile?.groupId, userProfile?.group, isStaff]);

    // Fetch Chats with Real-time Firestore Listener
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        // Safety fallback timer so skeleton loader never hangs indefinitely
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 1500);

        const chatsRef = collection(db, 'chats');
        let q = query(chatsRef, where('participants', 'array-contains', user.uid));

        if (isAdmin || isDeveloper) {
            q = query(chatsRef);
        }

        const handleSnap = (snapshot: any) => {
            clearTimeout(safetyTimer);
            const rawChats = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })).filter((chat: any) => {
                if (isAdmin || isDeveloper) return true;
                if (chat.type === 'saved' || chat.id === `saved_${user.uid}` || chat.id?.startsWith('saved_')) return true;
                if (chat.type === 'staff') return isTrainer || isAdmin || isDirector;
                if (chat.type === 'group' || chat.type === 'team') {
                    if (chat.participants?.includes(user.uid)) return true;
                    if (userProfile?.groupId === chat.groupId) return true;
                    if (isTrainer && userProfile?.coachId === chat.coachId) return true;
                }
                if (chat.type === 'private' || chat.type === 'direct' || chat.type === 'parent' || chat.type === 'child' || chat.type === 'social' || (Array.isArray(chat.participants) && chat.participants.includes(user.uid))) {
                    return chat.participants?.includes(user.uid);
                }
                return false;
            });

            const isCurrentUser = (id: string) => {
                if (!id) return false;
                if (id === user.uid) return true;
                if (id === 'coach' && isTrainer) return true;
                if (isTrainer && userProfile?.coachId && id === userProfile.coachId) return true;
                return false;
            };

            // Helper to extract the exact other participant's UID from any direct chat
            const getChatOtherUid = (chat: any) => {

                // 1. Array check
                if (Array.isArray(chat.participants)) {
                    for (const p of chat.participants) {
                        const uidStr = typeof p === 'string' ? p : (p?.id || p?.uid);
                        if (uidStr && !isCurrentUser(uidStr)) return uidStr;
                    }
                }

                // 2. Explicit direct UID fields
                if (chat.parentId && !isCurrentUser(chat.parentId)) return chat.parentId;
                if (chat.studentUid && !isCurrentUser(chat.studentUid)) return chat.studentUid;
                if (chat.targetUserId && !isCurrentUser(chat.targetUserId)) return chat.targetUserId;
                if (chat.userId && !isCurrentUser(chat.userId)) return chat.userId;
                if (chat.coachId && !isCurrentUser(chat.coachId)) return chat.coachId;

                // 3. Match family relations from user profile
                if (isParent && userProfile?.studentUid) {
                    const lowName = (chat.name || '').toLowerCase();
                    if (chat.type === 'parent' || chat.type === 'child' || lowName.includes('ребенок') || lowName.includes('спортсмен') || (userProfile.childName && lowName.includes(userProfile.childName.toLowerCase()))) {
                        return userProfile.studentUid;
                    }
                }
                if (isStudent && userProfile?.parentId) {
                    const lowName = (chat.name || '').toLowerCase();
                    if (chat.type === 'parent' || lowName.includes('родитель') || (userProfile.parentName && lowName.includes(userProfile.parentName.toLowerCase()))) {
                        return userProfile.parentId;
                    }
                }

                // 4. Match student's coach
                if (isStudent && userProfile?.coachId) {
                    const lowName = (chat.name || '').toLowerCase();
                    if (lowName.includes('тренер') || lowName.includes('coach')) {
                        return userProfile.coachId;
                    }
                }

                return null;
            };

            // Smart Deduplication Map
            const chatMap = new Map<string, any>();

            for (const chat of rawChats) {
                let dedupeKey = chat.id;

                const isSaved = chat.type === 'saved' || chat.id === `saved_${user.uid}` || chat.id?.startsWith('saved_');
                const isGroup = !isSaved && (chat.type === 'group' || chat.type === 'team' || (Boolean(chat.groupId) && chat.type !== 'private' && chat.type !== 'direct' && chat.type !== 'parent' && chat.type !== 'child'));
                const isChannel = !isSaved && !isGroup && chat.type === 'channel';

                if (isSaved) {
                    dedupeKey = `saved_${user.uid}`;
                } else if (isGroup) {
                    const cleanName = (chat.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    dedupeKey = `group_${chat.groupId || cleanName}`;
                } else if (isChannel) {
                    dedupeKey = `channel_${(chat.name || 'general').toLowerCase().trim()}`;
                } else {
                    // Direct / 1-on-1 chat (Parent-Child, Coach-User, Friend-Friend, etc.)
                    const otherUid = getChatOtherUid(chat);
                    if (chat.type === 'parent' && chat.parentId && !isCurrentUser(chat.parentId)) {
                        dedupeKey = `direct_parent_${chat.parentId}`;
                    } else if (otherUid) {
                        dedupeKey = `direct_${otherUid}`;
                    } else if (chat.type === 'parent' && (chat.parentName || chat.childName || chat.studentName)) {
                        const pName = (chat.parentName || '').toLowerCase().trim();
                        const cName = (chat.childName || chat.studentName || '').toLowerCase().trim();
                        dedupeKey = `direct_parent_${pName}_${cName}`;
                    } else {
                        const cleanName = (chat.name || '')
                            .replace(/\(тренер\)|\(сотрудник\)|\(родитель\)|\(спортсмен\)|\(ученик\)|\(друг\)/gi, '')
                            .replace(/\s+/g, ' ')
                            .toLowerCase()
                            .trim();
                        dedupeKey = `direct_name_${cleanName || 'chat'}`;
                    }
                }

                const existing = chatMap.get(dedupeKey);
                if (!existing) {
                    chatMap.set(dedupeKey, chat);
                } else {
                    const existingTime = existing.lastMessageAt?.toMillis?.() || (existing.lastMessageAt?.seconds ? existing.lastMessageAt.seconds * 1000 : 0) || (existing.createdAt?.toMillis?.() || 0);
                    const newTime = chat.lastMessageAt?.toMillis?.() || (chat.lastMessageAt?.seconds ? chat.lastMessageAt.seconds * 1000 : 0) || (chat.createdAt?.toMillis?.() || 0);

                    // Prefer the chat with messages or newer activity
                    const preferNew = (Boolean(chat.lastMessage) && !existing.lastMessage) || (newTime > existingTime);
                    const primary = preferNew ? chat : existing;
                    const secondary = preferNew ? existing : chat;

                    chatMap.set(dedupeKey, {
                        ...secondary,
                        ...primary,
                        id: primary.id,
                        type: primary.type || secondary.type || (isGroup ? 'group' : 'private'),
                        isPrivate: !isGroup && !isSaved && !isChannel,
                        participants: Array.from(new Set([...(secondary.participants || []), ...(primary.participants || [])])),
                        participantNames: { ...(secondary.participantNames || {}), ...(primary.participantNames || {}) },
                        participantRoles: { ...(secondary.participantRoles || {}), ...(primary.participantRoles || {}) },
                        participantAvatars: { ...(secondary.participantAvatars || {}), ...(primary.participantAvatars || {}) }
                    });
                }
            }

            // Ensure Saved Messages item is always available for the current user
            const savedChatId = `saved_${user.uid}`;
            if (!chatMap.has(savedChatId)) {
                chatMap.set(savedChatId, {
                    id: savedChatId,
                    name: 'Избранное',
                    type: 'saved',
                    participants: [user.uid],
                    participantNames: { [user.uid]: userProfile?.childName || userProfile?.full_name || 'Я' },
                    lastMessage: 'Личное хранилище заметок и файлов',
                    isSaved: true
                });
            }

            const deduplicated = Array.from(chatMap.values()).sort((a: any, b: any) => {
                const aPinned = userPrefs[a.id]?.isPinned ? 1 : 0;
                const bPinned = userPrefs[b.id]?.isPinned ? 1 : 0;
                if (aPinned !== bPinned) return bPinned - aPinned;

                const aTime = a.lastMessageAt?.toMillis?.() || (a.lastMessageAt?.seconds ? a.lastMessageAt.seconds * 1000 : 0);
                const bTime = b.lastMessageAt?.toMillis?.() || (b.lastMessageAt?.seconds ? b.lastMessageAt.seconds * 1000 : 0);
                if (bTime !== aTime) return bTime - aTime;

                return (a.name || '').localeCompare(b.name || '');
            });

            setChats(deduplicated);
            setLoading(false);
        };

        const unsubscribe = onSnapshot(q, handleSnap, (error) => {
            console.error("Firestore chats query error, falling back:", error);
            clearTimeout(safetyTimer);
            setLoading(false);
        });

        return () => {
            clearTimeout(safetyTimer);
            unsubscribe();
        };
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

    // Fetch dynamic avatars/names/roles for direct chats
    useEffect(() => {
        const uidsToFetch = new Set<string>();
        chats.forEach(chat => {
            if (isDirectChat(chat) && Array.isArray(chat.participants)) {
                chat.participants.forEach((uid: string) => {
                    if (uid && uid !== user?.uid) uidsToFetch.add(uid);
                });
            }
        });

        // Also add parentId or studentUid from userProfile if available
        if (userProfile?.parentId) uidsToFetch.add(userProfile.parentId);
        if (userProfile?.studentUid) uidsToFetch.add(userProfile.studentUid);
        if (userProfile?.childId) uidsToFetch.add(userProfile.childId);

        if (uidsToFetch.size === 0) return;

        const uidsArray = Array.from(uidsToFetch).slice(0, 30);

        const q = query(collection(db, 'users'), where(documentId(), 'in', uidsArray));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newData: Record<string, any> = {};
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                newData[docSnap.id] = {
                    id: docSnap.id,
                    name: data.childName || data.full_name || data.name || data.email || 'Участник',
                    avatarUrl: data.photoURL || data.avatarUrl || '',
                    role: (data.role || 'student').toLowerCase(),
                    parentId: data.parentId,
                    studentUid: data.studentUid,
                    parentName: data.parentName,
                    childName: data.childName
                };
            });
            setParticipantData(prev => ({ ...prev, ...newData }));
        });

        return () => unsubscribe();
    }, [chats, user?.uid, userProfile?.parentId, userProfile?.studentUid, userProfile?.childId]);

    // Listen to real-time typing indicators for top active chats
    useEffect(() => {
        if (!user?.uid || chats.length === 0) return;

        const unsubscribes: Array<() => void> = [];
        const topChats = chats.slice(0, 15);

        topChats.forEach(chat => {
            const typingRef = collection(db, 'chats', chat.id, 'typing');
            const q = query(typingRef, where('isTyping', '==', true), limit(5));

            const unsub = onSnapshot(q, (snapshot) => {
                const names: string[] = [];
                snapshot.docs.forEach(docSnap => {
                    if (docSnap.id !== user.uid) {
                        const data = docSnap.data();
                        if (data.name) names.push(data.name.split(' ')[0]);
                    }
                });

                setTypingMap(prev => ({
                    ...prev,
                    [chat.id]: names
                }));
            }, () => {
                // Ignore silent permissions for legacy chat types
            });

            unsubscribes.push(unsub);
        });

        return () => {
            unsubscribes.forEach(u => u());
        };
    }, [chats, user?.uid]);

    // Quick contacts: Coaches, Friends, and Recent DM contacts for the Top Stories row
    const quickContacts = React.useMemo(() => {
        const list: Array<{
            id: string;
            name: string;
            avatar?: string;
            isCoach?: boolean;
            isFriend?: boolean;
            chatId?: string;
            targetUid?: string;
        }> = [];

        const seenIds = new Set<string>();

        // 1. Direct Coach chats
        chats.filter(isCoachChat).forEach(chat => {
            const otherId = chat.participants?.find((id: string) => id !== user.uid) || chat.id;
            if (!seenIds.has(otherId)) {
                seenIds.add(otherId);
                const liveData = participantData[otherId];
                list.push({
                    id: otherId,
                    name: liveData?.name || chat.name || 'Тренер',
                    avatar: liveData?.avatarUrl || chat.avatarUrl,
                    isCoach: true,
                    chatId: chat.id,
                    targetUid: otherId
                });
            }
        });

        // 2. Friends from friendships
        friends.forEach(f => {
            if (!seenIds.has(f.id) && f.id !== user.uid) {
                seenIds.add(f.id);
                const existingChat = chats.find(c => c.type === 'private' && c.participants?.includes(f.id));
                list.push({
                    id: f.id,
                    name: f.name || f.displayName || f.childName || 'Друг',
                    avatar: f.avatarUrl || f.photoURL,
                    isFriend: true,
                    chatId: existingChat?.id,
                    targetUid: f.id
                });
            }
        });

        // 3. Other direct chats (e.g. Developer, Staff)
        chats.filter(c => c.type === 'private' || c.type === 'direct').forEach(chat => {
            const otherId = chat.participants?.find((id: string) => id !== user.uid);
            if (otherId && !seenIds.has(otherId)) {
                seenIds.add(otherId);
                const liveData = participantData[otherId];
                list.push({
                    id: otherId,
                    name: liveData?.name || (chat.participantNames ? chat.participantNames[otherId] : chat.name),
                    avatar: liveData?.avatarUrl || chat.avatarUrl,
                    chatId: chat.id,
                    targetUid: otherId
                });
            }
        });

        return list;
    }, [chats, friends, participantData, user.uid]);

    // Fetch live stories from Firestore
    useEffect(() => {
        const q = query(
            collection(db, 'stories'),
            orderBy('createdAt', 'desc'),
            limit(25)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.docs.forEach(docSnap => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });
            setFirestoreStories(list);
        }, () => {
            // Ignore silent error
        });

        return () => unsubscribe();
    }, []);

    // Build unified rich Sparta Story Groups
    const storyGroups = React.useMemo<SpartaStoryGroup[]>(() => {
        const groupsMap = new Map<string, SpartaStoryGroup>();

        // 1. Live Firestore Stories
        firestoreStories.forEach(st => {
            const authorId = st.authorId || 'club';
            if (!groupsMap.has(authorId)) {
                groupsMap.set(authorId, {
                    authorId,
                    authorName: st.authorName || 'Спартанец',
                    authorAvatar: st.authorAvatar,
                    authorRole: st.authorRole || 'coach',
                    roleLabel: st.roleLabel || (st.authorRole === 'coach' ? 'Тренер' : 'Спарта'),
                    isUnseen: !viewedStoryIds.includes(st.id),
                    slides: []
                });
            }
            groupsMap.get(authorId)!.slides.push({
                id: st.id,
                title: st.title,
                subtitle: st.subtitle,
                description: st.description,
                gradient: st.gradient,
                mediaUrl: st.mediaUrl,
                mediaType: st.mediaType,
                poll: st.poll
            });
        });

        // 2. Default Trainer Pavel Story (rich interactive advice & workout updates)
        if (!groupsMap.has('pavel_coach')) {
            groupsMap.set('pavel_coach', {
                authorId: 'pavel_coach',
                authorName: 'Павел Якупов',
                authorRole: 'coach',
                roleLabel: 'Главный тренер',
                isUnseen: !viewedStoryIds.includes('pavel_coach_1'),
                slides: [
                    {
                        id: 'pavel_coach_1',
                        subtitle: '⚡ Совет дня',
                        title: 'Правильная постановка стопы при ударе',
                        description: 'Опорная нога должна стоять строго на одной линии с мячом на расстоянии 10-15 см. Смотрим в точку удара!',
                        gradient: 'bg-gradient-to-br from-amber-600 via-[#261908] to-black',
                        poll: {
                            question: 'Отработали это на прошлой тренировке?',
                            options: ['🔥 Да, получается отлично!', '⚽ Еще тренирую']
                        }
                    },
                    {
                        id: 'pavel_coach_2',
                        subtitle: '📢 Объявление команды',
                        title: 'Субботний контрольный матч в 12:00',
                        description: 'Всем быть за 20 минут до начала в белой форме Спарты. Будем играть двумя составами!',
                        gradient: 'bg-gradient-to-br from-emerald-700 via-[#071f16] to-black'
                    }
                ]
            });
        }

        // 3. Sparta Club Awards & News Story
        if (!groupsMap.has('sparta_club')) {
            groupsMap.set('sparta_club', {
                authorId: 'sparta_club',
                authorName: 'Sparta Club',
                authorRole: 'club',
                roleLabel: 'Спарта',
                isUnseen: !viewedStoryIds.includes('sparta_club_1'),
                slides: [
                    {
                        id: 'sparta_club_1',
                        subtitle: '🏆 Доска почета',
                        title: 'Топ-3 бомбардира недели',
                        description: '1. Никита Зонов (12 голов)\n2. Артем Смирнов (9 голов)\n3. Максим Волков (8 голов)',
                        gradient: 'bg-gradient-to-br from-purple-700 via-indigo-950 to-black',
                        poll: {
                            question: 'Поздравим чемпионов?',
                            options: ['🔥 Красавцы!', '👏 Вперед Спарта!']
                        }
                    }
                ]
            });
        }

        return Array.from(groupsMap.values());
    }, [firestoreStories, viewedStoryIds]);

    const handleOpenStoryGroup = (idx: number) => {
        setSelectedStoryGroupIndex(idx);
        setIsStoriesViewerOpen(true);

        const group = storyGroups[idx];
        if (group) {
            const newViewed = [...viewedStoryIds];
            group.slides.forEach(s => {
                if (!newViewed.includes(s.id)) newViewed.push(s.id);
            });
            setViewedStoryIds(newViewed);
            try {
                localStorage.setItem('sparta_viewed_stories', JSON.stringify(newViewed));
            } catch { }
        }
    };

    const handleStoryReply = async (authorId: string, authorName: string, text: string, storyTitle?: string) => {
        const targetChat = chats.find(c =>
            (c.type === 'private' || c.type === 'direct') &&
            c.participants?.includes(authorId)
        );

        const replyMessageText = storyTitle
            ? `💬 Ответ на историю «${storyTitle}»: ${text}`
            : `💬 Ответ на историю: ${text}`;

        if (targetChat) {
            handleSelectChat(targetChat, true);
            try {
                await addDoc(collection(db, 'chats', targetChat.id, 'messages'), {
                    senderId: user.uid,
                    senderName: userProfile?.full_name || userProfile?.childName || 'Спартанец',
                    text: replyMessageText,
                    timestamp: serverTimestamp()
                });
                await updateDoc(doc(db, 'chats', targetChat.id), {
                    lastMessage: replyMessageText,
                    lastMessageAt: serverTimestamp(),
                    lastMessageBy: user.uid
                });
            } catch (err) {
                console.error("Error sending story reply:", err);
            }
        } else {
            handleStartPrivateChat(authorId, authorName);
        }
    };

    const handleForwardStoryToChat = async (chatId: string, storyTitle: string) => {
        const text = `📢 Поделился историей Спарты: «${storyTitle}»`;
        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                senderId: user.uid,
                senderName: userProfile?.full_name || userProfile?.childName || 'Спартанец',
                text,
                timestamp: serverTimestamp()
            });
            await updateDoc(doc(db, 'chats', chatId), {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                lastMessageBy: user.uid
            });
        } catch (err) {
            console.error("Error forwarding story:", err);
        }
    };

    const handleDeleteStory = async (slideId: string) => {
        try {
            await deleteDoc(doc(db, 'stories', slideId));
        } catch (err) {
            console.error("Error deleting story:", err);
        }
    };

    // Fetch chat directly from Firestore by ID if not yet in cache or list
    const fetchChatById = async (chatId: string) => {
        try {
            const chatRef = doc(db, 'chats', chatId);
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const chatData = { id: chatSnap.id, ...chatSnap.data() };
                setChats(prev => {
                    if (prev.some(c => c.id === chatData.id)) return prev;
                    return [chatData, ...prev];
                });
                handleSelectChat(chatData, true);
                return;
            }

            // Fallback: check private_chats
            const privRef = doc(db, 'private_chats', chatId);
            const privSnap = await getDoc(privRef);
            if (privSnap.exists()) {
                const chatData = { id: privSnap.id, ...privSnap.data() };
                setChats(prev => {
                    if (prev.some(c => c.id === chatData.id)) return prev;
                    return [chatData, ...prev];
                });
                handleSelectChat(chatData, true);
            }
        } catch (err) {
            console.error("Error in fetchChatById:", err);
        }
    };

    // Auto-select chat when directChatId is present in URL or props
    useEffect(() => {
        if (!directChatId) return;

        // 1. Check if chat is already present in loaded chats
        const chatToSelect = chats.find(c =>
            c.id === directChatId ||
            (Array.isArray(c.participants) && c.participants.length === 2 && directChatId.includes(c.participants[0]) && directChatId.includes(c.participants[1]))
        );

        if (chatToSelect) {
            if (!selectedChat || selectedChat.id !== chatToSelect.id) {
                handleSelectChat(chatToSelect, true);
            }
            return;
        }

        // 2. If list is still loading or chat not in cache, force fetch document from Firestore
        fetchChatById(directChatId);
    }, [directChatId, chats]);

    // Deep-linking: auto-select chat from initialChatId or targetUid
    useEffect(() => {
        if (loading || isCreating) return;

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const effectiveChatId = directChatId || initialChatId || urlParams?.get('chatId');
        const effectiveTargetUid = initialTargetUid || urlParams?.get('targetUid');
        const effectiveTargetName = initialTargetName || urlParams?.get('targetName') || 'Пользователь';
        const effectiveStudentName = initialStudentName || urlParams?.get('studentName');

        const currentParamsKey = `${effectiveChatId}-${effectiveTargetUid}`;
        if (currentParamsKey === prevParamsKey.current && hasHandledParams.current) return;

        if (effectiveChatId) {
            const chatToSelect = chats.find(c => c.id === effectiveChatId);
            if (chatToSelect && (!selectedChat || selectedChat.id !== effectiveChatId)) {
                handleSelectChat(chatToSelect, true);
                hasHandledParams.current = true;
                prevParamsKey.current = currentParamsKey;
            } else if (!chatToSelect) {
                fetchChatById(effectiveChatId);
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
                    handleSelectChat(privateChat, true);
                    hasHandledParams.current = true;
                    prevParamsKey.current = currentParamsKey;
                }
            } else {
                handleStartPrivateChat(effectiveTargetUid, effectiveTargetName, effectiveStudentName || undefined);
                hasHandledParams.current = true;
                prevParamsKey.current = currentParamsKey;
            }
        }
    }, [directChatId, initialChatId, initialTargetUid, initialTargetName, initialStudentName, chats, isCreating, loading, user?.uid]);

    const handleSelectChat = async (chat: any, openMobile: boolean = true) => {
        setSelectedChat(chat);
        if (openMobile) {
            setIsMobileDetailVisible(true);
            onMobileDetailChange?.(true);
        }

        // Ensure the chat is visible in the current category if user manually clicked
        if (activeCategory !== 'all') {
            const matchesCurrent =
                (activeCategory === 'groups' && isGroupChat(chat)) ||
                (activeCategory === 'coach' && isCoachChat(chat)) ||
                (activeCategory === 'friends' && isFriendChat(chat)) ||
                (activeCategory === 'private' && (chat.type === 'private' || chat.type === 'direct')) ||
                (activeCategory === 'parents' && chat.type === 'parent') ||
                (activeCategory === 'staff' && (chat.type === 'staff' || chat.type === 'support'));

            if (!matchesCurrent) {
                if (isGroupChat(chat)) setActiveCategory('groups');
                else if (isCoachChat(chat)) setActiveCategory('coach');
                else if (isFriendChat(chat)) setActiveCategory('friends');
                else if (chat.type === 'parent') setActiveCategory('parents');
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

    // Auto-select on desktop ONLY (so on mobile, child always starts on the Chat List Hub)
    useEffect(() => {
        if (loading || chats.length === 0 || selectedChat) return;

        if (!directChatId && !initialChatId && !initialTargetUid) {
            if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                handleSelectChat(chats[0], false);
            }
        }
    }, [chats, loading, selectedChat, directChatId, initialChatId, initialTargetUid]);

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
        if (!user?.uid) return;
        const targetChat = chats.find(c => c.id === chatId);
        const isGroup = targetChat ? isGroupChat(targetChat) : false;

        // In group chats, regular users cannot clear history
        if (isGroup && !isStaff && !isAdmin && !isTrainer) {
            alert("История командного чата является общей и может быть очищена только тренером или администрацией.");
            setContextMenu(null);
            return;
        }

        const confirmText = isGroup
            ? "Очистить историю сообщений этой группы для всех участников?"
            : "Очистить историю диалога для вас? Сообщения собеседника не пострадают.";

        if (!window.confirm(confirmText)) return;
        setContextMenu(null);

        const now = new Date();
        const nowMillis = now.getTime();

        // 1. Update user's personal chat_prefs with lastClearedAt
        const prefRef = doc(db, 'users', user.uid, 'chat_prefs', chatId);
        const prefData = { lastClearedAt: serverTimestamp(), forceUnread: false };
        await updateDoc(prefRef, prefData).catch(async () => {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(prefRef, prefData, { merge: true });
        });

        // 2. Only if Group Admin / Trainer is intentionally clearing group history for everyone
        if (isGroup && (isAdmin || isTrainer || isDirector)) {
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: "История группы очищена тренером",
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }).catch(console.warn);
        }

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
        const matchesCategory = (() => {
            if (activeCategory === 'all') return true;
            if (activeCategory === 'saved') return chat.type === 'saved' || chat.id === `saved_${user.uid}`;
            if (activeCategory === 'groups') return isGroupChat(chat);
            if (activeCategory === 'coach') return isCoachChat(chat);
            if (activeCategory === 'child') return isChildChat(chat);
            if (activeCategory === 'family') return isParentDirectChat(chat);
            if (activeCategory === 'friends') return isFriendChat(chat);
            if (activeCategory === 'private') return isDirectChat(chat);
            if (activeCategory === 'parents') return isParentDirectChat(chat) || chat.type === 'parent';
            if (activeCategory === 'staff') return chat.type === 'staff' || chat.type === 'support';
            return chat.type === activeCategory;
        })();

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

        const aTime = a.lastMessageAt?.toMillis?.() || (a.lastMessageAt?.seconds ? a.lastMessageAt.seconds * 1000 : 0);
        const bTime = b.lastMessageAt?.toMillis?.() || (b.lastMessageAt?.seconds ? b.lastMessageAt.seconds * 1000 : 0);
        return bTime - aTime;
    });

    return (
        <div className="flex flex-col md:flex-row gap-4 h-full min-h-0 w-full relative overflow-hidden">
            {/* Sidebar: Chat List */}
            <AnimatePresence mode="wait">
                {(!isMobileDetailVisible || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`md:w-80 lg:w-96 shrink-0 flex flex-col gap-3 h-full min-h-0 w-full ${isMobileDetailVisible ? 'hidden md:flex' : 'flex'}`}
                    >
                        {/* Search & Action Bar */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={17} />
                                    <input
                                        type="text"
                                        placeholder="Поиск по диалогам и друзьям..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-sparta-gold/50 transition-all font-medium placeholder:text-white/30"
                                    />
                                </div>
                                {isStaff && (
                                    <button
                                        type="button"
                                        onClick={() => setIsModerationModalOpen(true)}
                                        className={`h-11 px-3.5 rounded-2xl border flex items-center gap-1.5 transition-all shrink-0 relative ${
                                            pendingReportsCount > 0
                                                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white'
                                        }`}
                                        title="Модерация и безопасность"
                                    >
                                        <Shield size={17} />
                                        {pendingReportsCount > 0 && (
                                            <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                                                {pendingReportsCount}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Stories & Contacts Carousel */}
                            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scrollbar-hide py-1.5 px-0.5">
                                {/* + Add Story Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsCreateStoryOpen(true)}
                                    className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sparta-gold/25 via-yellow-500/20 to-amber-500/10 border border-sparta-gold/40 flex items-center justify-center text-sparta-gold shadow-md group-hover:border-sparta-gold group-hover:shadow-[0_0_15px_rgba(255,184,0,0.35)] transition-all group-active:scale-95">
                                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                    </div>
                                    <span className="text-[9px] font-bold text-white/50 group-hover:text-sparta-gold transition-colors tracking-tight">
                                        + История
                                    </span>
                                </button>

                                {/* Story Avatars with Live Rings */}
                                {storyGroups.map((group, idx) => {
                                    const isUnseen = group.isUnseen;
                                    return (
                                        <button
                                            key={group.authorId}
                                            type="button"
                                            onClick={() => handleOpenStoryGroup(idx)}
                                            className="flex flex-col items-center gap-1 shrink-0 group relative focus:outline-none"
                                        >
                                            <div className={`w-11 h-11 rounded-2xl p-0.5 flex items-center justify-center transition-all relative group-active:scale-95 ${
                                                isUnseen
                                                    ? 'bg-gradient-to-tr from-sparta-gold via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(255,184,0,0.45)]'
                                                    : 'bg-white/15 hover:bg-white/30'
                                            }`}>
                                                <div className="w-full h-full rounded-[14px] bg-[#121216] flex items-center justify-center overflow-hidden border border-black/40">
                                                    {group.authorAvatar ? (
                                                        <img src={group.authorAvatar} alt={group.authorName} className="w-full h-full object-cover" />
                                                    ) : group.authorRole === 'coach' ? (
                                                        <Crown size={18} className="text-sparta-gold" />
                                                    ) : (
                                                        <Sparkles size={18} className="text-amber-300" />
                                                    )}
                                                </div>

                                                {/* Mini role star badge */}
                                                {group.authorRole === 'coach' && (
                                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-sparta-gold to-yellow-500 text-black flex items-center justify-center text-[7px] font-black shadow-md">
                                                        ★
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-semibold text-white/70 group-hover:text-white truncate max-w-[52px] tracking-tight">
                                                {group.authorName.split(' ')[0]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Highlights / Актуальное Sub-bar */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-hide py-1 px-0.5 border-t border-white/5 pt-1.5">
                                <div className="flex items-center gap-1 shrink-0 pr-1">
                                    <span className="text-[10px] font-russo uppercase tracking-wider text-sparta-gold flex items-center gap-1">
                                        <Star size={11} className="fill-sparta-gold text-sparta-gold" />
                                        <span>Актуальное</span>
                                    </span>
                                    {isStaff && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateHighlightOpen(true)}
                                            className="w-5 h-5 rounded-lg bg-sparta-gold/20 hover:bg-sparta-gold/40 text-sparta-gold flex items-center justify-center transition-all ml-0.5"
                                            title="Создать альбом актуального"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    )}
                                </div>

                                {highlights.map((album) => (
                                    <button
                                        key={album.id}
                                        type="button"
                                        onClick={() => handleOpenHighlight(album)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sparta-gold/40 transition-all shrink-0 group focus:outline-none"
                                    >
                                        <div className={`w-5 h-5 rounded-lg ${album.coverGradient} flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform`}>
                                            <Sparta3DReactionIcon emojiKey={album.coverIcon} size={13} />
                                        </div>
                                        <span className="text-[10px] font-bold text-white/80 group-hover:text-sparta-gold transition-colors truncate max-w-[110px]">
                                            {album.title}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Staff Missing Groups Alert */}
                            {isStaff && missingGroupsForUser.length > 0 && (
                                <Button
                                    onClick={handleFixMissingChats}
                                    disabled={isCreating}
                                    className="w-full bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse"
                                >
                                    <AlertTriangle size={15} /> ЧАТЫ НЕ СОЗДАНЫ ({missingGroupsForUser.length})
                                </Button>
                            )}
                        </div>

                        {/* Categories Horizontal Chip Bar */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-hide py-1">
                            {DYNAMIC_CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                const isSelected = activeCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl transition-all whitespace-nowrap shrink-0 border text-xs font-bold ${
                                            isSelected
                                                ? 'bg-sparta-gold text-black border-sparta-gold shadow-md shadow-sparta-gold/25 font-black scale-[1.02]'
                                                : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <Icon size={13} className={isSelected ? 'text-black' : 'text-sparta-gold'} />
                                        <span className="text-[11px] uppercase tracking-wider font-extrabold">{cat.label}</span>
                                        {cat.count !== undefined && cat.count > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black leading-none transition-colors ${
                                                isSelected
                                                    ? 'bg-black text-sparta-gold border border-black/30 shadow-xs'
                                                    : 'bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30'
                                            }`}>
                                                {cat.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sub-Categories (Sport Specific) for Admin/Director */}
                        <AnimatePresence mode="wait">
                            {(isAdmin || isDirector || isDeveloper) && activeCategory === 'groups' && availableSubCategories.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col gap-2 mb-1"
                                >
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 pl-1">Категории спорта</span>
                                    <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide no-scrollbar">
                                        <button
                                            onClick={() => setActiveSubCategory('all')}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 border ${activeSubCategory === 'all'
                                                ? 'bg-white/10 text-white border-white/20 shadow-lg shadow-black/20'
                                                : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'}`}
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
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 border ${activeSubCategory === subCat
                                                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/10'}`}
                                                >
                                                    <span className="text-xs">{display.icon}</span> {display.label} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Chat List Scroll Area */}
                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 custom-scrollbar">
                            {loading ? (
                                Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                                ))
                            ) : filteredChats.length === 0 ? (
                                <div className="py-14 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white/30">
                                        <MessageCircle size={32} />
                                    </div>
                                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Диалогов пока нет</p>
                                    <p className="text-[11px] text-white/30 max-w-[200px] mx-auto">
                                        {activeCategory === 'friends'
                                            ? 'Начни диалог с другом через кнопку «Написать» выше'
                                            : 'Выбери другую категорию или начни диалог'}
                                    </p>
                                </div>
                            ) : (
                                filteredChats.map(chat => {
                                    const thisIsSaved = chat.type === 'saved' || chat.id === `saved_${user.uid}`;
                                    const { otherId, details: otherParticipant, role: otherRole, name: interlocutorName, childInfo } = getOtherParticipantInfo(chat);

                                    const liveData = otherId ? participantData[otherId] : null;
                                    const isDirect = isDirectChat(chat);
                                    const thisIsCoach = isCoachChat(chat);
                                    const thisIsChild = isChildChat(chat);
                                    const thisIsParentRole = isParentDirectChat(chat);
                                    const thisIsFriend = isFriendChat(chat);
                                    const thisIsGroup = isGroupChat(chat);

                                    const displayName = thisIsSaved
                                        ? '⭐️ Избранное'
                                        : isDirect
                                            ? interlocutorName
                                            : chat.name;
                                    const displayAvatar = isDirect && otherId
                                        ? (otherParticipant?.avatarUrl || otherParticipant?.photoURL || liveData?.avatarUrl || (chat.participantAvatars ? chat.participantAvatars[otherId] : chat.avatarUrl))
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

                                    const isSelected = selectedChat?.id === chat.id;
                                    const isPinned = Boolean(userPrefs[chat.id]?.isPinned);

                                    return (
                                        <motion.div
                                            key={chat.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => handleSelectChat(chat, true)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    handleSelectChat(chat, true);
                                                }
                                            }}
                                            onContextMenu={(e) => handleContextMenu(e, chat.id)}
                                            onTouchStart={() => handleTouchStart(chat.id)}
                                            onTouchEnd={handleTouchEnd}
                                            className={`w-full p-3 rounded-2xl border transition-all text-left flex items-start gap-3 group relative overflow-hidden cursor-pointer ${
                                                isSelected
                                                    ? 'bg-[#181820] border-sparta-gold/50 shadow-[0_0_25px_rgba(212,175,55,0.15)] ring-1 ring-sparta-gold/40'
                                                    : isPinned
                                                        ? 'bg-sparta-gold/[0.04] border-sparta-gold/25 hover:bg-sparta-gold/[0.08] hover:border-sparta-gold/40'
                                                        : thisIsSaved
                                                            ? 'bg-sparta-gold/[0.02] border-sparta-gold/15 hover:bg-sparta-gold/[0.06] hover:border-sparta-gold/30'
                                                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                                            }`}
                                        >
                                            {/* Left Golden Neon Indicator for Active Chat */}
                                            {isSelected && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sparta-gold via-yellow-400 to-sparta-gold shadow-[0_0_10px_rgba(255,184,0,0.8)]" />
                                            )}

                                            {/* Avatar with Status & Role Ring */}
                                            <div className="relative shrink-0">
                                                {thisIsSaved ? (
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-sparta-gold to-yellow-600 flex items-center justify-center text-black shadow-md shadow-sparta-gold/20">
                                                        <Bookmark size={20} className="fill-black" />
                                                    </div>
                                                ) : (
                                                    <SpartaAvatar
                                                        src={displayAvatar}
                                                        name={displayName}
                                                        isGroup={thisIsGroup}
                                                        isCoach={thisIsCoach}
                                                        isAdmin={chat.type === 'channel' || displayName.toLowerCase().includes('администрация')}
                                                        size="md"
                                                        className={isSelected ? 'ring-2 ring-sparta-gold/60' : ''}
                                                    />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 pr-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <h4 className="text-sm font-bold truncate text-white">
                                                            {displayName}
                                                        </h4>
                                                        {isPinned && <Pin size={11} className="text-sparta-gold shrink-0 fill-sparta-gold/30" />}
                                                        {userPrefs[chat.id]?.isMuted && <BellOff size={11} className="text-white/30 shrink-0" />}
                                                    </div>
                                                    <span className="text-[10px] font-bold shrink-0 ml-1 text-white/40">
                                                        {previewTime}
                                                    </span>
                                                </div>

                                                {/* Role / Context Badge */}
                                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                    {thisIsSaved && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                                                            ⭐️ Заметки и файлы
                                                        </span>
                                                    )}
                                                    {thisIsCoach && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                                                            <Crown size={9} /> Тренер
                                                        </span>
                                                    )}
                                                    {thisIsParentRole && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            <Users size={9} /> Родитель
                                                        </span>
                                                    )}
                                                    {thisIsParentRole && (chat.childName || chat.studentName) && (
                                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300/80 border border-amber-500/20">
                                                            👨‍👩‍👧 {childInfo}
                                                        </span>
                                                    )}
                                                    {thisIsChild && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                                            <Baby size={9} /> {isTrainer ? 'Ученик' : 'Спортсмен'}
                                                        </span>
                                                    )}
                                                    {chat.type === 'staff' && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                                            🛡️ Персонал
                                                        </span>
                                                    )}
                                                    {isUnread && (
                                                        <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-sparta-gold to-yellow-500 text-black text-[9px] font-black shadow-[0_0_8px_rgba(255,184,0,0.8)] animate-pulse shrink-0 ml-auto leading-none">
                                                            НОВОЕ
                                                        </span>
                                                    )}
                                                </div>

                                                {typingMap[chat.id]?.length > 0 ? (
                                                    <p className="text-[11px] truncate leading-relaxed text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        <span>{typingMap[chat.id][0]} печатает...</span>
                                                    </p>
                                                ) : (
                                                    <p className={`text-[11px] truncate italic leading-relaxed ${
                                                        isSelected ? 'text-white/75 font-medium' : 'text-white/45 group-hover:text-white/65'
                                                    }`}>
                                                        {previewText}
                                                    </p>
                                                )}
                                            </div>

                                            {isStaff && (
                                                <button
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    className="absolute -right-10 group-hover:right-2 p-2 rounded-lg transition-all text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
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
                        className={`flex-1 h-full min-h-0 min-w-0 w-full ${!isMobileDetailVisible ? 'hidden md:flex flex-col' : 'flex flex-col'}`}
                    >
                        {selectedChat ? (
                            <div className="w-full h-full flex flex-col min-h-0 min-w-0 animate-in fade-in zoom-in-95 duration-300">
                                <GroupChat
                                    key={selectedChat.id}
                                    user={user}
                                    userProfile={userProfile}
                                    groupId={selectedChat.groupId || selectedChat.id}
                                    groupName={
                                        isDirectChat(selectedChat)
                                            ? getOtherParticipantInfo(selectedChat).name
                                            : selectedChat.name
                                    }
                                    isUnifiedChat={true}
                                    chatId={selectedChat.id}
                                    onSelectChat={(chat) => handleSelectChat(chat, true)}
                                    onStartPrivateChat={handleStartPrivateChat}
                                    onBack={() => setIsMobileDetailVisible(false)}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-b from-[#111116] to-[#0a0a0d] border border-white/10 rounded-[32px] flex flex-col items-center justify-center text-center p-8 lg:p-12 relative overflow-hidden shadow-2xl">
                                {/* Decorative Glow */}
                                <div className="absolute -top-24 -right-24 w-72 h-72 bg-sparta-gold/10 rounded-full blur-[100px] pointer-events-none" />
                                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

                                <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sparta-gold/20 to-yellow-600/10 border border-sparta-gold/30 flex items-center justify-center mb-6 shadow-xl shadow-sparta-gold/10">
                                        <MessageSquare size={36} className="text-sparta-gold" />
                                    </div>

                                    <h3 className="text-2xl lg:text-3xl font-russo text-white uppercase mb-2 tracking-tight">
                                        Центр Общения Спарты
                                    </h3>
                                    <p className="text-white/50 text-xs lg:text-sm font-medium leading-relaxed mb-8 max-w-md">
                                        Выбирай диалог слева или переходи сразу в нужный чат одним нажатием:
                                    </p>

                                    {/* 3 Quick Action Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
                                        {/* 1. Group Team Chat */}
                                        {(() => {
                                            const groupChat = chats.find(isGroupChat);
                                            return (
                                                <button
                                                    onClick={() => {
                                                        if (groupChat) handleSelectChat(groupChat, true);
                                                        else setActiveCategory('groups');
                                                    }}
                                                    className="p-5 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 transition-all group flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                            <Users size={20} />
                                                        </div>
                                                        <h4 className="text-sm font-bold text-white uppercase mb-1">Чат Команды</h4>
                                                        <p className="text-[11px] text-white/40 leading-snug">
                                                            {groupChat ? groupChat.name : 'Групповой чат секции и расписание'}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                        Открыть →
                                                    </span>
                                                </button>
                                            );
                                        })()}

                                        {/* 2. Coach Chat */}
                                        {(() => {
                                            const coachChat = chats.find(isCoachChat);
                                            return (
                                                <button
                                                    onClick={() => {
                                                        if (coachChat) handleSelectChat(coachChat, true);
                                                        else setActiveCategory('coach');
                                                    }}
                                                    className="p-5 rounded-2xl bg-white/5 hover:bg-sparta-gold/10 border border-white/10 hover:border-sparta-gold/30 transition-all group flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                            <Shield size={20} />
                                                        </div>
                                                        <h4 className="text-sm font-bold text-white uppercase mb-1">Чат с Тренером</h4>
                                                        <p className="text-[11px] text-white/40 leading-snug">
                                                            Персональные советы, вопросы и разбор техники
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-sparta-gold mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                        Написать →
                                                    </span>
                                                </button>
                                            );
                                        })()}

                                        {/* 3. Friends Chat */}
                                        <button
                                            onClick={() => setIsFriendPickerOpen(true)}
                                            className="p-5 rounded-2xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 transition-all group flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <Heart size={20} />
                                                </div>
                                                <h4 className="text-sm font-bold text-white uppercase mb-1">Диалоги с Друзьями</h4>
                                                <p className="text-[11px] text-white/40 leading-snug">
                                                    {friends.length > 0 ? `${friends.length} друзей в сети` : 'Общение с одноклубниками'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                Выбрать друга →
                                            </span>
                                        </button>
                                    </div>
                                </div>
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
                                                                                <Plus size={16} className="text-sparta-gold/50 group-hover:text-sparta-gold transition-colors" />
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

            {/* Student Friend Picker Modal */}
            <AnimatePresence>
                {isFriendPickerOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFriendPickerOpen(false)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-[#111116] border border-white/15 rounded-[32px] overflow-hidden shadow-2xl z-10 font-manrope"
                        >
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                        <Heart size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-russo text-white uppercase">Написать другу</h3>
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                            Твои друзья из Sparta Community ({friends.length})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsFriendPickerOpen(false)}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                                {friends.length === 0 ? (
                                    <div className="py-10 px-6 text-center bg-white/5 rounded-2xl border border-white/5">
                                        <Users size={36} className="text-white/20 mx-auto mb-3" />
                                        <h4 className="text-white font-bold text-sm mb-1">Пока нет добавленных друзей</h4>
                                        <p className="text-white/40 text-xs leading-relaxed mb-4">
                                            Найди друзей и одноклубников в разделе «Sparta Community», чтобы общаться и делиться спортивными успехами!
                                        </p>
                                        <button
                                            onClick={() => {
                                                setIsFriendPickerOpen(false);
                                                if (onTabChange) {
                                                    onTabChange('friends');
                                                } else {
                                                    window.dispatchEvent(new CustomEvent('sparta_navigate_tab', { detail: { tab: 'friends' } }));
                                                }
                                            }}
                                            className="px-4 py-2.5 rounded-xl bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-lg shadow-sparta-gold/20 cursor-pointer"
                                        >
                                            🚀 Перейти к поиску друзей
                                        </button>
                                    </div>
                                ) : (
                                    friends.map(friend => {
                                        const friendName = friend.childName || friend.displayName || friend.full_name || friend.name || friend.email || 'Друг';
                                        const friendAvatar = friend.photoURL || friend.avatarUrl || '';
                                        const friendGroup = friend.group || friend.groupName || friend.sport || 'Спарта';

                                        return (
                                            <div
                                                key={friend.id}
                                                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center text-sparta-gold font-bold shrink-0">
                                                        {friendAvatar ? (
                                                            <img src={friendAvatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            friendName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="text-sm font-bold text-white truncate">{friendName}</h5>
                                                        <p className="text-[11px] text-white/40 truncate">{friendGroup}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setIsFriendPickerOpen(false);
                                                        handleStartPrivateChat(friend.id, friendName);
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-sparta-gold/20 hover:bg-sparta-gold text-sparta-gold hover:text-black border border-sparta-gold/40 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                                                >
                                                    <MessageSquare size={14} /> Написать
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Role-Adaptive Chat Context Menu */}
            <AnimatePresence>
                {contextMenu && (() => {
                    const activeChat = chats.find(c => c.id === contextMenu.chatId);
                    if (!activeChat) return null;

                    const isTargetSaved = activeChat.type === 'saved' || activeChat.id === `saved_${user.uid}` || activeChat.id?.startsWith('saved_');
                    const isTargetDirect = isDirectChat(activeChat);
                    const isTargetGroup = isGroupChat(activeChat);
                    const otherId = activeChat.participants?.find((id: string) => id !== user.uid);
                    const liveOther = otherId ? participantData[otherId] : null;
                    const isTargetCoach = isCoachChat(activeChat);
                    const isTargetChild = isChildChat(activeChat);
                    const isTargetParent = isParentDirectChat(activeChat);

                    const menuTitle = isTargetSaved
                        ? '⭐️ Избранное'
                        : isTargetDirect && otherId
                            ? (liveOther?.name || (activeChat.participantNames ? activeChat.participantNames[otherId] : null) || (activeChat.name && !['родитель', 'ребенок', 'чат', 'группа'].includes(activeChat.name.toLowerCase()) ? activeChat.name : (isParent ? (userProfile?.childName || 'Ребенок') : (isStudent ? (userProfile?.parentName || 'Родитель') : activeChat.name))))
                            : activeChat.name || 'Чат';

                    const menuBadge = isTargetSaved
                        ? { label: '⭐️ Избранное', cls: 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/30' }
                        : isTargetCoach
                            ? { label: '👑 Тренер', cls: 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/30' }
                            : isTargetDirect && isParent && isTargetChild
                                ? { label: '👶 Спортсмен', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
                                : isTargetDirect && isStudent && isTargetParent
                                    ? { label: '👨‍👩‍👧 Родитель', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                                    : isTargetDirect && isTrainer && isTargetParent
                                        ? { label: '👨‍👩‍👧 Родитель', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                                        : isTargetDirect && isTrainer && isTargetChild
                                            ? { label: '👶 Ученик', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }
                                            : isTargetDirect
                                                ? { label: '🤝 Друг', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
                                                : { label: '⚽ Команда', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };

                    const canClearHistory = isTargetSaved || isTargetDirect || (isTargetGroup && (isAdmin || isTrainer || isDirector));
                    const canDeleteChat = isStaff || isAdmin || (isTrainer && (isTargetDirect || isTargetGroup));

                    return (
                        <>
                            <div
                                className="fixed inset-0 z-[120]"
                                onClick={() => setContextMenu(null)}
                                onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                style={{
                                    position: 'fixed',
                                    left: Math.min(contextMenu.x, window.innerWidth - 240),
                                    top: Math.min(contextMenu.y, window.innerHeight - 380),
                                }}
                                className="z-[130] w-60 bg-[#16161c]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden py-1.5 ring-1 ring-white/5"
                            >
                                {/* Context Header with Chat Preview & Role Badge */}
                                <div className="px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-black text-white truncate max-w-[130px]">
                                            {menuTitle}
                                        </p>
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${menuBadge.cls}`}>
                                            {menuBadge.label}
                                        </span>
                                    </div>
                                </div>

                                {/* General Actions */}
                                <div className="py-1">
                                    <ContextMenuItem
                                        icon={userPrefs[contextMenu.chatId!]?.isPinned ? PinOff : Pin}
                                        label={userPrefs[contextMenu.chatId!]?.isPinned ? "Открепить" : "Закрепить"}
                                        onClick={() => togglePin(contextMenu.chatId!)}
                                    />
                                    {!isTargetSaved && (
                                        <ContextMenuItem
                                            icon={userPrefs[contextMenu.chatId!]?.isMuted ? Bell : BellOff}
                                            label={userPrefs[contextMenu.chatId!]?.isMuted ? "Включить звук" : "Без звука"}
                                            onClick={() => toggleMute(contextMenu.chatId!)}
                                        />
                                    )}
                                    <ContextMenuItem
                                        icon={userPrefs[contextMenu.chatId!]?.forceUnread ? Eye : EyeOff}
                                        label={userPrefs[contextMenu.chatId!]?.forceUnread ? "Прочитано" : "Как непрочитанное"}
                                        onClick={() => toggleReadStatus(contextMenu.chatId!)}
                                    />
                                    <ContextMenuItem
                                        icon={ExternalLink}
                                        label="В отдельном окне"
                                        onClick={() => openInNewWindow(contextMenu.chatId!)}
                                    />
                                </div>

                                {isTargetDirect && (
                                    <>
                                        <div className="h-px bg-white/10 my-1 mx-3" />
                                        <div className="py-1">
                                            <ContextMenuItem
                                                icon={User}
                                                label={isParent && isTargetChild ? "Карточка спортсмена" : "Профиль собеседника"}
                                                onClick={() => {
                                                    handleSelectChat(activeChat, true);
                                                    setContextMenu(null);
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {canClearHistory && (
                                    <>
                                        <div className="h-px bg-white/10 my-1 mx-3" />
                                        <div className="py-1">
                                            <ContextMenuItem
                                                icon={History}
                                                label={isTargetSaved ? "Очистить заметки" : (isTargetGroup ? "Очистить историю группы" : "Очистить историю")}
                                                onClick={() => contextMenu?.chatId && clearHistory(contextMenu.chatId)}
                                            />
                                        </div>
                                    </>
                                )}

                                {canDeleteChat && (
                                    <>
                                        <div className="h-px bg-white/10 my-1 mx-3" />
                                        <div className="py-1">
                                            <ContextMenuItem
                                                icon={Trash2}
                                                label={isTargetGroup ? "Удалить группу" : "Удалить чат"}
                                                danger
                                                onClick={() => contextMenu?.chatId && handleDeleteChat(contextMenu.chatId, { stopPropagation: () => { } } as any)}
                                            />
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </>
                    );
                })()}
            </AnimatePresence>

            {/* Sparta Stories Interactive Viewer */}
            <SpartaStoriesViewer
                isOpen={isStoriesViewerOpen}
                initialGroupIndex={selectedStoryGroupIndex}
                storyGroups={storyGroups}
                currentUserId={user?.uid}
                currentUserProfile={userProfile}
                chats={chats}
                onClose={() => setIsStoriesViewerOpen(false)}
                onReplyToChat={handleStoryReply}
                onForwardStoryToChat={handleForwardStoryToChat}
                onDeleteStory={handleDeleteStory}
            />

            {/* Sparta Create Story Modal */}
            <SpartaCreateStoryModal
                isOpen={isCreateStoryOpen}
                onClose={() => setIsCreateStoryOpen(false)}
                user={user}
                userProfile={userProfile}
                onStoryCreated={() => {
                    // Refetch or let optimistic update show
                }}
            />

            {/* Sparta Moderation & Safety Modal (For Staff) */}
            <SpartaModerationModal
                isOpen={isModerationModalOpen}
                onClose={() => setIsModerationModalOpen(false)}
                currentUserId={user?.uid}
                currentUserProfile={userProfile}
            />

            {/* Sparta Create Highlights Modal (For Staff/Coach) */}
            <SpartaHighlightsModal
                isOpen={isCreateHighlightOpen}
                onClose={() => setIsCreateHighlightOpen(false)}
                user={user}
                userProfile={userProfile}
                availableStories={storyGroups.flatMap(g => g.slides)}
            />

            {/* Sparta Highlight Album Viewer */}
            {activeHighlightGroup && (
                <SpartaStoriesViewer
                    isOpen={!!activeHighlightGroup}
                    initialGroupIndex={0}
                    storyGroups={[activeHighlightGroup]}
                    currentUserId={user?.uid}
                    currentUserProfile={userProfile}
                    chats={chats}
                    onClose={() => setActiveHighlightGroup(null)}
                    onReplyToChat={handleStoryReply}
                    onForwardStoryToChat={handleForwardStoryToChat}
                    onDeleteStory={(storyId) => {
                        setActiveHighlightGroup(null);
                    }}
                />
            )}
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

        <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={16} className="text-sparta-gold" />
        </div>
    </motion.div>
);

export default MessagesSection;
