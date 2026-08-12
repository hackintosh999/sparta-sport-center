import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, ShoppingBag, Share2, Heart, ChevronLeft, ChevronRight, Check, AlertCircle, Trash2, Edit2, MessageCircle, ThumbsUp, X, Camera, Video as VideoIcon, Play, Tag, Loader2, ShoppingCart } from 'lucide-react';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where, orderBy, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDocs, deleteField } from 'firebase/firestore';
import { Product, Review, SizeChart } from '../types/shop';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import VideoPlayer from '../components/VideoPlayer';
import ReviewMediaModal from '../components/ReviewMediaModal';
import SizeAdvisor from '../components/SizeAdvisor';
import SEO from '../components/SEO';


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
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart, setIsCartOpen, cartCount, showToast } = useCart();
    const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);

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

    // Media Modal State
    const [selectedReviewMedia, setSelectedReviewMedia] = useState<Review | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [initialMediaUrl, setInitialMediaUrl] = useState<string>('');

    // Media State
    const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
    const [reviewVideo, setReviewVideo] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessingBuy, setIsProcessingBuy] = useState(false);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [activeChartTab, setActiveChartTab] = useState<'jersey' | 'shorts' | 'pants'>('jersey');
    const [promoSuccessSplash, setPromoSuccessSplash] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showPromoInput, setShowPromoInput] = useState(false);

    // Auth
    const { user } = useAuth();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            }
        };
        fetchUserProfile();
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

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            showToast("Пожалуйста, войдите в систему, чтобы оставить отзыв.", "info");
            return;
        }

        // With Supabase, we don't need strict 500KB limit. 
        // We set 50MB as a sensible maximum for reviews.
        const totalSize = reviewPhotos.reduce((acc, file) => acc + file.size, 0) + (reviewVideo ? reviewVideo.size : 0);
        if (totalSize > 50 * 1024 * 1024) {
            showToast("Общий размер файлов слишком большой (макс. 50 МБ). Пожалуйста, выберите видео меньшего размера.", "warning");
            return;
        }

        setReviewSubmitting(true);
        setIsUploading(true);
        try {
            const photoUrls: string[] = [];
            let videoUrl = '';

            // Process Photos and upload through Proxy
            if (reviewPhotos.length > 0) {
                for (const photo of reviewPhotos) {
                    try {
                        const formData = new FormData();
                        formData.append('file', photo);
                        formData.append('bucket', 'review-media');
                        formData.append('path', `photos/${Date.now()}_${photo.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`);

                        const response = await fetch('/api/upload-media', {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) throw new Error('Proxy photo upload failed');

                        const { publicUrl } = await response.json();
                        photoUrls.push(publicUrl);
                    } catch (err) {
                        console.error("Error uploading photo through proxy:", photo.name, err);
                    }
                }
            }

            // Process Video and upload through Proxy
            if (reviewVideo) {
                try {
                    const formData = new FormData();
                    formData.append('file', reviewVideo);
                    formData.append('bucket', 'review-media');
                    formData.append('path', `videos/${Date.now()}_${reviewVideo.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`);

                    const response = await fetch('/api/upload-media', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) throw new Error('Proxy video upload failed');

                    const { publicUrl } = await response.json();
                    videoUrl = publicUrl;
                } catch (err) {
                    console.error("Error uploading video through proxy:", reviewVideo.name, err);
                }
            }

            console.log("Submitting review to Firestore with data:", {
                photoUrls,
                videoUrl
            });

            let authorName = user.displayName || user.email?.split('@')[0] || 'Пользователь';
            if (userProfile?.firstName && userProfile?.lastName) authorName = `${userProfile.firstName} ${userProfile.lastName}`;

            await addDoc(collection(db, 'reviews'), {
                productId: id,
                userId: user.uid,
                userName: authorName,
                userAvatar: userProfile?.photoURL || user.photoURL || '',
                rating: newReviewRating,
                comment: newReviewComment,
                photos: photoUrls,
                video: videoUrl,
                likes: [],
                replies: [],
                createdAt: serverTimestamp()
            });

            setIsReviewFormOpen(false);
            setNewReviewComment('');
            setNewReviewRating(5);
            setReviewPhotos([]);
            setReviewVideo(null);
        } catch (error) {
            console.error("Error submitting review:", error);
            showToast("Ошибка при отправке отзыва. Попробуйте позже.", "error");
        } finally {
            setReviewSubmitting(false);
            setIsUploading(false);
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;
        try {
            await deleteDoc(doc(db, 'reviews', reviewId));
        } catch (error) {
            console.error("Error deleting review:", error);
            showToast("Ошибка при удалении отзыва.", "error");
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
        if (!user || !replyComment.trim()) return;

        try {
            // Fetch user profile for reply
            let authorName = user.displayName || user.email?.split('@')[0] || 'Пользователь';
            let authorAvatar = user.photoURL || '';
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.firstName && userData.lastName) authorName = `${userData.firstName} ${userData.lastName}`;
                    if (userData.photoURL) authorAvatar = userData.photoURL;
                }
            } catch (err) { console.error(err); }

            const newReply = {
                id: Date.now().toString(),
                userId: user.uid,
                userName: authorName,
                userAvatar: authorAvatar,
                comment: replyComment,
                createdAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'reviews', reviewId), {
                replies: arrayUnion(newReply)
            });
            setReplyingReviewId(null);
            setReplyComment('');
        } catch (error) {
            console.error("Error replying:", error);
            showToast("Ошибка при отправке ответа.", "error");
        }
    };

    const handleDeleteReply = async (reviewId: string, replyId: string, replies: any[]) => {
        if (!confirm('Вы уверены, что хотите удалить этот ответ?')) return;
        try {
            const updatedReplies = replies.filter(r => r.id !== replyId);
            await updateDoc(doc(db, 'reviews', reviewId), {
                replies: updatedReplies
            });
        } catch (error) {
            console.error("Error deleting reply:", error);
            showToast("Ошибка при удалении ответа.", "error");
        }
    };

    const handleStartReplyEdit = (reply: any) => {
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
                <button onClick={() => navigate('/shop')} className="text-yellow-500 hover:underline">Вернуться в магазин</button>
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
            {/* Floating Cart Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsCartOpen(true)}
                className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 bg-yellow-500 text-black p-3.5 sm:p-4 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-110 transition-transform flex items-center justify-center"
            >
                <ShoppingCart size={22} className="sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold border-2 border-[#020202]">
                        {cartCount}
                    </span>
                )}
            </motion.button>

            {/* Header */}
            <div className="bg-surface-dark border-b border-card-border/5 pt-20 pb-6 px-4 sm:px-6 relative z-10">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/shop')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Назад в магазин
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16 sm:mb-20">

                    {/* Left: Gallery */}
                    <div className="space-y-4">
                        <div className="relative aspect-square bg-surface-dark rounded-3xl overflow-hidden border border-card-border/5 group">
                            {/* Badges on main image */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2 z-20 pointer-events-none">
                                {product.badges?.includes('hit') && <span className="px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-lg text-xs font-black text-white shadow-lg shadow-red-500/20 uppercase tracking-widest leading-none">Хит Продаж</span>}
                                {product.badges?.includes('new') && <span className="px-3 py-1 bg-green-600/90 backdrop-blur-md rounded-lg text-xs font-black text-white shadow-lg shadow-green-500/20 uppercase tracking-widest leading-none">Новинка</span>}
                                {product.badges?.includes('last_chance') && <span className="px-3 py-1 bg-orange-600/90 backdrop-blur-md rounded-lg text-xs font-black text-white shadow-lg shadow-orange-500/20 uppercase tracking-widest leading-none">Последний Шанс</span>}
                            </div>
                            {selectedImage ? (
                                <motion.img
                                    key={selectedImage}
                                    src={selectedImage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                        const parent = (e.target as HTMLElement).parentElement;
                                        if (parent) {
                                            const fallback = parent.querySelector('.img-fallback');
                                            if (fallback) fallback.classList.remove('hidden');
                                        }
                                    }}
                                    className="w-full h-full object-cover"
                                    alt={product.title}
                                />
                            ) : null}
                            <div className={`w-full h-full flex flex-col items-center justify-center text-gray-800 bg-[#121212] img-fallback ${selectedImage ? 'hidden' : ''}`}>
                                <ShoppingBag size={80} className="text-yellow-500/40" />
                            </div>
                        </div>
                        {gallery.length > 1 && (
                            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none touch-scrolling">
                                {gallery.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(img)}
                                        className={`relative w-20 sm:w-24 h-20 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-yellow-500' : 'border-transparent hover:border-white/20'
                                            }`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="space-y-8 relative">
                        {/* Success Splash Overlay */}
                        <AnimatePresence>
                            {promoSuccessSplash && appliedPromo && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                    className="absolute inset-0 z-50 bg-surface/90 backdrop-blur-md rounded-2xl flex items-center justify-center border border-green-500/30 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] pointer-events-none" />

                                    <div className="text-center p-8 relative z-10 flex flex-col items-center">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                            className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(74,222,128,0.5)]"
                                        >
                                            <Tag size={40} className="text-black" />
                                        </motion.div>
                                        <motion.h3
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-4xl font-russo text-white mb-2 uppercase tracking-widest"
                                        >
                                            Скидка -{appliedPromo.value}%!
                                        </motion.h3>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="text-yellow-500 font-bold mb-4"
                                        >
                                            Промокод {appliedPromo.code} активирован
                                        </motion.p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm font-bold border border-yellow-500/20">
                                    {product.category}
                                </span>
                                {product.colors && product.colors.length > 0 && (
                                    <div className="flex gap-1">
                                        {product.colors.map(c => {
                                            let bgStyle = { background: '#888' };
                                            if (c === 'Белый') bgStyle.background = '#fff';
                                            else if (c === 'Черный') bgStyle.background = '#000';
                                            else if (c === 'Синий') bgStyle.background = '#1d4ed8';
                                            else if (c === 'Красный') bgStyle.background = '#dc2626';
                                            else if (c === 'Зеленый' || c === 'Неоново-Зеленый') bgStyle.background = '#16a34a';
                                            else if (c === 'Желтый') bgStyle.background = '#ca8a04';
                                            else if (c === 'Белый/Темно-Синий') bgStyle.background = 'linear-gradient(135deg, #fff 50%, #172554 50%)';
                                            else if (c === 'Красный/Черный') bgStyle.background = 'linear-gradient(135deg, #dc2626 50%, #000 50%)';
                                            else if (c === 'Антрацит/Черный') bgStyle.background = 'linear-gradient(135deg, #4b5563 50%, #000 50%)';
                                            else if (c === 'Черный/Салатовый') bgStyle.background = 'linear-gradient(135deg, #000 50%, #4ade80 50%)';

                                            return (
                                                <div key={c} className="w-4 h-4 rounded-full border border-white/10" title={c} style={bgStyle} />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{product.title}</h1>
                            <div className="flex flex-col items-start mb-6">
                                {product.oldPrice && product.oldPrice > product.price && (
                                    <div className="flex items-center gap-3">
                                        <span className="line-through text-gray-500 font-mono text-xl decoration-2 mb-1">
                                            {product.oldPrice.toLocaleString()} ₽
                                        </span>
                                        <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[12px] font-bold rounded mb-1">
                                            -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                                        </span>
                                    </div>
                                )}
                                {appliedPromo && (
                                    <span className="line-through text-red-500 font-mono text-xl opacity-80 decoration-2 decoration-red-500/50">
                                        {product.price.toLocaleString()} ₽
                                    </span>
                                )}
                                <span className="text-4xl font-mono font-bold text-yellow-500">
                                    {(appliedPromo ? Math.floor(product.price * (1 - appliedPromo.value / 100)) : product.price).toLocaleString()} ₽
                                </span>
                            </div>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                {product.description}
                            </p>
                        </div>

                        <div className="h-px bg-white/10" />

                        {/* Selectors */}
                        <div className="space-y-6">
                            {product.sizes && product.sizes.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Размер</label>
                                        <button
                                            onClick={() => setIsSizeChartOpen(true)}
                                            className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 uppercase tracking-widest flex items-center gap-1.5 transition-colors group"
                                        >
                                            <AlertCircle size={14} className="group-hover:rotate-12 transition-transform" />
                                            Помочь с размером
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {product.sizes.map(size => {
                                            const stock = product.stock?.[size];
                                            const isOutOfStock = stock === 0;

                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => !isOutOfStock && setSelectedSize(size)}
                                                    disabled={isOutOfStock}
                                                    className={`min-w-[3rem] h-12 px-4 rounded-xl font-bold flex flex-col items-center justify-center border transition-all ${isOutOfStock
                                                        ? 'bg-[#111] text-gray-600 border-white/5 opacity-50 cursor-not-allowed line-through'
                                                        : selectedSize === size
                                                            ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                                            : 'bg-surface-dark text-secondary border-card-border/10 hover:border-card-border/30'
                                                        }`}
                                                >
                                                    <span>{size}</span>
                                                    {isOutOfStock && <span className="text-[10px] uppercase font-black tracking-widest mt-0.5 no-underline block leading-none">Раскупили</span>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {product.colors && product.colors.length > 0 && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Цвет</label>
                                    <div className="flex flex-wrap gap-3">
                                        {product.colors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => {
                                                    setSelectedColor(color);
                                                    if (product.colorImages && product.colorImages[color]) {
                                                        setSelectedImage(product.colorImages[color]);
                                                    }
                                                }}
                                                className={`px-6 py-3 rounded-xl font-bold border transition-all ${selectedColor === color
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-surface-dark text-secondary border-card-border/10 hover:border-card-border/30'
                                                    }`}
                                            >
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {product.isCustomizable && (
                                <div className="space-y-6 p-6 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-colors group-hover:bg-yellow-500/10" />

                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Edit2 size={18} className="text-yellow-500" />
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Индивидуальный пошив</h3>
                                        </div>
                                    </div>

                                    {/* Silhuette Selection */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Желаемый силуэт (Fit Style)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Приталенный', 'Стандарт', 'Свободный'].map(style => (
                                                <button
                                                    key={style}
                                                    type="button"
                                                    onClick={() => setFitStyle(style)}
                                                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${fitStyle === style
                                                            ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                                            : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Имя на спине</label>
                                            <input
                                                type="text"
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                                                placeholder="НАПРИМЕР: ПЕТРОВ"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm font-bold uppercase tracking-widest focus:border-yellow-500/50 outline-none transition-all placeholder:text-white/10"
                                                maxLength={15}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Игровой номер</label>
                                            <input
                                                type="text"
                                                value={customNumber}
                                                onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                placeholder="ОТ 1 ДО 99"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm font-bold uppercase tracking-widest focus:border-yellow-500/50 outline-none transition-all placeholder:text-white/10"
                                                maxLength={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    {/* Top Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 bg-yellow-500 rounded-full" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">Замеры: Верх</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[
                                                { label: 'Рост', key: 'height' },
                                                { label: 'Обхват груди', key: 'chest' },
                                                { label: 'Ширина плеч', key: 'shoulders' },
                                                { label: 'Длина рукава', key: 'sleeve' },
                                            ].map(item => (
                                                <div key={item.key} className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter ml-1">{item.label}</label>
                                                    <input
                                                        type="text"
                                                        value={measurements[item.key as keyof typeof measurements]}
                                                        onChange={(e) => setMeasurements(prev => ({ ...prev, [item.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                                                        placeholder="СМ"
                                                        className="w-full bg-surface/20 border border-white/5 rounded-lg p-3 text-white text-xs font-bold outline-none focus:border-yellow-500/30 transition-all placeholder:text-white/5"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bottom Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 bg-yellow-500 rounded-full" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">Замеры: Низ</h4>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[
                                                { label: 'Обхват талии', key: 'waist' },
                                                { label: 'Обхват бедер', key: 'hips' },
                                                { label: 'Длина изделия', key: 'length' },
                                            ].map(item => (
                                                <div key={item.key} className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter ml-1">{item.label}</label>
                                                    <input
                                                        type="text"
                                                        value={measurements[item.key as keyof typeof measurements]}
                                                        onChange={(e) => setMeasurements(prev => ({ ...prev, [item.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                                                        placeholder="СМ"
                                                        className="w-full bg-surface/20 border border-white/5 rounded-lg p-3 text-white text-xs font-bold outline-none focus:border-yellow-500/30 transition-all placeholder:text-white/5"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-[9px] text-white/30 italic mt-6 border-t border-white/5 pt-4">
                                        * Для максимально точного пошива рекомендуем производить замеры на тонкую одежду. Срок изготовления: 7-12 дней.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Promo Code System */}
                        <div className="mb-4">
                            {appliedPromo ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between group">
                                    <div className="flex items-center gap-3 text-green-400">
                                        <div className="bg-green-500/20 p-2 rounded-lg">
                                            <Check size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm tracking-wide">Промокод <span className="font-mono text-green-300">{appliedPromo.code}</span> применен!</div>
                                            <div className="text-xs text-green-500 flex items-center gap-1 mt-0.5"><Tag size={10} /> Скидка -{appliedPromo.value}%</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAppliedPromo(null)}
                                        className="text-green-500/50 hover:text-green-400 hover:bg-green-500/20 p-2 rounded-lg transition-colors"
                                        title="Отменить промокод"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : showPromoInput ? (
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                            <input
                                                type="text"
                                                value={promoCode}
                                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                placeholder="ВВЕДИТЕ ПРОМОКОД"
                                                className={`w-full bg-[#1a1a1a] border ${promoError ? 'border-red-500/50' : 'border-white/10'} rounded-xl p-3 pl-10 text-white uppercase font-mono tracking-widest text-sm focus:border-yellow-500 outline-none transition-colors`}
                                            />
                                        </div>
                                        {promoError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-[10px] mt-1.5 ml-1 font-bold tracking-wider uppercase">{promoError}</motion.p>}
                                    </div>
                                    <button
                                        onClick={applyPromoCode}
                                        disabled={isApplyingPromo || !promoCode.trim()}
                                        className="px-6 h-[46px] bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {isApplyingPromo ? <Loader2 className="animate-spin" size={20} /> : 'Применить'}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setShowPromoInput(true)} className="text-white/40 text-xs font-bold uppercase tracking-widest hover:text-yellow-500 transition-colors flex items-center gap-2 group">
                                    <Tag size={14} className="group-hover:-rotate-12 transition-transform" /> У меня есть промокод
                                </button>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 pt-4">
                            <button
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
                                disabled={(selectedSize && product.stock?.[selectedSize] === 0) || (!selectedSize && product.sizes?.length > 0)}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:border-white/5 text-black py-4 rounded-xl font-black transition-all shadow-[0_0_30px_rgba(234,179,8,0.2)] flex items-center justify-center gap-3 active:scale-[0.98] text-lg uppercase tracking-wider group"
                            >
                                <ShoppingCart size={24} className="group-hover:-translate-y-0.5 transition-transform" />
                                {(selectedSize && product.stock?.[selectedSize] === 0) ? 'Раскупили' : 'В корзину'}
                            </button>
                            <button
                                onClick={() => toggleFavorite(product.id)}
                                className={`w-16 h-16 bg-[#1a1a1a] border rounded-2xl flex items-center justify-center transition-all ${isFavorite(product.id)
                                    ? 'border-red-500/50 text-red-500 bg-red-500/5'
                                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/50'
                                    }`}
                            >
                                <Heart size={24} fill={isFavorite(product.id) ? "currentColor" : "none"} className={isFavorite(product.id) ? "scale-110" : ""} />
                            </button>
                        </div>

                        {/* Specs */}
                        {product.specifications && Object.keys(product.specifications).length > 0 && (
                            <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
                                <h3 className="font-bold text-white mb-4">Характеристики</h3>
                                <div className="space-y-3">
                                    {Object.entries(product.specifications).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm py-2 border-b border-white/5 last:border-0">
                                            <span className="text-gray-400">{key}</span>
                                            <span className="text-white font-medium">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold flex items-center gap-3">
                            Отзывы
                            <span className="text-lg text-gray-500 font-normal">({reviews.length})</span>
                        </h2>

                        <button
                            onClick={() => setIsReviewFormOpen(!isReviewFormOpen)}
                            className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-xl border border-white/10 font-bold transition-all"
                        >
                            Написать отзыв
                        </button>
                    </div>

                    <AnimatePresence>
                        {isReviewFormOpen && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 mb-8 overflow-hidden"
                                onSubmit={handleSubmitReview}
                            >
                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-2">Ваша оценка</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewReviewRating(star)}
                                                className={`transition-colors ${star <= newReviewRating ? 'text-yellow-500' : 'text-gray-600'}`}
                                            >
                                                <Star fill={star <= newReviewRating ? "currentColor" : "none"} size={32} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-400 text-sm mb-2">Ваш комментарий</label>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {userProfile?.photoURL || user?.photoURL ? (
                                                <img src={userProfile?.photoURL || user?.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-gray-500">{user?.displayName?.[0]?.toUpperCase() || 'U'}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <textarea
                                                required
                                                rows={4}
                                                value={newReviewComment}
                                                onChange={(e) => setNewReviewComment(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-yellow-500/50 focus:outline-none"
                                                placeholder="Расскажите о ваших впечатлениях..."
                                            />

                                            {/* Media Previews */}
                                            {(reviewPhotos.length > 0 || reviewVideo) && (
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {reviewPhotos.map((photo, index) => (
                                                        <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 group">
                                                            <img src={URL.createObjectURL(photo)} alt="preview" className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setReviewPhotos(prev => prev.filter((_, i) => i !== index))}
                                                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {reviewVideo && (
                                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 group bg-black">
                                                            <video src={URL.createObjectURL(reviewVideo)} className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => setReviewVideo(null)}
                                                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <VideoIcon size={16} className="text-white/80" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm border border-white/5">
                                                    <Camera size={16} />
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
                                                <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm border border-white/5">
                                                    <VideoIcon size={16} />
                                                    <span>Видео</span>
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                setReviewVideo(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-2">
                                                * Лимит медиа — 50 МБ (Supabase Storage).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsReviewFormOpen(false)}
                                        className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={reviewSubmitting}
                                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold transition-all disabled:opacity-50"
                                    >
                                        {reviewSubmitting ? 'Отправка...' : 'Отправить'}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <div className="space-y-6">
                        {reviews.length > 0 ? (
                            reviews.map(review => (
                                <div key={review.id} className="bg-[#1a1a1a]/50 p-6 rounded-2xl border border-white/5">
                                    {editingReviewId === review.id ? (
                                        <div className="space-y-4">
                                            <div className="flex gap-2 mb-2">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button key={star} onClick={() => setEditRating(star)}>
                                                        <Star size={20} fill={star <= editRating ? "currentColor" : "none"} className={star <= editRating ? "text-yellow-500" : "text-gray-600"} />
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={editComment}
                                                onChange={(e) => setEditComment(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-yellow-500/50"
                                                rows={3}
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setEditingReviewId(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 font-bold">Отмена</button>
                                                <button onClick={handleSaveEdit} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold">Сохранить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex gap-3 items-center">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                                                        {review.userAvatar ? (
                                                            <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-gray-500">{review.userName?.[0]?.toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg leading-none">{review.userName}</h4>
                                                        <div className="flex gap-1 mt-1">
                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                <Star key={i} size={14} fill={i < review.rating ? "#eab308" : "none"} className={i < review.rating ? "text-yellow-500" : "text-gray-700"} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Недавно'}
                                                </span>
                                            </div>
                                            <p className="text-gray-300 leading-relaxed mb-4">{review.comment}</p>

                                            {/* Review Media Case-Insensitive Check */}
                                            {((review.photos && review.photos.length > 0) || !!review.video) && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {review.photos?.map((photo, index) => (
                                                        <div
                                                            key={index}
                                                            className="w-24 h-24 rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => {
                                                                setSelectedReviewMedia(review);
                                                                setInitialMediaUrl(photo);
                                                                setIsMediaModalOpen(true);
                                                            }}
                                                        >
                                                            <img src={photo} alt="Review attachment" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                    {review.video && (
                                                        <div
                                                            className="w-48 h-28 rounded-lg overflow-hidden border border-white/10 bg-black group relative cursor-pointer hover:scale-[1.02] transition-transform"
                                                            onClick={() => {
                                                                setSelectedReviewMedia(review);
                                                                setInitialMediaUrl(review.video!);
                                                                setIsMediaModalOpen(true);
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 z-10 bg-black/40 group-hover:bg-surface/20 transition-colors flex items-center justify-center">
                                                                <div className="w-12 h-12 rounded-full bg-sparta-gold/90 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                                    <Play size={20} fill="currentColor" className="ml-1" />
                                                                </div>
                                                            </div>
                                                            <video
                                                                src={review.video}
                                                                className="w-full h-full object-cover opacity-60"
                                                                muted
                                                                playsInline
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                                                <button
                                                    onClick={() => handleLikeReview(review.id, review.likes)}
                                                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${review.likes?.includes(user?.uid || '') ? 'text-yellow-500' : 'text-gray-500 hover:text-white'}`}
                                                >
                                                    <ThumbsUp size={16} />
                                                    {review.likes?.length || 0}
                                                </button>

                                                <button
                                                    onClick={() => setReplyingReviewId(replyingReviewId === review.id ? null : review.id)}
                                                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-colors"
                                                >
                                                    <MessageCircle size={16} />
                                                    Ответить
                                                </button>

                                                {user && user.uid === review.userId && (
                                                    <div className="flex gap-2 ml-auto">
                                                        <button onClick={() => handleStartEdit(review)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteReview(review.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Replies Section */}
                                            {review.replies && review.replies.length > 0 && (
                                                <div className="mt-4 pl-6 border-l-2 border-white/5 space-y-4">
                                                    {review.replies.map(reply => (
                                                        <div key={reply.id} className="bg-surface/20 p-4 rounded-xl">
                                                            {editingReplyId === reply.id ? (
                                                                <div className="space-y-3">
                                                                    <textarea
                                                                        value={editReplyComment}
                                                                        onChange={(e) => setEditReplyComment(e.target.value)}
                                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500/50 text-sm"
                                                                        rows={2}
                                                                    />
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingReplyId(null)}
                                                                            className="px-3 py-1.5 rounded-lg text-gray-400 hover:bg-white/5 font-bold text-xs"
                                                                        >
                                                                            Отмена
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveReplyEdit(review.id, review.replies || [])}
                                                                            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-bold text-xs"
                                                                        >
                                                                            Сохранить
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
                                                                                {reply.userAvatar ? (
                                                                                    <img src={reply.userAvatar} alt={reply.userName} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <span className="font-bold text-gray-500 text-xs">{reply.userName?.[0]?.toUpperCase()}</span>
                                                                                )}
                                                                            </div>
                                                                            <span className="font-bold text-white text-sm">{reply.userName}</span>
                                                                            <span className="text-xs text-gray-500">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                                                        </div>

                                                                        {user && user.uid === reply.userId && (
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleStartReplyEdit(reply);
                                                                                    }}
                                                                                    className="p-1 text-gray-500 hover:text-white hover:bg-white/5 rounded transition-all"
                                                                                >
                                                                                    <Edit2 size={12} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteReply(review.id, reply.id, review.replies || []);
                                                                                    }}
                                                                                    className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-gray-400 text-sm whitespace-pre-wrap">{reply.comment}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Reply Form */}
                                            {replyingReviewId === review.id && (
                                                <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                        {userProfile?.photoURL || user?.photoURL ? (
                                                            <img src={userProfile?.photoURL || user?.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-gray-500 text-xs">{user?.displayName?.[0]?.toUpperCase() || 'U'}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={replyComment}
                                                            onChange={(e) => setReplyComment(e.target.value)}
                                                            placeholder="Ваш ответ..."
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-yellow-500/50"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSubmitReply(review.id);
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSubmitReply(review.id);
                                                            }}
                                                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold transition-all hover:scale-105"
                                                        >
                                                            <Share2 size={18} className="rotate-90" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p>Отзывов пока нет. Будьте первым!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >

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

            <ReviewMediaModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                review={selectedReviewMedia}
                initialMediaUrl={initialMediaUrl}
            />
        </div >
    );
};

export default ProductDetails;
