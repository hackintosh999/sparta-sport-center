import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Send,
    Trash2,
    Edit2,
    Heart,
    Reply,
    Mic,
    Square,
    Loader2,
    Star,
    Shield,
    Dumbbell,
    BadgeCheck,
    Code,
    Sparkles,
    Smile,
    Camera,
    Video as VideoIcon,
    Play,
    Paperclip,
    Filter,
    ChevronDown,
    ChevronUp,
    MessageCircle
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import { doc, updateDoc, onSnapshot, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Review, ReviewReply } from '../types/shop';
import { useAuth } from '../context/AuthContext';
import VoiceReviewPlayer from './VoiceReviewPlayer';
import VideoPlayer from './VideoPlayer';
import { uploadReviewMedia } from '../utils/supabaseStorage';

interface ReviewCommentsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    review: Review | null;
}

interface ThreadNode {
    root: ReviewReply;
    children: ReviewReply[];
}

export const ReviewCommentsDrawer: React.FC<ReviewCommentsDrawerProps> = ({
    isOpen,
    onClose,
    review
}) => {
    const { user, userProfile } = useAuth();
    const [localReview, setLocalReview] = useState<Review | null>(review);
    const [localReplies, setLocalReplies] = useState<ReviewReply[]>(review?.replies || []);

    // Form inputs
    const [newComment, setNewComment] = useState('');
    const [replyingTarget, setReplyingTarget] = useState<ReviewReply | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter & Sorting
    const [filterMode, setFilterMode] = useState<'newest' | 'popular' | 'staff' | 'media'>('newest');
    const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
    const [isContextCardExpanded, setIsContextCardExpanded] = useState(true);

    // Media Attachments
    const [attachedPhotos, setAttachedPhotos] = useState<File[]>([]);
    const [attachedPhotoPreviews, setAttachedPhotoPreviews] = useState<string[]>([]);
    const [attachedVideo, setAttachedVideo] = useState<File | null>(null);
    const [attachedVideoPreview, setAttachedVideoPreview] = useState<string | null>(null);

    // Emoji Picker state
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    // Attachment Popover menu state
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

    // Lightbox modal for comment photos and videos
    const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
    const [activeLightboxVideo, setActiveLightboxVideo] = useState<string | null>(null);

    // Edit state
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');

    // Audio recording state
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [replyRecordedAudioBlob, setReplyRecordedAudioBlob] = useState<Blob | null>(null);
    const [replyRecordedAudioUrl, setReplyRecordedAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isAdmin = Boolean(
        user && (userProfile?.role === 'admin' || userProfile?.role === 'developer' || userProfile?.isAdmin === true)
    );

    // Sync on props change
    useEffect(() => {
        if (review) {
            setLocalReview(review);
            setLocalReplies(review.replies || []);
        } else {
            setLocalReview(null);
            setLocalReplies([]);
        }
    }, [review, isOpen]);

    // Real-time Firestore sync
    useEffect(() => {
        if (!review?.id || !isOpen) return;
        const unsubscribe = onSnapshot(doc(db, 'reviews', review.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() } as Review;
                setLocalReview(data);
                setLocalReplies(data.replies || []);
            }
        });
        return () => unsubscribe();
    }, [review?.id, isOpen]);

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Thread Tree Builder and Sorter ---
    const threads = useMemo(() => {
        const threadMap: Record<string, ThreadNode> = {};
        const rootNodes: ThreadNode[] = [];
        const unattachedReplies: ReviewReply[] = [];

        // 1. Top level comments
        localReplies.forEach((reply) => {
            if (!reply.replyToCommentId) {
                const node: ThreadNode = { root: reply, children: [] };
                threadMap[reply.id] = node;
                rootNodes.push(node);
            } else {
                unattachedReplies.push(reply);
            }
        });

        // 2. Attach children
        unattachedReplies.forEach((child) => {
            if (child.replyToCommentId && threadMap[child.replyToCommentId]) {
                threadMap[child.replyToCommentId].children.push(child);
            } else {
                const node: ThreadNode = { root: child, children: [] };
                threadMap[child.id] = node;
                rootNodes.push(node);
            }
        });

        // 3. Filter
        let filtered = [...rootNodes];
        if (filterMode === 'staff') {
            filtered = filtered.filter((node) => {
                const isStaffRoot = ['admin', 'trainer', 'coach', 'director', 'developer'].includes(node.root.userRole || '');
                const hasStaffChild = node.children.some((c) =>
                    ['admin', 'trainer', 'coach', 'director', 'developer'].includes(c.userRole || '')
                );
                return isStaffRoot || hasStaffChild;
            });
        } else if (filterMode === 'media') {
            filtered = filtered.filter((node) => {
                const hasRootMedia = Boolean(node.root.audio || (node.root.photos && node.root.photos.length > 0) || node.root.video);
                const hasChildMedia = node.children.some((c) => Boolean(c.audio || (c.photos && c.photos.length > 0) || c.video));
                return hasRootMedia || hasChildMedia;
            });
        }

        // 4. Sort
        if (filterMode === 'popular') {
            filtered.sort((a, b) => {
                const aLikes = (a.root.likes?.length || 0) + a.children.reduce((acc, c) => acc + (c.likes?.length || 0), 0);
                const bLikes = (b.root.likes?.length || 0) + b.children.reduce((acc, c) => acc + (c.likes?.length || 0), 0);
                return bLikes - aLikes;
            });
        } else if (filterMode === 'newest') {
            filtered.sort((a, b) => {
                const aTime = new Date(a.root.createdAt || 0).getTime();
                const bTime = new Date(b.root.createdAt || 0).getTime();
                return bTime - aTime;
            });
        }

        return filtered;
    }, [localReplies, filterMode]);

    const toggleThread = (threadId: string) => {
        setCollapsedThreads((prev) => ({
            ...prev,
            [threadId]: !prev[threadId]
        }));
    };

    // --- Photo/Video Selection Handlers ---
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setAttachedPhotos((prev) => [...prev, ...files]);
            const newPreviews = files.map((file) => URL.createObjectURL(file));
            setAttachedPhotoPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        URL.revokeObjectURL(attachedPhotoPreviews[index]);
        setAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
        setAttachedPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAttachedVideo(file);
            setAttachedVideoPreview(URL.createObjectURL(file));
        }
    };

    const removeVideo = () => {
        if (attachedVideoPreview) URL.revokeObjectURL(attachedVideoPreview);
        setAttachedVideo(null);
        setAttachedVideoPreview(null);
    };

    // --- Audio Recording Handlers ---
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
            }

            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(stream, options);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                setReplyRecordedAudioBlob(blob);
                setReplyRecordedAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach((track) => track.stop());
            };

            recorder.start(100);
            mediaRecorderRef.current = recorder;
            setIsRecordingAudio(true);
            setRecordingDuration(0);

            timerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start audio recording:', err);
            alert('Не удалось получить доступ к микрофону.');
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && isRecordingAudio) {
            mediaRecorderRef.current.stop();
            setIsRecordingAudio(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const deleteRecordedAudio = () => {
        if (replyRecordedAudioUrl) URL.revokeObjectURL(replyRecordedAudioUrl);
        setReplyRecordedAudioBlob(null);
        setReplyRecordedAudioUrl(null);
        setRecordingDuration(0);
        setIsRecordingAudio(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    // --- Emoji Insert ---
    const handleInsertEmoji = (emoji: string) => {
        setNewComment((prev) => prev + emoji);
        inputRef.current?.focus();
    };

    // --- Submit Reply ---
    const handleSendComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const hasText = newComment.trim().length > 0;
        const hasAudio = Boolean(replyRecordedAudioBlob);
        const hasPhotos = attachedPhotos.length > 0;
        const hasVideo = Boolean(attachedVideo);

        if (!user || (!hasText && !hasAudio && !hasPhotos && !hasVideo) || !localReview?.id) return;

        setIsSubmitting(true);
        try {
            const authorName =
                userProfile?.displayName ||
                `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() ||
                user.displayName ||
                user.email?.split('@')[0] ||
                'Пользователь';

            const authorAvatar = userProfile?.photoURL || user.photoURL || '';
            const role = userProfile?.role || 'user';

            // 1. Upload audio if present
            let audioUrl = '';
            if (replyRecordedAudioBlob) {
                audioUrl = await uploadReviewMedia(replyRecordedAudioBlob, 'reviews/voices', 'audio/webm');
            }

            // 2. Upload photos if present
            const uploadedPhotoUrls: string[] = [];
            for (const photo of attachedPhotos) {
                const pUrl = await uploadReviewMedia(photo, 'reviews/photos', photo.type || 'image/jpeg');
                if (pUrl) uploadedPhotoUrls.push(pUrl);
            }

            // 3. Upload video if present
            let uploadedVideoUrl = '';
            if (attachedVideo) {
                uploadedVideoUrl = await uploadReviewMedia(attachedVideo, 'reviews/videos', attachedVideo.type || 'video/mp4');
            }

            const replyObj: ReviewReply = {
                id: Date.now().toString(),
                userId: user.uid,
                userName: authorName,
                userAvatar: authorAvatar,
                comment: newComment.trim(),
                createdAt: new Date().toISOString(),
                userRole: role,
                userVerification: Boolean(userProfile?.verification),
                likes: [],
                ...(audioUrl ? { audio: audioUrl } : {}),
                ...(uploadedPhotoUrls.length > 0 ? { photos: uploadedPhotoUrls } : {}),
                ...(uploadedVideoUrl ? { video: uploadedVideoUrl } : {})
            };

            if (replyingTarget?.userName) {
                replyObj.replyToUser = replyingTarget.userName;
                replyObj.replyToText = replyingTarget.comment || '';
                // Attach to top-level comment ID or the replyingTarget itself
                replyObj.replyToCommentId = replyingTarget.replyToCommentId || replyingTarget.id;
            }

            // Optimistic update
            setLocalReplies((prev) => [...prev, replyObj]);
            setNewComment('');
            deleteRecordedAudio();
            setAttachedPhotos([]);
            setAttachedPhotoPreviews([]);
            removeVideo();
            setReplyingTarget(null);
            setIsEmojiPickerOpen(false);

            await updateDoc(doc(db, 'reviews', localReview.id), {
                replies: arrayUnion(replyObj)
            });

            // Notification
            if (replyingTarget?.userId && replyingTarget.userId !== user.uid) {
                await addDoc(collection(db, 'notifications'), {
                    userId: replyingTarget.userId,
                    title: '💬 Ответ на ваш комментарий',
                    message: `${authorName} ответил(а) вам: «${newComment.trim().slice(0, 50)}»`,
                    type: 'comment_reply',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            } else if (localReview.userId && localReview.userId !== user.uid) {
                await addDoc(collection(db, 'notifications'), {
                    userId: localReview.userId,
                    title: '💬 Новый комментарий к отзыву',
                    message: `${authorName} прокомментировал(а) ваш отзыв!`,
                    type: 'review_comment',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            }

            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Error adding reply:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Delete Reply ---
    const handleDeleteReply = async (replyId: string) => {
        if (!user || !localReview?.id) return;
        const target = localReplies.find((r) => r.id === replyId);
        const isAuthor = Boolean(target?.userId && user.uid === target.userId);
        if (!isAuthor && !isAdmin) {
            alert('Вы можете удалять только свои комментарии');
            return;
        }
        if (!confirm('Удалить этот комментарий?')) return;

        try {
            const updated = localReplies.filter((r) => r.id !== replyId && r.replyToCommentId !== replyId);
            setLocalReplies(updated);
            await updateDoc(doc(db, 'reviews', localReview.id), { replies: updated });
        } catch (err) {
            console.error('Error deleting reply:', err);
        }
    };

    // --- Edit Reply ---
    const handleSaveEdit = async (replyId: string) => {
        if (!editingCommentText.trim() || !localReview?.id) return;
        try {
            const updated = localReplies.map((r) =>
                r.id === replyId
                    ? { ...r, comment: editingCommentText.trim(), isEdited: true, updatedAt: new Date().toISOString() }
                    : r
            );
            setLocalReplies(updated);
            setEditingReplyId(null);
            await updateDoc(doc(db, 'reviews', localReview.id), { replies: updated });
        } catch (err) {
            console.error('Error saving edited reply:', err);
        }
    };

    // --- Like Reply ---
    const handleLikeReply = async (replyId: string) => {
        if (!user || !localReview?.id) return;
        try {
            const updated = localReplies.map((r) => {
                if (r.id !== replyId) return r;
                const likes = Array.isArray(r.likes) ? r.likes : [];
                const hasLiked = likes.includes(user.uid);
                return {
                    ...r,
                    likes: hasLiked ? likes.filter((uid) => uid !== user.uid) : [...likes, user.uid]
                };
            });
            setLocalReplies(updated);
            await updateDoc(doc(db, 'reviews', localReview.id), { replies: updated });
        } catch (err) {
            console.error('Error liking reply:', err);
        }
    };

    const renderRoleBadge = (role?: string) => {
        if (role === 'admin') {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold">
                    <Shield size={10} /> Администратор
                </span>
            );
        }
        if (role === 'trainer' || role === 'coach') {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30 font-bold">
                    <Dumbbell size={10} /> Тренер
                </span>
            );
        }
        if (role === 'director') {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 font-bold">
                    <BadgeCheck size={10} /> Руководство
                </span>
            );
        }
        if (role === 'developer') {
            return (
                <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold">
                    <Code size={10} /> Разработчик
                </span>
            );
        }
        return null;
    };

    // Render single comment item (root or child)
    const renderCommentCard = (
        reply: ReviewReply,
        isChild = false,
        childrenCount = 0,
        isCollapsed = false,
        onToggleThread?: () => void
    ) => {
        const isOwnReply = Boolean(user && user.uid === reply.userId);
        const hasLiked = Array.isArray(reply.likes) && user && reply.likes.includes(user.uid);
        const isReplyToSomeone = Boolean(reply.replyToUser);

        return (
            <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl border transition-all ${
                    reply.userRole === 'admin' || reply.userRole === 'trainer' || reply.userRole === 'coach'
                        ? 'bg-yellow-500/5 border-yellow-500/25 shadow-[0_0_15px_rgba(234,179,8,0.06)]'
                        : isOwnReply
                        ? 'bg-white/[0.04] border-white/10'
                        : 'bg-[#141414] border-white/5'
                }`}
            >
                {/* Author Info */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {reply.userAvatar ? (
                                <img src={reply.userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                reply.userName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">{reply.userName}</span>
                            {renderRoleBadge(reply.userRole)}
                        </div>
                    </div>

                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'Недавно'}
                    </span>
                </div>

                {/* Mention quote banner */}
                {isReplyToSomeone && (
                    <div className="mb-2 px-2.5 py-1 rounded-lg bg-white/5 border-l-2 border-yellow-500 text-[11px] text-gray-400 flex items-center gap-1">
                        <Reply size={10} className="text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-400/90 font-medium truncate">@{reply.replyToUser}</span>
                        {reply.replyToText && (
                            <span className="text-gray-500 truncate italic"> — «{reply.replyToText}»</span>
                        )}
                    </div>
                )}

                {/* Voice Player */}
                {reply.audio && (
                    <div className="my-1.5">
                        <VoiceReviewPlayer src={reply.audio} authorName={reply.userName} />
                    </div>
                )}

                {/* Photos Gallery */}
                {reply.photos && reply.photos.length > 0 && (
                    <div className="flex gap-2 my-2 overflow-x-auto pb-1">
                        {reply.photos.map((photoUrl, pIdx) => (
                            <img
                                key={pIdx}
                                src={photoUrl}
                                alt="Attached photo"
                                onClick={() => setActiveLightboxImg(photoUrl)}
                                className="w-20 h-20 object-cover rounded-xl border border-white/10 hover:border-yellow-500/50 cursor-pointer hover:scale-105 transition-all flex-shrink-0"
                            />
                        ))}
                    </div>
                )}

                {/* Video Attachment with Rich 16:9 Preview Card */}
                {reply.video && (
                    <div
                        onClick={() => setActiveLightboxVideo(reply.video!)}
                        className="my-2.5 relative aspect-video w-full max-w-sm rounded-2xl overflow-hidden border border-yellow-500/30 bg-black group cursor-pointer shadow-lg hover:border-yellow-400 transition-all"
                    >
                        <video
                            src={reply.video}
                            preload="metadata"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/90 text-black flex items-center justify-center shadow-[0_0_25px_rgba(234,179,8,0.6)] group-hover:scale-110 group-hover:bg-yellow-400 transition-all">
                                <Play size={20} className="fill-black ml-0.5" />
                            </div>
                        </div>
                        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-[10px] font-bold text-yellow-400 flex items-center gap-1.5 backdrop-blur-sm">
                            <VideoIcon size={12} />
                            <span>Смотреть видео</span>
                        </div>
                    </div>
                )}

                {/* Edit mode vs regular text */}
                {editingReplyId === reply.id ? (
                    <div className="mt-2 space-y-2">
                        <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full bg-[#1c1c1c] border border-yellow-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setEditingReplyId(null)}
                                className="text-[11px] text-gray-400 hover:text-white px-2 py-1 cursor-pointer"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveEdit(reply.id)}
                                className="text-[11px] bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-1 rounded-lg cursor-pointer"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                ) : (
                    reply.comment && (
                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed break-words">
                            {reply.comment}
                            {reply.isEdited && (
                                <span className="text-[10px] text-gray-500 ml-1.5">(изм.)</span>
                            )}
                        </p>
                    )
                )}

                {/* Actions Bar */}
                <div className="flex items-center gap-3 pt-2.5 mt-1 border-t border-white/5 text-[11px] text-gray-400">
                    {/* Like Button */}
                    <button
                        type="button"
                        onClick={() => handleLikeReply(reply.id)}
                        className={`flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer ${
                            hasLiked ? 'text-red-400 font-bold' : ''
                        }`}
                    >
                        <Heart size={12} className={hasLiked ? 'fill-red-400 text-red-400' : ''} />
                        <span>{Array.isArray(reply.likes) ? reply.likes.length : 0}</span>
                    </button>

                    {/* Reply Button (Only if not own reply) */}
                    {!isOwnReply && (
                        <button
                            type="button"
                            onClick={() => {
                                setReplyingTarget(reply);
                                inputRef.current?.focus();
                            }}
                            className="flex items-center gap-1 hover:text-yellow-400 transition-colors cursor-pointer"
                        >
                            <Reply size={12} />
                            <span>Ответить</span>
                        </button>
                    )}

                    {/* Minimalist Replies Collapse Badge [ 💬 2 ▾ / ▴ ] */}
                    {childrenCount > 0 && onToggleThread && (
                        <button
                            type="button"
                            onClick={onToggleThread}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                isCollapsed
                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                            title={isCollapsed ? "Раскрыть ответы" : "Скрыть ответы"}
                        >
                            <MessageCircle size={11} className={isCollapsed ? "text-yellow-400" : "text-gray-400"} />
                            <span>{childrenCount}</span>
                            {isCollapsed ? <ChevronDown size={12} className="text-yellow-400" /> : <ChevronUp size={12} className="text-gray-400" />}
                        </button>
                    )}

                    {/* Edit Button (Only author) */}
                    {isOwnReply && editingReplyId !== reply.id && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingReplyId(reply.id);
                                setEditingCommentText(reply.comment);
                            }}
                            className="flex items-center gap-1 hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                            <Edit2 size={11} />
                            <span>Ред.</span>
                        </button>
                    )}

                    {/* Delete Button (Author or Admin) */}
                    {(isOwnReply || isAdmin) && (
                        <button
                            type="button"
                            onClick={() => handleDeleteReply(reply.id)}
                            className="ml-auto text-gray-500 hover:text-red-400 transition-colors cursor-pointer p-1"
                            title="Удалить комментарий"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    };

    if (!localReview) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                    />

                    {/* Lightbox for comment images */}
                    {activeLightboxImg && (
                        <div
                            className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4"
                            onClick={() => setActiveLightboxImg(null)}
                        >
                            <img
                                src={activeLightboxImg}
                                alt="Enlarged preview"
                                className="max-w-full max-h-[90vh] object-contain rounded-2xl border border-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => setActiveLightboxImg(null)}
                                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    {/* Lightbox for comment videos */}
                    {activeLightboxVideo && (
                        <div
                            className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                            onClick={() => setActiveLightboxVideo(null)}
                        >
                            <div
                                className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden bg-black border border-yellow-500/30 shadow-[0_0_80px_rgba(234,179,8,0.25)] flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <VideoPlayer src={activeLightboxVideo} autoPlay className="w-full h-full" />
                                <button
                                    type="button"
                                    onClick={() => setActiveLightboxVideo(null)}
                                    className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black text-white rounded-full transition-all border border-white/20 z-30 cursor-pointer shadow-lg hover:scale-105"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Drawer / Bottom Sheet Content */}
                    <motion.div
                        initial={isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 }}
                        animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                        exit={isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        drag={isMobile ? "y" : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.04, bottom: 0.6 }}
                        onDragEnd={(_, info) => {
                            if (isMobile && info.offset.y > 90) {
                                onClose();
                            }
                        }}
                        className={
                            isMobile
                                ? "fixed bottom-0 left-0 right-0 h-[88vh] max-h-[92vh] bg-[#0e0e0e] border-t border-white/15 shadow-[0_-20px_60px_rgba(0,0,0,0.95)] flex flex-col z-50 rounded-t-[28px] overflow-hidden"
                                : "fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0e0e0e] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col z-50 rounded-l-3xl overflow-hidden"
                        }
                    >
                        {/* Mobile Pull Handle (Drag to dismiss) */}
                        {isMobile && (
                            <div
                                className="w-full pt-3 pb-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
                                onClick={onClose}
                            >
                                <div className="w-12 h-1.5 bg-white/25 hover:bg-white/40 rounded-full transition-colors" />
                            </div>
                        )}

                        {/* --- HEADER --- */}
                        <div className="p-4 md:p-5 border-b border-white/10 bg-[#141414]/90 backdrop-blur-md flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 flex-shrink-0">
                                    <Sparkles size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm md:text-base font-russo text-white flex items-center gap-2 truncate">
                                        <span>Комментарии к отзыву</span>
                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30 font-sans font-bold">
                                            {localReplies.length}
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-gray-400 truncate">
                                        Автор: <span className="text-gray-300 font-medium">{localReview.userName}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer flex-shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* --- CONTEXT PREVIEW CARD (COLLAPSIBLE) --- */}
                        <div className="mx-3 mt-3 bg-black/40 border border-white/5 rounded-2xl overflow-hidden transition-all flex-shrink-0">
                            <div
                                onClick={() => setIsContextCardExpanded(!isContextCardExpanded)}
                                className="p-2.5 px-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Исходный отзыв</span>
                                    <span className="text-xs font-bold text-white truncate">{localReview.userName}</span>
                                    <div className="flex items-center text-yellow-400 text-[10px]">
                                        <Star size={11} className="fill-yellow-400 mr-0.5" />
                                        <span>{localReview.rating}</span>
                                    </div>
                                </div>
                                <button type="button" className="text-gray-400 hover:text-white p-0.5 cursor-pointer">
                                    {isContextCardExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            </div>

                            <AnimatePresence>
                                {isContextCardExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="p-3 pt-0 border-t border-white/5 flex items-start gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-xs text-yellow-400">
                                            {localReview.userAvatar ? (
                                                <img src={localReview.userAvatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                localReview.userName.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {localReview.comment && (
                                                <p className="text-xs text-gray-300 line-clamp-2 italic leading-relaxed">
                                                    «{localReview.comment}»
                                                </p>
                                            )}
                                            {localReview.audio && (
                                                <div className="mt-1.5">
                                                    <VoiceReviewPlayer src={localReview.audio} authorName={localReview.userName} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* --- FILTER & SORTING BAR --- */}
                        <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#121212] border-b border-white/5 overflow-x-auto custom-scrollbar flex-shrink-0 mt-2">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mr-1 flex items-center gap-1 flex-shrink-0">
                                <Filter size={11} /> Сортировка:
                            </span>
                            {[
                                { id: 'newest', label: '⚡ Новые' },
                                { id: 'popular', label: '🔥 Популярные' },
                                { id: 'staff', label: '🛡️ Ответы клуба' },
                                { id: 'media', label: '📸 С медиа' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFilterMode(tab.id as any)}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                                        filterMode === tab.id
                                            ? 'bg-yellow-500 text-black shadow-md font-extrabold scale-105'
                                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* --- COMMENTS THREADS LIST --- */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                            {threads.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-3">
                                        <MessageCircle size={24} className="opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-300">
                                        {filterMode !== 'newest' ? 'Нет комментариев по выбранному фильтру' : 'Пока нет комментариев'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                        {filterMode !== 'newest'
                                            ? 'Попробуйте переключить фильтр на «Новые»'
                                            : 'Будьте первым, кто ответит на отзыв или задаст вопрос!'}
                                    </p>
                                </div>
                            ) : (
                                threads.map((thread) => {
                                    const hasChildren = thread.children.length > 0;
                                    const isCollapsed = Boolean(collapsedThreads[thread.root.id]);

                                    return (
                                        <div key={thread.root.id} className="space-y-2">
                                            {/* Root Comment Card with inline [ 💬 2 ▾ ] */}
                                            {renderCommentCard(
                                                thread.root,
                                                false,
                                                thread.children.length,
                                                isCollapsed,
                                                hasChildren ? () => toggleThread(thread.root.id) : undefined
                                            )}

                                            {/* Nested Child Replies */}
                                            {hasChildren && !isCollapsed && (
                                                <div className="border-l-2 border-yellow-500/30 pl-3 ml-3.5 space-y-2.5 mt-2">
                                                    {thread.children.map((childReply) =>
                                                        renderCommentCard(childReply, true)
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={commentsEndRef} />
                        </div>

                        {/* --- ATTACHED MEDIA PREVIEW TRAY --- */}
                        {(attachedPhotoPreviews.length > 0 || attachedVideoPreview) && (
                            <div className="px-4 py-2 bg-[#121212] border-t border-white/5 flex gap-2 overflow-x-auto items-center">
                                {attachedPhotoPreviews.map((previewUrl, idx) => (
                                    <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-yellow-500/40 flex-shrink-0 group">
                                        <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(idx)}
                                            className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}

                                {attachedVideoPreview && (
                                    <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-emerald-500/80 bg-black flex-shrink-0 flex items-center justify-center group shadow-md">
                                        <video src={attachedVideoPreview} preload="metadata" className="w-full h-full object-cover opacity-70" />
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/90 text-black flex items-center justify-center absolute pointer-events-none shadow-sm">
                                            <Play size={9} className="fill-black ml-0.5" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeVideo}
                                            className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- APPLE EMOJI PICKER WITH SPARTA QUICK BAR --- */}
                        <AnimatePresence>
                            {isEmojiPickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 15 }}
                                    className="p-2 bg-[#141414] border-t border-yellow-500/30 border-x border-white/10 rounded-t-3xl shadow-2xl space-y-2"
                                >
                                    {/* Quick Sparta Sport Strip */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 bg-black/40 rounded-xl border border-white/5 custom-scrollbar">
                                        <span className="text-[10px] uppercase font-bold text-yellow-400 flex-shrink-0 mr-1 flex items-center gap-1">
                                            <Sparkles size={11} /> Спарта:
                                        </span>
                                        {['⚽', '🏆', '🥇', '🥈', '🥉', '🥊', '🏃', '⚡', '🔥', '💎', '👑', '🦁', '🛡️', '🏅', '🎯', '👟', '🧤', '🏟️', '🧣', '💥', '🌟', '✨', '💯', '🔝', '🆒', '🇷🇺'].map((em, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleInsertEmoji(em)}
                                                className="text-lg p-1 hover:bg-yellow-500/20 hover:scale-125 rounded-lg transition-transform flex-shrink-0 cursor-pointer"
                                            >
                                                {em}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Full Apple Emoji Picker */}
                                    <div className="rounded-2xl overflow-hidden border border-white/5 shadow-inner">
                                        <EmojiPicker
                                            onEmojiClick={(emojiData: EmojiClickData) => {
                                                handleInsertEmoji(emojiData.emoji);
                                            }}
                                            theme={Theme.DARK}
                                            emojiStyle={EmojiStyle.APPLE}
                                            lazyLoadEmojis={true}
                                            searchPlaceholder="Поиск по всей библиотеке эмодзи Apple..."
                                            width="100%"
                                            height={340}
                                            previewConfig={{ showPreview: false }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* --- STICKY INPUT BAR --- */}
                        <div className="p-3 md:p-4 bg-[#141414] border-t border-white/10">
                            {/* Replying banner */}
                            {replyingTarget && (
                                <div className="mb-2 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between text-xs text-yellow-300">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Reply size={12} className="flex-shrink-0" />
                                        <span className="truncate">
                                            Ответ для <b className="text-white">@{replyingTarget.userName}</b>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTarget(null)}
                                        className="text-gray-400 hover:text-white p-0.5 ml-2 cursor-pointer flex-shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Voice Recording In-Progress Banner */}
                            {isRecordingAudio && (
                                <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-between text-xs text-white animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                        <span>Запись голоса... {recordingDuration} сек</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={stopAudioRecording}
                                        className="px-2.5 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                                    >
                                        <Square size={10} className="fill-white" />
                                        <span>Готово</span>
                                    </button>
                                </div>
                            )}

                            {/* Recorded Audio Capsule Preview */}
                            {replyRecordedAudioUrl && !isRecordingAudio && (
                                <div className="mb-2 p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <VoiceReviewPlayer src={replyRecordedAudioUrl} authorName="Ваше голосовое" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={deleteRecordedAudio}
                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                        title="Удалить запись"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            )}

                            {/* Input Form with Action Icons */}
                            <div className="relative">
                                {/* Attachment Popup Menu */}
                                <AnimatePresence>
                                    {isAttachMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-14 left-10 bg-[#1a1a1a] border border-yellow-500/30 rounded-2xl shadow-2xl p-2 z-40 flex flex-col gap-1 min-w-[190px] backdrop-blur-xl"
                                        >
                                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-white/5 mb-1">
                                                Прикрепить к ответу
                                            </div>

                                            {/* Photo Attachment Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAttachMenuOpen(false);
                                                    photoInputRef.current?.click();
                                                }}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-yellow-500/10 transition-colors text-left cursor-pointer group"
                                            >
                                                <div className="p-1.5 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 text-yellow-400">
                                                    <Camera size={16} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold">Фотография</div>
                                                    <div className="text-[10px] text-gray-400">Галерея снимков</div>
                                                </div>
                                                {attachedPhotos.length > 0 && (
                                                    <span className="text-[10px] bg-yellow-500 text-black font-bold px-1.5 py-0.5 rounded-full">
                                                        {attachedPhotos.length}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Video Attachment Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAttachMenuOpen(false);
                                                    videoInputRef.current?.click();
                                                }}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-emerald-500/10 transition-colors text-left cursor-pointer group"
                                            >
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400">
                                                    <VideoIcon size={16} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold">Видеофайл</div>
                                                    <div className="text-[10px] text-gray-400">Ролик с устройства</div>
                                                </div>
                                                {attachedVideo && (
                                                    <span className="text-[10px] bg-emerald-500 text-black font-bold px-1.5 py-0.5 rounded-full">
                                                        1
                                                    </span>
                                                )}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSendComment} className="flex items-center gap-2">
                                    {/* Hidden Inputs */}
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handlePhotoSelect}
                                    />
                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={handleVideoSelect}
                                    />

                                    {/* Left Actions: Emoji & Attachments */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {/* Emoji Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEmojiPickerOpen(!isEmojiPickerOpen);
                                                setIsAttachMenuOpen(false);
                                            }}
                                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                                isEmojiPickerOpen
                                                    ? 'bg-yellow-500 text-black border-yellow-400 shadow-md'
                                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-yellow-400 border-white/10'
                                            }`}
                                            title="Эмодзи Спарты"
                                        >
                                            <Smile size={18} />
                                        </button>

                                        {/* Paperclip Attachment Menu Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAttachMenuOpen(!isAttachMenuOpen);
                                                setIsEmojiPickerOpen(false);
                                            }}
                                            disabled={!user || isSubmitting}
                                            className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                                isAttachMenuOpen || attachedPhotos.length > 0 || attachedVideo
                                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-yellow-400 border-white/10'
                                            }`}
                                            title="Прикрепить фото или видео"
                                        >
                                            <Paperclip size={18} />
                                            {(attachedPhotos.length > 0 || attachedVideo) && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse ring-2 ring-black" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Text input */}
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder={
                                            user
                                                ? replyingTarget
                                                    ? `Ответить @${replyingTarget.userName}...`
                                                    : 'Напишите комментарий...'
                                                : 'Войдите, чтобы комментировать'
                                        }
                                        disabled={!user || isSubmitting}
                                        className="flex-1 bg-[#1c1c1c] border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition-colors disabled:opacity-50 min-w-0"
                                    />

                                    {/* Right Actions: Voice & Send */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {/* Voice Record Button */}
                                        <button
                                            type="button"
                                            onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                                            disabled={!user || isSubmitting}
                                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                                isRecordingAudio
                                                    ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                                    : replyRecordedAudioUrl
                                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-yellow-400 border-white/10'
                                            }`}
                                            title={isRecordingAudio ? 'Остановить запись' : 'Записать голос'}
                                        >
                                            {isRecordingAudio ? <Square size={16} className="fill-white" /> : <Mic size={16} />}
                                        </button>

                                        {/* Send Button */}
                                        <button
                                            type="submit"
                                            disabled={
                                                !user ||
                                                (!newComment.trim() &&
                                                    !replyRecordedAudioBlob &&
                                                    attachedPhotos.length === 0 &&
                                                    !attachedVideo) ||
                                                isSubmitting
                                            }
                                            className="p-2.5 bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black rounded-2xl transition-all disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.25)] flex items-center justify-center hover:scale-105 active:scale-95"
                                        >
                                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReviewCommentsDrawer;
