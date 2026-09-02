import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    Type,
    Check,
    Send,
    Shield,
    Flame,
    Trophy,
    Trash2,
    Camera,
    Move,
    RotateCcw,
    Palette,
    HelpCircle,
    SlidersHorizontal,
    AlignLeft,
    AlignCenter,
    AlignRight
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { BaseModal } from '../ui/BaseModal';

interface SpartaCreateStoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    userProfile: any;
    onStoryCreated?: (newStory: any) => void;
}

const GRADIENT_PRESETS = [
    { id: 'gold', name: 'Золото Спарты', value: 'bg-gradient-to-br from-amber-600 via-[#1c140a] to-black' },
    { id: 'emerald', name: 'Футбольное поле', value: 'bg-gradient-to-br from-emerald-700 via-teal-900 to-black' },
    { id: 'fire', name: 'Пламя победы', value: 'bg-gradient-to-br from-red-600 via-orange-950 to-black' },
    { id: 'purple', name: 'Неон Спарта', value: 'bg-gradient-to-br from-purple-700 via-indigo-950 to-black' },
    { id: 'blue', name: 'Синий Манеж', value: 'bg-gradient-to-br from-blue-600 via-slate-900 to-black' },
];

const SPORTS_STICKERS = [
    '🔥 МАТЧ ДНЯ',
    '🏆 ЧЕМПИОНЫ!',
    '⚽ ТОП ГОЛ',
    '⚡ ЖЕСТКАЯ ТРЕНИРОВКА',
    '🛡️ СПАРТА СИЛА',
    '👑 MVP МАТЧА',
    '🎯 В ДЕВЯТКУ',
    '🚀 СКОРОСТЬ'
];

const TEXT_COLORS = [
    { id: 'white', label: 'Белый', value: '#FFFFFF' },
    { id: 'gold', label: 'Золото', value: '#FFB800' },
    { id: 'red', label: 'Огонь', value: '#EF4444' },
    { id: 'blue', label: 'Неон', value: '#38BDF8' },
    { id: 'green', label: 'Поле', value: '#10B981' },
    { id: 'purple', label: 'Фиолетовый', value: '#A855F7' },
    { id: 'dark', label: 'Темный', value: '#18181B' }
];

