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
    Tag
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
    limit,
    orderBy
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
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my_friends' | 'requests' | 'find'>('my_friends');
    const [unfriendConfirmId, setUnfriendConfirmId] = useState<string | null>(null);
    const [positionFilter, setPositionFilter] = useState<'Все' | 'Вратарь' | 'Защитник' | 'Полузащитник' | 'Нападающий'>('Все');
    const [friendFilter, setFriendFilter] = useState<'all' | 'my_group'>('all');
    const [groupsMap, setGroupsMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const snap = await getDocs(collection(db, 'groups'));
                const map: Record<string, string> = {};
                snap.docs.forEach(d => {
                    const data = d.data();
                    map[d.id] = data.name || data.title || d.id;
                });
                setGroupsMap(map);
            } catch (e) {
                console.error("Error fetching groups:", e);
            }
        };
        fetchGroups();
    }, []);

    const formatGroupName = (groupVal?: string) => {
        if (!groupVal) return 'Ваша тренировочная группа';
        const str = String(groupVal).trim();
        if (!str) return 'Ваша тренировочная группа';
        if (groupsMap[str]) return groupsMap[str];
        const isRawFirestoreId = /^[A-Za-z0-9_-]{18,32}$/.test(str);
        if (isRawFirestoreId) {
            return 'Тренировочная группа Спарта';
        }
        return str;
    };

    const userGroup = userProfile?.group || userProfile?.groupId || userProfile?.targetGroupId;
    const userDisplayGroup = formatGroupName(userGroup);

    const groupFilteredFriends = useMemo(() => {
        if (!userGroup) return [];
        const targetGroupStr = String(userGroup).trim().toLowerCase();
        return friends.filter(f => {
            const friendGroup = f.group || f.groupId || f.targetGroupId;
            if (!friendGroup) return false;
            return String(friendGroup).trim().toLowerCase() === targetGroupStr;
        });
    }, [friends, userGroup]);

    const displayFriends = friendFilter === 'my_group' ? groupFilteredFriends : friends;

    const getPositionBadge = (position?: string) => {
        if (!position) return null;
        const pos = position.toLowerCase();
        if (pos.includes('вратар')) return { text: 'Вратарь', emoji: '🧤', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
        if (pos.includes('защитн')) return { text: 'Защитник', emoji: '🛡️', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
        if (pos.includes('полузащитн')) return { text: 'Полузащитник', emoji: '🏃', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
        if (pos.includes('нападающ')) return { text: 'Нападающий', emoji: '⚽', bg: 'bg-red-500/10 text-red-400 border-red-500/30' };
        return { text: position, emoji: '⚽', bg: 'bg-white/10 text-white/80 border-white/20' };
    };

    useEffect(() => {
        if (!user) return;

        // 1. Realtime Listen for Friendships
        const friendshipQuery = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
        const unsubFriends = onSnapshot(friendshipQuery, async (snapshot) => {
            const friendUids = snapshot.docs.map(d => d.data().users.find((id: string) => id !== user.uid));

            if (friendUids.length === 0) {
                setFriends([]);
                setLoading(false);
                return;
            }

            // Fetch user details for each friend
            const friendData: any[] = [];
            for (const uid of friendUids) {
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists()) {
                    friendData.push({ id: userSnap.id, ...userSnap.data() });
                }
            }
            setFriends(friendData);
            setLoading(false);
        });

        // 2. Realtime Listen for Incoming Requests
        const inQuery = query(collection(db, 'friend_requests'), where('toId', '==', user.uid), where('status', '==', 'pending'));
        const unsubIn = onSnapshot(inQuery, async (snapshot) => {
            const reqData: any[] = [];
            for (const d of snapshot.docs) {
                const data = d.data();
                const userSnap = await getDoc(doc(db, 'users', data.fromId));
                if (userSnap.exists()) {
                    reqData.push({ requestId: d.id, id: userSnap.id, ...userSnap.data(), ...data });
                }
            }
            setIncomingRequests(reqData);
        });

        // 3. Realtime Listen for Outgoing Requests
        const outQuery = query(collection(db, 'friend_requests'), where('fromId', '==', user.uid), where('status', '==', 'pending'));
        const unsubOut = onSnapshot(outQuery, async (snapshot) => {
            const reqData: any[] = [];
            for (const d of snapshot.docs) {
                const data = d.data();
                const userSnap = await getDoc(doc(db, 'users', data.toId));
                if (userSnap.exists()) {
                    reqData.push({ requestId: d.id, id: userSnap.id, ...userSnap.data(), ...data });
                }
            }
            setOutgoingRequests(reqData);
        });

        return () => {
            unsubFriends();
            unsubIn();
            unsubOut();
        };
    }, [user]);

    // Fetch default users for initial view when search is empty
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

    // Debounce search query input (350ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery.trim());
        }, 350);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Execute debounced search against Firestore
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

                const qFirstName = query(
                    usersRef,
                    where('childFirstName', '>=', term),
                    where('childFirstName', '<=', term + '\uf8ff'),
                    limit(12)
                );

                const qDisplayName = query(
                    usersRef,
                    where('displayName', '>=', term),
                    where('displayName', '<=', term + '\uf8ff'),
                    limit(12)
                );

                const [snapFirstName, snapDisplayName] = await Promise.all([
                    getDocs(qFirstName),
                    getDocs(qDisplayName)
                ]);

                const map = new Map<string, any>();
                snapFirstName.docs.forEach(d => {
                    if (d.id !== user.uid) map.set(d.id, { id: d.id, ...d.data() });
                });
                snapDisplayName.docs.forEach(d => {
                    if (d.id !== user.uid) map.set(d.id, { id: d.id, ...d.data() });
                });

                if (map.size === 0) {
                    const fallbackQuery = query(usersRef, limit(30));
                    const fallbackSnap = await getDocs(fallbackQuery);
                    fallbackSnap.docs.forEach(d => {
                        const u: any = d.data();
                        const fullName = `${u.childFirstName || ''} ${u.childLastName || ''} ${u.childName || ''} ${u.displayName || ''} ${u.full_name || ''}`.toLowerCase();
                        if (d.id !== user.uid && fullName.includes(termLower)) {
                            map.set(d.id, { id: d.id, ...u });
                        }
                    });
                }

                setSearchResults(Array.from(map.values()).slice(0, 16));
            } catch (e) {
                console.error("Error searching users:", e);
            } finally {
                setIsSearching(false);
            }
        };

        executeSearch();
    }, [debouncedQuery, user]);

    // MUTATION: Send Friend Request
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

    // MUTATION: Accept Incoming Request
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

    // MUTATION: Decline Request
    const handleDeclineRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friend_requests', requestId));
        } catch (e) {
            console.error("Error declining request:", e);
        }
    };

    // MUTATION: Cancel Pending Outgoing Request
    const handleCancelRequest = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, 'friend_requests', requestId));
        } catch (e) {
            console.error("Error canceling request:", e);
        }
    };

    // MUTATION: Unfriend User
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

    // Helper: Role Badge Styling
    const getRoleBadge = (role?: string) => {
        const r = (role || '').toLowerCase();
        if (['trainer', 'coach'].includes(r)) {
            return { text: 'Тренер', bg: 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold/30', icon: <Shield size={10} /> };
        }
        if (['admin', 'director', 'developer', 'dev'].includes(r)) {
            return { text: 'Админ', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Shield size={10} /> };
        }
        if (r === 'parent') {
            return { text: 'Родитель', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: null };
        }
        return { text: 'Атлет', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <Trophy size={10} /> };
    };

    // Helper: Extract Initials from Name
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

    // RENDER: Upgraded Athlete Profile Card
    const renderUserCard = (u: any, type: 'friend' | 'request_in' | 'request_out' | 'search') => {
        const roleBadge = getRoleBadge(u.role);
        const name = `${u.childFirstName || u.firstName || ''} ${u.childLastName || u.lastName || ''}`.trim() || u.displayName || u.full_name || 'Атлет Спарта';

        // Check relationship status for search results
        const isFriend = friends.some(f => f.id === u.id);
        const outgoingReq = outgoingRequests.find(r => r.toId === u.id || r.id === u.id);
        const incomingReq = incomingRequests.find(r => r.fromId === u.id || r.id === u.id);

        const presenceText = formatLastSeen(u.lastSeen, u.isOnline);
        const posBadge = getPositionBadge(u.footballPosition || u.position);

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-[#15171C]/80 backdrop-blur-xl border border-white/10 hover:border-sparta-gold/40 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-sparta-gold/5 flex flex-col justify-between"
            >
                <div className="flex items-start gap-3.5">
                    {/* Avatar with Presence Indicator */}
                    <div onClick={() => onSelectUser?.(u)} className="relative cursor-pointer flex-shrink-0">
                        {u.photoURL || u.avatarUrl ? (
                            <img
                                src={u.photoURL || u.avatarUrl}
                                alt={name}
                                className="w-10 h-10 rounded-full object-cover border border-white/15 shadow-sm group-hover:border-sparta-gold/60 transition-colors"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 shadow-sm flex items-center justify-center font-bold text-xs text-sparta-gold group-hover:border-sparta-gold/60 transition-colors uppercase tracking-wider">
                                {getInitials(name)}
                            </div>
                        )}

                        {u.verification?.isVerified && (
                            <span className="absolute -top-0.5 -right-0.5 bg-sparta-gold text-black rounded-full p-0.5 border border-black shadow z-10" title="Подтвержденный профиль">
                                <Check size={8} strokeWidth={3} />
                            </span>
                        )}
                        {u.isOnline && (
                            <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#15171C] shadow-[0_0_8px_#22c55e] animate-pulse z-10"
                                title="В сети"
                            />
                        )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectUser?.(u)}>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h4 className="text-sm font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                {name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${roleBadge.bg}`}>
                                {roleBadge.icon}
                                {roleBadge.text}
                            </span>
                            {posBadge && (
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold flex items-center gap-1 backdrop-blur-md shadow-sm ${posBadge.bg}`}>
                                    <span>{posBadge.emoji}</span>
                                    <span>{posBadge.text}</span>
                                </span>
                            )}
                        </div>

                        {/* Realtime Presence Subtitle */}
                        {presenceText && (
                            <p className={`text-[10px] font-medium flex items-center gap-1 mb-1 ${u.isOnline ? 'text-emerald-400 font-bold' : 'text-white/40'}`}>
                                {u.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                                <span>{presenceText}</span>
                            </p>
                        )}

                        {/* Group / Team Tag */}
                        {(u.groupName || u.group || u.groupId || u.targetGroupId) && (
                            <p className="text-[10px] text-white/40 font-medium flex items-center gap-1 mb-1">
                                <Tag size={11} className="text-sparta-gold/70" />
                                <span>Группа: {formatGroupName(u.groupName || u.group || u.groupId || u.targetGroupId)}</span>
                            </p>
                        )}

                        {/* Achievements Row */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                            {u.achievements && Array.isArray(u.achievements) && u.achievements.length > 0 ? (
                                u.achievements.slice(0, 3).map((ach: any, idx: number) => (
                                    <span key={idx} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-sparta-gold font-bold flex items-center gap-1" title={ach.title || 'Награда'}>
                                        <Award size={10} />
                                        <span>{ach.title || 'Награда'}</span>
                                    </span>
                                ))
                            ) : (
                                <div className="flex items-center gap-1 text-[10px] text-white/30 font-medium">
                                    <Trophy size={11} className="text-white/20" />
                                    <span>Участник клуба</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                    {type === 'friend' && (
                        <>
                            {unfriendConfirmId === u.id ? (
                                <div className="flex items-center gap-2 w-full justify-between bg-red-500/10 border border-red-500/30 p-1.5 rounded-xl">
                                    <span className="text-[10px] font-bold text-red-400 pl-2">Удалить?</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleUnfriend(u.id)}
                                            className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase"
                                        >
                                            Да
                                        </button>
                                        <button
                                            onClick={() => setUnfriendConfirmId(null)}
                                            className="px-2 py-1 bg-white/10 text-white/60 rounded-lg text-[10px]"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onNavigateToChat) {
                                                onNavigateToChat(u.id, name);
                                            } else {
                                                const newUrl = `/dashboard?tab=messages_unified&targetUid=${u.id}&targetName=${encodeURIComponent(name)}`;
                                                window.history.pushState({}, '', newUrl);
                                                window.dispatchEvent(new CustomEvent('sparta_navigate_tab', { detail: { tab: 'messages_unified', targetUid: u.id, targetName: name } }));
                                            }
                                        }}
                                        className="flex-1 py-2 px-3 bg-sparta-gold/10 hover:bg-sparta-gold hover:text-black border border-sparta-gold/30 text-sparta-gold rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <MessageSquare size={14} /> Написать
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUnfriendConfirmId(u.id);
                                        }}
                                        className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-all border border-white/5"
                                        title="Удалить из друзей"
                                    >
                                        <UserMinus size={15} />
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {type === 'request_in' && (
                        <>
                            <button
                                onClick={() => handleAcceptRequest(u)}
                                className="flex-1 py-2 px-3 bg-sparta-gold text-black rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-yellow-400 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sparta-gold/20"
                            >
                                <Check size={14} strokeWidth={3} /> Принять
                            </button>
                            <button
                                onClick={() => handleDeclineRequest(u.requestId)}
                                className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-all border border-white/5"
                                title="Отклонить"
                            >
                                <X size={15} />
                            </button>
                        </>
                    )}

                    {type === 'request_out' && (
                        <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={12} className="text-sparta-gold animate-spin" /> Заявка отправлена
                            </span>
                            <button
                                onClick={() => handleCancelRequest(u.requestId)}
                                className="px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                                Отмена
                            </button>
                        </div>
                    )}

                    {type === 'search' && (
                        <div className="w-full">
                            {isFriend ? (
                                <div className="flex items-center gap-2">
                                    <span className="flex-1 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-1">
                                        <Check size={12} /> Ваш друг
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onNavigateToChat) {
                                                onNavigateToChat(u.id, name);
                                            } else {
                                                const newUrl = `/dashboard?tab=messages_unified&targetUid=${u.id}&targetName=${encodeURIComponent(name)}`;
                                                window.history.pushState({}, '', newUrl);
                                                window.dispatchEvent(new CustomEvent('sparta_navigate_tab', { detail: { tab: 'messages_unified', targetUid: u.id, targetName: name } }));
                                            }
                                        }}
                                        className="p-2 bg-sparta-gold text-black rounded-xl hover:bg-yellow-400 transition-all"
                                        title="Написать"
                                    >
                                        <MessageSquare size={14} />
                                    </button>
                                </div>
                            ) : outgoingReq ? (
                                <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                                        <Clock size={12} className="text-sparta-gold animate-spin" /> Заявка отправлена
                                    </span>
                                    <button
                                        onClick={() => handleCancelRequest(outgoingReq.requestId)}
                                        className="px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            ) : incomingReq ? (
                                <button
                                    onClick={() => handleAcceptRequest(incomingReq)}
                                    className="w-full py-2 px-3 bg-sparta-gold text-black rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-yellow-400 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sparta-gold/20"
                                >
                                    <Check size={14} strokeWidth={3} /> Принять заявку
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSendRequest(u.id)}
                                    className="w-full py-2 px-3 bg-sparta-gold/10 hover:bg-sparta-gold border border-sparta-gold/30 text-sparta-gold hover:text-black rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <UserPlus size={14} /> Добавить в друзья
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-6 select-none">
            {/* Header & Navigation Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-russo text-white uppercase tracking-tight flex items-center gap-3">
                        <span className="p-3 bg-sparta-gold/10 rounded-2xl text-sparta-gold border border-sparta-gold/20 shadow-lg shadow-sparta-gold/5">
                            <Users size={24} />
                        </span>
                        Твое Комьюнити
                    </h2>
                    <p className="text-xs text-white/40 font-medium mt-1">Оставайся на связи с атлетами и тренерами Sparta</p>
                </div>

                <div className="flex p-1.5 bg-[#15171C] rounded-2xl border border-white/10 w-full sm:w-auto shadow-inner">
                    {[
                        { id: 'my_friends', label: 'Друзья', count: friends.length },
                        { id: 'requests', label: 'Заявки', count: incomingRequests.length + outgoingRequests.length },
                        { id: 'find', label: 'Поиск атлетов', count: null }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-sparta-gold text-black font-black shadow-lg shadow-sparta-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
                            {tab.count !== null && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Viewport Container */}
            <div className="flex-1 min-h-0 bg-[#0E0F12]/80 backdrop-blur-xl rounded-[32px] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                <AnimatePresence mode="wait">
                    {activeTab === 'my_friends' && (
                        <motion.div
                            key="friends"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
                        >
                            {/* Secondary Sub-Filter Pills: [Все друзья] & [Моя группа] */}
                            {friends.length > 0 && (
                                <div className="flex items-center gap-2 mb-4 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
                                    <button
                                        onClick={() => setFriendFilter('all')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${friendFilter === 'all' ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Users size={12} /> Все друзья ({friends.length})
                                    </button>
                                    <button
                                        onClick={() => setFriendFilter('my_group')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${friendFilter === 'my_group' ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Tag size={12} /> Моя группа {userGroup ? `(${groupFilteredFriends.length})` : ''}
                                    </button>
                                </div>
                            )}

                            {loading ? (
                                <div className="flex items-center justify-center h-full py-20">
                                    <Loader2 className="animate-spin text-sparta-gold" size={32} />
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-40">
                                    <Users size={64} className="mb-4 text-sparta-gold" />
                                    <p className="text-xl font-russo uppercase text-white">Список друзей пуст</p>
                                    <p className="text-xs text-white/70 mt-2">Добавляй атлетов в друзья, чтобы тренироваться и общаться вместе</p>
                                    <button
                                        onClick={() => setActiveTab('find')}
                                        className="mt-6 px-6 py-3 bg-sparta-gold text-black font-black uppercase text-xs rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-sparta-gold/20"
                                    >
                                        Найти атлетов
                                    </button>
                                </div>
                            ) : friendFilter === 'my_group' && !userGroup ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-60">
                                    <Tag size={48} className="mb-4 text-sparta-gold" />
                                    <p className="text-xl font-russo uppercase text-white">Группа не указана</p>
                                    <p className="text-xs text-white/70 mt-2 max-w-sm leading-relaxed">
                                        Укажите вашу тренировочную группу в профиле, чтобы видеть сокомандников и тренироваться вместе.
                                    </p>
                                </div>
                            ) : friendFilter === 'my_group' && groupFilteredFriends.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-60">
                                    <Users size={48} className="mb-4 text-sparta-gold" />
                                    <p className="text-xl font-russo uppercase text-white">В вашей группе пока нет добавленных друзей</p>
                                    <p className="text-xs text-white/70 mt-2 max-w-sm leading-relaxed">
                                        Ваша группа: <span className="text-sparta-gold font-bold">{userDisplayGroup}</span>. Найдите сокомандников в поиске атлетов и добавьте их в друзья.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('find')}
                                        className="mt-6 px-6 py-3 bg-sparta-gold text-black font-black uppercase text-xs rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-sparta-gold/20"
                                    >
                                        Найти сокомандников
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {displayFriends.map(f => renderUserCard(f, 'friend'))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'requests' && (
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                        >
                            {incomingRequests.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] uppercase font-black tracking-widest text-sparta-gold mb-4 ml-1 flex items-center gap-2">
                                        Входящие заявки ({incomingRequests.length}) <span className="w-2 h-2 rounded-full bg-sparta-gold animate-ping" />
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {incomingRequests.map(r => renderUserCard(r, 'request_in'))}
                                    </div>
                                </div>
                            )}

                            {outgoingRequests.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-4 ml-1">
                                        Исходящие заявки ({outgoingRequests.length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {outgoingRequests.map(r => renderUserCard(r, 'request_out'))}
                                    </div>
                                </div>
                            )}

                            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-30">
                                    <Clock size={48} className="mb-4" />
                                    <p className="text-sm font-bold uppercase text-white">Активных заявок нет</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'find' && (
                        <motion.div
                            key="find"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar"
                        >
                            {/* Search Input Box */}
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-sparta-gold transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Найти атлета или тренера по имени..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#15171C] border border-white/15 rounded-3xl py-4 pl-14 pr-12 text-sm text-white focus:border-sparta-gold outline-none transition-all placeholder:text-white/20 shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Football Position Filter Pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar scrollbar-none">
                                {[
                                    { id: 'Все', label: 'Все', emoji: '' },
                                    { id: 'Вратарь', label: 'Вратари', emoji: '🧤' },
                                    { id: 'Защитник', label: 'Защитники', emoji: '🛡️' },
                                    { id: 'Полузащитник', label: 'Полузащитники', emoji: '🏃' },
                                    { id: 'Нападающий', label: 'Нападающие', emoji: '⚽' }
                                ].map(filter => (
                                    <button
                                        key={filter.id}
                                        type="button"
                                        onClick={() => setPositionFilter(filter.id as any)}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                                            positionFilter === filter.id
                                                ? 'bg-sparta-gold text-black border-sparta-gold shadow-md shadow-sparta-gold/20 font-black'
                                                : 'bg-[#15171C] text-white/60 border-white/10 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {filter.emoji && <span>{filter.emoji}</span>}
                                        <span>{filter.label}</span>
                                    </button>
                                ))}
                            </div>

                            {isSearching ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-sparta-gold" size={32} />
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
                                            <div className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-3 ml-1">
                                                {debouncedQuery.length >= 2 ? `Результаты поиска (${filteredResults.length})` : `Рекомендуемые атлеты (${filteredResults.length})`}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {filteredResults.map(u => renderUserCard(u, 'search'))}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex flex-col items-center justify-center py-16 text-center opacity-40 bg-[#15171C]/40 rounded-3xl border border-white/5 p-8">
                                        <Users size={48} className="mb-3 text-sparta-gold" />
                                        <p className="text-base font-russo uppercase text-white">
                                            {debouncedQuery.length >= 2
                                                ? `Никто не найден по запросу «${debouncedQuery}»`
                                                : `Атлеты с позицией «${positionFilter}» не найдены`}
                                        </p>
                                        <p className="text-xs text-white/70 mt-1">Попробуйте изменить поисковый запрос или выбрать другой фильтр позиции</p>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FriendsSection;