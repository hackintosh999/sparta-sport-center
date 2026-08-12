import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, increment } from 'firebase/firestore';
import { CheckCircle, XCircle, Trash2, Star, Clock, User, Filter, MessageSquare, CheckCircle2, ShieldCheck, Image as ImageIcon, Send, Crown, Video } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { Review } from '../../types/review';

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

const AdminReviews = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');

    useEffect(() => {
        const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Review[];
            setReviews(data);
            setLoading(false);
        }, (error) => {
            console.error("Firestore error in AdminReviews:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (review: Review, newStatus: 'approved' | 'rejected') => {
        try {
            const reviewRef = doc(db, 'reviews', review.id);
            const updates: any = { status: newStatus };

            // Reward Logic: If approved and reward not yet claimed
            if (newStatus === 'approved' && !review.isRewardClaimed && review.userId) {
                let bonusAmount = 50; // Standard
                if (review.videoUrl) bonusAmount = 150;
                else if (review.image) bonusAmount = 100;

                const userRef = doc(db, 'users', review.userId);

                // Update user balance and bonuses
                await updateDoc(userRef, {
                    balance: increment(bonusAmount),
                    bonuses: increment(bonusAmount)
                });

                updates.isRewardClaimed = true;
                console.log(`Awarded ${bonusAmount} bonuses to user ${review.userId}`);
            }

            await updateDoc(reviewRef, updates);
        } catch (error) {
            console.error("Error updating review status:", error);
            alert("Ошибка при обновлении статуса.");
        }
    };

    const handleToggleFeatured = async (id: string, current: boolean) => {
        try {
            await updateDoc(doc(db, 'reviews', id), { isFeatured: !current });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Вы уверены, что хотите безвозвратно удалить этот отзыв?')) {
            try {
                await deleteDoc(doc(db, 'reviews', id));
            } catch (error) {
                console.error("Error deleting review:", error);
                alert("Ошибка при удалении отзыва.");
            }
        }
    };

    const handleToggleVerified = async (id: string, current: boolean) => {
        try {
            await updateDoc(doc(db, 'reviews', id), { isVerified: !current });
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendResponse = async (id: string, text: string) => {
        if (!text.trim()) return;
        try {
            await updateDoc(doc(db, 'reviews', id), {
                clubResponse: {
                    text: text.trim(),
                    respondedAt: serverTimestamp(),
                    authorName: 'Администрация Sparta'
                }
            });
        } catch (err) {
            console.error(err);
            alert("Ошибка при отправке ответа");
        }
    };

    const handleDeleteResponse = async (id: string) => {
        if (!confirm('Удалить ответ клуба?')) return;
        try {
            await updateDoc(doc(db, 'reviews', id), { clubResponse: null });
        } catch (err) {
            console.error(err);
        }
    };

    const filteredReviews = reviews.filter(r => {
        if (filter === 'all') return true;
        return r.status === filter;
    });

    if (loading) {
        return <div className="p-8 text-white/50 animate-pulse">Загрузка отзывов...</div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in custom-scrollbar">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-russo uppercase text-white tracking-wider flex items-center gap-3">
                        <Star className="text-sparta-gold" />
                        Управление Отзывами
                    </h1>
                    <p className="text-white/50 text-sm mt-1 font-manrope">
                        Проверяйте новые отзывы и публикуйте их на главной странице.
                    </p>
                </div>

                <div className="flex bg-[#1a1a1a] rounded-xl p-1 border border-white/5">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'pending' ? 'bg-sparta-gold text-black' : 'text-white/50 hover:text-white'
                            }`}
                    >
                        <Clock size={16} /> На модерации
                        {reviews.filter(r => r.status === 'pending').length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                                {reviews.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'approved' ? 'bg-green-500 text-white' : 'text-white/50 hover:text-white'
                            }`}
                    >
                        <CheckCircle size={16} /> Опубликовано
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filter === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                            }`}
                    >
                        <Filter size={16} /> Все
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredReviews.length === 0 ? (
                    <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl bg-[#111]">
                        <Star className="mx-auto h-12 w-12 text-white/20 mb-3" />
                        <h3 className="text-lg font-bold text-white mb-1">Нет отзывов</h3>
                        <p className="text-white/50 text-sm">В данной категории пусто.</p>
                    </div>
                ) : (
                    filteredReviews.map((review) => (
                        <ReviewAdminCard
                            key={review.id}
                            review={review}
                            onUpdateStatus={handleUpdateStatus}
                            onDelete={handleDelete}
                            onToggleVerified={handleToggleVerified}
                            onToggleFeatured={handleToggleFeatured}
                            onSendResponse={handleSendResponse}
                            onDeleteResponse={handleDeleteResponse}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

interface ReviewAdminCardProps {
    review: Review;
    onUpdateStatus: (review: Review, status: 'approved' | 'rejected') => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onToggleVerified: (id: string, current: boolean) => Promise<void>;
    onToggleFeatured: (id: string, current: boolean) => Promise<void>;
    onSendResponse: (id: string, text: string) => Promise<void>;
    onDeleteResponse: (id: string) => Promise<void>;
}

const ReviewAdminCard: React.FC<ReviewAdminCardProps> = ({
    review,
    onUpdateStatus,
    onDelete,
    onToggleVerified,
    onToggleFeatured,
    onSendResponse,
    onDeleteResponse
}) => {
    const [responseText, setResponseText] = useState(review.clubResponse?.text || '');
    const [isReplying, setIsReplying] = useState(false);

    return (
        <div
            className={`bg-[#111] border rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden transition-all ${review.status === 'pending' ? 'border-sparta-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]' :
                review.status === 'approved' ? 'border-green-500/30' : 'border-red-500/30 opacity-75'
                }`}
        >
            {/* Badges */}
            <div className="absolute top-4 right-4 flex gap-2">
                {review.isFeatured && <span className="text-[10px] font-bold bg-sparta-gold text-black px-2 py-1 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(212,175,55,0.5)]"><Crown size={10} fill="currentColor" /> В ТОПЕ</span>}
                {review.isVerified && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded flex items-center gap-1"><ShieldCheck size={10} /> Проверен</span>}
                {review.status === 'pending' && <span className="text-[10px] font-bold bg-sparta-gold/20 text-sparta-gold px-2 py-1 rounded">На проверке</span>}
                {review.status === 'approved' && <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded">На сайте</span>}
                {review.status === 'rejected' && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded">Отклонен</span>}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                    {review.userAvatar ? (
                        <img src={review.userAvatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User size={20} className="text-white/30" />
                    )}
                </div>
                <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                        {review.userName || 'Аноним'}
                        <div className="flex gap-1">
                            <button
                                onClick={() => onToggleVerified(review.id, !!review.isVerified)}
                                className={`p-1 rounded-full transition-colors ${review.isVerified ? 'text-blue-400 bg-blue-400/10' : 'text-white/10 hover:text-white/30'}`}
                                title="Изменить статус верификации"
                            >
                                <CheckCircle2 size={14} />
                            </button>
                            <button
                                onClick={() => onToggleFeatured(review.id, !!review.isFeatured)}
                                className={`p-1 rounded-full transition-colors ${review.isFeatured ? 'text-sparta-gold bg-sparta-gold/10' : 'text-white/10 hover:text-white/30'}`}
                                title="Закрепить (Рекомендованный)"
                            >
                                <Crown size={14} />
                            </button>
                        </div>
                    </h3>
                    <div className="flex text-sparta-gold text-sm mt-1">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "text-sparta-gold" : "text-white/20"} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Attached Photo */}
            {review.image && (
                <div className="relative group/img aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                    <img src={review.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Review Photo" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white flex items-center gap-1">
                        <ImageIcon size={10} /> ФОТО
                    </div>
                </div>
            )}

            {/* Attached Video */}
            {review.videoUrl && (
                <div className="relative group/vid aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                    {review.videoUrl.includes('firebasestorage') || review.videoUrl.includes('supabase.co') || review.videoUrl.includes('firebase') ? (
                        <video
                            src={review.videoUrl}
                            className="w-full h-full"
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

            {/* Text */}
            <p className="text-white/80 text-sm italic bg-black/40 p-4 rounded-xl border border-white/5 flex-1 break-words">
                "{review.text}"
            </p>

            <div className="text-xs text-white/30 flex justify-between">
                <span>{review.createdAt ? new Date(review.createdAt.toMillis()).toLocaleString('ru-RU') : 'Только что'}</span>
                <span>ID: ...{review.id.slice(-6)}</span>
            </div>

            {/* Club Response Section */}
            {review.clubResponse ? (
                <div className="bg-sparta-gold/5 border border-sparta-gold/20 p-4 rounded-xl relative group/reply">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-sparta-gold uppercase tracking-widest flex items-center gap-1">
                            <MessageSquare size={10} /> Ваш ответ
                        </span>
                        <button
                            onClick={() => onDeleteResponse(review.id)}
                            className="text-red-400 opacity-20 hover:opacity-100 transition-opacity p-1"
                            title="Удалить ответ"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                    <p className="text-xs text-white/60 italic leading-relaxed">
                        {review.clubResponse.text}
                    </p>
                </div>
            ) : isReplying ? (
                <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                    <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Напишите официальный ответ..."
                        className="w-full bg-black/50 border border-sparta-gold/30 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold transition-colors resize-none h-20"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                onSendResponse(review.id, responseText);
                                setIsReplying(false);
                            }}
                            className="flex-1 bg-sparta-gold text-black text-[10px] font-bold p-2 rounded-lg flex items-center justify-center gap-1 hover:bg-yellow-400 transition-colors"
                        >
                            <Send size={12} /> ОТПРАВИТЬ
                        </button>
                        <button
                            onClick={() => setIsReplying(false)}
                            className="bg-white/5 text-white/50 text-[10px] font-bold px-3 py-2 rounded-lg hover:bg-white/10"
                        >
                            ОТМЕНА
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsReplying(true)}
                    className="flex items-center gap-2 text-[10px] font-bold text-white/30 hover:text-sparta-gold transition-colors px-1"
                >
                    <MessageSquare size={12} /> ОТВЕТИТЬ КЛИЕНТУ
                </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                {review.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onUpdateStatus(review, 'approved')}
                            className="flex-1 flex justify-center items-center gap-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 py-2 rounded-xl transition-colors text-sm font-bold"
                        >
                            <CheckCircle size={16} /> Одобрить
                        </button>
                        <button
                            onClick={() => onUpdateStatus(review, 'rejected')}
                            className="w-12 flex justify-center items-center bg-red-500/10 text-red-500 hover:bg-red-500/20 py-2 rounded-xl transition-colors"
                            title="Отклонить"
                        >
                            <XCircle size={16} />
                        </button>
                    </>
                )}

                {review.status === 'approved' && (
                    <button
                        onClick={() => onUpdateStatus(review, 'rejected')}
                        className="flex-1 flex justify-center items-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 py-2 rounded-xl transition-colors text-sm font-bold"
                    >
                        <XCircle size={16} /> Снять с публикации
                    </button>
                )}

                {review.status === 'rejected' && (
                    <button
                        onClick={() => onUpdateStatus(review, 'approved')}
                        className="flex-1 flex justify-center items-center gap-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 py-2 rounded-xl transition-colors text-sm font-bold"
                    >
                        <CheckCircle size={16} /> Вернуть на сайт
                    </button>
                )}

                <button
                    onClick={() => onDelete(review.id)}
                    className="w-12 flex justify-center items-center bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-500 py-2 rounded-xl transition-colors"
                    title="Удалить полностью"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default AdminReviews;
