import React, { useState, useMemo, useEffect } from 'react';
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
    Pin,
    AlertTriangle,
    FilePlus,
    UploadCloud,
    ExternalLink,
    Lock,
    Eye,
    Clock,
    Trash2,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../supabase';
import { db } from '../../firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { CoachNote } from '../../types/user';

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
        
        const otherId = groupData?.parentId || groupData?.coachId || (Array.isArray(groupData?.participants) ? groupData.participants.find((id: string) => id !== currentUser?.uid) : null);
        const otherRole = (otherId ? groupData?.participantRoles?.[otherId] : null) || (otherId ? groupData?.participantDetails?.[otherId]?.role : null) || (groupData?.type === 'parent' ? 'parent' : null);
        const otherName = (otherId ? groupData?.participantNames?.[otherId] : null) || (otherId ? groupData?.participantDetails?.[otherId]?.name : null) || (groupData?.type === 'parent' ? (groupData.parentName || 'Родитель') : null) || groupName;

        if (other) {
            return {
                ...other,
                role: other.role || otherRole || (groupData?.type === 'parent' ? 'parent' : 'student'),
                full_name: other.full_name || other.displayName || other.name || other.parentName || otherName,
                childName: other.childName || other.studentName || groupData?.childName || groupData?.studentName
            };
        }

        const isCoachName = (groupName || '').toLowerCase().includes('тренер') || !!groupData?.coachId;
        const resolvedRole = otherRole || (groupData?.type === 'parent' ? 'parent' : (isCoachName ? 'trainer' : 'student'));
        return {
            id: otherId,
            full_name: otherName || 'Собеседник',
            role: resolvedRole,
            photoURL: groupData?.chatAvatarUrl,
            childName: groupData?.childName || groupData?.studentName,
            license: isCoachName ? 'Лицензия РФС / UEFA B' : undefined,
            experienceYears: isCoachName ? '8 лет' : undefined,
            position: !isCoachName ? 'Нападающий ⚡' : undefined,
            playerNumber: !isCoachName ? 10 : undefined
        };
    }, [isPrivate, groupMembers, currentUser?.uid, groupName, groupData]);

    const effectiveUserProfile = selectedUserProfile || (isPrivate ? otherParticipant : null);

    // Linked Child & Parent Data States
    const [linkedChildData, setLinkedChildData] = useState<any | null>(null);
    const [childGroupTitle, setChildGroupTitle] = useState<string>('');
    const [loadingChild, setLoadingChild] = useState(false);

    const [studentParentData, setStudentParentData] = useState<any | null>(null);
    const [studentGroupTitle, setStudentGroupTitle] = useState<string>('');

    // Escape Key Listener for Closing Drawer
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Fetch Linked Child Data (if Parent) or Parent & Group (if Student)
    useEffect(() => {
        if (!effectiveUserProfile) return;
        const role = effectiveUserProfile.role;

        // A. If PARENT: fetch linked child document and group
        if (role === 'parent') {
            const childId = effectiveUserProfile.childrenIds?.[0] || effectiveUserProfile.childId || effectiveUserProfile.linkedChildId;
            if (childId) {
                setLoadingChild(true);
                getDoc(doc(db, 'users', childId))
                    .then(async (snap) => {
                        if (snap.exists()) {
                            const cData: any = { id: snap.id, ...snap.data() };
                            setLinkedChildData(cData);
                            if (cData.groupId) {
                                try {
                                    const gSnap = await getDoc(doc(db, 'groups', cData.groupId));
                                    if (gSnap.exists()) {
                                        setChildGroupTitle(gSnap.data().name || gSnap.data().title || 'Группа SPARTA');
                                    }
                                } catch (e) {}
                            }
                        }
                    })
                    .catch((err) => console.warn("Error loading child doc:", err))
                    .finally(() => setLoadingChild(false));
            } else {
                setLinkedChildData(null);
                setChildGroupTitle('');
            }
        }

        // B. If STUDENT: fetch parent document and group
        if (role === 'user' || role === 'student') {
            const pId = effectiveUserProfile.parentId || effectiveUserProfile.linkedParentId;
            if (pId) {
                getDoc(doc(db, 'users', pId))
                    .then((snap) => {
                        if (snap.exists()) {
                            setStudentParentData({ id: snap.id, ...snap.data() });
                        }
                    })
                    .catch((err) => console.warn("Error loading parent doc:", err));
            } else {
                setStudentParentData(null);
            }

            if (effectiveUserProfile.groupId) {
                getDoc(doc(db, 'groups', effectiveUserProfile.groupId))
                    .then((gSnap) => {
                        if (gSnap.exists()) {
                            setStudentGroupTitle(gSnap.data().name || gSnap.data().title || 'Группа SPARTA');
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [effectiveUserProfile]);

    // Age / Birth Year Formatter Helper
    const getChildAgeText = (child: any, fallbackAge?: number | string) => {
        const birthDate = child?.birthDate || child?.birthdate || child?.dateOfBirth;
        if (birthDate) {
            try {
                const b = typeof birthDate === 'string' ? new Date(birthDate) : (birthDate?.toDate ? birthDate.toDate() : new Date(birthDate));
                if (!isNaN(b.getTime())) {
                    const now = new Date();
                    let age = now.getFullYear() - b.getFullYear();
                    const m = now.getMonth() - b.getMonth();
                    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
                    return `${age} лет (${b.getFullYear()} г.р.)`;
                }
            } catch (e) {}
        }
        const birthYear = child?.childBirthYear || child?.birthYear;
        if (birthYear) {
            const y = Number(birthYear);
            if (y > 1900 && y < 2030) {
                const age = new Date().getFullYear() - y;
                return `${age} лет (${y} г.р.)`;
            }
        }
        if (fallbackAge) {
            return `${fallbackAge} лет`;
        }
        if (child?.age || child?.childAge) {
            return `${child.age || child.childAge} лет`;
        }
        return null;
    };

    const isStaffOrCoach = Boolean(
        currentUserProfile?.role === 'coach' ||
        currentUserProfile?.role === 'trainer' ||
        currentUserProfile?.role === 'admin' ||
        currentUserProfile?.role === 'director' ||
        currentUserProfile?.role === 'developer' ||
        currentUser?.role === 'coach' ||
        currentUser?.role === 'trainer' ||
        currentUser?.role === 'admin' ||
        currentUser?.role === 'director'
    );

    // Coach Notes Timeline State
    const [coachNotesList, setCoachNotesList] = useState<CoachNote[]>([]);
    const [newCoachNoteText, setNewCoachNoteText] = useState<string>('');
    const [isAddingCoachNote, setIsAddingCoachNote] = useState(false);
    const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

    // Medical Doc State
    const [isEditingMedical, setIsEditingMedical] = useState(false);
    const [medicalValidUntil, setMedicalValidUntil] = useState<string>('');
    const [medicalNotes, setMedicalNotes] = useState<string>('');
    const [medicalPhotoFile, setMedicalPhotoFile] = useState<File | null>(null);
    const [isSavingMedical, setIsSavingMedical] = useState(false);
    const [medicalPhotoPreviewModal, setMedicalPhotoPreviewModal] = useState<string | null>(null);

    // Sync Coach Notes and Medical Doc from linked child or active user
    useEffect(() => {
        const activeTarget = linkedChildData || effectiveUserProfile;
        if (activeTarget) {
            let notesList: CoachNote[] = [];
            if (Array.isArray(activeTarget.coachNotesList) && activeTarget.coachNotesList.length > 0) {
                notesList = activeTarget.coachNotesList;
            } else if (activeTarget.coachNotes || activeTarget.notes) {
                // Graceful fallback for legacy single string note
                const legacyText = activeTarget.coachNotes || activeTarget.notes;
                notesList = [{
                    id: 'legacy_1',
                    text: legacyText,
                    createdAt: activeTarget.updatedAt ? format(new Date(activeTarget.updatedAt), 'dd.MM.yyyy, HH:mm') : 'Ранее',
                    authorName: 'Тренер клуба',
                    authorId: 'legacy'
                }];
            }
            setCoachNotesList(notesList);
            setNewCoachNoteText('');

            const med = activeTarget.medicalDoc;
            setMedicalValidUntil(med?.validUntil || '');
            setMedicalNotes(med?.notes || '');
            setMedicalPhotoFile(null);
            setIsEditingMedical(false);
        }
    }, [linkedChildData, effectiveUserProfile]);

    // Check who can delete a note
    const canDeleteNote = (note: CoachNote) => {
        const myUid = currentUser?.uid;
        const myRole = currentUserProfile?.role || currentUser?.role;
        const isAdminOrDirector = myRole === 'admin' || myRole === 'director';
        return myUid === note.authorId || isAdminOrDirector;
    };

    // Add Coach Note to Timeline Handler
    const handleAddCoachNote = async () => {
        if (!newCoachNoteText.trim()) return;
        const targetId = linkedChildData?.id || (effectiveUserProfile?.role === 'user' || effectiveUserProfile?.role === 'student' ? effectiveUserProfile.id : (effectiveUserProfile?.childrenIds?.[0] || effectiveUserProfile?.id));
        if (!targetId) return;

        setIsAddingCoachNote(true);
        try {
            const rawAuthorName = currentUserProfile?.name || currentUserProfile?.full_name || currentUserProfile?.displayName || 'Тренер';
            const authorName = rawAuthorName.toLowerCase().startsWith('тренер') ? rawAuthorName : `Тренер ${rawAuthorName}`;
            const authorId = currentUser?.uid || 'coach';
            const nowStr = format(new Date(), 'dd.MM.yyyy, HH:mm');

            const newNote: CoachNote = {
                id: `note_${Date.now()}`,
                text: newCoachNoteText.trim(),
                createdAt: nowStr,
                authorName: authorName,
                authorId: authorId
            };

            const updatedList = [newNote, ...coachNotesList];

            // Optimistic update
            setCoachNotesList(updatedList);
            setNewCoachNoteText('');

            await setDoc(doc(db, 'users', targetId), {
                coachNotesList: updatedList,
                coachNotes: newNote.text, // for backward compatibility
                notes: newNote.text,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            if (linkedChildData && linkedChildData.id === targetId) {
                setLinkedChildData((prev: any) => ({ ...prev, coachNotesList: updatedList, coachNotes: newNote.text, notes: newNote.text }));
            }
            if (effectiveUserProfile && effectiveUserProfile.id === targetId) {
                effectiveUserProfile.coachNotesList = updatedList;
                effectiveUserProfile.coachNotes = newNote.text;
                effectiveUserProfile.notes = newNote.text;
            }
        } catch (err) {
            console.error('Error adding coach note:', err);
            alert('Не удалось добавить заметку тренера');
        } finally {
            setIsAddingCoachNote(false);
        }
    };

    // Delete Coach Note Handler
    const handleDeleteCoachNote = async (noteId: string) => {
        const targetId = linkedChildData?.id || (effectiveUserProfile?.role === 'user' || effectiveUserProfile?.role === 'student' ? effectiveUserProfile.id : (effectiveUserProfile?.childrenIds?.[0] || effectiveUserProfile?.id));
        if (!targetId) return;

        setDeletingNoteId(noteId);
        try {
            const updatedList = coachNotesList.filter(n => n.id !== noteId);
            setCoachNotesList(updatedList);

            await setDoc(doc(db, 'users', targetId), {
                coachNotesList: updatedList,
                coachNotes: updatedList[0]?.text || '',
                notes: updatedList[0]?.text || '',
                updatedAt: new Date().toISOString()
            }, { merge: true });

            if (linkedChildData && linkedChildData.id === targetId) {
                setLinkedChildData((prev: any) => ({ ...prev, coachNotesList: updatedList, coachNotes: updatedList[0]?.text || '', notes: updatedList[0]?.text || '' }));
            }
            if (effectiveUserProfile && effectiveUserProfile.id === targetId) {
                effectiveUserProfile.coachNotesList = updatedList;
                effectiveUserProfile.coachNotes = updatedList[0]?.text || '';
                effectiveUserProfile.notes = updatedList[0]?.text || '';
            }
        } catch (err) {
            console.error('Error deleting coach note:', err);
            alert('Не удалось удалить заметку');
        } finally {
            setDeletingNoteId(null);
        }
    };

    // Save Medical Doc Handler
    const handleSaveMedicalDoc = async () => {
        const targetId = linkedChildData?.id || (effectiveUserProfile?.role === 'user' || effectiveUserProfile?.role === 'student' ? effectiveUserProfile.id : (effectiveUserProfile?.childrenIds?.[0] || effectiveUserProfile?.id));
        if (!targetId) return;

        setIsSavingMedical(true);
        try {
            let photoUrl = (linkedChildData || effectiveUserProfile)?.medicalDoc?.photoUrl;

            if (medicalPhotoFile) {
                const fileExt = medicalPhotoFile.name.split('.').pop() || 'jpg';
                const filePath = `medical-docs/${targetId}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('chat-media')
                    .upload(filePath, medicalPhotoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('chat-media')
                    .getPublicUrl(filePath);

                photoUrl = publicUrl;
            }

            // Calculate status
            let status: 'valid' | 'expiring' | 'expired' | 'missing' = 'missing';
            if (medicalValidUntil) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const exp = new Date(medicalValidUntil);
                exp.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) status = 'expired';
                else if (diffDays <= 14) status = 'expiring';
                else status = 'valid';
            }

            const updatedMedicalDoc = {
                status,
                validUntil: medicalValidUntil || null,
                photoUrl: photoUrl || null,
                notes: medicalNotes || '',
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', targetId), {
                medicalDoc: updatedMedicalDoc
            }, { merge: true });

            if (linkedChildData && linkedChildData.id === targetId) {
                setLinkedChildData((prev: any) => ({ ...prev, medicalDoc: updatedMedicalDoc }));
            }
            if (effectiveUserProfile && effectiveUserProfile.id === targetId) {
                effectiveUserProfile.medicalDoc = updatedMedicalDoc;
            }

            setIsEditingMedical(false);
            setMedicalPhotoFile(null);
        } catch (err) {
            console.error('Error saving medical doc:', err);
            alert('Не удалось сохранить данные медсправки');
        } finally {
            setIsSavingMedical(false);
        }
    };

    // Calculate Medical Status Helper
    const getMedicalStatusInfo = (medDoc?: any) => {
        if (!medDoc || !medDoc.validUntil) {
            return {
                status: 'missing' as const,
                label: 'Справка не загружена',
                badge: (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider">
                        <AlertTriangle size={10} /> Справка отсутствует
                    </span>
                ),
                color: 'red'
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(medDoc.validUntil);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let formattedDate = medDoc.validUntil;
        try {
            formattedDate = format(exp, 'dd.MM.yyyy');
        } catch (e) {}

        if (diffDays < 0) {
            return {
                status: 'expired' as const,
                label: `Просрочена (${formattedDate})`,
                badge: (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-black uppercase tracking-wider">
                        <AlertTriangle size={10} /> Просрочена ({formattedDate})
                    </span>
                ),
                color: 'red'
            };
        } else if (diffDays <= 14) {
            return {
                status: 'expiring' as const,
                label: `Истекает через ${diffDays} дн. (${formattedDate})`,
                badge: (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                        <Clock size={10} /> Истекает через ${diffDays} дн.
                    </span>
                ),
                color: 'amber'
            };
        } else {
            return {
                status: 'valid' as const,
                label: `Допуск до ${formattedDate}`,
                badge: (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                        <Check size={10} /> Допуск до ${formattedDate}
                    </span>
                ),
                color: 'emerald'
            };
        }
    };

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
            {/* Backdrop: Allows click outside to close on all devices */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 md:bg-black/40 backdrop-blur-sm pointer-events-auto z-10"
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
                        const displayName =
                            targetUser.full_name ||
                            targetUser.name ||
                            targetUser.displayName ||
                            targetUser.parentName ||
                            targetUser.parentFullName ||
                            groupData?.participantNames?.[targetUser.id] ||
                            groupData?.participantDetails?.[targetUser.id]?.name ||
                            (isPrivate && groupName && !groupName.toLowerCase().startsWith('чат') ? groupName : null) ||
                            targetUser.email ||
                            (isParent ? 'Родитель' : isCoach ? 'Тренер' : 'Воспитанник');
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

                        // 1. Render Medical Doc Card Helper
                        const renderMedicalDocSection = (targetUserOrChild: any) => {
                            const medDoc = targetUserOrChild?.medicalDoc;
                            const medInfo = getMedicalStatusInfo(medDoc);

                            return (
                                <div className="w-full p-4 rounded-3xl bg-white/[0.04] border border-white/10 text-left space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🩺</span>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-white">Медсправка ребенка</p>
                                                <p className="text-[8px] text-white/40 font-bold uppercase">Допуск к тренировкам</p>
                                            </div>
                                        </div>
                                        <div>{medInfo.badge}</div>
                                    </div>

                                    {/* Notes / Health group */}
                                    {medDoc?.notes && (
                                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-white/80">
                                            <span className="text-[9px] font-bold text-white/40 uppercase block mb-0.5">Группа здоровья / ограничения:</span>
                                            {medDoc.notes}
                                        </div>
                                    )}

                                    {/* Photo preview if exists */}
                                    {medDoc?.photoUrl && (
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img
                                                    src={medDoc.photoUrl}
                                                    alt="Справка"
                                                    className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => setMedicalPhotoPreviewModal(medDoc.photoUrl)}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">Скан медсправки</p>
                                                    <p className="text-[9px] text-white/40">Нажмите для увеличения</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setMedicalPhotoPreviewModal(medDoc.photoUrl)}
                                                className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-colors"
                                                title="Просмотреть"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Edit / Upload form */}
                                    {isEditingMedical ? (
                                        <div className="pt-2 border-t border-white/10 space-y-2.5 animate-in fade-in duration-200">
                                            <div>
                                                <label className="text-[9px] font-black text-white/40 uppercase block mb-1">
                                                    Действует до (дата)
                                                </label>
                                                <input
                                                    type="date"
                                                    value={medicalValidUntil}
                                                    onChange={(e) => setMedicalValidUntil(e.target.value)}
                                                    className="w-full bg-[#1c1c22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sparta-gold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-white/40 uppercase block mb-1">
                                                    Ограничения / группа здоровья
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Например: 1 группа, без ограничений"
                                                    value={medicalNotes}
                                                    onChange={(e) => setMedicalNotes(e.target.value)}
                                                    className="w-full bg-[#1c1c22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sparta-gold"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-white/40 uppercase block mb-1">
                                                    Фото / скан справки
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) setMedicalPhotoFile(e.target.files[0]);
                                                    }}
                                                    className="w-full text-[10px] text-white/60 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-white/10 file:text-white hover:file:bg-white/20"
                                                />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveMedicalDoc}
                                                    disabled={isSavingMedical}
                                                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                                                >
                                                    {isSavingMedical ? <span className="animate-spin text-xs">⏳</span> : <Save size={13} />}
                                                    <span>Сохранить</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingMedical(false)}
                                                    disabled={isSavingMedical}
                                                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-bold transition-all"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        (isStaffOrCoach || targetUser.id === currentUser?.uid) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setMedicalValidUntil(medDoc?.validUntil || '');
                                                    setMedicalNotes(medDoc?.notes || '');
                                                    setIsEditingMedical(true);
                                                }}
                                                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <Edit3 size={12} />
                                                <span>{medDoc?.validUntil ? 'Обновить медсправку' : 'Загрузить медсправку'}</span>
                                            </button>
                                        )
                                    )}
                                </div>
                            );
                        };

                        // 2. Render Coach Notes Timeline Helper
                        const renderCoachNotesSection = () => {
                            if (!isStaffOrCoach) return null;

                            return (
                                <div className="w-full p-4 rounded-3xl bg-amber-500/[0.06] border border-amber-500/25 text-left space-y-3 shadow-md">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-sparta-gold">
                                            <Lock size={13} />
                                            <p className="text-[10px] font-black uppercase tracking-wider">
                                                Тренерские заметки
                                            </p>
                                            {coachNotesList.length > 0 && (
                                                <span className="text-[10px] font-bold text-white/40">({coachNotesList.length})</span>
                                            )}
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                            Приватно
                                        </span>
                                    </div>

                                    <p className="text-[9px] text-white/50 leading-relaxed">
                                        Лента видна только тренерам и руководству клуба. Недоступна родителям.
                                    </p>

                                    {/* Compact Input Row with ➕ button */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newCoachNoteText}
                                            onChange={(e) => setNewCoachNoteText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddCoachNote();
                                                }
                                            }}
                                            placeholder="Новая заметка о ребенке или семье..."
                                            className="flex-1 bg-[#161412] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sparta-gold transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCoachNote}
                                            disabled={isAddingCoachNote || !newCoachNoteText.trim()}
                                            className="w-9 h-9 rounded-xl bg-sparta-gold hover:bg-yellow-400 text-black flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                            title="Добавить заметку"
                                        >
                                            {isAddingCoachNote ? <Loader2 size={15} className="animate-spin" /> : <Plus size={16} className="stroke-[2.5]" />}
                                        </button>
                                    </div>

                                    {/* Timeline Notes List */}
                                    {coachNotesList.length > 0 ? (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                            {coachNotesList.map((note) => {
                                                const canDelete = canDeleteNote(note);
                                                const isDeleting = deletingNoteId === note.id;

                                                return (
                                                    <div
                                                        key={note.id}
                                                        className="p-2.5 rounded-2xl bg-[#141210] border border-white/5 space-y-1 group/note hover:border-amber-500/25 transition-all"
                                                    >
                                                        <div className="flex items-center justify-between text-[9px] text-white/40">
                                                            <span className="font-semibold text-amber-400/80 truncate">
                                                                {note.createdAt} • {note.authorName}
                                                            </span>
                                                            {canDelete && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteCoachNote(note.id)}
                                                                    disabled={isDeleting}
                                                                    className="opacity-40 group-hover/note:opacity-100 p-1 text-white/40 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                                                                    title="Удалить заметку"
                                                                >
                                                                    {isDeleting ? <span className="animate-spin text-[8px]">⏳</span> : <Trash2 size={11} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-white/90 font-medium leading-snug whitespace-pre-wrap">
                                                            {note.text}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-white/30 italic text-center py-2">
                                            Заметок пока нет. Добавьте первую запись выше.
                                        </p>
                                    )}
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
                                                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-600/30 to-stone-950 flex items-center justify-center text-sparta-gold font-russo text-3xl font-black shadow-inner">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </div>
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
                                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold text-[10px] font-black uppercase tracking-wider mb-3.5 shadow-sm">
                                                <Dumbbell size={12} />
                                                <span>{targetUser.specialization || 'Тренер клуба SPARTA'}</span>
                                            </div>

                                            {/* Direct Call Button for Coach */}
                                            {targetUser.phone && (
                                                <a
                                                    href={`tel:${targetUser.phone}`}
                                                    className="w-full py-2.5 px-4 mb-3.5 bg-gradient-to-r from-sparta-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 group"
                                                >
                                                    <Phone size={14} className="fill-black group-hover:scale-110 transition-transform" />
                                                    <span>Позвонить тренеру {targetUser.phone}</span>
                                                </a>
                                            )}

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
                                                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-yellow-600/30 to-amber-950 flex items-center justify-center text-sparta-gold font-russo text-3xl font-black shadow-inner">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
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
                                        <div className="mb-3">
                                            {renderStatusBadge()}
                                        </div>

                                        {/* Group Info */}
                                        <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 mb-3 text-left">
                                            <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Группа подготовки</p>
                                            <p className="text-xs font-bold text-white truncate mt-0.5">{studentGroupTitle || targetUser.groupName || 'Группа SPARTA'}</p>
                                        </div>

                                        {/* Parent Contact Card */}
                                        {(() => {
                                            const parentName =
                                                studentParentData?.displayName ||
                                                studentParentData?.name ||
                                                studentParentData?.full_name ||
                                                targetUser.parentName ||
                                                targetUser.parentFullName ||
                                                'Родитель спортсмена';
                                            const parentPhone =
                                                studentParentData?.phone ||
                                                studentParentData?.parentPhone ||
                                                targetUser.parentPhone;

                                            return (
                                                <div className="w-full p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 mb-3.5 text-left space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Родитель спортсмена</p>
                                                        <span className="text-[9px] text-white/40 font-bold">Семья</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-white truncate">{parentName}</p>
                                                    {parentPhone && (
                                                        <a
                                                            href={`tel:${parentPhone}`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                                                        >
                                                            <Phone size={12} className="fill-black" />
                                                            <span>Позвонить {parentPhone}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })()}

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

                                        {/* 🩺 Medical Certificate Card */}
                                        {renderMedicalDocSection(targetUser)}

                                        {/* 🔒 Coach Notes */}
                                        {renderCoachNotesSection()}
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

                                        {/* Avatar with dynamic initials */}
                                        <div className="relative mb-3.5 group">
                                            <div className="w-24 h-24 rounded-3xl bg-[#141b18] border-2 border-emerald-500/60 p-1 shadow-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                {(targetUser.photoURL || targetUser.avatarUrl) ? (
                                                    <img src={targetUser.photoURL || targetUser.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-950 flex items-center justify-center text-emerald-300 font-russo text-3xl font-black shadow-inner">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight">
                                                {displayName}
                                            </h4>
                                            <VerificationBadge role={role} verification={targetUser.verification} />
                                        </div>

                                        <div className="mb-2.5">
                                            {renderStatusBadge()}
                                        </div>

                                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-3.5 shadow-sm">
                                            <Heart size={12} className="fill-emerald-400/30" />
                                            <span>👨‍👦 Родитель</span>
                                        </div>

                                        {/* Child Connection Card (Ребенок в Спарте) */}
                                        {(() => {
                                            const childName =
                                                linkedChildData?.displayName ||
                                                linkedChildData?.name ||
                                                linkedChildData?.childFullName ||
                                                linkedChildData?.childName ||
                                                groupData?.childName ||
                                                groupData?.studentName ||
                                                targetUser.childName ||
                                                targetUser.child_name ||
                                                'Воспитанник Спарты';

                                            const childAgeText = getChildAgeText(linkedChildData, groupData?.childAge || targetUser.childAge);
                                            const groupTitle = childGroupTitle || linkedChildData?.groupName || groupData?.groupTitle || 'Ожидает распределения';

                                            const hasActiveSubscription = Boolean(
                                                linkedChildData?.subscription?.status === 'active' ||
                                                (Number(linkedChildData?.subscription?.daysRemaining) > 0) ||
                                                linkedChildData?.isSubscriptionActive === true
                                            );

                                            return (
                                                <div className="w-full p-4 rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent border border-white/10 text-left space-y-3 shadow-md mb-3.5">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                            <span>⚽ Ребенок в Спарте</span>
                                                        </p>
                                                        {hasActiveSubscription ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                                                                <Check size={10} /> Действующий абонемент
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase tracking-wider">
                                                                <Sparkles size={10} /> Пробное занятие
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sparta-gold/20 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 shadow-sm">
                                                            {linkedChildData?.avatarUrl || linkedChildData?.photoURL ? (
                                                                <img src={linkedChildData.avatarUrl || linkedChildData.photoURL} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                            ) : (
                                                                <span>⚽</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="text-sm font-black font-russo text-white uppercase tracking-tight truncate">
                                                                {childName}
                                                            </h5>
                                                            {childAgeText && (
                                                                <p className="text-xs text-white/70 font-medium">
                                                                    {childAgeText}
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                                                                {groupTitle}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {linkedChildData && (
                                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                                                            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                                                                <p className="text-[9px] font-black text-white/40 uppercase">Номер</p>
                                                                <p className="text-xs font-black font-russo text-sparta-gold mt-0.5">
                                                                    № {linkedChildData.playerNumber || linkedChildData.number || '—'}
                                                                </p>
                                                            </div>
                                                            <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-center">
                                                                <p className="text-[9px] font-black text-white/40 uppercase">Баланс</p>
                                                                <p className="text-xs font-black font-russo text-emerald-400 mt-0.5">
                                                                    {linkedChildData.balance || 0} ₽
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* 🩺 Medical Certificate Card for Child */}
                                        {renderMedicalDocSection(linkedChildData || targetUser)}

                                        {/* 🔒 Coach Notes for Child/Parent */}
                                        {renderCoachNotesSection()}
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
                                        <div className="relative mb-3.5 group">
                                            <div className="w-24 h-24 rounded-3xl bg-[#161524] border-2 border-indigo-500/60 p-1 shadow-xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                                {(targetUser.photoURL || targetUser.avatarUrl) ? (
                                                    <img src={targetUser.photoURL || targetUser.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-600/30 to-slate-950 flex items-center justify-center text-indigo-300 font-russo text-3xl font-black shadow-inner">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <h4 className="text-lg font-black font-russo uppercase text-white tracking-tight">
                                                {displayName}
                                            </h4>
                                            <VerificationBadge role={role} verification={targetUser.verification} />
                                        </div>

                                        <div className="mb-2.5">
                                            {renderStatusBadge()}
                                        </div>

                                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-3.5">
                                            <ShieldCheck size={12} />
                                            <span>Администрация SPARTA</span>
                                        </div>

                                        {/* Direct Call Button for Admin */}
                                        {targetUser.phone && (
                                            <a
                                                href={`tel:${targetUser.phone}`}
                                                className="w-full py-2.5 px-4 mb-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <Phone size={14} className="fill-white" />
                                                <span>Позвонить в клуб {targetUser.phone}</span>
                                            </a>
                                        )}

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

                                {/* Actions with User (Only when clicking from a group member list, never duplicate in 1-on-1 private chat) */}
                                {targetUser.id !== currentUser.uid && !isPrivate && (
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
                                        <label 
                                            className="absolute bottom-0 right-0 p-2 rounded-2xl bg-black/80 hover:bg-black text-sparta-gold border border-sparta-gold/60 shadow-lg cursor-pointer transition-all hover:scale-105"
                                            title="Сменить аватар чата"
                                        >
                                            <Camera size={14} className="text-sparta-gold" />
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

                {/* 🌟 3. Sticky Bottom Action Bar (Fixed Call Button) */}
                {effectiveUserProfile && effectiveUserProfile.id !== currentUser?.uid && (
                    <div className="shrink-0 p-4 bg-[#141418]/95 backdrop-blur-xl border-t border-white/10 z-20">
                        {effectiveUserProfile.phone ? (
                            <a
                                href={`tel:${effectiveUserProfile.phone}`}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 active:scale-[0.98] group"
                            >
                                <Phone size={16} className="fill-white group-hover:scale-110 transition-transform" />
                                <span>Позвонить {effectiveUserProfile.phone}</span>
                            </a>
                        ) : (
                            <button
                                disabled
                                className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white/30 font-bold uppercase tracking-wider text-xs rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Phone size={14} />
                                <span>Телефон не указан</span>
                            </button>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Fullscreen Medical Photo Lightbox */}
            {medicalPhotoPreviewModal && (
                <div
                    onClick={() => setMedicalPhotoPreviewModal(null)}
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
                >
                    <div className="relative max-w-2xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setMedicalPhotoPreviewModal(null)}
                            className="absolute -top-10 right-0 text-white/80 hover:text-white p-2"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={medicalPhotoPreviewModal}
                            alt="Медицинская справка"
                            className="max-h-[85vh] w-auto rounded-2xl shadow-2xl border border-white/20 object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatProfileDrawer;
