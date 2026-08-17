import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Star, Shield, Dumbbell, BadgeCheck, Code, Send, Trash2, MessageSquare, Loader2, Pin, Heart, Edit2, Check, Reply, Sparkles, ThumbsUp, ChevronDown, ChevronUp, Mic, Square } from 'lucide-react';
import { Review, ReviewReply } from '../types/shop';
import VideoPlayer from './VideoPlayer';
import VoiceReviewPlayer from './VoiceReviewPlayer';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { uploadReviewMedia } from '../utils/supabaseStorage';

interface ReviewMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    review: Review | null;
    initialMediaUrl?: string;
}

const QUICK_REPLIES = [
    '⚽ Красавчик!',
    '🔥 Супер форма!',
    '👏 Гордимся!',
    '👕 Село отлично!',
    '❓ Какой размер брали?',
    '👍 Спасибо за совет!'
];

const getRepliesPlural = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} ответов`;
    if (mod10 === 1) return `${count} ответ`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} ответа`;
    return `${count} ответов`;
};

const ReviewMediaModal: React.FC<ReviewMediaModalProps> = ({ isOpen, onClose, review, initialMediaUrl }) => {
    const { user, userProfile } = useAuth();
    const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(initialMediaUrl || null);
    const [localReview, setLocalReview] = useState<Review | null>(review);
    const [localReplies, setLocalReplies] = useState<ReviewReply[]>(review?.replies || []);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [replyingTarget, setReplyingTarget] = useState<{ id: string; userName: string; comment: string; userId: string } | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
    const commentInputRef = useRef<HTMLInputElement>(null);

    // Voice Reply State in Modal
    const [isRecordingReplyAudio, setIsRecordingReplyAudio] = useState(false);
    const [replyRecordingSeconds, setReplyRecordingSeconds] = useState(0);
    const [replyRecordedAudioBlob, setReplyRecordedAudioBlob] = useState<Blob | null>(null);
    const [replyRecordedAudioUrl, setReplyRecordedAudioUrl] = useState<string | null>(null);
    const replyMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const replyAudioChunksRef = useRef<Blob[]>([]);
    const replyRecordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'director' || userProfile?.role === 'trainer' || userProfile?.role === 'coach' || userProfile?.role === 'developer' || userProfile?.isAdmin || userProfile?.isStaff;

    // Immediate prop sync when review, initialMediaUrl or isOpen changes
    useEffect(() => {
        if (review) {
            setLocalReview(review);
            setLocalReplies(review.replies || []);
            const targetUrl = initialMediaUrl || review.video || (review.photos && review.photos[0]) || null;
            setCurrentMediaUrl(targetUrl);
        } else {
            setLocalReview(null);
            setLocalReplies([]);
            setCurrentMediaUrl(null);
        }
    }, [review, initialMediaUrl, isOpen]);

    // Sync current review and replies in real time from Firestore
    useEffect(() => {
        if (!review?.id) return;
        const unsubscribe = onSnapshot(doc(db, 'reviews', review.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Review;
                setLocalReview(data);
                setLocalReplies(data.replies || []);
            }
        });
        return () => unsubscribe();
    }, [review?.id]);

    if (!localReview) return null;

    // Combine all media into one list for navigation
    const allMedia = [
        ...(localReview.video ? [{ type: 'video', url: localReview.video }] : []),
        ...(localReview.photos?.map(url => ({ type: 'image', url })) || [])
    ];

    const foundIndex = allMedia.findIndex(m => m.url === (currentMediaUrl || initialMediaUrl));
    const activeIndex = foundIndex >= 0 ? foundIndex : 0;
    const currentMedia = allMedia[activeIndex] || (allMedia.length > 0 ? allMedia[0] : null);

    const handleNext = () => {
        if (!allMedia.length) return;
        const nextIndex = (activeIndex + 1) % allMedia.length;
        setCurrentMediaUrl(allMedia[nextIndex].url);
    };

    const handlePrev = () => {
        if (!allMedia.length) return;
        const prevIndex = (activeIndex - 1 + allMedia.length) % allMedia.length;
        setCurrentMediaUrl(allMedia[prevIndex].url);
    };

    const startReplyAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            replyAudioChunksRef.current = [];

            let mimeType = 'audio/webm;codecs=opus';
            if (typeof MediaRecorder !== 'undefined') {
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
                    else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                    else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
                    else mimeType = '';
                }
            }

            const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            replyMediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    replyAudioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(replyAudioChunksRef.current, { type: mimeType || 'audio/webm' });
                setReplyRecordedAudioBlob(blob);
                setReplyRecordedAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
                if (replyRecordingTimerRef.current) clearInterval(replyRecordingTimerRef.current);
                setIsRecordingReplyAudio(false);
            };

            mediaRecorder.start(250);
            setIsRecordingReplyAudio(true);
            setReplyRecordingSeconds(0);

            replyRecordingTimerRef.current = setInterval(() => {
                setReplyRecordingSeconds(prev => {
                    if (prev >= 60) {
                        stopReplyAudioRecording();
                        return 60;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Не удалось получить доступ к микрофону");
        }
    };

    const stopReplyAudioRecording = () => {
        if (replyMediaRecorderRef.current && replyMediaRecorderRef.current.state === 'recording') {
            replyMediaRecorderRef.current.stop();
        }
        if (replyRecordingTimerRef.current) clearInterval(replyRecordingTimerRef.current);
        setIsRecordingReplyAudio(false);
    };

    const cancelReplyAudioRecording = () => {
        if (replyMediaRecorderRef.current) {
            replyMediaRecorderRef.current.ondataavailable = null;
            replyMediaRecorderRef.current.onstop = null;
            if (replyMediaRecorderRef.current.state === 'recording') {
                replyMediaRecorderRef.current.stop();
            }
            if (replyMediaRecorderRef.current.stream) {
                replyMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
        if (replyRecordingTimerRef.current) clearInterval(replyRecordingTimerRef.current);
        setIsRecordingReplyAudio(false);
        setReplyRecordingSeconds(0);
        replyAudioChunksRef.current = [];
    };

    const deleteReplyRecordedAudio = () => {
        setReplyRecordedAudioBlob(null);
        setReplyRecordedAudioUrl(null);
        setReplyRecordingSeconds(0);
    };

    const handleSelectReplyTarget = (reply: ReviewReply) => {
        // Reset any active editing state so reply and edit never conflict
        setEditingReplyId(null);
        setEditingCommentText('');

        // Attach to the root thread ID so nested answers stay organized in the same thread
        const rootThreadId = reply.replyToCommentId || reply.id;
        setReplyingTarget({
            id: rootThreadId,
            userName: reply.userName,
            comment: reply.comment,
            userId: reply.userId
        });

        // Automatically expand that thread so user sees the discussion open
        setExpandedThreads(prev => ({
            ...prev,
            [rootThreadId]: true
        }));

        setTimeout(() => {
            commentInputRef.current?.focus();
        }, 50);
    };

    const handleCancelReplyTarget = () => {
        setReplyingTarget(null);
    };

    const handleQuickChip = (chipText: string) => {
        setNewComment(prev => prev ? `${prev} ${chipText}` : chipText);
        setTimeout(() => {
            commentInputRef.current?.focus();
        }, 50);
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert('Пожалуйста, войдите в систему, чтобы оставить комментарий.');
            return;
        }
        if ((!newComment.trim() && !replyRecordedAudioBlob) || isSubmitting) return;

        setIsSubmitting(true);
        try {
            let authorName = user.displayName || user.email?.split('@')[0] || 'Пользователь';
            let authorAvatar = user.photoURL || '';
            let role = userProfile?.role || 'user';

            if (userProfile?.firstName && userProfile?.lastName) {
                authorName = `${userProfile.firstName} ${userProfile.lastName}`;
            }
            if (userProfile?.photoURL) {
                authorAvatar = userProfile.photoURL;
            }

            let finalAudioUrl = '';
            if (replyRecordedAudioBlob) {
                finalAudioUrl = await uploadReviewMedia(replyRecordedAudioBlob, 'reviews/modal-replies-voices', 'audio/webm');
            }

            const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const replyObj: ReviewReply = {
                id: uniqueId,
                userId: user.uid,
                userName: authorName,
                userAvatar: authorAvatar,
                comment: newComment.trim(),
                audio: finalAudioUrl,
                createdAt: new Date().toISOString(),
                userRole: role,
                userVerification: userProfile?.verification || false,
                ...(replyingTarget ? {
                    replyToUser: replyingTarget.userName,
                    replyToText: replyingTarget.comment,
                    replyToCommentId: replyingTarget.id
                } : {})
            };

            await updateDoc(doc(db, 'reviews', localReview.id), {
                replies: arrayUnion(replyObj)
            });

            // If replying to someone else's comment, send them a notification!
            if (replyingTarget && replyingTarget.userId && replyingTarget.userId !== user.uid) {
                await addDoc(collection(db, 'notifications'), {
                    userId: replyingTarget.userId,
                    title: '💬 Ответ на ваш комментарий',
                    message: `${authorName} ответил(а) вам: «${newComment.trim().slice(0, 60)}${newComment.trim().length > 60 ? '...' : ''}»`,
                    type: 'comment_reply',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            }

            // Ensure the thread being replied to is opened
            if (replyingTarget?.id) {
                setExpandedThreads(prev => ({
                    ...prev,
                    [replyingTarget.id]: true
                }));
            }

            deleteReplyRecordedAudio();
            setReplyingTarget(null);
            setNewComment('');
        } catch (err) {
            console.error('Error submitting comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!user || !localReview?.id) return;
        const targetReply = localReplies.find(r => r.id === replyId);
        const isAuthor = Boolean(targetReply?.userId && user.uid === targetReply.userId);
        const isAdmin = Boolean(userProfile?.role === 'admin' || userProfile?.role === 'developer' || userProfile?.isAdmin === true);
        if (!isAuthor && !isAdmin) {
            alert("Вы можете удалять только свои собственные комментарии");
            return;
        }
        if (!confirm('Удалить этот комментарий?')) return;
        try {
            const updatedReplies = localReplies.filter(r => r.id !== replyId && r.replyToCommentId !== replyId);
            setLocalReplies(updatedReplies);
            await updateDoc(doc(db, 'reviews', localReview.id), {
                replies: updatedReplies
            });
        } catch (err) {
            console.error('Error deleting reply:', err);
        }
    };

    const handleStartEditReply = (reply: ReviewReply) => {
        setReplyingTarget(null); // Cancel reply mode when starting edit
        setEditingReplyId(reply.id);
        setEditingCommentText(reply.comment);
    };

    const handleSaveEditReply = async (replyId: string) => {
        if (!editingCommentText.trim()) return;
        try {
            const updatedReplies = localReplies.map(r => {
                if (r.id === replyId) {
                    return {
                        ...r,
                        comment: editingCommentText.trim(),
                        isEdited: true,
                        updatedAt: new Date().toISOString()
                    };
                }
                return r;
            });

            await updateDoc(doc(db, 'reviews', localReview.id), {
                replies: updatedReplies
            });
            setEditingReplyId(null);
            setEditingCommentText('');
        } catch (err) {
            console.error('Error saving edited comment:', err);
        }
    };

    const toggleThread = (commentId: string) => {
        setExpandedThreads(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const handleLikeReply = async (replyId: string) => {
        if (!user) {
            alert('Пожалуйста, войдите в систему, чтобы поставить отметку «Нравится».');
            return;
        }
        try {
            const updatedReplies = localReplies.map(r => {
                if (r.id === replyId) {
                    const existingLikes = Array.isArray(r.likes) ? r.likes : [];
                    const hasLiked = existingLikes.includes(user.uid);
                    return {
                        ...r,
                        likes: hasLiked ? existingLikes.filter(id => id !== user.uid) : [...existingLikes, user.uid]
                    };
                }
                return r;
            });

            await updateDoc(doc(db, 'reviews', localReview.id), {
                replies: updatedReplies
            });
        } catch (err) {
            console.error('Error liking reply:', err);
        }
    };

    const handleReplyToUser = (targetUserName: string) => {
        setNewComment(`@${targetUserName} `);
    };

    const handleTogglePin = async () => {
        if (!isStaff) return;
        try {
            const newPinState = !localReview.isPinned;
            await updateDoc(doc(db, 'reviews', localReview.id), {
                isPinned: newPinState,
                pinnedAt: newPinState ? serverTimestamp() : null,
                pinnedBy: newPinState ? (userProfile?.displayName || user?.displayName || 'Персонал Спарты') : null
            });
        } catch (err) {
            console.error('Error toggling pin:', err);
        }
    };

    const handleStaffAppreciation = async () => {
        if (!isStaff || !user) return;
        try {
            const staffName = userProfile?.displayName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Тренер Спарты';
            const staffRoleName = userProfile?.role === 'admin' ? 'Администратор' : (userProfile?.role === 'director' ? 'Директор' : (userProfile?.role === 'developer' ? 'Разработчик' : 'Тренер'));
            
            const existingStaffLikes = Array.isArray(localReview.staffLikes) ? localReview.staffLikes : [];
            const hasLiked = existingStaffLikes.some(s => s.userId === user.uid);
            
            const updatedStaffLikes = hasLiked
                ? existingStaffLikes.filter(s => s.userId !== user.uid)
                : [...existingStaffLikes, { userId: user.uid, name: staffName, role: staffRoleName }];

            await updateDoc(doc(db, 'reviews', localReview.id), {
                staffLikes: updatedStaffLikes
            });

            // If liking (not unliking) and author is not staff themselves: send Notification!
            if (!hasLiked && localReview.userId !== user.uid) {
                await addDoc(collection(db, 'notifications'), {
                    userId: localReview.userId,
                    title: '❤️ Отметка от руководства Спарты!',
                    message: `${staffRoleName} ${staffName} поставил(а) отметку «Нравится» вашему отзыву! 🏆`,
                    type: 'review_like',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error('Error in staff appreciation:', err);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-6xl h-full max-h-[88vh] bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                    >
                        {/* Media Section */}
                        <div className="flex-1 bg-black flex items-center justify-center relative group min-h-[320px]">
                            {currentMedia?.type === 'video' ? (
                                <div className="w-full h-full p-2 md:p-4 flex items-center justify-center overflow-hidden">
                                    <VideoPlayer
                                        src={currentMedia.url}
                                        autoPlay
                                        className="w-full h-full max-h-[82vh]"
                                    />
                                </div>
                            ) : (
                                <img
                                    src={currentMedia?.url}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Review media"
                                />
                            )}

                            {/* Navigation Arrows */}
                            {allMedia.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                        className="absolute left-4 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <ChevronLeft size={22} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                        className="absolute right-4 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <ChevronRight size={22} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Info & Comments Sidebar */}
                        <div className="w-full md:w-[440px] border-l border-white/10 flex flex-col bg-[#0b0b0b]">
                            {/* Header */}
                            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-[#141414] to-[#0b0b0b]">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-amber-600/10 text-yellow-400 overflow-hidden flex items-center justify-center border border-yellow-500/30 font-black text-sm flex-shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                                        {localReview.userAvatar ? (
                                            <img src={localReview.userAvatar} alt={localReview.userName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{localReview.userName?.[0]?.toUpperCase() || 'Р'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="flex items-center gap-1.5 font-bold text-white text-sm">
                                            <span>{localReview.userName}</span>
                                            {localReview.userRole === 'admin' && <span title="Администратор"><BadgeCheck size={14} className="text-yellow-400 shrink-0" /></span>}
                                            {localReview.userRole === 'trainer' && <span title="Тренер"><Dumbbell size={14} className="text-emerald-400 shrink-0" /></span>}
                                            {localReview.userRole === 'director' && <span title="Директор"><Star size={14} className="text-purple-400 shrink-0" /></span>}
                                            {localReview.userRole === 'developer' && <span title="Разработчик"><Code size={14} className="text-cyan-400 shrink-0" /></span>}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} size={11} fill={i < (localReview.rating || 5) ? "#eab308" : "none"} className={i < (localReview.rating || 5) ? "text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" : "text-gray-700"} />
                                                ))}
                                            </div>
                                            {(localReview.childName || localReview.groupName) && (
                                                <span className="text-[9px] bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded-full font-bold border border-yellow-500/25 flex items-center gap-1 shadow-sm">
                                                    <span>⚽</span>
                                                    <span>{localReview.childName ? `${localReview.childName} • ` : ''}{localReview.groupName || 'Семья Спарты'}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* Staff Pin / Feature Button */}
                                    {isStaff && (
                                        <button
                                            type="button"
                                            onClick={handleTogglePin}
                                            className={`p-2 rounded-xl border transition-all cursor-pointer ${localReview.isPinned ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                            title={localReview.isPinned ? "Открепить отзыв" : "Закрепить отзыв вверху"}
                                        >
                                            <Pin size={15} className={localReview.isPinned ? 'fill-yellow-300' : ''} />
                                        </button>
                                    )}

                                    {/* Staff Like / Heart Button */}
                                    {isStaff && (
                                        <button
                                            type="button"
                                            onClick={handleStaffAppreciation}
                                            className={`p-2 rounded-xl border transition-all cursor-pointer ${Array.isArray(localReview.staffLikes) && localReview.staffLikes.some(s => s.userId === user?.uid) ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400'}`}
                                            title="Отметить отзыв от лица клуба"
                                        >
                                            <Heart size={15} className={Array.isArray(localReview.staffLikes) && localReview.staffLikes.some(s => s.userId === user?.uid) ? 'fill-red-400' : ''} />
                                        </button>
                                    )}

                                    <button
                                        onClick={onClose}
                                        className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Pinned & Staff Appreciation Banners */}
                            {(localReview.isPinned || (Array.isArray(localReview.staffLikes) && localReview.staffLikes.length > 0)) && (
                                <div className="px-5 pt-3.5 flex flex-col gap-2">
                                    {localReview.isPinned && (
                                        <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border border-yellow-500/40 text-yellow-300 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                            <div className="flex items-center gap-1.5">
                                                <Pin size={12} className="fill-yellow-300 shrink-0" />
                                                <span>Закреплено Клубом Спарта</span>
                                            </div>
                                            {localReview.pinnedBy && <span className="text-yellow-400/80 font-normal text-[10px]">от {localReview.pinnedBy}</span>}
                                        </div>
                                    )}
                                    {Array.isArray(localReview.staffLikes) && localReview.staffLikes.length > 0 && (
                                        <div className="bg-gradient-to-r from-red-500/15 via-rose-500/5 to-transparent border border-red-500/30 text-red-200 px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                            <Heart size={12} className="fill-red-400 text-red-400 shrink-0" />
                                            <span>Отмечено: {localReview.staffLikes.map(s => `${s.role} ${s.name}`).join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Body (Review text + Comments Feed) */}
                            <div className="flex-1 p-5 overflow-y-auto space-y-4">
                                {/* Review Main Text Card */}
                                <div className="bg-[#121212] p-4 rounded-2xl border border-white/[0.06] shadow-sm space-y-3">
                                    {localReview.audio && (
                                        <VoiceReviewPlayer
                                            src={localReview.audio}
                                            authorName={localReview.userName}
                                            className="w-full"
                                        />
                                    )}
                                    {localReview.comment && (
                                        <p className="text-gray-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
                                            {localReview.comment}
                                        </p>
                                    )}
                                    {localReview.emotionTags && localReview.emotionTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
                                            {localReview.emotionTags.map((tag, idx) => (
                                                <span key={idx} className="text-[10px] bg-yellow-500/10 text-yellow-300 px-2.5 py-1 rounded-xl border border-yellow-500/20 font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-500 font-mono">
                                        {localReview.createdAt?.seconds ? new Date(localReview.createdAt.seconds * 1000).toLocaleDateString('ru-RU') : 'Недавно'}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-white font-bold text-xs flex items-center gap-1.5 uppercase tracking-wider text-gray-400">
                                            <MessageSquare size={13} className="text-yellow-500" />
                                            <span>Комментарии ({localReplies.length})</span>
                                        </h5>
                                    </div>

                                    {/* Replies List (YouTube Architecture) */}
                                    {(() => {
                                        const rootReplies = localReplies.filter(r => !r.replyToCommentId);
                                        const childRepliesMap: Record<string, ReviewReply[]> = {};
                                        localReplies.forEach(r => {
                                            if (r.replyToCommentId) {
                                                if (!childRepliesMap[r.replyToCommentId]) childRepliesMap[r.replyToCommentId] = [];
                                                childRepliesMap[r.replyToCommentId].push(r);
                                            }
                                        });

                                        if (localReplies.length === 0) {
                                            return (
                                                <div className="text-center py-8 text-xs text-gray-500 bg-[#121212]/50 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                                                    <span className="text-lg">💬</span>
                                                    <span>Пока нет комментариев. Напишите первый!</span>
                                                </div>
                                            );
                                        }

                                        const renderCommentCard = (reply: ReviewReply, isChild = false) => {
                                            const isClubStaff = reply.userRole === 'admin' || reply.userRole === 'trainer' || reply.userRole === 'coach' || reply.userRole === 'director';
                                            const isReviewAuthor = !isClubStaff && Boolean((localReview?.userId && reply.userId === localReview.userId) || (!localReview?.userId && reply.userName === localReview?.userName));
                                            const isOwnReply = Boolean(user && ((reply.userId && user.uid === reply.userId) || (!reply.userId && (reply.userName === (user.displayName || userProfile?.displayName || userProfile?.name)))));
                                            const isEditingThis = editingReplyId === reply.id;
                                            const likesCount = Array.isArray(reply.likes) ? reply.likes.length : 0;
                                            const hasLiked = user && Array.isArray(reply.likes) && reply.likes.includes(user.uid);
                                            const childReplies = childRepliesMap[reply.id] || [];
                                            const isExpanded = expandedThreads[reply.id];

                                            return (
                                                <div key={reply.id} className="flex flex-col gap-1">
                                                    <div className={`flex gap-2.5 p-3 rounded-2xl transition-all ${isClubStaff ? 'bg-gradient-to-br from-yellow-500/15 via-[#16140c] to-[#0f0f0f] border border-yellow-500/40 shadow-[0_4px_20px_rgba(234,179,8,0.06)]' : (isReviewAuthor ? 'bg-[#14130f] border border-amber-500/25 hover:border-amber-500/40' : 'bg-[#121212] border border-white/[0.05] hover:border-white/10')}`}>
                                                        {/* Avatar */}
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden shadow-sm ${isClubStaff ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_0_8px_rgba(234,179,8,0.3)]' : (isReviewAuthor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')}`}>
                                                            {isClubStaff ? '🛡️' : (reply.userAvatar ? (
                                                                <img src={reply.userAvatar} alt={reply.userName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{reply.userName?.[0]?.toUpperCase() || 'У'}</span>
                                                            ))}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            {/* Header line */}
                                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                                                    <span>{reply.userName}</span>
                                                                    {isClubStaff && (
                                                                        <span className="text-[8px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-black uppercase border border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                                                                            🏛️ Тренер / Спарта
                                                                        </span>
                                                                    )}
                                                                    {isReviewAuthor && (
                                                                        <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold uppercase border border-amber-500/30 shadow-sm flex items-center gap-0.5">
                                                                            👑 Автор отзыва
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 font-mono">
                                                                    {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('ru-RU') : ''}
                                                                    {reply.isEdited && ' (ред.)'}
                                                                </span>
                                                            </div>

                                                            {/* Text or Edit Mode */}
                                                            {isEditingThis ? (
                                                                <div className="mt-1.5 space-y-2">
                                                                    <textarea
                                                                        value={editingCommentText}
                                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                                        rows={2}
                                                                        className="w-full bg-black/80 border border-yellow-500/50 rounded-xl p-2.5 text-xs text-white focus:outline-none shadow-inner"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingReplyId(null)}
                                                                            className="px-3 py-1 text-xs font-semibold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                                                                        >
                                                                            Отмена
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveEditReply(reply.id)}
                                                                            className="px-3.5 py-1 bg-yellow-500 text-black font-bold text-xs rounded-xl cursor-pointer hover:bg-yellow-400 transition-all shadow-md"
                                                                        >
                                                                            Сохранить
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {reply.audio && (
                                                                        <VoiceReviewPlayer
                                                                            src={reply.audio}
                                                                            authorName={reply.userName}
                                                                            className="my-1 py-1 px-2.5 text-xs w-full max-w-[320px]"
                                                                        />
                                                                    )}
                                                                    {reply.comment && (
                                                                        <p className={`text-xs leading-relaxed ${isClubStaff ? 'text-yellow-100 font-medium' : 'text-gray-300'}`}>
                                                                            {reply.replyToUser && (
                                                                                <span className="text-yellow-400 font-semibold mr-1.5">@{reply.replyToUser},</span>
                                                                            )}
                                                                            {reply.comment}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* YouTube Style Action Line */}
                                                            {!isEditingThis && (
                                                                <div className="flex items-center gap-3 pt-1.5 mt-0.5 text-xs">
                                                                    {/* Like button */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleLikeReply(reply.id)}
                                                                        className={`flex items-center gap-1 font-semibold transition-all cursor-pointer ${hasLiked ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
                                                                        title="Нравится"
                                                                    >
                                                                        <ThumbsUp size={12} className={hasLiked ? 'fill-yellow-400' : ''} />
                                                                        {likesCount > 0 && <span className="text-[11px] font-bold">{likesCount}</span>}
                                                                    </button>

                                                                    {/* Reply button (only for other users' comments) */}
                                                                    {!isOwnReply && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSelectReplyTarget(reply)}
                                                                            className="text-gray-400 hover:text-yellow-300 font-bold transition-colors cursor-pointer text-[11px]"
                                                                        >
                                                                            Ответить
                                                                        </button>
                                                                    )}

                                                                    {/* Edit (if author) */}
                                                                    {isOwnReply && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleStartEditReply(reply)}
                                                                            className="text-gray-500 hover:text-cyan-300 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-0.5"
                                                                            title="Редактировать"
                                                                        >
                                                                            <Edit2 size={10} />
                                                                        </button>
                                                                    )}

                                                                    {/* Delete (if author or admin) */}
                                                                    {(isOwnReply || Boolean(user && (userProfile?.role === 'admin' || userProfile?.role === 'developer' || userProfile?.isAdmin))) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteReply(reply.id)}
                                                                            className="text-gray-500 hover:text-red-400 text-[10px] font-medium transition-colors cursor-pointer ml-auto flex items-center gap-0.5"
                                                                            title="Удалить"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* YouTube Expand Replies Button */}
                                                            {!isChild && childReplies.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleThread(reply.id)}
                                                                    className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 py-1 px-2.5 rounded-full hover:bg-yellow-500/10 transition-colors cursor-pointer mt-1.5 -ml-1 w-fit"
                                                                >
                                                                    {isExpanded ? (
                                                                        <>
                                                                            <ChevronUp size={13} />
                                                                            <span>Скрыть {getRepliesPlural(childReplies.length)}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ChevronDown size={13} />
                                                                            <span>{getRepliesPlural(childReplies.length)}</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Nested Child Replies (YouTube thread) */}
                                                    {!isChild && childReplies.length > 0 && isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="pl-5 border-l-2 border-yellow-500/20 space-y-2 mt-1 ml-3.5"
                                                        >
                                                            {childReplies.map(child => renderCommentCard(child, true))}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        };

                                        return (
                                            <div className="space-y-3 pb-2">
                                                {rootReplies.length === 0 ? (
                                                    <div className="text-center py-8 text-gray-500 text-xs">
                                                        <MessageSquare size={24} className="mx-auto mb-2 opacity-30 text-yellow-500" />
                                                        <span>Пока нет комментариев. Напишите первый!</span>
                                                    </div>
                                                ) : (
                                                    rootReplies.map(rootReply => renderCommentCard(rootReply, false))
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Reply Target Bar (Telegram Style) */}
                            {replyingTarget && (
                                <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-1.5 h-6 bg-yellow-500 rounded-full shrink-0" />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                                <Reply size={11} className="text-yellow-400 shrink-0" />
                                                <span className="text-[11px] font-bold text-yellow-400">Ответ @{replyingTarget.userName}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-300 truncate max-w-[270px]">{replyingTarget.comment}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelReplyTarget}
                                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                                        title="Отменить ответ"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            )}

                            {/* Voice Preview in Modal before sending */}
                            {replyRecordedAudioUrl && !isRecordingReplyAudio && (
                                <div className="px-3.5 pt-2 bg-[#0d0d0d] border-t border-yellow-500/20">
                                    <div className="relative group">
                                        <VoiceReviewPlayer src={replyRecordedAudioUrl} className="w-full py-1.5 px-3 text-xs" />
                                        <button
                                            type="button"
                                            onClick={deleteReplyRecordedAudio}
                                            className="absolute -top-2 -right-2 p-1 bg-black/80 hover:bg-red-500 text-white rounded-full border border-white/20 transition-all cursor-pointer shadow-md"
                                            title="Удалить голосовую запись"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Live Audio Recording Status in Modal */}
                            {isRecordingReplyAudio && (
                                <div className="px-3.5 py-2.5 bg-red-500/10 border-t border-red-500/30 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                        <span className="text-xs font-bold text-red-300">Запись голоса:</span>
                                        <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded">
                                            0:{replyRecordingSeconds < 10 ? '0' : ''}{replyRecordingSeconds} / 1:00
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={stopReplyAudioRecording}
                                            className="px-2.5 py-1 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md"
                                        >
                                            <Square size={10} fill="currentColor" /> Готово
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelReplyAudioRecording}
                                            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Quick Reaction Chips for Parents */}
                            <div className="px-3.5 pt-2.5 pb-1 bg-[#0b0b0b] flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/[0.04]">
                                <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider shrink-0 mr-1 flex items-center gap-1">
                                    <Sparkles size={10} className="text-yellow-500" />
                                    <span>Быстро:</span>
                                </span>
                                {QUICK_REPLIES.map((chip, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleQuickChip(chip)}
                                        className="shrink-0 px-2.5 py-1 rounded-full bg-white/5 hover:bg-yellow-500/20 text-gray-300 hover:text-yellow-300 text-[10px] font-semibold border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>

                            {/* Comment Input Bar */}
                            <form onSubmit={handleSendComment} className="p-3 border-t border-white/10 bg-[#0d0d0d] flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={isRecordingReplyAudio ? stopReplyAudioRecording : startReplyAudioRecording}
                                    disabled={!user || isSubmitting}
                                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
                                        isRecordingReplyAudio
                                            ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                                            : (replyRecordedAudioUrl ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-[#161616] hover:bg-white/10 text-yellow-400 border-white/10')
                                    }`}
                                    title="Записать голосовой ответ"
                                >
                                    <Mic size={16} />
                                </button>
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={
                                        user
                                            ? (replyRecordedAudioUrl ? "Добавьте текст к голосу (опционально)..." : (replyingTarget ? `Ответить @${replyingTarget.userName}...` : "Написать комментарий..."))
                                            : "Войдите, чтобы ответить"
                                    }
                                    disabled={!user || isSubmitting}
                                    className="flex-1 bg-[#161616] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition-colors disabled:opacity-50 shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!user || (!newComment.trim() && !replyRecordedAudioBlob) || isSubmitting}
                                    className="p-2.5 bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black rounded-2xl transition-all disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.25)] flex items-center justify-center hover:scale-105 active:scale-95"
                                >
                                    {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReviewMediaModal;

