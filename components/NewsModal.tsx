import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User as UserIcon, Calendar, Clock, Heart, Trash2, ThumbsUp, Reply, Edit2, Smile, ArrowDownUp, Pin, ShieldCheck, ChevronLeft, ChevronRight, Share2, CheckCircle, Play, Ban, Shield, Dumbbell, Star, BadgeCheck, Code } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, getDoc, increment, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import ShareModal from './ShareModal';
import RelatedNewsList from './RelatedNewsList';
import SpartaVideoPlayer from './SpartaVideoPlayer';
import { useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Paperclip, FileText, Image as ImageIcon, Video, XCircle, Download, Maximize2 } from 'lucide-react';
import MediaViewerModal from './MediaViewerModal';
import { BaseModal } from './ui/BaseModal';


const categories = [
    { id: 'competitions', label: 'Соревнования', color: 'bg-blue-500' },
    { id: 'club_life', label: 'Жизнь клуба', color: 'bg-purple-500' },
    { id: 'tips', label: 'Советы тренера', color: 'bg-green-500' },
    { id: 'announcements', label: 'Объявления', color: 'bg-orange-500' }
];

const stripHtml = (html: string) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const getVideoEmbedUrl = (url: string) => {
    if (!url) return undefined;

    // VK Video
    const vkRegExp = /vk\.com\/video(-?\d+)_(\d+)/;
    const vkMatch = url.match(vkRegExp);
    if (vkMatch) {
        return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2`;
    }

    // YouTube - Let ReactPlayer handle it, or standard conversion if needed.
    // We return undefined for YouTube/Files so the original URL is used with ReactPlayer.
    // If you specifically need an embed URL for YouTube, you can uncomment below, 
    // but ReactPlayer prefers standard watch URLs usually.
    // YouTube handling is done via ReactPlayer automatically.


    return undefined;
};

interface NewsModalProps {
    news: any;
    onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ news: initialNews, onClose }) => {
    const { user } = useAuth();
    const [currentNews, setCurrentNews] = useState(initialNews);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [expandedComments, setExpandedComments] = useState<string[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const contentScrollRef = useRef<HTMLDivElement>(null);

    // Auth context to check ban status
    const { userProfile } = useAuth();
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerItems, setViewerItems] = useState<any[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);


    const openViewer = (items: any[], index: number) => {
        setViewerItems(items);
        setViewerIndex(index);
        setViewerOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...files].slice(0, 5)); // Limit to 5 files
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const uploadToSupabase = async (files: File[]) => {
        if (!supabase) {
            console.warn("Supabase client not initialized. Media upload skipped.");
            return [];
        }
        const uploadedUrls: any[] = [];
        for (const file of files) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
            const filePath = `comment-attachments/${fileName}`;

            const { data, error } = await supabase.storage
                .from('exercises-media')
                .upload(filePath, file);

            if (error) {
                console.error('Upload error:', error);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('exercises-media')
                .getPublicUrl(filePath);

            uploadedUrls.push({
                url: publicUrl,
                type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
                name: file.name
            });
        }
        return uploadedUrls;
    };
    const [userRole, setUserRole] = useState<string>('user');
    const [stopWords, setStopWords] = useState<string[]>([]);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [likesCount, setLikesCount] = useState(initialNews.likes || 0);
    const [isLiked, setIsLiked] = useState(false);

    // Update local state when prop changes
    useEffect(() => {
        setCurrentNews(initialNews);
        setCurrentMediaIndex(0);
        setLikesCount(initialNews.likes || 0);
    }, [initialNews]);

    // Construct Media Items (Video + Images)
    const mediaItems = useMemo(() => {
        const items: { type: 'video' | 'image', src: string, poster?: string }[] = [];

        // 1. Video (Always first if exists)
        if (currentNews.video) {
            // Pass raw URL to ReactPlayer (it handles VK/YouTube parsing better than manual embeds)
            items.push({
                type: 'video',
                src: currentNews.video,
                poster: currentNews.image
            });
        }

        // 2. Images
        if (currentNews.images && currentNews.images.length > 0) {
            currentNews.images.forEach((img: string) => {
                items.push({ type: 'image', src: img });
            });
        } else if (currentNews.image && !currentNews.video) {
            // Fallback: If no gallery array and no video, show main image.
            // If video exists, main image is typically the poster, so we might skip duplicating it unless desired.
            // Let's include it if there's no other images.
            items.push({ type: 'image', src: currentNews.image });
        }

        // De-duplicate if needed? (e.g. if main image is also in images array)
        // For now, trust the data.

        return items;
    }, [currentNews]);

    // Increment Views
    useEffect(() => {
        if (!initialNews.id) return;
        const incrementView = async () => {
            try {
                const newsRef = doc(db, 'news', initialNews.id);
                // Use setDoc with merge to handle VK posts that aren't in Firestore yet
                await setDoc(newsRef, {
                    views: increment(1),
                    lastViewedAt: serverTimestamp(),
                    // Persist baseLikes if it's a VK post to ensure deep links work
                    ...(initialNews.source === 'vkontakte' && initialNews.baseLikes !== undefined && { baseLikes: initialNews.baseLikes })
                }, { merge: true });
            } catch (err) {
                console.error("Error incrementing view:", err);
            }
        };
        incrementView();
    }, [initialNews.id]);

    // Real-time updates
    useEffect(() => {
        if (!initialNews.id) return;
        const unsubscribe = onSnapshot(doc(db, 'news', initialNews.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // CRITICAL: Merge with previous state to avoid losing fields NOT in Firestore (like VK content)
                setCurrentNews(prev => ({ ...prev, ...data }));

                // Calculate total likes: API Base Likes (prefer Firestore, fallback to initial) + Sparta Delta
                const baseLikesFromFirestore = data.baseLikes;
                const baseLikes = baseLikesFromFirestore !== undefined ? baseLikesFromFirestore : (initialNews.baseLikes || 0);
                const spartaLikes = data.likes || 0;
                setLikesCount(baseLikes + spartaLikes);

                setIsLiked(user ? data.likedBy?.includes(user.uid) : false);
            }
        });
        return () => unsubscribe();
    }, [initialNews.id, user]);

    // Role & Moderation Settings Check
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'settings', 'moderation'));
                if (docSnap.exists() && docSnap.data().stopWords) {
                    setStopWords(docSnap.data().stopWords);
                }
            } catch (error) {
                console.error("Error fetching moderation settings", error);
            }
        };
        fetchSettings();

        if (!user) return;
        const fetchRole = async () => {
            if (user.email === 'sofiatzbpo121@gmail.com') {
                setUserRole('admin');
                return;
            }
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role || 'user');
                }
            } catch (error) {
                console.error("Error fetching role:", error);
            }
        };
        fetchRole();
    }, [user]);

    // Track rate limit cooldown
    useEffect(() => {
        if (!userProfile?.lastCommentAt || userRole === 'admin') return;

        const interval = setInterval(() => {
            const lastCommentTime = userProfile.lastCommentAt.seconds * 1000;
            const elapsed = Date.now() - lastCommentTime;
            const remaining = Math.max(0, Math.ceil((30000 - elapsed) / 1000));
            setCooldownRemaining(remaining);
        }, 500);

        return () => clearInterval(interval);
    }, [userProfile?.lastCommentAt, userRole]);

    // Media Navigation
    const nextMedia = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (mediaItems.length > 1) {
            setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
        }
    };

    const prevMedia = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (mediaItems.length > 1) {
            setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
        }
    };

    // Comment Logic
    const toggleReplies = (commentId: string) => {
        setExpandedComments(prev =>
            prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
        );
    };

    const handleCoachApprove = async (commentId: string, isCurrentlyApproved: boolean) => {
        if (!user || (userRole !== 'admin' && userRole !== 'trainer')) return;
        try {
            const commentRef = doc(db, 'comments', commentId);
            await updateDoc(commentRef, {
                isCoachApproved: !isCurrentlyApproved,
                approvedBy: user.uid,
                approvedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error approving comment:", error);
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setNewComment(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const handlePinComment = async (commentId: string, currentPinStatus: boolean) => {
        if (userRole !== 'admin') return;
        try {
            await updateDoc(doc(db, "comments", commentId), { isPinned: !currentPinStatus });
        } catch (error) {
            console.error("Error pinning comment:", error);
        }
    };

    useEffect(() => {
        if (!currentNews?.id) return;
        const q = query(collection(db, "comments"), where("newsId", "==", currentNews.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter out hidden comments for regular users
            const visibleComments = fetchedComments.filter((c: any) => !c.isHidden || userRole === 'admin');
            setComments(visibleComments);
        });
        return () => unsubscribe();
    }, [currentNews?.id, userRole]);

    const sortedComments = useMemo(() => {
        const sorted = [...comments];
        switch (sortBy) {
            case 'newest': sorted.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); break;
            case 'oldest': sorted.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)); break;
            case 'popular': sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0)); break;
        }
        return sorted.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });
    }, [comments, sortBy]);

    const containsStopWord = (text: string) => {
        const lowerText = text.toLowerCase();
        return stopWords.some(word => lowerText.includes(word.toLowerCase()));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!newComment.trim() && attachments.length === 0)) return;


        // Rate Limiter Check (30 seconds)
        if (userProfile?.lastCommentAt) {
            const lastCommentTime = userProfile.lastCommentAt.seconds * 1000;
            const timeSinceLastComment = Date.now() - lastCommentTime;
            if (timeSinceLastComment < 30000 && userRole !== 'admin') {
                alert(`Подождите еще ${Math.ceil((30000 - timeSinceLastComment) / 1000)} сек. перед отправкой следующего комментария.`);
                return;
            }
        }

        setSending(true);
        try {
            const isHidden = containsStopWord(newComment.trim());

            let uploadedAttachments: any[] = [];
            if (attachments.length > 0) {
                if (!supabase) {
                    alert("Внимание: Настройка Supabase не завершена. Файлы не будут отправлены. Пожалуйста, настройте ключи в .env");
                } else {
                    setUploadingFiles(true);
                    uploadedAttachments = await uploadToSupabase(attachments);
                    setUploadingFiles(false);
                    if (uploadedAttachments.length === 0) {
                        alert("Не удалось загрузить файлы, но комментарий будет отправлен без них.");
                    }
                }
            }

            const allAttachments = [...uploadedAttachments];

            await addDoc(collection(db, "comments"), {
                newsId: currentNews.id,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email?.split('@')[0] || 'Пользователь',
                text: newComment.trim(),
                createdAt: serverTimestamp(),
                likes: 0,
                likedBy: [],
                userRole: userRole,
                userVerification: userProfile?.verification || null,
                attachments: allAttachments,
                ...(isHidden ? { isHidden: true } : {})
            });

            setNewComment('');
            setAttachments([]);

            alert("Комментарий успешно отправлен!");

            // Update user's lastCommentAt
            await updateDoc(doc(db, "users", user.uid), {
                lastCommentAt: serverTimestamp()
            });

            if (isHidden) {
                alert("Ваш комментарий содержит недопустимые слова и был отправлен на проверку администратором.");
            }
        } catch (error) {
            console.error("Error sending comment:", error);
            alert("Не удалось отправить комментарий");
        } finally {
            setSending(false);
            setUploadingFiles(false);
        }
    };

    const handleVote = async (optionIndex: number) => {
        if (!user || !currentNews.id) return;
        try {
            await updateDoc(doc(db, "news", currentNews.id), {
                [`pollVotes.${user.uid}`]: optionIndex
            });
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    const handleLikeComment = async (commentId: string, likes: number, likedBy: string[]) => {
        if (!user) return;
        const commentRef = doc(db, "comments", commentId);
        const isLiked = likedBy?.includes(user.uid);
        try {
            await updateDoc(commentRef, {
                likes: increment(isLiked ? -1 : 1),
                likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (error) {
            console.error("Error liking comment:", error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm("Удалить комментарий?")) return;
        try { await deleteDoc(doc(db, "comments", commentId)); }
        catch (error) { console.error("Error deleting comment:", error); }
    };

    const submitReply = async (targetId: string) => {
        if (!user || (!replyText.trim() && attachments.length === 0)) return;


        // Rate Limiter Check (30 seconds)
        if (userProfile?.lastCommentAt) {
            const lastCommentTime = userProfile.lastCommentAt.seconds * 1000;
            const timeSinceLastComment = Date.now() - lastCommentTime;
            if (timeSinceLastComment < 30000 && userRole !== 'admin') {
                alert(`Подождите еще ${Math.ceil((30000 - timeSinceLastComment) / 1000)} сек. перед отправкой следующего комментария.`);
                return;
            }
        }

        setSending(true);
        try {
            const isHidden = containsStopWord(replyText.trim());

            let uploadedAttachments: any[] = [];
            if (attachments.length > 0) {
                if (!supabase) {
                    alert("Внимание: Настройка Supabase не завершена. Файлы не будут прикреплены к ответу.");
                } else {
                    setUploadingFiles(true);
                    uploadedAttachments = await uploadToSupabase(attachments);
                    setUploadingFiles(false);
                }
            }

            await addDoc(collection(db, "comments"), {
                newsId: currentNews.id,
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email?.split('@')[0] || 'Пользователь',
                text: replyText.trim(),
                createdAt: serverTimestamp(),
                likes: 0,
                likedBy: [],
                parentId: targetId,
                userRole: userRole,
                userVerification: userProfile?.verification || null,
                attachments: uploadedAttachments,
                ...(isHidden ? { isHidden: true } : {})
            });

            if (isHidden) {
                alert("Ваш ответ содержит недопустимые слова и был отправлен на проверку администратором.");
            }

            setReplyText('');
            setAttachments([]);
            setReplyingTo(null);
            alert("Ответ успешно отправлен!");
            if (!expandedComments.includes(targetId)) toggleReplies(targetId);

            // Update user's lastCommentAt
            await updateDoc(doc(db, "users", user.uid), {
                lastCommentAt: serverTimestamp()
            });

        } catch (error) {
            console.error("Error reply:", error);
        } finally {
            setSending(false);
            setUploadingFiles(false);
        }
    };

    const submitEdit = async (commentId: string) => {
        if (!user || !editText.trim()) return;
        try {
            await updateDoc(doc(db, "comments", commentId), { text: editText.trim() });
            setEditingId(null);
            setEditText('');
        } catch (error) {
            console.error("Error edit:", error);
        }
    };

    const startEdit = (comment: any) => {
        setEditingId(comment.id);
        setEditText(comment.text);
        setReplyingTo(null);
    };

    const handleLikeNews = async () => {
        if (!user) {
            alert("Войдите, чтобы оценить новость");
            return;
        }
        const newIsLiked = !isLiked;
        const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
        setIsLiked(newIsLiked);
        setLikesCount(newLikesCount);

        try {
            const newsRef = doc(db, 'news', currentNews.id);
            // Use setDoc with merge to ensure doc exists (especially for VK posts)
            await setDoc(newsRef, {
                title: currentNews.title || "",
                category: currentNews.category || "club_life",
                source: currentNews.source || "sparta",
                vkId: currentNews.id.startsWith('vk_') ? currentNews.id.replace('vk_', '') : null,
                baseLikes: currentNews.baseLikes || 0, // Persist base count
                likes: increment(newIsLiked ? 1 : -1),
                likedBy: newIsLiked ? arrayUnion(user.uid) : arrayRemove(user.uid),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error liking news:", error);
            setIsLiked(!newIsLiked);
            setLikesCount(likesCount);
        }
    };

    const [showComments, setShowComments] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        if (currentNews?.id) {
            setShareUrl(`${window.location.origin}${window.location.pathname}?newsId=${currentNews.id}`);
        }
    }, [currentNews]);

    const handleShare = () => setShowShareModal(true);

    if (!currentNews) return null;

    const currentMedia = mediaItems[currentMediaIndex];

    return (
        <>
            {showShareModal && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    url={shareUrl}
                    title={currentNews.title}
                />
            )}
            <BaseModal
                isOpen={!!currentNews}
                onClose={onClose}
                maxWidth="max-w-full"
                customCard
                showCloseButton={false}
                glowColor="amber"
                zIndex="z-[100]"
            >
                <div
                    className={`relative w-full max-w-[98vw] h-[calc(100dvh-1rem)] md:h-[95vh] flex flex-col md:flex-row shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-[#121212]/90 backdrop-blur-2xl transition-all duration-500 ease-in-out ${showComments ? 'md:max-w-[1600px]' : 'md:max-w-[1200px]'}`}
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* Left Column (News Content) */}
                    <div className={`flex-1 flex flex-col h-full bg-[#121212] relative overflow-hidden min-w-0 transition-opacity duration-300 ${showComments && window.innerWidth < 768 ? 'opacity-0 md:opacity-100 hidden md:flex' : 'flex'}`}>
                        {/* Gallery / Media Section (Top) */}
                        <div className="w-full h-[32vh] sm:h-[40vh] md:h-[60vh] bg-black relative flex-shrink-0 group/gallery border-b border-white/5">
                            {mediaItems.length > 0 ? (
                                <AnimatePresence mode='wait'>
                                    <motion.div
                                        key={`${currentNews.id}-${currentMediaIndex}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="w-full h-full relative"
                                    >
                                        {currentMedia.type === 'video' ? (
                                            <SpartaVideoPlayer
                                                src={currentMedia.src}
                                                poster={currentMedia.poster}
                                                autoPlay={false}
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                                                {/* Blurred Background to remove black bars */}
                                                <div className="absolute inset-0 z-0">
                                                    <img
                                                        src={currentMedia.src}
                                                        alt=""
                                                        className="w-full h-full object-cover blur-3xl opacity-30 scale-125 saturate-200"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />
                                                </div>

                                                {/* Main Image */}
                                                <img
                                                    src={currentMedia.src}
                                                    alt={`Slide ${currentMediaIndex}`}
                                                    className="w-full h-full object-cover relative z-10 cursor-pointer hover:scale-[1.02] transition-transform duration-500"
                                                    onClick={() => openViewer(mediaItems.map(m => ({ url: m.src, type: m.type, name: 'Галерея' })), currentMediaIndex)}
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                    <span className="text-white/20 font-russo text-4xl">SPARTA</span>
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            {mediaItems.length > 1 && (
                                <>
                                    <button
                                        onClick={prevMedia}
                                        aria-label="Предыдущее фото"
                                        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-4 rounded-full bg-black/50 text-white/90 hover:bg-sparta-gold hover:text-black backdrop-blur-xl transition-all opacity-70 hover:opacity-100 group-hover/gallery:opacity-100 z-40 hover:scale-110 shadow-lg border border-white/10 cursor-pointer"
                                        title="Предыдущее фото"
                                    >
                                        <ChevronLeft size={20} className="sm:w-8 sm:h-8" />
                                    </button>
                                    <button
                                        onClick={nextMedia}
                                        aria-label="Следующее фото"
                                        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-4 rounded-full bg-black/50 text-white/90 hover:bg-sparta-gold hover:text-black backdrop-blur-xl transition-all opacity-70 hover:opacity-100 group-hover/gallery:opacity-100 z-40 hover:scale-110 shadow-lg border border-white/10 cursor-pointer"
                                        title="Следующее фото"
                                    >
                                        <ChevronRight size={20} className="sm:w-8 sm:h-8" />
                                    </button>

                                    {/* Pagination Dots */}
                                    <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-40 pointer-events-none">
                                        {mediaItems.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentMediaIndex ? 'bg-sparta-gold w-5 sm:w-6' : 'bg-white/30 w-1.5'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Close / Edit Buttons (Top Right of Media) */}
                            <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
                                {userRole === 'admin' && (
                                    <button
                                        onClick={() => window.location.href = `/admin/news?editId=${currentNews.id}`}
                                        aria-label="Редактировать новость"
                                        className="bg-black/50 hover:bg-sparta-gold hover:text-black text-white p-2 sm:p-3 rounded-full transition-all backdrop-blur-md border border-white/10 group-hover:border-white/20 cursor-pointer"
                                        title="Редактировать новость"
                                    >
                                        <Edit2 size={18} className="sm:w-6 sm:h-6" />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    aria-label="Закрыть"
                                    className="bg-black/50 hover:bg-white/15 text-white p-2 sm:p-3 rounded-full transition-all backdrop-blur-md border border-white/10 group-hover:border-white/20 cursor-pointer"
                                >
                                    <X size={18} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>


                        {/* Main Content (Scrollable) */}
                        <div
                            ref={contentScrollRef}
                            className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#121212] shadow-[inset_0_20px_20px_-20px_rgba(0,0,0,0.8)] z-10"
                        >
                            <motion.div
                                key={currentNews.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="p-6 md:p-12 pb-32 max-w-5xl mx-auto"
                            >

                                {/* Meta Tags */}
                                <div className="flex flex-wrap items-center gap-3 text-white/70 text-sm mb-6">
                                    {currentNews.category && (
                                        <div className={`px-3 py-1 rounded-lg font-bold uppercase text-[10px] tracking-wider shadow-lg border border-white/10 ${categories.find(c => c.id === currentNews.category)?.color.replace('bg-', 'bg-').replace('500', '500/80 text-white') || 'bg-white/10'
                                            }`}>
                                            {categories.find(c => c.id === currentNews.category)?.label || currentNews.category}
                                        </div>
                                    )}
                                    {(currentNews.source === 'vkontakte' || currentNews.vkId) && (
                                        <a
                                            href={`https://vk.com/sparta_fk${currentNews.vkId ? `?w=wall${currentNews.ownerId || '-201460597'}_${currentNews.vkId}` : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-[#0077FF]/20 text-[#0077FF] hover:bg-[#0077FF]/40 transition-colors font-bold uppercase tracking-wider text-xs border border-[#0077FF]/30 px-3 py-1 rounded-full flex items-center gap-1.5"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.071 16.59c-6.195 0-9.71-4.288-9.84-11.43h3.297c.074 4.88 2.298 6.94 4.045 7.37V5.16h3.136v4.204c1.72-.188 3.551-2.133 4.14-4.204h3.136c-.451 2.535-2.333 4.417-3.52 5.23 1.187.65 3.323 2.28 4.095 5.201h-3.398c-.588-1.928-2.186-3.41-3.83-3.606v3.606h-.261z" /></svg>
                                            {currentNews.isOverride ? 'Источник ВКонтакте (Изменено)' : 'Источник ВКонтакте'}
                                        </a>
                                    )}
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                        <Calendar size={14} className="text-sparta-gold" />
                                        <span>
                                            {currentNews.createdAt?.seconds
                                                ? format(new Date(currentNews.createdAt.seconds * 1000), 'd MMMM yyyy', { locale: ru })
                                                : 'Недавно'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                        <Clock size={14} className="text-sparta-gold" />
                                        <span>{currentNews.readingTime || 1} мин чтения</span>
                                    </div>
                                </div>

                                {/* Title */}
                                <h2 className="text-3xl md:text-5xl font-russo text-white leading-tight drop-shadow-2xl mb-8">
                                    {currentNews.title}
                                </h2>

                                {/* Actions Row */}
                                <div className="flex flex-wrap items-center gap-4 mb-10 pb-10 border-b border-white/5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleLikeNews(); }}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isLiked
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                            : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    >
                                        <Heart size={20} className={isLiked ? "fill-current" : ""} />
                                        <span>{likesCount > 0 ? likesCount : 'Нравится'}</span>
                                    </button>

                                    <button
                                        onClick={() => setShowComments(true)}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold transition-all"
                                    >
                                        <Reply size={20} className="scale-x-[-1]" />
                                        <span>Комментарии {comments.length > 0 && `(${comments.length})`}</span>
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 font-bold transition-all"
                                    >
                                        <Share2 size={20} />
                                        <span>Поделиться</span>
                                    </button>
                                </div>

                                {/* Article Body */}
                                <div className="prose prose-invert prose-lg max-w-none mb-12 prose-a:text-sparta-gold hover:prose-a:text-yellow-400 prose-img:rounded-2xl">
                                    {currentNews.source === 'vkontakte' ? (
                                        <div className="whitespace-pre-wrap font-manrope text-white/80 leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: (currentNews.content || "").replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-sparta-gold underline">$1</a>') }} />
                                    ) : (
                                        <div className="whitespace-pre-wrap text-lg leading-relaxed text-white/80 font-manrope" dangerouslySetInnerHTML={{ __html: currentNews.content || "" }} />
                                    )}
                                </div>

                                {/* Poll Section */}
                                {currentNews.poll && (
                                    <div className="mb-12 p-6 bg-[#111] rounded-2xl border border-white/5">
                                        <h3 className="text-xl font-bold text-white mb-4">{currentNews.poll.question}</h3>
                                        <div className="space-y-3">
                                            {currentNews.poll.options.map((option: string, idx: number) => {
                                                const votes = currentNews.pollVotes || {};
                                                const totalVotes = Object.keys(votes).length;
                                                const voteCount = Object.values(votes).filter(v => v === idx).length;
                                                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                                const hasVoted = user && votes[user.uid] !== undefined;
                                                const isSelected = user && votes[user.uid] === idx;

                                                return (
                                                    <div key={idx} className="relative group">
                                                        {/* Result Bar */}
                                                        {hasVoted && (
                                                            <div className="absolute inset-0 bg-white/5 rounded-xl overflow-hidden pointer-events-none">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percentage}%` }}
                                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                                    className={`h-full ${isSelected ? 'bg-sparta-gold/20' : 'bg-white/10'}`}
                                                                />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleVote(idx)}
                                                            disabled={!user}
                                                            className={`relative w-full p-4 rounded-xl border transition-all flex items-center justify-between z-10 
                                                            ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'} 
                                                            ${isSelected ? 'border-sparta-gold' : 'border-white/10 hover:border-sparta-gold/50'}
                                                        `}
                                                        >
                                                            <span className={`font-medium relative z-10 ${isSelected ? 'text-sparta-gold' : 'text-white'}`}>
                                                                {option}
                                                            </span>
                                                            {hasVoted && (
                                                                <span className={`text-sm font-bold relative z-10 ${isSelected ? 'text-sparta-gold' : 'text-white/50'}`}>
                                                                    {percentage}% ({voteCount})
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-4 text-xs text-white/30 text-right">
                                            Всего голосов: {Object.keys(currentNews.pollVotes || {}).length}
                                        </div>
                                    </div>
                                )}

                                {/* Related News Section */}
                                <div className="mt-16 pt-12 border-t border-white/5">
                                    <RelatedNewsList
                                        category={currentNews.category}
                                        currentId={currentNews.id}
                                        onSelect={(item) => {
                                            // Seamless Switch
                                            setCurrentNews(item);
                                            setCurrentMediaIndex(0);
                                            setSearchParams({ newsId: item.id }, { replace: true });

                                            // Scroll to top
                                            if (contentScrollRef.current) {
                                                contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="h-20"></div>
                            </motion.div>
                        </div>
                    </div> {/* End Left Column */}

                    {/* Comments Drawer (Side Panel) */}
                    <AnimatePresence>
                        {showComments && (
                            <motion.div
                                initial={{ x: '100%', width: window.innerWidth < 768 ? '100%' : 0, opacity: 0 }}
                                animate={{ x: 0, width: window.innerWidth < 768 ? '100%' : 550, opacity: 1 }}
                                exit={{ x: '100%', width: window.innerWidth < 768 ? '100%' : 0, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute md:relative top-0 right-0 h-full w-full bg-[#0A0A0A] md:border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-30 flex flex-col shrink-0 overflow-hidden"
                            >
                                {/* Drawer Header */}
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0A0A0A]/95 backdrop-blur-xl shrink-0 z-10 relative">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        Комментарии <span className="text-white/40 text-sm font-normal">({comments.length})</span>
                                    </h3>
                                    <button
                                        onClick={() => setShowComments(false)}
                                        className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Scrollable Comments List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-32">
                                    {/* Sorting */}
                                    <div className="flex items-center justify-between mb-6 mt-2 pb-4 border-b border-white/5">
                                        <div className="flex items-center gap-2 text-xs text-white/30 uppercase tracking-widest font-bold">
                                            <ArrowDownUp size={12} className="text-sparta-gold" />
                                            <span>Сортировка</span>
                                        </div>
                                        <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
                                            {[
                                                { id: 'newest', label: 'Новые' },
                                                { id: 'popular', label: 'Топ' },
                                                { id: 'oldest', label: 'Старые' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setSortBy(type.id as any)}
                                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${sortBy === type.id
                                                        ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20'
                                                        : 'text-white/40 hover:text-white'}`}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {sortedComments.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20 text-white/20">
                                                <Reply size={48} className="mb-4 opacity-50" />
                                                <p>Пока нет комментариев</p>
                                                <p className="text-sm">Станьте первым!</p>
                                            </div>
                                        ) : (
                                            (() => {
                                                const isCommentBanned = userProfile?.commentBanUntil && new Date(userProfile.commentBanUntil.seconds * 1000) > new Date();
                                                return sortedComments
                                                    .filter(c => !c.parentId) // Only root comments
                                                    .map((comment) => (
                                                        <CommentItem
                                                            key={comment.id}
                                                            comment={comment}
                                                            allComments={comments}
                                                            user={user}
                                                            isCommentBanned={isCommentBanned}
                                                            currentUserRole={userRole}
                                                            handleLike={handleLikeComment}
                                                            handleDelete={handleDeleteComment}
                                                            handlePin={handlePinComment}
                                                            startEdit={startEdit}
                                                            editingId={editingId}
                                                            editText={editText}
                                                            setEditText={setEditText}
                                                            submitEdit={submitEdit}
                                                            setReplyingTo={setReplyingTo}
                                                            replyingTo={replyingTo}
                                                            replyText={replyText}
                                                            setReplyText={setReplyText}
                                                            submitReply={submitReply}
                                                            toggleReplies={toggleReplies}
                                                            expandedComments={expandedComments}
                                                            cooldownRemaining={cooldownRemaining}
                                                            handleCoachApprove={handleCoachApprove}
                                                            openViewer={openViewer}
                                                        />
                                                    ));
                                            })()
                                        )}
                                    </div>
                                </div>

                                {/* Drawer Footer (Input Form) */}
                                <div className="p-4 bg-[#0A0A0A] border-t border-white/10 absolute bottom-0 left-0 right-0 z-10">
                                    {user ? (
                                        (() => {
                                            const isCommentBanned = userProfile?.commentBanUntil && new Date(userProfile.commentBanUntil.seconds * 1000) > new Date();
                                            if (isCommentBanned) {
                                                return (
                                                    <div className="text-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                                        <p className="text-red-400 text-sm font-bold flex items-center justify-center gap-2">
                                                            <Ban size={16} /> Вы не можете оставлять комментарии
                                                        </p>
                                                        <p className="text-white/50 text-xs mt-1">До: {format(new Date(userProfile.commentBanUntil.seconds * 1000), 'd MMM yyyy, HH:mm', { locale: ru })}</p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <form onSubmit={handleSubmit} className="relative">
                                                    {/* Attachments Preview */}
                                                    {attachments.length > 0 && (
                                                        <div className="flex gap-2 overflow-x-auto p-3 bg-white/[0.02] border-b border-white/5 scrollbar-hide">
                                                            {attachments.map((file, idx) => (
                                                                <div key={`file-${idx}`} className="relative shrink-0 group/preview">
                                                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/5 shadow-xl">
                                                                        {file.type.startsWith('image/') ? (
                                                                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                                                                        ) : file.type.startsWith('video/') ? (
                                                                            <div className="w-full h-full flex items-center justify-center bg-black">
                                                                                <Video size={20} className="text-sparta-gold" />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <FileText size={20} className="text-sparta-gold" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); removeAttachment(idx); }}
                                                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-lg hover:bg-red-600 transition-colors z-20"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </div>
                                                            ))}

                                                        </div>
                                                    )}

                                                    <input
                                                        type="text"
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        placeholder={uploadingFiles ? "Загрузка файлов..." : "Написать комментарий..."}
                                                        className="w-full bg-white/5 text-white rounded-xl pl-4 pr-32 py-3 border border-white/10 focus:border-sparta-gold outline-none text-sm transition-colors"
                                                        disabled={uploadingFiles}
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            onChange={handleFileSelect}
                                                            multiple
                                                            className="hidden"
                                                            accept="image/*,video/*,application/pdf"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="text-white/30 hover:text-sparta-gold transition-colors p-2"
                                                            title="Прикрепить файл"
                                                        >
                                                            <Paperclip size={18} />
                                                        </button>


                                                        <button
                                                            type="button"
                                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                            className="text-white/30 hover:text-sparta-gold transition-colors p-2"
                                                            title="Эмодзи"
                                                        >
                                                            <Smile size={18} />
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={(!newComment.trim() && attachments.length === 0) || sending || cooldownRemaining > 0 || uploadingFiles}
                                                            className="text-sparta-gold hover:text-white disabled:opacity-20 p-2 transition-colors flex items-center justify-center"
                                                        >
                                                            {cooldownRemaining > 0 ? (
                                                                <span className="text-xs font-bold text-red-400">{cooldownRemaining}</span>
                                                            ) : (
                                                                <Send size={18} />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {showEmojiPicker && (
                                                        <div className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                                                            <EmojiPicker
                                                                onEmojiClick={handleEmojiClick}
                                                                theme={Theme.DARK}
                                                                width={320}
                                                                height={400}
                                                            />
                                                        </div>
                                                    )}
                                                </form>
                                            );
                                        })()
                                    ) : (
                                        <div className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                                            <p className="text-white/50 text-xs">Войдите, чтобы комментировать</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </BaseModal>
            {/* Media Viewer Modal */}
            <MediaViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                items={viewerItems}
                initialIndex={viewerIndex}
            />
        </>
    );
};


export default NewsModal;

const CommentItem = ({
    comment, allComments, user, isCommentBanned, handleLike, handleDelete, handlePin, currentUserRole, startEdit, editingId,
    editText, setEditText, submitEdit, setReplyingTo,
    replyingTo,
    replyText,
    setReplyText,
    submitReply,
    toggleReplies,
    expandedComments,
    isReply = false,
    cooldownRemaining = 0,
    handleCoachApprove,
    openViewer
}: any) => {
    const isEditing = editingId === comment.id;
    const isReplying = replyingTo === comment.id;
    const isAdmin = currentUserRole === 'admin';
    const isExpanded = expandedComments?.includes(comment.id);
    const isCoachOrAdmin = currentUserRole === 'admin' || currentUserRole === 'trainer';

    // Highlight mentions in text
    const formatText = (text: string) => {
        if (!text) return '';
        return text.split(/(@\w+)/g).map((part, i) => {
            if (part.startsWith('@')) {
                return <span key={i} className="text-sparta-gold font-bold">{part}</span>;
            }
            return part;
        });
    };

    // Find children
    const replies = allComments
        ?.filter((c: any) => c.parentId === comment.id)
        .sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

    return (
        <div className={`relative ${isReply ? 'mt-2' : ''}`}>
            <div className={`group bg-black/20 p-4 rounded-xl border transition-all relative z-10 
                ${comment.isPinned ? 'border-sparta-gold/30 bg-sparta-gold/5' : 'border-white/5 hover:border-white/10'}
                ${comment.isCoachApproved ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.05)]' : ''}
            `}>
                {comment.isCoachApproved && (
                    <div className="absolute -top-2.5 right-4 bg-green-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-20 animate-bounce-slow">
                        <CheckCircle size={10} strokeWidth={3} /> ТРЕНЕР ОДОБРЯЕТ
                    </div>
                )}
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sparta-gold text-xs font-bold ring-2 ring-transparent group-hover:ring-white/10 transition-all">
                                {comment.userName[0].toUpperCase()}
                            </div>
                            {/* Admin Badge */}
                            {(comment.userRole === 'admin' || comment.userEmail === 'sofiatzbpo121@gmail.com') && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-[2px]" title="Администратор">
                                    <BadgeCheck size={10} strokeWidth={3} />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-white truncate">
                                    {comment.userName}
                                </span>

                                {/* Professional Role Badges */}
                                {comment.userRole === 'admin' && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                                        <Shield size={8} className="fill-current" /> Admin
                                    </span>
                                )}
                                {comment.userRole === 'trainer' && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                                        <Dumbbell size={8} /> Тренер
                                    </span>
                                )}
                                {comment.userRole === 'director' && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">
                                        <Star size={8} className="fill-current" /> Директор
                                    </span>
                                )}
                                {comment.userRole === 'developer' && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">
                                        <Code size={8} /> Dev
                                    </span>
                                )}
                                {comment.userVerification?.isVerified && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter bg-sparta-gold/20 text-sparta-gold px-1.5 py-0.5 rounded border border-sparta-gold/30">
                                        <BadgeCheck size={8} /> Verified
                                    </span>
                                )}

                                {comment.isPinned && (
                                    <span className="text-[10px] bg-sparta-gold/10 text-sparta-gold px-1.5 py-0.5 rounded flex items-center gap-1 ml-auto md:ml-0">
                                        <Pin size={8} /> Закреплено
                                    </span>
                                )}
                            </div>

                            <span className="text-[10px] text-white/30 block mt-0.5">
                                {comment.createdAt?.seconds
                                    ? formatDistanceToNow(new Date(comment.createdAt.seconds * 1000), { addSuffix: true, locale: ru })
                                    : '...'}
                            </span>
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    <div className="mb-3 pl-8">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-black/40 text-white text-sm p-2 rounded-lg border border-sparta-gold/30 outline-none"
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={() => submitEdit(comment.id)} className="text-xs bg-sparta-gold text-black px-3 py-1 rounded font-bold">Сохранить</button>
                            <button onClick={() => startEdit({ id: null })} className="text-xs text-white/50 px-3 py-1">Отмена</button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-3 pl-8">
                        <p className="text-white/70 text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {formatText(comment.text)}
                        </p>


                        {/* Attachments Rendering */}
                        {comment.attachments && comment.attachments.length > 0 && (
                            <div className={`mt-3 grid gap-1.5 ${comment.attachments.length === 1 ? 'grid-cols-1' :
                                    comment.attachments.length === 3 ? 'grid-cols-2' : 'grid-cols-2'
                                }`}>
                                {comment.attachments.map((file: any, idx: number) => {
                                    const isLarge = comment.attachments.length === 3 && idx === 0;
                                    return (
                                        <div
                                            key={idx}
                                            className={`rounded-xl overflow-hidden border border-white/5 bg-white/5 group/file relative ${isLarge ? 'col-span-2 h-[200px]' : 'h-[140px]'}`}
                                        >
                                            {file.type === 'image' ? (
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                                    onClick={() => openViewer(comment.attachments, idx)}
                                                />
                                            ) : file.type === 'video' ? (
                                                <div
                                                    className="w-full h-full relative cursor-pointer group/video"
                                                    onClick={() => openViewer(comment.attachments, idx)}
                                                >
                                                    <video src={file.url} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/40 transition-colors">
                                                        <Play size={32} className="text-white opacity-80" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 h-full hover:bg-white/10 transition-colors">
                                                    <div className="w-10 h-10 rounded-lg bg-sparta-gold/10 flex items-center justify-center text-sparta-gold shrink-0">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                                        <p className="text-[10px] text-white/40 uppercase">Открыть документ</p>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between pl-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleLike(comment.id, comment.likes, comment.likedBy)}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${comment.likedBy?.includes(user?.uid)
                                ? 'text-red-500'
                                : 'text-white/30 hover:text-white'
                                }`}
                            disabled={!user}
                        >
                            <Heart size={12} className={comment.likedBy?.includes(user?.uid) ? 'fill-red-500' : ''} />
                            <span>{comment.likes || 0}</span>
                        </button>

                        {user && (
                            <button
                                onClick={() => {
                                    if (isCommentBanned) {
                                        alert("Вы не можете отвечать на комментарии из-за активной блокировки.");
                                        return;
                                    }
                                    if (isReplying) {
                                        setReplyingTo(null);
                                        setReplyText('');
                                    } else {
                                        setReplyingTo(comment.id);
                                        setReplyText(`@${comment.userName.replace(/\s+/g, '_')} `); // Auto-mention
                                    }
                                }}
                                className={`flex items-center gap-1.5 text-xs transition-colors ${isCommentBanned ? 'text-white/10 cursor-not-allowed' : 'text-white/30 hover:text-sparta-gold'}`}
                                title={isCommentBanned ? "Вы не можете отвечать" : "Ответить"}
                            >
                                <Reply size={12} />
                                <span>Ответить</span>
                            </button>
                        )}

                        {/* Coach Approval Button */}
                        {isCoachOrAdmin && (
                            <button
                                onClick={() => handleCoachApprove(comment.id, comment.isCoachApproved)}
                                className={`flex items-center gap-1.5 text-xs transition-colors ${comment.isCoachApproved ? 'text-green-500' : 'text-white/20 hover:text-green-400'}`}
                                title={comment.isCoachApproved ? "Убрать одобрение" : "Одобрить как эксперт"}
                            >
                                <CheckCircle size={12} className={comment.isCoachApproved ? 'fill-green-500/20' : ''} />
                                <span>{comment.isCoachApproved ? 'Одобрено' : 'Одобрить'}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Pin Button for Admins */}
                        {isAdmin && !isReply && (
                            <button
                                onClick={() => handlePin(comment.id, comment.isPinned)}
                                className={`transition-colors ${comment.isPinned ? 'text-sparta-gold' : 'text-white/20 hover:text-sparta-gold'}`}
                                title={comment.isPinned ? "Открепить" : "Закрепить"}
                            >
                                <Pin size={12} className={comment.isPinned ? "fill-sparta-gold" : ""} />
                            </button>
                        )}

                        {user?.uid === comment.userId && !isEditing && (
                            <>
                                <button
                                    onClick={() => {
                                        if (isCommentBanned) {
                                            alert("Действие недоступно: У вас активна блокировка комментариев.");
                                            return;
                                        }
                                        startEdit(comment);
                                    }}
                                    className={`transition-colors ${isCommentBanned ? 'text-white/10 cursor-not-allowed' : 'text-white/20 hover:text-sparta-gold'}`}
                                    title={isCommentBanned ? "Действие недоступно" : "Изменить"}
                                >
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (isCommentBanned) {
                                            alert("Действие недоступно: У вас активна блокировка комментариев.");
                                            return;
                                        }
                                        handleDelete(comment.id);
                                    }}
                                    className={`transition-colors ${isCommentBanned ? 'text-white/10 cursor-not-allowed' : 'text-white/20 hover:text-red-500'}`}
                                    title={isCommentBanned ? "Действие недоступно" : "Удалить"}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Reply Input */}
                {isReplying && (
                    <div className="mt-4 pl-8">
                        <div className="space-y-2">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 bg-black/40 rounded-xl border border-white/10 focus-within:border-sparta-gold/50 transition-colors overflow-hidden">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                                                e.preventDefault();
                                                submitReply(comment.id);
                                            }
                                        }}
                                        placeholder={`Ответ для ${comment.userName}...`}
                                        className="w-full bg-transparent text-white text-xs p-3 outline-none resize-none min-h-[40px] max-h-[120px]"
                                        autoFocus
                                        rows={1}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = `${target.scrollHeight}px`;
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => submitReply(comment.id)}
                                    disabled={!replyText.trim() || cooldownRemaining > 0}
                                    className="bg-sparta-gold text-black p-3 rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center h-[40px]"
                                >
                                    {cooldownRemaining > 0 ? (
                                        <span className="text-xs font-bold">{cooldownRemaining}</span>
                                    ) : (
                                        <Send size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Recursive Replies Rendering */}
            {replies && replies.length > 0 && (
                <div className="ml-6 relative mt-2">
                    {/* Vertical Thread Line with improved visibility */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/10 via-white/5 to-transparent hover:bg-sparta-gold/30 transition-colors cursor-pointer group/line"
                        onClick={() => toggleReplies(comment.id)}
                    />

                    {/* Expand/Collapse Toggle */}
                    <div className="pl-4 pt-2">
                        {/* Only show toggle button for top-level or if hidden */}
                        <button
                            onClick={() => toggleReplies(comment.id)}
                            className="flex items-center gap-2 text-[10px] font-bold text-white/30 hover:text-sparta-gold transition-colors mb-2 group/toggle"
                        >
                            <div className="w-4 h-[1px] bg-white/10 group-hover/toggle:bg-sparta-gold transition-colors" />
                            <span>{isExpanded ? 'Скрыть ответы' : `Показать ответы (${replies.length})`}</span>
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="pl-4 space-y-4 pb-2">
                            {replies.map((reply: any) => (
                                <div key={reply.id} className="relative">
                                    {/* L-Shape Connector */}
                                    <div className="absolute -left-4 top-5 w-4 h-[1px] bg-white/10" />

                                    <CommentItem
                                        comment={reply}
                                        allComments={allComments}
                                        user={user}
                                        isCommentBanned={isCommentBanned}
                                        currentUserRole={currentUserRole}
                                        handleLike={handleLike}
                                        handleDelete={handleDelete}
                                        handlePin={handlePin}
                                        startEdit={startEdit}
                                        editingId={editingId}
                                        editText={editText}
                                        setEditText={setEditText}
                                        submitEdit={submitEdit}
                                        setReplyingTo={setReplyingTo}
                                        replyingTo={replyingTo}
                                        replyText={replyText}
                                        setReplyText={setReplyText}
                                        submitReply={submitReply}
                                        toggleReplies={toggleReplies}
                                        expandedComments={expandedComments}
                                        isReply={true}
                                        cooldownRemaining={cooldownRemaining}
                                        handleCoachApprove={handleCoachApprove}
                                        openViewer={openViewer}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