export const SpartaCreateStoryModal: React.FC<SpartaCreateStoryModalProps> = ({
    isOpen,
    onClose,
    user,
    userProfile,
    onStoryCreated
}) => {
    // Content state
    const [title, setTitle] = useState('Победа в матче! 🏆');
    const [subtitle, setSubtitle] = useState('Спарта • История');
    const [description, setDescription] = useState('');
    const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0].value);

    // Media Upload State
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'gradient'>('gradient');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Active Drawer/Tool Overlay
    const [activeTool, setActiveTool] = useState<'none' | 'text' | 'stickers' | 'score' | 'poll' | 'gradients'>('none');

    // Text Customization & Drag Positioning
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [textStyle, setTextStyle] = useState<'normal' | 'banner' | 'neon'>('banner');
    const [textSize, setTextSize] = useState<number>(22);
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Sticker Customization & Drag Positioning
    const [selectedSticker, setSelectedSticker] = useState<string | null>('🔥 МАТЧ ДНЯ');
    const [stickerScale, setStickerScale] = useState<number>(1);
    const [stickerPosition, setStickerPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Match Scoreboard Widget & Drag Positioning
    const [hasMatchScore, setHasMatchScore] = useState(false);
    const [team1Name, setTeam1Name] = useState('Спарта');
    const [team1Score, setTeam1Score] = useState('3');
    const [team2Name, setTeam2Name] = useState('Зенит');
    const [team2Score, setTeam2Score] = useState('1');
    const [scorePosition, setScorePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [scoreScale, setScoreScale] = useState<number>(1);

    // Club Crest Watermark
    const [showClubCrest, setShowClubCrest] = useState(true);

    // Interactive Poll
    const [hasPoll, setHasPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('Готовы к тренировке?');
    const [pollOption1, setPollOption1] = useState('🔥 Да, на 100%');
    const [pollOption2, setPollOption2] = useState('⚽ Всегда готов');

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const role = (userProfile?.role || '').toLowerCase();
    const isCoach = ['coach', 'trainer', 'admin', 'director', 'developer'].includes(role);
    const authorName = userProfile?.full_name || userProfile?.childName || userProfile?.displayName || user?.displayName || 'Спартанец';

    // Handle File Selection (Photo or Video)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const isVideo = file.type.startsWith('video/');
        const reader = new FileReader();

        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setMediaUrl(dataUrl);
            setMediaType(isVideo ? 'video' : 'image');
            setIsUploading(false);
        };

        reader.onerror = () => {
            console.error("Error reading media file");
            setIsUploading(false);
        };

        reader.readAsDataURL(file);
    };

    const handleClearMedia = () => {
        setMediaUrl(null);
        setMediaType('gradient');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleResetPositions = () => {
        setTextPosition({ x: 0, y: 0 });
        setStickerPosition({ x: 0, y: 0 });
        setScorePosition({ x: 0, y: 0 });
    };

    const handlePublish = async () => {
        if (!title.trim()) {
            setActiveTool('text');
            return;
        }

        setIsSubmitting(true);
        try {
            const storyData = {
                authorId: user?.uid || 'anon',
                authorName,
                authorAvatar: userProfile?.photoURL || userProfile?.avatarUrl || user?.photoURL || '',
                authorRole: isCoach ? 'coach' : 'student',
                roleLabel: isCoach ? 'Тренер' : 'Ученик',
                title: title.trim(),
                subtitle: subtitle.trim(),
                description: description.trim(),
                gradient: selectedGradient,
                mediaUrl: mediaUrl || null,
                mediaType: mediaType,
                textColor,
                textStyle,
                textSize,
                textAlign,
                textPosition,
                stickerBadge: selectedSticker || null,
                stickerPosition,
                stickerScale,
                matchScore: hasMatchScore ? {
                    team1: team1Name.trim() || 'Спарта',
                    score1: team1Score.trim() || '0',
                    team2: team2Name.trim() || 'Соперник',
                    score2: team2Score.trim() || '0',
                } : null,
                scorePosition,
                scoreScale,
                showClubCrest,
                poll: hasPoll ? {
                    question: pollQuestion.trim(),
                    options: [pollOption1.trim(), pollOption2.trim()]
                } : null,
                likes: [],
                views: [],
                pollVotes: {},
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };

            await addDoc(collection(db, 'stories'), storyData);

            onStoryCreated?.({
                id: 'local_' + Date.now(),
                ...storyData
            });

            onClose();
        } catch (err) {
            console.error("Error creating story:", err);
            onStoryCreated?.({
                id: 'local_' + Date.now(),
                authorId: user?.uid || 'anon',
                authorName,
                authorAvatar: userProfile?.photoURL || userProfile?.avatarUrl || '',
                authorRole: isCoach ? 'coach' : 'student',
                roleLabel: isCoach ? 'Тренер' : 'Ученик',
                title: title.trim(),
                subtitle: subtitle.trim(),
                description: description.trim(),
                gradient: selectedGradient,
                mediaUrl: mediaUrl || null,
                mediaType: mediaType,
                textColor,
                textStyle,
                textSize,
                textAlign,
                textPosition,
                stickerBadge: selectedSticker || null,
                stickerPosition,
                stickerScale,
                matchScore: hasMatchScore ? {
                    team1: team1Name.trim(),
                    score1: team1Score.trim(),
                    team2: team2Name.trim(),
                    score2: team2Score.trim(),
                } : null,
                scorePosition,
                scoreScale,
                showClubCrest,
                poll: hasPoll ? {
                    question: pollQuestion.trim(),
                    options: [pollOption1.trim(), pollOption2.trim()]
                } : null
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-[420px]"
            customCard
            showCloseButton={false}
            glowColor="amber"
            zIndex="z-[9999]"
        >
            <div className="relative w-full max-w-[420px] h-[92vh] max-h-[820px] bg-[#101015] border border-white/20 rounded-[36px] overflow-hidden shadow-2xl flex flex-col justify-between select-none">
                    {/* TOP HEADER: Status & Close */}
                    <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between pointer-events-auto">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white">
                            <span className="w-2 h-2 rounded-full bg-sparta-gold animate-pulse" />
                            <span className="text-[11px] font-russo uppercase tracking-wider text-sparta-gold">Создание Stories</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetPositions}
                                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
                                title="Сбросить позиции"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* FLOATING RIGHT TOOLBAR (Instagram / Telegram style) */}
                    <div className="absolute top-16 right-4 z-40 flex flex-col gap-2.5 pointer-events-auto">
                        {/* Text Tool */}
                        <button
                            type="button"
                            onClick={() => setActiveTool(activeTool === 'text' ? 'none' : 'text')}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg ${
                                activeTool === 'text'
                                    ? 'bg-sparta-gold text-black border-sparta-gold shadow-sparta-gold/30 scale-105'
                                    : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                            }`}
                            title="Настроить текст"
                        >
                            <Type size={18} />
                        </button>

                        {/* Stickers Tool */}
                        <button
                            type="button"
                            onClick={() => setActiveTool(activeTool === 'stickers' ? 'none' : 'stickers')}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg ${
                                activeTool === 'stickers' || selectedSticker
                                    ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/30'
                                    : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                            }`}
                            title="Спортивные стикеры"
                        >
                            <Flame size={18} />
                        </button>

                        {/* Match Score Tool */}
                        <button
                            type="button"
                            onClick={() => setActiveTool(activeTool === 'score' ? 'none' : 'score')}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg ${
                                activeTool === 'score' || hasMatchScore
                                    ? 'bg-purple-500 text-white border-purple-400 shadow-purple-500/30'
                                    : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                            }`}
                            title="Табло счета матча"
                        >
                            <Trophy size={18} />
                        </button>

                        {/* Poll Tool */}
                        <button
                            type="button"
                            onClick={() => setActiveTool(activeTool === 'poll' ? 'none' : 'poll')}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg ${
                                activeTool === 'poll' || hasPoll
                                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
                                    : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                            }`}
                            title="Интерактивный опрос"
                        >
                            <HelpCircle size={18} />
                        </button>

                        {/* Camera / Upload Media */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg ${
                                mediaUrl
                                    ? 'bg-blue-500 text-white border-blue-400 shadow-blue-500/30'
                                    : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                            }`}
                            title="Загрузить фото/видео"
                        >
                            <Camera size={18} />
                        </button>

                        {/* Gradient Switcher (if no media) */}
                        {!mediaUrl && (
                            <button
                                type="button"
                                onClick={() => setActiveTool(activeTool === 'gradients' ? 'none' : 'gradients')}
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all shadow-lg ${
                                    activeTool === 'gradients'
                                        ? 'bg-sparta-gold text-black border-sparta-gold'
                                        : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                                }`}
                                title="Фоновый градиент"
                            >
                                <Palette size={18} />
                            </button>
                        )}
                    </div>

                    {/* MAIN IMMERSIVE STORIES CANVAS */}
                    <div
                        ref={canvasContainerRef}
                        className="relative w-full flex-1 overflow-hidden select-none touch-none flex flex-col justify-between p-6 pt-16 pb-24"
                    >
                        {/* Background Media Layer */}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            {mediaUrl ? (
                                mediaType === 'video' ? (
                                    <video
                                        src={mediaUrl}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img
                                        src={mediaUrl}
                                        alt="Story Background"
                                        className="w-full h-full object-cover"
                                    />
                                )
                            ) : (
                                <div className={`w-full h-full ${selectedGradient}`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85" />
                        </div>

                        {/* Story Top Badges */}
                        <div className="relative z-10 flex items-center justify-between pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/60 text-sparta-gold border border-sparta-gold/40 backdrop-blur-md">
                                {subtitle || 'Спарта'}
                            </span>
                            {showClubCrest && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/60 text-sparta-gold border border-sparta-gold/30 backdrop-blur-md">
                                    <Shield size={11} className="fill-sparta-gold" /> Sparta
                                </span>
                            )}
                        </div>

                        {/* DRAGGABLE: Sports Sticker */}
                        {selectedSticker && (
                            <motion.div
                                drag
                                dragConstraints={canvasContainerRef}
                                dragElastic={0.05}
                                onDragEnd={(_, info) => {
                                    setStickerPosition(prev => ({
                                        x: prev.x + info.offset.x,
                                        y: prev.y + info.offset.y
                                    }));
                                }}
                                style={{
                                    transform: `scale(${stickerScale})`
                                }}
                                className="relative z-20 self-center cursor-grab active:cursor-grabbing px-4 py-1.5 rounded-2xl bg-gradient-to-r from-sparta-gold via-yellow-400 to-amber-500 text-black font-russo text-xs uppercase tracking-wider shadow-2xl shadow-sparta-gold/40 border border-yellow-200/80 flex items-center gap-1.5 active:ring-2 active:ring-white"
                            >
                                <Move size={11} className="text-black/60" />
                                <span>{selectedSticker}</span>
                            </motion.div>
                        )}

                        {/* DRAGGABLE: Match Scoreboard */}
                        {hasMatchScore && (
                            <motion.div
                                drag
                                dragConstraints={canvasContainerRef}
                                dragElastic={0.05}
                                onDragEnd={(_, info) => {
                                    setScorePosition(prev => ({
                                        x: prev.x + info.offset.x,
                                        y: prev.y + info.offset.y
                                    }));
                                }}
                                style={{
                                    transform: `scale(${scoreScale})`
                                }}
                                className="relative z-20 self-center cursor-grab active:cursor-grabbing bg-black/85 backdrop-blur-2xl border border-sparta-gold/60 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl active:ring-2 active:ring-sparta-gold"
                            >
                                <span className="text-xs font-bold text-white max-w-[80px] truncate">{team1Name}</span>
                                <span className="px-2.5 py-0.5 bg-sparta-gold text-black rounded-lg font-russo text-sm font-black">
                                    {team1Score} : {team2Score}
                                </span>
                                <span className="text-xs font-bold text-white max-w-[80px] truncate">{team2Name}</span>
                            </motion.div>
                        )}

                        {/* DRAGGABLE: Interactive Poll Widget */}
                        {hasPoll && (
                            <motion.div
                                drag
                                dragConstraints={canvasContainerRef}
                                dragElastic={0.05}
                                className="relative z-20 self-center w-full max-w-[280px] bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl cursor-grab active:cursor-grabbing"
                            >
                                <p className="text-white font-bold text-xs mb-2 text-center">📊 {pollQuestion}</p>
                                <div className="space-y-1.5">
                                    <div className="p-2 rounded-xl bg-white/10 text-white/90 text-xs font-medium text-center">
                                        {pollOption1}
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/10 text-white/90 text-xs font-medium text-center">
                                        {pollOption2}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* DRAGGABLE: Main Text (Title & Description) */}
                        <motion.div
                            drag
                            dragConstraints={canvasContainerRef}
                            dragElastic={0.05}
                            onDragEnd={(_, info) => {
                                setTextPosition(prev => ({
                                    x: prev.x + info.offset.x,
                                    y: prev.y + info.offset.y
                                }));
                            }}
                            onClick={() => setActiveTool('text')}
                            className="relative z-20 cursor-grab active:cursor-grabbing max-w-[95%] self-center group"
                        >
                            <div
                                style={{ textAlign }}
                                className={`p-3 rounded-2xl transition-all ${
                                    textStyle === 'banner'
                                        ? 'bg-black/75 backdrop-blur-2xl border border-white/20 shadow-2xl'
                                        : textStyle === 'neon'
                                        ? 'drop-shadow-[0_0_25px_rgba(255,184,0,0.9)]'
                                        : 'drop-shadow-lg'
                                }`}
                            >
                                <h4
                                    style={{
                                        color: textColor,
                                        fontSize: `${textSize}px`
                                    }}
                                    className="font-russo uppercase leading-tight"
                                >
                                    {title || 'Нажмите, чтобы ввести текст...'}
                                </h4>
                                {description && (
                                    <p className="text-xs text-white/90 mt-1 font-medium leading-relaxed">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        {/* Delete Media Button on top right */}
                        {mediaUrl && (
                            <button
                                type="button"
                                onClick={handleClearMedia}
                                className="absolute top-4 left-4 z-30 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white shadow-lg transition-all"
                                title="Удалить фото/видео"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {/* BOTTOM TOOLS DRAWERS (Smooth Bottom Sheets) */}
                    <AnimatePresence>
                        {/* 1. TEXT TOOL DRAWER */}
                        {activeTool === 'text' && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#14141c]/98 backdrop-blur-3xl border-t border-white/20 rounded-t-[32px] p-5 shadow-2xl space-y-3.5"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <span className="text-xs font-russo uppercase text-white tracking-wider flex items-center gap-1.5">
                                        <Type size={14} className="text-sparta-gold" />
                                        Текст и оформление
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTool('none')}
                                        className="text-xs font-black text-sparta-gold uppercase px-2.5 py-1 rounded-lg bg-sparta-gold/20 hover:bg-sparta-gold hover:text-black transition-all"
                                    >
                                        Готово
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Введите заголовок истории..."
                                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-sparta-gold font-bold"
                                    autoFocus
                                />

                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Описание или подробности (необязательно)..."
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-sparta-gold resize-none"
                                />

                                {/* Color Swatches */}
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                        {TEXT_COLORS.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setTextColor(c.value)}
                                                style={{ backgroundColor: c.value }}
                                                className={`w-6 h-6 rounded-full border transition-transform ${
                                                    textColor === c.value
                                                        ? 'border-white scale-125 ring-2 ring-sparta-gold shadow-md'
                                                        : 'border-white/30 hover:scale-110'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Style selector */}
                                    <div className="flex gap-1">
                                        {[
                                            { id: 'banner', label: '🏷️ Плашка' },
                                            { id: 'neon', label: '✨ Неон' },
                                            { id: 'normal', label: 'Чистый' }
                                        ].map(st => (
                                            <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => setTextStyle(st.id as any)}
                                                className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                                                    textStyle === st.id
                                                        ? 'bg-sparta-gold text-black border-sparta-gold'
                                                        : 'bg-white/5 text-white/60 border-white/10'
                                                }`}
                                            >
                                                {st.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. STICKERS DRAWER */}
                        {activeTool === 'stickers' && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#14141c]/98 backdrop-blur-3xl border-t border-white/20 rounded-t-[32px] p-5 shadow-2xl space-y-3"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <span className="text-xs font-russo uppercase text-white tracking-wider flex items-center gap-1.5">
                                        <Flame size={14} className="text-orange-400" />
                                        Спортивные стикеры
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {selectedSticker && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedSticker(null)}
                                                className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                                            >
                                                Удалить
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setActiveTool('none')}
                                            className="text-xs font-black text-sparta-gold uppercase px-2.5 py-1 rounded-lg bg-sparta-gold/20"
                                        >
                                            Готово
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {SPORTS_STICKERS.map(st => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSticker(selectedSticker === st ? null : st);
                                                setActiveTool('none');
                                            }}
                                            className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                                                selectedSticker === st
                                                    ? 'bg-sparta-gold text-black border-sparta-gold font-black shadow-lg shadow-sparta-gold/20'
                                                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* 3. SCORE DRAWER */}
                        {activeTool === 'score' && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#14141c]/98 backdrop-blur-3xl border-t border-white/20 rounded-t-[32px] p-5 shadow-2xl space-y-3"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <span className="text-xs font-russo uppercase text-white tracking-wider flex items-center gap-1.5">
                                        <Trophy size={14} className="text-purple-400" />
                                        Табло счета матча
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTool('none')}
                                        className="text-xs font-black text-sparta-gold uppercase px-2.5 py-1 rounded-lg bg-sparta-gold/20"
                                    >
                                        Готово
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white">Отображать табло на фото</span>
                                    <button
                                        type="button"
                                        onClick={() => setHasMatchScore(!hasMatchScore)}
                                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                            hasMatchScore ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50'
                                        }`}
                                    >
                                        {hasMatchScore ? '✓ Включено' : 'Выключено'}
                                    </button>
                                </div>

                                {hasMatchScore && (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-white/60">Команда 1:</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={team1Name}
                                                    onChange={(e) => setTeam1Name(e.target.value)}
                                                    placeholder="Спарта"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white outline-none focus:border-sparta-gold"
                                                />
                                                <input
                                                    type="text"
                                                    value={team1Score}
                                                    onChange={(e) => setTeam1Score(e.target.value)}
                                                    placeholder="3"
                                                    className="w-10 text-center bg-white/5 border border-white/10 rounded-xl px-1 py-1 text-xs text-white font-bold outline-none focus:border-sparta-gold"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-white/60">Команда 2:</label>
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={team2Name}
                                                    onChange={(e) => setTeam2Name(e.target.value)}
                                                    placeholder="Зенит"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white outline-none focus:border-sparta-gold"
                                                />
                                                <input
                                                    type="text"
                                                    value={team2Score}
                                                    onChange={(e) => setTeam2Score(e.target.value)}
                                                    placeholder="1"
                                                    className="w-10 text-center bg-white/5 border border-white/10 rounded-xl px-1 py-1 text-xs text-white font-bold outline-none focus:border-sparta-gold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* 4. POLL DRAWER */}
                        {activeTool === 'poll' && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#14141c]/98 backdrop-blur-3xl border-t border-white/20 rounded-t-[32px] p-5 shadow-2xl space-y-3"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <span className="text-xs font-russo uppercase text-white tracking-wider flex items-center gap-1.5">
                                        <HelpCircle size={14} className="text-emerald-400" />
                                        Интерактивный опрос
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTool('none')}
                                        className="text-xs font-black text-sparta-gold uppercase px-2.5 py-1 rounded-lg bg-sparta-gold/20"
                                    >
                                        Готово
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white">Добавить опрос для зрителей</span>
                                    <button
                                        type="button"
                                        onClick={() => setHasPoll(!hasPoll)}
                                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                            hasPoll ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50'
                                        }`}
                                    >
                                        {hasPoll ? '✓ Включен' : 'Выключен'}
                                    </button>
                                </div>

                                {hasPoll && (
                                    <div className="space-y-2 pt-1">
                                        <input
                                            type="text"
                                            value={pollQuestion}
                                            onChange={(e) => setPollQuestion(e.target.value)}
                                            placeholder="Вопрос (например: Готовы к субботней игре?)"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sparta-gold"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                value={pollOption1}
                                                onChange={(e) => setPollOption1(e.target.value)}
                                                placeholder="Вариант 1"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-sparta-gold"
                                            />
                                            <input
                                                type="text"
                                                value={pollOption2}
                                                onChange={(e) => setPollOption2(e.target.value)}
                                                placeholder="Вариант 2"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-sparta-gold"
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* 5. GRADIENTS DRAWER */}
                        {activeTool === 'gradients' && !mediaUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                                className="absolute inset-x-0 bottom-0 z-50 bg-[#14141c]/98 backdrop-blur-3xl border-t border-white/20 rounded-t-[32px] p-5 shadow-2xl space-y-3"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                    <span className="text-xs font-russo uppercase text-white tracking-wider flex items-center gap-1.5">
                                        <Palette size={14} className="text-sparta-gold" />
                                        Фон истории
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTool('none')}
                                        className="text-xs font-black text-sparta-gold uppercase px-2.5 py-1 rounded-lg bg-sparta-gold/20"
                                    >
                                        Готово
                                    </button>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    {GRADIENT_PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedGradient(preset.value);
                                                setActiveTool('none');
                                            }}
                                            className={`h-12 rounded-xl ${preset.value} border-2 flex items-center justify-center transition-all ${
                                                selectedGradient === preset.value
                                                    ? 'border-sparta-gold scale-105 ring-2 ring-sparta-gold/40'
                                                    : 'border-white/20 hover:opacity-100 opacity-80'
                                            }`}
                                        >
                                            {selectedGradient === preset.value && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Hidden file input for Photo/Video upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                        className="hidden"
                    />

                    {/* BOTTOM ACTION BAR */}
                    <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center gap-3 z-30">
                        <button
                            type="button"
                            onClick={handlePublish}
                            disabled={isSubmitting}
                            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-sparta-gold via-yellow-400 to-amber-500 hover:brightness-110 text-black font-russo uppercase tracking-wider text-xs shadow-xl shadow-sparta-gold/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-98"
                        >
                            <Send size={15} />
                            <span>{isSubmitting ? 'Публикация...' : 'Опубликовать историю'}</span>
                        </button>
                    </div>
            </div>
        </BaseModal>
    );
};
