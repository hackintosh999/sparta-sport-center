import React, { useState, useMemo } from 'react';
import {
    X,
    Search,
    Bookmark,
    Heart,
    User,
    Dumbbell,
    Check,
    Send,
    Loader2,
    Baby
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection,
    doc,
    setDoc,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    limit
} from 'firebase/firestore';
import { BaseModal } from '../ui/BaseModal';

export interface ForwardTarget {
    id: string;
    type: 'saved' | 'parent' | 'child' | 'coach' | 'teammate' | 'group';
    name: string;
    avatar?: string;
    role?: string;
    subtitle?: string;
    userId?: string;
    groupId?: string;
    isUnified?: boolean;
}

export interface SpartaForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    messagesToForward: any[];
    currentUser: any;
    currentUserProfile: any;
    currentGroupName?: string;
    groupMembers?: any[];
    myGroups?: any[];
    onSuccess?: (count: number) => void;
}

export const SpartaForwardModal: React.FC<SpartaForwardModalProps> = ({
    isOpen,
    onClose,
    messagesToForward,
    currentUser,
    currentUserProfile,
    currentGroupName = 'Чат',
    groupMembers = [],
    myGroups = [],
    onSuccess
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'family' | 'friends' | 'groups'>('all');

    // Build the smart list of available forwarding targets
    const forwardTargets = useMemo<ForwardTarget[]>(() => {
        if (!currentUser) return [];

        const targets: ForwardTarget[] = [];

        // 1. Saved Messages (Избранное) - always first
        targets.push({
            id: `saved_${currentUser.uid}`,
            type: 'saved',
            name: 'Избранное',
            subtitle: 'Сохранить для себя',
            avatar: ''
        });

        // 2. Family (Родитель / Ребенок)
        const isParent = currentUserProfile?.role?.toLowerCase() === 'parent';
        const isStudent = ['student', 'user', 'child', 'athlete'].includes(currentUserProfile?.role?.toLowerCase() || 'user');

        if (isStudent) {
            targets.push({
                id: `family_${currentUserProfile?.parentId || currentUserProfile?.parentUid || 'parent'}`,
                type: 'parent',
                name: currentUserProfile?.parentName || 'Родитель',
                role: 'parent',
                subtitle: '👨‍👩‍👧 Мама / Папа',
                userId: currentUserProfile?.parentId || currentUserProfile?.parentUid
            });
        } else if (isParent) {
            targets.push({
                id: `family_${currentUserProfile?.studentUid || currentUserProfile?.childId || 'child'}`,
                type: 'child',
                name: currentUserProfile?.childName || 'Ребенок',
                role: 'student',
                subtitle: '⚽ Мой юный спортсмен',
                userId: currentUserProfile?.studentUid || currentUserProfile?.childId
            });
        }

        // 3. Teammates / Friends & Coaches from group members
        const otherMembers = groupMembers.filter(m => m.id !== currentUser.uid && m.uid !== currentUser.uid);
        otherMembers.forEach(member => {
            const memberId = member.id || member.uid;
            const role = (member.role || '').toLowerCase();
            const isCoach = role === 'coach' || role === 'trainer';
            const name = member.childName || member.full_name || member.name || member.email || 'Участник';
            const avatar = member.photoURL || member.avatarUrl || member.avatar;

            targets.push({
                id: `user_${memberId}`,
                type: isCoach ? 'coach' : 'teammate',
                name,
                subtitle: isCoach ? '🏋️ Тренер группы' : '⚽ Одноклубник',
                avatar,
                role: member.role,
                userId: memberId
            });
        });

        // 4. Groups
        myGroups.forEach(group => {
            targets.push({
                id: `group_${group.id}`,
                type: 'group',
                name: group.name || group.title || 'Спортивная группа',
                subtitle: '👥 Группа',
                avatar: group.avatarUrl || group.avatar,
                groupId: group.id,
                isUnified: group.isUnifiedChat || group.chatEnabled
            });
        });

        return targets;
    }, [currentUser, currentUserProfile, groupMembers, myGroups]);

    // Filter targets by search and active tab
    const filteredTargets = useMemo(() => {
        return forwardTargets.filter(target => {
            if (activeTab === 'saved' && target.type !== 'saved') return false;
            if (activeTab === 'family' && target.type !== 'parent' && target.type !== 'child') return false;
            if (activeTab === 'friends' && target.type !== 'teammate' && target.type !== 'coach') return false;
            if (activeTab === 'groups' && target.type !== 'group') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return target.name.toLowerCase().includes(q) || (target.subtitle && target.subtitle.toLowerCase().includes(q));
            }
            return true;
        });
    }, [forwardTargets, activeTab, searchQuery]);

    const toggleTarget = (targetId: string) => {
        setSelectedTargetIds(prev =>
            prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
        );
    };

    const handleSendForward = async () => {
        if (selectedTargetIds.length === 0 || messagesToForward.length === 0 || !currentUser) return;
        setIsSending(true);

        try {
            const selectedTargets = forwardTargets.filter(t => selectedTargetIds.includes(t.id));
            const myName = currentUserProfile?.childName || currentUserProfile?.full_name || currentUserProfile?.name || currentUser.email || 'Пользователь';

            for (const target of selectedTargets) {
                let targetUserId = target.userId;

                // Dynamically resolve missing target UID for family
                if (!targetUserId && target.type === 'parent') {
                    targetUserId = currentUserProfile?.parentId || currentUserProfile?.parentUid;
                    if (!targetUserId) {
                        try {
                            const qParent = query(
                                collection(db, 'users'),
                                where('role', '==', 'parent'),
                                where('studentUid', '==', currentUser.uid),
                                limit(1)
                            );
                            const snap = await getDocs(qParent);
                            if (!snap.empty) {
                                targetUserId = snap.docs[0].id;
                            }
                        } catch (e) {
                            console.warn("Could not find parent user by studentUid query:", e);
                        }
                    }
                    if (!targetUserId) {
                        try {
                            const qChats = query(
                                collection(db, 'chats'),
                                where('participants', 'array-contains', currentUser.uid),
                                limit(20)
                            );
                            const chatSnap = await getDocs(qChats);
                            for (const cDoc of chatSnap.docs) {
                                const data = cDoc.data();
                                if (data.type === 'parent' || (data.name || '').toLowerCase().includes('родитель')) {
                                    const p = data.participants?.find((p: string) => p !== currentUser.uid);
                                    if (p) {
                                        targetUserId = p;
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn("Could not find parent from chats:", e);
                        }
                    }
                } else if (!targetUserId && target.type === 'child') {
                    targetUserId = currentUserProfile?.studentUid || currentUserProfile?.childId;
                    if (!targetUserId) {
                        try {
                            const qChild = query(
                                collection(db, 'users'),
                                where('parentId', '==', currentUser.uid),
                                limit(1)
                            );
                            const snap = await getDocs(qChild);
                            if (!snap.empty) {
                                targetUserId = snap.docs[0].id;
                            }
                        } catch (e) {
                            console.warn("Could not find child user by parentId query:", e);
                        }
                    }
                }

                for (const msg of messagesToForward) {
                    const forwardData: any = {
                        text: msg.text || '',
                        senderId: currentUser.uid || '',
                        senderName: myName || 'Пользователь',
                        senderRole: currentUserProfile?.role || 'user',
                        senderVerification: currentUserProfile?.verification || null,
                        timestamp: serverTimestamp(),
                        type: msg.type || 'text',
                        mediaUrl: msg.mediaUrl || msg.imageUrl || msg.videoUrl || null,
                        mediaType: msg.mediaType || (msg.imageUrl ? 'image' : (msg.videoUrl ? 'video' : null)),
                        isForwarded: true,
                        forwardedFrom: {
                            groupName: currentGroupName || 'Чат',
                            senderName: msg.senderName || msg.authorName || 'Спарта',
                            senderRole: msg.senderRole || msg.authorRole || null,
                            senderVerification: msg.senderVerification || null
                        }
                    };

                    if (target.type === 'saved') {
                        // 1. Saved messages
                        const savedChatId = `saved_${currentUser.uid}`;
                        await setDoc(doc(db, 'chats', savedChatId), {
                            name: 'Избранное',
                            type: 'saved',
                            participants: [currentUser.uid],
                            participantNames: { [currentUser.uid]: myName },
                            updatedAt: serverTimestamp(),
                            lastMessage: forwardData.text || (forwardData.mediaType === 'video' ? '📹 Видео' : '📷 Фото'),
                            lastMessageTime: serverTimestamp(),
                            lastMessageAt: serverTimestamp()
                        }, { merge: true });

                        await addDoc(collection(db, 'chats', savedChatId, 'messages'), forwardData);
                    } else if (target.type === 'parent' || target.type === 'child' || targetUserId) {
                        // 2. Direct 1-on-1 chat
                        const chatId = targetUserId
                            ? [currentUser.uid, targetUserId].sort().join('_')
                            : (target.type === 'parent' ? `family_${currentUser.uid}_parent` : `family_${currentUser.uid}_child`);

                        const myRole = (currentUserProfile?.role || 'user').toLowerCase();
                        const targetRole = (target.role || (target.type === 'parent' ? 'parent' : (target.type === 'child' ? 'student' : (target.type === 'coach' ? 'coach' : 'student')))).toLowerCase();
                        const myAvatar = currentUserProfile?.photoURL || currentUserProfile?.avatarUrl || '';
                        const targetAvatar = target.avatar || '';

                        const chatPayload: any = {
                            name: target.name || 'Диалог',
                            type: 'private',
                            isPrivate: true,
                            participants: targetUserId ? Array.from(new Set([currentUser.uid, targetUserId])) : [currentUser.uid],
                            participantNames: {
                                [currentUser.uid]: myName,
                                ...(targetUserId ? { [targetUserId]: target.name } : {})
                            },
                            participantRoles: {
                                [currentUser.uid]: myRole,
                                ...(targetUserId ? { [targetUserId]: targetRole } : {})
                            },
                            participantAvatars: {
                                [currentUser.uid]: myAvatar,
                                ...(targetUserId ? { [targetUserId]: targetAvatar } : {})
                            },
                            updatedAt: serverTimestamp(),
                            lastMessage: forwardData.text || (forwardData.mediaType === 'video' ? '📹 Видео' : '📷 Фото'),
                            lastMessageTime: serverTimestamp(),
                            lastMessageAt: serverTimestamp(),
                            lastMessageSenderId: currentUser.uid
                        };

                        await setDoc(doc(db, 'chats', chatId), chatPayload, { merge: true });
                        await addDoc(collection(db, 'chats', chatId, 'messages'), forwardData);
                    } else if (target.groupId) {
                        // 3. Group chat
                        if (target.isUnified) {
                            await addDoc(collection(db, 'chats', target.groupId, 'messages'), forwardData);
                        } else {
                            await addDoc(collection(db, 'group_messages'), {
                                ...forwardData,
                                groupId: target.groupId
                            });
                        }
                    }
                }
            }

            if (onSuccess) onSuccess(selectedTargetIds.length);
            onClose();
            setSelectedTargetIds([]);
        } catch (error) {
            console.error('Error forwarding messages:', error);
            alert('Не удалось переслать сообщение. Попробуйте еще раз.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-md"
            showCloseButton={false}
            noPadding
            glowColor="amber"
            zIndex="z-[400]"
        >
            <div className="bg-[#111116] rounded-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-base sm:text-lg font-black font-russo uppercase tracking-wider text-white flex items-center gap-2">
                            <span>Переслать</span>
                            <span className="text-sparta-gold text-xs px-2 py-0.5 rounded-full bg-sparta-gold/10 border border-sparta-gold/20">
                                {messagesToForward.length} {messagesToForward.length === 1 ? 'сообщение' : 'сообщения'}
                            </span>
                        </h3>
                        <p className="text-[11px] text-white/50 font-medium mt-0.5">
                            Выберите друга, родителя или группу
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-3 sm:px-5 sm:pt-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск получателя..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-sparta-gold/60 transition-colors"
                        />
                    </div>
                </div>

                {/* Quick Category Filter Pills */}
                <div className="px-3 sm:px-5 pb-3 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'all', label: 'Все' },
                        { id: 'saved', label: '⭐️ Избранное' },
                        { id: 'family', label: '👨‍👩‍👧 Семья' },
                        { id: 'friends', label: '⚽ Друзья' },
                        { id: 'groups', label: '👥 Группы' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-sparta-gold text-black shadow-md shadow-sparta-gold/20'
                                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Target List */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-5 space-y-2 custom-scrollbar min-h-[220px]">
                    {filteredTargets.map(target => {
                        const isSelected = selectedTargetIds.includes(target.id);

                        const getTargetIcon = () => {
                            if (target.type === 'saved') {
                                return (
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-sparta-gold/30 border border-sparta-gold/40 flex items-center justify-center text-sparta-gold">
                                        <Bookmark size={18} />
                                    </div>
                                );
                            }
                            if (target.type === 'parent') {
                                return (
                                    <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                                        <Heart size={18} />
                                    </div>
                                );
                            }
                            if (target.type === 'child') {
                                return (
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                                        <Baby size={18} />
                                    </div>
                                );
                            }
                            if (target.type === 'coach') {
                                return (
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                        <Dumbbell size={18} />
                                    </div>
                                );
                            }
                            if (target.avatar) {
                                return (
                                    <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 overflow-hidden shrink-0">
                                        <img src={target.avatar} alt="" className="w-full h-full object-cover" />
                                    </div>
                                );
                            }
                            return (
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
                                    <User size={18} />
                                </div>
                            );
                        };

                        return (
                            <button
                                key={target.id}
                                type="button"
                                onClick={() => toggleTarget(target.id)}
                                className={`w-full p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left cursor-pointer ${
                                    isSelected
                                        ? 'bg-sparta-gold/15 border-sparta-gold/60 text-white shadow-lg shadow-sparta-gold/10'
                                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-white/90'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {getTargetIcon()}
                                    <div className="min-w-0">
                                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                                            {target.name}
                                        </p>
                                        <p className="text-[10px] text-white/50 truncate font-medium">
                                            {target.subtitle}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                                        isSelected
                                            ? 'bg-sparta-gold border-sparta-gold text-black'
                                            : 'border-white/20 bg-white/5'
                                    }`}
                                >
                                    {isSelected && <Check size={13} strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}

                    {filteredTargets.length === 0 && (
                        <div className="text-center py-10 text-white/40 text-xs">
                            Ничего не найдено по запросу
                        </div>
                    )}
                </div>

                {/* Bottom Action Button */}
                <div className="p-3 sm:p-5 border-t border-white/10 bg-black/40">
                    <button
                        type="button"
                        disabled={selectedTargetIds.length === 0 || isSending}
                        onClick={handleSendForward}
                        className={`w-full py-3.5 rounded-2xl font-black font-russo uppercase tracking-wider text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            selectedTargetIds.length > 0
                                ? 'bg-sparta-gold hover:bg-yellow-400 text-black shadow-lg shadow-sparta-gold/20 active:scale-[0.98]'
                                : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {isSending ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Отправка...</span>
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                <span>
                                    Переслать {selectedTargetIds.length > 0 ? `(${selectedTargetIds.length})` : ''}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default SpartaForwardModal;
