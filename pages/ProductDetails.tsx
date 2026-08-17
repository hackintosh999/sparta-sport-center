import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, ShoppingBag, Share2, Heart, ChevronLeft, ChevronRight, Check, AlertCircle, Trash2, Edit2, MessageCircle, MessageSquarePlus, ThumbsUp, X, Camera, Video as VideoIcon, Play, Tag, Loader2, ShoppingCart, Clock, MapPin, ShieldCheck, Ruler, ChevronDown, ChevronUp, Sparkles, Flame, Zap, HelpCircle, Award, CheckCircle2, CreditCard, Layers, Eye, Pin, Reply, Mic, Square, RotateCcw, RotateCw } from 'lucide-react';
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
    const [activeDetailsTab, setActiveDetailsTab] = useState<'info' | 'specs' | 'reviews'>('info');
    const [openAccordion, setOpenAccordion] = useState<'info' | 'specs' | 'reviews' | null>(null);
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart, setIsCartOpen, cartCount, showToast } = useCart();
    const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);

    const scrollToSection = (sectionId: string) => {
        const el = document.getElementById(sectionId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
                    if (!selectedImage) setSelectedImage(data.imageUrl);
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
        // Removed orderBy to avoid index creation requirement for now. Sorting client-side.
        const q = query(collection(db, 'reviews'), where('productId', '==', id));
        const unsubscribeReviews = onSnapshot(q, (snapshot) => {
            const loadedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
            // Sort client-side
            loadedReviews.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setReviews(loadedReviews);
        });

        return () => {
            unsubscribeProduct();
            unsubscribeReviews();
        };
    }, [id]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'size_charts'), (snapshot) => {
            const charts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SizeChart));
            setSizeCharts(charts);
        });
        return () => unsubscribe();
    }, []);

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

                        {/* Dynamic Characteristics (Configured by Admin in Admin Panel) */}
                        {((product.specifications && Object.keys(product.specifications).length > 0) || product.description) && (
                            <div id="specs-section" className="bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3">
                                <h4 className="font-russo uppercase text-xs text-yellow-400 tracking-wider flex items-center gap-2 pb-2 border-b border-white/5">
                                    <ShieldCheck size={15} className="text-yellow-500" />
                                    Характеристики {product.category?.toLowerCase() === 'форма' ? 'формы' : 'товара'}
                                </h4>
                                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                                    <ul className="space-y-2 text-xs">
                                        {Object.entries(product.specifications).map(([key, value], idx) => {
                                            const colors = [
                                                'bg-yellow-500',
                                                'bg-emerald-400',
                                                'bg-blue-400',
                                                'bg-purple-400',
                                                'bg-orange-400',
                                                'bg-amber-400'
                                            ];
                                            const dotColor = colors[idx % colors.length];
                                            return (
                                                <li key={key} className="flex items-start gap-2 text-gray-300 leading-relaxed">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                                                    <span><strong className="text-white">{key}:</strong> {value}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                                        {product.description}
                                    </p>
                                )}
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

                        {/* 1. Header: Quick Trust Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] sm:text-[11px] font-bold border border-emerald-500/20 uppercase flex items-center gap-1.5">
                                <CheckCircle2 size={12} /> В наличии в клубе
                            </span>

                            {/* Reviews Quick Link */}
                            {reviews.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => scrollToSection('reviews-section')}
                                    className="px-2.5 py-1 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 rounded-lg text-[10px] sm:text-[11px] font-bold border border-yellow-500/30 uppercase flex items-center gap-1.5 transition-all cursor-pointer group"
                                >
                                    <Star size={12} className="fill-yellow-400 text-yellow-400 group-hover:scale-110 transition-transform" />
                                    <span>{averageRating.toFixed(1)} ★ ({getPluralReviews(reviews.length)})</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        scrollToSection('reviews-section');
                                        setIsReviewFormOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-yellow-400 rounded-lg text-[10px] sm:text-[11px] font-bold border border-white/10 hover:border-yellow-500/30 uppercase flex items-center gap-1.5 transition-all cursor-pointer group"
                                >
                                    <MessageSquarePlus size={12} className="text-yellow-500/70 group-hover:text-yellow-400" />
                                    <span>Пока нет отзывов · Написать</span>
                                </button>
                            )}

                            {/* Specs Quick Link */}
                            <button
                                type="button"
                                onClick={() => scrollToSection('specs-section')}
                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] sm:text-[11px] font-bold border border-white/10 uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <ShieldCheck size={12} className="text-yellow-500" />
                                <span>Характеристики</span>
                            </button>

                            <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-[10px] sm:text-[11px] font-russo tracking-wider border border-yellow-500/30 uppercase flex items-center gap-1.5">
                                <Award size={12} /> {product.category}
                            </span>
                        </div>

                        {/* Title & Price (Clean & Airy, No Bulky Boxes) */}
                        <div>
                            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-russo uppercase text-white mb-2 sm:mb-3 tracking-tight leading-tight">
                                {product.title}
                            </h1>

                            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                                <span className="text-3xl sm:text-5xl font-russo font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.25)]">
                                    {(appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price).toLocaleString()} ₽
                                </span>
                                {product.oldPrice && product.oldPrice > product.price && (
                                    <span className="line-through text-gray-500 font-mono text-base sm:text-xl">
                                        {product.oldPrice.toLocaleString()} ₽
                                    </span>
                                )}
                                {appliedPromo && (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-black rounded-md">
                                        -{appliedPromo.value}%
                                    </span>
                                )}
                                {product.oldPrice && product.oldPrice > product.price && (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-black rounded-md">
                                        -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                    </span>
                                )}
                                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                    • или по <strong className="text-white font-bold">{Math.round((appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price) / 4).toLocaleString()} ₽</strong> × 4 платежа в <span className="text-yellow-400 font-bold">Долями</span> (0% переплат)
                                </span>
                            </div>
                        </div>

                        {/* 2. Step 1: Size Selector (Responsive 3-6 cols Grid) */}
                        {product.sizes && product.sizes.length > 0 && (
                            <div id="size-section" className="space-y-2.5 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                        1. Размер: {selectedSize ? <span className="text-yellow-400 font-russo text-sm">{selectedSize}</span> : <span className="text-yellow-500/80 font-normal">выберите подходящий</span>}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsSizeChartOpen(true)}
                                        className="text-xs font-bold text-yellow-500 hover:text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 transition-colors group bg-yellow-500/10 px-2.5 sm:px-3 py-1 rounded-lg border border-yellow-500/20 cursor-pointer"
                                    >
                                        <Ruler size={13} className="group-hover:rotate-12 transition-transform" />
                                        Таблица размеров
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-2">
                                    {product.sizes.map(size => {
                                        const stock = product.stock?.[size];
                                        const isOutOfStock = stock === 0;
                                        const isSelected = selectedSize === size;
                                        const hint = getSizeHint(size);

                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => !isOutOfStock && setSelectedSize(size)}
                                                disabled={isOutOfStock}
                                                className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl sm:rounded-2xl font-bold flex flex-col items-center justify-center transition-all border cursor-pointer ${
                                                    isOutOfStock
                                                        ? 'bg-[#111] text-gray-600 border-white/5 opacity-50 cursor-not-allowed line-through'
                                                        : isSelected
                                                            ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.4)] scale-[1.03]'
                                                            : 'bg-[#161616] text-gray-200 border-white/10 hover:border-white/30 hover:bg-[#202020]'
                                                }`}
                                            >
                                                <span className="font-russo text-xs sm:text-sm">{size}</span>
                                                {hint && !isOutOfStock && (
                                                    <span className={`text-[8px] sm:text-[9px] tracking-tight truncate ${isSelected ? 'text-black/80 font-bold' : 'text-gray-500'}`}>
                                                        {hint}
                                                    </span>
                                                )}
                                                {isOutOfStock && (
                                                    <span className="text-[8px] uppercase font-black text-gray-500 leading-none mt-0.5">Нет</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Colors if any */}
                        {product.colors && product.colors.length > 1 && (
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Цветовая гамма</label>
                                <div className="flex flex-wrap gap-2">
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
                                            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                selectedColor === color
                                                    ? 'bg-white text-black border-white shadow-lg'
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
                            <div className="p-4 sm:p-5 bg-gradient-to-b from-[#181818]/90 to-[#121212]/90 backdrop-blur-xl rounded-2xl border border-yellow-500/25 space-y-3.5 shadow-lg relative overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-yellow-500" />
                                        <h3 className="text-xs font-russo uppercase tracking-widest text-white">2. Клубное нанесение</h3>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30">
                                        Включено в стоимость
                                    </span>
                                </div>

                                {/* Live Back Visualizer Badge */}
                                <div className="bg-black/50 rounded-xl p-3 border border-white/5 flex items-center justify-between shadow-inner">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-black flex items-center justify-center font-russo font-black text-base shadow flex-shrink-0">
                                            {customNumber || '22'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] uppercase font-bold text-gray-400">На спине формы:</p>
                                            <p className="font-russo text-xs text-white uppercase tracking-[0.2em] truncate">
                                                {customName || 'ЛЕБЕДЕВ'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                        ● Нанесение активно
                                    </span>
                                </div>

                                {/* 2 Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            Фамилия игрока
                                        </label>
                                        <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                                            placeholder="НАПРИМЕР: ИВАНОВ"
                                            maxLength={15}
                                            className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-russo uppercase tracking-widest focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-yellow-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            Игровой номер
                                        </label>
                                        <input
                                            type="text"
                                            value={customNumber}
                                            onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="ОТ 1 ДО 99"
                                            maxLength={2}
                                            className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-russo uppercase tracking-widest focus:border-yellow-500 outline-none transition-all placeholder:text-gray-600 focus:ring-1 focus:ring-yellow-500/30"
                                        />
                                    </div>
                                </div>

                                {/* Silhouette Selection */}
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                        Крой формы
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Приталенный', 'Стандарт', 'Свободный'].map(style => (
                                            <button
                                                key={style}
                                                type="button"
                                                onClick={() => setFitStyle(style)}
                                                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                                    fitStyle === style
                                                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-md'
                                                        : 'bg-black/50 text-gray-400 border-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Expandable Body Measurements Accordion */}
                                <div className="pt-1 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomMeasurementsOpen(!isCustomMeasurementsOpen)}
                                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white flex items-center justify-between transition-colors border border-white/5 cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1.5 text-[11px]">
                                            <Ruler size={13} className="text-yellow-500" />
                                            {isCustomMeasurementsOpen ? 'Скрыть индивидуальные замеры' : 'Указать точные замеры (опционально)'}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isCustomMeasurementsOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isCustomMeasurementsOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="pt-2 space-y-2"
                                        >
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {[
                                                    { label: 'Рост (см)', key: 'height' },
                                                    { label: 'Обхват груди', key: 'chest' },
                                                    { label: 'Ширина плеч', key: 'shoulders' },
                                                    { label: 'Длина рукава', key: 'sleeve' },
                                                    { label: 'Обхват талии', key: 'waist' },
                                                    { label: 'Обхват бедер', key: 'hips' },
                                                    { label: 'Длина изделия', key: 'length' },
                                                ].map(item => (
                                                    <div key={item.key} className="space-y-1">
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
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Promo Code System (Inline, clean) */}
                        <div>
                            {appliedPromo ? (
                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 text-green-400">
                                        <div className="bg-green-500/20 p-1.5 rounded-lg">
                                            <Check size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs">Промокод <span className="font-mono text-green-300">{appliedPromo.code}</span> применен!</div>
                                            <div className="text-[11px] text-green-500">Скидка -{appliedPromo.value}%</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAppliedPromo(null)}
                                        className="text-green-500/60 hover:text-green-400 p-1.5 cursor-pointer"
                                        title="Отменить промокод"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : showPromoInput ? (
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                            <input
                                                type="text"
                                                value={promoCode}
                                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                placeholder="ВВЕДИТЕ ПРОМОКОД"
                                                className={`w-full bg-[#181818] border ${promoError ? 'border-red-500/50' : 'border-white/10'} rounded-xl py-2.5 pl-9 pr-3 text-white uppercase font-mono tracking-widest text-xs focus:border-yellow-500 outline-none`}
                                            />
                                        </div>
                                        {promoError && <p className="text-red-400 text-[10px] mt-1 ml-1 font-bold">{promoError}</p>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={applyPromoCode}
                                        disabled={isApplyingPromo || !promoCode.trim()}
                                        className="px-4 h-[38px] bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {isApplyingPromo ? <Loader2 className="animate-spin" size={16} /> : 'Применить'}
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setShowPromoInput(true)} className="text-white/40 text-xs font-bold uppercase tracking-wider hover:text-yellow-500 transition-colors flex items-center gap-1.5 cursor-pointer">
                                    <Tag size={13} /> У меня есть промокод
                                </button>
                            )}
                        </div>

                        {/* 4. Actions: Add to Cart & Favorite (Big tactile button) */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
                                        showToast('Пожалуйста, выберите размер', 'warning');
                                        return;
                                    }
                                    if (product.colors && product.colors.length > 0 && !selectedColor) {
                                        showToast('Пожалуйста, выберите цвет', 'warning');
                                        return;
                                    }
                                    addToCart(product, 1, selectedSize || undefined, selectedColor || undefined, customName, customNumber, measurements, fitStyle);
                                }}
                                disabled={(selectedSize && product.stock?.[selectedSize] === 0) || (!selectedSize && product.sizes && product.sizes.length > 0)}
                                className="flex-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-50 disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:border-white/5 text-black py-4 px-6 rounded-2xl font-russo uppercase tracking-wider transition-all shadow-[0_0_35px_rgba(234,179,8,0.35)] hover:shadow-[0_0_50px_rgba(234,179,8,0.55)] flex items-center justify-center gap-3 active:scale-[0.98] text-sm sm:text-base cursor-pointer group"
                            >
                                <ShoppingCart size={22} className="group-hover:-translate-y-0.5 transition-transform" />
                                <span>{(selectedSize && product.stock?.[selectedSize] === 0) ? 'Раскупили' : `В корзину • ${(appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price).toLocaleString()} ₽`}</span>
                            </button>
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

                        {/* 5. Service Highlights (Clean horizontal chips) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center gap-2.5">
                                <Clock size={16} className="text-yellow-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[8px] uppercase font-bold text-gray-400">Срок пошива</p>
                                    <p className="text-xs font-russo text-white truncate">{product.productionTime || '3–5 рабочих дней'}</p>
                                </div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center gap-2.5">
                                <MapPin size={16} className="text-emerald-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[8px] uppercase font-bold text-gray-400">Получение</p>
                                    <p className="text-xs font-russo text-white truncate">{product.deliveryInfo || 'Выдача в манеже'}</p>
                                </div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center gap-2.5">
                                <ShieldCheck size={16} className="text-blue-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[8px] uppercase font-bold text-gray-400">Гарантия</p>
                                    <p className="text-xs font-russo text-white truncate">100% ФК Спарта</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>



                {/* 🌟 2. Секция отзывов родителей */}
                <div id="reviews-section" className="mt-12 pt-8 border-t border-white/10 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-russo uppercase text-xl sm:text-2xl text-white tracking-wider flex items-center gap-2.5">
                                    <Star className={reviews.length > 0 ? "fill-yellow-500 text-yellow-500" : "text-gray-500"} size={24} />
                                    Отзывы родителей
                                </h3>
                                <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs font-russo rounded-full border border-yellow-500/20">
                                    {reviews.length}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs sm:text-sm mt-1">
                                Реальные впечатления и фото юных спортсменов клуба Спарта
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-russo uppercase tracking-wider transition-all cursor-pointer self-start sm:self-auto"
                        >
                            <MessageSquarePlus size={15} />
                            <span>{isReviewFormOpen ? 'Скрыть форму' : '+ Написать отзыв'}</span>
                        </button>
                    </div>

                    {/* Средний рейтинг если отзывы есть */}
                    {reviews.length > 0 && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl font-russo text-yellow-400 leading-none">
                                    {averageRating.toFixed(1)}
                                </div>
                                <div>
                                    <div className="flex gap-1 text-yellow-400">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star
                                                key={star}
                                                size={16}
                                                fill={star <= Math.round(averageRating) ? "currentColor" : "none"}
                                                className={star <= Math.round(averageRating) ? "text-yellow-400" : "text-gray-600"}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">
                                        Средняя оценка на основе {getPluralReviews(reviews.length)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Баннер когда отзывов 0 */}
                    {reviews.length === 0 && !isReviewFormOpen && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto shadow-inner">
                                <MessageSquarePlus size={26} />
                            </div>
                            <div className="max-w-md mx-auto">
                                <h4 className="font-russo uppercase text-base text-white mb-1.5 tracking-wider">
                                    У этого комплекта пока нет отзывов
                                </h4>
                                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                                    Ваш юный футболист уже тренируется в этой форме? Поделитесь своими впечатлениями и фото — это поможет другим родителям клуба!
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsReviewFormOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-russo uppercase text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] cursor-pointer active:scale-95"
                            >
                                <MessageSquarePlus size={16} />
                                <span>Написать первый отзыв</span>
                            </button>
                        </div>
                    )}

                    {/* Форма добавления отзыва */}
                    <AnimatePresence>
                        {isReviewFormOpen && (
                            <motion.form
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-[#121212] p-6 rounded-3xl border border-yellow-500/30 shadow-2xl space-y-4 max-w-2xl"
                                onSubmit={handleSubmitReview}
                            >
                                <h4 className="font-russo uppercase text-sm text-white tracking-wider flex items-center gap-2">
                                    <MessageSquarePlus size={16} className="text-yellow-500" />
                                    Ваш отзыв о форме
                                </h4>

                                <div>
                                    <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Ваша оценка</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewReviewRating(star)}
                                                className={`transition-all hover:scale-110 cursor-pointer ${star <= newReviewRating ? 'text-yellow-500' : 'text-gray-600'}`}
                                            >
                                                <Star fill={star <= newReviewRating ? "currentColor" : "none"} size={26} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Впечатления о комплекте</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={newReviewComment}
                                        onChange={(e) => setNewReviewComment(e.target.value)}
                                        className="w-full bg-black/80 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500 outline-none text-xs sm:text-sm"
                                        placeholder="Напишите, как села форма, понравилось ли ребенку качество ткани..."
                                    />
                                </div>

                                {/* Быстрые теги эмоций */}
                                <div>
                                    <label className="block text-gray-400 text-[11px] font-bold uppercase mb-1.5">Быстрые впечатления</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {EMOTION_TAGS.map((tag) => {
                                            const isSelected = selectedEmotionTags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEmotionTags(prev =>
                                                            isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                                        );
                                                    }}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${isSelected ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-gray-200'}`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Превью прикрепленных фото, видео и голосового */}
                                {(reviewPhotos.length > 0 || reviewVideo || recordedAudioUrl || isRecordingAudio) && (
                                    <div className="space-y-2">
                                        {/* Живая панель записи аудио */}
                                        {isRecordingAudio && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between shadow-lg">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                                                    <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                                                        <Mic size={14} className="text-red-400 animate-bounce" /> Запись голоса:
                                                    </span>
                                                    <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded-md">
                                                        0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds} / 1:00
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={stopAudioRecording}
                                                        className="px-3 py-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md"
                                                    >
                                                        <Square size={11} fill="currentColor" /> Завершить
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelAudioRecording}
                                                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        Отмена
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Превью записанного голосового отзыва */}
                                        {recordedAudioUrl && !isRecordingAudio && (
                                            <div className="relative group">
                                                <VoiceReviewPlayer src={recordedAudioUrl} className="w-full" />
                                                <button
                                                    type="button"
                                                    onClick={deleteRecordedAudio}
                                                    className="absolute -top-2 -right-2 p-1.5 bg-black/80 hover:bg-red-500 text-white rounded-full border border-white/20 transition-all cursor-pointer shadow-lg"
                                                    title="Удалить голосовую запись"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Фото и видео миниатюры */}
                                        {(reviewPhotos.length > 0 || reviewVideo) && (
                                            <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                                                {reviewPhotos.map((photo, index) => (
                                                    <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 group">
                                                        <img src={URL.createObjectURL(photo)} alt="preview" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setReviewPhotos(prev => prev.filter((_, i) => i !== index))}
                                                            className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full cursor-pointer hover:bg-red-500 transition-colors"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {reviewVideo && (
                                                    <div className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-yellow-500/40 bg-black/80 flex items-center justify-center group">
                                                        <video src={URL.createObjectURL(reviewVideo)} className="w-full h-full object-cover opacity-50" />
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <Play size={16} className="text-yellow-400 fill-yellow-400" />
                                                        </div>
                                                        <span className="absolute bottom-1 left-1 text-[8px] bg-black/80 px-1 rounded text-yellow-400 font-bold">Видео</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setReviewVideo(null)}
                                                            className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full cursor-pointer hover:bg-red-500 transition-colors"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Записать голосовой отзыв */}
                                        <button
                                            type="button"
                                            onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                                isRecordingAudio
                                                    ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                                    : (recordedAudioUrl ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-sm' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10')
                                            }`}
                                        >
                                            <Mic size={14} className={isRecordingAudio ? 'text-white' : 'text-yellow-400'} />
                                            <span>{isRecordingAudio ? 'Идет запись...' : (recordedAudioUrl ? 'Голос записан ✓' : 'Голос')}</span>
                                        </button>

                                        {/* Прикрепить фото */}
                                        <label className="cursor-pointer px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors">
                                            <Camera size={14} className="text-yellow-400" />
                                            <span>Фото</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files) {
                                                        setReviewPhotos(prev => [...prev, ...Array.from(e.target.files || [])]);
                                                    }
                                                }}
                                            />
                                        </label>

                                        {/* Прикрепить видеофайл */}
                                        <label className="cursor-pointer px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors">
                                            <VideoIcon size={14} className="text-emerald-400" />
                                            <span>Видео</span>
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

                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsReviewFormOpen(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:bg-white/5 cursor-pointer"
                                        >
                                            Отмена
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={reviewSubmitting}
                                            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-xs font-russo uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                        >
                                            {reviewSubmitting ? 'Отправка...' : 'Отправить отзыв'}
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Вкладки фильтрации отзывов */}
                    {reviews.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                            {[
                                { id: 'all', label: `Все (${reviews.length})` },
                                { id: 'media', label: `📸 С медиа (${reviews.filter(r => (r.photos && r.photos.length > 0) || r.video || r.audio).length})` },
                                { id: 'pinned', label: `📌 Закрепленные (${reviews.filter(r => r.isPinned).length})` },
                                { id: 'staff', label: `🏛️ С ответом клуба (${reviews.filter(r => (Array.isArray(r.staffLikes) && r.staffLikes.length > 0) || (r.replies && r.replies.some(rp => rp.userRole === 'admin' || rp.userRole === 'trainer' || rp.userRole === 'coach' || rp.userRole === 'director'))).length})` },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setReviewFilter(tab.id as any)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${reviewFilter === tab.id ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.3)]' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Список отзывов в сетке карточек */}
                    {displayReviews.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {displayReviews.map(review => (
                                <div key={review.id} className={`bg-white/[0.02] p-5 rounded-2xl border transition-all ${review.isPinned ? 'border-yellow-500/50 bg-gradient-to-b from-yellow-500/[0.04] to-transparent shadow-[0_0_20px_rgba(234,179,8,0.06)]' : ((review as any).isOptimistic ? 'border-yellow-500/40 bg-yellow-500/[0.02]' : 'border-white/10')} space-y-3 relative`}>
                                    {/* Закреплено персоналом Спарта */}
                                    {review.isPinned && (
                                        <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Pin size={11} className="fill-yellow-300 shrink-0" />
                                                <span>Закреплено Клубом Спарта</span>
                                            </div>
                                            {review.pinnedBy && <span className="text-yellow-400/80 font-normal">от {review.pinnedBy}</span>}
                                        </div>
                                    )}

                                    {/* Отмечено персоналом */}
                                    {Array.isArray(review.staffLikes) && review.staffLikes.length > 0 && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                                            <Heart size={11} className="fill-red-400 text-red-400 shrink-0" />
                                            <span>Отмечено персоналом: {review.staffLikes.map(s => `${s.role} ${s.name}`).join(', ')}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-black text-sm flex-shrink-0">
                                                {review.userName?.[0]?.toUpperCase() || 'Р'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                                                    <span>{review.userName || 'Родитель игрока'}</span>
                                                    {(review.childName || review.groupName || review.userRole) && (
                                                        <span className="text-[9px] bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full font-bold border border-yellow-500/20 flex items-center gap-1">
                                                            <span>⚽</span>
                                                            <span>{review.childName ? `${review.childName} • ` : ''}{review.groupName || review.userRole || 'Семья Спарты'}</span>
                                                        </span>
                                                    )}
                                                    {(review as any).isOptimistic && (
                                                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                                                            <Loader2 size={10} className="animate-spin" /> Загрузка в облако...
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-0.5 text-yellow-400 mt-0.5">
                                                    {[...Array(review.rating || 5)].map((_, i) => (
                                                        <Star key={i} size={11} fill="currentColor" />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Кнопка закрепить (для персонала) */}
                                            {isStaff && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePinReview(review.id, !!review.isPinned)}
                                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${review.isPinned ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                                    title={review.isPinned ? "Открепить отзыв" : "Закрепить отзыв вверху"}
                                                >
                                                    <Pin size={13} className={review.isPinned ? 'fill-yellow-300' : ''} />
                                                </button>
                                            )}

                                            {/* Кнопка отметки тренера/персонала */}
                                            {isStaff && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStaffLikeReview(review)}
                                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${Array.isArray(review.staffLikes) && review.staffLikes.some(s => s.userId === user?.uid) ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400'}`}
                                                    title="Отметить отзыв от лица клуба"
                                                >
                                                    <Heart size={13} className={Array.isArray(review.staffLikes) && review.staffLikes.some(s => s.userId === user?.uid) ? 'fill-red-400' : ''} />
                                                </button>
                                            )}

                                            <span className="text-[11px] text-gray-500 ml-1">
                                                {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('ru-RU') : 'Недавно'}
                                            </span>
                                            {!(review as any).isOptimistic && Boolean(user?.uid && ((review.userId && user.uid === review.userId) || userProfile?.role === 'admin' || userProfile?.role === 'developer' || userProfile?.isAdmin)) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteReview(review.id, review.userId)}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                                    title="Удалить отзыв"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
{/* Голосовой отзыв */}
                                    {review.audio && (
                                        <div className="pt-1">
                                            <VoiceReviewPlayer
                                                src={review.audio}
                                                authorName={review.userName}
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    {/* Текст отзыва */}
                                    {review.comment && (
                                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">{review.comment}</p>
                                    )}

                                    {/* Теги впечатлений */}
                                    {review.emotionTags && review.emotionTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-0.5">
                                            {review.emotionTags.map((tag, idx) => (
                                                <span key={idx} className="text-[10px] bg-white/5 text-gray-300 px-2.5 py-0.5 rounded-full border border-white/5 font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Медиа отзыва (Фото и Видео) */}
                                    {((review.photos && review.photos.length > 0) || review.video) && (
                                        <div className="flex gap-2 pt-1 overflow-x-auto pb-1 items-center">
                                            {/* Видео-карточка */}
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

                                            {/* Фото-карточки */}
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

                                    {/* Нижняя строка отзыва: счетчик комментариев и кнопка ответить */}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs text-gray-400 flex-wrap gap-2">
                                        {/* Кнопка открыть шторку комментариев */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCommentsDrawerReview(review);
                                                setIsCommentsDrawerOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-white/5 hover:bg-white/10 hover:border-yellow-500/30 text-gray-300 active:scale-95"
                                        >
                                            <MessageCircle size={13} className="text-yellow-400" />
                                            <span>
                                                {review.replies && review.replies.length > 0
                                                    ? `${review.replies.length} ${
                                                          review.replies.length % 10 === 1 && review.replies.length % 100 !== 11
                                                              ? 'комментарий'
                                                              : review.replies.length % 10 >= 2 &&
                                                                review.replies.length % 10 <= 4 &&
                                                                (review.replies.length % 100 < 10 || review.replies.length % 100 >= 20)
                                                              ? 'комментария'
                                                              : 'комментариев'
                                                      }`
                                                    : 'Комментарии (0)'}
                                            </span>
                                        </button>

                                        {/* Кнопка ответить (только если это чужой отзыв) */}
                                        {(!user || ((review.userId && user.uid !== review.userId) || (!review.userId && review.userName !== (user.displayName || (userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : ''))))) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!user) {
                                                        showToast("Войдите, чтобы оставить комментарий", "info");
                                                        return;
                                                    }
                                                    setCommentsDrawerReview(review);
                                                    setIsCommentsDrawerOpen(true);
                                                }}
                                                className="px-3.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                                            >
                                                <Mic size={13} className="text-amber-400" />
                                                <span>Комментировать</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Форма ответа на отзыв */}
                                    {replyingReviewId === review.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="pt-2 space-y-2 bg-[#0c0c0c] p-3 rounded-2xl border border-yellow-500/30 shadow-lg"
                                        >
                                            {/* Live Recording Panel for Inline Reply */}
                                            {isRecordingInlineReplyAudio && (
                                                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                                                        <span className="text-xs font-bold text-red-300">Запись голоса:</span>
                                                        <span className="font-mono text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded">
                                                            0:{inlineReplyRecordingSeconds < 10 ? '0' : ''}{inlineReplyRecordingSeconds} / 1:00
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={stopInlineReplyRecording}
                                                            className="px-2.5 py-1 bg-red-500 hover:bg-red-400 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                                        >
                                                            <Square size={10} fill="currentColor" /> Готово
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelInlineReplyRecording}
                                                            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                        >
                                                            Отмена
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Voice Preview for Inline Reply */}
                                            {inlineReplyRecordedUrl && !isRecordingInlineReplyAudio && (
                                                <div className="relative group">
                                                    <VoiceReviewPlayer src={inlineReplyRecordedUrl} className="w-full py-1 px-3 text-xs" />
                                                    <button
                                                        type="button"
                                                        onClick={deleteInlineReplyAudio}
                                                        className="absolute -top-1.5 -right-1.5 p-1 bg-black/80 hover:bg-red-500 text-white rounded-full border border-white/20 transition-all cursor-pointer shadow-md"
                                                        title="Удалить голосовую запись"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Быстрые фразы-подсказки */}
                                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                                {['⚽ Красавчик!', '🔥 Супер форма!', '👏 Гордимся!', '👕 Село отлично!', '❓ Какой размер?'].map((chip, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setReplyComment(prev => prev ? `${prev} ${chip}` : chip)}
                                                        className="shrink-0 px-2.5 py-1 rounded-full bg-white/5 hover:bg-yellow-500/20 text-gray-300 hover:text-yellow-300 text-[10px] font-semibold border border-white/5 transition-all cursor-pointer shadow-sm active:scale-95"
                                                    >
                                                        {chip}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex gap-2 items-center">
                                                <button
                                                    type="button"
                                                    onClick={isRecordingInlineReplyAudio ? stopInlineReplyRecording : startInlineReplyRecording}
                                                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                                                        isRecordingInlineReplyAudio
                                                            ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                                                            : (inlineReplyRecordedUrl ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' : 'bg-[#181818] hover:bg-white/10 text-yellow-400 border-white/10')
                                                    }`}
                                                    title="Записать голосовой ответ"
                                                >
                                                    <Mic size={15} />
                                                </button>
                                                <input
                                                    type="text"
                                                    value={replyComment}
                                                    onChange={(e) => setReplyComment(e.target.value)}
                                                    placeholder={inlineReplyRecordedUrl ? "Текст к голосу (опционально)..." : "Написать ответ на отзыв..."}
                                                    className="flex-1 bg-[#161616] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none transition-colors shadow-inner"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleSubmitReply(review.id)}
                                                    disabled={!replyComment.trim() && !inlineReplyRecordedBlob}
                                                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black rounded-xl text-xs font-bold transition-all disabled:opacity-30 cursor-pointer shadow-sm"
                                                >
                                                    Отправить
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Список ответов к отзыву (YouTube Architecture) */}
                                    {review.replies && review.replies.length > 0 && (expandedReplies[review.id] || replyingReviewId === review.id) && (
                                        <div className="space-y-2 pt-2 border-t border-white/5">
                                            {(() => {
                                                const rootReplies = review.replies.filter((r: any) => !r.replyToCommentId);
                                                const childRepliesMap: Record<string, any[]> = {};
                                                review.replies.forEach((r: any) => {
                                                    if (r.replyToCommentId) {
                                                        if (!childRepliesMap[r.replyToCommentId]) childRepliesMap[r.replyToCommentId] = [];
                                                        childRepliesMap[r.replyToCommentId].push(r);
                                                    }
                                                });

                                                const displayRoots = rootReplies.length > 0 ? rootReplies : review.replies;

                                                const renderProductReplyCard = (reply: any, isChild = false) => {
                                                    const isClubStaff = reply.userRole === 'admin' || reply.userRole === 'trainer' || reply.userRole === 'coach' || reply.userRole === 'director';
                                                    const isReviewAuthor = !isClubStaff && Boolean((review?.userId && reply.userId === review.userId) || (!review?.userId && reply.userName === review?.userName));
                                                    const isOwnReply = Boolean(user && ((reply.userId && user.uid === reply.userId) || (!reply.userId && (reply.userName === user.displayName || (userProfile?.firstName && reply.userName === `${userProfile.firstName} ${userProfile.lastName || ''}`.trim())))));
                                                    const isEditingThisReply = editingReplyId === reply.id;
                                                    const childReplies = childRepliesMap[reply.id] || [];
                                                    const isChildExpanded = expandedReplies[`${review.id}_${reply.id}`];

                                                    return (
                                                        <div key={reply.id} className="flex flex-col gap-1">
                                                            <div className={`p-3 rounded-2xl text-xs space-y-1.5 border transition-all ${isClubStaff ? 'bg-gradient-to-br from-yellow-500/15 via-[#16140c] to-[#0f0f0f] border-yellow-500/40 shadow-[0_4px_20px_rgba(234,179,8,0.06)]' : (isReviewAuthor ? 'bg-[#14130f] border border-amber-500/25 hover:border-amber-500/40' : 'bg-[#141414] border-white/[0.06] hover:border-white/10')}`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${isClubStaff ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-sm' : (isReviewAuthor ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')}`}>
                                                                            {isClubStaff ? '🛡️' : (reply.userName?.[0]?.toUpperCase() || 'У')}
                                                                        </div>
                                                                        <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
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
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                                        {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('ru-RU') : ''}
                                                                        {reply.isEdited && ' (ред.)'}
                                                                    </span>
                                                                </div>

                                                                {/* Редактирование ответа */}
                                                                {isEditingThisReply ? (
                                                                    <div className="mt-1.5 space-y-2">
                                                                        <input
                                                                            type="text"
                                                                            value={editReplyComment}
                                                                            onChange={(e) => setEditReplyComment(e.target.value)}
                                                                            className="w-full bg-black/80 border border-yellow-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none shadow-inner"
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex gap-2 justify-end">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditingReplyId(null)}
                                                                                className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded-lg cursor-pointer"
                                                                            >
                                                                                Отмена
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSaveReplyEdit(review.id, review.replies || [])}
                                                                                className="px-3.5 py-1 bg-yellow-500 text-black font-bold text-xs rounded-xl cursor-pointer hover:bg-yellow-400 shadow-sm"
                                                                            >
                                                                                Сохранить
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-1">
                                                                        {reply.audio && (
                                                                            <VoiceReviewPlayer
                                                                                src={reply.audio}
                                                                                authorName={reply.userName}
                                                                                className="my-1 py-1 px-2.5 text-xs w-full max-w-[320px]"
                                                                            />
                                                                        )}
                                                                        {reply.comment && (
                                                                            <p className={`text-[11px] leading-relaxed ${isClubStaff ? 'text-yellow-100 font-medium' : 'text-gray-300'}`}>
                                                                                {reply.replyToUser && (
                                                                                    <span className="text-yellow-400 font-semibold mr-1">@{reply.replyToUser},</span>
                                                                                )}
                                                                                {reply.comment}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Видимые кнопки взаимодействия с ответом */}
                                                                {!isEditingThisReply && (
                                                                    <div className="flex items-center gap-2.5 pt-1.5 border-t border-white/[0.04] mt-1 text-xs">
                                                                        {/* Кнопка ответить (только для чужих ответов) */}
                                                                        {!isOwnReply && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setReplyingReviewId(review.id);
                                                                                    setReplyComment(`@${reply.userName} `);
                                                                                }}
                                                                                className="text-gray-400 hover:text-yellow-300 font-bold transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                                                                            >
                                                                                <Reply size={11} className="text-yellow-400" />
                                                                                <span>Ответить</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Кнопка редактировать */}
                                                                        {isOwnReply && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleStartReplyEdit(reply)}
                                                                                className="text-gray-500 hover:text-cyan-300 text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-0.5"
                                                                            >
                                                                                <Edit2 size={10} />
                                                                                <span>Ред.</span>
                                                                            </button>
                                                                        )}

                                                                        {/* Кнопка удалить */}
                                                                        {(isOwnReply || Boolean(user && (userProfile?.role === 'admin' || userProfile?.role === 'developer' || userProfile?.isAdmin))) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteReply(review.id, reply.id, review.replies || [])}
                                                                                className="text-gray-500 hover:text-red-400 text-[10px] font-medium transition-colors cursor-pointer ml-auto flex items-center gap-0.5"
                                                                                title="Удалить"
                                                                            >
                                                                                <Trash2 size={11} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* YouTube Expand Nested Replies */}
                                                                {!isChild && childReplies.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setExpandedReplies(prev => ({
                                                                            ...prev,
                                                                            [`${review.id}_${reply.id}`]: !prev[`${review.id}_${reply.id}`]
                                                                        }))}
                                                                        className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 hover:text-yellow-300 py-1 px-2 rounded-full hover:bg-yellow-500/10 transition-colors cursor-pointer mt-1 w-fit"
                                                                    >
                                                                        {isChildExpanded ? (
                                                                            <>
                                                                                <ChevronUp size={12} />
                                                                                <span>Скрыть ответы</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown size={12} />
                                                                                <span>{childReplies.length} {childReplies.length === 1 ? 'ответ' : 'ответа'}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Nested Child Replies */}
                                                            {!isChild && childReplies.length > 0 && isChildExpanded && (
                                                                <div className="pl-4 border-l-2 border-yellow-500/20 space-y-1.5 mt-1 ml-3">
                                                                    {childReplies.map((child: any) => renderProductReplyCard(child, true))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                };

                                                return (
                                                    <div className="space-y-2">
                                                        {displayRoots.map((root: any) => renderProductReplyCard(root, false))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-xs text-gray-500 bg-white/[0.01] rounded-2xl border border-white/5">
                            В этой категории пока нет отзывов.
                        </div>
                    )}
                </div>
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

            {/* Size Chart Modal */}
            <AnimatePresence>
                {isSizeChartOpen && product && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                    >
                        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsSizeChartOpen(false)} />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-5xl bg-[#111] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col md:flex-row max-h-[90vh]"
                        >
                            {/* Left Side: Logic & Info */}
                            <div className="w-full md:w-96 p-8 border-r border-white/5 flex flex-col gap-6 overflow-y-auto">
                                <div className="flex items-center justify-between md:hidden">
                                    <h3 className="text-xl font-black uppercase tracking-widest text-white">Гид по размерам</h3>
                                    <button onClick={() => setIsSizeChartOpen(false)} className="text-gray-500"><X size={24} /></button>
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
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeChartTab === 'jersey' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
                                            }`}
                                    >
                                        {product.title.toLowerCase().includes('костюм') ? 'Олимпийка' : 'Футболка'}
                                    </button>
                                    <button
                                        onClick={() => setActiveChartTab(product.title.toLowerCase().includes('костюм') || product.title.toLowerCase().includes('брюки') ? 'pants' : 'shorts')}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${(activeChartTab === 'shorts' || activeChartTab === 'pants') ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
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
                                        <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
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
                                    className="absolute top-8 right-8 z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors hidden md:block"
                                >
                                    <X size={24} />
                                </button>

                                <img
                                    src={matchingChart?.imageUrl || `/images/size-charts/${activeChartTab}-${product.category.toLowerCase().includes('юниор') || product.title.toLowerCase().includes('детск') ? 'child' : 'adult'}.${activeChartTab === 'pants' ? 'jpg' : 'png'}`}
                                    alt="Size Chart"
                                    className="max-w-full max-h-full object-contain rounded-xl"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (matchingChart?.imageUrl && img.src === matchingChart.imageUrl) {
                                            // If dynamic image fails, fallback to hardcoded
                                            img.src = `/images/size-charts/${activeChartTab}-${product.category.toLowerCase().includes('юниор') || product.title.toLowerCase().includes('детск') ? 'child' : 'adult'}.${activeChartTab === 'pants' ? 'jpg' : 'png'}`;
                                            return;
                                        }

                                        const attempts = parseInt(img.getAttribute('data-attempts') || '0');

                                        if (attempts < 4) {
                                            img.setAttribute('data-attempts', (attempts + 1).toString());

                                            console.log(`[SizeChart] Failed to load: ${img.src}. Attempt: ${attempts}`);

                                            if (attempts === 1) {
                                                img.src = img.src.endsWith('.png') ? img.src.replace('.png', '.jpg') : img.src.replace('.jpg', '.png');
                                            } else if (attempts === 2 && activeChartTab === 'pants') {
                                                img.src = img.src.includes('adult') ? img.src.replace('adult', 'child') : img.src.replace('child', 'adult');
                                            } else if (attempts === 3) {
                                                img.src = `/images/size-charts/shorts-${product.category.toLowerCase().includes('юниор') || product.title.toLowerCase().includes('детск') ? 'child' : 'adult'}.png`;
                                            } else {
                                                img.src = product.sizeChartUrl || 'https://via.placeholder.com/800x1200/111111/555555?text=Таблица+скоро+будет';
                                            }
                                        }
                                    }}
                                />
                                {(!product.sizeChartUrl && activeChartTab === 'pants') && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-50">
                                        <p className="text-gray-500 text-[8px] uppercase font-bold tracking-[0.2em] whitespace-nowrap">
                                            Справочная информация (может потребоваться уточнение для взрослых размеров)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- STICKY MOBILE/TABLET PURCHASE BAR (< 1024px) --- */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 px-4 sm:px-6 shadow-[0_-10px_35px_rgba(0,0,0,0.85)]">
                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-gray-400 truncate">
                            {selectedSize ? `Размер: ${selectedSize}` : (product.sizes && product.sizes.length > 0 ? 'Выберите размер' : 'Sparta')}
                        </div>
                        <div className="font-russo text-lg sm:text-xl text-yellow-400 font-bold truncate">
                            {(appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price).toLocaleString()} ₽
                        </div>
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
                            onClick={() => {
                                if (product.sizes && product.sizes.length > 0 && !selectedSize) {
                                    showToast('Пожалуйста, выберите размер', 'warning');
                                    scrollToSection('size-section');
                                    return;
                                }
                                if (product.colors && product.colors.length > 0 && !selectedColor) {
                                    showToast('Пожалуйста, выберите цвет', 'warning');
                                    return;
                                }
                                addToCart(product, 1, selectedSize || undefined, selectedColor || undefined, customName, customNumber, measurements, fitStyle);
                            }}
                            disabled={(selectedSize && product.stock?.[selectedSize] === 0) || (!selectedSize && product.sizes && product.sizes.length > 0)}
                            className="px-5 py-3 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-40 disabled:bg-[#1a1a1a] disabled:text-gray-600 text-black rounded-xl font-russo uppercase text-xs sm:text-sm tracking-wider flex items-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                            <ShoppingCart size={16} />
                            <span>{(selectedSize && product.stock?.[selectedSize] === 0) ? 'Раскупили' : 'В корзину'}</span>
                        </button>
                    </div>
                </div>
            </div>

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
