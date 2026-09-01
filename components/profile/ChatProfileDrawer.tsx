import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    User,
    MessageSquare,
    Phone,
    Mail,
    History,
    Crown,
    Shield,
    Users,
    Image as ImageIcon,
    FileText,
    Mic,
    Download,
    Check,
    Search,
    Plus,
    Bell,
    BellOff,
    Camera,
    ChevronRight,
    UserMinus,
    ArrowLeft,
    Copy,
    Share2,
    LogOut,
    Trophy,
    Zap,
    Flame,
    Award,
    Dumbbell,
    Heart,
    ShieldCheck,
    Sparkles,
    Star,
    Bookmark,
    Target,
    Activity,
    Calendar,
    Send,
    Edit3,
    Save,
    Briefcase,
    GraduationCap,
    Info,
    Pin
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../supabase';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface ChatProfileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    groupData: any;
    groupId: string;
    chatId: string;
    groupName: string;
    currentUser: any;
    currentUserProfile: any;
    selectedUserProfile: any | null;
    setSelectedUserProfile: (user: any | null) => void;
    groupMembers: any[];
    allMediaMessages: any[];
    isMuted?: boolean;
    onToggleMute?: () => void;
    onStartPrivateChat: (userId: string, userName: string) => void;
    onOpenMediaLightbox: (media: any) => void;
    onScrollToMessage?: (msgId: string) => void;
    onAddParticipant?: () => void;
    onKickParticipant?: (userId: string, userName: string) => void;
    onTransferOwnership?: (userId: string, userName: string) => void;
    onLeaveGroup?: () => void;
    getUserStatus: (lastSeen: any) => string;
    getRoleBadge: (member: any) => any;
    VerificationBadge: React.ComponentType<{ role?: string; verification?: any }>;
}

