import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    Trophy, Calendar, MessageSquare, Flame, CheckCircle2,
    Users, Award, Sparkles, Star, ChevronRight, Activity, Dumbbell,
    ShieldCheck, Lock, Unlock, Mail, Eye, EyeOff, KeyRound, Check, X, User,
    QrCode, ShoppingBag, MapPin, Clock, ArrowRight, Zap, Gift,
    CheckCheck, Target, Coins, Volume2, VolumeX, Medal, History, Filter, ChevronDown,
    Search, Compass, Heart, Bookmark, Award as CupIcon, CalendarDays, Maximize2,
    Trash2, Edit3, Save, Camera, Film, Image as ImageIcon, Video as VideoIcon,
    Play, Pause, RotateCcw, Repeat, ChevronLeft, Layers, Loader2, ZoomIn, ZoomOut, RotateCw, Download,
    Share2, Gauge, MessageCircle, Globe, Shield, Smile, ThumbsUp, Send, Mic, MicOff, Square, Radio,
    Paperclip, Plus, SmilePlus, Pin, CornerDownRight, Copy, MoreVertical
} from 'lucide-react';
import { db } from '../../firebase';
import {
    doc, getDoc, collection, query, where, getDocs, onSnapshot,
    updateDoc, serverTimestamp, arrayUnion, arrayRemove, setDoc, addDoc, deleteDoc
} from 'firebase/firestore';
import { uploadReviewMedia } from '../../utils/supabaseStorage';
import { linkParentToChild } from '../../services/userService';
import { safeLocalStorage } from '../../utils/storage';
import { SpartaCoinIcon } from '../SpartaCoinIcon';
import { LevelProgressBar } from './LevelProgressBar';
import { TaskHistoryModal } from './TaskHistoryModal';
import { CompactTaskList } from './CompactTaskList';
import { BadgeCard, SpartanBadge } from './BadgeCard';
import { BadgeDetailModal } from './BadgeDetailModal';
import { AwardDetailModal } from '../profile/AwardDetailModal';
import { StudentCardModal } from '../profile/StudentCardModal';
import { useStudentAchievements } from '../../hooks/useStudentAchievements';

interface PersonalTask {
    id: string;
    title: string;
    description?: string;
    rewardCoins: number;
    coachName: string;
    assignedAt: string;
    completed: boolean;
    completedAt?: string;
}

interface MediaItem {
    id: string;
    url: string;
    type: 'image' | 'video';
    name?: string;
    file?: File;
}

export type AuthorRole = 'coach' | 'director' | 'admin' | 'developer' | 'parent' | 'student';

export interface PostComment {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    authorRole: AuthorRole;
    isVerified?: boolean;
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    audioDuration?: number;
    createdAt: string;
    timestampNum?: number;
    isPinned?: boolean;
    replyTo?: {
        commentId: string;
        authorName: string;
        textSnippet?: string;
    };
    reactions?: {
        heart?: string[];
        fire?: string[];
        applause?: string[];
    };
}

interface TimelineEvent {
    id: string;
    userId?: string;
    userName?: string;
    userAvatar?: string;
    authorRole?: AuthorRole;
    isVerified?: boolean;
    groupTitle?: string;
    dateStr: string; // YYYY-MM-DD
    displayDate: string;
    year: number;
    monthIndex: number; // 0-11
    monthName: string;
    type: 'workout' | 'challenge' | 'trophy' | 'personal' | 'milestone';
    title: string;
    description: string;
    rewardCoins?: number;
    coachName?: string;
    coachFeedback?: string;
    badgeEmoji: string;
    timestampNum: number;
    mediaItems?: MediaItem[];
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    visibility?: 'public' | 'coach_only' | 'private';
    allowComments?: boolean;
    comments?: PostComment[];
    reactions?: {
        fire?: string[];
        applause?: string[];
        rocket?: string[];
    };
}

interface KidDashboardProps {
    user: any;
    userProfile: any;
    onTabChange: (tab: string) => void;
}

const MONTHS_LIST = [
    'Все месяцы', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// =========================================================================
// 🍎 APPLE-STYLE EMOJI LIBRARY CATEGORIES (8 Full Authentic Categories)
// =========================================================================
const APPLE_EMOJI_CATEGORIES = [
    {
        id: 'sport',
        icon: '⚽',
        name: 'Спорт & Победы',
        emojis: [
            '⚽', '🥅', '🧤', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎯',
            '🔥', '⚡', '👑', '💪', '👟', '🎽', '⏱️', '📣', '🏃', '🏃‍♂️',
            '🏃‍♀️', '🏋️', '🏋️‍♂️', '🏋️‍♀️', '🤾', '🤾‍♂️', '🥊', '🥋', '🏊', '🏊‍♂️',
            '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓',
            '🏸', '🏒', '🏑', '🏏', '🪃', '⛳', '🏹', '🎣', '🤿', '🛹',
            '🛼', '🛷', '⛸️', '🎿', '⛷️', '🏂', '🧘', '🚴', '🚴‍♂️', '🚵'
        ]
    },
    {
        id: 'faces',
        icon: '😄',
        name: 'Эмоции & Лица',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🙂',
            '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚',
            '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
            '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
            '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
            '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
            '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳',
            '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖'
        ]
    },
    {
        id: 'sparta',
        icon: '🦁',
        name: 'Спарта & Огонь',
        emojis: [
            '🦁', '⚔️', '🛡️', '🚀', '🌟', '✨', '💫', '⭐️', '🌠', '💥',
            '💣', '🚩', '🏁', '🎉', '🎊', '🎈', '🎇', '🎆', '🧨', '💎',
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖',
            '💗', '💓', '💞', '💕', '❣️', '💘', '💝', '💟', '🔥', '⚡',
            '👑', '💯', '💢', '💨', '💦', '🤝', '👍', '👏', '🙌', '🫶',
            '🤟', '🤘', '✌️', '🤞', '🤌', '🤏', '👌', '🫡', '💪', '👊'
        ]
    },
    {
        id: 'food',
        icon: '🍕',
        name: 'Еда & Призы',
        emojis: [
            '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥩',
            '🍗', '🍖', '🥓', '🍳', '🥞', '🧇', '🧀', '🥐', '🥯', '🍞',
            '🥖', '🥨', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
            '🍬', '🍭', '🍮', '🍯', '🍦', '🍧', '🍨', '🍉', '🍌', '🍎',
            '🍏', '🍐', '🍊', '🍋', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭',
            '🍍', '🥥', '🥝', '🥤', '🧃', '🧋', '🥛', '☕', '🫖', '🎁'
        ]
    },
    {
        id: 'animals',
        icon: '🐶',
        name: 'Животные & Природа',
        emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
            '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🐒', '🐔', '🐧',
            '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
            '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐢', '🐍', '🐙',
            '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘',
            '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐾', '🐉', '🐲'
        ]
    },
    {
        id: 'travel',
        icon: '🚗',
        name: 'Путешествия & Места',
        emojis: [
            '🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻',
            '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍',
            '🚘', '🚖', '🚄', '🚅', '🚆', '🚇', '✈️', '🛫', '🛬', '🚀',
            '🛸', '🚁', '⛵', '🚤', '🚢', '⚓', '🏟️', '🎡', '🎢', '🏖️',
            '🏝️', '🏕️', '⛺', '🏠', '🏢', '🏦', '🏨', '🏪', '🏫', '🏛️'
        ]
    },
    {
        id: 'objects',
        icon: '💡',
        name: 'Гаджеты & Объекты',
        emojis: [
            '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🕹️', '📷', '📸', '📹',
            '🎥', '📽️', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛',
            '💡', '🔦', '🕯️', '💵', '💴', '💶', '💷', '🪙', '💰', '💳',
            '💎', '⚖️', '🧰', '🔧', '🔨', '🛠️', '⚙️', '⛓️', '🧲', '🗡️',
            '⚔️', '🛡️', '🔮', '🧿', '🧬', '🔬', '🔭', '📡', '🩺', '🚪'
        ]
    },
    {
        id: 'symbols',
        icon: '💯',
        name: 'Символы & Знаки',
        emojis: [
            '💯', '✅', '☑️', '✔️', '❌', '❎', '➕', '➖', '➗', '✖️',
            '❗️', '❕', '❓', '❔', '‼️', '⁉️', '〽️', '⚠️', '🚸', '⛔️',
            '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', '☢️', '☣️',
            '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️',
            '🔄', '🔁', '🔂', '▶️', '⏩', '◀️', '⏪', '⏫', '⏬', '⏹️',
            '🔤', '🔢', '🔟', '🆗', '🆙', '🆒', '🆕', '🆓', '🆖', '🆑'
        ]
    }
];

const EMOJI_KEYWORDS: Record<string, string[]> = {
    sport: ['спорт', 'мяч', 'гол', 'футбол', 'кубок', 'медаль', 'победа', 'тренировка', 'бег', 'бокс', 'баскетбол', 'спортсмен', 'чемпион', 'game', 'sport', 'win', 'ball', 'gym'],
    faces: ['лицо', 'смайл', 'эмоции', 'улыбка', 'радость', 'смех', 'круто', 'огонь', 'шок', 'слезы', 'любовь', 'глаза', 'smile', 'face', 'happy'],
    sparta: ['спарта', 'лев', 'меч', 'щит', 'огонь', 'сердце', 'звезда', 'салют', 'лайк', 'сила', 'победитель', 'sparta', 'fire', 'lion', 'heart'],
    food: ['еда', 'пицца', 'бургер', 'торт', 'сладости', 'напиток', 'сок', 'фрукты', 'яблоко', 'шоколад', 'food', 'pizza', 'cake'],
    animals: ['животные', 'кот', 'собака', 'лев', 'тигр', 'птица', 'рыба', 'природа', 'медведь', 'animal', 'dog', 'cat'],
    travel: ['путешествия', 'машина', 'авто', 'самолет', 'поезд', 'стадион', 'город', 'ракета', 'travel', 'car', 'plane'],
    objects: ['вещи', 'предметы', 'телефон', 'компьютер', 'камера', 'микрофон', 'деньги', 'золото', 'наушники', 'tech', 'phone'],
    symbols: ['символы', 'знаки', 'галочка', '100', 'стрелка', 'вопрос', 'плюс', 'знак', 'stars', 'check']
};

// =========================================================================
// 🛡️ VERIFIED ROLE BADGE COMPONENT (Тренер, Директор, Разработчик, Админ)
// =========================================================================
interface VerifiedBadgeProps {
    role: AuthorRole;
    isVerified?: boolean;
    showLabel?: boolean;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ role, isVerified = true, showLabel = true }) => {
    switch (role) {
        case 'director':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-amber-500/10 shrink-0">
                    <span>👑</span>
                    {showLabel && <span>Директор клуба</span>}
                    {isVerified && <CheckCircle2 size={11} className="text-amber-400 fill-amber-400 text-black" />}
                </span>
            );
        case 'coach':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 via-sky-500/25 to-blue-500/20 border border-blue-400/50 text-blue-300 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-blue-500/10 shrink-0">
                    <span>👨‍🏫</span>
                    {showLabel && <span>Тренер</span>}
                    {isVerified && <CheckCircle2 size={11} className="text-blue-400 fill-blue-400 text-black" />}
                </span>
            );
        case 'admin':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/25 to-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-emerald-500/10 shrink-0">
                    <span>🛡️</span>
                    {showLabel && <span>Администратор</span>}
                    {isVerified && <CheckCircle2 size={11} className="text-emerald-400 fill-emerald-400 text-black" />}
                </span>
            );
        case 'developer':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/25 to-indigo-500/20 border border-purple-400/50 text-purple-300 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-purple-500/10 shrink-0">
                    <span>⚡</span>
                    {showLabel && <span>Команда Sparta</span>}
                    {isVerified && <CheckCircle2 size={11} className="text-purple-400 fill-purple-400 text-black" />}
                </span>
            );
        case 'parent':
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] font-bold shrink-0">
                    <span>👨‍👩‍👧</span>
                    {showLabel && <span>Родитель</span>}
                </span>
            );
        case 'student':
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sparta-gold/15 border border-sparta-gold/30 text-sparta-gold text-[10px] font-bold shrink-0">
                    <span>⭐</span>
                    {showLabel && <span>Чемпион</span>}
                </span>
            );
    }
};

// =========================================================================
// 🎙️ SPARTA AUDIO / VOICE MESSAGE PLAYER
// =========================================================================
interface SpartaAudioPlayerProps {
    src: string;
    duration?: number;
}

