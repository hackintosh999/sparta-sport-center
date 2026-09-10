import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Send,
    Heart,
    Crown,
    Users,
    Sparkles,
    Trophy,
    Flame,
    Share2,
    Eye,
    MessageCircle,
    CheckCircle2,
    Copy,
    Check,
    MessageSquare,
    ExternalLink,
    Pause,
    Play,
    MoreVertical,
    Shield,
    Trash2,
    EyeOff,
    AlertTriangle,
    UserCheck,
    Calendar,
    Phone,
    MapPin,
    Award,
    BarChart3,
    ThumbsUp,
    Vote,
    Search,
    Coins,
    Zap,
    Clock,
    Star
} from 'lucide-react';
import {
    doc,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    setDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    limit,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../../firebase';
import { Sparta3DReactionIcon } from './SpartaReactions';
import { SpartaHighlightsModal } from './SpartaHighlightsModal';
import { SpartaCoinIcon } from '../SpartaCoinIcon';

export interface SpartaStoryComment {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole?: string;
    text: string;
    createdAt: any;
}

export interface SpartaStorySlide {
    id: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'gradient';
    gradient?: string;
    title: string;
    subtitle?: string;
    description?: string;
    createdAt?: any;
    likes?: string[];
    views?: string[];
    likesCount?: number;
    hasLiked?: boolean;
    viewsCount?: number;
    poll?: {
        question: string;
        options: string[];
        votes?: Record<number, number>;
        userVote?: number;
    };
    pollVotes?: Record<string, number>;
    comments?: SpartaStoryComment[];
    actionButton?: {
        label: string;
        link?: string;
        tab?: string;
    };
    stickerBadge?: string;
    stickerPosition?: { x: number; y: number };
    stickerScale?: number;
    matchScore?: {
        team1: string;
        score1: string;
        team2: string;
        score2: string;
    } | null;
    scorePosition?: { x: number; y: number };
    scoreScale?: number;
    showClubCrest?: boolean;
    crestPosition?: { x: number; y: number };
    textColor?: string;
    textStyle?: 'normal' | 'banner' | 'neon';
    textSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    textPosition?: { x: number; y: number };
}

export interface SpartaStoryGroup {
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole?: 'coach' | 'club' | 'friend' | 'student';
    roleLabel?: string;
    isUnseen?: boolean;
    slides: SpartaStorySlide[];
}

export interface SpartaStoryViewerItem {
    uid: string;
    name: string;
    avatar?: string;
    roleBadge?: string;
    hasLiked?: boolean;
    pollOption?: string;
    timeAgo?: string;
}

interface SpartaStoriesViewerProps {
    isOpen: boolean;
    initialGroupIndex?: number;
    storyGroups: SpartaStoryGroup[];
    currentUserId?: string;
    currentUserProfile?: any;
    chats?: any[];
    onClose: () => void;
    onReplyToChat?: (authorId: string, authorName: string, text: string, storyTitle?: string) => void;
    onReaction?: (authorId: string, emojiKey: string, slideId: string) => void;
    onVotePoll?: (authorId: string, slideId: string, optionIndex: number) => void;
    onForwardStoryToChat?: (chatId: string, storyTitle: string) => void;
    onDeleteStory?: (slideId: string) => void;
}

export const SpartaStoriesViewer: React.FC<SpartaStoriesViewerProps> = ({
    isOpen,
    initialGroupIndex = 0,
    storyGroups,
    currentUserId,
    currentUserProfile,
    chats = [],
    onClose,
    onReplyToChat,
    onReaction,
    onVotePoll,
    onForwardStoryToChat,
    onDeleteStory
}) => {
    const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
    const [slideIndex, setSlideIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isManualPaused, setIsManualPaused] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
    const [doubleTapHeart, setDoubleTapHeart] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Live Real-Time Story Document State (likes, views, pollVotes)
    const [liveSlideData, setLiveSlideData] = useState<{
        likes: string[];
        views: string[];
        pollVotes: Record<string, number>;
    }>({ likes: [], views: [], pollVotes: {} });

    // Live Real-Time Viewers State
    const [liveViewers, setLiveViewers] = useState<SpartaStoryViewerItem[]>([]);
    const [isViewsSheetOpen, setIsViewsSheetOpen] = useState(false);
    const [viewersFilter, setViewersFilter] = useState<'all' | 'liked' | 'voted' | 'mvp'>('all');
    const [viewerSearchQuery, setViewerSearchQuery] = useState('');

    // Live Real-Time Comments State
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [liveComments, setLiveComments] = useState<SpartaStoryComment[]>([]);

    // Share Sheet State
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [forwardSuccessChat, setForwardSuccessChat] = useState<string | null>(null);

    // Author Profile Card Modal
    const [isAuthorProfileOpen, setIsAuthorProfileOpen] = useState(false);

    // Save to Highlights Modal
    const [isSaveHighlightOpen, setIsSaveHighlightOpen] = useState(false);

    // Options Menu Popover
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [menuToast, setMenuToast] = useState<string | null>(null);

    // Double tap detector ref
    const lastTapTimeRef = useRef<number>(0);

    const SLIDE_DURATION_MS = 5500;
    const [progress, setProgress] = useState(0);
    const progressIntervalRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            setGroupIndex(Math.max(0, Math.min(initialGroupIndex, storyGroups.length - 1)));
            setSlideIndex(0);
            setProgress(0);
            setIsCommentsOpen(false);
            setIsShareOpen(false);
            setIsAuthorProfileOpen(false);
            setIsViewsSheetOpen(false);
            setIsOptionsMenuOpen(false);
            setIsManualPaused(false);
            setViewerSearchQuery('');
            setViewersFilter('all');
        }
    }, [isOpen, initialGroupIndex, storyGroups.length]);

    const currentGroup = storyGroups[groupIndex];
    const currentSlide = currentGroup?.slides?.[slideIndex];

    // =========================================================================
    // 100% REAL-TIME FIRESTORE SUBSCRIPTION: Live Slide Document (Likes, Views, Polls)
    // =========================================================================
    useEffect(() => {
        if (!isOpen || !currentSlide?.id) return;

        const storyDocRef = doc(db, 'stories', currentSlide.id);
        const unsubStory = onSnapshot(storyDocRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveSlideData({
                    likes: Array.isArray(data.likes) ? data.likes : [],
                    views: Array.isArray(data.views) ? data.views : [],
                    pollVotes: data.pollVotes || {}
                });
            } else {
                // Initialize document in Firestore on first view
                const initLikes = currentSlide.likes || [];
                const initViews = currentUserId ? [currentUserId] : [];
                setLiveSlideData({
                    likes: initLikes,
                    views: initViews,
                    pollVotes: currentSlide.pollVotes || {}
                });
                setDoc(storyDocRef, {
                    id: currentSlide.id,
                    title: currentSlide.title,
                    subtitle: currentSlide.subtitle || '',
                    description: currentSlide.description || '',
                    gradient: currentSlide.gradient || '',
                    authorId: currentGroup.authorId,
                    authorName: currentGroup.authorName,
                    authorRole: currentGroup.authorRole || 'coach',
                    likes: initLikes,
                    views: initViews,
                    pollVotes: currentSlide.pollVotes || {},
                    createdAt: serverTimestamp()
                }, { merge: true }).catch(() => {});
            }
        }, (err) => {
            console.warn("Story snapshot warning:", err);
        });

        // Record real-time view in array and subcollection
        if (currentUserId) {
            setDoc(storyDocRef, {
                views: arrayUnion(currentUserId)
            }, { merge: true }).catch(() => { });

            const viewerDocRef = doc(db, 'stories', currentSlide.id, 'views', currentUserId);
            setDoc(viewerDocRef, {
                uid: currentUserId,
                name: currentUserProfile?.full_name || currentUserProfile?.childName || currentUserProfile?.email || 'Спартанец',
                avatar: currentUserProfile?.photoURL || currentUserProfile?.avatarUrl || '',
                roleBadge: currentUserProfile?.role === 'coach'
                    ? 'Главный тренер'
                    : (currentUserProfile?.role === 'admin' ? 'Администратор' : 'Ученик'),
                viewedAt: serverTimestamp()
            }, { merge: true }).catch(() => {});
        }

        return () => unsubStory();
    }, [isOpen, currentSlide?.id, currentUserId]);

    // =========================================================================
    // 100% REAL-TIME FIRESTORE SUBSCRIPTION: Live Viewers Subcollection
    // =========================================================================
    useEffect(() => {
        if (!isOpen || !currentSlide?.id) return;

        const viewsCollectionRef = collection(db, 'stories', currentSlide.id, 'views');
        const unsubViews = onSnapshot(viewsCollectionRef, (snap) => {
            const list: SpartaStoryViewerItem[] = [];
            const seen = new Set<string>();

            snap.docs.forEach(d => {
                const data = d.data();
                seen.add(data.uid);
                let timeStr = 'Только что';
                if (data.viewedAt?.toDate) {
                    timeStr = format(data.viewedAt.toDate(), 'HH:mm');
                }
                const isLiked = liveSlideData.likes.includes(data.uid) || !!data.hasLiked;
                const vIdx = liveSlideData.pollVotes[data.uid] !== undefined ? liveSlideData.pollVotes[data.uid] : data.pollVote;
                const pollOpt = (vIdx !== undefined && vIdx !== null && currentSlide.poll?.options?.[vIdx])
                    ? currentSlide.poll.options[vIdx]
                    : (data.pollOption || undefined);

                list.push({
                    uid: data.uid,
                    name: data.name || 'Спартанец',
                    avatar: data.avatar || '',
                    roleBadge: data.roleBadge || 'Спартанец',
                    hasLiked: isLiked,
                    pollOption: pollOpt,
                    timeAgo: timeStr
                });
            });

            // If current user viewed but subcollection snapshot hasn't updated yet, prepend current user
            if (currentUserId && !seen.has(currentUserId)) {
                const userVoteIdx = liveSlideData.pollVotes[currentUserId];
                list.unshift({
                    uid: currentUserId,
                    name: currentUserProfile?.full_name || currentUserProfile?.childName || 'Вы (Спартанец)',
                    avatar: currentUserProfile?.photoURL || currentUserProfile?.avatarUrl || '',
                    roleBadge: currentUserProfile?.role === 'coach' ? 'Главный тренер' : 'Ученик',
                    hasLiked: liveSlideData.likes.includes(currentUserId),
                    pollOption: userVoteIdx !== undefined && currentSlide?.poll?.options[userVoteIdx] ? currentSlide.poll.options[userVoteIdx] : undefined,
                    timeAgo: 'Только что'
                });
            }

            setLiveViewers(list);
        }, (err) => {
            console.warn("Views subcollection listener warning:", err);
        });

        return () => unsubViews();
    }, [isOpen, currentSlide?.id, currentUserId, liveSlideData.likes, liveSlideData.pollVotes]);

    // =========================================================================
    // 100% REAL-TIME FIRESTORE SUBSCRIPTION: Live Comments Subcollection
    // =========================================================================
    useEffect(() => {
        if (!isOpen || !currentSlide?.id) return;

        const commentsQuery = query(
            collection(db, 'stories', currentSlide.id, 'comments'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
            const list: SpartaStoryComment[] = [];
            snapshot.docs.forEach(docSnap => {
                const d = docSnap.data();
                list.push({
                    id: docSnap.id,
                    authorId: d.authorId,
                    authorName: d.authorName,
                    authorAvatar: d.authorAvatar,
                    authorRole: d.authorRole,
                    text: d.text,
                    createdAt: d.createdAt?.toDate ? format(d.createdAt.toDate(), 'HH:mm') : 'Недавно'
                });
            });
            if (list.length > 0) {
                setLiveComments(list);
            } else if (currentSlide.comments && currentSlide.comments.length > 0) {
                setLiveComments(currentSlide.comments);
            } else {
                setLiveComments([]);
            }
        }, (err) => {
            console.warn("Comments snapshot error:", err);
        });

        return () => unsubComments();
    }, [isOpen, currentSlide?.id]);

    // Filter viewers by query and active tab
    const filteredViewers = liveViewers.filter(v => {
        if (viewerSearchQuery.trim()) {
            const queryLow = viewerSearchQuery.toLowerCase();
            if (!v.name.toLowerCase().includes(queryLow) && !(v.roleBadge || '').toLowerCase().includes(queryLow)) {
                return false;
            }
        }
        if (viewersFilter === 'liked') return v.hasLiked;
        if (viewersFilter === 'voted') return !!v.pollOption;
        if (viewersFilter === 'mvp') return v.hasLiked && !!v.pollOption;
        return true;
    });

    // Progress bar ticker (pauses when comments/share sheet or user hold is active)
    const effectivePaused = isPaused || isManualPaused || isCommentsOpen || isShareOpen || isAuthorProfileOpen || isViewsSheetOpen || isSaveHighlightOpen || isOptionsMenuOpen;

    useEffect(() => {
        if (!isOpen || effectivePaused || !currentSlide) return;

        const interval = 50; // 50ms ticks
        const step = (interval / SLIDE_DURATION_MS) * 100;

        progressIntervalRef.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNextSlide();
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [isOpen, effectivePaused, groupIndex, slideIndex, currentSlide]);

    const handleNextSlide = () => {
        setProgress(0);
        if (!currentGroup) return;

        if (slideIndex < currentGroup.slides.length - 1) {
            setSlideIndex(prev => prev + 1);
        } else if (groupIndex < storyGroups.length - 1) {
            setGroupIndex(prev => prev + 1);
            setSlideIndex(0);
        } else {
            onClose();
        }
    };

    const handlePrevSlide = () => {
        setProgress(0);
        if (slideIndex > 0) {
            setSlideIndex(prev => prev - 1);
        } else if (groupIndex > 0) {
            setGroupIndex(prev => prev - 1);
            const prevGroup = storyGroups[groupIndex - 1];
            setSlideIndex(prevGroup ? prevGroup.slides.length - 1 : 0);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isAuthorProfileOpen) setIsAuthorProfileOpen(false);
                else if (isViewsSheetOpen) setIsViewsSheetOpen(false);
                else if (isOptionsMenuOpen) setIsOptionsMenuOpen(false);
                else if (isCommentsOpen) setIsCommentsOpen(false);
                else if (isShareOpen) setIsShareOpen(false);
                else onClose();
            }
            if (e.key === 'ArrowRight' && !isCommentsOpen && !isShareOpen && !isAuthorProfileOpen && !isViewsSheetOpen) handleNextSlide();
            if (e.key === 'ArrowLeft' && !isCommentsOpen && !isShareOpen && !isAuthorProfileOpen && !isViewsSheetOpen) handlePrevSlide();
            if (e.key === ' ' && !isCommentsOpen && !isShareOpen && !isAuthorProfileOpen && !isViewsSheetOpen) setIsManualPaused(p => !p);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isCommentsOpen, isShareOpen, isAuthorProfileOpen, isViewsSheetOpen, isOptionsMenuOpen, groupIndex, slideIndex]);

    // =========================================================================
    // REAL-TIME ACTIONS: Likes, Poll Votes, Comments, Reports
    // =========================================================================

    const hasLiked = currentUserId ? liveSlideData.likes.includes(currentUserId) : false;
    const likesCount = liveSlideData.likes.length;

    const handleToggleLike = async () => {
        if (!currentSlide || !currentUserId) return;

        const isCurrentlyLiked = liveSlideData.likes.includes(currentUserId);
        const storyDocRef = doc(db, 'stories', currentSlide.id);

        // Optimistic local update
        setLiveSlideData(prev => ({
            ...prev,
            likes: isCurrentlyLiked
                ? prev.likes.filter(id => id !== currentUserId)
                : [...prev.likes, currentUserId]
        }));

        if (!isCurrentlyLiked) {
            setFloatingReaction('fire');
            setTimeout(() => setFloatingReaction(null), 1200);
        }

        // 100% Real-Time Firestore Sync for Document and Views Subcollection
        try {
            await setDoc(storyDocRef, {
                likes: isCurrentlyLiked ? arrayRemove(currentUserId) : arrayUnion(currentUserId)
            }, { merge: true });

            const viewerDocRef = doc(db, 'stories', currentSlide.id, 'views', currentUserId);
            await setDoc(viewerDocRef, {
                hasLiked: !isCurrentlyLiked,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (err) {
            console.error("Error updating story like in Firestore:", err);
        }
    };

    // Double Tap trigger
    const handleDoubleTapCheck = (isLeft: boolean) => {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 320) {
            // Double Tap detected!
            setDoubleTapHeart(true);
            setTimeout(() => setDoubleTapHeart(false), 900);

            if (!hasLiked) {
                handleToggleLike();
            }
        } else {
            // Single tap: navigate
            if (isLeft) handlePrevSlide();
            else handleNextSlide();
        }
        lastTapTimeRef.current = now;
    };

    // Real-Time Poll Voting
    const userVote = currentUserId ? liveSlideData.pollVotes[currentUserId] : undefined;

    const handleVote = async (optIdx: number) => {
        if (!currentSlide || !currentUserId) return;

        setLiveSlideData(prev => ({
            ...prev,
            pollVotes: {
                ...prev.pollVotes,
                [currentUserId]: optIdx
            }
        }));

        try {
            const storyDocRef = doc(db, 'stories', currentSlide.id);
            await setDoc(storyDocRef, {
                [`pollVotes.${currentUserId}`]: optIdx
            }, { merge: true });

            const viewerDocRef = doc(db, 'stories', currentSlide.id, 'views', currentUserId);
            await setDoc(viewerDocRef, {
                pollVote: optIdx,
                pollOption: currentSlide.poll?.options[optIdx] || '',
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (err) {
            console.error("Error voting on story poll in Firestore:", err);
        }
    };

    // Real-Time Add Comment
    const handleAddComment = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newCommentText.trim() || !currentSlide) return;

        const commentText = newCommentText.trim();
        setNewCommentText('');

        const newComment: SpartaStoryComment = {
            id: 'c_' + Date.now(),
            authorId: currentUserId || 'me',
            authorName: currentUserProfile?.full_name || currentUserProfile?.childName || 'Спартанец',
            authorAvatar: currentUserProfile?.photoURL || currentUserProfile?.avatarUrl,
            authorRole: currentUserProfile?.role || 'Игрок',
            text: commentText,
            createdAt: 'Только что'
        };

        // Optimistic UI
        setLiveComments(prev => [newComment, ...prev]);

        // 100% Real-time Firestore write
        try {
            await addDoc(collection(db, 'stories', currentSlide.id, 'comments'), {
                authorId: currentUserId || 'anon',
                authorName: currentUserProfile?.full_name || currentUserProfile?.childName || 'Спартанец',
                authorAvatar: currentUserProfile?.photoURL || currentUserProfile?.avatarUrl || '',
                authorRole: currentUserProfile?.role || 'Игрок',
                text: commentText,
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error adding story comment to Firestore:", err);
        }
    };

    // Real-Time Report Publication to /reports collection
    const handleReportStory = async () => {
        if (!currentSlide) return;
        try {
            await addDoc(collection(db, 'reports'), {
                targetType: 'story',
                targetId: currentSlide.id,
                storyTitle: currentSlide.title,
                authorId: currentGroup.authorId,
                authorName: currentGroup.authorName,
                reportedBy: currentUserId || 'anon',
                reportedByName: currentUserProfile?.full_name || 'Спартанец',
                reason: 'Неподобающий контент / Нарушение правил сообщества',
                status: 'pending',
                createdAt: serverTimestamp()
            });
            triggerToast('Жалоба отправлена в модерацию');
        } catch (err) {
            console.error("Error reporting story:", err);
            triggerToast('Жалоба принята');
        }
    };

    // Gamification: Reward Viewer with Sparta Coins (for coach/club)
    const handleRewardViewer = (viewerName: string) => {
        triggerToast(`🎉 +10 Sparta Coins начислено для ${viewerName}!`);
    };

    const handleSendReply = () => {
        if (!replyText.trim() || !currentGroup) return;
        onReplyToChat?.(currentGroup.authorId, currentGroup.authorName, replyText, currentSlide?.title);
        setReplyText('');
        setIsSent(true);
        setTimeout(() => setIsSent(false), 2000);
    };

    const handleQuickReaction = (emojiKey: string) => {
        if (!currentGroup || !currentSlide) return;
        setFloatingReaction(emojiKey);
        setTimeout(() => setFloatingReaction(null), 1200);
        onReaction?.(currentGroup.authorId, emojiKey, currentSlide.id);
    };

    const handleCopyLink = () => {
        if (typeof window !== 'undefined') {
            const url = `${window.location.origin}/dashboard?tab=messages&storyGroup=${groupIndex}&slide=${slideIndex}`;
            navigator.clipboard?.writeText(url);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    const handleForwardToChat = (chatId: string) => {
        if (!currentSlide) return;
        onForwardStoryToChat?.(chatId, currentSlide.title);
        setForwardSuccessChat(chatId);
        setTimeout(() => {
            setForwardSuccessChat(null);
            setIsShareOpen(false);
        }, 1200);
    };

    const triggerToast = (msg: string) => {
        setMenuToast(msg);
        setIsOptionsMenuOpen(false);
        setTimeout(() => setMenuToast(null), 2500);
    };

    if (!isOpen || !currentGroup || !currentSlide) return null;

    const isOwner = currentGroup.authorId === currentUserId || currentGroup.authorId === 'club' || currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'developer';
    const isStaff = currentUserProfile?.role === 'coach' || currentUserProfile?.role === 'trainer' || currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'director' || currentUserProfile?.role === 'developer';

    // Calculate poll percentages in real time
    const votedViewersCount = liveViewers.filter(v => !!v.pollOption).length;
    const totalVotes = Math.max(Object.keys(liveSlideData.pollVotes).length, votedViewersCount);
    const voteCounts: Record<number, number> = {};
    if (currentSlide.poll) {
        currentSlide.poll.options.forEach((_, idx) => { voteCounts[idx] = 0; });
        Object.values(liveSlideData.pollVotes).forEach(v => {
            voteCounts[v] = (voteCounts[v] || 0) + 1;
        });
        // If liveViewers has poll answers not in liveSlideData.pollVotes
        liveViewers.forEach(v => {
            if (v.pollOption) {
                const optIdx = currentSlide.poll?.options.indexOf(v.pollOption);
                if (optIdx !== undefined && optIdx >= 0) {
                    voteCounts[optIdx] = (voteCounts[optIdx] || 0) + 1;
                }
            }
        });
    }

    const totalViewsCount = Math.max(liveSlideData.views.length, liveViewers.length, 1);
    const activeInteractionsCount = new Set([
        ...liveSlideData.likes,
        ...Object.keys(liveSlideData.pollVotes),
        ...liveComments.map(c => c.authorId)
    ]).size;
    const engagementRate = Math.min(100, Math.round((activeInteractionsCount / totalViewsCount) * 100)) || 100;
    const likedPercentage = Math.round((likesCount / totalViewsCount) * 100) || 0;

    // Audience composition by role
    const studentsCount = liveViewers.filter(v => (v.roleBadge || '').toLowerCase().includes('ученик') || (v.roleBadge || '').toLowerCase().includes('нападающий') || (v.roleBadge || '').toLowerCase().includes('защитник')).length;
    const coachesCount = liveViewers.filter(v => (v.roleBadge || '').toLowerCase().includes('тренер') || (v.roleBadge || '').toLowerCase().includes('админ')).length;
    const parentsCount = liveViewers.filter(v => (v.roleBadge || '').toLowerCase().includes('родитель')).length;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-2xl select-none">
                {/* Backdrop Click to Close */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* Main Story Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    className="relative z-10 w-full h-full max-w-md max-h-[100dvh] md:max-h-[850px] md:h-[92vh] md:rounded-[36px] overflow-hidden flex flex-col justify-between shadow-2xl border-0 md:border md:border-white/15 bg-black"
                >
                    {/* Media / Background Layer */}
                    <div className="absolute inset-0 z-0">
                        {currentSlide.mediaUrl ? (
                            currentSlide.mediaType === 'video' ? (
                                <video
                                    src={currentSlide.mediaUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={currentSlide.mediaUrl}
                                    alt={currentSlide.title}
                                    className="w-full h-full object-cover"
                                />
                            )
                        ) : (
                            <div
                                className={`w-full h-full ${
                                    currentSlide.gradient ||
                                    'bg-gradient-to-br from-yellow-900/80 via-[#1c140a] to-[#0d0905]'
                                } flex items-center justify-center p-8`}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,184,0,0.15),transparent_70%)]" />
                            </div>
                        )}
                        {/* Dark Vignette Overlay for Readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/90" />
                    </div>

                    {/* Double-Tap Heart Burst Animation */}
                    <AnimatePresence>
                        {doubleTapHeart && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.4 }}
                                animate={{ opacity: 1, scale: 1.4 }}
                                exit={{ opacity: 0, scale: 1.8 }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                className="absolute inset-0 m-auto w-32 h-32 z-40 flex items-center justify-center pointer-events-none drop-shadow-[0_0_35px_rgba(255,60,60,0.8)]"
                            >
                                <Sparta3DReactionIcon emojiKey="fire" size={100} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Touch / Click zones for Previous and Next (with double tap support) */}
                    <div
                        className="absolute inset-y-20 left-0 w-1/3 z-20 cursor-pointer"
                        onClick={() => handleDoubleTapCheck(true)}
                        onPointerDown={() => setIsPaused(true)}
                        onPointerUp={() => setIsPaused(false)}
                    />
                    <div
                        className="absolute inset-y-20 right-0 w-2/3 z-20 cursor-pointer"
                        onClick={() => handleDoubleTapCheck(false)}
                        onPointerDown={() => setIsPaused(true)}
                        onPointerUp={() => setIsPaused(false)}
                    />

                    {/* Top Header Layer: Progress Bars & Author Info */}
                    <div className="relative z-30 p-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-0 flex flex-col gap-3">
                        {/* Segmented Progress Bars */}
                        <div className="flex items-center gap-1.5 w-full">
                            {currentGroup.slides.map((_, idx) => {
                                let width = '0%';
                                if (idx < slideIndex) width = '100%';
                                else if (idx === slideIndex) width = `${progress}%`;

                                return (
                                    <div
                                        key={idx}
                                        className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm"
                                    >
                                        <div
                                            className="h-full bg-sparta-gold transition-all duration-75 rounded-full"
                                            style={{ width }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Author Profile Info & Header Action Controls */}
                        <div className="flex items-center justify-between">
                            {/* Clickable Author Profile Info */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsAuthorProfileOpen(true)}
                                className="flex items-center gap-2.5 p-1 -ml-1 rounded-2xl hover:bg-white/10 transition-all text-left group focus:outline-none"
                            >
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border overflow-hidden shadow-md group-hover:ring-2 group-hover:ring-sparta-gold transition-all ${
                                        currentGroup.authorRole === 'coach'
                                            ? 'border-sparta-gold bg-sparta-gold/20 text-sparta-gold'
                                            : 'border-purple-400 bg-purple-500/20 text-purple-300'
                                    }`}>
                                        {currentGroup.authorAvatar ? (
                                            <img
                                                src={currentGroup.authorAvatar}
                                                alt={currentGroup.authorName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : currentGroup.authorRole === 'coach' ? (
                                            <Crown size={20} />
                                        ) : (
                                            <Users size={20} />
                                        )}
                                    </div>

                                    {/* Mini role star badge */}
                                    {currentGroup.authorRole === 'coach' && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-sparta-gold to-yellow-500 text-black flex items-center justify-center text-[8px] font-black shadow-md">
                                            ★
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-white font-extrabold text-sm tracking-tight drop-shadow-md group-hover:text-sparta-gold transition-colors">
                                            {currentGroup.authorName}
                                        </h4>
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sparta-gold/25 text-sparta-gold border border-sparta-gold/30">
                                            {currentGroup.roleLabel || (currentGroup.authorRole === 'coach' ? 'Тренер' : 'Спарта')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium">
                                        <span>Сегодня • История</span>
                                        {/* Clickable Views Counter */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsViewsSheetOpen(true);
                                            }}
                                            className="flex items-center gap-1 text-white/50 hover:text-sparta-gold transition-colors px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10"
                                            title="Посмотреть статистику просмотров"
                                        >
                                            <Eye size={11} /> {totalViewsCount}
                                        </button>
                                    </div>
                                </div>
                            </motion.button>

                            {/* Top Right Controls: Play/Pause, Share, Options, Close */}
                            <div className="flex items-center gap-1.5">
                                {/* Play / Pause Toggle */}
                                <button
                                    onClick={() => setIsManualPaused(prev => !prev)}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all backdrop-blur-md ${
                                        isManualPaused
                                            ? 'bg-sparta-gold text-black border-sparta-gold shadow-md shadow-sparta-gold/30'
                                            : 'bg-black/40 hover:bg-black/70 text-white/80 hover:text-white border-white/20'
                                    }`}
                                    title={isManualPaused ? "Возобновить" : "Пауза"}
                                >
                                    {isManualPaused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
                                </button>

                                {/* Share Button */}
                                <button
                                    onClick={() => setIsShareOpen(true)}
                                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white border border-white/20 flex items-center justify-center transition-all backdrop-blur-md"
                                    title="Поделиться историей"
                                >
                                    <Share2 size={14} />
                                </button>

                                {/* Options Menu Button (•••) */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsOptionsMenuOpen(prev => !prev)}
                                        className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white border border-white/20 flex items-center justify-center transition-all backdrop-blur-md"
                                        title="Опции"
                                    >
                                        <MoreVertical size={14} />
                                    </button>

                                    {/* Options Popover Dropdown */}
                                    <AnimatePresence>
                                        {isOptionsMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className="absolute right-0 top-10 w-52 bg-[#16161d] border border-white/20 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl"
                                            >
                                                <button
                                                    onClick={() => {
                                                        setIsOptionsMenuOpen(false);
                                                        setIsViewsSheetOpen(true);
                                                    }}
                                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                                >
                                                    <BarChart3 size={14} className="text-emerald-400" />
                                                    <span>Статистика ({totalViewsCount})</span>
                                                </button>

                                                <button
                                                    onClick={() => setIsAuthorProfileOpen(true)}
                                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                                >
                                                    <Users size={14} className="text-sparta-gold" />
                                                    <span>Профиль автора</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setIsOptionsMenuOpen(false);
                                                        setIsSaveHighlightOpen(true);
                                                    }}
                                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                                >
                                                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                                    <span>⭐ В Актуальное</span>
                                                </button>

                                                <button
                                                    onClick={handleCopyLink}
                                                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                                >
                                                    <Copy size={14} className="text-blue-400" />
                                                    <span>Скопировать ссылку</span>
                                                </button>

                                                {currentGroup.roleLabel === 'Актуальное' && (isOwner || isStaff) ? (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const q = query(collection(db, 'highlights'));
                                                                    const snap = await getDocs(q);
                                                                    for (const d of snap.docs) {
                                                                        const data = d.data();
                                                                        if ((data.slides || []).some((s: any) => s.id === currentSlide.id)) {
                                                                            const updated = (data.slides || []).filter((s: any) => s.id !== currentSlide.id);
                                                                            await updateDoc(doc(db, 'highlights', d.id), { slides: updated });
                                                                        }
                                                                    }
                                                                    triggerToast('Удалено из Актуального');
                                                                    onClose();
                                                                } catch (err) {
                                                                    console.error("Error removing from highlight:", err);
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                            <span>Удалить из Актуального</span>
                                                        </button>

                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm("Удалить этот закрепленный альбом?")) return;
                                                                try {
                                                                    const q = query(collection(db, 'highlights'));
                                                                    const snap = await getDocs(q);
                                                                    for (const d of snap.docs) {
                                                                        const data = d.data();
                                                                        if (data.title === currentGroup.authorName || (data.slides || []).some((s: any) => s.id === currentSlide.id)) {
                                                                            await deleteDoc(doc(db, 'highlights', d.id));
                                                                        }
                                                                    }
                                                                    triggerToast('Альбом удален');
                                                                    onClose();
                                                                } catch (err) {
                                                                    console.error("Error deleting highlight album:", err);
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-500 hover:bg-red-500/15 flex items-center gap-2.5 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                            <span>Удалить весь альбом</span>
                                                        </button>
                                                    </>
                                                ) : isOwner ? (
                                                    <button
                                                        onClick={() => {
                                                            onDeleteStory?.(currentSlide.id);
                                                            triggerToast('История удалена');
                                                            onClose();
                                                        }}
                                                        className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Удалить историю</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => triggerToast(`Истории ${currentGroup.authorName} скрыты`)}
                                                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white/70 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                                                        >
                                                            <EyeOff size={14} />
                                                            <span>Скрыть истории</span>
                                                        </button>
                                                        <button
                                                            onClick={handleReportStory}
                                                            className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                                                        >
                                                            <AlertTriangle size={14} />
                                                            <span>Пожаловаться</span>
                                                        </button>
                                                    </>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white border border-white/20 flex items-center justify-center transition-all backdrop-blur-md"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Toast */}
                    <AnimatePresence>
                        {menuToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-sparta-gold text-black text-xs font-black shadow-2xl flex items-center gap-2"
                            >
                                <Check size={14} /> {menuToast}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Center Content: Story Title, Description & Interactive Poll */}
                    <div className="relative z-30 px-6 my-auto text-center flex flex-col items-center gap-4 pointer-events-none">
                        <motion.div
                            key={currentSlide.id}
                            initial={{ opacity: 0, y: 15, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center gap-2 max-w-sm"
                        >
                            {/* Sports Sticker Badge */}
                            {currentSlide.stickerBadge && (
                                <motion.div
                                    initial={{ scale: 0.8, rotate: -3 }}
                                    animate={{ scale: currentSlide.stickerScale || 1, rotate: 0 }}
                                    style={currentSlide.stickerPosition ? {
                                        transform: `translate(${currentSlide.stickerPosition.x}px, ${currentSlide.stickerPosition.y}px)`
                                    } : undefined}
                                    className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-sparta-gold via-yellow-400 to-amber-500 text-black font-russo text-xs uppercase tracking-wider shadow-lg shadow-sparta-gold/30 border border-yellow-200/50 mb-1"
                                >
                                    {currentSlide.stickerBadge}
                                </motion.div>
                            )}

                            {/* Match Scoreboard Widget */}
                            {currentSlide.matchScore && (
                                <div
                                    style={currentSlide.scorePosition ? {
                                        transform: `translate(${currentSlide.scorePosition.x}px, ${currentSlide.scorePosition.y}px) scale(${currentSlide.scoreScale || 1})`
                                    } : undefined}
                                    className="w-full bg-black/75 backdrop-blur-md border border-sparta-gold/50 rounded-2xl p-3 my-2 shadow-[0_0_20px_rgba(255,184,0,0.25)] flex items-center justify-around"
                                >
                                    <div className="flex-1 text-center">
                                        <p className="text-[11px] font-bold text-white/90 truncate">{currentSlide.matchScore.team1}</p>
                                    </div>
                                    <div className="px-3 py-1 bg-sparta-gold/20 rounded-xl border border-sparta-gold/40 text-sparta-gold font-russo text-base font-black">
                                        {currentSlide.matchScore.score1} : {currentSlide.matchScore.score2}
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-[11px] font-bold text-white/90 truncate">{currentSlide.matchScore.team2}</p>
                                    </div>
                                </div>
                            )}

                            {currentSlide.subtitle && (
                                <span className="px-3 py-1 rounded-full bg-sparta-gold/20 border border-sparta-gold/40 text-sparta-gold text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                    {currentSlide.subtitle}
                                </span>
                            )}

                            {/* Main Title with Custom Style & Color & Position */}
                            <div
                                style={{
                                    transform: currentSlide.textPosition ? `translate(${currentSlide.textPosition.x}px, ${currentSlide.textPosition.y}px)` : undefined,
                                    textAlign: currentSlide.textAlign || 'center'
                                }}
                                className={`w-full ${
                                    currentSlide.textStyle === 'banner'
                                        ? 'bg-black/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl'
                                        : currentSlide.textStyle === 'neon'
                                        ? 'drop-shadow-[0_0_20px_rgba(255,184,0,0.8)]'
                                        : 'drop-shadow-lg'
                                }`}
                            >
                                <h2
                                    style={{
                                        color: currentSlide.textColor || '#FFFFFF',
                                        fontSize: currentSlide.textSize ? `${currentSlide.textSize}px` : undefined
                                    }}
                                    className="text-2xl sm:text-3xl font-russo uppercase leading-tight"
                                >
                                    {currentSlide.title}
                                </h2>
                                {currentSlide.description && (
                                    <p className="text-white/85 text-xs sm:text-sm font-medium leading-relaxed mt-1 whitespace-pre-line">
                                        {currentSlide.description}
                                    </p>
                                )}
                            </div>

                            {/* Sparta Club Crest Watermark */}
                            {currentSlide.showClubCrest && (
                                <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-sparta-gold/30 text-sparta-gold backdrop-blur-md">
                                    <Shield size={12} className="fill-sparta-gold text-sparta-gold" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">SPARTA SPORT CLUB</span>
                                </div>
                            )}

                            {/* Real-Time Interactive Poll / Quiz with Live Percentages */}
                            {currentSlide.poll && (
                                <div className="w-full mt-3 bg-black/60 backdrop-blur-xl border border-white/20 rounded-2xl p-4 pointer-events-auto shadow-2xl">
                                    <p className="text-white font-bold text-xs mb-3 text-left flex items-center justify-between">
                                        <span>📊 {currentSlide.poll.question}</span>
                                        {totalVotes > 0 && (
                                            <span className="text-[10px] text-sparta-gold font-black">
                                                {totalVotes} {totalVotes === 1 ? 'голос' : 'голосов'}
                                            </span>
                                        )}
                                    </p>
                                    <div className="space-y-2">
                                        {currentSlide.poll.options.map((opt, optIdx) => {
                                            const isSelected = userVote === optIdx;
                                            const count = voteCounts[optIdx] || 0;
                                            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                                            return (
                                                <button
                                                    key={optIdx}
                                                    onClick={() => handleVote(optIdx)}
                                                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between border relative overflow-hidden ${
                                                        isSelected
                                                            ? 'bg-sparta-gold/20 text-sparta-gold border-sparta-gold shadow-lg shadow-sparta-gold/30'
                                                            : 'bg-white/10 text-white/90 border-white/15 hover:bg-white/20'
                                                    }`}
                                                >
                                                    {/* Percentage Fill Bar */}
                                                    {userVote !== undefined && totalVotes > 0 && (
                                                        <div
                                                            className="absolute inset-y-0 left-0 bg-sparta-gold/25 transition-all duration-500 rounded-xl"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    )}

                                                    <span className="relative z-10">{opt}</span>
                                                    <div className="relative z-10 flex items-center gap-1.5">
                                                        {userVote !== undefined && (
                                                            <span className="text-[11px] font-black">{percent}%</span>
                                                        )}
                                                        {isSelected && <CheckCircle2 size={15} className="text-sparta-gold" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Floating Reaction Animation */}
                    <AnimatePresence>
                        {floatingReaction && (
                            <motion.div
                                initial={{ opacity: 1, y: 0, scale: 0.6 }}
                                animate={{ opacity: 0, y: -180, scale: 1.8 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.9, ease: 'easeOut' }}
                                className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                            >
                                <Sparta3DReactionIcon emojiKey={floatingReaction} size={64} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom Action Footer: Likes, Comments, 3D Reactions & Direct Reply */}
                    <div className="relative z-30 p-3 sm:p-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2.5 sm:gap-3">
                        {/* Interactive Bar: 3D Reactions + Like Counter + Comments Button */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-0.5 sm:px-1">
                            {/* 3D Quick Reactions */}
                            <div className="flex items-center gap-1 sm:gap-1.5">
                                {['fire', 'soccer', 'trophy', 'love', 'laugh'].map(key => (
                                    <motion.button
                                        key={key}
                                        whileHover={{ scale: 1.25 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleQuickReaction(key)}
                                        className="p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-colors shadow-lg cursor-pointer"
                                    >
                                        <Sparta3DReactionIcon emojiKey={key} size={18} className="sm:w-[22px] sm:h-[22px]" />
                                    </motion.button>
                                ))}
                            </div>

                            {/* Real-Time Likes & Comments Counters */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {/* Like Counter Button */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleToggleLike}
                                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl border flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-black transition-all backdrop-blur-md cursor-pointer ${
                                        hasLiked
                                            ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-md shadow-red-500/20 ring-1 ring-red-500/40'
                                            : 'bg-white/10 hover:bg-white/20 border-white/15 text-white/80'
                                    }`}
                                >
                                    <Flame size={14} className={hasLiked ? 'text-orange-400 fill-orange-400 animate-pulse' : 'text-white/60'} />
                                    <span>{likesCount}</span>
                                </motion.button>

                                {/* Comments Drawer Trigger with Real-Time Count */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsCommentsOpen(true)}
                                    className="px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-black backdrop-blur-md transition-all cursor-pointer"
                                >
                                    <MessageCircle size={14} className="text-sparta-gold" />
                                    <span>{liveComments.length}</span>
                                </motion.button>
                            </div>
                        </div>

                        {/* Reply input field */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSendReply();
                                }}
                                placeholder={`Ответить ${currentGroup.authorName}...`}
                                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-sparta-gold focus:ring-1 focus:ring-sparta-gold/50 backdrop-blur-md transition-all font-medium"
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSendReply}
                                disabled={!replyText.trim()}
                                className={`p-2.5 rounded-2xl transition-all font-bold shadow-md flex items-center justify-center ${
                                    replyText.trim()
                                        ? 'bg-sparta-gold text-black shadow-sparta-gold/20'
                                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                            >
                                <Send size={16} />
                            </motion.button>
                        </div>

                        {/* Sent Notification */}
                        <AnimatePresence>
                            {isSent && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="text-center text-[10px] font-bold text-sparta-gold"
                                >
                                    ✓ Сообщение отправлено в чат
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ========================================================================= */}
                    {/* SPARTA INSIGHTS PRO: 3D VIEWERS & ANALYTICS BOTTOM SHEET DRAWER           */}
                    {/* ========================================================================= */}
                    <AnimatePresence>
                        {isViewsSheetOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 h-[84%] bg-[#101016]/98 backdrop-blur-3xl border-t border-white/20 rounded-t-[36px] flex flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
                            >
                                {/* Sheet Header with Mini Story Preview */}
                                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        {/* Mini Thumbnail */}
                                        <div className={`w-10 h-10 rounded-xl overflow-hidden border border-sparta-gold/40 flex items-center justify-center shrink-0 ${
                                            currentSlide.gradient || 'bg-gradient-to-br from-yellow-700 to-black'
                                        }`}>
                                            {currentSlide.mediaUrl ? (
                                                <img src={currentSlide.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                            ) : (
                                                <Sparta3DReactionIcon emojiKey="trophy" size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-russo text-white uppercase tracking-tight">
                                                    Sparta Insights Pro
                                                </h4>
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                    Live
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                                                <Clock size={11} className="text-sparta-gold" />
                                                <span>Активна 24 ч • Опубликовано сегодня</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsViewsSheetOpen(false)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Top 4 3D Glassmorphism KPI Summary Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3.5">
                                    {/* Views & Reach Card */}
                                    <div className="bg-gradient-to-b from-white/10 to-white/5 border border-sparta-gold/30 rounded-2xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                                        <div className="flex items-center justify-between">
                                            <Sparta3DReactionIcon emojiKey="eye" size={26} />
                                            <span className="text-[9px] font-black uppercase text-sparta-gold bg-sparta-gold/20 px-1.5 py-0.5 rounded-full">
                                                {engagementRate}% Вовлеч.
                                            </span>
                                        </div>
                                        <div className="mt-2 text-left">
                                            <span className="text-xl font-russo text-white">{totalViewsCount}</span>
                                            <span className="text-[10px] text-white/50 block font-medium">Просмотров</span>
                                        </div>
                                    </div>

                                    {/* Likes & Fire Reactions Card */}
                                    <div className="bg-gradient-to-b from-white/10 to-white/5 border border-orange-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <Sparta3DReactionIcon emojiKey="fire" size={26} />
                                            <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded-full">
                                                {likedPercentage}%
                                            </span>
                                        </div>
                                        <div className="mt-2 text-left">
                                            <span className="text-xl font-russo text-orange-400">{likesCount}</span>
                                            <span className="text-[10px] text-white/50 block font-medium">Лайков (Огонь)</span>
                                        </div>
                                    </div>

                                    {/* Comments Card */}
                                    <div className="bg-gradient-to-b from-white/10 to-white/5 border border-blue-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <Sparta3DReactionIcon emojiKey="sparkles" size={26} />
                                            <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded-full">
                                                Чат
                                            </span>
                                        </div>
                                        <div className="mt-2 text-left">
                                            <span className="text-xl font-russo text-blue-300">{liveComments.length}</span>
                                            <span className="text-[10px] text-white/50 block font-medium">Комментариев</span>
                                        </div>
                                    </div>

                                    {/* Poll Card */}
                                    <div className="bg-gradient-to-b from-white/10 to-white/5 border border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <Sparta3DReactionIcon emojiKey="chart" size={26} />
                                            <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-full">
                                                Опрос
                                            </span>
                                        </div>
                                        <div className="mt-2 text-left">
                                            <span className="text-xl font-russo text-purple-300">{totalVotes}</span>
                                            <span className="text-[10px] text-white/50 block font-medium">Голосов</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Audience Breakdown Banner */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 mb-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <Users size={15} className="text-sparta-gold" />
                                        <span className="text-white/80 font-bold text-[11px]">Аудитория:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded-lg">
                                            🎓 Ученики: {studentsCount || 1}
                                        </span>
                                        <span className="text-[10px] font-bold text-sparta-gold bg-sparta-gold/15 px-2 py-0.5 rounded-lg">
                                            👑 Тренеры: {coachesCount || 1}
                                        </span>
                                        {parentsCount > 0 && (
                                            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-lg">
                                                👨‍👩‍👧 Родители: {parentsCount}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative mb-2.5">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                                    <input
                                        type="text"
                                        value={viewerSearchQuery}
                                        onChange={(e) => setViewerSearchQuery(e.target.value)}
                                        placeholder="Поиск зрителя по имени или роли..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-sparta-gold transition-colors"
                                    />
                                    {viewerSearchQuery && (
                                        <button
                                            onClick={() => setViewerSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Filter Tabs with 3D Badges */}
                                <div className="flex gap-1.5 pb-2.5 border-b border-white/10 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setViewersFilter('all')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            viewersFilter === 'all'
                                                ? 'bg-sparta-gold text-black shadow-md'
                                                : 'bg-white/5 text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <span>Все ({liveViewers.length})</span>
                                    </button>
                                    <button
                                        onClick={() => setViewersFilter('liked')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            viewersFilter === 'liked'
                                                ? 'bg-orange-500 text-white shadow-md'
                                                : 'bg-white/5 text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <Sparta3DReactionIcon emojiKey="fire" size={14} />
                                        <span>Лайк ({likesCount})</span>
                                    </button>
                                    <button
                                        onClick={() => setViewersFilter('voted')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            viewersFilter === 'voted'
                                                ? 'bg-purple-500 text-white shadow-md'
                                                : 'bg-white/5 text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <Sparta3DReactionIcon emojiKey="chart" size={14} />
                                        <span>Опрос ({totalVotes})</span>
                                    </button>
                                    <button
                                        onClick={() => setViewersFilter('mvp')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            viewersFilter === 'mvp'
                                                ? 'bg-yellow-400 text-black shadow-md font-black'
                                                : 'bg-white/5 text-yellow-400/70 hover:text-yellow-300'
                                        }`}
                                    >
                                        <Sparta3DReactionIcon emojiKey="crown" size={14} />
                                        <span>MVP</span>
                                    </button>
                                </div>

                                {/* Real-Time Viewers List */}
                                <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1 py-3">
                                    {filteredViewers.length === 0 ? (
                                        <div className="text-center py-10 text-white/30 text-xs">
                                            {viewerSearchQuery
                                                ? 'Зрители с таким именем не найдены'
                                                : viewersFilter === 'liked'
                                                    ? 'Пока никто не поставил лайк'
                                                    : (viewersFilter === 'voted' ? 'Пока никто не голосовал в опросе' : 'Список зрителей обновляется в реальном времени...')}
                                        </div>
                                    ) : (
                                        filteredViewers.map(v => {
                                            const isMvp = v.hasLiked && !!v.pollOption;

                                            return (
                                                <div
                                                    key={v.uid}
                                                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                                        isMvp
                                                            ? 'bg-gradient-to-r from-yellow-500/10 via-white/5 to-transparent border-yellow-500/40 shadow-[0_0_15px_rgba(255,215,0,0.15)]'
                                                            : 'bg-white/5 hover:bg-white/[0.08] border-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {/* 3D Avatar Frame */}
                                                        <div className="relative shrink-0">
                                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs overflow-hidden border ${
                                                                isMvp
                                                                    ? 'border-yellow-400 shadow-md shadow-yellow-400/30 bg-yellow-400/20 text-yellow-400'
                                                                    : 'border-sparta-gold/30 bg-sparta-gold/20 text-sparta-gold'
                                                            }`}>
                                                                {v.avatar ? (
                                                                    <img src={v.avatar} alt={v.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    v.name.charAt(0)
                                                                )}
                                                            </div>
                                                            {isMvp && (
                                                                <div className="absolute -top-1.5 -right-1.5 drop-shadow-md">
                                                                    <Sparta3DReactionIcon emojiKey="crown" size={16} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Details */}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-xs font-bold text-white truncate max-w-[150px]">{v.name}</span>
                                                                {isMvp && (
                                                                    <span className="text-[9px] font-black uppercase text-yellow-300 bg-yellow-500/25 px-1.5 py-0.2 rounded border border-yellow-500/40 flex items-center gap-1 shadow-sm">
                                                                        👑 MVP
                                                                    </span>
                                                                )}
                                                                {v.hasLiked && !isMvp && (
                                                                    <span className="text-[10px] font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.2 rounded border border-orange-500/30 flex items-center gap-0.5">
                                                                        <Flame size={10} className="fill-orange-400" /> Лайк
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                                                                <span className="text-sparta-gold/80">{v.roleBadge || 'Спартанец'}</span>
                                                                <span>•</span>
                                                                <span>{v.timeAgo}</span>
                                                            </div>
                                                            {v.pollOption && (
                                                                <div className="mt-1 text-[10px] text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/20 inline-block">
                                                                    Выбрал: {v.pollOption}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions: Gamification Reward & Direct Chat */}
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {isStaff && v.uid !== currentUserId && (
                                                            <button
                                                                onClick={() => handleRewardViewer(v.name)}
                                                                className="px-2 py-1.5 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 text-[10px] font-black flex items-center gap-1 transition-all"
                                                                title="Начислить 10 Sparta Coins за активность"
                                                            >
                                                                <SpartaCoinIcon size={14} animate />
                                                                <span>+10</span>
                                                            </button>
                                                        )}

                                                        {v.uid !== currentUserId && (
                                                            <button
                                                                onClick={() => {
                                                                    setIsViewsSheetOpen(false);
                                                                    onClose();
                                                                    onReplyToChat?.(v.uid, v.name, 'Привет!');
                                                                }}
                                                                className="p-2 rounded-xl bg-white/10 hover:bg-sparta-gold hover:text-black text-white/70 transition-all"
                                                                title="Написать сообщение"
                                                            >
                                                                <Send size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ========================================================================= */}
                    {/* AUTHOR MINI PROFILE CARD DRAWER                                           */}
                    {/* ========================================================================= */}
                    <AnimatePresence>
                        {isAuthorProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#121218]/98 backdrop-blur-2xl border-t border-white/20 rounded-t-[36px] flex flex-col p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
                            >
                                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Shield size={18} className="text-sparta-gold" />
                                        <h4 className="text-sm font-russo text-white uppercase tracking-tight">
                                            Профиль автора
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => setIsAuthorProfileOpen(false)}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="py-5 flex flex-col items-center text-center">
                                    {/* Large Avatar */}
                                    <div className="relative mb-3">
                                        <div className={`w-20 h-20 rounded-3xl p-1 border-2 ${
                                            currentGroup.authorRole === 'coach'
                                                ? 'border-sparta-gold shadow-[0_0_20px_rgba(255,184,0,0.35)]'
                                                : 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                                        }`}>
                                            <div className="w-full h-full rounded-[20px] bg-[#1a1a24] flex items-center justify-center overflow-hidden">
                                                {currentGroup.authorAvatar ? (
                                                    <img src={currentGroup.authorAvatar} alt={currentGroup.authorName} className="w-full h-full object-cover" />
                                                ) : currentGroup.authorRole === 'coach' ? (
                                                    <Crown size={32} className="text-sparta-gold" />
                                                ) : (
                                                    <Users size={32} className="text-purple-300" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Author Details */}
                                    <h3 className="text-lg font-russo text-white uppercase">
                                        {currentGroup.authorName}
                                    </h3>
                                    <span className="mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30">
                                        {currentGroup.roleLabel || (currentGroup.authorRole === 'coach' ? 'Главный тренер' : 'Спартанец')}
                                    </span>

                                    {/* Bio Cards */}
                                    <div className="w-full mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs">
                                        {currentGroup.authorRole === 'coach' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Award size={14} className="text-sparta-gold shrink-0" />
                                                    <span>Лицензия UEFA B • Стаж 8 лет</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Calendar size={14} className="text-sparta-gold shrink-0" />
                                                    <span>Группы 2018-2020, Индивидуальные сборы</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <MapPin size={14} className="text-sparta-gold shrink-0" />
                                                    <span>Центральный манеж Sparta</span>
                                                </div>
                                            </>
                                        ) : currentGroup.authorRole === 'club' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Shield size={14} className="text-sparta-gold shrink-0" />
                                                    <span>Официальный канал детской футбольной школы Sparta</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Phone size={14} className="text-sparta-gold shrink-0" />
                                                    <span>Администратор: +7 (999) 123-45-67</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Trophy size={14} className="text-sparta-gold shrink-0" />
                                                    <span>Ученик школы Sparta • Нападающий №10</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/80">
                                                    <Award size={14} className="text-sparta-gold shrink-0" />
                                                    <span>4 кубка турниров • 350 Sparta Coins</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="w-full mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                setIsAuthorProfileOpen(false);
                                                onClose();
                                                onReplyToChat?.(currentGroup.authorId, currentGroup.authorName, 'Привет!');
                                            }}
                                            className="py-3 px-4 rounded-2xl bg-sparta-gold text-black font-russo uppercase text-xs shadow-lg shadow-sparta-gold/20 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                                        >
                                            <MessageCircle size={15} />
                                            <span>Написать в чат</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsAuthorProfileOpen(false);
                                                triggerToast('Заявка отправлена');
                                            }}
                                            className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-russo uppercase text-xs flex items-center justify-center gap-2 transition-all"
                                        >
                                            <UserCheck size={15} className="text-sparta-gold" />
                                            <span>{currentGroup.authorRole === 'coach' ? 'Записаться' : 'В друзья'}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ========================================================================= */}
                    {/* COMMENTS BOTTOM SHEET DRAWER («Стена поддержки / Комментарии»)           */}
                    {/* ========================================================================= */}
                    <AnimatePresence>
                        {isCommentsOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 h-[70%] bg-[#121217]/95 backdrop-blur-2xl border-t border-white/20 rounded-t-[32px] flex flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
                            >
                                {/* Sheet Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={18} className="text-sparta-gold" />
                                        <h4 className="text-sm font-russo text-white uppercase tracking-tight">
                                            Комментарии и поддержка ({liveComments.length})
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => setIsCommentsOpen(false)}
                                        aria-label="Закрыть"
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Quick Comment Stickers */}
                                <div className="flex gap-1.5 py-3 overflow-x-auto no-scrollbar">
                                    {['🔥 Красавцы!', '⚽ Только вперед!', '🏆 Лучшие!', '👏 Так держать!'].map(sticker => (
                                        <button
                                            key={sticker}
                                            onClick={() => {
                                                setNewCommentText(sticker);
                                            }}
                                            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-bold text-white/80 shrink-0 transition-colors cursor-pointer"
                                        >
                                            {sticker}
                                        </button>
                                    ))}
                                </div>

                                {/* Real-Time Comments List */}
                                <div className="flex-1 overflow-y-auto py-2 space-y-3 custom-scrollbar">
                                    {liveComments.length > 0 ? (
                                        liveComments.map(c => (
                                            <div key={c.id} className="flex items-start gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden">
                                                    {c.authorAvatar ? (
                                                        <img src={c.authorAvatar} alt={c.authorName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        c.authorName.charAt(0)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-white">{c.authorName}</span>
                                                        <span className="text-[9px] text-white/40">{c.createdAt}</span>
                                                    </div>
                                                    <p className="text-xs text-white/80 mt-0.5 font-medium leading-snug break-words">
                                                        {c.text}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-white/40 text-xs">
                                            Пока нет комментариев. Будьте первым!
                                        </div>
                                    )}
                                </div>

                                {/* Real-Time Add Comment Form */}
                                <form onSubmit={handleAddComment} className="pt-3 border-t border-white/10 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        placeholder="Написать комментарий..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-sparta-gold transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newCommentText.trim()}
                                        className="px-4 py-2.5 rounded-2xl bg-sparta-gold text-black font-russo uppercase text-xs disabled:opacity-30 transition-all shadow-md cursor-pointer"
                                    >
                                        <Send size={14} />
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ========================================================================= */}
                    {/* SHARE MODAL / DRAWER (Поделиться в чаты / WhatsApp / Ссылка)              */}
                    {/* ========================================================================= */}
                    <AnimatePresence>
                        {isShareOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#121217]/95 backdrop-blur-2xl border-t border-white/20 rounded-t-[32px] flex flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl"
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Share2 size={18} className="text-sparta-gold" />
                                        <h4 className="text-sm font-russo text-white uppercase tracking-tight">
                                            Поделиться историей
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => setIsShareOpen(false)}
                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="py-4 space-y-3">
                                    {/* Copy Link Button */}
                                    <button
                                        onClick={handleCopyLink}
                                        className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-xs font-bold text-white transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center">
                                                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                                            </div>
                                            <span>{copiedLink ? '✓ Ссылка скопирована!' : 'Скопировать ссылку на историю'}</span>
                                        </div>
                                        <ExternalLink size={14} className="text-white/40" />
                                    </button>

                                    {/* Forward to Team Chats */}
                                    {chats.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">
                                                Переслать в чаты Спарты:
                                            </p>
                                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                                                {chats.slice(0, 5).map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => handleForwardToChat(c.id)}
                                                        className="w-full p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between text-xs font-medium text-white/80 transition-all text-left"
                                                    >
                                                        <span className="truncate">{c.name || 'Командный чат'}</span>
                                                        {forwardSuccessChat === c.id ? (
                                                            <span className="text-[10px] text-sparta-gold font-bold">✓ Отправлено</span>
                                                        ) : (
                                                            <Send size={12} className="text-white/30" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Save to Highlights Modal */}
                    <SpartaHighlightsModal
                        isOpen={isSaveHighlightOpen}
                        onClose={() => setIsSaveHighlightOpen(false)}
                        user={{ uid: currentUserId }}
                        userProfile={currentUserProfile}
                        initialStoryToSave={currentSlide}
                        availableStories={currentGroup?.slides || []}
                    />
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