export const ChatProfileDrawer: React.FC<ChatProfileDrawerProps> = ({
    isOpen,
    onClose,
    groupData,
    groupId,
    chatId,
    groupName,
    currentUser,
    currentUserProfile,
    selectedUserProfile,
    setSelectedUserProfile,
    groupMembers,
    allMediaMessages,
    isMuted = false,
    onToggleMute,
    onStartPrivateChat,
    onOpenMediaLightbox,
    onScrollToMessage,
    onAddParticipant,
    onKickParticipant,
    onTransferOwnership,
    onLeaveGroup,
    getUserStatus,
    getRoleBadge,
    VerificationBadge
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'media'>('info');
    const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'files' | 'audio'>('media');
    const [gallerySearchQuery, setGallerySearchQuery] = useState('');
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [copiedId, setCopiedId] = useState(false);

    const isTrainer = currentUserProfile?.role === 'trainer' || currentUserProfile?.role === 'coach';
    const isAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'developer' || currentUserProfile?.role === 'director';
    const isOwner = groupData?.ownerId === currentUser?.uid || isAdmin;

    const isSavedChat = groupData?.type === 'saved' || chatId?.startsWith('saved_');
    const isGroupChat = !isSavedChat && (groupData?.type === 'team' || groupData?.type === 'group' || groupData?.type === 'channel' || !!groupData?.groupId || (groupName || '').toLowerCase().startsWith('гр.') || (groupName || '').toLowerCase().includes('команда'));
    const isPrivate = !isSavedChat && !isGroupChat && Boolean(groupData?.isPrivate === true || groupData?.type === 'private' || groupData?.type === 'direct' || groupData?.type === 'parent' || groupData?.coachId || (groupName || '').toLowerCase().includes('тренер'));
    
    const canEditAvatar = (isOwner || isTrainer || isAdmin) && !isPrivate && !isSavedChat;
    const canAddParticipant = (isTrainer || isAdmin) && !isPrivate && !isSavedChat && !!onAddParticipant;
    const canLeaveGroup = !isPrivate && !isSavedChat && !isOwner && !isTrainer;

    // Resolve target profile for 1-on-1 private / coach / direct chats
    const otherParticipant = useMemo(() => {
        if (!isPrivate) return null;
        const other = groupMembers.find(m => m.id !== currentUser?.uid);
        if (other) return other;

        const isCoachName = (groupName || '').toLowerCase().includes('тренер') || !!groupData?.coachId;
        return {
            id: groupData?.coachId || groupData?.participants?.find((id: string) => id !== currentUser?.uid),
            full_name: groupName || 'Собеседник',
            role: isCoachName ? 'trainer' : 'student',
            photoURL: groupData?.chatAvatarUrl,
            license: isCoachName ? 'Лицензия РФС / UEFA B' : undefined,
            experienceYears: isCoachName ? '8 лет' : undefined,
            position: !isCoachName ? 'Нападающий ⚡' : undefined,
            playerNumber: !isCoachName ? 10 : undefined
        };
    }, [isPrivate, groupMembers, currentUser?.uid, groupName, groupData]);

    const effectiveUserProfile = selectedUserProfile || (isPrivate ? otherParticipant : null);

    const [isEditingCoach, setIsEditingCoach] = useState(false);
    const [coachEditData, setCoachEditData] = useState({
        fullName: '',
        specialization: '',
        license: '',
        experienceYears: '',
        phone: '',
        email: '',
        bio: '',
        availabilityStatus: 'online'
    });
    const [isSavingCoach, setIsSavingCoach] = useState(false);
    const [coachAvatarFile, setCoachAvatarFile] = useState<File | null>(null);
    const [coachAvatarPreview, setCoachAvatarPreview] = useState<string | null>(null);

    const startEditingCoach = (target: any) => {
        setCoachEditData({
            fullName: target.full_name || target.childName || '',
            specialization: target.specialization || 'Тренер клуба SPARTA',
            license: target.license || 'Лицензия РФС B',
            experienceYears: target.experienceYears || '7+ лет',
            phone: target.phone || '',
            email: target.email || '',
            bio: target.bio || '',
            availabilityStatus: target.availabilityStatus || 'online'
        });
        setCoachAvatarPreview(target.photoURL || target.avatarUrl || null);
        setCoachAvatarFile(null);
        setIsEditingCoach(true);
    };

    const handleSaveCoach = async (targetId: string) => {
        if (!targetId) return;
        setIsSavingCoach(true);
        try {
            let uploadedPhotoUrl = coachAvatarPreview;

            if (coachAvatarFile) {
                const fileExt = coachAvatarFile.name.split('.').pop();
                const fileName = `coach_${targetId}_${Date.now()}.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('chat-media')
                    .upload(filePath, coachAvatarFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('chat-media')
                    .getPublicUrl(filePath);

                uploadedPhotoUrl = publicUrl;
            }

            const updatePayload: any = {
                full_name: coachEditData.fullName,
                specialization: coachEditData.specialization,
                license: coachEditData.license,
                experienceYears: coachEditData.experienceYears,
                phone: coachEditData.phone,
                email: coachEditData.email,
                bio: coachEditData.bio,
                availabilityStatus: coachEditData.availabilityStatus
            };

            if (uploadedPhotoUrl) {
                updatePayload.photoURL = uploadedPhotoUrl;
                updatePayload.avatarUrl = uploadedPhotoUrl;
            }

            await updateDoc(doc(db, 'users', targetId), updatePayload);

            if (selectedUserProfile && selectedUserProfile.id === targetId) {
                setSelectedUserProfile((prev: any) => ({ ...prev, ...updatePayload }));
            }

            setIsEditingCoach(false);
        } catch (err) {
            console.error('Failed to update coach profile:', err);
            alert('Не удалось сохранить профиль тренера');
        } finally {
            setIsSavingCoach(false);
        }
    };

    // Media lists
    const mediaItems = useMemo(() => {
        return allMediaMessages.filter(m => m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'video'));
    }, [allMediaMessages]);

    const fileItems = useMemo(() => {
        return allMediaMessages.filter(m => m.mediaUrl && m.mediaType === 'file');
    }, [allMediaMessages]);

    const audioItems = useMemo(() => {
        return allMediaMessages.filter(m => (m.type === 'voice' || m.mediaType === 'voice') && m.mediaUrl);
    }, [allMediaMessages]);

    const currentMediaItems = useMemo(() => {
        let items: any[] = [];
        if (activeMediaTab === 'media') items = mediaItems;
        else if (activeMediaTab === 'files') items = fileItems;
        else if (activeMediaTab === 'audio') items = audioItems;

        if (!gallerySearchQuery.trim()) return items;
        const q = gallerySearchQuery.toLowerCase();
        return items.filter(i => (i.text && i.text.toLowerCase().includes(q)) || (i.senderName && i.senderName.toLowerCase().includes(q)));
    }, [activeMediaTab, mediaItems, fileItems, audioItems, gallerySearchQuery]);

    // Members list
    const filteredMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return groupMembers;
        const q = memberSearchQuery.toLowerCase();
        return groupMembers.filter(m => 
            (m.full_name && m.full_name.toLowerCase().includes(q)) ||
            (m.childName && m.childName.toLowerCase().includes(q)) ||
            (m.email && m.email.toLowerCase().includes(q))
        );
    }, [groupMembers, memberSearchQuery]);

    if (!isOpen) return null;

    const handleCopyGroupId = () => {
        const idText = groupId || chatId;
        navigator.clipboard.writeText(idText);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !chatId) return;

        setIsUploadingAvatar(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(filePath);

            await updateDoc(doc(db, 'chats', chatId), { chatAvatarUrl: publicUrl });
        } catch (err) {
            console.error("Avatar upload failed:", err);
            alert("Не удалось загрузить аватарку");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    return (
        <div className="absolute inset-0 z-40 flex justify-end overflow-hidden pointer-events-none">
            {/* Backdrop: Only for mobile screens so desktop chat is never blacked out */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="md:hidden absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto z-10"
            />

            {/* Sidebar Drawer */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative w-full max-w-[400px] bg-[#111114] border-l border-white/10 h-full overflow-hidden shadow-2xl flex flex-col pointer-events-auto z-20"
            >
                {/* 🌟 1. Top Glass Header */}
                <div className="shrink-0 h-16 bg-[#141418]/90 backdrop-blur-xl border-b border-white/10 px-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {selectedUserProfile && !isPrivate && !isSavedChat ? (
                            <button
                                onClick={() => setSelectedUserProfile(null)}
                                className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                            >
                                <ArrowLeft size={16} />
                                <span>Назад к группе</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                                    {isSavedChat ? <Bookmark size={16} /> : isPrivate ? <User size={16} /> : <Users size={16} />}
                                </div>
                                <h3 className="text-sm font-black font-russo uppercase tracking-wider text-white">
                                    {isSavedChat ? 'Избранное' : isPrivate ? (
                                        effectiveUserProfile?.role === 'coach' || effectiveUserProfile?.role === 'trainer'
                                            ? 'Профиль тренера'
                                            : effectiveUserProfile?.role === 'parent'
                                                ? 'Профиль родителя'
                                                : effectiveUserProfile?.role === 'admin' || effectiveUserProfile?.role === 'director'
                                                    ? 'Администрация'
                                                    : 'Профиль спортсмена'
                                    ) : groupData?.type === 'channel' ? 'О канале' : 'О группе'}
                                </h3>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 🌟 2. Scrollable Body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
                    {/* Universal Top Navigation Tabs */}
                    {(!selectedUserProfile || isPrivate) && (
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === 'info'
                                        ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                {isSavedChat ? <Bookmark size={14} /> : isPrivate ? <User size={14} /> : <Users size={14} />}
                                <span>{isSavedChat ? 'Инфо' : isPrivate ? 'Профиль' : `Участники (${groupMembers.length})`}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('media')}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                    activeTab === 'media'
                                        ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20'
                                        : 'text-white/50 hover:text-white'
                                }`}
                            >
                                <ImageIcon size={14} />
                                <span>Медиа и файлы ({allMediaMessages.length})</span>
                            </button>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: MEDIA EXPLORER (Photos, Videos, Files, Audio)                      */}
                    {/* ========================================================================= */}
                    {activeTab === 'media' && (!selectedUserProfile || isPrivate) ? (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            {/* Media Sub-tabs */}
                            <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/5">
                                {[
                                    { id: 'media', icon: ImageIcon, label: `Фото/Видео (${mediaItems.length})` },
                                    { id: 'files', icon: FileText, label: `Файлы (${fileItems.length})` },
                                    { id: 'audio', icon: Mic, label: `Аудио (${audioItems.length})` }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveMediaTab(tab.id as any)}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                            activeMediaTab === tab.id
                                                ? 'bg-sparta-gold text-black shadow-md'
                                                : 'text-white/50 hover:text-white'
                                        }`}
                                    >
                                        <tab.icon size={11} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Search in Media */}
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Поиск по названию или автору..."
                                    value={gallerySearchQuery}
                                    onChange={(e) => setGallerySearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-[11px] text-white focus:outline-none focus:border-sparta-gold/50 transition-colors"
                                />
                            </div>

                            {/* Media Items */}
                            {currentMediaItems.length === 0 ? (
                                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl text-white/30 space-y-2">
                                    <ImageIcon size={24} className="mx-auto opacity-30" />
                                    <p className="text-[10px] font-black uppercase tracking-wider">Вложений пока нет</p>
                                </div>
                            ) : (
                                activeMediaTab === 'media' ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {currentMediaItems.map((m, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => onOpenMediaLightbox(m)}
                                                className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer group relative active:scale-95 transition-all"
                                            >
                                                <img
                                                    src={m.mediaUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Search size={16} className="text-white" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {currentMediaItems.map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => window.open(item.mediaUrl, '_blank')}
                                                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-sparta-gold/15 text-sparta-gold flex items-center justify-center shrink-0">
                                                    {activeMediaTab === 'files' ? <FileText size={15} /> : <Mic size={15} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                                        {item.text || (activeMediaTab === 'files' ? 'Документ' : 'Голосовое сообщение')}
                                                    </p>
                                                    <p className="text-[9px] text-white/40 truncate">
                                                        {item.senderName} • {item.timestamp?.seconds ? format(new Date(item.timestamp.seconds * 1000), 'dd.MM.yyyy') : ''}
                                                    </p>
                                                </div>
                                                <Download size={14} className="text-white/30 group-hover:text-white transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    ) : isSavedChat ? (
                        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                            {/* 1. Hero Card */}
                            <div className="relative flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-amber-500/15 via-[#181612] to-[#111114] border border-sparta-gold/30 shadow-[0_0_30px_rgba(255,184,0,0.1)] overflow-hidden">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-sparta-gold/20 rounded-full blur-3xl pointer-events-none" />

                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-sparta-gold to-yellow-600 flex items-center justify-center text-black shadow-xl shadow-sparta-gold/30 mb-3 hover:scale-105 transition-transform">
                                    <Bookmark size={36} className="fill-black" />
                                </div>

                                <h4 className="text-xl font-black font-russo uppercase text-white tracking-tight mb-1.5">
                                    Избранное
                                </h4>

                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-sparta-gold bg-sparta-gold/15 px-3 py-1 rounded-full border border-sparta-gold/30">
                                        ⭐️ Личное хранилище
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                                        🔒 Только вы
                                    </span>
                                </div>

                                <p className="text-xs text-white/70 font-manrope leading-relaxed max-w-xs">
                                    Ваше персональное облачное пространство в Спарте. Сюда можно пересылать любые фото, видео, голосовые и сообщения из чатов или писать заметки самому себе.
                                </p>
                            </div>

                            {/* 2. Quick Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                {onToggleMute && (
                                    <button
                                        onClick={onToggleMute}
                                        className={`p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-bold ${
                                            isMuted
                                                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                                        <span>{isMuted ? 'Включить звук' : 'Без звука'}</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => setActiveTab('media')}
                                    className="p-3 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/30 hover:bg-sparta-gold/20 text-sparta-gold transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                >
                                    <ImageIcon size={16} />
                                    <span>Медиа ({allMediaMessages.length})</span>
                                </button>
                            </div>

                            {/* 3. Storage Analytics Cards */}
                            <div className="grid grid-cols-2 gap-2 text-left">
                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-1 text-sparta-gold">
                                        <ImageIcon size={15} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Фото и видео</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{mediaItems.length}</p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-1 text-cyan-400">
                                        <FileText size={15} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Файлы</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{fileItems.length}</p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-1 text-purple-400">
                                        <Mic size={15} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Голосовые</span>
                                    </div>
                                    <p className="text-lg font-black text-white">{audioItems.length}</p>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 mb-1 text-emerald-400">
                                        <ShieldCheck size={15} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Облако</span>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-300 mt-1">Синхронизировано</p>
                                </div>
                            </div>

                            {/* 4. Pinned Note Card (if any) */}
                            {groupData?.pinnedMessageId && (
                                <div className="p-4 rounded-2xl bg-sparta-gold/10 border border-sparta-gold/30 text-left space-y-2">
                                    <div className="flex items-center justify-between text-sparta-gold">
                                        <div className="flex items-center gap-2">
                                            <Pin size={15} className="rotate-45" />
                                            <h5 className="text-xs font-black uppercase tracking-wider font-russo">📌 Закрепленная заметка</h5>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/90 line-clamp-3 italic">
                                        {allMediaMessages.find(m => m.id === groupData.pinnedMessageId)?.text || 'Медиа-файл'}
                                    </p>
                                    {onScrollToMessage && (
                                        <button
                                            type="button"
                                            onClick={() => onScrollToMessage(groupData.pinnedMessageId)}
                                            className="text-[11px] font-bold text-sparta-gold hover:text-yellow-300 flex items-center gap-1 mt-1 transition-colors"
                                        >
                                            Перейти к заметке →
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* 5. Practical Tips */}
                            <div className="p-4 rounded-2xl bg-sparta-gold/[0.04] border border-sparta-gold/20 text-left space-y-2">
                                <div className="flex items-center gap-2 text-sparta-gold">
                                    <Sparkles size={16} />
                                    <h5 className="text-xs font-black uppercase tracking-wider font-russo">Возможности Избранного:</h5>
                                </div>
                                <ul className="text-xs text-white/70 space-y-1.5 list-disc pl-4 leading-relaxed">
                                    <li>Пересылайте сюда важные расписания, задания и объявления из других чатов.</li>
                                    <li>Сохраняйте фото и видеофрагменты с матчей для быстрого доступа.</li>
                                    <li>Используйте как личный черновик и блокнот для заметок перед тренировкой.</li>
                                </ul>
                            </div>
                        </div>
                    ) : null}

                    {/* ========================================================================= */}
                    {/* A. USER PROFILE VIEW (When in private chat OR a member is selected)       */}
                    {/* ========================================================================= */}
                    {!isSavedChat && ((isPrivate && activeTab === 'info') || (selectedUserProfile && !isPrivate)) && effectiveUserProfile ? (() => {
                        const targetUser = effectiveUserProfile;
                        const role = targetUser.role;
                        const isCoach = role === 'trainer' || role === 'coach';
                        const isAdminRole = role === 'admin' || role === 'director' || role === 'developer';
                        const isParent = role === 'parent';
                        const isStudent = !isCoach && !isAdminRole && !isParent;

                        const rawStatus = getUserStatus(targetUser.lastSeen);
                        const isOnline = rawStatus === 'в сети' || targetUser.id === currentUser?.uid;
                        const displayName = targetUser.full_name || targetUser.childName || targetUser.email || 'Участник';
                        const xpValue = Number(targetUser.manualStats?.xp || targetUser.xp || 850);
                        const playerLevel = Math.floor(xpValue / 100) || 8;
                        const playerNumber = targetUser.playerNumber || targetUser.number || 10;
                        const playerPosition = targetUser.position || 'Нападающий ⚡';
                        const trainingsCount = targetUser.manualStats?.trainings || 26;

                        // Unified Status Badge
                        const renderStatusBadge = () => {
                            if (isCoach && targetUser.availabilityStatus) {
                                if (targetUser.availabilityStatus === 'training') {
                                    return (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/10 animate-pulse">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                                            </span>
                                            <span>⚽ На тренировке</span>
                                        </div>
                                    );
                                }
                                if (targetUser.availabilityStatus === 'tournament') {
                                    return (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider shadow-lg shadow-purple-500/10">
                                            <Trophy size={11} className="text-purple-300 animate-bounce" />
                                            <span>🏆 На турнире / матче</span>
                                        </div>
                                    );
                                }
                                if (targetUser.availabilityStatus === 'vacation') {
                                    return (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                                            <span>🏖️ В отпуске</span>
                                        </div>
                                    );
                                }
                            }

                            if (isOnline) {
                                return (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                                        </span>
                                        <span>В сети</span>
                                    </div>
                                );
                            }

                            let offlineText = 'Не в сети';
                            if (rawStatus && rawStatus !== 'не в сети') {
                                offlineText = `Был(а) ${rawStatus}`;
                            }

                            return (
                                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/45 text-[10px] font-semibold tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                    <span>{offlineText}</span>
                                </div>
                            );
                        };

                        return (
                            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                {/* ------------------------------------------------------------- */}
                                {/* 1. COACH PROFILE VIEW / EDITOR                                */}
                                {/* ------------------------------------------------------------- */}
                                {isCoach && (
                                    isEditingCoach ? (
                                        /* COACH EDIT MODE */
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative p-5 rounded-3xl bg-[#17171c] border-2 border-sparta-gold/50 shadow-2xl space-y-4 text-left"
                                        >
                                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <Edit3 size={16} className="text-sparta-gold" />
                                                    <h4 className="text-xs font-black font-russo uppercase text-white tracking-wider">
                                                        Редактор профиля тренера
                                                    </h4>
                                                </div>
                                                <button
                                                    onClick={() => setIsEditingCoach(false)}
                                                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            {/* Avatar uploader */}
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-16 h-16 rounded-2xl bg-[#1c1a14] border-2 border-sparta-gold/60 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {coachAvatarPreview ? (
                                                        <img src={coachAvatarPreview} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={28} className="text-sparta-gold/40" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[11px] font-bold cursor-pointer transition-all">
                                                        <Camera size={13} className="text-sparta-gold" />
                                                        <span>Сменить фото</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    setCoachAvatarFile(file);
                                                                    setCoachAvatarPreview(URL.createObjectURL(file));
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    <p className="text-[9px] text-white/40 mt-1">Рекомендуется квадратное фото</p>
                                                </div>
                                            </div>

                                            {/* Full Name */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">ФИО тренера</label>
                                                <input
                                                    type="text"
                                                    value={coachEditData.fullName}
                                                    onChange={(e) => setCoachEditData({ ...coachEditData, fullName: e.target.value })}
                                                    placeholder="Например: Павел Якупов"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold"
                                                />
                                            </div>

                                            {/* Specialization */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Должность / Специализация</label>
                                                <input
                                                    type="text"
                                                    value={coachEditData.specialization}
                                                    onChange={(e) => setCoachEditData({ ...coachEditData, specialization: e.target.value })}
                                                    placeholder="Главный тренер / Тренер вратарей"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold"
                                                />
                                            </div>

                                            {/* License & Presets */}
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Лицензия</label>
                                                <input
                                                    type="text"
                                                    value={coachEditData.license}
                                                    onChange={(e) => setCoachEditData({ ...coachEditData, license: e.target.value })}
                                                    placeholder="Лицензия РФС B"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold mb-1"
                                                />
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['РФС C', 'РФС B', 'UEFA B', 'UEFA A', 'РФС PRO'].map((lic) => (
                                                        <button
                                                            key={lic}
                                                            type="button"
                                                            onClick={() => setCoachEditData({ ...coachEditData, license: `Лицензия ${lic}` })}
                                                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${coachEditData.license.includes(lic) ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'}`}
                                                        >
                                                            {lic}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Experience */}
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Тренерский стаж</label>
                                                <input
                                                    type="text"
                                                    value={coachEditData.experienceYears}
                                                    onChange={(e) => setCoachEditData({ ...coachEditData, experienceYears: e.target.value })}
                                                    placeholder="8 лет"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold mb-1"
                                                />
                                                <div className="flex flex-wrap gap-1.5">
                                                    {['3 года', '5 лет', '8+ лет', '10+ лет', '15+ лет'].map((exp) => (
                                                        <button
                                                            key={exp}
                                                            type="button"
                                                            onClick={() => setCoachEditData({ ...coachEditData, experienceYears: exp })}
                                                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${coachEditData.experienceYears === exp ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'}`}
                                                        >
                                                            {exp}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Phone & Email */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Телефон</label>
                                                    <input
                                                        type="tel"
                                                        value={coachEditData.phone}
                                                        onChange={(e) => setCoachEditData({ ...coachEditData, phone: e.target.value })}
                                                        placeholder="+7 (999) 000-00-00"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Email</label>
                                                    <input
                                                        type="email"
                                                        value={coachEditData.email}
                                                        onChange={(e) => setCoachEditData({ ...coachEditData, email: e.target.value })}
                                                        placeholder="coach@sparta.ru"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold"
                                                    />
                                                </div>
                                            </div>

                                            {/* Availability Status */}
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">Статус доступности</label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {[
                                                        { id: 'online', label: '🟢 Доступен', color: 'text-green-400 border-green-500/30' },
                                                        { id: 'training', label: '⚽ На тренировке', color: 'text-amber-400 border-amber-500/30' },
                                                        { id: 'tournament', label: '🏆 На турнире', color: 'text-purple-400 border-purple-500/30' },
                                                        { id: 'vacation', label: '🏖️ В отпуске', color: 'text-blue-400 border-blue-500/30' }
                                                    ].map((st) => (
                                                        <button
                                                            key={st.id}
                                                            type="button"
                                                            onClick={() => setCoachEditData({ ...coachEditData, availabilityStatus: st.id })}
                                                            className={`p-2 rounded-xl text-[10px] font-bold border transition-all text-center ${coachEditData.availabilityStatus === st.id ? 'bg-white/15 border-sparta-gold font-black shadow-md' : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100'}`}
                                                        >
                                                            {st.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Bio */}
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-wider text-white/50">О себе / Философия тренировок</label>
                                                <textarea
                                                    rows={3}
                                                    value={coachEditData.bio}
                                                    onChange={(e) => setCoachEditData({ ...coachEditData, bio: e.target.value })}
                                                    placeholder="Кратко опишите вашу спортивную философию и достижения..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold resize-none"
                                                />
                                            </div>

                                            {/* Save / Cancel Buttons */}
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    disabled={isSavingCoach}
                                                    onClick={() => handleSaveCoach(targetUser.id)}
                                                    className="flex-1 py-3 bg-gradient-to-r from-sparta-gold to-yellow-500 text-black font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                                >
                                                    <Save size={14} />
                                                    <span>{isSavingCoach ? 'Сохранение...' : 'Сохранить'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSavingCoach}
                                                    onClick={() => setIsEditingCoach(false)}
                                                    className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* COACH VIEW MODE (Dynamic Holographic Sparta Card) */
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="relative flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-amber-500/25 via-[#161412] to-[#0f0e11] border-2 border-sparta-gold/50 shadow-[0_0_35px_rgba(234,179,8,0.18)] overflow-hidden"
                                        >
                                            {/* Ambient Gold Aura */}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-sparta-gold/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                                            {/* Avatar with Floating Crown */}
                                            <div className="relative mb-3.5 group">
                                                <div className="w-24 h-24 rounded-3xl bg-[#1c1a14] border-2 border-sparta-gold p-1 shadow-2xl shadow-sparta-gold/30 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                    {(targetUser.photoURL || targetUser.avatarUrl) ? (
                                                        <img src={targetUser.photoURL || targetUser.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                    ) : (
                                                        <User size={42} className="text-sparta-gold/40" />
                                                    )}
                                                </div>

                                                {/* Floating Crown Badge */}
                                                <div className="absolute -top-2.5 -right-2 p-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-sparta-gold to-yellow-300 text-black shadow-lg shadow-sparta-gold/40 animate-bounce [animation-duration:3s]">
                                                    <Crown size={14} className="stroke-[2.5]" />
                                                </div>
                                            </div>

                                            {/* Name & Verification */}
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight">
                                                    {displayName}
                                                </h4>
                                                <VerificationBadge role={role} verification={targetUser.verification} />
                                            </div>

                                            {/* Status Badge */}
                                            <div className="mb-2.5">
                                                {renderStatusBadge()}
                                            </div>

                                            {/* Specialization Badge */}
                                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold text-[10px] font-black uppercase tracking-wider mb-4 shadow-sm">
                                                <Dumbbell size={12} />
                                                <span>{targetUser.specialization || 'Тренер клуба SPARTA'}</span>
                                            </div>

                                            {/* Coach Stats Hologram Grid */}
                                            <div className="grid grid-cols-3 gap-2 w-full pt-1 mb-3.5">
                                                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center hover:border-sparta-gold/40 transition-colors">
                                                    <p className="text-xs font-black font-russo text-sparta-gold">{targetUser.experienceYears || '7+ лет'}</p>
                                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">Стаж</p>
                                                </div>
                                                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center hover:border-sparta-gold/40 transition-colors">
                                                    <p className="text-xs font-black font-russo text-sparta-gold">{trainingsCount}+</p>
                                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">Тренировок</p>
                                                </div>
                                                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center hover:border-sparta-gold/40 transition-colors">
                                                    <p className="text-xs font-black font-russo text-sparta-gold">{targetUser.license || 'UEFA / РФС'}</p>
                                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">Лицензия</p>
                                                </div>
                                            </div>

                                            {/* Coach Bio / Philosophy */}
                                            {targetUser.bio && (
                                                <div className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-sparta-gold/10 via-white/[0.02] to-transparent border border-sparta-gold/30 text-left mb-3.5">
                                                    <div className="flex items-center gap-1.5 mb-1 text-sparta-gold">
                                                        <Sparkles size={11} />
                                                        <p className="text-[9px] font-black uppercase tracking-wider">Философия тренировок</p>
                                                    </div>
                                                    <p className="text-xs text-white/85 font-manrope italic leading-relaxed">
                                                        "{targetUser.bio}"
                                                    </p>
                                                </div>
                                            )}

                                            {/* Edit Profile Button for Coach / Admin */}
                                            {(targetUser.id === currentUser?.uid || isAdmin) && (
                                                <button
                                                    onClick={() => startEditingCoach(targetUser)}
                                                    className="w-full py-2.5 bg-sparta-gold/15 hover:bg-sparta-gold/25 border border-sparta-gold/40 text-sparta-gold rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                                                >
                                                    <Edit3 size={13} />
                                                    <span>Редактировать карточку тренера</span>
                                                </button>
                                            )}
                                        </motion.div>
                                    )
                                )}

                                {/* ------------------------------------------------------------- */}
                                {/* 2. STUDENT / ATHLETE FIFA CARD VIEW                           */}
                                {/* ------------------------------------------------------------- */}
                                {isStudent && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-[#221c14] via-[#141418] to-[#0c0c10] border-2 border-sparta-gold/50 shadow-[0_0_35px_rgba(234,179,8,0.15)] overflow-hidden"
                                    >
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-52 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none" />

                                        {/* FIFA Top Bar: Number + Position */}
                                        <div className="w-full flex items-center justify-between px-1 mb-3.5">
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sparta-gold to-yellow-500 text-black text-[11px] font-black uppercase tracking-wider shadow-lg shadow-sparta-gold/20">
                                                <Zap size={12} />
                                                <span>№ {playerNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-black uppercase tracking-wider">
                                                <span>{playerPosition}</span>
                                            </div>
                                        </div>

                                        {/* Avatar */}
                                        <div className="relative mb-3 group">
                                            <div className="w-24 h-24 rounded-3xl bg-[#1c1c22] border-2 border-sparta-gold/70 p-1 shadow-xl shadow-sparta-gold/20 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                {(targetUser.photoURL || targetUser.avatarUrl) ? (
                                                    <img src={targetUser.photoURL || targetUser.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                ) : (
                                                    <User size={40} className="text-white/20" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight">
                                                {displayName}
                                            </h4>
                                            <VerificationBadge role={role} verification={targetUser.verification} />
                                        </div>

                                        {/* Status */}
                                        <div className="mb-3.5">
                                            {renderStatusBadge()}
                                        </div>

                                        {/* Level & XP Progress */}
                                        <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-3.5 text-left">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                                                <span className="text-sparta-gold flex items-center gap-1">
                                                    <Star size={11} className="fill-sparta-gold text-sparta-gold" /> Уровень {playerLevel}
                                                </span>
                                                <span className="text-white/50">{xpValue} XP</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (xpValue % 1000) / 10)}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className="h-full bg-gradient-to-r from-yellow-500 to-sparta-gold rounded-full shadow-[0_0_8px_#f59e0b]"
                                                />
                                            </div>
                                        </div>

                                        {/* Player Skills Dynamic Radar Grid */}
                                        <div className="grid grid-cols-3 gap-2 w-full">
                                            {[
                                                { label: 'PAC Скорость', val: 88 },
                                                { label: 'SHO Удар', val: 84 },
                                                { label: 'DRI Дриблинг', val: 82 },
                                                { label: 'PAS Пасы', val: 85 },
                                                { label: 'DEF Защита', val: 78 },
                                                { label: 'PHY Физика', val: 86 }
                                            ].map((skill) => (
                                                <div key={skill.label} className="p-2 rounded-xl bg-white/5 border border-white/10 text-center hover:border-sparta-gold/30 transition-colors">
                                                    <p className="text-[11px] font-black font-russo text-white">{skill.val}</p>
                                                    <p className="text-[8px] font-bold text-sparta-gold uppercase tracking-widest">{skill.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ------------------------------------------------------------- */}
                                {/* 3. PARENT PROFILE VIEW                                        */}
                                {/* ------------------------------------------------------------- */}
                                {isParent && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-emerald-500/20 via-[#121c17] to-[#0c120f] border-2 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.15)] overflow-hidden"
                                    >
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-52 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

                                        {/* Avatar */}
                                        <div className="relative mb-3 group">
                                            <div className="w-24 h-24 rounded-3xl bg-[#141b18] border-2 border-emerald-500/60 p-1 shadow-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                {(targetUser.photoURL || targetUser.avatarUrl) ? (
                                                    <img src={targetUser.photoURL || targetUser.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                ) : (
                                                    <User size={40} className="text-emerald-400/40" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight">
                                                {displayName}
                                            </h4>
                                            <VerificationBadge role={role} verification={targetUser.verification} />
                                        </div>

                                        <div className="mb-3">
                                            {renderStatusBadge()}
                                        </div>

                                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-4">
                                            <Heart size={12} />
                                            <span>Родитель воспитанника</span>
                                        </div>

                                        {/* Child Connection Card */}
                                        <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Юный спортсмен</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-black">
                                                    ⚽
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">
                                                        {targetUser.childName || targetUser.child_name || 'Воспитанник Спарты'}
                                                    </p>
                                                    <p className="text-[10px] text-emerald-400/80 font-medium">Группа подготовки SPARTA</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ------------------------------------------------------------- */}
                                {/* 4. ADMIN / STAFF VIEW                                         */}
                                {/* ------------------------------------------------------------- */}
                                {isAdminRole && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="relative flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-indigo-500/25 via-[#141524] to-[#0c0d16] border-2 border-indigo-500/40 shadow-[0_0_35px_rgba(99,102,241,0.15)] overflow-hidden"
                                    >
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-52 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

                                        {/* Avatar */}
                                        <div className="relative mb-3 group">
                                            <div className="w-24 h-24 rounded-3xl bg-[#161524] border-2 border-indigo-500/60 p-1 shadow-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                {(targetUser.photoURL || targetUser.avatarUrl) ? (
                                                    <img src={targetUser.photoURL || targetUser.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                ) : (
                                                    <ShieldCheck size={40} className="text-indigo-400" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight">
                                                {displayName}
                                            </h4>
                                            <VerificationBadge role={role} verification={targetUser.verification} />
                                        </div>

                                        <div className="mb-3">
                                            {renderStatusBadge()}
                                        </div>

                                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-4">
                                            <ShieldCheck size={12} />
                                            <span>Администрация SPARTA</span>
                                        </div>

                                        {/* Staff Areas */}
                                        <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1.5 text-[10px] text-white/70">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Зоны ответственности</p>
                                            <p className="flex items-center gap-1.5 text-indigo-200">✓ Абонементы, договоры и оплата</p>
                                            <p className="flex items-center gap-1.5 text-indigo-200">✓ Расписание тренировок и залов</p>
                                            <p className="flex items-center gap-1.5 text-indigo-200">✓ Медицинские справки и допуски</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Common Contact Cards */}
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-sparta-gold/10 text-sparta-gold flex items-center justify-center shrink-0">
                                            <Mail size={15} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Email</p>
                                            <p className="text-xs text-white/90 truncate font-medium">{targetUser.email || 'Не указан'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                            <Phone size={15} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Телефон</p>
                                            <p className="text-xs text-white/90 font-medium">{targetUser.phone || 'Не указан'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            <Activity size={15} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Статус активности</p>
                                            <p className="text-xs text-white/90 font-medium flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-white/30'}`} />
                                                <span>{isOnline ? 'В сети' : (rawStatus === 'не в сети' ? 'Не в сети' : `Был(а) ${rawStatus}`)}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions with User */}
                                {targetUser.id !== currentUser.uid && (
                                    <div className="space-y-2 pt-2">
                                        <button
                                            onClick={() => {
                                                onClose();
                                                onStartPrivateChat(targetUser.id, displayName);
                                            }}
                                            className="w-full py-3.5 bg-gradient-to-r from-sparta-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2 active:scale-[0.98] group"
                                        >
                                            <MessageSquare size={16} className="group-hover:scale-110 transition-transform" /> Написать в личные сообщения
                                        </button>

                                        {isCoach && targetUser.phone && (
                                            <a
                                                href={`tel:${targetUser.phone}`}
                                                className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider text-xs rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                            >
                                                <Phone size={14} className="animate-pulse" /> Позвонить тренеру
                                            </a>
                                        )}

                                        {isOwner && !isPrivate && (
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                {onTransferOwnership && (
                                                    <button
                                                        onClick={() => onTransferOwnership(targetUser.id, displayName)}
                                                        className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Crown size={14} /> Назначить владельцем
                                                    </button>
                                                )}
                                                {onKickParticipant && (
                                                    <button
                                                        onClick={() => onKickParticipant(targetUser.id, displayName)}
                                                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <UserMinus size={14} /> Исключить
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })() : !isSavedChat ? (
                        /* ========================================================================= */
                        /* B. MAIN GROUP HUB VIEW                                                    */
                        /* ========================================================================= */
                        <div className="space-y-5">
                            {/* 1. Group Card Hero */}
                            <div className="relative flex flex-col items-center text-center p-6 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 shadow-xl overflow-hidden">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-sparta-gold/15 rounded-full blur-3xl pointer-events-none" />

                                {/* Group Avatar */}
                                <div className="relative group mb-3">
                                    <div className="w-24 h-24 rounded-3xl bg-[#1c1c22] border-2 border-sparta-gold/50 p-1 shadow-xl overflow-hidden flex items-center justify-center">
                                        {groupData?.chatAvatarUrl ? (
                                            <img src={groupData.chatAvatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                        ) : (
                                            <MessageSquare size={38} className="text-sparta-gold" />
                                        )}
                                    </div>

                                    {canEditAvatar && (
                                        <label className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer border-2 border-sparta-gold">
                                            <Camera size={20} className="text-sparta-gold mb-1" />
                                            <span className="text-[9px] font-black uppercase text-white tracking-widest">
                                                {isUploadingAvatar ? '...' : 'Изменить'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={isUploadingAvatar}
                                                onChange={handleAvatarUpload}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Title */}
                                <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight mb-2">
                                    {groupData?.chatTitle || groupName}
                                </h4>

                                {/* ID Badge & Status */}
                                <div className="flex items-center gap-2 mb-3">
                                    <button
                                        onClick={handleCopyGroupId}
                                        className="text-[10px] font-black uppercase tracking-wider text-sparta-gold bg-sparta-gold/15 hover:bg-sparta-gold/25 px-3 py-1 rounded-full border border-sparta-gold/30 flex items-center gap-1.5 transition-colors"
                                    >
                                        <span>ID: {(groupId || chatId)?.slice(-6).toUpperCase()}</span>
                                        {copiedId ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                    </button>
                                    {groupData?.chatEnabled !== false && (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                                            Активен
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="text-xs text-white/60 font-manrope leading-relaxed max-w-xs">
                                    {groupData?.chatDescription || 'Официальный командный чат группы Спарта. Здесь публикуются расписание, новости и медиа с тренировок.'}
                                </p>
                            </div>

                            {/* 2. Quick Action Pills */}
                            <div className="grid grid-cols-2 gap-2">
                                {onToggleMute && (
                                    <button
                                        onClick={onToggleMute}
                                        className={`p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-xs font-bold ${
                                            isMuted
                                                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                                        }`}
                                    >
                                        {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                                        <span>{isMuted ? 'Включить звук' : 'Без звука'}</span>
                                    </button>
                                )}

                                <button
                                    onClick={handleCopyGroupId}
                                    className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold"
                                >
                                    <Share2 size={16} className="text-sparta-gold" />
                                    <span>{copiedId ? 'Скопировано!' : 'Ссылка чата'}</span>
                                </button>
                            </div>

                            {/* 3. Members Search & List */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder="Поиск участников..."
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-sparta-gold/50 transition-colors"
                                        />
                                    </div>
                                    {canAddParticipant && (
                                        <button
                                            onClick={onAddParticipant}
                                            className="p-2 px-3 bg-sparta-gold text-black rounded-xl font-bold text-xs flex items-center gap-1 hover:scale-105 transition-all shadow-md shadow-sparta-gold/20 shrink-0"
                                        >
                                            <Plus size={14} />
                                            <span>Добавить</span>
                                        </button>
                                    )}
                                </div>

                                {/* Members List */}
                                <div className="space-y-2">
                                    {filteredMembers.map((member, idx) => {
                                        const status = getUserStatus(member.lastSeen);
                                        const isOnline = status === 'в сети' || member.id === currentUser?.uid;
                                        const roleBadge = getRoleBadge(member);

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedUserProfile(member)}
                                                className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/5 transition-all cursor-pointer group"
                                            >
                                                {/* Avatar */}
                                                <div className="relative shrink-0">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                                                        {(member.photoURL || member.avatarUrl) ? (
                                                            <img src={member.photoURL || member.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={18} className="text-white/30" />
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111114] ${isOnline ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-white/20'}`} />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-bold text-white group-hover:text-sparta-gold transition-colors truncate">
                                                            {member.id === currentUser?.uid ? 'Вы (Текущий аккаунт)' : (member.full_name || member.childName || 'Участник')}
                                                        </p>
                                                        <VerificationBadge role={member.role} verification={member.verification} />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className={`text-[9px] font-bold ${isOnline ? 'text-green-400' : 'text-white/30'}`}>
                                                            {isOnline ? 'в сети' : status}
                                                        </span>
                                                        {roleBadge && (
                                                            <>
                                                                <span className="text-white/20 text-[8px]">•</span>
                                                                <span className="text-[8px] font-black uppercase text-sparta-gold">
                                                                    {roleBadge.label}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 4. Leave Group / Danger Zone */}
                            {!isPrivate && !isSavedChat && !isOwner && onLeaveGroup && (
                                <div className="pt-4 border-t border-white/10">
                                    <button
                                        onClick={onLeaveGroup}
                                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2"
                                    >
                                        <LogOut size={15} />
                                        <span>Покинуть группу</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </div>
    );
};

export default ChatProfileDrawer;
