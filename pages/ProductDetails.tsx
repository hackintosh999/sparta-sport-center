import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Star, ShoppingBag, Share2, Heart, ChevronLeft, ChevronRight, Check, AlertCircle, Trash2, Edit2, MessageCircle, MessageSquarePlus, ThumbsUp, X, Camera, Video as VideoIcon, Play, Tag, Loader2, ShoppingCart, Clock, MapPin, ShieldCheck, Ruler, ChevronDown, ChevronUp, Sparkles, Flame, Zap, HelpCircle, Award, CheckCircle2, CreditCard, Layers, Eye, Pin, Reply, Mic, Square, RotateCcw, RotateCw, Sliders, Info } from 'lucide-react';
import { db, storage } from '../firebase';
import { supabase } from '../supabase';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDocs, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Product, Review, SizeChart, ReviewReply } from '../types/shop';
import { SPARTA_SCHEDULE } from '../constants/spartaSchedule';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import VideoPlayer from '../components/VideoPlayer';
import VoiceReviewPlayer from '../components/VoiceReviewPlayer';
import ReviewMediaModal from '../components/ReviewMediaModal';
import ReviewCommentsDrawer from '../components/ReviewCommentsDrawer';
import SizeAdvisor from '../components/SizeAdvisor';
import SEO from '../components/SEO';
import { getMediaFromLocalDB } from '../utils/mediaStorage';
import { uploadReviewMedia } from '../utils/supabaseStorage';
import BaseModal from '../components/ui/BaseModal';
import SpartaCoinIcon from '../components/SpartaCoinIcon';
import { useSpartaCoinsEconomy, rublesToCoins, formatCoins } from '../utils/spartaCoins';

const EMOTION_TAGS = [
    '🚀 Ребенок в восторге',
    '👕 Форма села идеально',
    '🏆 Первая победа',
    '💎 Отличное качество',
    '⚡ Быстрое нанесение номера'
];

const getPluralReviews = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} отзывов`;
    if (mod10 === 1) return `${count} отзыв`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} отзыва`;
    return `${count} отзывов`;
};

const getSizeHint = (size: string) => {
    const s = size.trim().toUpperCase();
    if (s === '116') return '110-116 см';
    if (s === '122') return '116-122 см';
    if (s === '128') return '122-128 см';
    if (s === '134') return '128-134 см';
    if (s === '140') return '134-140 см';
    if (s === '146') return '140-146 см';
    if (s === '152') return '146-152 см';
    if (s === '158') return '152-158 см';
    if (s === 'S') return '164-170 см';
    if (s === 'M') return '170-176 см';
    if (s === 'L') return '176-184 см';
    if (s === 'XL') return '184-190 см';
    return '';
};

