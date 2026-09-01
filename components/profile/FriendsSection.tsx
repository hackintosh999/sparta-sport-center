import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserPlus,
    UserMinus,
    Search,
    Check,
    X,
    MessageSquare,
    Loader2,
    User,
    Clock,
    UserCheck,
    Sparkles,
    Shield,
    Award,
    Trophy,
    Flame,
    Zap,
    Tag,
    Crown,
    ChevronRight,
    ExternalLink,
    Star,
    Heart
} from 'lucide-react';
import { db } from '../../firebase';
import { formatLastSeen } from '../../utils/timeFormat';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    addDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch,
    getDocs,
    limit
} from 'firebase/firestore';

interface FriendsSectionProps {
    user: any;
    userProfile: any;
    onSelectUser?: (userData: any) => void;
    onNavigateToChat?: (targetUid: string, targetName: string) => void;
}

const FriendsSection: React.FC<FriendsSectionProps> = ({ user, userProfile, onSelectUser, onNavigateToChat }) => {
    const [friends, setFriends] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [defaultUsers, setDefaultUsers] = useState<any[]>([]);
    const [teammates, setTeammates] = useState<any[]>([]);
    const [coachData, setCoachData] = useState<any>(null);
    const [loadingTeammates, setLoadingTeammates] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'team' | 'friends' | 'find' | 'requests'>('team');
    const [unfriendConfirmId, setUnfriendConfirmId] = useState<string | null>(null);
    const [positionFilter, setPositionFilter] = useState<'Все' | 'Вратарь' | 'Защитник' | 'Полузащитник' | 'Нападающий'>('Все');
    const [groupsMap, setGroupsMap] = useState<Record<string, any>>({});

    // Fetch Groups directory for clean naming
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const snap = await getDocs(collection(db, 'groups'));
                const map: Record<string, any> = {};
                snap.docs.forEach(d => {
                    const data = d.data();
                    map[d.id] = { id: d.id, name: data.name || data.title || d.id, ...data };
                });
                setGroupsMap(map);
            } catch (e) {
                console.error("Error fetching groups:", e);
            }
        };
        fetchGroups();
    }, []);

    const userGroup = userProfile?.group || userProfile?.groupId || userProfile?.targetGroupId;

    const formatGroupName = (groupVal?: string) => {
        if (!groupVal) return 'Тренировочная группа Спарта';
        const str = String(groupVal).trim();
        if (!str) return 'Тренировочная группа Спарта';
        if (groupsMap[str]?.name) return groupsMap[str].name;
        const isRawFirestoreId = /^[A-Za-z0-9_-]{18,32}$/.test(str);
        if (isRawFirestoreId) {
            return 'Тренировочная группа Спарта';
        }
        return str;
    };

    const userDisplayGroup = formatGroupName(userGroup);

    // 1. Fetch Teammates & Coach in the same group
    useEffect(() => {
        if (!user) return;
        const fetchTeamAndCoach = async () => {
            const grp = userGroup;
            if (!grp) {
                if (friends.length > 0) setActiveTab('friends');
                return;
            }

            setLoadingTeammates(true);
            try {
                let coachId = userProfile?.coachId;
                const groupObj = groupsMap[grp];
                if (groupObj) {
                    coachId = groupObj.coachId || groupObj.trainerId || coachId;
                } else {
                    try {
                        const grpDoc = await getDoc(doc(db, 'groups', grp));
                        if (grpDoc.exists()) {
                            const gData = grpDoc.data();
                            coachId = gData.coachId || gData.trainerId || coachId;
                        }
                    } catch (e) {}
                }

                // Fetch coach details
                if (coachId) {
                    try {
                        const cSnap = await getDoc(doc(db, 'users', coachId));
                        if (cSnap.exists()) {
                            setCoachData({ id: cSnap.id, ...cSnap.data() });
                        }
                    } catch (e) {}
                }

                // Fetch students in this group
                const qGroupUsers = query(collection(db, 'users'), where('groupId', '==', grp));
                const snap = await getDocs(qGroupUsers);
                let list = snap.docs
                    .filter(d => d.id !== user.uid && d.id !== coachId)
                    .map(d => ({ id: d.id, ...d.data() }));

                if (list.length === 0) {
                    const qAlt = query(collection(db, 'users'), where('group', '==', grp));
                    const snapAlt = await getDocs(qAlt);
                    list = snapAlt.docs
                        .filter(d => d.id !== user.uid && d.id !== coachId)
                        .map(d => ({ id: d.id, ...d.data() }));
                }

                setTeammates(list);
            } catch (err) {
                console.error("Error fetching teammates:", err);
            } finally {
                setLoadingTeammates(false);
            }
        };

        fetchTeamAndCoach();
    }, [user, userGroup, userProfile?.coachId, groupsMap]);

    // Position Badge Helper
    const getPositionBadge = (position?: string) => {
        if (!position) return null;
        const pos = position.toLowerCase();
        if (pos.includes('вратар')) return { text: 'Вратарь', emoji: '🧤', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
        if (pos.includes('защитн')) return { text: 'Защитник', emoji: '🛡️', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
        if (pos.includes('полузащитн')) return { text: 'Полузащитник', emoji: '🏃', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
        if (pos.includes('нападающ')) return { text: 'Нападающий', emoji: '⚽', bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
        return { text: position, emoji: '⚡', bg: 'bg-white/10 text-white/80 border-white/20' };
    };

    // Realtime Friends, Inbound and Outbound Requests
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Safety fallback timer
        const timer = setTimeout(() => setLoading(false), 2000);

        // 1. Friendships
        const friendshipQuery = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
        const unsubFriends = onSnapshot(friendshipQuery, async (snapshot) => {
            clearTimeout(timer);
            const friendUids = snapshot.docs.map(d => d.data().users.find((id: string) => id !== user.uid)).filter(Boolean);

            if (friendUids.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            const friendData: any[] = [];
            for (const uid of friendUids) {
                try {
                    const userSnap = await getDoc(doc(db, 'users', uid));
                    if (userSnap.exists()) {
                        friendData.push({ id: userSnap.id, ...userSnap.data() });
                    }
                } catch (e) {
                    console.error("Error fetching friend doc:", e);
                }
            }
            setFriends(friendData);
            setLoading(false);
        }, () => {
            clearTimeout(timer);
            setLoading(false);
        });

        // 2. Incoming Requests
        const inQuery = query(collection(db, 'friend_requests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
        const unsubIn = onSnapshot(inQuery, async (snapshot) => {
            const reqData: any[] = [];
            for (const d of snapshot.docs) {
                const data = d.data();
                try {
                    const userSnap = await getDoc(doc(db, 'users', data.fromId));
                    if (userSnap.exists()) {
                        reqData.push({ requestId: d.id, id: userSnap.id, ...userSnap.data(), ...data });
                    }
                } catch (e) {}
            }
            setIncomingRequests(reqData);
        });

        // 3. Outgoing Requests
        const outQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('status', '==', 'pending'));
        const unsubOut = onSnapshot(outQuery, async (snapshot) => {
            const reqData: any[] = [];
            for (const d of snapshot.docs) {
                const data = d.data();
                try {
                    const userSnap = await getDoc(doc(db, 'users', data.toId));
                    if (userSnap.exists()) {
                        reqData.push({ requestId: d.id, id: userSnap.id, ...userSnap.data(), ...data });
                    }
                } catch (e) {}
            }
            setOutgoingRequests(reqData);
        });

        return () => {
            clearTimeout(timer);
            unsubFriends();
            unsubIn();
            unsubOut();
        };
    }, [user]);

    // Fetch default active users for exploration
    useEffect(() => {
        if (!user) return;
        const fetchDefaultUsers = async () => {
            try {
                const q = query(collection(db, 'users'), limit(24));
                const snap = await getDocs(q);
                const list = snap.docs
                    .filter(d => d.id !== user.uid)
                    .map(d => ({ id: d.id, ...d.data() }));
                setDefaultUsers(list);
            } catch (e) {
                console.error("Error fetching default users:", e);
            }
        };
        fetchDefaultUsers();
    }, [user]);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery.trim());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Search query execution
    useEffect(() => {
        if (!user) return;
        const term = debouncedQuery;
        if (!term || term.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const executeSearch = async () => {
            try {
                const usersRef = collection(db, 'users');
                const termLower = term.toLowerCase();

                const fallbackQuery = query(usersRef, limit(40));
                const fallbackSnap = await getDocs(fallbackQuery);
                const map = new Map<string, any>();

                fallbackSnap.docs.forEach(d => {
                    const u: any = d.data();
                    const fullName = `${u.childFirstName || ''} ${u.childLastName || ''} ${u.childName || ''} ${u.displayName || ''} ${u.full_name || ''} ${u.name || ''}`.toLowerCase();
                    if (d.id !== user.uid && (fullName.includes(termLower) || (u.email || '').toLowerCase().includes(termLower))) {
                        map.set(d.id, { id: d.id, ...u });
                    }
                });

                setSearchResults(Array.from(map.values()).slice(0, 16));
            } catch (e) {
                console.error("Error searching users:", e);
            } finally {
                setIsSearching(false);
            }
        };

        executeSearch();
    }, [debouncedQuery, user]);

    // Actions: Send Friend Request
    const handleSendRequest = async (targetUid: string) => {
        try {
            await addDoc(collection(db, 'friend_requests'), {
                fromId: user.uid,
                toId: targetUid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error sending friend request:", e);
        }
    };

    // Actions: Accept Friend Request
    const handleAcceptRequest = async (request: any) => {
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'friend_requests', request.requestId), { status: 'accepted' });
            batch.set(doc(collection(db, 'friendships')), {
                users: [user.uid, request.fromId],
                createdAt: serverTimestamp()
            });
            await batch.commit();
        } catch (e) {
            console.error("Error accepting request:", e);
        }
    };

    // Actions: Decline Request
    const handleDeclineRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friend_requests', requestId));
        } catch (e) {
            console.error("Error declining request:", e);
        }
    };

    // Actions: Cancel Outgoing Request
    const handleCancelRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friend_requests', requestId));
        } catch (e) {
            console.error("Error canceling request:", e);
        }
    };

    // Actions: Unfriend
    const handleUnfriend = async (friendId: string) => {
        try {
            const q = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
            const snap = await getDocs(q);
            const docToDelete = snap.docs.find(d => d.data().users.includes(friendId));
            if (docToDelete) await deleteDoc(docToDelete.ref);
            setUnfriendConfirmId(null);
        } catch (e) {
            console.error("Error unfriending:", e);
        }
    };

    // Role badge
    const getRoleBadge = (role?: string) => {
        const r = (role || '').toLowerCase();
        if (['trainer', 'coach'].includes(r)) {
            return { text: 'Тренер', bg: 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/30', icon: <Crown size={11} /> };
        }
        if (['admin', 'director', 'developer', 'dev'].includes(r)) {
            return { text: 'Штаб', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: <Shield size={11} /> };
        }
        if (r === 'parent') {
            return { text: 'Родитель', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: null };
        }
        return { text: 'Атлет', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <Trophy size={11} /> };
    };

    // Initials helper
    const getInitials = (nameStr?: string) => {
        if (!nameStr || typeof nameStr !== 'string') return 'СП';
        const clean = nameStr.trim().replace(/^undefined\s*|undefined$/i, '');
        if (!clean || clean.toUpperCase().includes('UNDEFINED')) return 'СП';
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        if (parts.length === 1 && parts[0].length >= 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return 'СП';
    };

    // Navigate to Chat helper
    const openChatWithUser = (uid: string, targetName: string) => {
        if (onNavigateToChat) {
            onNavigateToChat(uid, targetName);
        } else {
            const newUrl = `/dashboard?tab=messages_unified&targetUid=${uid}&targetName=${encodeURIComponent(targetName)}`;
            window.history.pushState({}, '', newUrl);
            window.dispatchEvent(new CustomEvent('sparta_navigate_tab', { detail: { tab: 'messages_unified', targetUid: uid, targetName } }));
        }
    };

    // RENDER: Athlete / Teammate Card
    const renderUserCard = (u: any, mode: 'friend' | 'teammate' | 'request_in' | 'request_out' | 'search') => {
        const roleBadge = getRoleBadge(u.role);
        const name = `${u.childFirstName || u.firstName || ''} ${u.childLastName || u.lastName || ''}`.trim() || u.displayName || u.childName || u.full_name || u.name || 'Спартанец';

        const isFriend = friends.some(f => f.id === u.id);
        const outgoingReq = outgoingRequests.find(r => r.toId === u.id || r.id === u.id);
        const incomingReq = incomingRequests.find(r => r.fromId === u.id || r.id === u.id);

        const presenceText = formatLastSeen(u.lastSeen, u.isOnline);
        const posBadge = getPositionBadge(u.footballPosition || u.position);
        const achCount = Array.isArray(u.achievements) ? u.achievements.length : 0;

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-[#131418] hover:bg-[#181920] border border-white/10 hover:border-sparta-gold/50 rounded-3xl p-5 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
                <div>
                    {/* Card Top: Avatar & Meta */}
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div
                            onClick={() => onSelectUser?.(u)}
                            className="relative cursor-pointer shrink-0"
                            title="Открыть карточку спортсмена"
                        >
                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sparta-gold/20 to-white/5 p-0.5 border border-white/15 group-hover:border-sparta-gold/60 transition-all overflow-hidden">
                                {u.photoURL || u.avatarUrl ? (
                                    <img
                                        src={u.photoURL || u.avatarUrl}
                                        alt={name}
                                        className="w-full h-full rounded-[14px] object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-[14px] bg-white/5 flex items-center justify-center font-russo text-base text-sparta-gold">
                                        {getInitials(name)}
                                    </div>
                                )}
                            </div>

                            {/* Verification Tick */}
                            {u.verification?.isVerified && (
                                <span className="absolute -top-1 -right-1 bg-sparta-gold text-black rounded-full p-0.5 border border-black shadow z-10" title="Подтвержденный атлет">
                                    <Check size={9} strokeWidth={3} />
                                </span>
                            )}

                            {/* Live Online Dot */}
                            {u.isOnline ? (
                                <span
                                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#131418] shadow-[0_0_10px_#22c55e] z-10"
                                    title="Сейчас онлайн"
                                />
                            ) : null}
                        </div>

                        {/* Athlete Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <h4
                                    onClick={() => onSelectUser?.(u)}
                                    className="text-sm sm:text-base font-russo text-white group-hover:text-sparta-gold transition-colors truncate cursor-pointer"
                                >
                                    {name}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${roleBadge.bg}`}>
                                    {roleBadge.icon}
                                    {roleBadge.text}
                                </span>
                            </div>

                            {/* Presence Status */}
                            <p className={`text-[11px] font-semibold flex items-center gap-1.5 mb-2 ${u.isOnline ? 'text-emerald-400 font-bold' : 'text-white/40'}`}>
                                {u.isOnline ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                        <span>В сети</span>
                                    </>
                                ) : (
                                    <span>{presenceText || 'Был недавно'}</span>
                                )}
                            </p>

                            {/* Position & Achievements Tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {posBadge && (
                                    <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 shadow-sm ${posBadge.bg}`}>
                                        <span>{posBadge.emoji}</span>
                                        <span>{posBadge.text}</span>
                                    </span>
                                )}

                                {achCount > 0 ? (
                                    <span className="px-2.5 py-1 rounded-xl bg-sparta-gold/10 border border-sparta-gold/25 text-[10px] text-sparta-gold font-bold flex items-center gap-1 shadow-sm">
                                        <Trophy size={11} />
                                        <span>{achCount} {achCount === 1 ? 'награда' : achCount < 5 ? 'награды' : 'наград'}</span>
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white/35 font-medium flex items-center gap-1">
                                        <Star size={10} className="text-white/20" />
                                        <span>Новичок клуба</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center gap-2">
                    {/* View Card Button */}
                    <button
                        onClick={() => onSelectUser?.(u)}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-1"
                        title="Открыть карточку профиля"
                    >
                        <User size={14} />
                    </button>

                    {/* Chat Button */}
                    <button
                        onClick={() => openChatWithUser(u.id, name)}
                        className="flex-1 py-2.5 px-3 bg-sparta-gold/15 hover:bg-sparta-gold text-sparta-gold hover:text-black border border-sparta-gold/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm font-manrope"
                    >
                        <MessageSquare size={14} /> Написать
                    </button>

                    {/* Friendship Action Button */}
                    {mode === 'friend' ? (
                        unfriendConfirmId === u.id ? (
                            <div className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 p-1 rounded-xl">
                                <button
                                    onClick={() => handleUnfriend(u.id)}
                                    className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase"
                                >
                                    Да
                                </button>
                                <button
                                    onClick={() => setUnfriendConfirmId(null)}
                                    className="px-2 py-1.5 bg-white/10 text-white/70 rounded-lg text-[10px]"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setUnfriendConfirmId(u.id)}
                                className="p-2.5 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-all border border-white/5"
                                title="Удалить из друзей"
                            >
                                <UserMinus size={15} />
                            </button>
                        )
                    ) : mode === 'request_in' ? (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handleAcceptRequest(u)}
                                className="py-2 px-3 bg-sparta-gold text-black rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-yellow-400 transition-all flex items-center gap-1 shadow-md shadow-sparta-gold/20"
                            >
                                <Check size={14} strokeWidth={3} /> Принять
                            </button>
                            <button
                                onClick={() => handleDeclineRequest(u.requestId)}
                                className="p-2 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-xl transition-all border border-white/5"
                                title="Отклонить"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    ) : mode === 'request_out' ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={11} className="text-sparta-gold" /> Ожидание
                            </span>
                            <button
                                onClick={() => handleCancelRequest(u.requestId)}
                                className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-md text-[9px] font-bold transition-all ml-1"
                            >
                                Отмена
                            </button>
                        </div>
                    ) : (
                        // Search / Teammates Mode
                        isFriend ? (
                            <span className="py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-bold flex items-center gap-1">
                                <Check size={13} strokeWidth={3} /> В друзьях
                            </span>
                        ) : outgoingReq ? (
                            <span className="py-2 px-3 bg-white/5 border border-white/10 text-white/50 rounded-xl text-[10px] font-bold flex items-center gap-1">
                                <Clock size={12} className="text-sparta-gold" /> Заявка
                            </span>
                        ) : incomingReq ? (
                            <button
                                onClick={() => handleAcceptRequest(incomingReq)}
                                className="py-2 px-3 bg-sparta-gold text-black rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-yellow-400 transition-all flex items-center gap-1 shadow-md shadow-sparta-gold/20"
                            >
                                <Check size={13} strokeWidth={3} /> Принять
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSendRequest(u.id)}
                                className="py-2 px-3.5 bg-sparta-gold text-black hover:bg-yellow-400 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-sparta-gold/20 font-manrope"
                            >
                                <UserPlus size={14} /> В друзья
                            </button>
                        )
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-6 select-none font-manrope">
            {/* Header with Title and Modern Tab Navigation */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-russo text-white uppercase tracking-tight flex items-center gap-3">
                        <span className="p-3 bg-gradient-to-br from-sparta-gold/20 to-yellow-500/10 rounded-2xl text-sparta-gold border border-sparta-gold/30 shadow-lg shadow-sparta-gold/10">
                            <Users size={26} />
                        </span>
                        Команда & Друзья
                    </h2>
                    <p className="text-xs sm:text-sm text-white/40 font-medium mt-1">
                        Твои сокомандники по секции, подтвержденные друзья и спартанцы клуба
                    </p>
                </div>

                {/* 4 Clear Navigation Tabs */}
                <div className="grid grid-cols-2 sm:flex p-1.5 bg-[#121318] rounded-2xl border border-white/10 w-full lg:w-auto gap-1 shadow-inner">
                    {[
                        { id: 'team', label: '⚽ Команда', count: teammates.length > 0 ? teammates.length : null },
                        { id: 'friends', label: '🤝 Друзья', count: friends.length },
                        { id: 'find', label: '🔍 Поиск', count: null },
                        { id: 'requests', label: '📬 Заявки', count: incomingRequests.length + outgoingRequests.length }
                    ].map(tab => {
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                                    isSelected
                                        ? 'bg-sparta-gold text-black font-black shadow-lg shadow-sparta-gold/25'
                                        : 'text-white/50 hover:text-white hover:bg-white/5 font-semibold'
                                }`}
                            >
                                <span className="text-[11px] font-black uppercase tracking-wider leading-none font-russo">
                                    {tab.label}
                                </span>
                                {tab.count !== null && tab.count > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                                        isSelected ? 'bg-black/25 text-black' : 'bg-white/10 text-sparta-gold'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Pane */}
            <div className="flex-1 min-h-0 bg-[#0B0C10]/90 backdrop-blur-2xl rounded-[32px] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                <AnimatePresence mode="wait">
                    {/* TAB 1: ⚽ TEAM (SECTION) */}
                    {activeTab === 'team' && (
                        <motion.div
                            key="team"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                        >
                            {/* Team Header Banner */}
                            <div className="p-6 rounded-[28px] bg-gradient-to-r from-[#181920] via-[#151720] to-[#121318] border border-white/10 relative overflow-hidden shadow-xl">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-sparta-gold/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                                
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-full bg-sparta-gold/20 border border-sparta-gold/40 text-[10px] font-black text-sparta-gold uppercase tracking-widest">
                                                Твоя секция
                                            </span>
                                            <span className="text-white/40 text-xs font-bold">
                                                {teammates.length} {teammates.length === 1 ? 'одноклубник' : teammates.length < 5 ? 'одноклубника' : 'одноклубников'}
                                            </span>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-tight">
                                            {userDisplayGroup}
                                        </h3>
                                        <p className="text-xs text-white/50 leading-relaxed max-w-xl">
                                            Здесь собраны все ребята и наставники твоей тренировочной группы. Общайтесь, делитесь победами и поддерживайте друг друга на поле!
                                        </p>
                                    </div>

                                    {/* Coach Card Component */}
                                    {coachData && (
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3.5 shrink-0 max-w-xs">
                                            <div className="w-12 h-12 rounded-xl bg-sparta-gold/20 border border-sparta-gold/40 overflow-hidden shrink-0 flex items-center justify-center text-sparta-gold font-bold">
                                                {coachData.photoURL || coachData.avatarUrl ? (
                                                    <img src={coachData.photoURL || coachData.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Crown size={22} />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-sparta-gold flex items-center gap-1">
                                                    <Crown size={10} /> Главный тренер
                                                </span>
                                                <h5 className="text-sm font-bold text-white truncate">
                                                    {coachData.displayName || coachData.full_name || coachData.name || 'Тренер Спарта'}
                                                </h5>
                                                <button
                                                    onClick={() => openChatWithUser(coachData.id, coachData.displayName || 'Тренер')}
                                                    className="mt-1 text-[11px] font-bold text-sparta-gold hover:underline flex items-center gap-1"
                                                >
                                                    <MessageSquare size={12} /> Написать тренеру →
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Teammates List */}
                            {loadingTeammates ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-sparta-gold" size={36} />
                                </div>
                            ) : teammates.length === 0 ? (
                                <div className="py-16 px-6 text-center bg-white/5 rounded-3xl border border-white/5 max-w-lg mx-auto">
                                    <Users size={48} className="text-sparta-gold/40 mx-auto mb-4" />
                                    <h4 className="text-lg font-russo text-white uppercase mb-2">
                                        В твоей группе пока нет других атлетов
                                    </h4>
                                    <p className="text-xs text-white/50 leading-relaxed mb-6">
                                        Как только тренер добавит новых одноклубников в твою секцию, они автоматически появятся здесь! А пока ты можешь найти друзей из других групп в поиске.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('find')}
                                        className="px-6 py-3 rounded-xl bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-lg shadow-sparta-gold/20"
                                    >
                                        🔍 Найти спартанцев в клубе
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40">
                                            Состав команды ({teammates.length})
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {teammates.map(t => renderUserCard(t, 'teammate'))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TAB 2: 🤝 MY FRIENDS */}
                    {activeTab === 'friends' && (
                        <motion.div
                            key="friends"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-sparta-gold" size={36} />
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="space-y-8">
                                    {/* Empty Friends Banner */}
                                    <div className="py-12 px-6 text-center bg-[#131418] rounded-3xl border border-white/10 max-w-xl mx-auto shadow-xl">
                                        <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto mb-4 shadow-lg">
                                            <Heart size={28} />
                                        </div>
                                        <h4 className="text-xl font-russo text-white uppercase mb-2">
                                            У тебя пока нет добавленных друзей
                                        </h4>
                                        <p className="text-xs text-white/50 leading-relaxed max-w-md mx-auto mb-6">
                                            Добавляй в друзья ребят из своей секции или других групп Спарты, чтобы общаться, делиться победами и следить за достижениями друг друга!
                                        </p>
                                        <div className="flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setActiveTab('team')}
                                                className="px-5 py-3 rounded-xl bg-sparta-gold text-black font-russo text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-lg shadow-sparta-gold/20 flex items-center gap-2"
                                            >
                                                ⚽ Моя команда ({teammates.length})
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('find')}
                                                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-russo text-xs uppercase tracking-wider border border-white/10 transition-all"
                                            >
                                                🔍 Поиск ребят
                                            </button>
                                        </div>
                                    </div>

                                    {/* Recommended Teammates Showcase */}
                                    {teammates.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-sparta-gold flex items-center gap-2">
                                                    <Sparkles size={14} /> Рекомендуемые одноклубники ({teammates.length})
                                                </h4>
                                                <button
                                                    onClick={() => setActiveTab('team')}
                                                    className="text-xs text-white/50 hover:text-white font-bold"
                                                >
                                                    Вся команда →
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {teammates.slice(0, 6).map(t => renderUserCard(t, 'teammate'))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white/40">
                                            Твои друзья ({friends.length})
                                        </h4>
                                        <button
                                            onClick={() => setActiveTab('find')}
                                            className="text-xs text-sparta-gold hover:underline font-bold flex items-center gap-1"
                                        >
                                            <UserPlus size={13} /> Добавить еще друзей
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {friends.map(f => renderUserCard(f, 'friend'))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* TAB 3: 🔍 FIND ATHLETES */}
                    {activeTab === 'find' && (
                        <motion.div
                            key="find"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                        >
                            {/* Search Box */}
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-sparta-gold transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Найти одноклубника по имени, фамилии или почте..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#131418] border border-white/15 rounded-3xl py-4 pl-14 pr-12 text-sm text-white focus:border-sparta-gold outline-none transition-all placeholder:text-white/30 shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Position Filter Pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {[
                                    { id: 'Все', label: 'Все позиции', emoji: '🌟' },
                                    { id: 'Вратарь', label: 'Вратари', emoji: '🧤' },
                                    { id: 'Защитник', label: 'Защитники', emoji: '🛡️' },
                                    { id: 'Полузащитник', label: 'Полузащитники', emoji: '🏃' },
                                    { id: 'Нападающий', label: 'Нападающие', emoji: '⚽' }
                                ].map(filter => (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        onClick={() => setPositionFilter(filter.id as any)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                                            positionFilter === filter.id
                                                ? 'bg-sparta-gold text-black border-sparta-gold shadow-md shadow-sparta-gold/20 font-black font-russo'
                                                : 'bg-[#131418] text-white/60 border-white/10 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span>{filter.emoji}</span>
                                        <span>{filter.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Search Results / Exploration Grid */}
                            {isSearching ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-sparta-gold" size={36} />
                                </div>
                            ) : (() => {
                                const baseList = debouncedQuery.length >= 2 ? searchResults : defaultUsers;
                                const filteredResults = baseList.filter(u => {
                                    if (positionFilter === 'Все') return true;
                                    const pos = u.footballPosition || u.position;
                                    return pos === positionFilter;
                                });

                                if (filteredResults.length > 0) {
                                    return (
                                        <div>
                                            <div className="text-xs uppercase font-black tracking-widest text-white/40 mb-4 px-1">
                                                {debouncedQuery.length >= 2
                                                    ? `Результаты поиска (${filteredResults.length})`
                                                    : `Спартанцы клуба (${filteredResults.length})`}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {filteredResults.map(u => renderUserCard(u, 'search'))}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex flex-col items-center justify-center py-16 text-center bg-[#131418]/60 rounded-3xl border border-white/5 p-8 max-w-md mx-auto">
                                        <Users size={44} className="mb-3 text-sparta-gold/50" />
                                        <p className="text-base font-russo uppercase text-white">
                                            {debouncedQuery.length >= 2
                                                ? `Никто не найден по запросу «${debouncedQuery}»`
                                                : `Атлеты с позицией «${positionFilter}» не найдены`}
                                        </p>
                                        <p className="text-xs text-white/50 mt-1">Попробуй изменить поисковый запрос или выбрать другой фильтр позиции</p>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* TAB 4: 📬 REQUESTS */}
                    {activeTab === 'requests' && (
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                        >
                            {/* Inbound Requests */}
                            {incomingRequests.length > 0 && (
                                <div>
                                    <h3 className="text-xs uppercase font-black tracking-widest text-sparta-gold mb-4 px-1 flex items-center gap-2">
                                        Входящие заявки ({incomingRequests.length}) <span className="w-2 h-2 rounded-full bg-sparta-gold animate-ping" />
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {incomingRequests.map(r => renderUserCard(r, 'request_in'))}
                                    </div>
                                </div>
                            )}

                            {/* Outbound Requests */}
                            {outgoingRequests.length > 0 && (
                                <div>
                                    <h3 className="text-xs uppercase font-black tracking-widest text-white/40 mb-4 px-1">
                                        Отправленные заявки ({outgoingRequests.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {outgoingRequests.map(r => renderUserCard(r, 'request_out'))}
                                    </div>
                                </div>
                            )}

                            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                    <Clock size={52} className="mb-4 text-sparta-gold" />
                                    <p className="text-base font-russo uppercase text-white">Активных заявок нет</p>
                                    <p className="text-xs text-white/60 mt-1">Здесь будут отображаться входящие и отправленные предложения дружбы</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FriendsSection;