import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, MessageSquareQuote, Quote, CheckCircle2, Heart, Zap, ThumbsUp, PartyPopper, ChevronRight, ImageIcon, MessageCircle, Video, Shield, Dumbbell, BadgeCheck, Code } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Review } from '../types/review';
import { Container } from './UIComponents';

const getVideoEmbedUrl = (url: string) => {
    if (!url) return undefined;

    // YouTube
    const ytRegExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
    const ytMatch = url.match(ytRegExp);
    if (ytMatch && ytMatch[1].length === 11) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // VK Video
    const vkRegExp = /(?:vk\.com|vk\.ru|vkvideo\.ru|live\.vkvideo\.ru)\/(?:video|.*?z=video)(-?\d+)_(\d+)/;
    const vkMatch = url.match(vkRegExp);
    if (vkMatch) {
        return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&hd=2`;
    }

    if (url.includes('video_ext.php')) return url;
    if (url.toLowerCase().includes('<iframe')) {
        const srcMatch = url.match(/src=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) return srcMatch[1];
    }

    return url;
};

interface ReviewsSectionProps {
    onOpenReview: () => void;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ onOpenReview }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'photo' | 'video' | 'verified'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'best'>('best');
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.2 });

    useEffect(() => {
        // We remove orderBy from the query to avoid the need for a composite index in Firestore.
        // This makes the system work immediately without manual index creation.
        const q = query(
            collection(db, 'reviews'),
            where('status', '==', 'approved')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Review[];

            // 1. Deduplication: One review per user (keep latest)
            const uniqueUserReviewsMap = new Map<string, Review>();
            data.forEach(review => {
                const existing = uniqueUserReviewsMap.get(review.userId);
                const currentMillis = review.createdAt?.toMillis() || 0;
                const existingMillis = existing?.createdAt?.toMillis() || 0;

                if (!existing || currentMillis > existingMillis) {
                    uniqueUserReviewsMap.set(review.userId, review);
                }
            });

            const uniqueReviews = Array.from(uniqueUserReviewsMap.values());

            // 2. Sorting & Featured Priority: 
            // - Featured reviews ALWAYS come first.
            // - Within featured/non-featured groups, sort by selected criteria.
            const sorted = uniqueReviews.sort((a, b) => {
                // Priority for Featured reviews
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;

                // Sort by date OR helpfulness
                if (sortBy === 'newest') {
                    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
                } else {
                    const aScore = (a.helpful?.length || 0) + (Object.values(a.reactions || {}).flat().length * 0.5);
                    const bScore = (b.helpful?.length || 0) + (Object.values(b.reactions || {}).flat().length * 0.5);
                    return bScore - aScore;
                }
            });

            setReviews(sorted);
            setLoading(false);
        }, (error) => {
            console.error("Firestore error in ReviewsSection:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 3. Filtering
    const filteredReviews = reviews.filter(review => {
        if (activeFilter === 'photo') return !!review.image;
        if (activeFilter === 'video') return !!review.videoUrl;
        if (activeFilter === 'verified') return !!review.isVerified;
        return true;
    });

    // Smart duplication logic for the marquee
    const isMarqueeActive = filteredReviews.length >= 4;

    const displayReviews = isMarqueeActive
        ? (filteredReviews.length < 8 ? [...filteredReviews, ...filteredReviews] : filteredReviews)
        : filteredReviews;

    return (
        <section id="reviews" className="py-24 relative overflow-hidden bg-[#0A0A0A] border-t border-white/5" ref={containerRef}>
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sparta-gold/5 rounded-full blur-[120px] pointer-events-none" />

            <Container className="mb-16 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
                >
                    <MessageSquareQuote size={16} className="text-sparta-gold" />
                    <span className="text-white/70 text-sm font-manrope tracking-wider uppercase">Что говорят чемпионы</span>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl md:text-5xl lg:text-6xl font-russo uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 mb-8"
                >
                    ОТЗЫВЫ <span className="text-sparta-gold">КЛИЕНТОВ</span>
                </motion.h2>

                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    onClick={onOpenReview}
                    className="bg-sparta-gold text-black font-russo uppercase px-8 py-4 rounded-full hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-105 transition-all"
                >
                    Оставить Свой Отзыв
                </motion.button>
            </Container>

            {/* Filter Bar */}
            <Container className="mb-12 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 border-b border-white/5 pb-8">
                <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                        Все
                    </button>
                    <button
                        onClick={() => setActiveFilter('photo')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'photo' ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                        <ImageIcon size={14} />
                        С фото
                    </button>
                    <button
                        onClick={() => setActiveFilter('video')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'video' ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                        <Video size={14} />
                        С видео
                    </button>
                    <button
                        onClick={() => setActiveFilter('verified')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'verified' ? 'bg-sparta-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-white/40 hover:text-white'}`}
                    >
                        <CheckCircle2 size={14} />
                        Проверенные
                    </button>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    <button
                        onClick={() => setSortBy('best')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'best' ? 'bg-white/10 text-sparta-gold' : 'text-white/40 hover:text-white'}`}
                    >
                        ЛУЧШИЕ
                    </button>
                    <button
                        onClick={() => setSortBy('newest')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortBy === 'newest' ? 'bg-white/10 text-sparta-gold' : 'text-white/40 hover:text-white'}`}
                    >
                        НОВЫЕ
                    </button>
                </div>
            </Container>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-sparta-gold/30 border-t-sparta-gold rounded-full animate-spin" />
                </div>
            ) : filteredReviews.length === 0 ? (
                <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white/[0.03] border border-white/10 text-center flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-2xl mb-4">
                        💬
                    </div>
                    <h4 className="font-russo text-lg text-white mb-2">Пока нет отзывов по данному фильтру</h4>
                    <p className="font-manrope text-white/60 text-xs sm:text-sm mb-6 leading-relaxed">
                        Поделитесь впечатлениями о тренировках вашего ребенка или первом пробном дне!
                    </p>
                    {onOpenReview && (
                        <button
                            onClick={onOpenReview}
                            className="min-h-[48px] px-6 py-3 rounded-2xl bg-sparta-gold text-black font-russo text-xs tracking-wider uppercase font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        >
                            Оставить первый отзыв
                        </button>
                    )}
                </div>
            ) : !isMarqueeActive ? (
                /* Static Grid for few reviews */
                <Container className="flex flex-wrap justify-center gap-8 relative z-10">
                    {filteredReviews.map((review) => (
                        <ReviewCard key={`static-${review.id}`} review={review} />
                    ))}
                </Container>
            ) : (
                /* Infinite Scrolling Marquee for many reviews */
                <div className="relative flex overflow-x-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />

                    <div className="animate-marquee group-hover:pause flex gap-6 px-3">
                        {displayReviews.map((review, i) => (
                            <ReviewCard key={`marquee-1-${review.id}-${i}`} review={review} />
                        ))}
                    </div>
                    <div className="animate-marquee2 group-hover:pause flex gap-6 px-3 absolute top-0">
                        {displayReviews.map((review, i) => (
                            <ReviewCard key={`marquee-2-${review.id}-${i}`} review={review} />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

interface ReviewCardProps {
    review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
    const user = auth.currentUser;
    const [isResponding, setIsResponding] = useState(false);

    const handleReaction = async (emoji: string) => {
        if (!user) return;
        const reviewRef = doc(db, 'reviews', review.id);
        const currentReactions = review.reactions || {};
        const userList = currentReactions[emoji] || [];

        if (userList.includes(user.uid)) {
            await updateDoc(reviewRef, {
                [`reactions.${emoji}`]: arrayRemove(user.uid)
            });
        } else {
            await updateDoc(reviewRef, {
                [`reactions.${emoji}`]: arrayUnion(user.uid)
            });
        }
    };

    const handleHelpful = async () => {
        if (!user) return;
        const reviewRef = doc(db, 'reviews', review.id);
        const helpfulList = review.helpful || [];

        if (helpfulList.includes(user.uid)) {
            await updateDoc(reviewRef, { helpful: arrayRemove(user.uid) });
        } else {
            await updateDoc(reviewRef, { helpful: arrayUnion(user.uid) });
        }
    };

    const reactionIcons: { [key: string]: React.ReactNode } = {
        '🔥': <Zap size={14} />,
        '❤️': <Heart size={14} />,
        '👍': <ThumbsUp size={14} />,
        '👏': <PartyPopper size={14} />
    };

    return (
        <div className={`w-[calc(100vw-2.5rem)] sm:w-[350px] md:w-[450px] shrink-0 bg-white/5 backdrop-blur-md border rounded-3xl p-6 md:p-8 hover:bg-white/10 transition-all duration-300 relative group/card flex flex-col ${review.isFeatured
            ? 'border-sparta-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.15)] ring-1 ring-sparta-gold/20'
            : 'border-white/10'
            }`}>

            {review.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sparta-gold text-black text-[10px] font-bold px-4 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,175,55,0.4)] animate-pulse">
                    <Zap size={10} fill="currentColor" /> ВЫБОР СПАРТЫ
                </div>
            )}

            <Quote className="absolute top-8 right-8 text-sparta-gold/5 w-16 h-16 transition-all group-hover/card:text-sparta-gold/10" />

            {/* Header: Rating & Verification */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            size={16}
                            fill={i < review.rating ? "currentColor" : "none"}
                            className={i < review.rating ? "text-sparta-gold" : "text-white/10"}
                        />
                    ))}
                </div>
                {review.isVerified && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-sparta-gold/10 rounded-full border border-sparta-gold/20">
                        <CheckCircle2 size={12} className="text-sparta-gold" />
                        <span className="text-[10px] font-bold text-sparta-gold uppercase tracking-wider">Проверено</span>
                    </div>
                )}
            </div>

            {/* Attached Video */}
            {review.videoUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black relative group/vid">
                    {review.videoUrl.includes('firebasestorage') || review.videoUrl.includes('supabase.co') || review.videoUrl.includes('firebase') ? (
                        <video
                            src={review.videoUrl}
                            className="w-full h-full object-cover"
                            controls
                            playsInline
                        />
                    ) : (
                        <iframe
                            src={getVideoEmbedUrl(review.videoUrl)}
                            className="w-full h-full"
                            frameBorder="0"
                            allowFullScreen
                        />
                    )}
                    <div className="absolute top-2 left-2 bg-red-500/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white flex items-center gap-1 pointer-events-none z-10">
                        <Video size={10} /> ВИДЕО
                    </div>
                </div>
            )}

            {/* Attached Image (only if no video) */}
            {review.image && !review.videoUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/50">
                    <img src={review.image} alt="Review" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
            )}

            {/* Text Content */}
            <p className="text-white/80 font-manrope leading-relaxed mb-6 italic relative z-10 text-base md:text-lg flex-1">
                "{review.text}"
            </p>

            {/* Reactions & Helpful Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {Object.entries(reactionIcons).map(([emoji, icon]) => {
                    const count = review.reactions?.[emoji]?.length || 0;
                    const isActive = user && review.reactions?.[emoji]?.includes(user.uid);
                    return (
                        <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${isActive
                                ? 'bg-sparta-gold text-black border-sparta-gold font-bold scale-105'
                                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {icon}
                            <span className="text-xs">{count}</span>
                        </button>
                    );
                })}

                <button
                    onClick={handleHelpful}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${user && review.helpful?.includes(user.uid)
                        ? 'bg-green-500/20 text-green-400 border-green-500/30 font-bold'
                        : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                        }`}
                >
                    <ThumbsUp size={12} />
                    <span>Полезно ({review.helpful?.length || 0})</span>
                </button>
            </div>

            {/* Club Response */}
            {review.clubResponse && (
                <div className="mb-6 p-4 rounded-2xl bg-sparta-gold/5 border border-sparta-gold/20 relative animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-sparta-gold flex items-center justify-center text-[10px] font-bold text-black">
                            S
                        </div>
                        <span className="text-xs font-bold text-sparta-gold uppercase tracking-tighter">Ответ Sparta</span>
                        <span className="text-[10px] text-white/20 ml-auto">
                            {new Date(review.clubResponse.respondedAt?.toMillis()).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-sm text-white/60 font-manrope italic leading-snug">
                        {review.clubResponse.text}
                    </p>
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-sparta-gold/5 border-l border-t border-sparta-gold/20 rotate-45" />
                </div>
            )}

            {/* Footer: User Info */}
            <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                <div className="w-10 h-10 bg-black/50 rounded-full border border-sparta-gold/20 overflow-hidden shrink-0">
                    {review.userPhoto ? (
                        <img src={review.userPhoto} alt={review.userName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-russo text-sparta-gold bg-gradient-to-br from-[#2a2a2a] to-[#111] text-sm">
                            {review.userName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="flex items-center gap-1 text-white font-bold font-manrope truncate leading-tight">
                        {review.userName || 'Клиент SPARTA'}
                        {review.userRole === 'admin' && <span title="Администратор"><BadgeCheck size={14} className="text-blue-500 shrink-0" /></span>}
                        {review.userRole === 'trainer' && <span title="Тренер"><Dumbbell size={14} className="text-green-500 shrink-0" /></span>}
                        {review.userRole === 'director' && <span title="Директор"><Star size={14} className="text-purple-500 shrink-0" /></span>}
                        {review.userRole === 'developer' && <span title="Разработчик"><Code size={14} className="text-cyan-500 shrink-0" /></span>}
                        {review.userVerification?.isVerified && <span title={review.userVerification.title}><BadgeCheck size={14} className="text-blue-500 shrink-0" /></span>}
                    </h3>
                    <span className="text-white/30 text-[10px] font-manrope uppercase tracking-widest block">Участник сообщества</span>
                </div>
            </div>
        </div>
    );
};

export default ReviewsSection;