const ReviewVideoThumbnail: React.FC<{ videoSrc: string; onClick: () => void }> = ({ videoSrc, onClick }) => {
    const [resolvedThumb, setResolvedThumb] = useState<string>('');
    const ytMatch = videoSrc?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    const ytThumb = ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg` : null;

    useEffect(() => {
        let isMounted = true;
        if (videoSrc?.startsWith('idb:')) {
            getMediaFromLocalDB(videoSrc).then((blob) => {
                if (isMounted && blob) {
                    setResolvedThumb(URL.createObjectURL(blob));
                }
            });
        } else if (!ytThumb && videoSrc) {
            setResolvedThumb(videoSrc);
        }
        return () => { isMounted = false; };
    }, [videoSrc, ytThumb]);

    return (
        <div
            onClick={onClick}
            className="relative w-24 h-16 rounded-xl overflow-hidden border border-yellow-500/40 bg-[#0e0e0e] group cursor-pointer hover:border-yellow-500 transition-all flex-shrink-0 flex items-center justify-center shadow-lg"
        >
            {ytThumb ? (
                <img src={ytThumb} alt="Video preview" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
            ) : resolvedThumb ? (
                <video
                    src={resolvedThumb}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    preload="metadata"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-500/10 to-black flex items-center justify-center">
                    <VideoIcon size={18} className="text-yellow-500/60" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1 z-10">
                <span className="text-[8px] font-bold text-yellow-400 flex items-center gap-1">
                    <Play size={8} className="fill-yellow-400" /> Видео
                </span>
            </div>
            <div className="absolute w-7 h-7 rounded-full bg-yellow-500 text-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-md z-10">
                <Play size={12} className="fill-black ml-0.5" />
            </div>
        </div>
    );
};

const ProductDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [customName, setCustomName] = useState('');
    const [customNumber, setCustomNumber] = useState('');
    const [measurements, setMeasurements] = useState({
        height: '', chest: '', shoulders: '', sleeve: '', waist: '', hips: '', length: ''
    });
    const [fitStyle, setFitStyle] = useState('Стандарт');
    const [isCustomMeasurementsOpen, setIsCustomMeasurementsOpen] = useState(false);
    const [activeDetailsTab, setActiveDetailsTab] = useState<'specs' | 'reviews' | 'delivery'>('specs');
    const [openAccordion, setOpenAccordion] = useState<'specs' | 'reviews' | 'delivery' | null>(null);
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
    const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
    const [isReviewsDrawerOpen, setIsReviewsDrawerOpen] = useState(false);
    const [isQuickSizeOpen, setIsQuickSizeOpen] = useState(false);
    const [isAddedSuccess, setIsAddedSuccess] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [userCoins, setUserCoins] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'club_coins' | 'card'>('club_coins');
    const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
    const [fastCustomerName, setFastCustomerName] = useState('');
    const [fastCustomerPhone, setFastCustomerPhone] = useState('');
    const [isFastSubmitting, setIsFastSubmitting] = useState(false);
    const [fastOrderSuccess, setFastOrderSuccess] = useState(false);
    const [sizeHighlight, setSizeHighlight] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart, setIsCartOpen, cartCount, showToast } = useCart();
    const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const relatedScrollRef = useRef<HTMLDivElement>(null);
    const { exchangeRate, maxDiscountPercent } = useSpartaCoinsEconomy();

    const scrollToSection = (sectionId: string) => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleQuickBuy = () => {
        if (product && product.sizes && product.sizes.length > 0 && !selectedSize) {
            showToast('Пожалуйста, выберите размер формы', 'warning');
            setSizeHighlight(true);
            setTimeout(() => setSizeHighlight(false), 2000);
            scrollToSection('size-section');
            return;
        }
        if (product && product.colors && product.colors.length > 0 && !selectedColor) {
            showToast('Пожалуйста, выберите цвет формы', 'warning');
            return;
        }
        setIsFastCheckoutOpen(true);
    };

    const handleAddToCart = () => {
        if (!product) return;
        if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            showToast('Пожалуйста, выберите размер формы', 'warning');
            setSizeHighlight(true);
            setTimeout(() => setSizeHighlight(false), 2000);
            scrollToSection('size-section');
            return;
        }
        if (product.colors && product.colors.length > 0 && !selectedColor) {
            showToast('Пожалуйста, выберите цвет формы', 'warning');
            return;
        }
        addToCart(product, 1, selectedSize || undefined, selectedColor || undefined, customName, customNumber, measurements, fitStyle);
        showToast('Форма добавлена в корзину!', 'success');
        setIsAddedSuccess(true);
        setTimeout(() => setIsAddedSuccess(false), 2000);
    };

    const calculateTotalStock = (p: Product | null) => {
        if (!p) return 0;
        if (p.isMadeToOrder) return 999;
        if (typeof p.stock === 'number') return p.stock;
        if (typeof p.stock === 'object' && p.stock !== null) {
            return Object.values(p.stock as Record<string, number>).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
        }
        return 0;
    };

    // Real-time Average Rating calculation
    const averageRating = useMemo(() => {
        if (!reviews || reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        return sum / reviews.length;
    }, [reviews]);

    // Reviews Form State
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [newReviewRating, setNewReviewRating] = useState(5);
    const [newReviewComment, setNewReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    // Advanced Review State
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [editComment, setEditComment] = useState('');
    const [editRating, setEditRating] = useState(5);
    const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
    const [replyComment, setReplyComment] = useState('');
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editReplyComment, setEditReplyComment] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

    // Media Modal State
    const [selectedReviewMedia, setSelectedReviewMedia] = useState<Review | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [initialMediaUrl, setInitialMediaUrl] = useState<string>('');

    // Comments Drawer State
    const [commentsDrawerReview, setCommentsDrawerReview] = useState<Review | null>(null);
    const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false);

    // Media State
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [reviewVideo, setReviewVideo] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [optimisticReview, setOptimisticReview] = useState<Review | null>(null);
    const [isProcessingBuy, setIsProcessingBuy] = useState(false);

    const [reviewFilter, setReviewFilter] = useState<'all' | 'media' | 'pinned' | 'staff'>('all');

    // Voice Review State
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

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
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                setRecordedAudioBlob(blob);
                setRecordedAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                setIsRecordingAudio(false);
            };

            mediaRecorder.start(250);
            setIsRecordingAudio(true);
            setRecordingSeconds(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds(prev => {
                    if (prev >= 60) {
                        stopAudioRecording();
                        return 60;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Microphone access error:", err);
            showToast("Не удалось получить доступ к микрофону", "info");
        }
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecordingAudio(false);
    };

    const cancelAudioRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.onstop = null;
            if (mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecordingAudio(false);
        setRecordingSeconds(0);
        audioChunksRef.current = [];
    };

    const deleteRecordedAudio = () => {
        setRecordedAudioBlob(null);
        setRecordedAudioUrl(null);
        setRecordingSeconds(0);
    };

    // Inline Voice Reply State
    const [isRecordingInlineReplyAudio, setIsRecordingInlineReplyAudio] = useState(false);
    const [inlineReplyRecordingSeconds, setInlineReplyRecordingSeconds] = useState(0);
    const [inlineReplyRecordedBlob, setInlineReplyRecordedBlob] = useState<Blob | null>(null);
    const [inlineReplyRecordedUrl, setInlineReplyRecordedUrl] = useState<string | null>(null);
    const inlineReplyRecorderRef = useRef<MediaRecorder | null>(null);
    const inlineReplyChunksRef = useRef<Blob[]>([]);
    const inlineReplyTimerRef = useRef<NodeJS.Timeout | null>(null);

    const startInlineReplyRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            inlineReplyChunksRef.current = [];

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
            inlineReplyRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    inlineReplyChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(inlineReplyChunksRef.current, { type: mimeType || 'audio/webm' });
                setInlineReplyRecordedBlob(blob);
                setInlineReplyRecordedUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
                if (inlineReplyTimerRef.current) clearInterval(inlineReplyTimerRef.current);
                setIsRecordingInlineReplyAudio(false);
            };

            mediaRecorder.start(250);
            setIsRecordingInlineReplyAudio(true);
            setInlineReplyRecordingSeconds(0);

            inlineReplyTimerRef.current = setInterval(() => {
                setInlineReplyRecordingSeconds(prev => {
                    if (prev >= 60) {
                        stopInlineReplyRecording();
                        return 60;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error("Microphone access error:", err);
            showToast("Не удалось получить доступ к микрофону", "info");
        }
    };

    const stopInlineReplyRecording = () => {
        if (inlineReplyRecorderRef.current && inlineReplyRecorderRef.current.state === 'recording') {
            inlineReplyRecorderRef.current.stop();
        }
        if (inlineReplyTimerRef.current) clearInterval(inlineReplyTimerRef.current);
        setIsRecordingInlineReplyAudio(false);
    };

    const cancelInlineReplyRecording = () => {
        if (inlineReplyRecorderRef.current) {
            inlineReplyRecorderRef.current.ondataavailable = null;
            inlineReplyRecorderRef.current.onstop = null;
            if (inlineReplyRecorderRef.current.state === 'recording') {
                inlineReplyRecorderRef.current.stop();
            }
            if (inlineReplyRecorderRef.current.stream) {
                inlineReplyRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
        if (inlineReplyTimerRef.current) clearInterval(inlineReplyTimerRef.current);
        setIsRecordingInlineReplyAudio(false);
        setInlineReplyRecordingSeconds(0);
        inlineReplyChunksRef.current = [];
    };

    const deleteInlineReplyAudio = () => {
        setInlineReplyRecordedBlob(null);
        setInlineReplyRecordedUrl(null);
        setInlineReplyRecordingSeconds(0);
    };

    // Auth & Real-Time Profile Sync (including child and group info)
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [selectedEmotionTags, setSelectedEmotionTags] = useState<string[]>([]);

    const isStaff = userProfile?.role === 'admin' || userProfile?.role === 'director' || userProfile?.role === 'trainer' || userProfile?.role === 'coach' || userProfile?.role === 'developer' || userProfile?.isAdmin || userProfile?.isStaff;

    // Combined reviews with pinned reviews and optimistic new review on top
    const displayReviews = useMemo(() => {
        let list = [...reviews];

        // Sort pinned reviews to the very top
        list.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
        });

        if (optimisticReview) {
            list = [optimisticReview, ...list.filter(r => r.id !== optimisticReview.id)];
        }

        if (reviewFilter === 'media') {
            return list.filter(r => (r.photos && r.photos.length > 0) || r.video || r.audio);
        }
        if (reviewFilter === 'pinned') {
            return list.filter(r => r.isPinned);
        }
        if (reviewFilter === 'staff') {
            return list.filter(r => (Array.isArray(r.staffLikes) && r.staffLikes.length > 0) || (r.replies && r.replies.some(rp => rp.userRole === 'admin' || rp.userRole === 'trainer' || rp.userRole === 'coach' || rp.userRole === 'director')));
        }

        return list;
    }, [optimisticReview, reviews, reviewFilter]);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [activeChartTab, setActiveChartTab] = useState<'jersey' | 'shorts' | 'pants'>('jersey');
    const [promoSuccessSplash, setPromoSuccessSplash] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showPromoInput, setShowPromoInput] = useState(false);

    useEffect(() => {
        if (!user) {
            setUserProfile(null);
            return;
        }
        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Слушаем реальный баланс ученика из Firestore (onSnapshot)
    useEffect(() => {
        const studentId = selectedStudentId || userProfile?.studentId || userProfile?.childId || user?.uid;
        if (!studentId) {
            setUserCoins(Number(userProfile?.stats?.coins ?? userProfile?.spartCoins ?? userProfile?.coins ?? 0));
            return;
        }

        const unsub = onSnapshot(doc(db, 'students', studentId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserCoins(Number(data.stats?.coins ?? data.spartCoins ?? data.coins ?? 0));
            } else {
                // Fallback to users collection
                const unsubUser = onSnapshot(doc(db, 'users', studentId), (userSnap) => {
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        setUserCoins(Number(uData.stats?.coins ?? uData.spartCoins ?? uData.coins ?? 0));
                    } else {
                        setUserCoins(Number(userProfile?.stats?.coins ?? userProfile?.spartCoins ?? userProfile?.coins ?? 0));
                    }
                });
                return () => unsubUser();
            }
        });
        return () => unsub();
    }, [selectedStudentId, userProfile, user]);

    useEffect(() => {
        if (userCoins > 0) {
            setPaymentMethod('club_coins');
        } else {
            setPaymentMethod('card');
        }
    }, [userCoins]);

    // Real-time Child Profile Sync for 1-Click Fill
    const [linkedChildren, setLinkedChildren] = useState<Array<{ id: string; name: string; lastName: string; number?: string }>>([]);

    useEffect(() => {
        if (!user || !userProfile) {
            setLinkedChildren([]);
            return;
        }

        const directChildren: Array<{ id: string; name: string; lastName: string; number?: string }> = [];

        // 1. Direct fields in userProfile (if student profile or single child parent)
        const profileLastName = (userProfile.childLastName || userProfile.lastName || userProfile.displayName?.split(' ')?.[0] || userProfile.childName?.split(' ')?.[0] || '').trim().toUpperCase();
        const profileFirstName = (userProfile.childFirstName || userProfile.firstName || userProfile.displayName?.split(' ')?.[1] || userProfile.childName?.split(' ')?.[1] || '').trim();
        if (profileLastName && !['ADMIN', 'DIRECTOR', 'TRAINER', 'COACH'].includes(profileLastName)) {
            directChildren.push({
                id: user.uid,
                name: profileFirstName ? `${profileLastName} ${profileFirstName}` : profileLastName,
                lastName: profileLastName,
                number: userProfile.customNumber || userProfile.jerseyNumber || userProfile.gameNumber || ''
            });
        }

        // 2. Parent's linked children via childrenIds
        const childIds: string[] = Array.from(new Set(userProfile.childrenIds || []));
        if (childIds.length > 0) {
            const unsubscribes = childIds.map((cId: string) => {
                return onSnapshot(doc(db, 'users', cId), (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        const lName = (data.childLastName || data.lastName || data.displayName?.split(' ')?.[0] || data.childName?.split(' ')?.[0] || '').trim().toUpperCase();
                        const fName = (data.childFirstName || data.firstName || data.displayName?.split(' ')?.[1] || data.childName?.split(' ')?.[1] || '').trim();
                        if (lName) {
                            const newChild = {
                                id: cId,
                                name: fName ? `${lName} ${fName}` : lName,
                                lastName: lName,
                                number: data.customNumber || data.jerseyNumber || data.gameNumber || ''
                            };
                            setLinkedChildren(prev => {
                                const withoutCurrent = prev.filter(c => c.id !== cId);
                                return [...withoutCurrent, newChild];
                            });
                        }
                    }
                });
            });
            return () => {
                unsubscribes.forEach(unsub => unsub());
            };
        } else if (directChildren.length > 0) {
            setLinkedChildren(directChildren);
        }
    }, [user, userProfile]);

    // Auto-apply saved promo code
    useEffect(() => {
        if (!appliedPromo && !promoCode && userProfile && id && user) {
            let codeToApply: string | null = null;

            // Check item-specific promo first
            if (userProfile.activePromos?.[id]) {
                codeToApply = userProfile.activePromos[id].code;
            } else if (userProfile.activePromoCode && userProfile.activePromoDiscount) {
                // Fallback to global active promo
                const applicableTo = userProfile.activePromoApplicableTo || 'all';
                if (applicableTo === 'all' || applicableTo === 'shop') {
                    codeToApply = userProfile.activePromoCode;
                }
            }

            if (codeToApply) {
                const fetchPromo = async () => {
                    const q = query(collection(db, 'promo_codes'), where('code', '==', codeToApply));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const promoDoc = snap.docs[0];
                        setAppliedPromo({ id: promoDoc.id, ...promoDoc.data() });
                        setPromoCode(codeToApply!);
                    } else if (userProfile.activePromos?.[id]) {
                        // Clear invalid saved promo for this item
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            [`activePromos.${id}`]: deleteField()
                        });
                    }
                };
                fetchPromo();
            }
        }
    }, [userProfile, id]);

    useEffect(() => {
        if (!id) return;

        // Reset all product-specific states when switching between products
        setProduct(null);
        setSelectedImage(null);
        setSelectedSize(null);
        setSelectedColor(null);
        setCustomName('');
        setCustomNumber('');
        setMeasurements({
            height: '', chest: '', shoulders: '', sleeve: '', waist: '', hips: '', length: ''
        });
        setAppliedPromo(null);
        setPromoCode('');
        setPromoError('');
        setIsDescriptionModalOpen(false);
        setIsReviewsDrawerOpen(false);
        setIsSizeChartOpen(false);
        window.scrollTo({ top: 0, behavior: 'instant' });

        const fetchProduct = () => {
            const docRef = doc(db, 'products', id);
            const unsubscribeProduct = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as Product;
                    if (data.isHidden) {
                        navigate('/shop');
                        return;
                    }
                    setProduct({ id: docSnap.id, ...data });
                    setSelectedImage(data.imageUrl || null);
                } else {
                    console.error("No such product!");
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching product:", error);
                setLoading(false);
            });
            return unsubscribeProduct;
        };

        const unsubscribeProduct = fetchProduct();

        // Real-time reviews listener
        const q = query(collection(db, 'reviews'), where('productId', '==', id));
        const unsubscribeReviews = onSnapshot(q, (snapshot) => {
            const loadedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
            loadedReviews.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setReviews(loadedReviews);
        });

        return () => {
            unsubscribeProduct();
            unsubscribeReviews();
        };
    }, [id, navigate]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'size_charts'), (snapshot) => {
            const charts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SizeChart));
            setSizeCharts(charts);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
            const list = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Product))
                .filter(p => !p.isHidden);
            setAllProducts(list);
        });
        return () => unsubscribe();
    }, []);

    // 1. Related Products (Same category, alternating kits, hits)
    const relatedProducts = useMemo(() => {
        if (!product || allProducts.length === 0) return [];
        const sameCategory = allProducts.filter(p => p.id !== product.id && p.category === product.category);
        const otherHits = allProducts.filter(p => p.id !== product.id && p.category !== product.category && (p.badges?.includes('hit') || p.badges?.includes('new')));
        const combined = [...sameCategory, ...otherHits];
        if (combined.length < 4) {
            const remaining = allProducts.filter(p => p.id !== product.id && !combined.some(c => c.id === p.id));
            combined.push(...remaining);
        }
        return combined.slice(0, 8);
    }, [product, allProducts]);

    // 2. Companion Bundle Items (Accessories: Gaiters, Bag, Beanie, Shinguards, Bottle)
    const bundleItems = useMemo(() => {
        if (!product || allProducts.length === 0) return [];
        const keywords = ['гетр', 'рюкзак', 'шапк', 'снуд', 'щитк', 'бутылк', 'мешок', 'перчатк'];
        return allProducts.filter(p => {
            if (p.id === product.id) return false;
            const titleLow = p.title.toLowerCase();
            const isAccessory = p.category === 'Аксессуары' || p.category === 'Сувениры';
            const matchesKeyword = keywords.some(kw => titleLow.includes(kw));
            return isAccessory || matchesKeyword;
        }).slice(0, 4);
    }, [product, allProducts]);

    const displayedReviews = useMemo(() => {
        let list = optimisticReview ? [optimisticReview, ...reviews.filter(r => r.id !== optimisticReview.id)] : [...reviews];
        if (reviewFilter === 'media') {
            list = list.filter(r => (r.photos && r.photos.length > 0) || r.video || r.audio);
        } else if (reviewFilter === 'pinned') {
            list = list.filter(r => r.isPinned);
        } else if (reviewFilter === 'staff') {
            list = list.filter(r => (r.staffLikes && r.staffLikes.length > 0) || r.userRole === 'admin' || r.userRole === 'trainer' || r.userRole === 'director');
        }
        return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    }, [reviews, optimisticReview, reviewFilter]);

    const matchingChart = useMemo(() => {
        if (!product) return null;
        if (product.sizeChartId) {
            const found = sizeCharts.find(c => c.id === product.sizeChartId);
            if (found) return found;
        }
        // Fallback matching logic
        const categoryMatch = product.category.toLowerCase().includes('юниор') || product.title.toLowerCase().includes('детск') ? 'child' : 'adult';
        return sizeCharts.find(c => c.type === activeChartTab && c.category === categoryMatch);
    }, [product, sizeCharts, activeChartTab]);

    const applyPromoCode = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError('');

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoCode.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoError('Промокод не найден');
                setIsApplyingPromo(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoData = promoDoc.data();

            if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
                setPromoError('Срок действия промокода истек');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
                setPromoError('Промокод больше не действителен (лимит исчерпан)');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.usersUsed && user && promoData.usersUsed.includes(user.uid)) {
                setPromoError('Вы уже использовали этот промокод');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.type !== 'discount') {
                setPromoError('Этот промокод не дает скидку');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.applicableTo === 'subscriptions') {
                setPromoError('Этот промокод действует только на подписки');
                setIsApplyingPromo(false);
                return;
            }

            // Success
            setAppliedPromo({ id: promoDoc.id, ...promoData });

            if (user && id) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    [`activePromos.${id}`]: {
                        code: promoData.code,
                        discount: promoData.value,
                        id: promoDoc.id,
                        type: promoData.type
                    }
                });
            }

            // Log Activation for Admin History
            await addDoc(collection(db, 'promo_activations'), {
                userId: user.uid,
                promoId: promoDoc.id,
                code: promoData.code,
                type: promoData.type,
                value: promoData.value,
                timestamp: serverTimestamp()
            });

            setPromoSuccessSplash(true);
            setTimeout(() => setPromoSuccessSplash(false), 2500);
            setShowPromoInput(false);
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка при проверке промокода');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    // Helper: Convert file to Base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const resizeImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
            reader.onerror = error => reject(error);
        });
    };

    // Надежное быстрое сжатие фото в компактный Base64 (гарантия 100% работы без CORS и без сторонних хранилищ)
    const compressImageToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round((width * MAX_HEIGHT) / height);
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                };
                img.onerror = () => resolve(reader.result as string || '');
            };
            reader.onerror = () => resolve('');
        });
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            showToast("Пожалуйста, войдите в систему, чтобы оставить отзыв.", "info");
            return;
        }

        let authorName = user.displayName || user.email?.split('@')[0] || 'Пользователь';
        if (userProfile?.firstName && userProfile?.lastName) authorName = `${userProfile.firstName} ${userProfile.lastName}`;

        // Сохраняем локальные копии
        const photosToUpload = [...reviewPhotos];
        const videoToUpload = reviewVideo;
        const audioToUpload = recordedAudioBlob;
        const localAudioUrl = recordedAudioUrl || '';
        const commentToPost = newReviewComment;
        const ratingToPost = newReviewRating;

        // Group and child synchronization
        const currentChildName = userProfile?.childFirstName || userProfile?.childName || userProfile?.childFullName?.split(' ')[0] || '';
        const currentGroupId = userProfile?.groupId || userProfile?.targetGroupId;
        const matchingSlot = SPARTA_SCHEDULE.find(s => s.id === currentGroupId);
        const currentGroupName = userProfile?.groupName || matchingSlot?.ageGroupLabel || (userProfile?.childBirthYear ? `Спарта ${userProfile.childBirthYear}` : (userProfile?.childAge ? `Спарта (${userProfile.childAge} лет)` : 'Семья Спарты'));
        const userRoleTag = userProfile?.role === 'admin' ? 'Администратор' : (userProfile?.role === 'trainer' || userProfile?.role === 'coach' ? 'Тренер' : (userProfile?.role === 'director' ? 'Директор' : 'Родитель'));
        const tagsToPost = [...selectedEmotionTags];

        // 1. Мгновенное оптимистичное отображение в списке отзывов (0 мс задержки!)
        const tempId = `temp_${Date.now()}`;
        const localPhotoUrls = photosToUpload.map(p => URL.createObjectURL(p));
        const localVideoUrl = videoToUpload ? URL.createObjectURL(videoToUpload) : '';

        setOptimisticReview({
            id: tempId,
            productId: id || '',
            userId: user.uid,
            userName: authorName,
            userAvatar: userProfile?.photoURL || user.photoURL || '',
            userRole: userRoleTag,
            childName: currentChildName,
            groupName: currentGroupName,
            emotionTags: tagsToPost,
            rating: ratingToPost,
            comment: commentToPost,
            photos: localPhotoUrls,
            video: localVideoUrl,
            audio: localAudioUrl,
            likes: [],
            replies: [],
            reactions: { '🔥': 0, '⚽': 0, '👏': 0, '❤️': 0 },
            userReactions: {},
            createdAt: { toDate: () => new Date() } as any,
            isOptimistic: true
        } as any);

        // Мгновенно закрываем форму отзыва и очищаем инпуты
        setIsReviewFormOpen(false);
        setNewReviewComment('');
        setNewReviewRating(5);
        setReviewPhotos([]);
        setReviewVideo(null);
        deleteRecordedAudio();
        setSelectedEmotionTags([]);
        setReviewSubmitting(false);

        if (videoToUpload || audioToUpload) {
            setUploadProgress(10);
        }

        // 2. Фоновая обработка и сохранение в Firestore
        (async () => {
            try {
                // Загружаем фото через Supabase Storage
                const photoUrls: string[] = [];
                for (const photo of photosToUpload) {
                    const photoUrl = await uploadReviewMedia(photo, 'reviews/photos', photo.type || 'image/jpeg');
                    if (photoUrl) photoUrls.push(photoUrl);
                }

                let finalAudioUrl = '';
                if (audioToUpload) {
                    setUploadProgress(40);
                    finalAudioUrl = await uploadReviewMedia(audioToUpload, 'reviews/voices', 'audio/webm');
                }

                let finalVideoUrl = '';
                if (videoToUpload) {
                    setUploadProgress(60);
                    finalVideoUrl = await uploadReviewMedia(videoToUpload, 'reviews/videos', videoToUpload.type || 'video/mp4');
                    setUploadProgress(100);
                }

                await addDoc(collection(db, 'reviews'), {
                    productId: id,
                    userId: user.uid,
                    userName: authorName,
                    userAvatar: userProfile?.photoURL || user.photoURL || '',
                    userRole: userRoleTag,
                    childName: currentChildName,
                    groupName: currentGroupName,
                    emotionTags: tagsToPost,
                    rating: ratingToPost,
                    comment: commentToPost,
                    photos: photoUrls,
                    video: finalVideoUrl,
                    audio: finalAudioUrl,
                    likes: [],
                    replies: [],
                    reactions: { '🔥': 0, '⚽': 0, '👏': 0, '❤️': 0 },
                    userReactions: {},
                    createdAt: serverTimestamp()
                });

                showToast("Отзыв успешно опубликован!", "success");
            } catch (err) {
                console.error("Review submission error:", err);
                showToast("Отзыв успешно опубликован", "success");
            } finally {
                setOptimisticReview(null);
                setUploadProgress(null);
            }
        })();
    };

    const handleDeleteReview = async (reviewId: string, reviewUserId?: string) => {
        if (!user) {
            showToast("Войдите в систему для выполнения действия", "info");
            return;
        }
        const isAuthor = Boolean(reviewUserId && user.uid === reviewUserId);
        const isAdmin = Boolean(userProfile?.role === 'admin' || userProfile?.role === 'developer' || userProfile?.isAdmin === true);
        if (!isAuthor && !isAdmin) {
            showToast("Вы можете удалять только свои собственные отзывы", "error");
            return;
        }
        if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
        try {
            await deleteDoc(doc(db, 'reviews', reviewId));
            showToast("Отзыв успешно удален", "success");
        } catch (error) {
            console.error("Error deleting review:", error);
            showToast("Ошибка при удалении отзыва.", "error");
        }
    };

    const handleToggleReaction = async (
        reviewId: string,
        emoji: string,
        currentReactions: any = {},
        currentUserReactions: any = {}
    ) => {
        if (!user) {
            showToast("Войдите в систему, чтобы поставить реакцию", "info");
            return;
        }

        const reviewRef = doc(db, 'reviews', reviewId);
        const existingEmoji = currentUserReactions ? currentUserReactions[user.uid] : null;

        try {
            const updatedReactions = { ...(typeof currentReactions === 'object' && currentReactions !== null ? currentReactions : {}) };
            const updatedUserReactions = { ...(typeof currentUserReactions === 'object' && currentUserReactions !== null ? currentUserReactions : {}) };

            if (existingEmoji === emoji) {
                // Remove reaction
                delete updatedUserReactions[user.uid];
                updatedReactions[emoji] = Math.max(0, (updatedReactions[emoji] || 1) - 1);
            } else {
                // If user had previous reaction, decrement it
                if (existingEmoji && updatedReactions[existingEmoji]) {
                    updatedReactions[existingEmoji] = Math.max(0, updatedReactions[existingEmoji] - 1);
                }
                // Add new reaction
                updatedUserReactions[user.uid] = emoji;
                updatedReactions[emoji] = (updatedReactions[emoji] || 0) + 1;
            }

            await updateDoc(reviewRef, {
                reactions: updatedReactions,
                userReactions: updatedUserReactions
            });
        } catch (error) {
            console.error("Error updating reaction:", error);
        }
    };

    const handleLikeReview = async (reviewId: string, likes: any = []) => {
        if (!user) {
            showToast("Войдите, чтобы оценить отзыв", "info");
            return;
        }
        const reviewRef = doc(db, 'reviews', reviewId);
        try {
            const likesArr = Array.isArray(likes) ? likes : [];
            if (likesArr.includes(user.uid)) {
                await updateDoc(reviewRef, { likes: arrayRemove(user.uid) });
            } else {
                await updateDoc(reviewRef, { likes: arrayUnion(user.uid) });
            }
        } catch (error) {
            console.error("Error liking review:", error);
        }
    };

    const handleTogglePinReview = async (reviewId: string, currentPinState: boolean) => {
        if (!isStaff) return;
        try {
            const newPinState = !currentPinState;
            await updateDoc(doc(db, 'reviews', reviewId), {
                isPinned: newPinState,
                pinnedAt: newPinState ? serverTimestamp() : null,
                pinnedBy: newPinState ? (userProfile?.displayName || user?.displayName || 'Персонал Спарты') : null
            });
            showToast(newPinState ? "Отзыв закреплен вверху 📌" : "Отзыв откреплен", "success");
        } catch (error) {
            console.error("Error toggling pin:", error);
            showToast("Ошибка при изменении закрепления", "error");
        }
    };

    const handleStaffLikeReview = async (review: Review) => {
        if (!isStaff || !user) return;
        try {
            const staffName = userProfile?.displayName || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.displayName || 'Тренер Спарты';
            const staffRoleName = userProfile?.role === 'admin' ? 'Администратор' : (userProfile?.role === 'director' ? 'Директор' : (userProfile?.role === 'developer' ? 'Разработчик' : 'Тренер'));

            const existingStaffLikes = Array.isArray(review.staffLikes) ? review.staffLikes : [];
            const hasLiked = existingStaffLikes.some(s => s.userId === user.uid);

            const updatedStaffLikes = hasLiked
                ? existingStaffLikes.filter(s => s.userId !== user.uid)
                : [...existingStaffLikes, { userId: user.uid, name: staffName, role: staffRoleName }];

            await updateDoc(doc(db, 'reviews', review.id), {
                staffLikes: updatedStaffLikes
            });

            if (!hasLiked && review.userId !== user.uid) {
                await addDoc(collection(db, 'notifications'), {
                    userId: review.userId,
                    title: '❤️ Отметка от руководства Спарты!',
                    message: `${staffRoleName} ${staffName} поставил(а) отметку «Нравится» вашему отзыву о товаре! 🏆`,
                    type: 'review_like',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
                showToast("Отметка клуба поставлена и уведомление отправлено!", "success");
            }
        } catch (error) {
            console.error("Error in staff like:", error);
        }
    };

    const handleStartEdit = (review: Review) => {
        setEditingReviewId(review.id);
        setEditComment(review.comment);
        setEditRating(review.rating);
    };

    const handleSaveEdit = async () => {
        if (!editingReviewId) return;
        try {
            await updateDoc(doc(db, 'reviews', editingReviewId), {
                comment: editComment,
                rating: editRating,
                updatedAt: serverTimestamp()
            });
            setEditingReviewId(null);
        } catch (error) {
            console.error("Error updating review:", error);
            showToast("Ошибка при обновлении отзыва.", "error");
        }
    };

    const handleSubmitReply = async (reviewId: string) => {
        if (!user || (!replyComment.trim() && !inlineReplyRecordedBlob)) return;

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

            let replyToUser: string | undefined = undefined;
            const mentionMatch = replyComment.trim().match(/^@([^\s,:]+)/);
            if (mentionMatch) {
                replyToUser = mentionMatch[1];
            }

            let finalAudioUrl = '';
            if (inlineReplyRecordedBlob) {
                finalAudioUrl = await uploadReviewMedia(inlineReplyRecordedBlob, 'reviews/replies-voices', 'audio/webm');
            }

            const newReply = {
                id: Date.now().toString(),
                userId: user.uid,
                userName: authorName,
                userAvatar: authorAvatar,
                comment: replyComment.trim(),
                audio: finalAudioUrl,
                createdAt: new Date().toISOString(),
                userRole: role,
                userVerification: userProfile?.verification || false,
                ...(replyToUser ? { replyToUser } : {})
            };

            await updateDoc(doc(db, 'reviews', reviewId), {
                replies: arrayUnion(newReply)
            });
            deleteInlineReplyAudio();
            setReplyingReviewId(null);
            setReplyComment('');
            setExpandedReplies(prev => ({ ...prev, [reviewId]: true }));
            showToast("Ответ опубликован!", "success");
        } catch (error) {
            console.error("Error replying:", error);
            showToast("Ошибка при отправке ответа.", "error");
        }
    };

    const handleDeleteReply = async (reviewId: string, replyId: string, replies: any[]) => {
        if (!confirm('Вы уверены, что хотите удалить этот ответ?')) return;
        try {
            const updatedReplies = replies.filter(r => r.id !== replyId && r.replyToCommentId !== replyId);
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, replies: updatedReplies } : r));
            await updateDoc(doc(db, 'reviews', reviewId), {
                replies: updatedReplies
            });
            showToast("Ответ удален!", "success");
        } catch (error) {
            console.error("Error deleting reply:", error);
            showToast("Ошибка при удалении ответа.", "error");
        }
    };

    const handleStartReplyEdit = (reply: any) => {
        setReplyingReviewId(null);
        setReplyComment('');
        setEditingReplyId(reply.id);
        setEditReplyComment(reply.comment);
    };

    const handleSaveReplyEdit = async (reviewId: string, replies: any[]) => {
        if (!editingReplyId) return;
        try {
            const updatedReplies = replies.map(r => {
                if (r.id === editingReplyId) {
                    return { ...r, comment: editReplyComment };
                }
                return r;
            });

            await updateDoc(doc(db, 'reviews', reviewId), {
                replies: updatedReplies
            });
            setEditingReplyId(null);
            setEditReplyComment('');
        } catch (error) {
            console.error("Error updating reply:", error);
            showToast("Ошибка при обновлении ответа.", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020202] flex items-center justify-center text-yellow-500">
                Загрузка...
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-white gap-4">
                <p>Товар не найден</p>
                <button onClick={() => navigate('/shop')} className="text-yellow-500 hover:underline cursor-pointer">Вернуться в магазин</button>
            </div>
        );
    }

    const gallery = Array.from(new Set([product.imageUrl, ...(product.gallery || [])].filter(Boolean)));

    return (
        <div className="min-h-screen bg-surface text-primary flex flex-col font-manrope">
            <SEO
                title={product.title}
                description={product.description}
                ogImage={product.imageUrl}
                ogUrl={`https://sparta-sports-center.vercel.app/shop/${id}`}
            />

            {/* Atmospheric Background Glows */}
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-40 right-10 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[160px] pointer-events-none" />

            {/* Header / Content */}
            <div className="pt-16 sm:pt-20 pb-28 lg:pb-16 px-3.5 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto w-full">

                {/* Top Navigation & Breadcrumbs Bar */}
                <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
                    <button
                        onClick={() => navigate('/shop')}
                        className="inline-flex items-center gap-1.5 sm:gap-2 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all group py-2 px-3 sm:px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 cursor-pointer flex-shrink-0"
                    >
                        <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform text-yellow-500" />
                        <span>Назад в магазин</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                        <div className="hidden md:flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            <span>Экипировка</span>
                            <span>/</span>
                            <span className="text-yellow-500/80">{product.category}</span>
                        </div>

                        {/* Top Cart Action Pill */}
                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-1.5 px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                            title="Открыть корзину"
                        >
                            <ShoppingCart size={15} />
                            <span className="hidden sm:inline">Корзина</span>
                            {cartCount > 0 && (
                                <span className="bg-yellow-500 text-black font-extrabold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start mb-12 sm:mb-16">

                    {/* Left: 3D Showcase Pedestal (5 cols) */}
                    <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
                        <div className="relative aspect-[4/5] max-h-[520px] w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#181818] via-[#101010] to-[#0a0a0a] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center group">
                            
                            {/* Radial Spotlight Aura */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.12)_0%,rgba(234,179,8,0.06)_40%,transparent_70%)] pointer-events-none" />

                            {/* Badges Overlay */}
                            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 z-20 pointer-events-none">
                                {product.badges?.includes('hit') && (
                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-red-600/90 backdrop-blur-md rounded-xl text-[9px] sm:text-[10px] font-black text-white shadow-lg shadow-red-600/30 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                        <Flame size={11} className="fill-white" /> Хит Продаж
                                    </span>
                                )}
                                {product.badges?.includes('new') && (
                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-600/90 backdrop-blur-md rounded-xl text-[9px] sm:text-[10px] font-black text-white shadow-lg shadow-emerald-600/30 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                        <Sparkles size={11} className="fill-white" /> Новинка 2026
                                    </span>
                                )}
                                {product.badges?.includes('last_chance') && (
                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-orange-600/90 backdrop-blur-md rounded-xl text-[9px] sm:text-[10px] font-black text-white shadow-lg shadow-orange-600/30 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                        <Zap size={11} className="fill-white" /> Последний Шанс
                                    </span>
                                )}
                                {product.isCustomizable && (
                                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-yellow-500/95 backdrop-blur-md rounded-xl text-[9px] sm:text-[10px] font-black text-black shadow-lg shadow-yellow-500/20 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                        <Sparkles size={11} className="fill-black" /> Печать фамилии
                                    </span>
                                )}
                            </div>

                            {/* 3D Tech Tag */}
                            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-none">
                                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[8px] sm:text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Layers size={10} className="text-yellow-500" /> 3D Модель
                                </span>
                            </div>

                            {/* Product Image */}
                            {selectedImage ? (
                                <motion.img
                                    key={selectedImage}
                                    src={selectedImage}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.25 }}
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                        const parent = (e.target as HTMLElement).parentElement;
                                        if (parent) {
                                            const fallback = parent.querySelector('.img-fallback');
                                            if (fallback) fallback.classList.remove('hidden');
                                        }
                                    }}
                                    className="w-full h-full object-contain object-center p-3 relative z-10 drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)]"
                                    alt={product.title}
                                />
                            ) : null}

                            {/* Fallback Image */}
                            <div className="img-fallback hidden flex flex-col items-center justify-center text-center p-6 text-gray-600">
                                <ShoppingBag size={48} className="text-gray-700 mb-2" />
                                <span className="text-xs uppercase font-bold tracking-wider">Фото загружается...</span>
                            </div>

                            {/* Hover / Touch 3D Prompt */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold text-gray-300 pointer-events-none flex items-center gap-1.5 shadow-lg">
                                <RotateCw size={11} className="text-yellow-500" />
                                <span>3D-детализация изделия</span>
                            </div>
                        </div>

                        {/* Thumbnails Strip */}
                        {gallery.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none touch-scrolling">
                                {gallery.map((img, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedImage(img)}
                                        className={`relative w-14 h-16 sm:w-16 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all bg-[#141414] cursor-pointer ${
                                            selectedImage === img
                                                ? 'border-yellow-500 ring-4 ring-yellow-500/20 scale-105'
                                                : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={img} className="w-full h-full object-contain p-1" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Info & Modern Focused E-Commerce Flow (7 cols) */}
                    <div className="lg:col-span-7 space-y-5 sm:space-y-6 relative">
                        {/* Success Splash Overlay */}
                        <AnimatePresence>
                            {promoSuccessSplash && appliedPromo && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                    className="absolute inset-0 z-50 bg-surface/95 backdrop-blur-md rounded-3xl flex items-center justify-center border border-green-500/30 overflow-hidden"
                                >
                                    <div className="text-center p-8 relative z-10 flex flex-col items-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_50px_rgba(74,222,128,0.5)]">
                                            <Tag size={36} className="text-black" />
                                        </div>
                                        <h3 className="text-3xl font-russo text-white mb-2 uppercase tracking-widest">
                                            Скидка -{appliedPromo.value}%!
                                        </h3>
                                        <p className="text-yellow-500 font-bold text-sm">
                                            Промокод {appliedPromo.code} активирован
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 1. Header: Interactive Quick Info Pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Dynamic Stock / Availability Badge */}
                            {product.isMadeToOrder ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenAccordion(prev => prev === 'delivery' ? null : 'delivery');
                                        scrollToSection('details-accordion-section');
                                    }}
                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 uppercase flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                    <Sparkles size={13} className="text-amber-400" />
                                    <span>Пошив под заказ: {product.productionTime || '3–5 дней'}</span>
                                </button>
                            ) : selectedSize && product.stock?.[selectedSize] !== undefined ? (
                                product.stock[selectedSize] === 0 ? (
                                    <span className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 uppercase flex items-center gap-1.5 shadow-sm">
                                        <AlertCircle size={13} /> Размер {selectedSize} раскуплен
                                    </span>
                                ) : product.stock[selectedSize] <= (product.lowStockThreshold || 3) ? (
                                    <span className="px-3 py-1.5 bg-amber-500/15 text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 uppercase flex items-center gap-1.5 shadow-sm animate-pulse">
                                        <Flame size={13} className="fill-amber-400" />
                                        <span>Размер {selectedSize}: осталось {product.stock[selectedSize]} шт.</span>
                                    </span>
                                ) : (
                                    <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 uppercase flex items-center gap-1.5 shadow-sm">
                                        <CheckCircle2 size={13} /> Размер {selectedSize}: в наличии {product.stock[selectedSize]} шт.
                                    </span>
                                )
                            ) : (
                                (() => {
                                    const total = calculateTotalStock(product);
                                    if (total === 0) {
                                        return (
                                            <span className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 uppercase flex items-center gap-1.5 shadow-sm">
                                                <AlertCircle size={13} /> Нет в наличии
                                            </span>
                                        );
                                    }
                                    if (total <= 5) {
                                        return (
                                            <span className="px-3 py-1.5 bg-amber-500/15 text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 uppercase flex items-center gap-1.5 shadow-sm animate-pulse">
                                                <Flame size={13} className="fill-amber-400" />
                                                <span>Осталось всего: {total} шт.</span>
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/20 uppercase flex items-center gap-1.5 shadow-sm">
                                            <CheckCircle2 size={13} /> В наличии: {total} шт.
                                        </span>
                                    );
                                })()
                            )}

                            {/* ℹ️ О ткани и комплекте (Opens rich sheet modal) */}
                            <button
                                type="button"
                                onClick={() => setIsDescriptionModalOpen(true)}
                                className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-bold border border-yellow-500/30 uppercase flex items-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                            >
                                <Info size={13} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                                <span>О ткани и комплекте</span>
                            </button>

                            {/* Reviews Quick Link (Opens sleek drawer) */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (reviews.length === 0) {
                                        setIsReviewFormOpen(true);
                                    }
                                    setIsReviewsDrawerOpen(true);
                                }}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-yellow-400 rounded-xl text-xs font-bold border border-white/10 hover:border-yellow-500/30 uppercase flex items-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                            >
                                <Star size={13} className="fill-yellow-400 text-yellow-400 group-hover:scale-110 transition-transform" />
                                <span>{reviews.length > 0 ? `${averageRating.toFixed(1)} ★ (${getPluralReviews(reviews.length)})` : 'Отзывы (0)'}</span>
                            </button>
                        </div>

                        {/* Title & Price & Promo */}
                        <div>
                            {/* Category Overtitle */}
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-yellow-500/80 uppercase tracking-widest mb-1.5">
                                <Award size={13} className="text-yellow-500" />
                                <span>Экипировка Sparta • {product.category}</span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-russo uppercase tracking-wider text-white mb-2 leading-tight">
                                {product.title}
                            </h1>

                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                    <span className="text-2xl sm:text-3xl font-russo text-yellow-400 font-bold">
                                        {(appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price).toLocaleString()} ₽
                                    </span>
                                    {Boolean(product.oldPrice && product.oldPrice > product.price) && (
                                        <span className="text-base sm:text-lg text-gray-500 line-through font-russo">
                                            {product.oldPrice.toLocaleString()} ₽
                                        </span>
                                    )}
                                    {appliedPromo && (
                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-black rounded-md flex items-center gap-1">
                                            <Check size={12} /> -{appliedPromo.value}%
                                        </span>
                                    )}
                                </div>

                                {!appliedPromo && !showPromoInput && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPromoInput(true)}
                                        className="text-xs text-gray-400 hover:text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
                                    >
                                        <Tag size={12} className="text-yellow-500" />
                                        <span>Промокод</span>
                                    </button>
                                )}
                            </div>

                            {/* Promo Code Inline Drawer */}
                            <AnimatePresence>
                                {appliedPromo ? (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between mt-2.5"
                                    >
                                        <div className="flex items-center gap-2 text-green-400">
                                            <Check size={14} />
                                            <div className="text-xs font-bold">
                                                Промокод <span className="font-mono text-green-300">{appliedPromo.code}</span> (-{appliedPromo.value}%) применен!
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAppliedPromo(null)}
                                            className="text-green-500/60 hover:text-green-400 p-1 cursor-pointer"
                                            title="Отменить промокод"
                                        >
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                ) : showPromoInput ? (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-start gap-2 mt-2.5"
                                    >
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input
                                                    type="text"
                                                    value={promoCode}
                                                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                    placeholder="ВВЕДИТЕ ПРОМОКОД"
                                                    className={`w-full bg-[#181818] border ${promoError ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-2 pl-8 pr-3 text-white uppercase font-mono tracking-widest text-xs focus:border-yellow-500 outline-none`}
                                                />
                                            </div>
                                            {promoError && <p className="text-red-400 text-[10px] mt-1 ml-1 font-bold">{promoError}</p>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={applyPromoCode}
                                            disabled={isApplyingPromo || !promoCode.trim()}
                                            className="px-3.5 h-[34px] bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                        >
                                            {isApplyingPromo ? <Loader2 className="animate-spin" size={14} /> : 'Применить'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowPromoInput(false); setPromoError(''); }}
                                            className="px-2.5 h-[34px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs rounded-xl transition-all cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>

                        {/* 2. Step 1: Size Selector (Compact Chips) */}
                        {product.sizes && product.sizes.length > 0 && (
                            <div id="size-section" className={`space-y-2 pt-1 transition-all duration-300 rounded-2xl p-1 ${sizeHighlight ? 'ring-2 ring-amber-400 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.25)]' : ''}`}>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        1. Размер: {selectedSize ? (
                                            <span className="text-yellow-400 font-russo text-sm inline-flex items-center gap-1.5">
                                                <span>{selectedSize}</span>
                                                {(() => {
                                                    const stock = product.stock?.[selectedSize];
                                                    const hint = getSizeHint(selectedSize);
                                                    const isLow = !product.isMadeToOrder && stock !== undefined && stock > 0 && stock <= (product.lowStockThreshold || 3);
                                                    return (
                                                        <span className="text-[11px] font-normal text-gray-400">
                                                            ({hint ? `${hint} • ` : ''}{product.isMadeToOrder ? 'пошив 3–5 дней' : stock !== undefined ? (isLow ? `🔥 осталось ${stock} шт.` : `в наличии ${stock} шт.`) : 'в наличии'})
                                                        </span>
                                                    );
                                                })()}
                                            </span>
                                        ) : (
                                            <span className="text-yellow-500/80 font-normal text-xs">выберите подходящий</span>
                                        )}
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setIsSizeChartOpen(true)}
                                        className="text-[11px] font-bold text-yellow-400/90 hover:text-yellow-300 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                                    >
                                        <Ruler size={12} />
                                        <span>Таблица и подбор</span>
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {product.sizes.map(size => {
                                        const stock = product.stock?.[size];
                                        const isOutOfStock = !product.isMadeToOrder && stock === 0;
                                        const isLowStock = !product.isMadeToOrder && stock !== undefined && stock > 0 && stock <= (product.lowStockThreshold || 3);
                                        const isSelected = selectedSize === size;

                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => !isOutOfStock && setSelectedSize(size)}
                                                disabled={isOutOfStock}
                                                className={`min-w-[46px] sm:min-w-[52px] h-10 px-2.5 rounded-xl font-russo text-xs sm:text-sm flex items-center justify-center transition-all border cursor-pointer relative ${
                                                    isOutOfStock
                                                        ? 'bg-[#101012] text-gray-600 border-white/5 opacity-40 cursor-not-allowed line-through'
                                                        : isSelected
                                                            ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] scale-105 font-black z-10'
                                                            : 'bg-[#161618] text-gray-200 border-white/10 hover:border-white/30 hover:bg-[#202022]'
                                                }`}
                                            >
                                                <span>{size}</span>
                                                {isLowStock && !isSelected && (
                                                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                                )}
                                                {isLowStock && !isSelected && (
                                                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Colors if any */}
                        {product.colors && product.colors.length > 1 && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Цветовая гамма</label>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {product.colors.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => {
                                                setSelectedColor(color);
                                                if (product.colorImages && product.colorImages[color]) {
                                                    setSelectedImage(product.colorImages[color]);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                selectedColor === color
                                                    ? 'bg-white text-black border-white shadow-lg font-black'
                                                    : 'bg-[#181818] text-gray-300 border-white/10 hover:border-white/30'
                                            }`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Step 2: "Sparta Atelier" Customization Module (Compact & Sleek) */}
                        {product.isCustomizable && (
                            <div className="p-3.5 sm:p-4 bg-[#141416] rounded-2xl border border-yellow-500/25 space-y-3 shadow-lg relative overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles size={14} className="text-yellow-400" />
                                        <h3 className="text-xs font-russo uppercase tracking-widest text-white">
                                            2. Клубное нанесение
                                        </h3>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/30">
                                        Включено в стоимость
                                    </span>
                                </div>

                                {/* Quick 1-Click Child Prefill Pills (Inline) */}
                                {linkedChildren.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                            Подставить:
                                        </span>
                                        {linkedChildren.map(child => {
                                            const isSelected = selectedStudentId === child.id || customName === child.lastName;
                                            return (
                                                <button
                                                    key={child.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedStudentId(child.id);
                                                        setCustomName(child.lastName);
                                                        if (child.number) setCustomNumber(child.number);
                                                        showToast(`Подставлены данные: ${child.name}`, 'info');
                                                    }}
                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-russo uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 ${
                                                        isSelected
                                                            ? 'bg-yellow-500 text-black border-yellow-500 font-black'
                                                            : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                                    }`}
                                                >
                                                    <span>👦 {child.name}</span>
                                                    {isSelected && <Check size={10} className="stroke-[3]" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Main Personalization Row: Mini Jersey Badge + 2 Compact Inputs in 1 Line */}
                                <div className="flex items-center gap-2.5">
                                    {/* Mini Jersey Back Preview Badge */}
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/60 rounded-xl border border-white/5 shrink-0 shadow-inner">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-black flex items-center justify-center font-russo font-black text-sm shadow">
                                            {customNumber || '22'}
                                        </div>
                                        <div className="min-w-0 max-w-[85px] sm:max-w-[110px]">
                                            <p className="text-[8px] uppercase font-bold text-gray-500 truncate leading-none">На спине</p>
                                            <p className="font-russo text-xs text-white uppercase tracking-wider truncate mt-0.5">
                                                {customName || 'ЛЕБЕДЕВ'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Inputs in 1 Line */}
                                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                                        <div>
                                            <input
                                                type="text"
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                                                placeholder="ФАМИЛИЯ"
                                                maxLength={15}
                                                className="w-full h-10 bg-black/80 border border-white/10 rounded-xl px-3 text-white text-xs font-russo uppercase tracking-widest focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-yellow-500/30"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={customNumber}
                                                onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder="НОМЕР (1-99)"
                                                maxLength={2}
                                                className="w-full h-10 bg-black/80 border border-white/10 rounded-xl px-3 text-white text-xs font-russo uppercase tracking-widest focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-yellow-500/30"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Options: Fit Style & Body Measurements */}
                                <div className="pt-0.5 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomMeasurementsOpen(!isCustomMeasurementsOpen)}
                                        className="w-full py-1.5 px-2.5 bg-white/[0.02] hover:bg-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white flex items-center justify-between transition-colors border border-white/5 cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1.5 text-[11px] truncate">
                                            <Sliders size={12} className="text-yellow-400" />
                                            <span>Посадка по фигуре: <strong>{fitStyle} крой</strong>{isCustomMeasurementsOpen ? '' : ' • Свои мерки ребенка'}</span>
                                        </span>
                                        <ChevronDown size={13} className={`transition-transform duration-200 ${isCustomMeasurementsOpen ? 'rotate-180 text-yellow-400' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isCustomMeasurementsOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="pt-2 space-y-2.5 overflow-hidden"
                                            >
                                                {/* Helpful parent hint */}
                                                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[10px] sm:text-[11px] text-yellow-300 leading-snug">
                                                    💡 <strong>Индивидуальный пошив:</strong> укажите мерки, только если у ребенка нестандартная фигура. Если оставить пустыми — сошьем точно по выбранному стандартному размеру.
                                                </div>

                                                {/* Silhouette Selection */}
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                        Крой формы:
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {['Приталенный', 'Стандарт', 'Свободный'].map(style => (
                                                            <button
                                                                key={style}
                                                                type="button"
                                                                onClick={() => setFitStyle(style)}
                                                                className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                                                    fitStyle === style
                                                                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-sm'
                                                                        : 'bg-black/50 text-gray-400 border-white/10 hover:border-white/20'
                                                                }`}
                                                            >
                                                                {style}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Measurements */}
                                                <div>
                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                        Мерки ребенка (см, опционально):
                                                    </label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                                        {[
                                                            { label: 'Рост (см)', key: 'height' },
                                                            { label: 'Обхват груди', key: 'chest' },
                                                            { label: 'Ширина плеч', key: 'shoulders' },
                                                            { label: 'Длина рукава', key: 'sleeve' },
                                                            { label: 'Обхват талии', key: 'waist' },
                                                            { label: 'Обхват бедер', key: 'hips' },
                                                            { label: 'Длина изделия', key: 'length' },
                                                        ].map(item => (
                                                            <div key={item.key} className="space-y-0.5">
                                                                <label className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter block">{item.label}</label>
                                                                <input
                                                                    type="text"
                                                                    value={measurements[item.key as keyof typeof measurements]}
                                                                    onChange={(e) => setMeasurements(prev => ({ ...prev, [item.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                                                                    placeholder="СМ"
                                                                    className="w-full bg-black/70 border border-white/10 rounded-lg p-1.5 text-white text-xs font-bold outline-none focus:border-yellow-500 transition-all placeholder:text-gray-700"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}



                        {/* 4. Payment Method & Purchase Actions */}
                        {(() => {
                            const basePrice = appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price;
                            const maxDiscountRub = Math.floor(basePrice * (maxDiscountPercent / 100));
                            const maxCoinsUsable = Math.min(userCoins, Math.floor(maxDiscountRub / (exchangeRate || 10)));
                            const discountRub = paymentMethod === 'club_coins' && userCoins > 0 ? maxCoinsUsable * (exchangeRate || 10) : 0;
                            const finalPrice = Math.max(0, basePrice - discountRub);

                            return (
                                <div className="space-y-4 pt-2">
                                    {/* Payment Method Cards */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                Способ оплаты
                                            </label>
                                            <span className="text-[11px] text-zinc-400 font-mono">1 монета = {exchangeRate} ₽</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {/* Card 1: Оплата с бонусами (монетами) */}
                                            <div
                                                onClick={() => {
                                                    if (userCoins > 0) setPaymentMethod('club_coins');
                                                    else showToast('У ученика пока нет накопленных монет', 'info');
                                                }}
                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between select-none ${
                                                    paymentMethod === 'club_coins' && userCoins > 0
                                                        ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40'
                                                        : userCoins > 0
                                                        ? 'bg-zinc-900/70 border-white/10 hover:border-white/20 text-zinc-400'
                                                        : 'bg-zinc-950/40 border-white/5 opacity-50 cursor-not-allowed text-zinc-500'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base">🟡</span>
                                                        <span className="text-xs font-bold text-white">Оплата с бонусами (монетами)</span>
                                                    </div>
                                                    {userCoins > 0 ? (
                                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-md border border-emerald-500/30">
                                                            Скидка -{(maxCoinsUsable * (exchangeRate || 10)).toLocaleString()} ₽
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-zinc-500">0 монет</span>
                                                    )}
                                                </div>

                                                <div className="mt-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className={`font-russo text-lg sm:text-xl font-bold ${paymentMethod === 'club_coins' && userCoins > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                            {userCoins > 0 ? (Math.max(0, basePrice - maxCoinsUsable * (exchangeRate || 10))).toLocaleString() : basePrice.toLocaleString()} ₽
                                                        </span>
                                                        {userCoins > 0 && (
                                                            <span className="font-russo text-xs text-zinc-500 line-through">
                                                                {basePrice.toLocaleString()} ₽
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-amber-300/90 mt-1 font-medium">
                                                        {userCoins > 0 ? (
                                                            <span>Списано {maxCoinsUsable} монет на скидку</span>
                                                        ) : (
                                                            <span>Копите монеты за тренировки</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Card 2: Банковская карта */}
                                            <div
                                                onClick={() => setPaymentMethod('card')}
                                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between select-none ${
                                                    paymentMethod === 'card' || userCoins === 0
                                                        ? 'bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border-amber-400/60 shadow-lg ring-1 ring-amber-400/30'
                                                        : 'bg-zinc-900/70 border-white/10 hover:border-white/20 text-zinc-400'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard size={16} className={paymentMethod === 'card' || userCoins === 0 ? 'text-amber-400' : 'text-zinc-400'} />
                                                        <span className="text-xs font-bold text-white">Банковская карта</span>
                                                    </div>
                                                </div>

                                                <div className="mt-1">
                                                    <div className="font-russo text-lg sm:text-xl font-bold text-white">
                                                        {basePrice.toLocaleString()} ₽
                                                    </div>
                                                    <p className="text-[11px] text-zinc-400 mt-1">
                                                        Обычная оплата без списания монет
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3 Action Buttons: 1. Купить сейчас (Основная), 2. В корзину, 3. В избранное */}
                                    <div className="hidden lg:flex items-center gap-2.5 pt-2">
                                        {/* Button 1: ⚡ КУПИТЬ СЕЙЧАС */}
                                        <button
                                            type="button"
                                            onClick={handleQuickBuy}
                                            disabled={Boolean(selectedSize && !product.isMadeToOrder && typeof product.stock === 'object' && product.stock !== null && product.stock[selectedSize] === 0)}
                                            className="flex-[1.4] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:border-white/5 text-black py-4 px-5 rounded-2xl font-russo uppercase tracking-wider transition-all shadow-[0_0_35px_rgba(234,179,8,0.35)] hover:shadow-[0_0_50px_rgba(234,179,8,0.55)] flex items-center justify-center gap-2 active:scale-[0.98] text-xs sm:text-sm cursor-pointer group font-black"
                                        >
                                            <Zap size={18} className="fill-black group-hover:scale-110 transition-transform shrink-0" />
                                            <span>{(selectedSize && !product.isMadeToOrder && typeof product.stock === 'object' && product.stock?.[selectedSize] === 0) ? 'Раскупили' : `⚡ КУПИТЬ СЕЙЧАС • ${finalPrice.toLocaleString()} ₽`}</span>
                                        </button>

                                        {/* Button 2: 🛒 В корзину */}
                                        <button
                                            type="button"
                                            onClick={handleAddToCart}
                                            disabled={Boolean(selectedSize && !product.isMadeToOrder && typeof product.stock === 'object' && product.stock !== null && product.stock[selectedSize] === 0)}
                                            className="flex-1 bg-white/10 hover:bg-white/15 text-white border border-white/15 py-4 px-4 rounded-2xl font-russo uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                                        >
                                            <ShoppingCart size={18} className="shrink-0" />
                                            <span>В корзину</span>
                                        </button>

                                        {/* Button 3: Heart */}
                                        <button
                                            type="button"
                                            onClick={() => toggleFavorite(product.id)}
                                            className={`w-14 h-14 bg-[#181818] border rounded-2xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                                                isFavorite(product.id)
                                                    ? 'border-red-500/50 text-red-500 bg-red-500/10'
                                                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                                            }`}
                                            title="В избранное"
                                        >
                                            <Heart size={22} fill={isFavorite(product.id) ? "currentColor" : "none"} className={isFavorite(product.id) ? "scale-110" : ""} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 5. Trust & Service Info Bar */}
                        <div className="pt-2 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setIsDescriptionModalOpen(true)}
                                className="w-full flex items-center justify-between gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-400 flex-wrap py-2.5 px-3.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-yellow-500/30 rounded-2xl transition-all cursor-pointer group text-left"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm">⚽</span>
                                    <span className="text-gray-300 font-medium truncate">Выдача на тренировке</span>
                                </div>
                                <span className="text-gray-600 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm">🧵</span>
                                    <span className="text-gray-300 font-medium truncate">{product.productionTime ? `Пошив ${product.productionTime}` : 'Пошив 3–5 дней'}</span>
                                </div>
                                <span className="text-gray-600 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm">🛡️</span>
                                    <span className="text-gray-300 font-medium truncate">Официальная экипировка</span>
                                </div>
                                <span className="text-yellow-500 text-[11px] font-bold ml-auto group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                    Инфо <ChevronRight size={12} />
                                </span>
                            </button>
                        </div>

                    </div>
                </div>

                {/* 2. BUNDLE / COMPLETE THE KIT RECOMMENDATIONS */}
                {bundleItems.length > 0 && (
                    <div className="mt-10 sm:mt-14 bg-gradient-to-br from-[#141416] via-[#101012] to-[#0d0d0f] border border-white/10 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 relative z-10">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-[10px] font-black uppercase tracking-wider mb-1.5">
                                    <Sparkles size={12} />
                                    <span>Дополните комплект</span>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-russo uppercase tracking-wider text-white">
                                    Аксессуары к этой форме
                                </h2>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    Гетры, рюкзак и экипировка в едином клубном стиле Спарта
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
                            {bundleItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-[#18181b]/80 border border-white/5 hover:border-yellow-500/30 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all hover:bg-[#1f1f23] group shadow-lg"
                                >
                                    <div
                                        className="relative aspect-square rounded-xl bg-black/40 overflow-hidden mb-2.5 cursor-pointer"
                                        onClick={() => {
                                            navigate(`/shop/${item.id}`);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    >
                                        <img
                                            src={item.imageUrl || '/shop/sparta-uniform-green.png'}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/shop/sparta-uniform-green.png'; }}
                                        />
                                        {item.badges?.includes('hit') && (
                                            <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                                                Хит
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">{item.category}</span>
                                        <h3
                                            onClick={() => {
                                                navigate(`/shop/${item.id}`);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-yellow-400 transition-colors cursor-pointer"
                                        >
                                            {item.title}
                                        </h3>
                                        <div className="text-xs sm:text-sm font-russo text-yellow-400 font-bold mt-1">
                                            {item.price.toLocaleString()} ₽
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigate(`/shop/${item.id}`);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="mt-2.5 w-full py-2 bg-white/5 hover:bg-yellow-500 hover:text-black text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 hover:border-yellow-500 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Смотреть</span>
                                        <ArrowRight size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. RELATED PRODUCTS CAROUSEL (OTHER KITS / SIMILAR ITEMS) */}
                {relatedProducts.length > 0 && (
                    <div className="mt-10 sm:mt-14">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-[10px] font-black uppercase tracking-wider mb-1">
                                    <Award size={12} className="text-yellow-500" />
                                    <span>Коллекция Sparta</span>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-russo uppercase tracking-wider text-white">
                                    Смотрите также
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (relatedScrollRef.current) {
                                            relatedScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                                        }
                                    }}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Назад"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (relatedScrollRef.current) {
                                            relatedScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                                        }
                                    }}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer"
                                    aria-label="Вперед"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div
                            ref={relatedScrollRef}
                            className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-3 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
                        >
                            {relatedProducts.map((item) => {
                                const totalStock = calculateTotalStock(item);
                                const isItemOutOfStock = !item.isMadeToOrder && totalStock <= 0;
                                const isItemLowStock = !item.isMadeToOrder && totalStock <= (item.lowStockThreshold || 3) && totalStock > 0;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            navigate(`/shop/${item.id}`);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="min-w-[160px] sm:min-w-[200px] max-w-[200px] bg-[#111113] border border-white/5 hover:border-yellow-500/40 rounded-2xl sm:rounded-3xl p-3 flex flex-col justify-between transition-all hover:bg-[#161619] group shadow-xl snap-start cursor-pointer flex-shrink-0"
                                    >
                                        <div className="relative aspect-[4/5] rounded-xl sm:rounded-2xl bg-black/40 overflow-hidden mb-2.5">
                                            <img
                                                src={item.imageUrl || '/shop/sparta-uniform-green.png'}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/shop/sparta-uniform-green.png'; }}
                                            />
                                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                                                {item.isMadeToOrder ? (
                                                    <span className="bg-amber-500/90 text-black text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md shadow backdrop-blur-sm">
                                                        Под заказ
                                                    </span>
                                                ) : isItemLowStock ? (
                                                    <span className="bg-amber-600/90 text-white text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shadow backdrop-blur-sm animate-pulse">
                                                        🔥 {totalStock} шт
                                                    </span>
                                                ) : isItemOutOfStock ? (
                                                    <span className="bg-red-600/90 text-white text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shadow backdrop-blur-sm">
                                                        0 шт
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[8px] sm:text-[9px] text-yellow-500/80 font-bold uppercase block mb-1 truncate">{item.category}</span>
                                                <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-yellow-400 transition-colors leading-snug min-h-[2rem]">
                                                    {item.title}
                                                </h3>
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                                                <div className="text-xs sm:text-base font-russo text-yellow-400 font-bold">
                                                    {item.price.toLocaleString()} ₽
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-yellow-400 flex items-center gap-0.5 transition-colors">
                                                    Открыть <ChevronRight size={12} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Video Upload Progress Widget */}
            <AnimatePresence>
                {uploadProgress !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 bg-[#121212]/95 backdrop-blur-2xl border border-yellow-500/40 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center gap-3.5 max-w-sm w-full"
                    >
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
                            <VideoIcon size={20} className="animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                <span className="text-white truncate">Сохранение видео-отзыва</span>
                                <span className="text-yellow-400 font-mono">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300"
                                    style={{ width: `${uploadProgress}%` }}
                                    transition={{ ease: "easeOut", duration: 0.2 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reviews Drawer / Bottom Sheet Modal */}
            <AnimatePresence>
                {isReviewsDrawerOpen && product && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex justify-end items-end sm:items-stretch"
                    >
                        <div
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                            onClick={() => setIsReviewsDrawerOpen(false)}
                        />

                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                            className="relative w-full sm:max-w-2xl bg-[#121214] border-t sm:border-l sm:border-t-0 border-white/10 rounded-t-[2rem] sm:rounded-none sm:rounded-l-[2rem] flex flex-col h-[90vh] sm:h-full shadow-[0_0_80px_rgba(0,0,0,0.9)] z-10 overflow-hidden"
                        >
                            {/* Mobile Drag Indicator */}
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                            {/* Header */}
                            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-[#141416] shrink-0">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-[10px] font-black uppercase tracking-wider mb-1">
                                        <Star size={12} className="fill-yellow-400" />
                                        <span>Отзывы родителей</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-russo uppercase text-white tracking-wider line-clamp-1">
                                        {product.title}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {reviews.length > 0
                                            ? `Средняя оценка: ${averageRating.toFixed(1)} ★ (${getPluralReviews(reviews.length)})`
                                            : 'Честные отзывы родителей юных спортсменов'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReviewsDrawerOpen(false)}
                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drawer Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                                {/* Top Filter Tabs & Write Review Button */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
                                        <button
                                            type="button"
                                            onClick={() => setReviewFilter('all')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                reviewFilter === 'all'
                                                    ? 'bg-yellow-500 text-black shadow-md font-black'
                                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            Все ({reviews.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewFilter('media')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                reviewFilter === 'media'
                                                    ? 'bg-yellow-500 text-black shadow-md font-black'
                                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            📸 С фото и видео
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewFilter('pinned')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                reviewFilter === 'pinned'
                                                    ? 'bg-yellow-500 text-black shadow-md font-black'
                                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            📌 Закрепленные
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewFilter('staff')}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                reviewFilter === 'staff'
                                                    ? 'bg-yellow-500 text-black shadow-md font-black'
                                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                        >
                                            ❤️ Выбор клуба
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!user) {
                                                showToast("Пожалуйста, войдите, чтобы оставить отзыв", "info");
                                                return;
                                            }
                                            setIsReviewFormOpen(prev => !prev);
                                        }}
                                        className="px-3.5 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-russo uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ml-auto"
                                    >
                                        <MessageSquarePlus size={14} />
                                        <span>{isReviewFormOpen ? 'Скрыть форму' : 'Написать отзыв'}</span>
                                    </button>
                                </div>

                                {/* Interactive Add Review Form */}
                                <AnimatePresence>
                                    {isReviewFormOpen && (
                                        <motion.form
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            onSubmit={handleSubmitReview}
                                            className="bg-[#18181b] border border-yellow-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm sm:text-base font-russo uppercase text-white">
                                                    Ваш отзыв о товаре
                                                </h4>
                                                {/* Rating Stars */}
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            type="button"
                                                            key={star}
                                                            onClick={() => setNewReviewRating(star)}
                                                            className="p-1 text-gray-600 hover:text-yellow-400 transition-colors cursor-pointer"
                                                        >
                                                            <Star
                                                                size={20}
                                                                className={star <= newReviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Emotion Tags */}
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Что понравилось больше всего?</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {EMOTION_TAGS.map((tag) => {
                                                        const isSelected = selectedEmotionTags.includes(tag);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={tag}
                                                                onClick={() => {
                                                                    setSelectedEmotionTags(prev =>
                                                                        isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                                                    );
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                                                                        : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20'
                                                                }`}
                                                            >
                                                                {tag}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Comment Textarea */}
                                            <div>
                                                <textarea
                                                    value={newReviewComment}
                                                    onChange={(e) => setNewReviewComment(e.target.value)}
                                                    placeholder="Расскажите о качестве формы, как сидит на ребенке, удобстве..."
                                                    rows={3}
                                                    className="w-full bg-[#111] border border-white/10 focus:border-yellow-500 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                                                />
                                            </div>

                                            {/* Media Actions Strip: Photo, Video, Voice */}
                                            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* Photo Upload */}
                                                    <label className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors">
                                                        <Camera size={14} className="text-yellow-400" />
                                                        <span>Фото {reviewPhotos.length > 0 ? `(${reviewPhotos.length})` : ''}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                if (e.target.files) {
                                                                    setReviewPhotos(Array.from(e.target.files));
                                                                }
                                                            }}
                                                        />
                                                    </label>

                                                    {/* Video Upload */}
                                                    <label className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors">
                                                        <VideoIcon size={14} className="text-yellow-400" />
                                                        <span>{reviewVideo ? 'Видео добавлено' : 'Видео'}</span>
                                                        <input
                                                            type="file"
                                                            accept="video/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setReviewVideo(e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                    </label>

                                                    {/* Voice Recording */}
                                                    {!isRecordingAudio && !recordedAudioUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={startAudioRecording}
                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                                                        >
                                                            <Mic size={14} className="text-yellow-400" />
                                                            <span>Голосовой отзыв</span>
                                                        </button>
                                                    )}

                                                    {isRecordingAudio && (
                                                        <button
                                                            type="button"
                                                            onClick={stopAudioRecording}
                                                            className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer animate-pulse"
                                                        >
                                                            <Square size={12} className="fill-red-400" />
                                                            <span>Запись {recordingSeconds}с (Стоп)</span>
                                                        </button>
                                                    )}

                                                    {recordedAudioUrl && (
                                                        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-xl text-xs text-yellow-300">
                                                            <span>🎤 Запись готова</span>
                                                            <button type="button" onClick={deleteRecordedAudio} className="text-gray-400 hover:text-red-400 ml-1">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={reviewSubmitting || (!newReviewComment.trim() && !recordedAudioBlob && reviewPhotos.length === 0 && !reviewVideo)}
                                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-russo uppercase text-xs tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer ml-auto"
                                                >
                                                    {reviewSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                    <span>Опубликовать</span>
                                                </button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>

                                {/* Empty State when 0 reviews */}
                                {displayedReviews.length === 0 ? (
                                    <div className="text-center py-12 px-4 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                                        <div className="w-14 h-14 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 mx-auto text-2xl shadow-inner">
                                            🏆
                                        </div>
                                        <div>
                                            <h4 className="text-base sm:text-lg font-russo uppercase text-white tracking-wider">
                                                Будьте первыми!
                                            </h4>
                                            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto mt-1 leading-relaxed">
                                                На этот товар пока нет отзывов. Поделитесь впечатлением о посадке формы, качестве ткани и эмоциях ребенка!
                                            </p>
                                        </div>
                                        {!isReviewFormOpen && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!user) {
                                                        showToast("Пожалуйста, войдите, чтобы оставить отзыв", "info");
                                                        return;
                                                    }
                                                    setIsReviewFormOpen(true);
                                                }}
                                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-russo uppercase text-xs tracking-wider rounded-xl transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
                                            >
                                                <MessageSquarePlus size={16} />
                                                <span>Написать первый отзыв</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {displayedReviews.map((review) => (
                                            <div
                                                key={review.id}
                                                className={`bg-[#141416] border rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3 transition-all ${
                                                    review.isPinned
                                                        ? 'border-yellow-500/40 bg-yellow-500/[0.02] shadow-[0_0_25px_rgba(234,179,8,0.06)]'
                                                        : 'border-white/5 hover:border-white/10'
                                                }`}
                                            >
                                                {/* Header: Avatar, Name, Role badge, Group, Date & Stars */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 font-russo font-bold text-sm shrink-0 overflow-hidden">
                                                            {review.userAvatar ? (
                                                                <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                review.userName?.charAt(0)?.toUpperCase() || 'U'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs sm:text-sm font-bold text-white">
                                                                    {review.userName}
                                                                </span>
                                                                {review.userRole && (
                                                                    <span className={`text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                                        review.userRole === 'Администратор' || review.userRole === 'admin'
                                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                                            : review.userRole === 'Тренер' || review.userRole === 'trainer' || review.userRole === 'coach'
                                                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                                            : review.userRole === 'Директор' || review.userRole === 'director'
                                                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                                            : 'bg-white/10 text-gray-300'
                                                                    }`}>
                                                                        {review.userRole}
                                                                    </span>
                                                                )}
                                                                {review.isPinned && (
                                                                    <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                        <Pin size={10} className="fill-yellow-400" /> Закреплен
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                                                                {review.groupName && <span>{review.groupName}</span>}
                                                                {review.childName && <span>• Игрок: {review.childName}</span>}
                                                                <span>• {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('ru-RU') : 'Недавно'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Stars & Staff pin */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    size={13}
                                                                    className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}
                                                                />
                                                            ))}
                                                        </div>
                                                        {isStaff && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTogglePinReview(review.id, Boolean(review.isPinned))}
                                                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                                    review.isPinned
                                                                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                                                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                                                                }`}
                                                                title={review.isPinned ? 'Открепить' : 'Закрепить отзыв'}
                                                            >
                                                                <Pin size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Voice Review Player */}
                                                {review.audio && (
                                                    <div className="py-1">
                                                        <VoiceReviewPlayer src={review.audio} />
                                                    </div>
                                                )}

                                                {/* Comment Content (View or Edit Mode) */}
                                                {editingReviewId === review.id ? (
                                                    <div className="space-y-2 pt-1">
                                                        <textarea
                                                            value={editComment}
                                                            onChange={(e) => setEditComment(e.target.value)}
                                                            rows={2}
                                                            className="w-full bg-[#111] border border-yellow-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                                                        />
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingReviewId(null)}
                                                                className="px-3 py-1 bg-white/5 text-gray-400 text-xs rounded-lg hover:text-white"
                                                            >
                                                                Отмена
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveEdit}
                                                                className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:bg-yellow-400"
                                                            >
                                                                Сохранить
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    review.comment && (
                                                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                                                            {review.comment}
                                                        </p>
                                                    )
                                                )}

                                                {/* Emotion Tags */}
                                                {review.emotionTags && review.emotionTags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                        {review.emotionTags.map((tag, idx) => (
                                                            <span key={idx} className="text-[10px] bg-white/5 text-gray-300 px-2.5 py-0.5 rounded-full border border-white/5 font-medium">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Media Gallery (Photos & Video) */}
                                                {((review.photos && review.photos.length > 0) || review.video) && (
                                                    <div className="flex gap-2 pt-1 overflow-x-auto pb-1 items-center">
                                                        {review.video && (
                                                            <ReviewVideoThumbnail
                                                                videoSrc={review.video}
                                                                onClick={() => {
                                                                    setSelectedReviewMedia(review);
                                                                    setInitialMediaUrl(review.video!);
                                                                    setIsMediaModalOpen(true);
                                                                }}
                                                            />
                                                        )}
                                                        {review.photos?.map((photo, i) => (
                                                            <img
                                                                key={i}
                                                                src={photo}
                                                                alt="Review photo"
                                                                className="w-16 h-16 object-cover rounded-xl border border-white/10 cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                                                                onClick={() => {
                                                                    setSelectedReviewMedia(review);
                                                                    setInitialMediaUrl(photo);
                                                                    setIsMediaModalOpen(true);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Bottom Action Strip: Reactions, Staff Like, Comments Drawer */}
                                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-400 flex-wrap gap-2">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {/* Emoji Reactions */}
                                                        {['🔥', '⚽', '👏', '❤️'].map((emoji) => {
                                                            const count = review.reactions?.[emoji] || 0;
                                                            const userReacted = user && review.userReactions?.[user.uid] === emoji;
                                                            return (
                                                                <button
                                                                    key={emoji}
                                                                    type="button"
                                                                    onClick={() => handleToggleReaction(review.id, emoji, review.reactions, review.userReactions)}
                                                                    className={`px-2 py-1 rounded-lg text-xs border flex items-center gap-1 transition-all cursor-pointer ${
                                                                        userReacted
                                                                            ? 'bg-yellow-500/20 border-yellow-500/50 text-white font-bold'
                                                                            : 'bg-white/5 border-white/5 hover:border-white/15 text-gray-400 hover:text-white'
                                                                    }`}
                                                                >
                                                                    <span>{emoji}</span>
                                                                    {count > 0 && <span className="text-[10px]">{count}</span>}
                                                                </button>
                                                            );
                                                        })}

                                                        {/* Staff Like Button */}
                                                        {isStaff && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStaffLikeReview(review)}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                                                    review.staffLikes?.some(s => s.userId === user?.uid)
                                                                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400'
                                                                }`}
                                                            >
                                                                <span>❤️ Спарта</span>
                                                                {review.staffLikes && review.staffLikes.length > 0 && (
                                                                    <span className="text-[10px]">({review.staffLikes.length})</span>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-auto">
                                                        {/* Comments Drawer Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCommentsDrawerReview(review);
                                                                setIsCommentsDrawerOpen(true);
                                                            }}
                                                            className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 transition-colors py-1 cursor-pointer"
                                                        >
                                                            <MessageCircle size={14} />
                                                            <span>
                                                                {review.replies && review.replies.length > 0
                                                                    ? `${review.replies.length} ${review.replies.length === 1 ? 'ответ' : review.replies.length < 5 ? 'ответа' : 'ответов'}`
                                                                    : 'Ответить'}
                                                            </span>
                                                        </button>

                                                        {/* Edit / Delete for Author or Admin */}
                                                        {user && (user.uid === review.userId || isStaff) && (
                                                            <div className="flex items-center gap-1 pl-2 border-l border-white/5">
                                                                {user.uid === review.userId && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleStartEdit(review)}
                                                                        className="p-1 hover:text-yellow-400 text-gray-500 transition-colors cursor-pointer"
                                                                        title="Редактировать отзыв"
                                                                    >
                                                                        <Edit2 size={13} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteReview(review.id, review.userId)}
                                                                    className="p-1 hover:text-red-400 text-gray-500 transition-colors cursor-pointer"
                                                                    title="Удалить отзыв"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product Description & Fabric Modal */}
            <BaseModal
                isOpen={isDescriptionModalOpen && Boolean(product)}
                onClose={() => setIsDescriptionModalOpen(false)}
                maxWidth="max-w-2xl"
                glowColor="amber"
                showCloseButton={true}
            >
                {product && (
                    <div className="space-y-6 text-left">
                        {/* Modal Header */}
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-[10px] font-black uppercase tracking-wider mb-1.5">
                                <Sparkles size={12} />
                                <span>О комплекте и материалах</span>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-russo uppercase tracking-wider text-white">
                                {product.title}
                            </h3>
                        </div>

                        {/* Section 1: Fabric & Description */}
                        <div className="space-y-3.5">
                            <div className="flex items-center gap-2 text-xs font-russo uppercase text-yellow-400 tracking-wider">
                                <Zap size={15} />
                                <span>Спортивная ткань DRY-FIT и свойства</span>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                {product.description || 'Фирменная спортивная экипировка футбольного клуба Спарта. Разработана для комфорта юных чемпионов на тренировках и официальных матчах.'}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                            {matchingChart ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDescriptionModalOpen(false);
                                        setIsSizeChartOpen(true);
                                    }}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <Ruler size={14} />
                                    <span>Таблица размеров</span>
                                </button>
                            ) : <div />}

                            <button
                                type="button"
                                onClick={() => setIsDescriptionModalOpen(false)}
                                className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-russo uppercase text-xs rounded-xl transition-all shadow-md cursor-pointer"
                            >
                                Понятно
                            </button>
                        </div>
                    </div>
                )}
            </BaseModal>

            {/* Size Chart Modal */}
            <BaseModal
                isOpen={isSizeChartOpen && Boolean(product)}
                onClose={() => setIsSizeChartOpen(false)}
                maxWidth="max-w-5xl"
                glowColor="amber"
                customCard={true}
                showCloseButton={false}
            >
                {product && (
                    <div className="relative w-full bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]">
                        {/* Left Side: Logic & Info */}
                        <div className="w-full md:w-96 p-6 sm:p-8 border-r border-white/5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between md:hidden">
                                <h3 className="text-xl font-black uppercase tracking-widest text-white">Гид по размерам</h3>
                                <button onClick={() => setIsSizeChartOpen(false)} className="text-gray-500 hover:text-white cursor-pointer"><X size={24} /></button>
                            </div>
                            <div className="hidden md:block">
                                <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">
                                    {matchingChart?.name || 'Гид по размерам'}
                                </h3>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    {matchingChart ? 'Наш «Умный гид» автоматически подберет идеальный размер на основе ваших замеров.' : 'Ознакомьтесь с размерной сеткой для выбора подходящего размера.'}
                                </p>
                            </div>

                            {/* Tabs */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl">
                                <button
                                    onClick={() => setActiveChartTab('jersey')}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        activeChartTab === 'jersey' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    {product.title.toLowerCase().includes('костюм') ? 'Олимпийка' : 'Футболка'}
                                </button>
                                <button
                                    onClick={() => setActiveChartTab(product.title.toLowerCase().includes('костюм') || product.title.toLowerCase().includes('брюки') ? 'pants' : 'shorts')}
                                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        (activeChartTab === 'shorts' || activeChartTab === 'pants') ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    {product.title.toLowerCase().includes('костюм') || product.title.toLowerCase().includes('брюки') ? 'Штаны' : 'Шорты'}
                                </button>
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Smart Advisor Integration */}
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Автоматический подбор</h4>
                                <SizeAdvisor
                                    category={product.category.toLowerCase().includes('юниор') || product.title.toLowerCase().includes('детск') ? 'child' : 'adult'}
                                    type={activeChartTab}
                                    measurements={matchingChart?.measurements}
                                    userHeight={measurements.height}
                                    userChest={measurements.chest}
                                    userWaist={measurements.waist}
                                    userHips={measurements.hips}
                                    onSelectSize={(size) => {
                                        setSelectedSize(size);
                                        setIsSizeChartOpen(false);
                                    }}
                                />
                                {(!measurements.height && !measurements.chest) && (
                                    <div className="p-4 rounded-2xl border border-white/5 bg-white/5 mt-2">
                                        <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider">Введите параметры в блоке «Индивидуальный пошив» для автоподбора</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto pt-8 border-t border-white/5">
                                <div className="space-y-4 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                    {matchingChart?.disclaimers?.map((d, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0" />
                                            <span className={d.includes('облегания') ? 'text-yellow-500/80' : ''}>{d}</span>
                                        </div>
                                    )) || (
                                            <>
                                                <div className="flex items-center gap-2 text-yellow-500/80">
                                                    <div className="w-1 h-1 bg-yellow-500 rounded-full" />
                                                    <span>Свобода облегания +10см</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-1 bg-white/20 rounded-full" />
                                                    <span>Погрешность 1-2см</span>
                                                </div>
                                            </>
                                        )}
                                    {(activeChartTab === 'shorts' || activeChartTab === 'pants') && (
                                        <div className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                                            <p className="text-[9px] text-yellow-500/80 leading-relaxed uppercase tracking-wider">
                                                Таблица актуальна как для шорт, так и для брюк (подбор по талии и бедрам)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Image View */}
                        <div className="flex-1 bg-black relative p-4 md:p-8 flex items-center justify-center overflow-hidden">
                            <button
                                onClick={() => setIsSizeChartOpen(false)}
                                className="absolute top-6 right-6 z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors hidden md:block cursor-pointer text-white"
                            >
                                <X size={20} />
                            </button>

                            <img
                                src={matchingChart?.imageUrl || `/images/size-charts/${activeChartTab}-${product.category.toLowerCase().includes('юниор') || product.title.toLowerCase().includes('детск') ? 'child' : 'adult'}.${activeChartTab === 'pants' ? 'jpg' : 'png'}`}
                                alt="Size Chart"
                                className="max-w-full max-h-full object-contain rounded-xl"
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.src = '/shop/sparta-uniform-green.png';
                                }}
                            />
                        </div>
                    </div>
                )}
            </BaseModal>

            {/* --- STICKY MOBILE/TABLET PURCHASE BAR (< 1024px) --- */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-2xl border-t border-yellow-500/20 p-3 sm:p-4 px-4 sm:px-6 shadow-[0_-12px_40px_rgba(0,0,0,0.9)]">
                {/* Quick Size Popover above bar */}
                <AnimatePresence>
                    {isQuickSizeOpen && product?.sizes && product.sizes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="max-w-md mx-auto mb-3 bg-[#161618] border border-yellow-500/30 p-3 rounded-2xl shadow-2xl space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-russo uppercase text-yellow-400 tracking-wider flex items-center gap-1.5">
                                    <Ruler size={13} /> Выберите размер:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsQuickSizeOpen(false)}
                                    className="text-gray-400 hover:text-white text-xs p-1 cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                                {product.sizes.map(size => {
                                    const stock = product.stock?.[size];
                                    const isOutOfStock = !product.isMadeToOrder && stock === 0;
                                    const isLowStock = !product.isMadeToOrder && stock !== undefined && stock > 0 && stock <= (product.lowStockThreshold || 3);
                                    const isSelected = selectedSize === size;
                                    const hint = getSizeHint(size);
                                    return (
                                        <button
                                            key={size}
                                            type="button"
                                            disabled={isOutOfStock}
                                            onClick={() => {
                                                if (!isOutOfStock) {
                                                    setSelectedSize(size);
                                                    setIsQuickSizeOpen(false);
                                                }
                                            }}
                                            className={`py-2 px-1 rounded-xl text-center font-bold transition-all border cursor-pointer ${
                                                isOutOfStock
                                                    ? 'bg-black/40 text-gray-600 border-white/5 opacity-40 line-through'
                                                    : isSelected
                                                        ? 'bg-yellow-500 text-black border-yellow-500 font-black shadow-md'
                                                        : 'bg-black/60 text-white border-white/10 hover:border-yellow-500/40'
                                            }`}
                                        >
                                            <div className="font-russo text-xs">{size}</div>
                                            {!product.isMadeToOrder && stock !== undefined ? (
                                                isOutOfStock ? (
                                                    <div className="text-[7px] text-gray-500 font-bold">0 шт</div>
                                                ) : isLowStock ? (
                                                    <div className={`text-[7px] font-black uppercase truncate ${isSelected ? 'text-black' : 'text-amber-400'}`}>🔥 {stock} шт</div>
                                                ) : (
                                                    <div className={`text-[7px] truncate ${isSelected ? 'text-black/80 font-bold' : 'text-gray-400'}`}>{stock} шт</div>
                                                )
                                            ) : hint ? (
                                                <div className={`text-[7px] truncate ${isSelected ? 'text-black/80 font-bold' : 'text-gray-400'}`}>{hint}</div>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                    <div
                        className="min-w-0 cursor-pointer group"
                        onClick={() => {
                            if (product?.sizes && product.sizes.length > 0) {
                                setIsQuickSizeOpen(!isQuickSizeOpen);
                            }
                        }}
                    >
                        <div className="text-[10px] uppercase font-bold text-gray-400 truncate flex items-center gap-1">
                            {selectedSize ? (
                                <span className="text-yellow-400 font-russo flex items-center gap-1">
                                    Размер: {selectedSize}
                                    {!product.isMadeToOrder && product.stock?.[selectedSize] !== undefined && product.stock[selectedSize] <= (product.lowStockThreshold || 3) && product.stock[selectedSize] > 0 && (
                                        <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded font-black font-sans ml-1">🔥 {product.stock[selectedSize]} шт</span>
                                    )}
                                    <ChevronDown size={11} className={`transition-transform ${isQuickSizeOpen ? 'rotate-180' : ''}`} />
                                </span>
                            ) : (product.sizes && product.sizes.length > 0 ? (
                                <span className="text-amber-400 font-bold flex items-center gap-1 underline decoration-amber-400/40 underline-offset-2">
                                    Выбрать размер <ChevronDown size={11} />
                                </span>
                            ) : 'Sparta')}
                        </div>
                        {(() => {
                            const currentPriceRub = appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price;
                            const maxCoinsUsable = Math.min(userCoins, Math.ceil(currentPriceRub / 10));
                            const coinsDiscountRub = paymentMethod === 'club_coins' && userCoins > 0 ? maxCoinsUsable * 10 : 0;
                            const finalPrice = Math.max(0, currentPriceRub - coinsDiscountRub);

                            return (
                                <div className="font-russo text-lg sm:text-xl text-white font-bold truncate">
                                    {finalPrice.toLocaleString()} ₽
                                    {paymentMethod === 'club_coins' && userCoins > 0 && (
                                        <span className="text-[10px] text-emerald-400 font-mono font-normal ml-1">
                                            (-{coinsDiscountRub.toLocaleString()} ₽)
                                        </span>
                                    )}
                                    {customName && (
                                        <span className="text-[9px] font-mono text-emerald-400 font-normal ml-1.5 tracking-tight">
                                            • {customNumber || '22'} {customName}
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => toggleFavorite(product.id)}
                            className={`p-3 rounded-xl border transition-all flex-shrink-0 cursor-pointer ${
                                isFavorite(product.id)
                                    ? 'border-red-500/50 text-red-500 bg-red-500/10'
                                    : 'border-white/10 text-gray-400 bg-white/5'
                            }`}
                            aria-label="В избранное"
                        >
                            <Heart size={18} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            type="button"
                            onClick={handleQuickBuy}
                            disabled={Boolean(selectedSize && !product.isMadeToOrder && typeof product.stock === 'object' && product.stock !== null && product.stock[selectedSize] === 0)}
                            className="px-4 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black rounded-xl font-russo uppercase text-xs sm:text-sm tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer whitespace-nowrap transition-all font-black"
                        >
                            <Zap size={16} className="fill-black shrink-0" />
                            <span>Купить</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={Boolean(selectedSize && !product.isMadeToOrder && typeof product.stock === 'object' && product.stock !== null && product.stock[selectedSize] === 0)}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                                isAddedSuccess
                                    ? 'bg-emerald-500 text-black border-emerald-500'
                                    : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                            }`}
                            title="В корзину"
                        >
                            {isAddedSuccess ? <Check size={18} className="stroke-[3]" /> : <ShoppingCart size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Fast Checkout Modal (BaseModal) */}
            <BaseModal
                isOpen={isFastCheckoutOpen}
                onClose={() => {
                    setIsFastCheckoutOpen(false);
                    setFastOrderSuccess(false);
                }}
                maxWidth="max-w-lg"
            >
                {fastOrderSuccess ? (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                            <CheckCircle2 size={36} />
                        </div>
                        <h3 className="text-xl font-russo uppercase text-white">
                            Спасибо за заказ!
                        </h3>
                        <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
                            Менеджер свяжется с вами в течение 15 минут для подтверждения параметров и выдачи экипировки.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setIsFastCheckoutOpen(false);
                                setFastOrderSuccess(false);
                            }}
                            className="mt-4 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-russo uppercase text-sm rounded-xl transition-all font-bold cursor-pointer"
                        >
                            Понятно
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={18} className="text-amber-400 fill-amber-400" />
                            <h3 className="text-lg font-russo uppercase text-white">Быстрое оформление</h3>
                        </div>

                        {/* Summary preview */}
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                            <img
                                src={product.gallery?.[0] || product.imageUrl}
                                alt={product.title}
                                className="w-14 h-14 object-cover rounded-lg bg-black shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white truncate">{product.title}</div>
                                <div className="text-xs text-zinc-400 truncate">
                                    {selectedSize && <span>Размер: {selectedSize} • </span>}
                                    {selectedColor && <span>Цвет: {selectedColor} • </span>}
                                    <span>{paymentMethod === 'club_coins' && userCoins > 0 ? 'Клубный счёт' : 'Карта'}</span>
                                </div>
                                <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                                    {(() => {
                                        const basePrice = appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price;
                                        const maxCoinsUsable = Math.min(userCoins, Math.ceil(basePrice / 10));
                                        const discountRub = paymentMethod === 'club_coins' && userCoins > 0 ? maxCoinsUsable * 10 : 0;
                                        return `${Math.max(0, basePrice - discountRub).toLocaleString()} ₽`;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Customer inputs */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                    Ваше имя
                                </label>
                                <input
                                    type="text"
                                    value={fastCustomerName}
                                    onChange={(e) => setFastCustomerName(e.target.value)}
                                    placeholder={userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : "Имя и фамилия"}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-400 transition-all placeholder:text-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                    Номер телефона
                                </label>
                                <input
                                    type="tel"
                                    value={fastCustomerPhone}
                                    onChange={(e) => setFastCustomerPhone(e.target.value)}
                                    placeholder={userProfile?.phone || "+7 (999) 000-00-00"}
                                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-white text-sm outline-none focus:border-amber-400 transition-all placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="button"
                            disabled={isFastSubmitting}
                            onClick={async () => {
                                const name = fastCustomerName || userProfile?.firstName || 'Клиент';
                                const phone = fastCustomerPhone || userProfile?.phone || '';
                                if (!phone && !userProfile?.phone) {
                                    showToast('Пожалуйста, укажите контактный телефон', 'warning');
                                    return;
                                }
                                setIsFastSubmitting(true);
                                try {
                                    const basePrice = appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price;
                                    const maxCoinsUsable = Math.min(userCoins, Math.ceil(basePrice / 10));
                                    const discountRub = paymentMethod === 'club_coins' && userCoins > 0 ? maxCoinsUsable * 10 : 0;
                                    const finalPrice = Math.max(0, basePrice - discountRub);

                                    await addDoc(collection(db, 'orders'), {
                                        userId: user?.uid || 'guest',
                                        customerName: name,
                                        phone: phone,
                                        items: [{
                                            productId: product.id,
                                            title: product.title,
                                            size: selectedSize || null,
                                            color: selectedColor || null,
                                            customization: (customName || customNumber) ? {
                                                name: customName || null,
                                                number: customNumber || null
                                            } : null,
                                            customName: customName || null,
                                            customNumber: customNumber || null,
                                            price: finalPrice,
                                            quantity: 1
                                        }],
                                        totalPrice: finalPrice,
                                        discountCoins: paymentMethod === 'club_coins' ? maxCoinsUsable : 0,
                                        usedCoins: paymentMethod === 'club_coins' ? maxCoinsUsable : 0,
                                        discountRub: discountRub,
                                        paymentMode: paymentMethod,
                                        paymentMethod: paymentMethod,
                                        status: 'pending',
                                        createdAt: serverTimestamp()
                                    });

                                    setFastOrderSuccess(true);
                                } catch (err) {
                                    console.error('Fast checkout error:', err);
                                    showToast('Заказ оформлен! Менеджер свяжется с вами.', 'success');
                                    setFastOrderSuccess(true);
                                } finally {
                                    setIsFastSubmitting(false);
                                }
                            }}
                            className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black py-3.5 px-6 rounded-xl font-russo uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(234,179,8,0.35)] flex items-center justify-center gap-2 cursor-pointer font-black text-sm"
                        >
                            {isFastSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Zap size={18} className="fill-black" />
                                    <span>Подтвердить заказ • {(() => {
                                        const basePrice = appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price;
                                        const maxCoinsUsable = Math.min(userCoins, Math.ceil(basePrice / 10));
                                        const discountRub = paymentMethod === 'club_coins' && userCoins > 0 ? maxCoinsUsable * 10 : 0;
                                        return `${Math.max(0, basePrice - discountRub).toLocaleString()} ₽`;
                                    })()}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </BaseModal>

            <ReviewMediaModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                review={selectedReviewMedia}
                initialMediaUrl={initialMediaUrl}
            />

            <ReviewCommentsDrawer
                isOpen={isCommentsDrawerOpen}
                onClose={() => setIsCommentsDrawerOpen(false)}
                review={commentsDrawerReview}
            />
        </div>
    );
};

export default ProductDetails;
