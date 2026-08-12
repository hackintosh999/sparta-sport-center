import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Upload, ImageIcon, CheckCircle2, Loader2, Trash2, PartyPopper, Video } from 'lucide-react';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface LeaveReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({ isOpen, onClose }) => {
    const { user, userProfile } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [text, setText] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert("Файл слишком большой. Максимальный размер 50MB.");
            return;
        }

        setVideoFile(file);
        setVideoUrl(''); // Clear link if file selected
    };

    const uploadVideo = async (file: File): Promise<string> => {
        setUploadProgress(10);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'review-media');
        formData.append('path', `videos/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`);

        const response = await fetch('/api/upload-media', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Proxy upload error:', error);
            throw new Error(error.error || 'Failed to upload through proxy');
        }

        setUploadProgress(90);
        const { publicUrl } = await response.json();
        setUploadProgress(100);

        return publicUrl;
    };

    if (!isOpen) return null;

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 800;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    } else {
                        reject(new Error("Canvas failure"));
                    }
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) return alert("Файл слишком большой (>5MB)");

        setIsUploading(true);
        try {
            const base64 = await resizeImage(file);
            setImage(base64);
        } catch (err) {
            console.error(err);
            alert("Ошибка при обработке фото");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Пожалуйста, войдите в систему, чтобы оставить отзыв.");
        if (rating === 0) return alert("Пожалуйста, выберите оценку.");
        if (text.trim().length < 10) return alert("Отзыв должен содержать минимум 10 символов.");

        setIsSubmitting(true);
        try {
            let finalVideoUrl = videoUrl;

            if (videoFile) {
                finalVideoUrl = await uploadVideo(videoFile);
            }

            const isVerified = (userProfile?.activeSubscriptions && userProfile.activeSubscriptions.length > 0) || false;

            await addDoc(collection(db, 'reviews'), {
                userId: user?.uid || 'anonymous',
                userName: userProfile?.fullName || user?.displayName || 'Клиент Спарты',
                userPhoto: userProfile?.photoURL || user?.photoURL || null,
                rating,
                text: text.trim(),
                image: image || null,
                videoUrl: finalVideoUrl || null,
                isVerified,
                reactions: {},
                helpful: [],
                status: 'pending',
                userRole: userProfile?.role || 'user',
                userVerification: userProfile?.verification || null,
                createdAt: serverTimestamp()
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setRating(0);
                setText('');
                setImage(null);
                setVideoUrl('');
                setVideoFile(null);
                setUploadProgress(0);
            }, 3000);
        } catch (error: any) {
            console.error("Error submitting review:", error);
            alert(`Произошла ошибка при отправке отзыва: ${error.message || "Неизвестная ошибка"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors z-10"
                    >
                        <X size={24} />
                    </button>

                    <div className="p-8">
                        {success ? (
                            <div className="text-center py-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-16 h-16 bg-sparta-gold/20 text-sparta-gold rounded-full flex items-center justify-center mx-auto mb-4"
                                >
                                    <Star size={32} fill="currentColor" />
                                </motion.div>
                                <h2 className="text-2xl font-russo uppercase text-white mb-2">Отправлено!</h2>
                                <p className="text-white/70 font-manrope">
                                    Ваш отзыв успешно отправлен.<br />Он появится на сайте после модерации.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-russo uppercase text-sparta-gold mb-2">Оставить Отзыв</h2>
                                <p className="text-white/50 text-sm font-manrope mb-6">
                                    Поделитесь своими впечатлениями о нашем клубе.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setRating(star)}
                                                    className="focus:outline-none transition-transform hover:scale-110"
                                                >
                                                    <Star
                                                        size={36}
                                                        fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
                                                        className={(hoverRating || rating) >= star ? "text-sparta-gold" : "text-white/20"}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <span className="text-white/50 text-sm font-manrope h-5">
                                            {rating === 0 ? "Выберите оценку" :
                                                rating === 1 ? "Очень плохо" :
                                                    rating === 2 ? "Плохо" :
                                                        rating === 3 ? "Нормально" :
                                                            rating === 4 ? "Хорошо" : "Отлично!"}
                                        </span>
                                    </div>

                                    <div>
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            disabled={isSubmitting}
                                            placeholder="Напишите ваш отзыв здесь..."
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white font-manrope placeholder-white/30 focus:outline-none focus:border-sparta-gold/50 transition-colors resize-none mb-2"
                                        />
                                        <div className="flex justify-between items-center mb-4">
                                            <span className={`text-xs ${text.length < 10 && text.length > 0 ? 'text-red-400' : 'text-white/30'}`}>
                                                Минимум 10 символов
                                            </span>
                                            <span className="text-xs text-white/30">{text.length} / 500</span>
                                        </div>
                                    </div>

                                    {/* Image Upload */}
                                    <div className="space-y-3">
                                        <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider">Прикрепить фото (необязательно)</label>
                                        <div className="flex gap-4">
                                            {image ? (
                                                <div className="relative w-24 h-20 rounded-xl overflow-hidden border border-white/10 group">
                                                    <img src={image} className="w-full h-full object-cover" alt="Review" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setImage(null)}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-24 h-20 rounded-xl bg-white/5 border-2 border-dashed border-white/10 hover:border-sparta-gold/50 transition-all flex flex-col items-center justify-center cursor-pointer group">
                                                    {isUploading ? (
                                                        <Loader2 size={16} className="text-sparta-gold animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ImageIcon size={16} className="text-white/20 group-hover:text-sparta-gold transition-colors" />
                                                            <span className="text-[10px] text-white/20 mt-1 uppercase">ФОТО</span>
                                                        </>
                                                    )}
                                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading || isSubmitting} />
                                                </label>
                                            )}
                                            <div className="flex-1 text-[10px] text-white/30 italic flex items-center">
                                                Фотография сделает ваш отзыв более убедительным
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Upload/Link */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider">Видео-отзыв (необязательно)</label>
                                            {!videoFile && !videoUrl && (
                                                <div className="text-[9px] text-sparta-gold/60 italic">Загрузите или вставьте ссылку</div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {/* File Upload Button */}
                                            {!videoUrl && (
                                                <div className="relative">
                                                    {videoFile ? (
                                                        <div className="bg-white/5 border border-sparta-gold/30 rounded-xl p-3 flex items-center justify-between group">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-10 h-10 rounded-lg bg-sparta-gold/10 flex items-center justify-center shrink-0">
                                                                    <Video size={16} className="text-sparta-gold" />
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className="text-[10px] text-white font-bold truncate">{videoFile.name}</p>
                                                                    <p className="text-[9px] text-white/40">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setVideoFile(null);
                                                                    setUploadProgress(0);
                                                                }}
                                                                className="p-2 text-white/30 hover:text-red-400 transition-colors"
                                                            >
                                                                <X size={16} />
                                                            </button>

                                                            {isSubmitting && (
                                                                <div className="absolute bottom-0 left-0 h-0.5 bg-sparta-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:border-sparta-gold/30 transition-all group">
                                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-sparta-gold/10 transition-colors">
                                                                <Upload size={16} className="text-white/40 group-hover:text-sparta-gold transition-colors" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] text-white font-bold">Загрузить видео</p>
                                                                <p className="text-[9px] text-white/30 truncate max-w-[200px]">MP4, MOV до 50MB</p>
                                                            </div>
                                                            <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                                                        </label>
                                                    )}
                                                </div>
                                            )}

                                            {/* Link Input (as alternative) */}
                                            {!videoFile && (
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={videoUrl}
                                                            onChange={(e) => setVideoUrl(e.target.value)}
                                                            placeholder="Или вставьте ссылку на YouTube/VK"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/30 transition-all"
                                                        />
                                                        {videoUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setVideoUrl('')}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-red-400 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {videoUrl && getVideoEmbedUrl(videoUrl) && (
                                                        <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black animate-in fade-in duration-500">
                                                            <iframe
                                                                src={getVideoEmbedUrl(videoUrl)}
                                                                className="w-full h-full"
                                                                frameBorder="0"
                                                                allowFullScreen
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Reward Notice */}
                                    <div className="bg-sparta-gold/5 border border-sparta-gold/20 p-4 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(212,175,55,0.05)]">
                                        <div className="w-10 h-10 rounded-full bg-sparta-gold/20 flex items-center justify-center shrink-0">
                                            <PartyPopper size={20} className="text-sparta-gold" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-sparta-gold uppercase mb-1">Sparta Rewards</h4>
                                            <p className="text-[10px] text-white/60 font-manrope leading-relaxed">
                                                Получите <span className="text-white font-bold">+50 бонусов</span> за отзыв, <span className="text-white font-bold">+100</span> за фото или <span className="text-sparta-gold font-bold">+150 бонусов</span> за видео на ваш баланс!
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || rating === 0 || text.length < 10}
                                        className="w-full bg-sparta-gold text-black font-russo uppercase py-4 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Отправка...' : 'Отправить Отзыв'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default LeaveReviewModal;