const SpartaAudioPlayer: React.FC<SpartaAudioPlayerProps> = ({ src, duration }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPos, setCurrentPos] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const formatSec = (s: number) => {
        if (isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="flex items-center gap-2.5 p-2 px-3 rounded-2xl bg-black/70 border border-sparta-gold/30 max-w-xs shadow-md">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={() => audioRef.current && setCurrentPos(audioRef.current.currentTime)}
                onLoadedMetadata={() => audioRef.current && setAudioDuration(audioRef.current.duration)}
                onEnded={() => setIsPlaying(false)}
            />
            <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-sparta-gold hover:bg-yellow-400 text-black flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md shrink-0"
            >
                {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-0.5 h-4">
                    {[10, 16, 8, 20, 12, 24, 15, 18, 9, 22, 16, 12, 19, 8, 14].map((h, i) => {
                        const barProgress = (i / 15) * 100;
                        const currPercent = audioDuration > 0 ? (currentPos / audioDuration) * 100 : 0;
                        const isPassed = barProgress <= currPercent;
                        return (
                            <div
                                key={i}
                                style={{ height: `${h}px` }}
                                className={`w-1 rounded-full transition-colors ${
                                    isPassed ? 'bg-sparta-gold shadow-[0_0_5px_rgba(212,175,55,0.8)]' : 'bg-white/20'
                                }`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-[9px] text-white/50 font-mono">
                    <span>{formatSec(currentPos)}</span>
                    <span>{formatSec(audioDuration)}</span>
                </div>
            </div>

            <span className="text-xs">🎙️</span>
        </div>
    );
};

// =========================================================================
// 🦁 BRANDED SPARTA PRO VIDEO PLAYER
// =========================================================================
interface SpartaVideoPlayerProps {
    src: string;
    studentName?: string;
}

const SpartaVideoPlayer: React.FC<SpartaVideoPlayerProps> = ({ src, studentName }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [volume, setVolume] = useState<number>(1);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [speed, setSpeed] = useState<number>(1);
    const [isLooping, setIsLooping] = useState<boolean>(false);
    const [showControls, setShowControls] = useState<boolean>(true);
    const [centerBadge, setCenterBadge] = useState<{ icon: 'play' | 'pause' | 'rewind' | 'forward'; key: number } | null>(null);
    const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (secs: number) => {
        if (isNaN(secs)) return '00:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const triggerCenterBadge = (icon: 'play' | 'pause' | 'rewind' | 'forward') => {
        setCenterBadge({ icon, key: Date.now() });
        setTimeout(() => setCenterBadge(null), 600);
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
            triggerCenterBadge('play');
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
            triggerCenterBadge('pause');
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !videoRef.current || duration === 0) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = clickPos * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleRewind = (seconds = 5) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - seconds);
        triggerCenterBadge('rewind');
    };

    const handleForward = (seconds = 5) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + seconds);
        triggerCenterBadge('forward');
    };

    const handleVolumeChange = (newVol: number) => {
        setVolume(newVol);
        if (videoRef.current) {
            videoRef.current.volume = newVol;
            videoRef.current.muted = newVol === 0;
            setIsMuted(newVol === 0);
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        videoRef.current.muted = nextMuted;
        if (!nextMuted && volume === 0) {
            setVolume(0.5);
            videoRef.current.volume = 0.5;
        }
    };

    const changeSpeed = (s: number) => {
        setSpeed(s);
        if (videoRef.current) {
            videoRef.current.playbackRate = s;
        }
        setShowSpeedMenu(false);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 2500);
        }
    };

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="relative w-full max-w-4xl max-h-[68vh] rounded-3xl overflow-hidden bg-black flex items-center justify-center group shadow-[0_0_80px_rgba(0,0,0,0.9)] border border-sparta-gold/30 select-none"
        >
            <video
                ref={videoRef}
                src={src}
                autoPlay
                playsInline
                loop={isLooping}
                onClick={togglePlay}
                onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                onLoadedMetadata={() => {
                    if (videoRef.current) {
                        setDuration(videoRef.current.duration);
                        videoRef.current.playbackRate = speed;
                    }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full max-h-[66vh] object-contain cursor-pointer"
            />

            <div className="absolute top-3 left-4 pointer-events-none z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-sparta-gold/40 backdrop-blur-md shadow-lg">
                <span className="text-xs">⚔️</span>
                <span className="text-[10px] font-russo text-sparta-gold tracking-widest uppercase">SPARTA PLAYER</span>
            </div>

            <AnimatePresence>
                {centerBadge && (
                    <motion.div
                        key={centerBadge.key}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1.1 }}
                        exit={{ opacity: 0, scale: 1.3 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 pointer-events-none flex items-center justify-center z-30"
                    >
                        <div className="w-16 h-16 rounded-full bg-sparta-gold/90 text-black flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.9)]">
                            {centerBadge.icon === 'play' && <Play size={28} fill="currentColor" className="ml-1" />}
                            {centerBadge.icon === 'pause' && <Pause size={28} fill="currentColor" />}
                            {centerBadge.icon === 'rewind' && <RotateCcw size={28} />}
                            {centerBadge.icon === 'forward' && <RotateCw size={28} />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={e => e.stopPropagation()}
                        className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/85 to-transparent pt-10 pb-3 px-4 sm:px-6 space-y-2.5 backdrop-blur-xs"
                    >
                        <div
                            ref={progressBarRef}
                            onClick={handleSeek}
                            className="relative w-full h-2 hover:h-3 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all flex items-center group/bar"
                        >
                            <div
                                style={{ width: `${progressPercent}%` }}
                                className="h-full rounded-full bg-gradient-to-r from-sparta-gold via-yellow-400 to-amber-400 relative shadow-[0_0_12px_rgba(212,175,55,0.9)]"
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-sparta-gold shadow-[0_0_8px_rgba(255,255,255,0.8)] opacity-60 group-hover/bar:opacity-100 group-hover/bar:scale-125 transition-all" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-white">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    className="w-9 h-9 rounded-xl bg-sparta-gold hover:bg-yellow-400 text-black flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer"
                                    title={isPlaying ? 'Пауза' : 'Воспроизведение'}
                                >
                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleRewind(5)}
                                    className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-sparta-gold transition-colors text-xs flex items-center gap-0.5 cursor-pointer"
                                    title="Назад на 5 секунд"
                                >
                                    <RotateCcw size={15} />
                                    <span className="text-[10px] font-bold hidden sm:inline">-5с</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleForward(5)}
                                    className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-sparta-gold transition-colors text-xs flex items-center gap-0.5 cursor-pointer"
                                    title="Вперед на 5 секунд"
                                >
                                    <RotateCw size={15} />
                                    <span className="text-[10px] font-bold hidden sm:inline">+5с</span>
                                </button>

                                <div className="text-xs font-mono font-bold text-white/90 ml-1">
                                    <span className="text-sparta-gold">{formatTime(currentTime)}</span>
                                    <span className="text-white/40"> / {formatTime(duration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="flex items-center gap-1.5 group/vol">
                                    <button
                                        type="button"
                                        onClick={toggleMute}
                                        className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-sparta-gold transition-colors cursor-pointer"
                                        title={isMuted ? 'Включить звук' : 'Выключить звук'}
                                    >
                                        {isMuted || volume === 0 ? <VolumeX size={17} className="text-red-400" /> : <Volume2 size={17} />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                                        className="w-16 sm:w-20 h-1 bg-white/20 rounded-full accent-sparta-gold cursor-pointer hidden sm:block"
                                    />
                                </div>

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold font-russo transition-all flex items-center gap-1 cursor-pointer border ${
                                            speed === 0.5
                                                ? 'bg-sparta-gold text-black border-sparta-gold shadow-md'
                                                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                        title="Скорость воспроизведения"
                                    >
                                        <Gauge size={13} />
                                        <span>{speed === 0.5 ? 'VAR 0.5x ⏱️' : `${speed}x`}</span>
                                    </button>

                                    <AnimatePresence>
                                        {showSpeedMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className="absolute bottom-full right-0 mb-2 p-1.5 bg-[#141416] border border-sparta-gold/40 rounded-2xl shadow-2xl space-y-1 z-40 w-36 backdrop-blur-xl"
                                            >
                                                <div className="px-2 py-1 text-[9px] font-bold uppercase text-white/40 border-b border-white/5">
                                                    Режим скорости
                                                </div>
                                                {[
                                                    { val: 0.5, label: '⏱️ 0.5x (VAR)' },
                                                    { val: 0.75, label: '0.75x' },
                                                    { val: 1.0, label: '1.0x (Норма)' },
                                                    { val: 1.25, label: '1.25x' },
                                                    { val: 1.5, label: '1.5x' },
                                                    { val: 2.0, label: '2.0x (Быстро)' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.val}
                                                        type="button"
                                                        onClick={() => changeSpeed(opt.val)}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                                                            speed === opt.val
                                                                ? 'bg-sparta-gold text-black font-russo'
                                                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                    >
                                                        <span>{opt.label}</span>
                                                        {speed === opt.val && <Check size={12} />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsLooping(!isLooping)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        isLooping
                                            ? 'bg-sparta-gold/20 text-sparta-gold'
                                            : 'hover:bg-white/15 text-white/60 hover:text-white'
                                    }`}
                                    title={isLooping ? 'Повтор включен' : 'Повторять видео'}
                                >
                                    <Repeat size={16} />
                                </button>

                                <button
                                    type="button"
                                    onClick={toggleFullscreen}
                                    className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-sparta-gold transition-colors cursor-pointer"
                                    title="На весь экран"
                                >
                                    <Maximize2 size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// =========================================================================
// 🖼️ SEAMLESS DYNAMIC SPARTA MEDIA COLLAGE (MOSAIC GRID)
// =========================================================================
interface SpartaMediaCollageProps {
    items: MediaItem[];
    onItemClick: (index: number) => void;
}

const SpartaMediaCollage: React.FC<SpartaMediaCollageProps> = ({ items, onItemClick }) => {
    if (!items || items.length === 0) return null;

    const count = items.length;

    const renderCell = (
        item: MediaItem,
        index: number,
        extraClass = '',
        isOverlay = false,
        remaining = 0
    ) => {
        return (
            <div
                key={item.id || index}
                onClick={(e) => {
                    e.stopPropagation();
                    onItemClick(index);
                }}
                className={`relative w-full h-full overflow-hidden bg-black/80 group/cell cursor-pointer select-none ${extraClass}`}
            >
                {item.type === 'video' ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                        <video
                            src={item.url}
                            className="w-full h-full object-cover group-hover/cell:scale-105 transition-transform duration-300 pointer-events-none"
                            muted
                            playsInline
                            preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/35 group-hover/cell:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-sparta-gold text-black flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.7)] group-hover/cell:scale-115 transition-transform">
                                <Play size={18} fill="currentColor" className="ml-0.5" />
                            </div>
                        </div>
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 border border-sparta-gold/30 text-[9px] font-bold text-sparta-gold flex items-center gap-1 backdrop-blur-xs">
                            <Film size={10} /> Видео
                        </span>
                    </div>
                ) : (
                    <div className="w-full h-full relative">
                        <img
                            src={item.url}
                            alt="Момент"
                            className="w-full h-full object-cover group-hover/cell:scale-105 transition-transform duration-300"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover/cell:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] font-bold text-white flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                                <Maximize2 size={11} /> Открыть
                            </span>
                        </div>
                    </div>
                )}

                {isOverlay && remaining > 0 && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center text-white border-2 border-sparta-gold/60">
                        <span className="text-xl sm:text-2xl font-russo text-sparta-gold">+{remaining}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">еще файлы</span>
                    </div>
                )}
            </div>
        );
    };

    // 1 ITEM: Full aspect ratio hero card
    if (count === 1) {
        return (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg h-56 sm:h-72">
                {renderCell(items[0], 0)}
            </div>
        );
    }

    // 2 ITEMS: Seamless 50 / 50 Split
    if (count === 2) {
        return (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg grid grid-cols-2 gap-1 h-52 sm:h-64">
                {renderCell(items[0], 0)}
                {renderCell(items[1], 1)}
            </div>
        );
    }

    // 3 ITEMS: Editorial Social Mosaic (Main Hero Left 60%, 2 Stacked Right 40%)
    if (count === 3) {
        return (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg grid grid-cols-12 gap-1 h-56 sm:h-72">
                <div className="col-span-7 h-full">
                    {renderCell(items[0], 0)}
                </div>
                <div className="col-span-5 h-full flex flex-col gap-1">
                    <div className="flex-1 overflow-hidden">
                        {renderCell(items[1], 1)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {renderCell(items[2], 2)}
                    </div>
                </div>
            </div>
        );
    }

    // 4 ITEMS: Clean 2x2 Grid
    if (count === 4) {
        return (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg grid grid-cols-2 grid-rows-2 gap-1 h-60 sm:h-72">
                {renderCell(items[0], 0)}
                {renderCell(items[1], 1)}
                {renderCell(items[2], 2)}
                {renderCell(items[3], 3)}
            </div>
        );
    }

    // 5 ITEMS: Top 2 (50/50), Bottom 3 (33/33/33)
    if (count === 5) {
        return (
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg flex flex-col gap-1 h-64 sm:h-80">
                <div className="grid grid-cols-2 gap-1 h-[55%]">
                    {renderCell(items[0], 0)}
                    {renderCell(items[1], 1)}
                </div>
                <div className="grid grid-cols-3 gap-1 h-[45%]">
                    {renderCell(items[2], 2)}
                    {renderCell(items[3], 3)}
                    {renderCell(items[4], 4)}
                </div>
            </div>
        );
    }

    // 6+ ITEMS: Top 2, Bottom 3 with +N overlay on the 5th item
    const remaining = count - 5;
    return (
        <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg flex flex-col gap-1 h-64 sm:h-80">
            <div className="grid grid-cols-2 gap-1 h-[55%]">
                {renderCell(items[0], 0)}
                {renderCell(items[1], 1)}
            </div>
            <div className="grid grid-cols-3 gap-1 h-[45%]">
                {renderCell(items[2], 2)}
                {renderCell(items[3], 3)}
                {renderCell(items[4], 4, '', true, remaining)}
            </div>
        </div>
    );
};

export const KidDashboard: React.FC<KidDashboardProps> = ({ user, userProfile, onTabChange }) => {
    const [groupName, setGroupName] = useState<string>('Футбольная команда «Спарта»');
    const [parentName, setParentName] = useState<string | null>(userProfile?.parentName || null);
    const [coachName, setCoachName] = useState<string>(userProfile?.coachName || 'Пономарев Сергей');
    const [pendingLinkRequest, setPendingLinkRequest] = useState<any | null>(null);

    // Live Synced Group Data from Coach
    const [nextWorkoutTitle, setNextWorkoutTitle] = useState<string>('Футбол: Техника паса и дриблинг');
    const [nextWorkoutTime, setNextWorkoutTime] = useState<string>('Завтра в 17:30');
    const [nextWorkoutLocation, setNextWorkoutLocation] = useState<string>('Спаркл Арена (Зал 1)');
    const [confirmedStudentsCount, setConfirmedStudentsCount] = useState<number>(0);
    const [isConfirmedByMe, setIsConfirmedByMe] = useState<boolean>(false);

    // Live Weekly Challenge from Coach
    const [challengeTitle, setChallengeTitle] = useState<string>('Набить мяч (или чеканить ракеткой) 15 раз без падения');
    const [challengeReward, setChallengeReward] = useState<number>(30);
    const [isChallengeCompleted, setIsChallengeCompleted] = useState<boolean>(false);

    // Personal Assignments from Coach & Live Homework from Firestore
    const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([]);
    const [activeHomeworkItem, setActiveHomeworkItem] = useState<any | null>(null);
    const [isActiveAssignmentPending, setIsActiveAssignmentPending] = useState<boolean>(false);

    // 100% Realtime History Events from Firestore
    const [firestoreEvents, setFirestoreEvents] = useState<TimelineEvent[]>([]);

    // 100% Realtime Team Feed Events (Public posts by teammates & club champions)
    const [teamFeedEvents, setTeamFeedEvents] = useState<TimelineEvent[]>([]);

    // History Modal Open State & Tab Selector
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
    const [historyTab, setHistoryTab] = useState<'my_archive' | 'team_feed'>('my_archive');

    // History Modal Filters
    const [selectedYear, setSelectedYear] = useState<string>('За все время');
    const [selectedMonth, setSelectedMonth] = useState<string>('Все месяцы');
    const [selectedExactDate, setSelectedExactDate] = useState<string>('');
    const [selectedEventType, setSelectedEventType] = useState<'all' | 'workout' | 'challenge' | 'trophy'>('all');
    const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

    // Kid Victory Note State
    const [isAddingVictoryNote, setIsAddingVictoryNote] = useState<boolean>(false);
    const [victoryNoteText, setVictoryNoteText] = useState<string>('');
    const [victorySticker, setVictorySticker] = useState<string>('⚽ Забил красивый гол');
    const [victoryVisibility, setVictoryVisibility] = useState<'public' | 'coach_only' | 'private'>('public');
    const [victoryAllowComments, setVictoryAllowComments] = useState<boolean>(true);

    // Multi-Media Attachments State & Supabase Storage
    const [attachedMediaList, setAttachedMediaList] = useState<MediaItem[]>([]);
    const [isSavingWithMedia, setIsSavingWithMedia] = useState<boolean>(false);

    // Comments & Discussions State
    const [expandedCommentsEventId, setExpandedCommentsEventId] = useState<string | null>(null);
    const [commentInputText, setCommentInputText] = useState<{ [eventId: string]: string }>({});
    const [commentAttachedMedia, setCommentAttachedMedia] = useState<{ [eventId: string]: MediaItem | null }>({});
    const [isPostingComment, setIsPostingComment] = useState<boolean>(false);

    // Comment Interaction States: Edit, Reply, Options Menu
    const [editingCommentState, setEditingCommentState] = useState<{ eventId: string; commentId: string; text: string } | null>(null);
    const [replyingToComment, setReplyingToComment] = useState<{ eventId: string; comment: PostComment } | null>(null);

    // Emoji Picker & Attachment Menu States
    const [activeEmojiEventId, setActiveEmojiEventId] = useState<string | null>(null);
    const [activeAttachEventId, setActiveAttachEventId] = useState<string | null>(null);
    const [activeEmojiTab, setActiveEmojiTab] = useState<string>('sport');
    const [emojiSearchQuery, setEmojiSearchQuery] = useState<string>('');

    // Voice Message Recording State
    const [recordingForEventId, setRecordingForEventId] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState<number>(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 🦁 BRANDED SPARTA CINEMA VIEWER PRO STATE
    const [viewerData, setViewerData] = useState<{
        items: MediaItem[];
        activeIndex: number;
        event?: TimelineEvent;
    } | null>(null);

    const [viewerZoom, setViewerZoom] = useState<number>(1);
    const [viewerRotation, setViewerRotation] = useState<number>(0);
    const [showViewerCaption, setShowViewerCaption] = useState<boolean>(true);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const commentImageInputRef = useRef<HTMLInputElement>(null);
    const commentVideoInputRef = useRef<HTMLInputElement>(null);

    // Inline Edit State for Personal Notes
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editingEventText, setEditingEventText] = useState<string>('');

    // QR Pass Modal, Task History & Toasts
    const [showQrModal, setShowQrModal] = useState<boolean>(false);
    const [isTaskHistoryOpen, setIsTaskHistoryOpen] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const userSport = userProfile?.sport || 'football';

    // Clean name formatting
    const rawName = userProfile?.childName || userProfile?.displayName || userProfile?.name || 'Ваня';
    const studentName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const currentMyRole: AuthorRole = (userProfile?.role as AuthorRole) || 'student';

    // Reset Zoom / Rotation when changing active item
    const handleSetViewerActiveIndex = (newIdx: number) => {
        setViewerData(prev => prev ? { ...prev, activeIndex: newIdx } : null);
        setViewerZoom(1);
        setViewerRotation(0);
    };

    // Keyboard navigation for Fullscreen Lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!viewerData) return;
            if (e.key === 'Escape') {
                setViewerData(null);
            } else if (e.key === 'ArrowLeft') {
                const nextIdx = (viewerData.activeIndex - 1 + viewerData.items.length) % viewerData.items.length;
                handleSetViewerActiveIndex(nextIdx);
            } else if (e.key === 'ArrowRight') {
                const nextIdx = (viewerData.activeIndex + 1) % viewerData.items.length;
                handleSetViewerActiveIndex(nextIdx);
            } else if (e.key === '+' || e.key === '=') {
                setViewerZoom(prev => Math.min(3, prev + 0.25));
            } else if (e.key === '-') {
                setViewerZoom(prev => Math.max(1, prev - 0.25));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewerData]);

    // 1. Linking requests listener
    useEffect(() => {
        if (!user?.uid) return;
        const qReq = query(collection(db, 'linking_requests'), where('childId', '==', user.uid), where('status', '==', 'pending'));
        const unsub = onSnapshot(qReq, (snap) => {
            if (!snap.empty) {
                const reqDoc = snap.docs[0];
                setPendingLinkRequest({ id: reqDoc.id, ...reqDoc.data() });
            } else {
                setPendingLinkRequest(null);
            }
        });
        return () => unsub();
    }, [user?.uid]);

    // 2. Personal Assignments & Live Homework from Coach
    useEffect(() => {
        if (!user?.uid) return;
        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (Array.isArray(data.personalAssignments)) {
                    setPersonalTasks(data.personalAssignments);
                }
            }
        });

        // Listen to active homework (personal or group wide)
        const unsubHomeworkStudent = onSnapshot(
            query(collection(db, 'homework'), where('studentId', '==', user.uid)),
            (snap) => {
                if (!snap.empty) {
                    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                    const active = tasks.find(t => t.status === 'assigned' || t.status === 'pending_review');
                    if (active) {
                        setActiveHomeworkItem(active);
                        setIsActiveAssignmentPending(active.status === 'pending_review');
                    }
                }
            },
            (err) => console.warn('Homework personal listener error:', err)
        );

        let unsubHomeworkGroup = () => {};
        const grpId = userProfile?.groupId;
        if (grpId) {
            unsubHomeworkGroup = onSnapshot(
                query(collection(db, 'homework'), where('groupId', '==', grpId), where('isGroupWide', '==', true)),
                (snap) => {
                    if (!snap.empty) {
                        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
                        const active = tasks.find(t => t.status === 'assigned' || t.status === 'pending_review');
                        if (active) {
                            setActiveHomeworkItem(prev => prev?.studentId ? prev : active);
                            if (!activeHomeworkItem?.studentId) {
                                setIsActiveAssignmentPending(active.status === 'pending_review');
                            }
                        }
                    }
                },
                (err) => console.warn('Homework group listener error:', err)
            );
        }

        return () => {
            unsubUser();
            unsubHomeworkStudent();
            unsubHomeworkGroup();
        };
    }, [user?.uid, userProfile?.groupId]);

    // 3. 100% REALTIME ACTIVITY LOG / HISTORY (My Personal Archive)
    useEffect(() => {
        if (!user?.uid) return;

        try {
            const qLog = query(
                collection(db, 'activity_log'),
                where('userId', '==', user.uid)
            );

            const unsubLog = onSnapshot(qLog, (snap) => {
                if (snap.empty) {
                    const initDate = userProfile?.createdAt ? new Date(userProfile.createdAt) : new Date();
                    const y = initDate.getFullYear();
                    const mIdx = initDate.getMonth();
                    const mName = MONTHS_LIST[mIdx + 1] || 'Август';

                    setFirestoreEvents([{
                        id: 'first_day_milestone',
                        userId: user.uid,
                        userName: studentName,
                        authorRole: 'student',
                        isVerified: true,
                        groupTitle: groupName,
                        dateStr: initDate.toISOString().split('T')[0],
                        displayDate: `${initDate.getDate()} ${mName.toLowerCase()} ${y}`,
                        year: y,
                        monthIndex: mIdx,
                        monthName: mName,
                        type: 'milestone',
                        title: 'Первый день в спортивном центре «Спарта»! 🌟',
                        description: `${studentName} надел форму и провел свою первую тренировку в клубе`,
                        rewardCoins: 50,
                        badgeEmoji: '🌟',
                        timestampNum: initDate.getTime(),
                        visibility: 'public',
                        allowComments: true,
                        comments: [],
                        reactions: { fire: [], applause: [], rocket: [] }
                    }]);
                    return;
                }

                const list: TimelineEvent[] = snap.docs.map(d => {
                    const data = d.data();
                    const ts = data.timestamp?.toDate
                        ? data.timestamp.toDate()
                        : (data.date ? new Date(data.date) : new Date());
                    
                    const year = ts.getFullYear();
                    const monthIndex = ts.getMonth();
                    const monthName = MONTHS_LIST[monthIndex + 1] || 'Август';
                    const dateStr = data.date || ts.toISOString().split('T')[0];

                    let mediaItems: MediaItem[] = [];
                    if (Array.isArray(data.mediaItems) && data.mediaItems.length > 0) {
                        mediaItems = data.mediaItems;
                    } else if (data.mediaUrl || data.imageUrl || data.videoUrl) {
                        mediaItems = [{
                            id: 'single_' + d.id,
                            url: data.mediaUrl || data.imageUrl || data.videoUrl,
                            type: data.mediaType || (data.videoUrl ? 'video' : 'image')
                        }];
                    }

                    return {
                        id: d.id,
                        userId: data.userId || user.uid,
                        userName: data.userName || studentName,
                        authorRole: data.authorRole || 'student',
                        isVerified: data.isVerified ?? true,
                        groupTitle: data.groupTitle || groupName,
                        dateStr: dateStr,
                        displayDate: `${ts.getDate()} ${monthName.toLowerCase()} ${year}`,
                        year: year,
                        monthIndex: monthIndex,
                        monthName: monthName,
                        type: data.type || 'workout',
                        title: data.title || 'Тренировка в клубе',
                        description: data.description || '',
                        rewardCoins: data.rewardCoins,
                        coachName: data.coachName,
                        coachFeedback: data.coachFeedback,
                        badgeEmoji: data.type === 'challenge' ? '🎯' : data.type === 'trophy' ? '🏆' : data.type === 'personal' ? '⭐' : data.type === 'milestone' ? '🌟' : '⚽',
                        timestampNum: ts.getTime(),
                        mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
                        mediaUrl: data.mediaUrl || data.imageUrl || data.videoUrl || undefined,
                        mediaType: data.mediaType || (data.videoUrl ? 'video' : (data.imageUrl ? 'image' : undefined)),
                        visibility: data.visibility || 'public',
                        allowComments: data.allowComments ?? true,
                        comments: Array.isArray(data.comments) ? data.comments : [],
                        reactions: data.reactions || { fire: [], applause: [], rocket: [] }
                    };
                });

                list.sort((a, b) => b.timestampNum - a.timestampNum);
                setFirestoreEvents(list);
            }, (err) => {
                console.warn('Activity log snapshot error:', err);
            });

            return () => unsubLog();
        } catch (err) {
            console.error('Failed to setup activity log listener:', err);
        }
    }, [user?.uid, studentName, groupName, userProfile?.createdAt]);

    // 4. 100% REALTIME TEAM FEED STREAM («Спарта Live»)
    useEffect(() => {
        try {
            const qTeam = query(
                collection(db, 'activity_log'),
                where('visibility', '==', 'public')
            );

            const unsubTeam = onSnapshot(qTeam, (snap) => {
                const list: TimelineEvent[] = snap.docs.map(d => {
                    const data = d.data();
                    const ts = data.timestamp?.toDate
                        ? data.timestamp.toDate()
                        : (data.date ? new Date(data.date) : new Date());

                    const year = ts.getFullYear();
                    const monthIndex = ts.getMonth();
                    const monthName = MONTHS_LIST[monthIndex + 1] || 'Август';
                    const dateStr = data.date || ts.toISOString().split('T')[0];

                    let mediaItems: MediaItem[] = [];
                    if (Array.isArray(data.mediaItems) && data.mediaItems.length > 0) {
                        mediaItems = data.mediaItems;
                    } else if (data.mediaUrl || data.imageUrl || data.videoUrl) {
                        mediaItems = [{
                            id: 'single_' + d.id,
                            url: data.mediaUrl || data.imageUrl || data.videoUrl,
                            type: data.mediaType || (data.videoUrl ? 'video' : 'image')
                        }];
                    }

                    return {
                        id: d.id,
                        userId: data.userId,
                        userName: data.userName || data.studentName || 'Чемпион Спарты',
                        authorRole: data.authorRole || 'student',
                        isVerified: data.isVerified ?? true,
                        groupTitle: data.groupTitle || 'Команда «Спарта»',
                        dateStr: dateStr,
                        displayDate: `${ts.getDate()} ${monthName.toLowerCase()} ${year}`,
                        year: year,
                        monthIndex: monthIndex,
                        monthName: monthName,
                        type: data.type || 'milestone',
                        title: data.title || 'Победа чемпиона',
                        description: data.description || '',
                        rewardCoins: data.rewardCoins,
                        coachName: data.coachName,
                        coachFeedback: data.coachFeedback,
                        badgeEmoji: data.badgeEmoji || (data.type === 'challenge' ? '🎯' : data.type === 'trophy' ? '🏆' : data.type === 'personal' ? '⭐' : data.type === 'milestone' ? '🌟' : '⚽'),
                        timestampNum: ts.getTime(),
                        mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
                        mediaUrl: data.mediaUrl || data.imageUrl || data.videoUrl || undefined,
                        mediaType: data.mediaType || (data.videoUrl ? 'video' : (data.imageUrl ? 'image' : undefined)),
                        visibility: data.visibility || 'public',
                        allowComments: data.allowComments ?? true,
                        comments: Array.isArray(data.comments) ? data.comments : [],
                        reactions: data.reactions || { fire: [], applause: [], rocket: [] }
                    };
                });

                list.sort((a, b) => b.timestampNum - a.timestampNum);
                setTeamFeedEvents(list);
            });

            return () => unsubTeam();
        } catch (e) {
            console.warn('Team feed listener setup error:', e);
        }
    }, []);

    // 5. Live Workout and Challenge Sync
    useEffect(() => {
        let isMounted = true;
        const groupId = userProfile?.groupId;

        let unsubGroup = () => {};
        if (groupId) {
            unsubGroup = onSnapshot(doc(db, 'groups', groupId), (snap) => {
                if (snap.exists() && isMounted) {
                    const data = snap.data();
                    setGroupName(data.title || data.name || data.groupName || 'Группа Спарты');
                    if (data.coachName) setCoachName(data.coachName);
                    if (data.nextWorkoutTitle) setNextWorkoutTitle(data.nextWorkoutTitle);
                    if (data.nextWorkoutTime) setNextWorkoutTime(data.nextWorkoutTime);
                    if (data.nextWorkoutLocation) setNextWorkoutLocation(data.nextWorkoutLocation);
                    
                    const confirmedList: string[] = data.confirmedStudents || [];
                    setConfirmedStudentsCount(confirmedList.length);
                    if (user?.uid && confirmedList.includes(user.uid)) {
                        setIsConfirmedByMe(true);
                    }

                    if (data.weeklyChallengeTitle) setChallengeTitle(data.weeklyChallengeTitle);
                    if (data.weeklyChallengeReward) setChallengeReward(Number(data.weeklyChallengeReward));
                    
                    const completedList: string[] = data.completedChallengeStudents || [];
                    if (user?.uid && completedList.includes(user.uid)) {
                        setIsChallengeCompleted(true);
                    }
                }
            });
        }

        const unsubClub = onSnapshot(doc(db, 'club_workouts', userSport), (snap) => {
            if (snap.exists() && isMounted) {
                const data = snap.data();
                if (data.nextWorkoutTitle) setNextWorkoutTitle(data.nextWorkoutTitle);
                if (data.nextWorkoutTime) setNextWorkoutTime(data.nextWorkoutTime);
                if (data.nextWorkoutLocation) setNextWorkoutLocation(data.nextWorkoutLocation);
                if (data.coachName) setCoachName(data.coachName);
            }
        });

        const unsubClubChallenge = onSnapshot(doc(db, 'club_challenges', userSport), (snap) => {
            if (snap.exists() && isMounted) {
                const data = snap.data();
                if (data.weeklyChallengeTitle) setChallengeTitle(data.weeklyChallengeTitle);
                if (data.weeklyChallengeReward) setChallengeReward(Number(data.weeklyChallengeReward));
            }
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const localConfirmed = safeLocalStorage.getItem(`sparta_workout_confirmed_${user?.uid}_${todayStr}`) === 'true';
        if (localConfirmed) setIsConfirmedByMe(true);

        const weekKey = new Date().getFullYear() + '_w_' + Math.ceil(new Date().getDate() / 7);
        const localChallengeDone = safeLocalStorage.getItem(`sparta_challenge_done_${user?.uid}_${weekKey}`) === 'true';
        if (localChallengeDone) setIsChallengeCompleted(true);

        return () => {
            isMounted = false;
            unsubGroup();
            unsubClub();
            unsubClubChallenge();
        };
    }, [userProfile?.groupId, userSport, user?.uid]);

    // 6. Parent Doc listener
    useEffect(() => {
        if (!userProfile?.parentId) return;
        const unsubParent = onSnapshot(doc(db, 'users', userProfile.parentId), (snap) => {
            if (snap.exists()) {
                const pData = snap.data();
                setParentName(pData.displayName || pData.parentName || pData.name || pData.phone || 'Родитель');
            }
        });
        return () => unsubParent();
    }, [userProfile?.parentId]);

    // Confirm attendance
    const handleConfirmAttendance = async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        safeLocalStorage.setItem(`sparta_workout_confirmed_${user?.uid}_${todayStr}`, 'true');
        setIsConfirmedByMe(true);
        setConfirmedStudentsCount(prev => prev + 1);
        triggerToast('Ты подтвердил участие в тренировке! Тренер ждет тебя ⚽');

        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#FFD700', '#10B981', '#FFFFFF']
        });

        if (user?.uid) {
            try {
                if (userProfile?.groupId) {
                    await updateDoc(doc(db, 'groups', userProfile.groupId), {
                        confirmedStudents: arrayUnion(user.uid)
                    });
                }

                await addDoc(collection(db, 'activity_log'), {
                    userId: user.uid,
                    userName: studentName,
                    authorRole: 'student',
                    isVerified: true,
                    groupTitle: groupName,
                    type: 'workout',
                    title: nextWorkoutTitle,
                    description: `Подтверждено участие в занятии (${nextWorkoutTime})`,
                    rewardCoins: 10,
                    timestamp: serverTimestamp(),
                    date: todayStr,
                    visibility: 'public',
                    allowComments: true,
                    comments: [],
                    reactions: { fire: [], applause: [], rocket: [] }
                });
            } catch (e) {
                console.error('Error confirming attendance in Firestore:', e);
            }
        }
    };

    // Complete Weekly Challenge
    const handleCompleteChallenge = async () => {
        const weekKey = new Date().getFullYear() + '_w_' + Math.ceil(new Date().getDate() / 7);
        safeLocalStorage.setItem(`sparta_challenge_done_${user?.uid}_${weekKey}`, 'true');
        setIsChallengeCompleted(true);
        triggerToast(`Красавчик! Задание выполнено: +${challengeReward} монет начислено! 🌟`);

        confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#10B981', '#3B82F6']
        });

        if (user?.uid) {
            try {
                const currentCoins = Number(userProfile?.coins || 150);
                await updateDoc(doc(db, 'users', user.uid), {
                    coins: currentCoins + challengeReward
                });

                if (userProfile?.groupId) {
                    await updateDoc(doc(db, 'groups', userProfile.groupId), {
                        completedChallengeStudents: arrayUnion(user.uid)
                    });
                }

                await addDoc(collection(db, 'activity_log'), {
                    userId: user.uid,
                    userName: studentName,
                    authorRole: 'student',
                    isVerified: true,
                    groupTitle: groupName,
                    type: 'challenge',
                    title: `Челлендж: «${challengeTitle}»`,
                    description: 'Успешно выполнено на 100%',
                    rewardCoins: challengeReward,
                    timestamp: serverTimestamp(),
                    date: new Date().toISOString().split('T')[0],
                    visibility: 'public',
                    allowComments: true,
                    comments: [],
                    reactions: { fire: [], applause: [], rocket: [] }
                });
            } catch (e) {
                console.error('Error updating challenge in Firestore:', e);
            }
        }
    };

    // Complete Active Assignment (Homework / Challenge)
    const handleCompleteActiveAssignment = async () => {
        if (!user?.uid) return;

        // 1. If we have an active homework doc in Firestore
        if (activeHomeworkItem?.id) {
            try {
                await updateDoc(doc(db, 'homework', activeHomeworkItem.id), {
                    status: 'pending_review',
                    completedByStudent: true,
                    completedAt: new Date().toISOString()
                });

                if (activeHomeworkItem.planId) {
                    await updateDoc(doc(db, 'trainingPlan', activeHomeworkItem.planId), {
                        status: 'pending_review',
                        completedByStudent: true,
                        completedAt: new Date().toISOString()
                    }).catch(() => {});
                }
            } catch (e) {
                console.error('Error updating homework doc:', e);
            }
        } else {
            // Fallback: group challenge
            const weekKey = new Date().getFullYear() + '_w_' + Math.ceil(new Date().getDate() / 7);
            safeLocalStorage.setItem(`sparta_challenge_done_${user?.uid}_${weekKey}`, 'true');
            setIsChallengeCompleted(true);
            try {
                const currentCoins = Number(userProfile?.coins || 150);
                await updateDoc(doc(db, 'users', user.uid), {
                    coins: currentCoins + activeAssignmentRewardCoins
                });
                if (userProfile?.groupId) {
                    await updateDoc(doc(db, 'groups', userProfile.groupId), {
                        completedChallengeStudents: arrayUnion(user.uid)
                    });
                }
            } catch (err) {
                console.error('Error updating challenge in Firestore:', err);
            }
        }

        setIsActiveAssignmentPending(true);
        triggerToast('Отлично! Задание отправлено тренеру на проверку! 🎉');

        confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#10B981', '#3B82F6']
        });

        try {
            await addDoc(collection(db, 'activity_log'), {
                userId: user.uid,
                userName: studentName,
                authorRole: 'student',
                isVerified: true,
                groupTitle: groupName,
                type: 'challenge',
                title: `Задание: «${activeAssignmentTitle}»`,
                description: 'Отправлено тренеру на проверку',
                rewardCoins: activeAssignmentRewardCoins,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                visibility: 'public',
                allowComments: true,
                comments: [],
                reactions: { fire: [], applause: [], rocket: [] }
            });
        } catch (e) {
            console.error('Error logging activity:', e);
        }
    };

    // Complete Personal Task Assigned by Coach
    const handleCompletePersonalTask = async (task: PersonalTask) => {
        if (!user?.uid) return;
        const updatedTasks = personalTasks.map(t =>
            t.id === task.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        );
        setPersonalTasks(updatedTasks);
        triggerToast(`Супер! Личное задание выполнено: +${task.rewardCoins} монет в копилку! 🌟`);

        confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#10B981', '#E11D48']
        });

        try {
            const currentCoins = Number(userProfile?.coins || 150);
            await updateDoc(doc(db, 'users', user.uid), {
                personalAssignments: updatedTasks,
                coins: currentCoins + task.rewardCoins
            });

            await addDoc(collection(db, 'activity_log'), {
                userId: user.uid,
                userName: studentName,
                authorRole: 'student',
                isVerified: true,
                groupTitle: groupName,
                type: 'personal',
                title: `Личное задание: «${task.title}»`,
                description: 'Индивидуальное задание тренера выполнено',
                rewardCoins: task.rewardCoins,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0],
                visibility: 'coach_only',
                allowComments: true,
                comments: [],
                reactions: { fire: [], applause: [], rocket: [] }
            });
        } catch (e) {
            console.error('Error completing personal task in Firestore:', e);
        }
    };

    // Today's Victory Note Check
    const todayDateStr = new Date().toISOString().split('T')[0];
    const hasRecordedTodayVictory = useMemo(() => {
        return firestoreEvents.some(
            ev => ev.dateStr === todayDateStr && (ev.title.includes('Победа дня') || ev.title.includes('победа') || (ev.type === 'milestone' && ev.id !== 'first_day_milestone'))
        );
    }, [firestoreEvents, todayDateStr]);

    // Handle Multiple Files Upload for Victory Note
    const handleMultipleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const maxTotal = 6;
        if (attachedMediaList.length + files.length > maxTotal) {
            triggerToast(`Можно прикрепить не более ${maxTotal} файлов за раз`);
        }

        const filesToProcess = Array.from(files).slice(0, maxTotal - attachedMediaList.length);

        filesToProcess.forEach(file => {
            if (type === 'video' && file.size > 30 * 1024 * 1024) {
                triggerToast(`Видео «${file.name}» слишком большое (макс 30 МБ)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setAttachedMediaList(prev => [
                        ...prev,
                        {
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            url: reader.result as string,
                            type: type,
                            name: file.name,
                            file: file
                        }
                    ]);
                }
            };
            reader.readAsDataURL(file);
        });

        triggerToast(type === 'video' ? 'Видео добавлено! 🎥' : 'Фотографии добавлены! 📸');
        e.target.value = '';
    };

    const handleRemoveAttachedMedia = (id: string) => {
        setAttachedMediaList(prev => prev.filter(m => m.id !== id));
    };

    // Save Kid's Personal Victory Note to Timeline
    const handleSaveVictoryNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid || !victoryNoteText.trim()) return;

        setIsSavingWithMedia(true);
        const isFreeMemo = hasRecordedTodayVictory;
        const reward = isFreeMemo ? 0 : 20;

        try {
            let finalMediaItems: MediaItem[] = [];

            if (attachedMediaList.length > 0) {
                const uploadPromises = attachedMediaList.map(async (mItem) => {
                    if (mItem.file) {
                        try {
                            const publicUrl = await uploadReviewMedia(mItem.file, 'champion_archive');
                            return {
                                id: mItem.id,
                                url: publicUrl || mItem.url,
                                type: mItem.type,
                                name: mItem.name
                            };
                        } catch (err) {
                            console.warn('Supabase storage upload fallback:', err);
                            return {
                                id: mItem.id,
                                url: mItem.url,
                                type: mItem.type,
                                name: mItem.name
                            };
                        }
                    }
                    return {
                        id: mItem.id,
                        url: mItem.url,
                        type: mItem.type,
                        name: mItem.name
                    };
                });

                finalMediaItems = await Promise.all(uploadPromises);
            }

            const payload: any = {
                userId: user.uid,
                userName: studentName,
                authorRole: 'student',
                isVerified: true,
                groupTitle: groupName,
                type: 'milestone',
                title: `Победа дня: ${victorySticker}`,
                description: victoryNoteText.trim(),
                rewardCoins: reward,
                timestamp: serverTimestamp(),
                date: todayDateStr,
                visibility: victoryVisibility,
                allowComments: victoryAllowComments,
                comments: [],
                reactions: { fire: [], applause: [], rocket: [] }
            };

            if (finalMediaItems.length > 0) {
                payload.mediaItems = finalMediaItems;
                payload.mediaUrl = finalMediaItems[0].url;
                payload.mediaType = finalMediaItems[0].type;
            }

            await addDoc(collection(db, 'activity_log'), payload);

            if (!isFreeMemo) {
                const currentCoins = Number(userProfile?.coins || 150);
                await updateDoc(doc(db, 'users', user.uid), {
                    coins: currentCoins + 20
                });
                triggerToast('Красавчик! Твоя победа сохранена: +20 монет в копилку! 🌟');
            } else {
                triggerToast('Твое воспоминание бережно сохранено в Дневник Чемпиона! 📖');
            }

            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.5 }
            });

            setVictoryNoteText('');
            setAttachedMediaList([]);
            setVictoryAllowComments(true);
            setIsAddingVictoryNote(false);
        } catch (e) {
            console.error('Error saving victory note:', e);
            triggerToast('Ошибка при сохранении. Попробуйте еще раз');
        } finally {
            setIsSavingWithMedia(false);
        }
    };

    // 📎 HANDLE ATTACHMENT FOR COMMENT (IMAGE / VIDEO)
    const handleCommentAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>, eventId: string, type: 'image' | 'video') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'video' && file.size > 30 * 1024 * 1024) {
            triggerToast('Видео слишком большое (максимум 30 МБ)');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setCommentAttachedMedia(prev => ({
                    ...prev,
                    [eventId]: {
                        id: 'c_att_' + Date.now(),
                        url: reader.result as string,
                        type: type,
                        name: file.name,
                        file: file
                    }
                }));
                triggerToast(type === 'video' ? 'Видео прикреплено к комментарию! 🎥' : 'Фотография прикреплена к комментарию! 📸');
            }
        };
        reader.readAsDataURL(file);
        setActiveAttachEventId(null);
        e.target.value = '';
    };

    // 🍎 INSERT EMOJI INTO COMMENT INPUT
    const handleInsertEmoji = (eventId: string, emoji: string) => {
        setCommentInputText(prev => ({
            ...prev,
            [eventId]: (prev[eventId] || '') + emoji
        }));
    };

    // 🎙️ START RECORDING VOICE COMMENT
    const startVoiceRecording = async (eventId: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        setCommentAttachedMedia(prev => ({
                            ...prev,
                            [eventId]: {
                                id: 'audio_' + Date.now(),
                                url: reader.result as string,
                                type: 'video', // treated as media
                                name: `Голосовое (${recordingTime}с)`
                            }
                        }));
                    }
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setRecordingForEventId(eventId);
            setRecordingTime(0);
            setActiveAttachEventId(null);

            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            triggerToast('Запись голосового началась... Говорите! 🎙️');
        } catch (err) {
            console.warn('Microphone access error:', err);
            triggerToast('Разрешите доступ к микрофону для записи голосового');
        }
    };

    // 🎙️ STOP RECORDING VOICE COMMENT
    const stopVoiceRecording = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setRecordingForEventId(null);
        triggerToast('Голосовое записано! Нажмите «Отправить» 🎙️✨');
    };

    // 🎙️ CANCEL RECORDING VOICE COMMENT
    const cancelVoiceRecording = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        audioChunksRef.current = [];
        setRecordingForEventId(null);
        setRecordingTime(0);
        triggerToast('Запись отменена');
    };

    // =========================================================================
    // ⚙️ COMMENT INTERACTIONS: EDIT, DELETE, REPLY, REACTIONS, PIN & COPY
    // =========================================================================

    // 1. DELETE COMMENT
    const handleDeleteComment = async (event: TimelineEvent, commentId: string) => {
        if (!event.id || !commentId) return;

        const updatedComments = (event.comments || []).filter(c => c.id !== commentId);

        // Optimistic UI
        const updateList = (list: TimelineEvent[]) =>
            list.map(ev => (ev.id === event.id ? { ...ev, comments: updatedComments } : ev));
        setFirestoreEvents(prev => updateList(prev));
        setTeamFeedEvents(prev => updateList(prev));

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                comments: updatedComments
            });
            triggerToast('Комментарий удален 🗑️');
        } catch (err) {
            console.error('Error deleting comment:', err);
            triggerToast('Не удалось удалить комментарий');
        }
    };

    // 2. SAVE EDITED COMMENT TEXT
    const handleSaveEditedComment = async (event: TimelineEvent, commentId: string, newText: string) => {
        if (!event.id || !commentId || !newText.trim()) return;

        const updatedComments = (event.comments || []).map(c =>
            c.id === commentId ? { ...c, text: newText.trim() } : c
        );

        // Optimistic UI
        const updateList = (list: TimelineEvent[]) =>
            list.map(ev => (ev.id === event.id ? { ...ev, comments: updatedComments } : ev));
        setFirestoreEvents(prev => updateList(prev));
        setTeamFeedEvents(prev => updateList(prev));
        setEditingCommentState(null);

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                comments: updatedComments
            });
            triggerToast('Комментарий успешно обновлен! ✨');
        } catch (err) {
            console.error('Error updating comment:', err);
            triggerToast('Не удалось обновить комментарий');
        }
    };

    // 3. REPLY TO COMMENT
    const handleStartReplyToComment = (event: TimelineEvent, comment: PostComment) => {
        setReplyingToComment({ eventId: event.id, comment });
        setCommentInputText(prev => ({
            ...prev,
            [event.id]: `@${comment.authorName}, ` + (prev[event.id] || '')
        }));
        triggerToast(`Ответ для ${comment.authorName} ↩️`);
    };

    // 4. TOGGLE REACTION ON COMMENT
    const handleToggleCommentReaction = async (
        event: TimelineEvent,
        commentId: string,
        reactionType: 'heart' | 'fire' | 'applause'
    ) => {
        if (!user?.uid || !event.id) return;

        let hasReacted = false;

        const updatedComments = (event.comments || []).map(c => {
            if (c.id === commentId) {
                const currentList = c.reactions?.[reactionType] || [];
                hasReacted = currentList.includes(user.uid);
                const nextList = hasReacted
                    ? currentList.filter(id => id !== user.uid)
                    : [...currentList, user.uid];

                return {
                    ...c,
                    reactions: {
                        ...(c.reactions || {}),
                        [reactionType]: nextList
                    }
                };
            }
            return c;
        });

        // Optimistic UI
        const updateList = (list: TimelineEvent[]) =>
            list.map(ev => (ev.id === event.id ? { ...ev, comments: updatedComments } : ev));
        setFirestoreEvents(prev => updateList(prev));
        setTeamFeedEvents(prev => updateList(prev));

        if (!hasReacted) {
            confetti({
                particleCount: 20,
                spread: 35,
                origin: { y: 0.75 }
            });
        }

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                comments: updatedComments
            });
        } catch (err) {
            console.error('Error updating comment reaction:', err);
        }
    };

    // 5. TOGGLE PIN COMMENT
    const handleTogglePinComment = async (event: TimelineEvent, commentId: string) => {
        if (!event.id) return;

        const updatedComments = (event.comments || []).map(c => {
            if (c.id === commentId) {
                return { ...c, isPinned: !c.isPinned };
            }
            return c;
        });

        // Optimistic UI
        const updateList = (list: TimelineEvent[]) =>
            list.map(ev => (ev.id === event.id ? { ...ev, comments: updatedComments } : ev));
        setFirestoreEvents(prev => updateList(prev));
        setTeamFeedEvents(prev => updateList(prev));

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                comments: updatedComments
            });
            triggerToast('Статус закрепления комментария обновлен 📌');
        } catch (err) {
            console.error('Error pinning comment:', err);
        }
    };

    // 6. COPY COMMENT TEXT
    const handleCopyCommentText = async (text?: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            triggerToast('Текст комментария скопирован! 📋');
        } catch (e) {
            triggerToast('Не удалось скопировать текст');
        }
    };

    // SUBMIT A COMMENT TO A POST
    const handleAddComment = async (event: TimelineEvent) => {
        if (!event.id || !user?.uid) return;
        const text = (commentInputText[event.id] || '').trim();
        const attached = commentAttachedMedia[event.id];

        if (!text && !attached) {
            triggerToast('Напишите комментарий или прикрепите медиа');
            return;
        }

        setIsPostingComment(true);

        let finalMediaUrl = attached?.url;

        // Upload attached file to storage if present
        if (attached?.file) {
            try {
                const uploadedUrl = await uploadReviewMedia(attached.file, 'comment_attachments');
                if (uploadedUrl) {
                    finalMediaUrl = uploadedUrl;
                }
            } catch (err) {
                console.warn('Fallback to local url for comment media:', err);
            }
        }

        const newComment: PostComment = {
            id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            authorId: user.uid,
            authorName: studentName,
            authorRole: currentMyRole,
            isVerified: true,
            text: text || undefined,
            mediaUrl: finalMediaUrl,
            mediaType: attached?.name?.includes('Голосовое') ? 'audio' : attached?.type,
            audioDuration: recordingTime > 0 ? recordingTime : undefined,
            createdAt: 'Только что',
            timestampNum: Date.now(),
            replyTo: replyingToComment && replyingToComment.eventId === event.id ? {
                commentId: replyingToComment.comment.id,
                authorName: replyingToComment.comment.authorName,
                textSnippet: replyingToComment.comment.text?.slice(0, 40)
            } : undefined,
            reactions: { heart: [], fire: [], applause: [] }
        };

        // Optimistic UI update
        const updateEventInList = (list: TimelineEvent[]) =>
            list.map(ev => {
                if (ev.id === event.id) {
                    return {
                        ...ev,
                        comments: [...(ev.comments || []), newComment]
                    };
                }
                return ev;
            });

        setFirestoreEvents(prev => updateEventInList(prev));
        setTeamFeedEvents(prev => updateEventInList(prev));

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                comments: arrayUnion(newComment)
            });

            setCommentInputText(prev => ({ ...prev, [event.id]: '' }));
            setCommentAttachedMedia(prev => ({ ...prev, [event.id]: null }));
            setReplyingToComment(null);
            setActiveEmojiEventId(null);
            setActiveAttachEventId(null);
            triggerToast('Комментарий опубликован! 💬✨');
            confetti({
                particleCount: 30,
                spread: 40,
                origin: { y: 0.8 }
            });
        } catch (err) {
            console.error('Error posting comment:', err);
            triggerToast('Не удалось отправить комментарий');
        } finally {
            setIsPostingComment(false);
        }
    };

    // TOGGLE ALLOW COMMENTS ON A POST
    const handleToggleAllowComments = async (event: TimelineEvent) => {
        const canManage = event.userId === user?.uid || ['coach', 'director', 'admin'].includes(currentMyRole);
        if (!event.id || !canManage) return;
        const nextAllow = !(event.allowComments ?? true);

        // Optimistic UI state update
        setFirestoreEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, allowComments: nextAllow } : ev));

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                allowComments: nextAllow
            });
            triggerToast(nextAllow ? 'Комментарии к записи открыты 💬' : 'Комментарии к записи отключены 🔒');
        } catch (e) {
            console.error('Error toggling allowComments:', e);
            // Revert on error
            setFirestoreEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, allowComments: !nextAllow } : ev));
        }
    };

    // Toggle Reaction on Team Post
    const handleToggleReaction = async (event: TimelineEvent, reactionType: 'fire' | 'applause' | 'rocket') => {
        if (!user?.uid || !event.id) return;
        const currentList = event.reactions?.[reactionType] || [];
        const hasReacted = currentList.includes(user.uid);
        const nextList = hasReacted
            ? currentList.filter(id => id !== user.uid)
            : [...currentList, user.uid];

        setTeamFeedEvents(prev => prev.map(ev => {
            if (ev.id === event.id) {
                return {
                    ...ev,
                    reactions: {
                        ...(ev.reactions || {}),
                        [reactionType]: nextList
                    }
                };
            }
            return ev;
        }));

        if (!hasReacted) {
            confetti({
                particleCount: 45,
                spread: 60,
                origin: { y: 0.7 },
                colors: reactionType === 'fire' ? ['#F97316', '#EF4444', '#FFD700'] : reactionType === 'applause' ? ['#10B981', '#FFD700', '#FFFFFF'] : ['#3B82F6', '#8B5CF6', '#FFD700']
            });
            triggerToast(
                reactionType === 'fire' ? 'Огонь! 🔥 Реакция отправлена сокоманднику!' :
                reactionType === 'applause' ? 'Красавчик! 👏 Ты поддержал друга!' :
                'Пушка! ⚽ Мощный удар!'
            );
        }

        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                [`reactions.${reactionType}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (e) {
            console.error('Error updating reaction in Firestore:', e);
        }
    };

    // Toggle Visibility on Existing Event
    const handleToggleEventVisibility = async (event: TimelineEvent) => {
        if (!event.id || event.id === 'first_day_milestone') return;
        const current = event.visibility || 'public';
        const nextVis: 'public' | 'coach_only' | 'private' = 
            current === 'public' ? 'coach_only' :
            current === 'coach_only' ? 'private' : 'public';
        
        try {
            await updateDoc(doc(db, 'activity_log', event.id), {
                visibility: nextVis
            });
            const msg = nextVis === 'public'
                ? 'Теперь эту победу видит вся команда и друзья! 🌍'
                : nextVis === 'coach_only'
                ? 'Теперь победу видите только вы и ваш тренер! 👨‍🏫'
                : 'Заметка скрыта: видна только вам (личный дневник) 🔒';
            triggerToast(msg);
        } catch (e) {
            console.error('Error toggling visibility:', e);
        }
    };

    // Download active media file
    const handleDownloadMedia = (url: string, filename = 'sparta_moment') => {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}_${Date.now()}`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            triggerToast('Файл скачивается на устройство! 📥');
        } catch (e) {
            triggerToast('Не удалось скачать файл');
        }
    };

    // Share active media file
    const handleShareMedia = async (url: string, title?: string) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'Моя победа в Спарте! ⚽',
                    text: `Посмотри мой момент в спортивном центре «Спарта»! 🦁`,
                    url: url
                });
                triggerToast('Успешно отправлено! 🚀');
                return;
            } catch (e) {}
        }

        if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            triggerToast('Ссылка на победу скопирована в буфер обмена! 📋');
        }
    };

    // Delete Personal Note
    const handleDeleteEvent = async (eventId: string) => {
        if (!eventId || eventId === 'first_day_milestone') return;
        try {
            await deleteDoc(doc(db, 'activity_log', eventId));
            triggerToast('Заметка удалена из Архива');
        } catch (e) {
            console.error('Error deleting activity record:', e);
        }
    };

    // Edit Personal Note
    const handleStartEdit = (event: TimelineEvent) => {
        setEditingEventId(event.id);
        setEditingEventText(event.description || '');
    };

    const handleSaveEditEvent = async (eventId: string) => {
        if (!eventId || !editingEventText.trim()) return;
        try {
            await updateDoc(doc(db, 'activity_log', eventId), {
                description: editingEventText.trim()
            });
            setEditingEventId(null);
            triggerToast('Заметка успешно обновлена! ✨');
        } catch (e) {
            console.error('Error updating activity record:', e);
        }
    };

    const xp = userProfile?.xp || userProfile?.bonusPoints || 180;
    const maxXp = 500;
    const xpPercent = Math.min(100, Math.round((xp / maxXp) * 100));

    const getRank = (currentXp: number) => {
        if (currentXp >= 400) return { title: 'Спартанец', color: 'from-amber-400 to-yellow-500', badge: '🥇' };
        if (currentXp >= 200) return { title: 'Спортсмен', color: 'from-blue-400 to-indigo-500', badge: '🥈' };
        return { title: 'Новичок', color: 'from-emerald-400 to-teal-500', badge: '🥉' };
    };

    const rankInfo = getRank(xp);
    const level = Math.floor(xp / 100) + 1;
    const coins = userProfile?.coins ?? 150;
    const coinsToNextPrize = Math.max(0, 200 - coins);

    const streak = userProfile?.streak || 5;
    const completedWorkouts = firestoreEvents.filter(e => e.type === 'workout').length || userProfile?.completedWorkoutsCount || 4;
    const attendanceRate = userProfile?.attendanceRate || '96%';

    const rawChildName = userProfile?.childName || userProfile?.displayName || userProfile?.name || 'Чемпион';
    const firstName = rawChildName.trim().split(' ')[0] || 'Чемпион';
    const displayGroupName = userProfile?.groupName || groupName || 'Группа Спарты';

    const activeAssignmentTitle = activeHomeworkItem?.title || challengeTitle || 'Набивание мяча 15 раз без падения';
    const activeAssignmentDescription = activeHomeworkItem?.description || (challengeTitle ? 'Выполни задание на тренировке или дома и покажи тренеру!' : 'Отрабатывай технику паса и координацию дома!');
    const activeAssignmentCoach = activeHomeworkItem?.coachName || coachName || 'Тренер';
    const activeAssignmentRewardCoins = activeHomeworkItem?.rewardCoins || challengeReward || 30;
    const activeAssignmentRewardXp = activeHomeworkItem?.rewardXp || 50;
    const activeAssignmentDueDate = activeHomeworkItem?.dueDate || '';
    const isActiveAssignmentCompleted = isChallengeCompleted || activeHomeworkItem?.status === 'completed';
    const completedHomeworkCount = (firestoreEvents.filter(e => e.type === 'challenge' || e.type === 'personal').length) || userProfile?.completedHomeworkCount || 3;

    const [selectedBadgeForModal, setSelectedBadgeForModal] = useState<SpartanBadge | null>(null);
    const [isStudentCardOpen, setIsStudentCardOpen] = useState<boolean>(false);

    // 🏆 Unified Realtime Hook for Synchronized Achievements
    const {
        achievements: spartanBadges,
        unlockedCount: unlockedBadgesCount,
        totalCount: totalBadgesCount,
        pinnedBadge,
        pinnedBadgeId,
        pinnedAwards,
        pinnedAwardItems,
        togglePin: handleTogglePin,
        togglePinAward,
        markAsViewed
    } = useStudentAchievements(user?.uid);

    const handleBadgeClick = (b: SpartanBadge) => {
        setSelectedBadgeForModal(b);
        markAsViewed(b.id);
    };

    // 🎯 Ограничение дашборда СТРОГО 1 рядом: последние 2 разблокированные и 1 ближайшая в процессе
    const dashboardBadges = useMemo(() => {
        const unlocked = spartanBadges.filter(b => b.unlocked);
        const inProgress = spartanBadges.filter(b => !b.unlocked && b.progress && b.progress.max > 0);
        const otherLocked = spartanBadges.filter(b => !b.unlocked && (!b.progress || b.progress.max <= 0));

        // Последние 2 разблокированные
        const topUnlocked = unlocked.slice(-2);

        // 1 ближайшая в процессе выполнения (с максимальным процентом прогресса)
        const topInProgress = inProgress.length > 0
            ? [...inProgress].sort((a, b) => {
                const pA = (a.progress!.current / a.progress!.max);
                const pB = (b.progress!.current / b.progress!.max);
                return pB - pA;
            }).slice(0, 1)
            : otherLocked.slice(0, 1);

        const combined = [...topUnlocked, ...topInProgress];
        if (combined.length < 3) {
            for (const b of spartanBadges) {
                if (combined.length < 3 && !combined.some(c => c.id === b.id)) {
                    combined.push(b);
                }
            }
        }
        return combined.slice(0, 3);
    }, [spartanBadges]);

    // DYNAMIC YEARS LIST
    const dynamicYearsList = useMemo(() => {
        const yearsSet = new Set<number>();
        const currentYear = new Date().getFullYear();
        yearsSet.add(currentYear);

        firestoreEvents.forEach(ev => {
            if (ev.year) yearsSet.add(ev.year);
        });

        if (userProfile?.createdAt) {
            try {
                const cYear = new Date(userProfile.createdAt).getFullYear();
                if (cYear > 2000 && cYear <= currentYear) yearsSet.add(cYear);
            } catch (e) {}
        }

        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        return ['За все время', ...sortedYears.map(String)];
    }, [firestoreEvents, userProfile?.createdAt]);

    // Filtered Timeline Events
    const filteredEvents = useMemo(() => {
        return firestoreEvents.filter(ev => {
            if (selectedYear !== 'За все время' && String(ev.year) !== selectedYear) return false;

            if (selectedMonth !== 'Все месяцы') {
                const monthIdx = MONTHS_LIST.indexOf(selectedMonth) - 1;
                if (ev.monthIndex !== monthIdx) return false;
            }

            if (selectedExactDate && ev.dateStr !== selectedExactDate) return false;

            if (selectedEventType !== 'all' && ev.type !== selectedEventType) return false;

            if (historySearchQuery.trim()) {
                const q = historySearchQuery.toLowerCase();
                const matchTitle = ev.title.toLowerCase().includes(q);
                const matchDesc = ev.description.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) return false;
            }

            return true;
        });
    }, [firestoreEvents, selectedYear, selectedMonth, selectedExactDate, selectedEventType, historySearchQuery]);

    // Period Summary Statistics
    const periodStats = useMemo(() => {
        let totalCoins = 0;
        let workoutsCount = 0;
        let challengesCount = 0;
        let trophiesCount = 0;

        filteredEvents.forEach(ev => {
            if (ev.rewardCoins) totalCoins += ev.rewardCoins;
            if (ev.type === 'workout') workoutsCount++;
            if (ev.type === 'challenge' || ev.type === 'personal') challengesCount++;
            if (ev.type === 'trophy' || ev.type === 'milestone') trophiesCount++;
        });

        return { totalCoins, workoutsCount, challengesCount, trophiesCount };
    }, [filteredEvents]);

    const activePersonalTasks = personalTasks.filter(t => !t.completed);

    // =========================================================================
    // 💬 COMMENTS SECTION SUBCOMPONENT (WITH ACTIONS, EDIT, DELETE & REPLIES)
    // =========================================================================
    const renderCommentsSection = (event: TimelineEvent) => {
        const isPostAuthor = event.userId === user?.uid;
        const isCommentsOpen = event.allowComments ?? true;
        const rawCommentsList = event.comments || [];
        
        // Sort comments: pinned first, then chronological
        const sortedComments = [...rawCommentsList].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (a.timestampNum || 0) - (b.timestampNum || 0);
        });

        const isExpanded = expandedCommentsEventId === event.id;
        const curText = commentInputText[event.id] || '';
        const curMedia = commentAttachedMedia[event.id];
        const isRecordingThis = recordingForEventId === event.id;
        const isEmojiOpen = activeEmojiEventId === event.id;
        const isAttachOpen = activeAttachEventId === event.id;
        const replyState = replyingToComment && replyingToComment.eventId === event.id ? replyingToComment.comment : null;

        const currentCategoryEmojis = APPLE_EMOJI_CATEGORIES.find(c => c.id === activeEmojiTab)?.emojis || [];
        const q = emojiSearchQuery.trim().toLowerCase();
        const filteredEmojis = q
            ? (() => {
                const matchedCats = APPLE_EMOJI_CATEGORIES.filter(cat => {
                    const nameMatch = cat.name.toLowerCase().includes(q) || cat.id.toLowerCase().includes(q);
                    const kwMatch = EMOJI_KEYWORDS[cat.id]?.some(kw => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase()));
                    return nameMatch || kwMatch;
                });
                return matchedCats.length > 0
                    ? Array.from(new Set(matchedCats.flatMap(c => c.emojis)))
                    : Array.from(new Set(APPLE_EMOJI_CATEGORIES.flatMap(c => c.emojis)));
            })()
            : currentCategoryEmojis;

        return (
            <div className="pt-2 border-t border-white/5 space-y-3" onClick={e => e.stopPropagation()}>
                {/* Comments Header Bar */}
                <div className="flex items-center justify-between text-xs">
                    <button
                        type="button"
                        onClick={() => setExpandedCommentsEventId(isExpanded ? null : event.id)}
                        className="text-white/70 hover:text-sparta-gold font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <MessageSquare size={13} className="text-sparta-gold" />
                        <span>Комментарии {sortedComments.length > 0 && `(${sortedComments.length})`}</span>
                        <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sparta-gold' : ''}`} />
                    </button>

                    {(isPostAuthor || ['coach', 'director', 'admin'].includes(currentMyRole)) && (
                        <button
                            type="button"
                            onClick={() => handleToggleAllowComments(event)}
                            className={`text-[10px] px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCommentsOpen
                                    ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                            }`}
                            title={isCommentsOpen ? 'Нажмите, чтобы закрыть комментарии' : 'Нажмите, чтобы открыть комментарии'}
                        >
                            {isCommentsOpen ? (
                                <>
                                    <Unlock size={11} className="text-emerald-400" />
                                    <span>Комментарии открыты</span>
                                </>
                            ) : (
                                <>
                                    <Lock size={11} className="text-rose-400" />
                                    <span>Комментарии закрыты</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Comments Feed and Creator */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 pt-2"
                        >
                            {/* List of existing verified comments */}
                            {sortedComments.length > 0 && (
                                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1.5 custom-scrollbar">
                                    {sortedComments.map((cmt) => {
                                        const isCommentAuthor = cmt.authorId === user?.uid;
                                        const canModerate = isCommentAuthor || isPostAuthor || ['coach', 'director', 'admin'].includes(currentMyRole);
                                        const isEditingThisComment = editingCommentState?.eventId === event.id && editingCommentState?.commentId === cmt.id;

                                        const heartList = cmt.reactions?.heart || [];
                                        const fireList = cmt.reactions?.fire || [];
                                        const applauseList = cmt.reactions?.applause || [];

                                        const hasHearted = user?.uid && heartList.includes(user.uid);
                                        const hasFired = user?.uid && fireList.includes(user.uid);
                                        const hasApplauded = user?.uid && applauseList.includes(user.uid);

                                        return (
                                            <div
                                                key={cmt.id}
                                                className={`p-3 rounded-2xl border text-xs space-y-2 relative transition-all group/cmt ${
                                                    cmt.isPinned
                                                        ? 'bg-gradient-to-r from-amber-500/20 via-[#1f1a12] to-[#121212] border-sparta-gold/60 shadow-md shadow-sparta-gold/10'
                                                        : cmt.authorRole === 'director'
                                                        ? 'bg-gradient-to-r from-amber-500/15 via-[#1a1710] to-[#121212] border-amber-500/40 shadow-sm'
                                                        : cmt.authorRole === 'coach'
                                                        ? 'bg-gradient-to-r from-blue-500/15 via-[#12161f] to-[#121212] border-blue-500/40 shadow-sm'
                                                        : cmt.authorRole === 'developer'
                                                        ? 'bg-gradient-to-r from-purple-500/15 via-[#18121f] to-[#121212] border-purple-500/40 shadow-sm'
                                                        : cmt.authorRole === 'admin'
                                                        ? 'bg-gradient-to-r from-emerald-500/15 via-[#101915] to-[#121212] border-emerald-500/40 shadow-sm'
                                                        : 'bg-white/[0.03] border-white/10'
                                                }`}
                                            >
                                                {/* Pinned Badge */}
                                                {cmt.isPinned && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-sparta-gold border-b border-sparta-gold/20 pb-1">
                                                        <Pin size={11} className="fill-sparta-gold text-sparta-gold" />
                                                        <span>Закрепленный комментарий</span>
                                                    </div>
                                                )}

                                                {/* Reply To info if present */}
                                                {cmt.replyTo && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-white/50 bg-black/40 px-2.5 py-1 rounded-lg border-l-2 border-sparta-gold">
                                                        <CornerDownRight size={10} className="text-sparta-gold" />
                                                        <span>Ответ пользователю <strong className="text-white">{cmt.replyTo.authorName}</strong></span>
                                                    </div>
                                                )}

                                                {/* Comment Header */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-[10px] font-bold">
                                                            {cmt.authorAvatar ? (
                                                                <img src={cmt.authorAvatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                                            ) : (
                                                                cmt.authorName.charAt(0)
                                                            )}
                                                        </div>
                                                        <span className="font-russo text-white text-[11px]">{cmt.authorName}</span>
                                                        <VerifiedBadge role={cmt.authorRole} isVerified={cmt.isVerified} />
                                                        {isCommentAuthor && (
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-white/60 font-bold">Вы</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] text-white/40">{cmt.createdAt}</span>

                                                        {/* Action Buttons */}
                                                        <div className="flex items-center gap-1 opacity-80 group-hover/cmt:opacity-100 transition-opacity">
                                                            {/* Pin Button (Author/Coach) */}
                                                            {(isPostAuthor || ['coach', 'director', 'admin'].includes(currentMyRole)) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleTogglePinComment(event, cmt.id)}
                                                                    className={`p-1 rounded-md text-xs cursor-pointer transition-colors ${
                                                                        cmt.isPinned
                                                                            ? 'text-sparta-gold hover:bg-sparta-gold/20'
                                                                            : 'text-white/40 hover:text-sparta-gold hover:bg-white/10'
                                                                    }`}
                                                                    title={cmt.isPinned ? 'Открепить' : 'Закрепить наверху'}
                                                                >
                                                                    <Pin size={11} />
                                                                </button>
                                                            )}

                                                            {/* Edit Button (Author only) */}
                                                            {isCommentAuthor && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingCommentState({ eventId: event.id, commentId: cmt.id, text: cmt.text || '' })}
                                                                    className="p-1 rounded-md text-white/40 hover:text-sparta-gold hover:bg-white/10 transition-colors text-xs cursor-pointer"
                                                                    title="Редактировать текст"
                                                                >
                                                                    <Edit3 size={11} />
                                                                </button>
                                                            )}

                                                            {/* Delete Button */}
                                                            {canModerate && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteComment(event, cmt.id)}
                                                                    className="p-1 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer"
                                                                    title="Удалить комментарий"
                                                                >
                                                                    <Trash2 size={11} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Text or Inline Edit Form */}
                                                {isEditingThisComment ? (
                                                    <div className="space-y-1.5 pl-8 pt-1">
                                                        <input
                                                            type="text"
                                                            value={editingCommentState.text}
                                                            onChange={e => setEditingCommentState({ ...editingCommentState, text: e.target.value })}
                                                            className="w-full px-3 py-1.5 bg-black/80 border border-sparta-gold rounded-xl text-xs text-white outline-none"
                                                            autoFocus
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    handleSaveEditedComment(event, cmt.id, editingCommentState.text);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingCommentState(null);
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEditedComment(event, cmt.id, editingCommentState.text)}
                                                                className="px-2.5 py-1 rounded-lg bg-sparta-gold text-black font-bold text-[10px] cursor-pointer"
                                                            >
                                                                Сохранить
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingCommentState(null)}
                                                                className="px-2 py-1 rounded-lg bg-white/10 text-white/60 hover:text-white text-[10px] cursor-pointer"
                                                            >
                                                                Отмена
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    cmt.text && (
                                                        <p className="text-xs text-white/80 leading-relaxed pl-8 whitespace-pre-wrap">
                                                            {cmt.text}
                                                        </p>
                                                    )
                                                )}

                                                {/* Voice Audio Message */}
                                                {cmt.mediaType === 'audio' && cmt.mediaUrl && (
                                                    <div className="pl-8 pt-1">
                                                        <SpartaAudioPlayer src={cmt.mediaUrl} duration={cmt.audioDuration} />
                                                    </div>
                                                )}

                                                {/* Attached Image with Lightbox Launch */}
                                                {cmt.mediaType === 'image' && cmt.mediaUrl && (
                                                    <div className="pl-8 pt-1">
                                                        <div
                                                            onClick={() => {
                                                                setViewerData({
                                                                    items: [{ id: 'cmt_' + cmt.id, url: cmt.mediaUrl!, type: 'image', name: `Фото от ${cmt.authorName}` }],
                                                                    activeIndex: 0,
                                                                    event
                                                                });
                                                                setViewerZoom(1);
                                                                setViewerRotation(0);
                                                            }}
                                                            className="relative max-w-xs rounded-xl overflow-hidden border border-white/15 cursor-pointer group/att"
                                                        >
                                                            <img src={cmt.mediaUrl} alt="media" className="max-h-40 w-full object-cover group-hover/att:scale-105 transition-transform" />
                                                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white flex items-center gap-0.5">
                                                                <Maximize2 size={9} /> Открыть
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Attached Video with Lightbox Launch */}
                                                {cmt.mediaType === 'video' && cmt.mediaUrl && (
                                                    <div className="pl-8 pt-1">
                                                        <div
                                                            onClick={() => {
                                                                setViewerData({
                                                                    items: [{ id: 'cmt_v_' + cmt.id, url: cmt.mediaUrl!, type: 'video', name: `Видео от ${cmt.authorName}` }],
                                                                    activeIndex: 0,
                                                                    event
                                                                });
                                                            }}
                                                            className="relative max-w-xs rounded-xl overflow-hidden border border-white/15 cursor-pointer group/att"
                                                        >
                                                            <video src={cmt.mediaUrl} className="w-full max-h-40 object-cover pointer-events-none" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                <div className="w-9 h-9 rounded-full bg-sparta-gold text-black flex items-center justify-center shadow-lg">
                                                                    <Play size={15} fill="currentColor" className="ml-0.5" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bottom Actions Bar (Reply, Reactions, Copy) */}
                                                <div className="pl-8 pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        {/* Reply Button (Only for other users' comments) */}
                                                        {!isCommentAuthor && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartReplyToComment(event, cmt)}
                                                                className="text-[10px] text-white/50 hover:text-sparta-gold font-bold flex items-center gap-1 transition-colors cursor-pointer mr-2"
                                                            >
                                                                <CornerDownRight size={11} />
                                                                <span>Ответить</span>
                                                            </button>
                                                        )}

                                                        {/* Heart Reaction */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleCommentReaction(event, cmt.id, 'heart')}
                                                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                                                hasHearted
                                                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                                                    : 'bg-white/5 text-white/50 hover:text-white border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>❤️</span>
                                                            {heartList.length > 0 && <span>{heartList.length}</span>}
                                                        </button>

                                                        {/* Fire Reaction */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleCommentReaction(event, cmt.id, 'fire')}
                                                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                                                hasFired
                                                                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                                                    : 'bg-white/5 text-white/50 hover:text-white border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>🔥</span>
                                                            {fireList.length > 0 && <span>{fireList.length}</span>}
                                                        </button>

                                                        {/* Applause Reaction */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleCommentReaction(event, cmt.id, 'applause')}
                                                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                                                hasApplauded
                                                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                                                    : 'bg-white/5 text-white/50 hover:text-white border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span>👏</span>
                                                            {applauseList.length > 0 && <span>{applauseList.length}</span>}
                                                        </button>
                                                    </div>

                                                    {/* Copy text */}
                                                    {cmt.text && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyCommentText(cmt.text)}
                                                            className="text-[10px] text-white/30 hover:text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
                                                            title="Скопировать текст комментария"
                                                        >
                                                            <Copy size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Creator form if comments are open */}
                            {isCommentsOpen ? (
                                <div className="space-y-2 bg-black/40 p-3 rounded-2xl border border-white/10 relative">
                                    {/* ↩️ Replying To Banner */}
                                    {replyState && (
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-sparta-gold/10 border border-sparta-gold/30 text-xs text-sparta-gold">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <CornerDownRight size={12} />
                                                <span>Ответ пользователю <strong className="text-white">{replyState.authorName}</strong></span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReplyingToComment(null)}
                                                className="text-white/50 hover:text-white text-xs cursor-pointer p-0.5"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}

                                    {/* 🍎 APPLE EMOJI PICKER MODAL POPOVER */}
                                    <AnimatePresence>
                                        {isEmojiOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 p-3 bg-[#151518]/95 backdrop-blur-2xl border border-sparta-gold/40 rounded-3xl shadow-2xl shadow-black/80 z-50 space-y-2.5"
                                            >
                                                {/* Search & Close Header */}
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            value={emojiSearchQuery}
                                                            onChange={(e) => setEmojiSearchQuery(e.target.value)}
                                                            placeholder="Поиск среди 450+ эмодзи..."
                                                            className="w-full pl-7 pr-7 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-sparta-gold/60 focus:bg-white/10 transition-colors"
                                                            autoFocus
                                                        />
                                                        {emojiSearchQuery && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEmojiSearchQuery('')}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setActiveEmojiEventId(null); setEmojiSearchQuery(''); }}
                                                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xs cursor-pointer shrink-0 transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                {/* Apple Category Switcher Tabs */}
                                                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
                                                    {APPLE_EMOJI_CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            type="button"
                                                            onClick={() => { setActiveEmojiTab(cat.id); setEmojiSearchQuery(''); }}
                                                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                                                activeEmojiTab === cat.id && !emojiSearchQuery
                                                                    ? 'bg-sparta-gold text-black font-black shadow-sm shadow-sparta-gold/20 scale-105'
                                                                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                                            }`}
                                                            title={cat.name}
                                                        >
                                                            <span>{cat.icon}</span>
                                                            <span className="hidden sm:inline text-[10px]">{cat.name.split(' ')[0]}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Active Category Header */}
                                                <div className="text-[10px] font-bold text-white/40 px-1 uppercase tracking-wider flex items-center justify-between">
                                                    <span>
                                                        {emojiSearchQuery ? `Результаты поиска (${filteredEmojis.length})` : APPLE_EMOJI_CATEGORIES.find(c => c.id === activeEmojiTab)?.name}
                                                    </span>
                                                    <span className="text-[9px] text-sparta-gold font-normal">Нажмите для вставки ✨</span>
                                                </div>

                                                {/* Emoji Grid (8 columns) */}
                                                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                                    {filteredEmojis.map((em, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => handleInsertEmoji(event.id, em)}
                                                            className="w-9 h-9 rounded-xl hover:bg-white/15 text-xl flex items-center justify-center transition-all duration-100 hover:scale-130 active:scale-95 cursor-pointer select-none"
                                                        >
                                                            {em}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* 📎 ATTACHMENT MENU POPOVER */}
                                    <AnimatePresence>
                                        {isAttachOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full left-0 mb-2 w-52 p-2 bg-[#16161a]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl z-50 space-y-1"
                                            >
                                                <div className="px-2 py-1 text-[9px] font-bold uppercase text-white/40 border-b border-white/5">
                                                    Прикрепить вложение
                                                </div>

                                                <label className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/10 hover:text-sparta-gold transition-colors cursor-pointer">
                                                    <Camera size={15} className="text-sparta-gold" />
                                                    <span>Фотография</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={e => handleCommentAttachmentUpload(e, event.id, 'image')}
                                                        className="hidden"
                                                    />
                                                </label>

                                                <label className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/10 hover:text-sparta-gold transition-colors cursor-pointer">
                                                    <Film size={15} className="text-amber-400" />
                                                    <span>Видеоролик</span>
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        onChange={e => handleCommentAttachmentUpload(e, event.id, 'video')}
                                                        className="hidden"
                                                    />
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={() => startVoiceRecording(event.id)}
                                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/10 hover:text-rose-400 transition-colors cursor-pointer text-left"
                                                >
                                                    <Mic size={15} className="text-rose-400" />
                                                    <span>Голосовое</span>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Voice recording live indicator */}
                                    {isRecordingThis ? (
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                                            <div className="flex items-center gap-2 font-bold animate-pulse">
                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                                <Radio size={14} className="text-rose-400" />
                                                <span>Идет запись голосового: {recordingTime} сек</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={cancelVoiceRecording}
                                                    className="px-2 py-1 rounded-lg bg-black/50 text-white/60 hover:text-white text-[10px] cursor-pointer"
                                                >
                                                    Отмена
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={stopVoiceRecording}
                                                    className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-md cursor-pointer"
                                                >
                                                    <Square size={10} fill="currentColor" />
                                                    <span>Готово</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Attached file preview */}
                                            {curMedia && (
                                                <div className="flex items-center justify-between p-2 rounded-xl bg-sparta-gold/15 border border-sparta-gold/30 text-xs text-sparta-gold">
                                                    <div className="flex items-center gap-2">
                                                        <span>{curMedia.type === 'video' ? '🎥' : '📷'}</span>
                                                        <span className="font-bold truncate max-w-[200px]">{curMedia.name || 'Прикрепленный файл'}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCommentAttachedMedia(prev => ({ ...prev, [event.id]: null }))}
                                                        className="text-white/50 hover:text-white text-xs cursor-pointer"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                {/* Attachment menu button */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveAttachEventId(isAttachOpen ? null : event.id);
                                                        setActiveEmojiEventId(null);
                                                    }}
                                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                        isAttachOpen
                                                            ? 'bg-sparta-gold text-black border-sparta-gold'
                                                            : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/70 hover:text-sparta-gold'
                                                    }`}
                                                    title="Прикрепить фото, видео или голосовое"
                                                >
                                                    <Paperclip size={15} />
                                                </button>

                                                {/* Apple Emoji picker button */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveEmojiEventId(isEmojiOpen ? null : event.id);
                                                        setActiveAttachEventId(null);
                                                    }}
                                                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                        isEmojiOpen
                                                            ? 'bg-sparta-gold text-black border-sparta-gold'
                                                            : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/70 hover:text-yellow-400'
                                                    }`}
                                                    title="Выбрать эмодзи"
                                                >
                                                    <Smile size={15} />
                                                </button>

                                                <input
                                                    type="text"
                                                    value={curText}
                                                    onChange={e => setCommentInputText(prev => ({ ...prev, [event.id]: e.target.value }))}
                                                    placeholder="Напишите доброе слово, совет или похвалу..."
                                                    className="flex-1 px-3 py-2 bg-black/70 border border-white/10 focus:border-sparta-gold rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleAddComment(event);
                                                        }
                                                    }}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => startVoiceRecording(event.id)}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-rose-400 transition-colors cursor-pointer"
                                                    title="Записать голосовое сообщение"
                                                >
                                                    <Mic size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleAddComment(event)}
                                                    disabled={isPostingComment || (!curText.trim() && !curMedia)}
                                                    className="px-3.5 py-2 rounded-xl bg-sparta-gold hover:bg-yellow-400 text-black font-russo text-xs uppercase transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-md flex items-center gap-1 shrink-0"
                                                >
                                                    {isPostingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/10 flex items-center justify-between gap-3 text-xs text-white/50">
                                    <div className="flex items-center gap-2">
                                        <Lock size={13} className="text-white/40" />
                                        <span className="text-[11px]">Автор ограничил возможность комментирования этой записи</span>
                                    </div>
                                    {(isPostAuthor || ['coach', 'director', 'admin'].includes(currentMyRole)) && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleAllowComments(event)}
                                            className="px-2.5 py-1 rounded-xl bg-sparta-gold text-black font-black text-[10px] hover:bg-sparta-gold/90 transition-all cursor-pointer shadow-sm shrink-0"
                                        >
                                            🔓 Включить
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="w-full space-y-4 sm:space-y-5 pb-20 md:pb-8">
            {/* Notification Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-16 left-4 right-4 z-[110] md:left-auto md:right-8 md:w-96 p-4 bg-[#141414] border border-sparta-gold/60 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white text-xs font-bold"
                    >
                        <div className="flex items-center gap-2.5">
                            <Sparkles size={18} className="text-sparta-gold animate-spin" />
                            <span>{toastMessage}</span>
                        </div>
                        <button onClick={() => setToastMessage(null)} className="text-white/40 hover:text-white">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. HERO HEADER */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#18181b] via-[#121214] to-[#0a0a0c] p-5 sm:p-7 border border-sparta-gold/30 shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-80 h-80 bg-sparta-gold/10 rounded-full blur-[90px] pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-russo text-white tracking-wide flex items-center gap-2">
                            <span>Привет, {firstName}! ⚽</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-semibold">
                                <Users size={13} className="text-sparta-gold" />
                                <span>{displayGroupName}</span>
                            </span>
                            {parentName && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium">
                                    <span>Родитель: <strong className="text-white/90">{parentName}</strong></span>
                                </span>
                            )}
                            {pinnedBadge && (
                                <button
                                    type="button"
                                    onClick={() => handleBadgeClick(pinnedBadge)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all cursor-pointer active:scale-95"
                                    title="Закрепленное достижение • Нажми для просмотра"
                                >
                                    <span>⭐ {pinnedBadge.icon} {pinnedBadge.title}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsStudentCardOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sparta-gold/15 hover:bg-sparta-gold/25 border border-sparta-gold/40 text-sparta-gold text-xs font-bold shadow-[0_0_12px_rgba(212,175,55,0.2)] transition-all cursor-pointer active:scale-95"
                                title="Открыть спортивную карточку ученика"
                            >
                                <span>🎴 Моя карточка</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all cursor-pointer active:scale-95"
                                title="Показать персональный QR-пропуск в зал"
                            >
                                <QrCode size={13} className="text-cyan-400" />
                                <span>QR-Пропуск</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-all cursor-pointer active:scale-95"
                                title="Открыть клубную хронику и ленту Спарта Live"
                            >
                                <Flame size={13} className="text-rose-400" />
                                <span>Спарта Live</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Enlarged Interactive Glass Coin Badge */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => onTabChange('orders')}
                            className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 transition-all p-2.5 px-4 rounded-xl flex items-center gap-2.5 shadow-lg group cursor-pointer shrink-0 backdrop-blur-md"
                            title="Баланс монет Спарта • Нажми для перехода в магазин призов"
                        >
                            <SpartaCoinIcon size={24} showGlow animate className="w-6 h-6 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
                            <span className="text-sm sm:text-base font-bold text-amber-300 font-russo tracking-wide flex items-center gap-2">
                                <span>🟡 {coins} монет</span>
                                <span className="text-white/40">•</span>
                                <span className="text-emerald-400 group-hover:text-emerald-300 text-xs sm:text-sm font-sans font-bold">
                                    Потратить 🎁
                                </span>
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* 2. 🌟 LEVEL ROAD & ROAD PROGRESS BAR */}
            <LevelProgressBar
                xp={xp}
                userId={user?.uid}
                userName={studentName}
                onOpenShop={() => onTabChange('orders')}
            />

            {/* Quick Interactive Card: Победа дня & Спарта Live */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sparta-gold/10 via-amber-500/5 to-transparent border border-sparta-gold/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center shrink-0">
                        {hasRecordedTodayVictory ? <CheckCircle2 size={22} className="text-emerald-400" /> : <Trophy size={22} className="text-sparta-gold" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-russo text-white uppercase">
                                {hasRecordedTodayVictory ? 'Победа дня записана! 🎯' : 'Запиши победу дня!'}
                            </span>
                            {!hasRecordedTodayVictory && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                    +20 🟡 монет
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-white/50">
                            {hasRecordedTodayVictory
                                ? 'Отличный результат! Твоя победа видна в ленте команды'
                                : 'Чему ты сегодня научился? Поделись с тренером и друзьями'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setIsHistoryModalOpen(true);
                            if (!hasRecordedTodayVictory) {
                                setIsAddingVictoryNote(true);
                            }
                        }}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-russo uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                            hasRecordedTodayVictory
                                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                                : 'bg-sparta-gold text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                        }`}
                    >
                        {hasRecordedTodayVictory ? (
                            <>
                                <History size={14} />
                                <span>Моя хроника</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                <span>Записать победу</span>
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-russo uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Открыть ленту команды «Спарта Live»"
                    >
                        <Flame size={14} className="text-rose-400" />
                        <span className="hidden xs:inline">Лента Live</span>
                    </button>
                </div>
            </div>

            {/* 3. MAIN 2-COLUMN ACTION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* CARD 1: Ближайшая тренировка */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl bg-gradient-to-br from-[#1a1811] via-[#141310] to-[#0e0e0e] border border-amber-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4"
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={13} className="text-amber-400" />
                                Ближайшая тренировка
                            </span>
                            {confirmedStudentsCount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                    {confirmedStudentsCount} идут на тренировку 👥
                                </span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-russo text-white uppercase tracking-wide">
                                {nextWorkoutTitle}
                            </h3>
                            <p className="text-xs sm:text-sm font-bold text-sparta-gold mt-1 flex items-center gap-1.5">
                                <Calendar size={14} />
                                <span>{nextWorkoutTime}</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/70 pt-1">
                            <span className="flex items-center gap-1.5">
                                <MapPin size={13} className="text-sparta-gold shrink-0" />
                                <span>{nextWorkoutLocation}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <User size={13} className="text-sparta-gold shrink-0" />
                                <span>Тренер: <strong className="text-white">{coachName}</strong></span>
                            </span>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={handleConfirmAttendance}
                            disabled={isConfirmedByMe}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xl ${
                                isConfirmedByMe
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                                    : 'bg-gradient-to-r from-sparta-gold via-yellow-400 to-sparta-gold text-black hover:brightness-110 shadow-sparta-gold/20 font-black'
                            }`}
                        >
                            {isConfirmedByMe ? (
                                <>
                                    <CheckCheck size={16} className="text-emerald-400" />
                                    <span>Я приду на тренировку ✅</span>
                                </>
                            ) : (
                                <>
                                    <span>🙋‍♂️ Я приду на тренировку (+10 XP)</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* CARD 2: Задания от тренера (CompactTaskList Widget) */}
                <CompactTaskList
                    studentId={user?.uid}
                    groupId={userProfile?.groupId}
                    studentName={studentName}
                    userProfile={userProfile}
                    onOpenHistory={() => setIsTaskHistoryOpen(true)}
                    triggerToast={triggerToast}
                />
            </div>

            {/* 3. 🏆 ЗАЛ СЛАВЫ СПАРТАНЦА (Liquid Black Glass Redesign) */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#18181c]/95 via-[#121215]/95 to-[#09090b]/95 border border-white/10 shadow-2xl space-y-5 relative overflow-hidden backdrop-blur-xl"
            >
                {/* Background Ambient Glow */}
                <div className="absolute top-0 right-1/4 w-72 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* 1. Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-sparta-gold flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                            <Trophy size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-russo text-base sm:text-lg text-white uppercase tracking-wide">
                                    🏆 МОИ НАГРАДЫ И ДОСТИЖЕНИЯ
                                </h3>
                                <span className="text-xs text-zinc-400 font-bold bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                                    Открыто {unlockedBadgesCount} из {spartanBadges.length}
                                </span>
                            </div>
                            <p className="text-xs text-white/50 mt-0.5">
                                Выполняй нормативы, челленджи и собирай коллекцию трофеев
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons: Awards Page & Store */}
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <button
                            type="button"
                            onClick={() => onTabChange('achievements')}
                            className="px-4 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl font-russo uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer shrink-0 font-bold"
                        >
                            <Trophy size={14} className="text-amber-400" />
                            <span>🏆 Вся коллекция наград →</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onTabChange('orders')}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-sparta-gold hover:brightness-110 text-black rounded-xl font-russo uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer shrink-0 font-black"
                        >
                            <Gift size={15} />
                            <span>🎁 Магазин подарков за монеты →</span>
                        </button>
                    </div>
                </div>

                {/* 2. Interactive Badges Grid: СТРОГО 1 ряд (максимум 3 карточки) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    {dashboardBadges.map((badge) => (
                        <BadgeCard
                            key={badge.id}
                            badge={badge}
                            onClick={(b) => handleBadgeClick(b)}
                        />
                    ))}
                </div>
            </motion.div>

            {/* ========================================================================= */}
            {/* 7. 📜 100% REALTIME MODAL: ХРОНИКА ПОБЕД & ЛЕНТА «СПАРТА LIVE» */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {isHistoryModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#121215] border-2 border-sparta-gold/50 rounded-3xl p-5 sm:p-7 max-w-4xl w-full max-h-[92vh] flex flex-col space-y-4 shadow-[0_0_80px_rgba(212,175,55,0.2)] relative"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="absolute top-5 right-5 text-white/40 hover:text-white text-xl p-2 cursor-pointer z-10"
                            >
                                ✕
                            </button>

                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 pr-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center">
                                            <History size={20} />
                                        </div>
                                        <span className="text-xs font-black text-sparta-gold uppercase tracking-widest">
                                            Клубная Хроника Спарты
                                        </span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-russo text-white uppercase tracking-wide">
                                        {historyTab === 'my_archive' ? 'Хроника побед и воспоминаний 📖' : '🔥 Лента команды «Спарта Live»'}
                                    </h2>
                                    <p className="text-xs text-white/50">
                                        {historyTab === 'my_archive'
                                            ? `${studentName} • Твой личный путь в клубе`
                                            : `Живая стена славы и побед твоих друзей по команде`}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => setIsAddingVictoryNote(!isAddingVictoryNote)}
                                        className={`px-3.5 py-2.5 rounded-2xl border text-xs font-russo uppercase flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
                                            hasRecordedTodayVictory
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                : 'bg-sparta-gold/20 hover:bg-sparta-gold/30 border-sparta-gold/50 text-sparta-gold'
                                        }`}
                                    >
                                        <Sparkles size={15} />
                                        <span>
                                            {hasRecordedTodayVictory
                                                ? 'Победа дня записана ✅'
                                                : '✍️ Моя победа дня (+20)'}
                                        </span>
                                        {!hasRecordedTodayVictory && <SpartaCoinIcon size={14} animate />}
                                    </button>

                                    {historyTab === 'my_archive' && (
                                        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 p-2 rounded-2xl shrink-0">
                                            <div className="text-center px-2.5 border-r border-white/10">
                                                <span className="text-[10px] text-white/40 block font-bold">Тренировок</span>
                                                <span className="text-sm font-russo text-white">{periodStats.workoutsCount} ⚽</span>
                                            </div>
                                            <div className="text-center px-2.5 border-r border-white/10">
                                                <span className="text-[10px] text-white/40 block font-bold">Челленджей</span>
                                                <span className="text-sm font-russo text-emerald-400">{periodStats.challengesCount} 🎯</span>
                                            </div>
                                            <div className="text-center px-2.5">
                                                <span className="text-[10px] text-white/40 block font-bold">Монет</span>
                                                <span className="text-sm font-russo text-sparta-gold flex items-center justify-center gap-1.5">
                                                    +{periodStats.totalCoins} <SpartaCoinIcon size={14} animate />
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 🗂️ TOP SWITCHER TABS */}
                            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                <button
                                    onClick={() => setHistoryTab('my_archive')}
                                    className={`px-4 py-2 rounded-2xl text-xs font-russo uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                        historyTab === 'my_archive'
                                            ? 'bg-sparta-gold text-black shadow-lg shadow-sparta-gold/20'
                                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Bookmark size={14} />
                                    <span>Мой архив и победы</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${historyTab === 'my_archive' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'}`}>
                                        {filteredEvents.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setHistoryTab('team_feed')}
                                    className={`px-4 py-2 rounded-2xl text-xs font-russo uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                        historyTab === 'team_feed'
                                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/20'
                                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Flame size={14} className={historyTab === 'team_feed' ? 'animate-bounce text-black' : 'text-orange-400'} />
                                    <span>Лента команды «Спарта Live»</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${historyTab === 'team_feed' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'}`}>
                                        {teamFeedEvents.length}
                                    </span>
                                </button>
                            </div>

                            {/* KID VICTORY NOTE CREATOR FORM */}
                            <AnimatePresence>
                                {isAddingVictoryNote && (
                                    <motion.form
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        onSubmit={handleSaveVictoryNote}
                                        className="p-4 bg-sparta-gold/10 border border-sparta-gold/30 rounded-2xl space-y-3 shrink-0"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <span className="text-xs font-bold text-sparta-gold flex items-center gap-1">
                                                    <Trophy size={14} />
                                                    {hasRecordedTodayVictory
                                                        ? 'Запиши еще одно яркое событие на память:'
                                                        : 'Запиши свое главное достижение за сегодня:'}
                                                </span>
                                                {hasRecordedTodayVictory && (
                                                    <p className="text-[11px] text-white/50 mt-0.5">
                                                        Ты уже забрал сегодняшние 20 монет 🌟 Новая награда откроется завтра!
                                                    </p>
                                                )}
                                            </div>

                                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                                                hasRecordedTodayVictory
                                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                    : 'bg-sparta-gold text-black shadow-sm'
                                            }`}>
                                                {hasRecordedTodayVictory ? (
                                                    '✨ Награда дня уже в копилке'
                                                ) : (
                                                    <span className="flex items-center gap-1">+20 монет в копилку <SpartaCoinIcon size={12} animate /></span>
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                '⚽ Забил красивый гол',
                                                '🔥 Выложился на максимум',
                                                '🧤 Спас ворота (супер-сейв)',
                                                '🎯 Отдал голевой пас',
                                                '💪 Стал быстрее и сильнее'
                                            ].map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setVictorySticker(st)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        victorySticker === st
                                                            ? 'bg-sparta-gold text-black font-black'
                                                            : 'bg-black/40 text-white/70 hover:text-white'
                                                    }`}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Privacy Selector */}
                                        <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5">
                                            <div className="flex items-center justify-between text-[11px] text-white/60">
                                                <span className="flex items-center gap-1.5 font-bold">
                                                    <Eye size={13} className="text-sparta-gold" />
                                                    Кто увидит эту запись:
                                                </span>
                                                <span className="text-[10px] text-sparta-gold font-bold">
                                                    {victoryVisibility === 'public' && '🌍 Вся команда, тренер и друзья'}
                                                    {victoryVisibility === 'coach_only' && '👨‍🏫 Только тренер и родители'}
                                                    {victoryVisibility === 'private' && '🔒 Лично мне (Секретный дневник)'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {[
                                                    {
                                                        id: 'public' as const,
                                                        icon: '🌍',
                                                        label: 'Всей команде',
                                                        desc: 'Попадет в «Спарта Live»'
                                                    },
                                                    {
                                                        id: 'coach_only' as const,
                                                        icon: '👨‍🏫',
                                                        label: 'Только тренеру',
                                                        desc: 'Личный совет наставника'
                                                    },
                                                    {
                                                        id: 'private' as const,
                                                        icon: '🔒',
                                                        label: 'Только мне',
                                                        desc: 'Секретный дневник'
                                                    }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setVictoryVisibility(opt.id)}
                                                        className={`p-2.5 rounded-xl text-left transition-all border flex items-center gap-2.5 cursor-pointer ${
                                                            victoryVisibility === opt.id
                                                                ? 'bg-sparta-gold/20 border-sparta-gold text-white shadow-md'
                                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                                                        }`}
                                                    >
                                                        <span className="text-xl">{opt.icon}</span>
                                                        <div className="leading-tight">
                                                            <span className="text-xs font-russo block text-white">{opt.label}</span>
                                                            <span className="text-[9px] text-white/50 block">{opt.desc}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 💬 Allow Comments Switch */}
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${victoryAllowComments ? 'bg-sparta-gold/20 text-sparta-gold' : 'bg-white/5 text-white/30'}`}>
                                                    <MessageSquare size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Разрешить комментарии и обсуждение</p>
                                                    <p className="text-[10px] text-white/50">Тренеры и друзья смогут писать советы и ставить реакции</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setVictoryAllowComments(!victoryAllowComments)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    victoryAllowComments ? 'bg-sparta-gold' : 'bg-white/20'
                                                }`}
                                            >
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                        victoryAllowComments ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        <input
                                            type="file"
                                            ref={imageInputRef}
                                            accept="image/*"
                                            multiple
                                            onChange={e => handleMultipleFileUpload(e, 'image')}
                                            className="hidden"
                                        />
                                        <input
                                            type="file"
                                            ref={videoInputRef}
                                            accept="video/*"
                                            multiple
                                            onChange={e => handleMultipleFileUpload(e, 'video')}
                                            className="hidden"
                                        />

                                        {attachedMediaList.length > 0 && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px] text-white/60">
                                                    <span className="flex items-center gap-1 font-bold">
                                                        <Layers size={13} className="text-sparta-gold" />
                                                        Прикреплено в облако ({attachedMediaList.length} из 6):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttachedMediaList([])}
                                                        className="text-[10px] text-white/40 hover:text-red-400 cursor-pointer"
                                                    >
                                                        Очистить все
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                                                    {attachedMediaList.map((m, idx) => (
                                                        <div
                                                            key={m.id || idx}
                                                            className="relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-white/20 bg-black/60 group"
                                                        >
                                                            {m.type === 'video' ? (
                                                                <div className="w-full h-full relative flex items-center justify-center">
                                                                    <video src={m.url} className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                        <Play size={16} className="text-sparta-gold" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <img src={m.url} alt="Attached" className="w-full h-full object-cover" />
                                                            )}

                                                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[9px] text-white/80 font-bold">
                                                                {m.type === 'video' ? '🎥' : '📷'}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveAttachedMedia(m.id)}
                                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-500 text-white text-[10px] flex items-center justify-center cursor-pointer shadow-md transition-colors"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                value={victoryNoteText}
                                                onChange={e => setVictoryNoteText(e.target.value)}
                                                placeholder="Например: Сегодня на тренировке обыграл двоих и забил гол!"
                                                className="flex-1 px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-sparta-gold rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                                                required
                                            />

                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={isSavingWithMedia}
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-sparta-gold text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    title="Прикрепить фотографии"
                                                >
                                                    <Camera size={15} />
                                                    <span className="hidden sm:inline">+Фото</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isSavingWithMedia}
                                                    onClick={() => videoInputRef.current?.click()}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-sparta-gold text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    title="Прикрепить видеоролики"
                                                >
                                                    <Film size={15} />
                                                    <span className="hidden sm:inline">+Видео</span>
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSavingWithMedia}
                                                    className="px-4 py-2.5 bg-sparta-gold hover:bg-yellow-400 text-black font-russo text-xs uppercase rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {isSavingWithMedia ? (
                                                        <>
                                                            <Loader2 size={14} className="animate-spin" />
                                                            <span>Сохраняем...</span>
                                                        </>
                                                    ) : (
                                                        <span>{hasRecordedTodayVictory ? 'Сохранить' : 'Сохранить победу'}</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* ================================================================= */}
                            {/* TAB 1: 📖 MY PERSONAL ARCHIVE */}
                            {/* ================================================================= */}
                            {historyTab === 'my_archive' && (
                                <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                                    {/* Filters Bar */}
                                    <div className="space-y-3 bg-black/50 p-4 rounded-2xl border border-white/5 shrink-0">
                                        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-white/40 font-bold mr-1 shrink-0 flex items-center gap-1">
                                                    <Calendar size={13} /> Год:
                                                </span>
                                                {dynamicYearsList.map(y => (
                                                    <button
                                                        key={y}
                                                        onClick={() => setSelectedYear(y)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                                            selectedYear === y
                                                                ? 'bg-sparta-gold text-black font-black shadow-md shadow-sparta-gold/20'
                                                                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    >
                                                        {y}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-white/40 font-bold">Месяц:</span>
                                                <select
                                                    value={selectedMonth}
                                                    onChange={e => setSelectedMonth(e.target.value)}
                                                    className="px-3 py-1.5 bg-white/5 border border-white/10 focus:border-sparta-gold rounded-xl text-xs text-white outline-none cursor-pointer"
                                                >
                                                    {MONTHS_LIST.map(m => (
                                                        <option key={m} value={m} className="bg-[#18181b] text-white">
                                                            {m}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-white/40 font-bold flex items-center gap-1">
                                                    <CalendarDays size={13} /> Точная дата:
                                                </span>
                                                <input
                                                    type="date"
                                                    value={selectedExactDate}
                                                    onChange={e => setSelectedExactDate(e.target.value)}
                                                    className="px-3 py-1 bg-white/5 border border-white/10 focus:border-sparta-gold rounded-xl text-xs text-white outline-none cursor-pointer [color-scheme:dark]"
                                                />
                                                {selectedExactDate && (
                                                    <button
                                                        onClick={() => setSelectedExactDate('')}
                                                        className="text-white/40 hover:text-white text-xs px-1"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {[
                                                    { id: 'all', label: 'Все' },
                                                    { id: 'workout', label: '⚽ Тренировки' },
                                                    { id: 'challenge', label: '🎯 Задания' },
                                                    { id: 'trophy', label: '🏆 Трофеи' }
                                                ].map(filter => (
                                                    <button
                                                        key={filter.id}
                                                        onClick={() => setSelectedEventType(filter.id as any)}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                            selectedEventType === filter.id
                                                                ? 'bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/40'
                                                                : 'text-white/40 hover:text-white'
                                                        }`}
                                                    >
                                                        {filter.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="relative w-full sm:w-56">
                                                <Search size={13} className="text-white/40 absolute left-3 top-2.5" />
                                                <input
                                                    type="text"
                                                    value={historySearchQuery}
                                                    onChange={e => setHistorySearchQuery(e.target.value)}
                                                    placeholder="Поиск по истории..."
                                                    className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 outline-none focus:border-sparta-gold"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Timeline Stream */}
                                    <div className="space-y-3 overflow-y-auto pr-2 flex-1 max-h-[460px]">
                                        {filteredEvents.length === 0 ? (
                                            <div className="p-12 text-center bg-black/20 rounded-3xl border border-white/5 space-y-2">
                                                <Compass size={32} className="text-white/20 mx-auto" />
                                                <p className="text-sm font-russo text-white/60 uppercase">Нет записей за этот период</p>
                                                <p className="text-xs text-white/40">
                                                    Попробуйте сбросить фильтры или выбрать другой год
                                                </p>
                                            </div>
                                        ) : (
                                            filteredEvents.map((event, idx) => {
                                                const isPersonalNote = (event.type === 'milestone' || event.title.includes('Победа дня')) && event.id !== 'first_day_milestone';
                                                const isEditingThis = editingEventId === event.id;
                                                const mediaList = event.mediaItems || [];

                                                return (
                                                    <motion.div
                                                        key={event.id || idx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        onClick={(e) => {
                                                            if (editingEventId === event.id) return;
                                                            const target = e.target as HTMLElement;
                                                            if (target.closest('button') || target.closest('input') || target.closest('textarea')) return;

                                                            if (mediaList.length > 0) {
                                                                setViewerData({ items: mediaList, activeIndex: 0, event });
                                                                setViewerZoom(1);
                                                                setViewerRotation(0);
                                                            } else {
                                                                setViewerData({
                                                                    items: [{
                                                                        id: 'text_' + event.id,
                                                                        url: '',
                                                                        type: 'image',
                                                                        name: event.title
                                                                    }],
                                                                    activeIndex: 0,
                                                                    event
                                                                });
                                                                setViewerZoom(1);
                                                                setViewerRotation(0);
                                                            }
                                                        }}
                                                        className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col space-y-3 cursor-pointer hover:border-sparta-gold/60 group ${
                                                            event.type === 'milestone'
                                                                ? 'bg-gradient-to-r from-sparta-gold/15 via-[#1c1a14] to-[#121212] border-sparta-gold/60 shadow-lg'
                                                                : event.type === 'trophy'
                                                                ? 'bg-gradient-to-r from-amber-500/10 via-[#181612] to-[#101010] border-amber-500/40'
                                                                : event.type === 'challenge' || event.type === 'personal'
                                                                ? 'bg-gradient-to-r from-emerald-500/10 via-[#131a16] to-[#0f1211] border-emerald-500/30'
                                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-3.5 flex-1">
                                                                <div className="w-11 h-11 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                                                    {event.badgeEmoji}
                                                                </div>

                                                                <div className="space-y-1.5 flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="text-[11px] font-bold text-sparta-gold flex items-center gap-1">
                                                                            <Calendar size={12} /> {event.displayDate}
                                                                        </span>

                                                                        {Boolean(event.rewardCoins && event.rewardCoins > 0) && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sparta-gold/20 text-sparta-gold font-black flex items-center gap-1">
                                                                                +{event.rewardCoins} <SpartaCoinIcon size={11} animate />
                                                                            </span>
                                                                        )}

                                                                        {event.type === 'milestone' && (
                                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-sparta-gold text-black font-black uppercase flex items-center gap-1">
                                                                                Памятное событие <Sparkles size={10} className="inline fill-black text-black" />
                                                                            </span>
                                                                        )}

                                                                        {event.visibility && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    if (!isPersonalNote) return;
                                                                                    e.stopPropagation();
                                                                                    handleToggleEventVisibility(event);
                                                                                }}
                                                                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border transition-all ${
                                                                                    event.visibility === 'private'
                                                                                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                                                                                        : event.visibility === 'coach_only'
                                                                                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                                                                                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                                                                } ${isPersonalNote ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                                                                                title={isPersonalNote ? 'Нажмите, чтобы переключить видимость' : undefined}
                                                                            >
                                                                                {event.visibility === 'private' ? (
                                                                                    <>
                                                                                        <Lock size={10} />
                                                                                        <span>Лично мне 🔒</span>
                                                                                    </>
                                                                                ) : event.visibility === 'coach_only' ? (
                                                                                    <>
                                                                                        <User size={10} />
                                                                                        <span>Только тренеру 👨‍🏫</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Users size={10} />
                                                                                        <span>Всей команде 🌍</span>
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <h4 className="text-sm sm:text-base font-russo text-white group-hover:text-sparta-gold transition-colors">
                                                                        {event.title}
                                                                    </h4>

                                                                    {isEditingThis ? (
                                                                        <div className="flex flex-col sm:flex-row gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                                                            <input
                                                                                type="text"
                                                                                value={editingEventText}
                                                                                onChange={e => setEditingEventText(e.target.value)}
                                                                                className="flex-1 px-3 py-1.5 bg-black/80 border border-sparta-gold rounded-xl text-xs text-white outline-none"
                                                                                autoFocus
                                                                            />
                                                                            <div className="flex items-center gap-1.5">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleSaveEditEvent(event.id); }}
                                                                                    className="px-3 py-1.5 bg-sparta-gold text-black rounded-xl text-xs font-bold font-russo uppercase flex items-center gap-1 cursor-pointer"
                                                                                >
                                                                                    <Save size={12} />
                                                                                    <span>Сохранить</span>
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setEditingEventId(null); }}
                                                                                    className="px-2 py-1.5 text-white/50 hover:text-white text-xs cursor-pointer"
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">
                                                                            {event.description}
                                                                        </p>
                                                                    )}

                                                                    {/* 🖼️ SEAMLESS SPARTA MEDIA COLLAGE */}
                                                                    {mediaList.length > 0 && (
                                                                        <div className="mt-3">
                                                                            <SpartaMediaCollage
                                                                                items={mediaList}
                                                                                onItemClick={(mIdx) => {
                                                                                    setViewerData({ items: mediaList, activeIndex: mIdx, event });
                                                                                    setViewerZoom(1);
                                                                                    setViewerRotation(0);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    )}


                                                                </div>
                                                            </div>

                                                            <div className="shrink-0 flex items-center gap-2 self-start">
                                                                {isPersonalNote && (
                                                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10" onClick={e => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleStartEdit(event); }}
                                                                            className="p-1.5 rounded-lg hover:bg-white/15 text-white/60 hover:text-sparta-gold transition-all text-xs cursor-pointer"
                                                                            title="Исправить текст"
                                                                        >
                                                                            <Edit3 size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all text-xs cursor-pointer"
                                                                            title="Удалить заметку"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 💬 Comments and Voice Section */}
                                                        {renderCommentsSection(event)}
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ================================================================= */}
                            {/* TAB 2: 🔥 LIVE TEAM FEED («Спарта Live») */}
                            {/* ================================================================= */}
                            {historyTab === 'team_feed' && (
                                <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                                    <div className="p-3 bg-gradient-to-r from-orange-500/15 via-[#1a140f] to-amber-500/10 rounded-2xl border border-orange-500/30 flex items-center justify-between gap-3 shrink-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-russo text-sm">
                                                🔥
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-russo text-white uppercase">Лента Чемпионов Спарты</h3>
                                                <p className="text-[11px] text-white/60">Обсуждай победы, отвечай голосом и вдохновляй команду на новые рекорды!</p>
                                            </div>
                                        </div>

                                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-sparta-gold/20 text-sparta-gold font-bold border border-sparta-gold/40 hidden sm:inline">
                                            {teamFeedEvents.length} побед в клубе 🌟
                                        </span>
                                    </div>

                                    {/* Team Feed Stream */}
                                    <div className="space-y-3 overflow-y-auto pr-2 flex-1 max-h-[460px]">
                                        {teamFeedEvents.length === 0 ? (
                                            <div className="p-12 text-center bg-black/20 rounded-3xl border border-white/5 space-y-2">
                                                <Flame size={32} className="text-orange-400/40 mx-auto" />
                                                <p className="text-sm font-russo text-white/60 uppercase">Лента команды пока пуста</p>
                                                <p className="text-xs text-white/40">
                                                    Будь первым! Нажми «Моя победа дня», выбери видимость «Всей команде» и поделись своим успехом!
                                                </p>
                                            </div>
                                        ) : (
                                            teamFeedEvents.map((feedItem, fIdx) => {
                                                const isMine = feedItem.userId === user?.uid;
                                                const mediaList = feedItem.mediaItems || [];
                                                const fireReactions = feedItem.reactions?.fire || [];
                                                const applauseReactions = feedItem.reactions?.applause || [];
                                                const rocketReactions = feedItem.reactions?.rocket || [];

                                                const hasFired = user?.uid && fireReactions.includes(user.uid);
                                                const hasApplauded = user?.uid && applauseReactions.includes(user.uid);
                                                const hasRocketed = user?.uid && rocketReactions.includes(user.uid);

                                                return (
                                                    <motion.div
                                                        key={feedItem.id || fIdx}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: fIdx * 0.03 }}
                                                        className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden space-y-3.5 ${
                                                            isMine
                                                                ? 'bg-gradient-to-br from-sparta-gold/10 via-[#181612] to-[#101010] border-sparta-gold/40 shadow-md'
                                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        {/* Author Header */}
                                                        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sparta-gold/20 to-yellow-500/10 border border-sparta-gold/40 flex items-center justify-center font-russo text-base shadow-inner">
                                                                    {feedItem.badgeEmoji || '⚽'}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-russo text-white">
                                                                            {feedItem.userName || 'Чемпион Спарты'}
                                                                        </span>
                                                                        <VerifiedBadge role={feedItem.authorRole || 'student'} isVerified={feedItem.isVerified} />
                                                                        {isMine && (
                                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-sparta-gold text-black font-black uppercase">
                                                                                Ты ⭐
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] text-white/40 block">
                                                                        {feedItem.groupTitle || groupName} • {feedItem.displayDate}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                                                                <Users size={10} />
                                                                Команда 🌍
                                                            </span>
                                                        </div>

                                                        {/* Title & Description (Full Post / Story) */}
                                                        <div className="space-y-1">
                                                            <h4 className="text-sm sm:text-base font-russo text-white">
                                                                {feedItem.title}
                                                            </h4>
                                                            {feedItem.description && (
                                                                <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">
                                                                    {feedItem.description}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* 🖼️ SEAMLESS SPARTA MEDIA COLLAGE */}
                                                        {mediaList.length > 0 && (
                                                            <div className="mt-2">
                                                                <SpartaMediaCollage
                                                                    items={mediaList}
                                                                    onItemClick={(mIdx) => {
                                                                        setViewerData({
                                                                            items: mediaList,
                                                                            activeIndex: mIdx,
                                                                            event: feedItem
                                                                        });
                                                                        setViewerZoom(1);
                                                                        setViewerRotation(0);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}



                                                        {/* 🏆 CHAMPION REACTIONS BAR */}
                                                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                {/* Fire Reaction */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleReaction(feedItem, 'fire')}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                                                                        hasFired
                                                                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-md shadow-orange-500/20'
                                                                            : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                                                                    }`}
                                                                >
                                                                    <span className="text-sm">🔥</span>
                                                                    <span>{fireReactions.length > 0 ? fireReactions.length : 'Огонь'}</span>
                                                                </button>

                                                                {/* Applause Reaction */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleReaction(feedItem, 'applause')}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                                                                        hasApplauded
                                                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/20'
                                                                            : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                                                                    }`}
                                                                >
                                                                    <span className="text-sm">👏</span>
                                                                    <span>{applauseReactions.length > 0 ? applauseReactions.length : 'Красавчик'}</span>
                                                                </button>

                                                                {/* Rocket Reaction */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleReaction(feedItem, 'rocket')}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                                                                        hasRocketed
                                                                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-md shadow-blue-500/20'
                                                                            : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                                                                    }`}
                                                                >
                                                                    <span className="text-sm">⚽</span>
                                                                    <span>{rocketReactions.length > 0 ? rocketReactions.length : 'Пушка'}</span>
                                                                </button>
                                                            </div>

                                                            {/* Share or View in cinema */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setViewerData({
                                                                        items: mediaList.length > 0 ? mediaList : [{
                                                                            id: 'm_' + feedItem.id,
                                                                            url: '',
                                                                            type: 'image',
                                                                            name: feedItem.title
                                                                        }],
                                                                        activeIndex: 0,
                                                                        event: feedItem
                                                                    });
                                                                }}
                                                                className="text-xs text-sparta-gold hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                                            >
                                                                <span>Смотреть в кинотеатре</span>
                                                                <ChevronRight size={14} />
                                                            </button>
                                                        </div>

                                                        {/* 💬 Comments and Voice Section */}
                                                        {renderCommentsSection(feedItem)}
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================================= */}
            {/* 🦁 BRANDED SPARTA CINEMA VIEWER PRO (FULLSCREEN LIGHTBOX) */}
            {/* ========================================================================= */}
            <AnimatePresence>
                {viewerData && (
                    <div
                        onClick={() => setViewerData(null)}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3 sm:p-5 select-none"
                    >
                        {/* 1. TOP BRANDED TOOLBAR */}
                        <div
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 text-white z-10 bg-black/50 p-3 rounded-2xl border border-white/10 backdrop-blur-md"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center font-russo text-xs border border-sparta-gold/40">
                                    ⚔️
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-russo text-white uppercase tracking-wider">
                                            {viewerData.event?.userName || studentName}
                                        </span>
                                        <VerifiedBadge role={viewerData.event?.authorRole || 'student'} isVerified={viewerData.event?.isVerified} showLabel={false} />
                                        {viewerData.event?.displayDate && (
                                            <span className="text-[10px] text-sparta-gold font-bold">
                                                • {viewerData.event.displayDate}
                                            </span>
                                        )}
                                        {viewerData.event?.visibility && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/70 font-medium">
                                                {viewerData.event.visibility === 'private' ? '🔒 Лично мне' : viewerData.event.visibility === 'coach_only' ? '👨‍🏫 Только тренеру' : '🌍 Всей команде'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-white/50 block">
                                        {viewerData.items[viewerData.activeIndex]?.type === 'video' ? '🎥 Видеоповтор' : '📷 Фотография'}{' '}
                                        {viewerData.activeIndex + 1} из {viewerData.items.length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                                {Boolean(viewerData.items[viewerData.activeIndex]?.url && viewerData.items[viewerData.activeIndex]?.type !== 'video') && (
                                    <>
                                        <button
                                            onClick={() => setViewerZoom(prev => Math.min(3, prev + 0.25))}
                                            className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                                            title="Приблизить (+)"
                                        >
                                            <ZoomIn size={16} />
                                        </button>
                                        <button
                                            onClick={() => setViewerZoom(prev => Math.max(1, prev - 0.25))}
                                            className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                                            title="Отдалить (-)"
                                        >
                                            <ZoomOut size={16} />
                                        </button>
                                        {viewerZoom > 1 && (
                                            <button
                                                onClick={() => setViewerZoom(1)}
                                                className="px-2 py-0.5 rounded-lg bg-sparta-gold/20 text-sparta-gold text-[10px] font-bold cursor-pointer"
                                                title="Сбросить масштаб"
                                            >
                                                100%
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setViewerRotation(prev => (prev + 90) % 360)}
                                            className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                                            title="Повернуть на 90°"
                                        >
                                            <RotateCw size={16} />
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setShowViewerCaption(prev => !prev)}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                        showViewerCaption
                                            ? 'bg-sparta-gold/20 text-sparta-gold'
                                            : 'hover:bg-white/15 text-white/50 hover:text-white'
                                    }`}
                                    title={showViewerCaption ? 'Скрыть подпись' : 'Показать подпись'}
                                >
                                    <MessageCircle size={16} />
                                </button>

                                {viewerData.items[viewerData.activeIndex]?.url && (
                                    <button
                                        onClick={() => handleShareMedia(viewerData.items[viewerData.activeIndex]?.url, viewerData.event?.title)}
                                        className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-sparta-gold transition-all cursor-pointer"
                                        title="Поделиться в мессенджерах"
                                    >
                                        <Share2 size={16} />
                                    </button>
                                )}

                                {viewerData.items[viewerData.activeIndex]?.url && (
                                    <button
                                        onClick={() => handleDownloadMedia(viewerData.items[viewerData.activeIndex]?.url, `sparta_${studentName}`)}
                                        className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-sparta-gold transition-all cursor-pointer"
                                        title="Скачать на устройство"
                                    >
                                        <Download size={16} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setViewerData(null)}
                                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                                <span>Закрыть</span>
                                <span className="text-[10px] text-white/40 hidden sm:inline">(Esc)</span>
                            </button>
                        </div>

                        {/* 2. MAIN MEDIA STAGE */}
                        <div
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-2 overflow-hidden"
                        >
                            {viewerData.items.length > 1 && (
                                <button
                                    onClick={() => {
                                        const nextIdx = (viewerData.activeIndex - 1 + viewerData.items.length) % viewerData.items.length;
                                        handleSetViewerActiveIndex(nextIdx);
                                    }}
                                    className="absolute left-2 sm:left-4 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-sparta-gold text-white hover:text-black border border-white/20 flex items-center justify-center cursor-pointer transition-all shadow-2xl active:scale-90 backdrop-blur-md"
                                >
                                    <ChevronLeft size={26} />
                                </button>
                            )}

                            <motion.div
                                key={`${viewerData.activeIndex}_${viewerRotation}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="w-full flex items-center justify-center"
                            >
                                {!viewerData.items[viewerData.activeIndex]?.url ? (
                                    <div className="p-8 sm:p-12 bg-gradient-to-br from-[#1c1a14] via-[#14120e] to-[#0c0c0e] border border-sparta-gold/40 rounded-3xl text-center max-w-lg mx-4 space-y-4 shadow-2xl">
                                        <div className="w-20 h-20 rounded-3xl bg-black/60 border border-sparta-gold/40 flex items-center justify-center text-4xl mx-auto shadow-inner">
                                            {viewerData.event?.badgeEmoji || '🌟'}
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold text-sparta-gold flex items-center justify-center gap-1">
                                                <Calendar size={13} /> {viewerData.event?.displayDate}
                                            </span>
                                            <h3 className="text-xl sm:text-2xl font-russo text-white uppercase">
                                                {viewerData.event?.title}
                                            </h3>
                                            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                                {viewerData.event?.description}
                                            </p>
                                        </div>
                                    </div>
                                ) : viewerData.items[viewerData.activeIndex]?.type === 'video' ? (
                                    <SpartaVideoPlayer
                                        src={viewerData.items[viewerData.activeIndex]?.url}
                                        studentName={viewerData.event?.userName || studentName}
                                    />
                                ) : (
                                    <motion.img
                                        src={viewerData.items[viewerData.activeIndex]?.url}
                                        alt="Момент"
                                        style={{
                                            transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`,
                                            transition: 'transform 0.2s ease-out'
                                        }}
                                        className="max-w-full max-h-[66vh] rounded-2xl object-contain cursor-grab active:cursor-grabbing shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10"
                                    />
                                )}
                            </motion.div>

                            {viewerData.items.length > 1 && (
                                <button
                                    onClick={() => {
                                        const nextIdx = (viewerData.activeIndex + 1) % viewerData.items.length;
                                        handleSetViewerActiveIndex(nextIdx);
                                    }}
                                    className="absolute right-2 sm:right-4 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-sparta-gold text-white hover:text-black border border-white/20 flex items-center justify-center cursor-pointer transition-all shadow-2xl active:scale-90 backdrop-blur-md"
                                >
                                    <ChevronRight size={26} />
                                </button>
                            )}
                        </div>

                        {/* 3. BOTTOM CAPTION OVERLAY & THUMBNAILS */}
                        <div
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-5xl space-y-2 z-10 flex flex-col items-center"
                        >
                            <AnimatePresence>
                                {showViewerCaption && viewerData.event && Boolean(viewerData.items[viewerData.activeIndex]?.url) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 15 }}
                                        className="w-full max-w-2xl bg-black/75 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl space-y-1.5 text-center"
                                    >
                                        <h4 className="text-xs sm:text-sm font-russo text-white uppercase tracking-wide">
                                            {viewerData.event.title}
                                        </h4>
                                        {viewerData.event.description && (
                                            <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                                                {viewerData.event.description}
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {viewerData.items.length > 1 && (
                                <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-black/60 border border-white/10 rounded-2xl max-w-md custom-scrollbar backdrop-blur-md">
                                    {viewerData.items.map((it, idx) => (
                                        <div
                                            key={it.id || idx}
                                            onClick={() => handleSetViewerActiveIndex(idx)}
                                            className={`w-12 h-12 rounded-xl overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
                                                viewerData.activeIndex === idx
                                                    ? 'border-sparta-gold scale-105 shadow-md shadow-sparta-gold/40'
                                                    : 'border-white/10 opacity-50 hover:opacity-100'
                                            }`}
                                        >
                                            {it.type === 'video' ? (
                                                <div className="w-full h-full relative bg-black flex items-center justify-center">
                                                    <Play size={12} className="text-sparta-gold" />
                                                </div>
                                            ) : (
                                                <img src={it.url} alt="thumb" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR PASS POPUP MODAL */}
            <AnimatePresence>
                {showQrModal && (
                    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#121214] border-2 border-sparta-gold/50 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(212,175,55,0.3)] relative"
                        >
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white text-lg p-1 cursor-pointer"
                            >
                                ✕
                            </button>

                            <div className="w-12 h-12 rounded-2xl bg-sparta-gold/20 text-sparta-gold flex items-center justify-center mx-auto">
                                <QrCode size={28} />
                            </div>

                            <div>
                                <h3 className="font-russo text-lg text-white uppercase">QR-Пропуск в зал</h3>
                                <p className="text-xs text-white/50">{studentName}</p>
                            </div>

                            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user?.uid || 'sparta_kid')}`}
                                    alt="QR Pass"
                                    className="w-44 h-44 mx-auto"
                                />
                            </div>

                            <div className="p-3 bg-black/50 border border-white/10 rounded-xl">
                                <span className="text-[10px] text-white/40 block">Резервный Детский PIN</span>
                                <span className="font-mono text-lg font-bold text-sparta-gold tracking-widest">
                                    {userProfile?.kidPin || '7721'}
                                </span>
                            </div>

                            <p className="text-[11px] text-white/40">
                                Покажи этот код администратору или тренеру при входе на тренировку
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 📜 TASK HISTORY & HOMEWORK LOG MODAL */}
            <TaskHistoryModal
                isOpen={isTaskHistoryOpen}
                onClose={() => setIsTaskHistoryOpen(false)}
                studentId={user?.uid}
                groupId={userProfile?.groupId}
                userName={studentName}
                userProfile={userProfile}
                onOpenShop={() => onTabChange('orders')}
            />

            {/* 🏆 ИНТЕРАКТИВНАЯ МОДАЛКА НАГРАДЫ С АНИМАЦИЕЙ (AwardDetailModal) */}
            <AwardDetailModal
                isOpen={Boolean(selectedBadgeForModal)}
                onClose={() => setSelectedBadgeForModal(null)}
                award={selectedBadgeForModal as any}
                studentId={user?.uid}
                onOpenAwards={() => onTabChange('achievements')}
            />

            {/* 🎴 SPARTAN ATHLETE STUDENT CARD MODAL */}
            <StudentCardModal
                isOpen={isStudentCardOpen}
                onClose={() => setIsStudentCardOpen(false)}
                studentData={{ ...userProfile, id: user?.uid }}
                onOpenAwards={() => onTabChange('achievements')}
            />
        </div>
    );
};

export default KidDashboard;
